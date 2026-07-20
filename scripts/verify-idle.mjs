// 獨立 Playwright 驗證(自起瀏覽器,不吃共用 MCP)——idle 生動:主角頭轉+微笑、觀眾歡呼
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname, "shots");
const URL = process.env.URL || "http://localhost:5321/";

const EXE = process.env.CHROME_EXE ||
  join(process.env.LOCALAPPDATA || join(process.env.HOME, "AppData/Local"),
    "ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe");
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console.error: " + m.text()); });

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__bball);

const boot = await page.evaluate(() => ({
  players: window.__bball.players.length,
  crowdFans: window.__bball.crowdFigures ? window.__bball.crowdFigures.length : 0,
}));

// 開賽,跑 2.5s(既有玩法自然運行,抓 pageerror)
await page.click("#startMatchButton");
await page.waitForTimeout(2500);
await page.bringToFront();
await page.screenshot({ path: join(SHOTS, "idle-01-gameplay.png") });
const errsAfterPlay = errs.length;

// ① 主角頭轉+微笑近景(停 RAF、驅動 time 到瞥視峰值、收斂 lerp、鏡頭貼臉)
const headShot = await page.evaluate(() => {
  const g = window.__bball;
  g.running = false;
  const p = g.getControlledHomePlayer();
  p.heading = 0;                 // 面向 +z(對鏡頭)
  p.velocity.set(0, 0, 0);
  const px = p.position.x, pz = p.position.z, hy = 2.12;
  g.time = 0.8;                  // home-0 瞥視峰值(phase0 period5.4 hold窗)
  for (let i = 0; i < 60; i++) g.syncMeshes(0); // 收斂 idle lerp → yaw~0.6 / smile~1.4
  g.camera.position.set(px + 0.1, hy + 0.12, pz + 1.7);
  g.camera.lookAt(px, hy - 0.06, pz);
  g.camera.updateProjectionMatrix();
  g.render();
  const v = p.visuals;
  return {
    controlledId: p.id,
    headYaw: +v.headGroup.rotation.y.toFixed(3),
    smileScale: [+v.smile.scale.x.toFixed(3), +v.smile.scale.y.toFixed(3)],
  };
});
await page.screenshot({ path: join(SHOTS, "idle-02-star-head-smile.png") });

// ② 觀眾歡呼近景(看向遠側 −z 觀眾,他們面向 +z=對鏡頭;定住一幀顯示人浪)
const crowdShot = await page.evaluate(() => {
  const g = window.__bball;
  g.time = 3.05;                 // 取一幀人浪
  g.syncMeshes(0);               // animateCrowdCheer 直接設 → 一次即到位
  g.camera.position.set(0, 3.1, -6.5);
  g.camera.lookAt(0, 2.2, -13.5);
  g.camera.updateProjectionMatrix();
  g.render();
  // 取 −z 側幾位觀眾的舉手角度(rotation.x 越負=舉越高)
  const sample = g.crowdFigures.slice(0, 6).map((c) => +c.fig.leftArm.pivot.rotation.x.toFixed(2));
  const headSwing = g.crowdFigures.slice(0, 6).map((c) => +c.fig.headGroup.rotation.y.toFixed(2));
  return { armPivotX: sample, headSwingY: headSwing };
});
await page.screenshot({ path: join(SHOTS, "idle-03-crowd-cheer.png") });

await browser.close();
console.log(JSON.stringify({ boot, errsAfterPlay, totalErrs: errs.length, errs, headShot, crowdShot }, null, 2));
