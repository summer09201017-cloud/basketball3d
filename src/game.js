import * as THREE from "three";
import { InputManager } from "./input.js";
import {
  loadSavedGame,
  loadSettings,
  saveGameState,
  saveSettings,
} from "./storage.js";

export const DIFFICULTY_LABELS = {
  kids: "幼兒",
  child: "兒童",
  easy: "入門",
  normal: "標準",
  hard: "職業",
};

export const GAME_MODES = {
  exhibition: {
    id: "exhibition",
    label: "全場對戰",
    short: "5V5",
    description: "標準全場 4 節制，比數從 0:0 開始，適合完整打一場。",
    goal: "4 節內拿下勝利，平手進入延長賽。",
    regulationPeriods: 4,
    quarterDuration: 75,
    overtimeDuration: 45,
    shotClock: 18,
    startScore: { home: 0, away: 0 },
  },
  clutch: {
    id: "clutch",
    label: "決勝時刻",
    short: "CLT",
    description: "從接近平手的局面直接進入最後 90 秒，節奏更快，進攻時間更短。",
    goal: "在 90 秒內完成追分，平手才會進入延長賽。",
    regulationPeriods: 1,
    quarterDuration: 90,
    overtimeDuration: 30,
    shotClock: 14,
    startScore: { home: 38, away: 38 },
  },
  race21: {
    id: "race21",
    label: "搶 21",
    short: "21PT",
    description: "全場 5v5 但採搶分模式，先到 21 且至少領先 2 分即獲勝。",
    goal: "優先搶到 21 分，若時間到仍未達成則看比分決勝。",
    regulationPeriods: 1,
    quarterDuration: 180,
    overtimeDuration: 30,
    shotClock: 16,
    startScore: { home: 0, away: 0 },
    targetScore: 21,
    winBy: 2,
  },
};

export const TEAM_THEMES = {
  ember: {
    id: "ember",
    name: "烈陽",
    uiPrimary: "#ff7a18",
    uiSoft: "#ffc36f",
    uiAccent: "#f6df81",
    playerPrimary: 0xff7a18,
    playerSecondary: 0xffd6aa,
    accent: 0x5f2404,
    ring: 0xf6df81,
  },
  tide: {
    id: "tide",
    name: "深潮",
    uiPrimary: "#38a9ff",
    uiSoft: "#9ed8ff",
    uiAccent: "#72f0d0",
    playerPrimary: 0x2d9dff,
    playerSecondary: 0xc0e4ff,
    accent: 0x08314d,
    ring: 0x72f0d0,
  },
  grove: {
    id: "grove",
    name: "森境",
    uiPrimary: "#41b66f",
    uiSoft: "#a8e8c0",
    uiAccent: "#e7d66d",
    playerPrimary: 0x3daa67,
    playerSecondary: 0xbdebd0,
    accent: 0x113a22,
    ring: 0xe7d66d,
  },
  slate: {
    id: "slate",
    name: "銀風",
    uiPrimary: "#e4edf5",
    uiSoft: "#ffffff",
    uiAccent: "#8cc6ff",
    playerPrimary: 0xcfdbe6,
    playerSecondary: 0xf7fbff,
    accent: 0x20384f,
    ring: 0x8cc6ff,
  },
};

// 年齡難度檔(2026-07-10 使用者點名):幼兒/兒童 在入門之下——AI 更慢更手軟、玩家輔助更高、
// 投籃時機窗更寬(shotWindow=綠區倍率,HUD 與命中判定同步吃);青少年以上直接玩入門~職業。
const DIFFICULTY_PRESETS = {
  kids: {
    aiMove: 0.45,
    aiDefense: 0.38,
    aiShoot: 0.4,
    aiDecision: 0.5,
    userAssist: 1.5,
    shotWindow: 2.1,
  },
  child: {
    aiMove: 0.6,
    aiDefense: 0.52,
    aiShoot: 0.54,
    aiDecision: 0.62,
    userAssist: 1.3,
    shotWindow: 1.55,
  },
  easy: {
    aiMove: 0.76,
    aiDefense: 0.72,
    aiShoot: 0.7,
    aiDecision: 0.72,
    userAssist: 1.16,
  },
  normal: {
    aiMove: 1,
    aiDefense: 1,
    aiShoot: 1,
    aiDecision: 1,
    userAssist: 1,
  },
  hard: {
    aiMove: 1.12,
    aiDefense: 1.15,
    aiShoot: 1.11,
    aiDecision: 1.15,
    userAssist: 0.93,
  },
};

const ROLE_NAMES = ["PG", "SG", "SF", "PF", "C"];
const COURT_LENGTH = 28;
const COURT_WIDTH = 15;
const HALF_COURT = COURT_LENGTH / 2;
const HALF_WIDTH = COURT_WIDTH / 2;
const HOOP_OFFSET = 1.35;
const RIM_HEIGHT = 3.05;
const RIM_RADIUS = 0.42;
const BALL_RADIUS = 0.24;
const PLAYER_RADIUS = 0.43;
const BASE_RUN_SPEED = 4.15;
const SHOT_WINDOW_START = 0.7;
const SHOT_WINDOW_SIZE = 0.14;
const SHOT_WINDOW_CENTER = SHOT_WINDOW_START + SHOT_WINDOW_SIZE / 2;

const OFFENSE_SPOTS = [
  { x: 0.2, z: 0 },
  { x: 2.5, z: -4.8 },
  { x: 2.5, z: 4.8 },
  { x: 5.1, z: -1.9 },
  { x: 5.6, z: 1.9 },
];

const HOME_LINEUP = [
  { speed: 1.06, shoot: 0.77, defense: 0.78, finish: 0.72 },
  { speed: 1.04, shoot: 0.82, defense: 0.72, finish: 0.74 },
  { speed: 1.01, shoot: 0.78, defense: 0.8, finish: 0.76 },
  { speed: 0.97, shoot: 0.73, defense: 0.83, finish: 0.81 },
  { speed: 0.93, shoot: 0.68, defense: 0.87, finish: 0.86 },
];

const AWAY_LINEUP = [
  { speed: 1.04, shoot: 0.78, defense: 0.79, finish: 0.73 },
  { speed: 1.03, shoot: 0.81, defense: 0.74, finish: 0.75 },
  { speed: 1, shoot: 0.77, defense: 0.81, finish: 0.76 },
  { speed: 0.98, shoot: 0.74, defense: 0.84, finish: 0.82 },
  { speed: 0.94, shoot: 0.7, defense: 0.88, finish: 0.87 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomSigned(amount) {
  return randomBetween(-amount, amount);
}

function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clonePosition(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function getModeConfig(modeId) {
  return GAME_MODES[modeId] || GAME_MODES.exhibition;
}

function getThemeConfig(themeId) {
  return TEAM_THEMES[themeId] || TEAM_THEMES.ember;
}

function createCourtTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  const wood = context.createLinearGradient(0, 0, canvas.width, 0);
  wood.addColorStop(0, "#b66c39");
  wood.addColorStop(0.5, "#d3874e");
  wood.addColorStop(1, "#b66c39");
  context.fillStyle = wood;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 18; index += 1) {
    context.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.045)" : "rgba(90,45,15,0.045)";
    context.fillRect((index / 18) * canvas.width, 0, canvas.width / 18, canvas.height);
  }

  context.strokeStyle = "#f8f0da";
  context.lineWidth = 12;

  const marginX = 80;
  const marginY = 80;
  const playWidth = canvas.width - marginX * 2;
  const playHeight = canvas.height - marginY * 2;

  context.strokeRect(marginX, marginY, playWidth, playHeight);
  context.beginPath();
  context.moveTo(canvas.width / 2, marginY);
  context.lineTo(canvas.width / 2, canvas.height - marginY);
  context.stroke();
  context.beginPath();
  context.arc(canvas.width / 2, canvas.height / 2, 120, 0, Math.PI * 2);
  context.stroke();

  for (const side of [-1, 1]) {
    const laneX = side === -1 ? marginX + 150 : canvas.width - marginX - 150;
    const laneWidth = 210;
    const laneHeight = 320;
    const laneY = canvas.height / 2 - laneHeight / 2;

    if (side === -1) {
      context.strokeRect(laneX, laneY, laneWidth, laneHeight);
      context.beginPath();
      context.arc(laneX + laneWidth, canvas.height / 2, 120, -Math.PI / 2, Math.PI / 2);
      context.stroke();
    } else {
      context.strokeRect(laneX - laneWidth, laneY, laneWidth, laneHeight);
      context.beginPath();
      context.arc(laneX - laneWidth, canvas.height / 2, 120, Math.PI / 2, (Math.PI * 3) / 2);
      context.stroke();
    }

    context.beginPath();
    context.arc(
      side === -1 ? marginX + 130 : canvas.width - marginX - 130,
      canvas.height / 2,
      22,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createPlayerMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.56,
    metalness: 0.04,
  });
}

function createLimb(material, upperLength, lowerLength, radius) {
  const pivot = new THREE.Group();
  const upper = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, upperLength * 0.6, 4, 10),
    material,
  );
  upper.position.y = -(upperLength * 0.5);
  pivot.add(upper);

  const lowerPivot = new THREE.Group();
  lowerPivot.position.y = -upperLength;
  pivot.add(lowerPivot);

  const lower = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius * 0.94, lowerLength * 0.56, 4, 10),
    material,
  );
  lower.position.y = -(lowerLength * 0.5);
  lowerPivot.add(lower);

  return {
    pivot,
    lowerPivot,
  };
}

function createPlayerMesh(theme) {
  const primaryMaterial = createPlayerMaterial(theme.playerPrimary);
  const secondaryMaterial = createPlayerMaterial(theme.playerSecondary);
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: theme.accent,
    roughness: 0.5,
    metalness: 0.06,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5d1b6,
    roughness: 0.8,
  });

  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.8, 6, 12),
    primaryMaterial,
  );
  torso.position.y = 1.18;
  rig.add(torso);

  const shoulderBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.2, 16),
    secondaryMaterial,
  );
  shoulderBand.position.y = 1.7;
  rig.add(shoulderBand);

  const waist = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.39, 0.25, 16),
    accentMaterial,
  );
  waist.position.y = 0.9;
  rig.add(waist);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 18),
    skinMaterial,
  );
  head.position.y = 2.05;
  rig.add(head);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.08),
    accentMaterial,
  );
  visor.position.set(0, 2.02, 0.25);
  rig.add(visor);

  // ★臉部鐵則(07-11 使用者點名):眼睛+眉毛+微笑,貼頭前側(+z,與 visor 同向)
  const faceDark = new THREE.MeshBasicMaterial({ color: 0x25201a });
  const faceWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), faceWhite);
  eyeLeft.position.set(-0.1, 2.12, 0.24);
  rig.add(eyeLeft);
  const eyeRight = eyeLeft.clone();
  eyeRight.position.x = 0.1;
  rig.add(eyeRight);
  const pupilLeft = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), faceDark);
  pupilLeft.position.set(-0.1, 2.12, 0.29);
  rig.add(pupilLeft);
  const pupilRight = pupilLeft.clone();
  pupilRight.position.x = 0.1;
  rig.add(pupilRight);
  const browLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.02), faceDark);
  browLeft.position.set(-0.1, 2.21, 0.25);
  browLeft.rotation.z = 0.18;
  rig.add(browLeft);
  const browRight = browLeft.clone();
  browRight.position.x = 0.1;
  browRight.rotation.z = -0.18;
  rig.add(browRight);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.015, 8, 14, Math.PI),
    faceDark,
  );
  smile.position.set(0, 1.95, 0.24);
  smile.rotation.z = Math.PI;
  rig.add(smile);

  const leftArm = createLimb(secondaryMaterial, 0.58, 0.5, 0.08);
  leftArm.pivot.position.set(-0.46, 1.66, 0);
  rig.add(leftArm.pivot);

  const rightArm = createLimb(secondaryMaterial, 0.58, 0.5, 0.08);
  rightArm.pivot.position.set(0.46, 1.66, 0);
  rig.add(rightArm.pivot);

  const leftLeg = createLimb(primaryMaterial, 0.62, 0.58, 0.09);
  leftLeg.pivot.position.set(-0.19, 0.87, 0);
  rig.add(leftLeg.pivot);

  const rightLeg = createLimb(primaryMaterial, 0.62, 0.58, 0.09);
  rightLeg.pivot.position.set(0.19, 0.87, 0);
  rig.add(rightLeg.pivot);

  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.67, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff2020, // 控制中球員=紅圈(07-11 使用者點名;原 theme.ring 與隊色難分)
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    }),
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.03;
  selectionRing.visible = false;
  group.add(selectionRing);

  const possessionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 0.84, 32),
    new THREE.MeshBasicMaterial({
      color: theme.uiSoft,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  possessionRing.rotation.x = -Math.PI / 2;
  possessionRing.position.y = 0.02;
  possessionRing.visible = false;
  group.add(possessionRing);

  return {
    group,
    rig,
    torso,
    shoulderBand,
    waist,
    head,
    visor,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    selectionRing,
    possessionRing,
    materials: {
      primaryMaterial,
      secondaryMaterial,
      accentMaterial,
      selectionMaterial: selectionRing.material,
      possessionMaterial: possessionRing.material,
    },
  };
}

function applyThemeToVisuals(visuals, theme) {
  visuals.materials.primaryMaterial.color.set(theme.playerPrimary);
  visuals.materials.secondaryMaterial.color.set(theme.playerSecondary);
  visuals.materials.accentMaterial.color.set(theme.accent);
  visuals.materials.selectionMaterial.color.set(0xff2020); // 控制圈固定亮紅,不跟隊色(07-11 使用者點名)
  visuals.materials.possessionMaterial.color.set(theme.uiSoft);
}

function buildLaunchVelocity(start, target, duration, gravity) {
  const velocity = new THREE.Vector3();
  velocity.x = (target.x - start.x) / duration;
  velocity.z = (target.z - start.z) / duration;
  velocity.y = (target.y - start.y - 0.5 * gravity * duration * duration) / duration;
  return velocity;
}

function getShotTimingLabel(value) {
  const error = Math.abs(value - SHOT_WINDOW_CENTER);
  if (error <= 0.03) {
    return "完美釋放";
  }
  if (error <= SHOT_WINDOW_SIZE / 2) {
    return "優質出手";
  }
  return value < SHOT_WINDOW_CENTER ? "偏早" : "偏晚";
}

function solvePositiveQuadratic(a, b, c) {
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }

  const sqrt = Math.sqrt(discriminant);
  const t1 = (-b - sqrt) / (2 * a);
  const t2 = (-b + sqrt) / (2 * a);
  const candidates = [t1, t2].filter((value) => value > 0);
  return candidates.length ? Math.min(...candidates) : null;
}

export class BasketballGame {
  constructor({ canvas, touchRoot }) {
    this.canvas = canvas;
    this.touchRoot = touchRoot;

    const settings = loadSettings();
    this.difficulty = DIFFICULTY_PRESETS[settings.difficulty] ? settings.difficulty : "normal";
    this.modeId = GAME_MODES[settings.modeId] ? settings.modeId : "exhibition";
    this.homeThemeId = TEAM_THEMES[settings.homeThemeId] ? settings.homeThemeId : "ember";
    this.awayThemeId = TEAM_THEMES[settings.awayThemeId] ? settings.awayThemeId : "tide";
    this.mode = getModeConfig(this.modeId);

    this.input = new InputManager();
    this.input.bindTouchButtons(this.touchRoot);

    this.onHudUpdate = null;
    this.onEvent = null;

    this.running = false;
    this.time = 0;
    this.autoSaveTimer = 0;
    this.contactCooldown = 0;
    this.cameraShake = 0;
    this.phase = "menu";
    this.message = "在首頁選擇模式後開始比賽。";

    this.selectedHomePlayerId = "home-0";
    this.deadBallTimer = 0;
    this.breakTimer = 0;
    this.periodNumber = 1;
    this.overtimeCount = 0;
    this.periodClock = this.mode.quarterDuration;
    this.periodStarterTeam = "home";
    this.nextPossessionTeam = "home";
    this.pendingSetupAnnouncement = "在首頁選擇模式後開始比賽。";
    this.lastBounceAt = 0;
    this.userShotMeter = {
      active: false,
      value: 0.12,
      direction: 1,
      ownerId: null,
      text: "按住投籃鍵",
    };

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x061018);
    this.scene.fog = new THREE.Fog(0x09131d, 26, 48);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    this.camera.position.set(-6, 18, 19);

    this.clock = new THREE.Clock();
    this.pointer = {
      cameraFocus: new THREE.Vector3(),
      cameraPosition: new THREE.Vector3(-6, 18, 19),
    };

    this.players = [];
    this.ball = {
      mesh: null,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      ownerId: null,
      passTargetId: null,
      pendingShot: null,
      freeTimer: 0,
      lastTouchTeam: "home",
    };

    this.score = { ...this.mode.startScore };
    this.shotClock = this.mode.shotClock;
    this.possessionTeam = "home";
    this.hoops = {};

    this.setupScene();
    this.createTeams();
    this.setupPossession("home", "在首頁選擇模式後開始比賽。");

    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  emitEvent(type, payload = {}) {
    if (this.onEvent) {
      this.onEvent({ type, ...payload });
    }
  }

  savePresentationSettings() {
    saveSettings({
      difficulty: this.difficulty,
      modeId: this.modeId,
      homeThemeId: this.homeThemeId,
      awayThemeId: this.awayThemeId,
    });
  }

  get difficultyPreset() {
    return DIFFICULTY_PRESETS[this.difficulty];
  }

  getTeamLabel(team) {
    return getThemeConfig(team === "home" ? this.homeThemeId : this.awayThemeId).name;
  }

  setDifficulty(difficulty) {
    if (!DIFFICULTY_PRESETS[difficulty]) {
      return;
    }
    this.difficulty = difficulty;
    this.savePresentationSettings();
    this.message = `AI 強度已切換為 ${DIFFICULTY_LABELS[difficulty]}。`;
    this.pushHud();
  }

  setThemes(homeThemeId, awayThemeId) {
    if (TEAM_THEMES[homeThemeId]) {
      this.homeThemeId = homeThemeId;
    }
    if (TEAM_THEMES[awayThemeId]) {
      this.awayThemeId = awayThemeId;
    }
    this.applyThemeSelections();
    this.savePresentationSettings();
    this.pushHud();
  }

  applyPresentation({ difficulty, modeId, homeThemeId, awayThemeId }) {
    if (difficulty && DIFFICULTY_PRESETS[difficulty]) {
      this.difficulty = difficulty;
    }
    if (modeId && GAME_MODES[modeId]) {
      this.modeId = modeId;
      this.mode = getModeConfig(modeId);
    }
    if (homeThemeId || awayThemeId) {
      this.homeThemeId = TEAM_THEMES[homeThemeId] ? homeThemeId : this.homeThemeId;
      this.awayThemeId = TEAM_THEMES[awayThemeId] ? awayThemeId : this.awayThemeId;
      this.applyThemeSelections();
    }
    this.savePresentationSettings();
    this.message = `${this.mode.label} 已設定完成。`;
    this.pushHud();
  }

  openHomeMenu() {
    this.cancelShotMeter();
    this.phase = "menu";
    this.message = "調整模式與配色後開始比賽。";
    this.pushHud();
  }

  setupScene() {
    const ambient = new THREE.HemisphereLight(0xffffff, 0x102030, 1.5);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff3d8, 2.1);
    keyLight.position.set(8, 18, 10);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6cb7ff, 0.9);
    rimLight.position.set(-12, 12, -10);
    this.scene.add(rimLight);

    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT_LENGTH, COURT_WIDTH),
      new THREE.MeshStandardMaterial({
        map: createCourtTexture(),
        roughness: 0.88,
        metalness: 0.02,
      }),
    );
    court.rotation.x = -Math.PI / 2;
    this.scene.add(court);

    const surround = new THREE.Mesh(
      new THREE.PlaneGeometry(72, 72),
      new THREE.MeshStandardMaterial({
        color: 0x0a1b26,
        roughness: 1,
      }),
    );
    surround.rotation.x = -Math.PI / 2;
    surround.position.y = -0.02;
    this.scene.add(surround);

    for (const side of [-1, 1]) {
      const stands = new THREE.Mesh(
        new THREE.BoxGeometry(4, 2.4, 20),
        new THREE.MeshStandardMaterial({
          color: side === -1 ? 0x112838 : 0x0f2232,
          roughness: 0.96,
        }),
      );
      stands.position.set(side * 18, 1.2, 0);
      this.scene.add(stands);
    }

    for (const side of [-1, 1]) {
      const sidelineWall = new THREE.Mesh(
        new THREE.BoxGeometry(34, 1.3, 2.2),
        new THREE.MeshStandardMaterial({
          color: 0x102231,
          roughness: 0.92,
        }),
      );
      sidelineWall.position.set(0, 0.65, side * 10.5);
      this.scene.add(sidelineWall);
    }

    this.hoops.home = this.createHoop(-1);
    this.hoops.away = this.createHoop(1);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xe06a15,
        roughness: 0.8,
        metalness: 0.03,
      }),
    );
    this.scene.add(ball);
    this.ball.mesh = ball;
  }

  createHoop(side) {
    const group = new THREE.Group();
    const rimX = side * (HALF_COURT - HOOP_OFFSET);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 1.1, 1.85),
      new THREE.MeshStandardMaterial({
        color: 0xf5f9ff,
        emissive: 0x0f1b28,
        roughness: 0.32,
      }),
    );
    board.position.set(rimX + side * 0.58, 3.4, 0);
    group.add(board);

    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 3.7, 12),
      new THREE.MeshStandardMaterial({ color: 0x556a7b, roughness: 0.64 }),
    );
    support.position.set(rimX + side * 1.15, 1.85, 0);
    group.add(support);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x7b8d9a, roughness: 0.58 }),
    );
    arm.position.set(rimX + side * 0.58, 3.2, 0);
    group.add(arm);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(RIM_RADIUS, 0.04, 14, 34),
      new THREE.MeshStandardMaterial({ color: 0xff6d28, roughness: 0.46 }),
    );
    rim.rotation.x = Math.PI / 2; // 框面水平、圈口朝上(07-10 使用者點名:原本繞 Y 轉是直立圈)
    rim.position.set(rimX, RIM_HEIGHT, 0);
    group.add(rim);

    this.scene.add(group);

    return {
      group,
      rimCenter: new THREE.Vector3(rimX, RIM_HEIGHT, 0),
    };
  }

  createTeams() {
    this.players.length = 0;

    for (const team of ["home", "away"]) {
      const lineup = team === "home" ? HOME_LINEUP : AWAY_LINEUP;
      const theme = getThemeConfig(team === "home" ? this.homeThemeId : this.awayThemeId);

      for (let roleIndex = 0; roleIndex < 5; roleIndex += 1) {
        const visuals = createPlayerMesh(theme);
        const player = {
          id: `${team}-${roleIndex}`,
          team,
          roleIndex,
          roleName: ROLE_NAMES[roleIndex],
          speed: lineup[roleIndex].speed,
          shoot: lineup[roleIndex].shoot,
          defense: lineup[roleIndex].defense,
          finish: lineup[roleIndex].finish,
          stamina: 1,
          position: new THREE.Vector3(),
          velocity: new THREE.Vector3(),
          heading: team === "home" ? Math.PI / 2 : -Math.PI / 2,
          cooldown: 0,
          decisionTimer: randomBetween(0.15, 0.5),
          animationTime: randomBetween(0, Math.PI * 2),
          visuals,
          group: visuals.group,
          selectionRing: visuals.selectionRing,
          possessionRing: visuals.possessionRing,
        };

        this.scene.add(player.group);
        this.players.push(player);
      }
    }
  }

  applyThemeSelections() {
    for (const player of this.players) {
      const theme = getThemeConfig(player.team === "home" ? this.homeThemeId : this.awayThemeId);
      applyThemeToVisuals(player.visuals, theme);
    }
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.clock.start();

    const tick = () => {
      if (!this.running) {
        return;
      }

      const delta = Math.min(this.clock.getDelta(), 0.05);
      this.update(delta);
      this.render();
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getTeamPlayers(team) {
    return this.players.filter((player) => player.team === team);
  }

  getPlayerById(id) {
    return this.players.find((player) => player.id === id) || null;
  }

  getBallOwner() {
    return this.ball.ownerId ? this.getPlayerById(this.ball.ownerId) : null;
  }

  getControlledHomePlayer() {
    return this.getPlayerById(this.selectedHomePlayerId) || this.getTeamPlayers("home")[0];
  }

  getUserControlledPlayer() {
    const owner = this.getBallOwner();
    if (owner && owner.team === "home" && this.possessionTeam === "home") {
      return owner;
    }
    return this.getControlledHomePlayer();
  }

  getTargetHoopForTeam(team) {
    return team === "home" ? this.hoops.away : this.hoops.home;
  }

  getOwnHoop(team) {
    return team === "home" ? this.hoops.home : this.hoops.away;
  }

  getAttackDirection(team) {
    return team === "home" ? 1 : -1;
  }

  getPeriodCode() {
    if (this.overtimeCount > 0) {
      return `OT${this.overtimeCount}`;
    }
    if (this.modeId === "clutch" || this.modeId === "race21") {
      return this.mode.short;
    }
    return `Q${this.periodNumber}`;
  }

  getPeriodDisplay() {
    if (this.overtimeCount > 0) {
      return `延長賽 ${this.overtimeCount}`;
    }
    if (this.modeId === "clutch") {
      return "決勝時刻";
    }
    if (this.modeId === "race21") {
      return "搶 21";
    }
    return `第 ${this.periodNumber} 節`;
  }

  getCurrentPeriodDuration() {
    return this.overtimeCount > 0 ? this.mode.overtimeDuration : this.mode.quarterDuration;
  }

  getPhaseLabel() {
    if (this.phase === "menu") {
      return "主選單";
    }
    if (this.phase === "paused") {
      return "暫停";
    }
    if (this.phase === "break") {
      return "節間休息";
    }
    if (this.phase === "finished") {
      return "比賽結束";
    }
    return "比賽中";
  }

  togglePause() {
    if (this.phase === "finished" || this.phase === "break" || this.phase === "menu") {
      return;
    }

    this.cancelShotMeter();
    this.phase = this.phase === "paused" ? "live" : "paused";
    this.message = this.phase === "paused" ? "比賽已暫停。" : "比賽繼續。";
    this.pushHud();
  }

  resume() {
    if (this.phase === "paused") {
      this.phase = "live";
      this.message = "回到場上，比賽繼續。";
      this.pushHud();
    }
  }

  startSelectedMatch() {
    this.newMatch();
  }

  newMatch() {
    this.mode = getModeConfig(this.modeId);
    this.score = { ...this.mode.startScore };
    this.periodNumber = 1;
    this.overtimeCount = 0;
    this.periodClock = this.mode.quarterDuration;
    this.periodStarterTeam = "home";
    this.nextPossessionTeam = "home";
    this.deadBallTimer = 0;
    this.breakTimer = 0;
    this.phase = "live";
    this.shotClock = this.mode.shotClock;
    this.selectedHomePlayerId = "home-0";
    this.pendingSetupAnnouncement = `${this.mode.label} 開球。`;
    this.message = this.pendingSetupAnnouncement;
    this.cancelShotMeter();

    for (const player of this.players) {
      player.stamina = 1;
      player.cooldown = 0;
      player.decisionTimer = randomBetween(0.15, 0.45);
    }

    this.setupPossession("home", this.pendingSetupAnnouncement);
    this.emitEvent("match-start", {
      modeId: this.modeId,
      modeLabel: this.mode.label,
    });
    this.emitEvent("period-start", {
      period: this.getPeriodDisplay(),
      announce: `${this.mode.label}，比賽開始。`,
    });
    this.pushHud();
  }

  setupPossession(team, announcement = null) {
    this.possessionTeam = team;
    this.nextPossessionTeam = team;
    this.deadBallTimer = 0;
    this.shotClock = this.mode.shotClock;
    this.ball.pendingShot = null;
    this.ball.passTargetId = null;
    this.ball.freeTimer = 0;
    this.ball.velocity.set(0, 0, 0);
    this.ball.lastTouchTeam = team;
    this.cancelShotMeter();

    const attackDirection = this.getAttackDirection(team);
    const offenseStartX = attackDirection === 1 ? -10.2 : 10.2;
    const defenseAnchorX = attackDirection === 1 ? -1.8 : 1.8;

    for (const player of this.getTeamPlayers(team)) {
      const template = OFFENSE_SPOTS[player.roleIndex];
      player.position.set(
        clamp(offenseStartX + template.x * attackDirection, -12.5, 12.5),
        0,
        clamp(template.z, -5.8, 5.8),
      );
      player.velocity.set(0, 0, 0);
      player.heading = attackDirection === 1 ? Math.PI / 2 : -Math.PI / 2;
      player.stamina = clamp(player.stamina + 0.04, 0.3, 1);
    }

    for (const player of this.getTeamPlayers(team === "home" ? "away" : "home")) {
      const markTemplate = OFFENSE_SPOTS[player.roleIndex];
      player.position.set(
        clamp(defenseAnchorX + markTemplate.x * attackDirection, -10.5, 10.5),
        0,
        clamp(markTemplate.z * 0.9, -5.2, 5.2),
      );
      player.velocity.set(0, 0, 0);
      player.heading = attackDirection === 1 ? Math.PI / 2 : -Math.PI / 2;
      player.stamina = clamp(player.stamina + 0.02, 0.3, 1);
    }

    const handler = this.getPlayerById(`${team}-0`);
    this.ball.ownerId = handler.id;
    this.ball.position.copy(handler.position);
    this.ball.position.y = 0.9;

    if (team === "home") {
      this.selectedHomePlayerId = handler.id;
    } else {
      this.selectedHomePlayerId = this.findClosestPlayer("home", handler.position).id;
    }

    if (announcement) {
      this.message = announcement;
    }
  }

  deadBallTo(team, message, delay = 0.95, setupAnnouncement = null) {
    this.deadBallTimer = delay;
    this.nextPossessionTeam = team;
    this.pendingSetupAnnouncement =
      setupAnnouncement ||
      `${this.getTeamLabel(team)} 發球，重新組織進攻。`;
    this.ball.ownerId = null;
    this.ball.passTargetId = null;
    this.ball.pendingShot = null;
    this.ball.velocity.set(0, 0, 0);
    this.message = message;
    this.cancelShotMeter();
  }

  findClosestPlayer(team, position) {
    let bestPlayer = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const player of this.getTeamPlayers(team)) {
      const distance = distanceXZ(player.position, position);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPlayer = player;
      }
    }

    return bestPlayer;
  }

  findNearestDefender(player) {
    const opponents = this.getTeamPlayers(player.team === "home" ? "away" : "home");
    let nearest = opponents[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const defender of opponents) {
      const distance = distanceXZ(player.position, defender.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = defender;
      }
    }

    return { player: nearest, distance: nearestDistance };
  }

  update(delta) {
    this.time += delta;
    this.contactCooldown = Math.max(0, this.contactCooldown - delta);
    this.cameraShake = Math.max(0, this.cameraShake - delta * 1.8);

    if (this.input.consumePress("pause")) {
      this.togglePause();
    }

    if (this.phase === "menu" || this.phase === "paused") {
      this.updateCamera(delta);
      this.syncMeshes(delta);
      this.pushHud();
      this.input.endFrame();
      return;
    }

    if (this.phase === "break") {
      this.breakTimer = Math.max(0, this.breakTimer - delta);
      if (this.breakTimer === 0) {
        const announcement = `${this.getPeriodDisplay()} 開始。`;
        this.phase = "live";
        this.setupPossession(this.periodStarterTeam, announcement);
        this.emitEvent("period-start", {
          period: this.getPeriodDisplay(),
          announce: announcement,
        });
      }
      this.updateCamera(delta);
      this.syncMeshes(delta);
      this.autoSave(delta);
      this.pushHud();
      this.input.endFrame();
      return;
    }

    if (this.phase !== "finished") {
      if (this.deadBallTimer > 0) {
        this.deadBallTimer = Math.max(0, this.deadBallTimer - delta);
        if (this.deadBallTimer === 0) {
          this.setupPossession(this.nextPossessionTeam, this.pendingSetupAnnouncement);
          this.pendingSetupAnnouncement = null;
        }
      } else {
        this.periodClock = Math.max(0, this.periodClock - delta);
        this.shotClock = Math.max(0, this.shotClock - delta);

        if (this.shotClock === 0) {
          this.deadBallTo(
            this.possessionTeam === "home" ? "away" : "home",
            "24 秒違例，球權轉換。",
            0.8,
          );
        } else {
          this.handleUserControl(delta);
          this.updateAI(delta);
          this.updateStamina(delta);
          this.updatePlayers(delta);
          this.updateBall(delta);
          this.resolveLooseBall();
        }

        if (this.periodClock === 0 && this.phase === "live") {
          this.handlePeriodExpired();
        }
      }
    }

    this.updateCamera(delta);
    this.syncMeshes(delta);
    this.autoSave(delta);
    this.pushHud();
    this.input.endFrame();
  }

  handlePeriodExpired() {
    this.cancelShotMeter();
    this.ball.ownerId = null;
    this.ball.pendingShot = null;
    this.ball.passTargetId = null;
    this.ball.velocity.set(0, 0, 0);
    this.emitEvent("period-end", {
      period: this.getPeriodDisplay(),
    });

    if (this.mode.targetScore && this.score.home !== this.score.away) {
      this.finishMatch();
      return;
    }

    if (this.overtimeCount === 0 && this.periodNumber < this.mode.regulationPeriods) {
      this.periodNumber += 1;
      this.periodClock = this.mode.quarterDuration;
      this.periodStarterTeam = this.periodNumber % 2 === 1 ? "home" : "away";
      this.phase = "break";
      this.breakTimer = 1.4;
      this.message = `${this.getPeriodDisplay()} 即將開始。`;
      return;
    }

    if (this.score.home === this.score.away) {
      this.overtimeCount += 1;
      this.periodClock = this.mode.overtimeDuration;
      this.periodStarterTeam = this.overtimeCount % 2 === 1 ? "home" : "away";
      this.phase = "break";
      this.breakTimer = 1.5;
      this.message =
        this.overtimeCount === 1
          ? "平手，進入延長賽。"
          : `延長賽 ${this.overtimeCount} 即將開始。`;
      return;
    }

    this.finishMatch();
  }

  finishMatch() {
    this.phase = "finished";
    this.cancelShotMeter();
    this.ball.ownerId = null;
    this.ball.pendingShot = null;

    const winnerTeam = this.score.home > this.score.away ? "home" : "away";
    const winnerLabel = this.getTeamLabel(winnerTeam);
    this.message = `時間到，${winnerLabel} ${this.score.home}:${this.score.away} 拿下比賽。`;

    this.emitEvent("match-end", {
      winnerTeam,
      winnerLabel,
      homeScore: this.score.home,
      awayScore: this.score.away,
    });
  }

  handleUserControl(delta) {
    const player = this.getUserControlledPlayer();
    if (!player) {
      return;
    }

    if (this.input.consumePress("switch")) {
      // 防守或無人持球(籃板/散球)都能切;進攻時控制自動跟持球者,Tab 不需要
      if (this.possessionTeam !== "home" || !this.getBallOwner()) this.switchDefender();
    }

    const move = this.input.getMovementVector();
    const movement = new THREE.Vector3(move.x, 0, move.z);
    const isSprint = this.input.isDown("sprint");

    if (movement.lengthSq() > 0) {
      movement.normalize();
      this.applyMotion(player, movement, delta, isSprint ? 1.62 : 1.02); // 衝刺要明顯(07-11 使用者:按 Shift 沒衝刺)
    } else {
      this.applyMotion(player, null, delta, 1);
    }

    const owner = this.getBallOwner();
    const canUserShoot =
      owner &&
      owner.id === player.id &&
      player.team === "home" &&
      this.possessionTeam === "home" &&
      this.deadBallTimer === 0;

    if (canUserShoot) {
      if (this.input.isDown("shoot")) {
        this.advanceShotMeter(delta, owner.id);
      } else if (this.userShotMeter.active && this.input.consumeRelease("shoot")) {
        const meterValue = this.userShotMeter.value;
        this.cancelShotMeter();
        this.shootBall(owner, true, meterValue);
      }

      if (this.input.consumePress("pass")) {
        this.cancelShotMeter();
        const target = this.chooseBestPassTarget(owner, true);
        if (target) {
          this.passBall(owner, target);
        }
      }
    } else {
      this.cancelShotMeter();
      if (this.possessionTeam !== "home" && this.deadBallTimer === 0) {
        const pressedAction = this.input.consumePress("action") || this.input.consumePress("shoot");
        if (pressedAction) {
          this.tryStealOrBlock(player, true);
        }
      }
    }
  }

  advanceShotMeter(delta, ownerId) {
    if (!this.userShotMeter.active || this.userShotMeter.ownerId !== ownerId) {
      this.userShotMeter.active = true;
      this.userShotMeter.value = 0.12;
      this.userShotMeter.direction = 1;
      this.userShotMeter.ownerId = ownerId;
    }

    this.userShotMeter.value += delta * 1.9 * this.userShotMeter.direction;
    if (this.userShotMeter.value >= 1) {
      this.userShotMeter.value = 1 - (this.userShotMeter.value - 1);
      this.userShotMeter.direction = -1;
    } else if (this.userShotMeter.value <= 0) {
      this.userShotMeter.value = Math.abs(this.userShotMeter.value);
      this.userShotMeter.direction = 1;
    }

    this.userShotMeter.text = `放開出手: ${getShotTimingLabel(this.userShotMeter.value)}`;
  }

  cancelShotMeter() {
    this.userShotMeter.active = false;
    this.userShotMeter.value = 0;
    this.userShotMeter.direction = 1;
    this.userShotMeter.ownerId = null;
    this.userShotMeter.text = "按住投籃鍵";
  }

  shouldRunReboundFlow() {
    return Boolean(
      this.ball.pendingShot ||
        (!this.ball.ownerId && this.ball.freeTimer > 0.1 && this.ball.position.y > 0.45),
    );
  }

  predictBallLandingPoint() {
    const gravity = -18;
    const a = 0.5 * gravity;
    const b = this.ball.velocity.y;
    const c = this.ball.position.y - BALL_RADIUS;
    const t = solvePositiveQuadratic(a, b, c) ?? 0.75;
    return new THREE.Vector3(
      clamp(this.ball.position.x + this.ball.velocity.x * t, -12.8, 12.8),
      0,
      clamp(this.ball.position.z + this.ball.velocity.z * t, -6.3, 6.3),
    );
  }

  updateAI(delta) {
    const owner = this.getBallOwner();

    for (const player of this.players) {
      if (player.cooldown > 0) {
        player.cooldown = Math.max(0, player.cooldown - delta);
      }
      player.decisionTimer -= delta;
    }

    if (!owner) {
      // 散球:每隊只派離球最近的 2 人去追,其餘拉開站位——
      // 原本 9 人全衝球點,推擠力互鎖成一團動彈不得(07-11 使用者回報 bug)
      const chasers = new Set();
      for (const team of ["home", "away"]) {
        const sorted = this.getTeamPlayers(team)
          .filter((p) => this.getUserControlledPlayer().id !== p.id)
          .sort(
            (a, b) =>
              distanceXZ(a.position, this.ball.position) -
              distanceXZ(b.position, this.ball.position),
          );
        for (const p of sorted.slice(0, 2)) {
          chasers.add(p.id);
        }
      }
      for (const player of this.players) {
        if (this.getUserControlledPlayer().id === player.id) {
          continue;
        }
        if (this.shouldRunReboundFlow()) {
          this.updateReboundAI(player, delta);
        } else if (chasers.has(player.id)) {
          this.movePlayerTo(player, this.ball.position, delta, 1.08);
        } else {
          const index = this.players.indexOf(player);
          const angle = (index / this.players.length) * Math.PI * 2;
          const spread = new THREE.Vector3(
            clamp(this.ball.position.x + Math.cos(angle) * 4.6, -12.5, 12.5),
            0,
            clamp(this.ball.position.z + Math.sin(angle) * 3.4, -6.5, 6.5),
          );
          this.movePlayerTo(player, spread, delta, 0.82);
        }
      }
      return;
    }

    for (const player of this.players) {
      const isUser = this.getUserControlledPlayer().id === player.id;
      if (isUser || this.deadBallTimer > 0) {
        continue;
      }

      if (this.shouldRunReboundFlow()) {
        this.updateReboundAI(player, delta);
        continue;
      }

      if (player.team === this.possessionTeam) {
        if (player.id === owner.id) {
          this.updateBallHandlerAI(player, delta);
        } else {
          this.updateOffBallOffense(player, delta);
        }
      } else {
        this.updateDefenseAI(player, delta);
      }
    }
  }

  updateBallHandlerAI(player, delta) {
    const difficulty = this.difficultyPreset;
    const hoop = this.getTargetHoopForTeam(player.team).rimCenter;
    const toHoop = new THREE.Vector3(hoop.x - player.position.x, 0, hoop.z - player.position.z);
    const distanceToHoop = toHoop.length();
    const nearestDefender = this.findNearestDefender(player);
    const pressure = clamp(1 - nearestDefender.distance / 2.8, 0, 1);
    const openFactor = clamp(nearestDefender.distance / 2.6, 0.35, 1.2);

    if (player.decisionTimer <= 0) {
      player.decisionTimer = randomBetween(0.34, 0.65) / difficulty.aiDecision;

      const forcedShot = this.shotClock < 4.2;
      const shotQuality =
        player.shoot *
        difficulty.aiShoot *
        openFactor *
        THREE.MathUtils.lerp(0.78, 1.06, player.stamina) *
        clamp(1 - Math.max(0, distanceToHoop - 4) / 11.5, 0.3, 1.05);

      if (
        (forcedShot || (distanceToHoop < 9.8 && pressure < 0.55)) &&
        Math.random() < shotQuality * 0.34
      ) {
        this.shootBall(player, false);
        return;
      }

      if ((pressure > 0.48 || distanceToHoop > 11.8) && Math.random() < 0.72) {
        const target = this.chooseBestPassTarget(player, false);
        if (target) {
          this.passBall(player, target);
          return;
        }
      }
    }

    const driveTarget = hoop.clone();
    driveTarget.x -= this.getAttackDirection(player.team) * 2.1;
    driveTarget.z = clamp(
      pressure > 0.4
        ? player.position.z + randomSigned(2.6)
        : THREE.MathUtils.lerp(player.position.z, randomSigned(1.4), 0.02),
      -5.5,
      5.5,
    );

    if (distanceToHoop > 11) {
      driveTarget.x = THREE.MathUtils.lerp(
        player.position.x,
        player.position.x + this.getAttackDirection(player.team) * 5.4,
        0.5,
      );
    }

    this.movePlayerTo(player, driveTarget, delta, 0.95 * difficulty.aiMove);
  }

  updateOffBallOffense(player, delta) {
    const spot = this.getOffenseSpot(player);
    this.movePlayerTo(player, spot, delta, 0.96);
  }

  updateDefenseAI(player, delta) {
    const owner = this.getBallOwner();
    if (!owner) {
      this.movePlayerTo(player, this.ball.position, delta, 1.02);
      return;
    }

    const difficulty = this.difficultyPreset;
    const ownHoop = this.getOwnHoop(player.team).rimCenter;
    const mark =
      this.getPlayerById(`${player.team === "home" ? "away" : "home"}-${player.roleIndex}`) ||
      owner;
    const target = mark.position.clone();
    const helpVector = ownHoop.clone().sub(mark.position);
    helpVector.y = 0;
    if (helpVector.lengthSq() > 0.001) {
      helpVector.normalize();
    }

    target.addScaledVector(helpVector, mark.id === owner.id ? 0.72 : 1.15);
    target.z += mark.id === owner.id ? clamp(owner.velocity.z * 0.14, -0.5, 0.5) : 0;

    this.movePlayerTo(
      player,
      target,
      delta,
      (mark.id === owner.id ? 1.02 : 0.9) * difficulty.aiDefense,
    );

    if (
      player.team === "away" &&
      owner.team === "home" &&
      distanceXZ(player.position, owner.position) < 0.96 &&
      player.cooldown === 0 &&
      Math.random() < 0.011 * difficulty.aiDefense * 60 * delta
    ) {
      this.tryStealOrBlock(player, false);
    }
  }

  updateReboundAI(player, delta) {
    const landing = this.predictBallLandingPoint();
    const shot = this.ball.pendingShot;
    const reboundHoop =
      shot?.targetHoop
        ? this.hoops[shot.targetHoop].rimCenter
        : this.ball.position.x > 0
          ? this.hoops.away.rimCenter
          : this.hoops.home.rimCenter;
    const fromHoop = landing.clone().sub(reboundHoop);
    fromHoop.y = 0;
    if (fromHoop.lengthSq() < 0.001) {
      fromHoop.set(this.getAttackDirection(player.team), 0, 0);
    } else {
      fromHoop.normalize();
    }

    const side = player.roleIndex % 2 === 0 ? -1 : 1;
    const lateral = new THREE.Vector3(-fromHoop.z, 0, fromHoop.x).multiplyScalar(side * 0.45);
    const defendingTeam = shot
      ? shot.shooterTeam === "home"
        ? "away"
        : "home"
      : this.possessionTeam === "home"
        ? "away"
        : "home";
    const boxOutDepth = player.team === defendingTeam ? 0.9 : 0.15;
    const target = landing.clone().addScaledVector(fromHoop, boxOutDepth).add(lateral);

    this.movePlayerTo(player, target, delta, player.team === defendingTeam ? 1.04 : 0.98);
  }

  getOffenseSpot(player) {
    const attackDirection = this.getAttackDirection(player.team);
    const owner = this.getBallOwner();
    const anchorPlayer =
      owner && owner.team === player.team ? owner : this.getPlayerById(`${player.team}-0`);
    const progress =
      attackDirection === 1
        ? clamp((anchorPlayer.position.x + HALF_COURT) / COURT_LENGTH, 0.15, 0.9)
        : clamp((HALF_COURT - anchorPlayer.position.x) / COURT_LENGTH, 0.15, 0.9);
    const laneX = THREE.MathUtils.lerp(-7.5 * attackDirection, 7.2 * attackDirection, progress);
    const template = OFFENSE_SPOTS[player.roleIndex];

    return new THREE.Vector3(
      clamp(laneX + template.x * attackDirection, -12.3, 12.3),
      0,
      clamp(template.z + Math.sin(this.time + player.roleIndex) * 0.32, -5.8, 5.8),
    );
  }

  chooseBestPassTarget(passer, userInitiated) {
    const teammates = this
      .getTeamPlayers(passer.team)
      .filter((candidate) => candidate.id !== passer.id);
    const hoop = this.getTargetHoopForTeam(passer.team).rimCenter;
    const difficulty = this.difficultyPreset;

    let bestTarget = null;
    let bestScore = -999;

    for (const teammate of teammates) {
      const nearestDefender = this.findNearestDefender(teammate);
      const hoopDistance = distanceXZ(teammate.position, hoop);
      const spacing = clamp(nearestDefender.distance, 0.1, 4);
      const forwardBonus =
        this.getAttackDirection(passer.team) === 1
          ? (teammate.position.x - passer.position.x) * 0.2
          : (passer.position.x - teammate.position.x) * 0.2;
      const score =
        spacing * 1.4 -
        hoopDistance * 0.12 +
        forwardBonus +
        teammate.stamina * 0.5 +
        (userInitiated ? teammate.shoot * 0.45 : teammate.finish * difficulty.aiDecision);

      if (score > bestScore) {
        bestScore = score;
        bestTarget = teammate;
      }
    }

    return bestTarget;
  }

  passBall(passer, target) {
    if (!passer || !target || this.getBallOwner()?.id !== passer.id) {
      return;
    }

    const start = passer.position.clone();
    start.y = 1.25;
    const end = target.position.clone();
    end.y = 1.15;

    const distance = distanceXZ(start, end);
    const duration = clamp(distance / 9.5, 0.38, 0.75);
    this.ball.ownerId = null;
    this.ball.passTargetId = target.id;
    this.ball.passerId = passer.id; // 傳球者短時間內不能自接(J 鍵傳球 bug 根因)
    this.ball.pendingShot = null;
    this.ball.freeTimer = 0;
    this.ball.lastTouchTeam = passer.team;
    this.ball.position.copy(start);
    this.ball.velocity
      .copy(buildLaunchVelocity(start, end, duration, -18))
      .multiplyScalar(1.02);
    this.message =
      passer.team === "home"
        ? `傳球給 ${target.roleName}`
        : `${this.getTeamLabel("away")} 正在轉移球權。`;
  }

  shootBall(shooter, isUserShot, releaseValue = SHOT_WINDOW_CENTER) {
    if (!shooter || this.getBallOwner()?.id !== shooter.id) {
      return;
    }

    const difficulty = this.difficultyPreset;
    const targetHoop = this.getTargetHoopForTeam(shooter.team).rimCenter;
    const release = shooter.position.clone();
    release.y = 1.42;
    const distance = distanceXZ(release, targetHoop);
    const points = distance > 6.75 ? 3 : 2;
    const nearestDefender = this.findNearestDefender(shooter);
    const openness = clamp(nearestDefender.distance / 2.8, 0.3, 1.2);
    const rangePenalty = clamp((distance - 4.5) / 11.5, 0, 0.48);
    const staminaBoost = THREE.MathUtils.lerp(0.8, 1.08, shooter.stamina);
    const shotBase = shooter.shoot * openness * (1 - rangePenalty);
    const finishingBoost = distance < 3.2 ? shooter.finish * 0.18 : 0;
    const windowScale = difficulty.shotWindow || 1;
    const timingError = Math.abs(releaseValue - SHOT_WINDOW_CENTER);
    const timingBoost = isUserShot ? clamp(1.2 - timingError / (0.18 * windowScale), 0.72, 1.2) : 1;
    const userAssist = shooter.team === "home" ? difficulty.userAssist : difficulty.aiShoot;
    const accuracy = clamp(
      (shotBase + finishingBoost) * userAssist * timingBoost * staminaBoost,
      0.1,
      0.94,
    );
    const willScore = Math.random() < accuracy;
    const missSpread = clamp(1 - accuracy, 0.05, 0.46);
    const aim = targetHoop.clone();
    aim.x += willScore ? randomSigned(0.08) : randomSigned(0.45 + missSpread);
    aim.z += willScore ? randomSigned(0.08) : randomSigned(0.55 + missSpread);
    aim.y = RIM_HEIGHT + (willScore ? 0.04 : randomSigned(0.22));

    const duration = clamp(distance / 10.5, 0.88, 1.34);

    this.ball.ownerId = null;
    this.ball.passTargetId = null;
    this.ball.freeTimer = 0;
    this.ball.lastTouchTeam = shooter.team;
    this.ball.position.copy(release);
    this.ball.velocity.copy(buildLaunchVelocity(release, aim, duration, -18));
    this.ball.pendingShot = {
      shooterId: shooter.id,
      shooterTeam: shooter.team,
      points,
      willScore,
      targetHoop: shooter.team === "home" ? "away" : "home",
      checkedRim: false,
    };

    if (isUserShot) {
      this.message = `${getShotTimingLabel(releaseValue)}，出手 ${points} 分球。`;
    } else {
      this.message = `${this.getTeamLabel("away")} 出手。`;
    }
  }

  tryStealOrBlock(defender, userInitiated) {
    const owner = this.getBallOwner();
    if (!owner || owner.team === defender.team || defender.cooldown > 0) {
      return;
    }

    defender.cooldown = 0.8;

    // 撲抄突進:朝持球者衝一步+鏡頭微震——按 K 一定看得到動作(07-11 使用者:無明顯反應)
    if (userInitiated) {
      const lunge = new THREE.Vector3()
        .subVectors(owner.position, defender.position)
        .setY(0)
        .normalize();
      defender.velocity.addScaledVector(lunge, 5.2);
      this.cameraShake = Math.max(this.cameraShake, 0.1);
    }

    const difficulty = this.difficultyPreset;
    const spacing = distanceXZ(defender.position, owner.position);
    const spacingFactor = clamp(1 - spacing / 1.9, 0.08, 1);
    const staminaFactor = THREE.MathUtils.lerp(0.82, 1.08, defender.stamina);
    const baseChance =
      defender.defense *
      staminaFactor *
      spacingFactor *
      (userInitiated ? 0.5 : 0.2 * difficulty.aiDefense) *
      (this.ball.pendingShot ? 0.75 : 1);

    if (Math.random() < baseChance) {
      this.ball.pendingShot = null;
      this.ball.passTargetId = null;
      this.ball.ownerId = defender.id;
      this.ball.lastTouchTeam = defender.team;
      this.possessionTeam = defender.team;
      this.shotClock = this.mode.shotClock;
      this.cancelShotMeter();
      this.cameraShake = Math.max(this.cameraShake, 0.18);

      if (defender.team === "home") {
        this.selectedHomePlayerId = defender.id;
      } else {
        this.selectedHomePlayerId = this.findClosestPlayer("home", defender.position).id;
      }

      this.message =
        defender.team === "home"
          ? "成功抄截，快攻開始。"
          : `${this.getTeamLabel("away")} 抄截成功。`;

      this.emitEvent("steal", {
        team: defender.team,
        teamLabel: this.getTeamLabel(defender.team),
      });
    } else if (userInitiated) {
      this.message = "差一點抄到，趕快回防。";
      this.emitEvent("steal-try", {});
    }
  }

  updateStamina(delta) {
    const owner = this.getBallOwner();
    const controlled = this.getUserControlledPlayer();

    for (const player of this.players) {
      const moveLoad = clamp(player.velocity.length() / (BASE_RUN_SPEED * 1.35), 0, 1.15);
      const isControlledSprint =
        controlled?.id === player.id && this.input.isDown("sprint") && moveLoad > 0.08;
      const drain =
        moveLoad * (isControlledSprint ? 0.24 : 0.12) +
        (owner?.id === player.id ? 0.04 : 0);
      const recovery = moveLoad < 0.18 ? 0.16 : 0.05;
      player.stamina = clamp(player.stamina + (recovery - drain) * delta, 0.26, 1);
    }
  }

  applyMotion(player, direction, delta, speedMultiplier) {
    const staminaFactor = THREE.MathUtils.lerp(0.82, 1.04, player.stamina);
    const speedFactor = BASE_RUN_SPEED * player.speed * speedMultiplier * staminaFactor;
    const targetVelocity = direction
      ? direction.clone().normalize().multiplyScalar(speedFactor)
      : new THREE.Vector3(0, 0, 0);
    const blend = 1 - Math.exp(-delta * 8.5);
    player.velocity.lerp(targetVelocity, blend);
  }

  movePlayerTo(player, target, delta, speedMultiplier) {
    const offset = target.clone().sub(player.position);
    offset.y = 0;
    if (offset.lengthSq() > 0.01) {
      this.applyMotion(player, offset.normalize(), delta, speedMultiplier);
    } else {
      this.applyMotion(player, null, delta, speedMultiplier);
    }
  }

  resolvePlayerCollisions() {
    const owner = this.getBallOwner();

    for (let index = 0; index < this.players.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < this.players.length; otherIndex += 1) {
        const first = this.players[index];
        const second = this.players[otherIndex];
        const offset = new THREE.Vector3()
          .subVectors(first.position, second.position)
          .setY(0);
        let distance = offset.length();
        const minDistance =
          first.team === second.team ? PLAYER_RADIUS * 1.55 : PLAYER_RADIUS * 1.82;

        if (distance >= minDistance) {
          continue;
        }

        if (distance < 0.001) {
          offset.set(randomSigned(1), 0, randomSigned(1));
          distance = offset.length();
        }
        offset.normalize();
        const overlap = minDistance - distance;
        const isCrossTeam = first.team !== second.team;

        const firstPush = isCrossTeam && owner?.id === first.id ? 0.34 : 0.5;
        const secondPush = isCrossTeam && owner?.id === second.id ? 0.34 : 0.5;

        first.position.addScaledVector(offset, overlap * firstPush);
        second.position.addScaledVector(offset, -overlap * secondPush);

        if (isCrossTeam) {
          first.velocity.addScaledVector(offset, overlap * 1.4);
          second.velocity.addScaledVector(offset, -overlap * 1.4);

          if (owner && (owner.id === first.id || owner.id === second.id)) {
            const handler = owner.id === first.id ? first : second;
            const defender = handler === first ? second : first;
            const away = new THREE.Vector3()
              .subVectors(handler.position, defender.position)
              .setY(0)
              .normalize();

            handler.velocity.addScaledVector(
              away,
              overlap * THREE.MathUtils.lerp(1.4, 3.2, defender.defense),
            );
            handler.stamina = clamp(handler.stamina - overlap * 0.01, 0.26, 1);
            this.cameraShake = Math.max(this.cameraShake, 0.07 + overlap * 0.2);

            if (this.contactCooldown === 0) {
              this.contactCooldown = 0.08;
              this.emitEvent("contact", {
                strength: clamp(overlap * 1.8, 0.2, 1),
              });
            }
          }
        }
      }
    }
  }

  updatePlayers(delta) {
    for (const player of this.players) {
      player.position.addScaledVector(player.velocity, delta);
      player.position.x = clamp(player.position.x, -13.2, 13.2);
      player.position.z = clamp(player.position.z, -6.8, 6.8);
      player.velocity.multiplyScalar(player.velocity.lengthSq() < 0.002 ? 0 : 0.96);

      if (player.velocity.lengthSq() > 0.02) {
        player.heading = Math.atan2(player.velocity.x, player.velocity.z);
      }
    }

    this.resolvePlayerCollisions();

    for (const player of this.players) {
      player.position.x = clamp(player.position.x, -13.2, 13.2);
      player.position.z = clamp(player.position.z, -6.8, 6.8);
    }
  }

  updateBall(delta) {
    const owner = this.getBallOwner();
    if (owner) {
      const forward = new THREE.Vector3(Math.sin(owner.heading), 0, Math.cos(owner.heading));
      const right = new THREE.Vector3(Math.cos(owner.heading), 0, -Math.sin(owner.heading));
      const dribbleOffset = Math.sin(this.time * 12 + owner.roleIndex * 0.7) * 0.16;
      this.ball.position.copy(owner.position);
      this.ball.position.addScaledVector(forward, 0.45);
      this.ball.position.addScaledVector(right, dribbleOffset);
      this.ball.position.y = 0.76 + Math.abs(Math.sin(this.time * 10.5)) * 0.26;
      this.ball.velocity.set(0, 0, 0);
      this.ball.freeTimer = 0;
      return;
    }

    this.ball.freeTimer += delta;
    this.ball.velocity.y += -18 * delta;
    this.ball.position.addScaledVector(this.ball.velocity, delta);

    if (this.ball.position.y < BALL_RADIUS) {
      this.ball.position.y = BALL_RADIUS;
      if (Math.abs(this.ball.velocity.y) > 1.2) {
        this.ball.velocity.y *= -0.42;
        this.ball.velocity.x *= 0.9;
        this.ball.velocity.z *= 0.9;
        if (this.time - this.lastBounceAt > 0.12) {
          this.lastBounceAt = this.time;
          this.emitEvent("ball-bounce", {
            strength: clamp(Math.abs(this.ball.velocity.y) / 4, 0.2, 1),
          });
        }
      } else {
        this.ball.velocity.y = 0;
        this.ball.velocity.x *= 0.84;
        this.ball.velocity.z *= 0.84;
      }
    }

    if (
      Math.abs(this.ball.position.x) > HALF_COURT + 1.3 ||
      Math.abs(this.ball.position.z) > HALF_WIDTH + 1.5
    ) {
      this.deadBallTo(
        this.ball.lastTouchTeam === "home" ? "away" : "home",
        "球出界，球權轉換。",
        0.7,
      );
      return;
    }

    if (this.ball.pendingShot) {
      this.checkShotResult();
    }
  }

  checkShotResult() {
    const shot = this.ball.pendingShot;
    const hoop = this.hoops[shot.targetHoop].rimCenter;
    const rimDistance = distanceXZ(this.ball.position, hoop);

    if (
      !shot.checkedRim &&
      this.ball.velocity.y < 0 &&
      rimDistance < RIM_RADIUS * 0.88 &&
      Math.abs(this.ball.position.y - RIM_HEIGHT) < 0.32
    ) {
      shot.checkedRim = true;
      if (shot.willScore) {
        this.finishScore(shot);
      }
    }
  }

  checkTargetScoreWin(team) {
    if (!this.mode.targetScore) {
      return false;
    }

    const otherTeam = team === "home" ? "away" : "home";
    return (
      this.score[team] >= this.mode.targetScore &&
      this.score[team] - this.score[otherTeam] >= (this.mode.winBy || 1)
    );
  }

  finishScore(shot) {
    this.score[shot.shooterTeam] += shot.points;
    this.ball.pendingShot = null;
    this.ball.ownerId = null;
    this.ball.passTargetId = null;
    this.ball.velocity.set(0, 0, 0);
    this.ball.position.copy(this.getTargetHoopForTeam(shot.shooterTeam).rimCenter);
    this.cameraShake = Math.max(this.cameraShake, 0.22);

    const teamLabel = this.getTeamLabel(shot.shooterTeam);
    this.message = `${teamLabel} 命中 ${shot.points} 分。`;

    this.emitEvent("score", {
      team: shot.shooterTeam,
      teamLabel,
      points: shot.points,
      homeScore: this.score.home,
      awayScore: this.score.away,
    });

    if (this.checkTargetScoreWin(shot.shooterTeam)) {
      this.finishMatch();
      return;
    }

    if (this.periodClock === 0) {
      this.handlePeriodExpired();
      return;
    }

    this.deadBallTo(
      shot.shooterTeam === "home" ? "away" : "home",
      this.message,
      1.15,
    );
  }

  resolveLooseBall() {
    if (this.getBallOwner() || this.deadBallTimer > 0) {
      return;
    }

    const isShot = Boolean(this.ball.pendingShot);
    const catchHeight = isShot ? 1.42 : 1.85;
    if (this.ball.position.y > catchHeight) {
      return;
    }

    let nearestPlayer = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const player of this.players) {
      if (this.ball.passTargetId) {
        // ★J 鍵傳球 bug 根因(07-11):球從傳球者位置出發,下一幀「最近球員」=傳球者自己,
        //   立刻自接還報「抄到傳球」→ 傳球永遠傳不出去。出手初期傳球者/非目標都不能接。
        if (player.id === this.ball.passerId && this.ball.freeTimer < 0.35) continue;
        if (player.id !== this.ball.passTargetId && this.ball.freeTimer < 0.12) continue;
      }
      const distance = distanceXZ(player.position, this.ball.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPlayer = player;
      }
    }

    if (!nearestPlayer || nearestDistance > (isShot ? 1.18 : 1)) {
      return;
    }

    const passTargetId = this.ball.passTargetId;
    const intercept = Boolean(passTargetId && nearestPlayer.id !== passTargetId);
    // 攔截不再是「站在路徑上=必攔」:要貼很近+機率(AI 吃難度係數;幼兒檔幾乎攔不到)
    if (intercept) {
      if (nearestDistance > 0.62) return;
      const rate =
        nearestPlayer.team === "away"
          ? 0.4 * this.difficultyPreset.aiDefense
          : 0.5;
      if (Math.random() > rate) return;
    }
    const wasShot = Boolean(this.ball.pendingShot);

    this.ball.ownerId = nearestPlayer.id;
    this.ball.lastTouchTeam = nearestPlayer.team;
    this.ball.passTargetId = null;
    this.possessionTeam = nearestPlayer.team;
    this.shotClock = this.mode.shotClock;

    if (nearestPlayer.team === "home") {
      this.selectedHomePlayerId = nearestPlayer.id;
    } else {
      this.selectedHomePlayerId = this.findClosestPlayer("home", nearestPlayer.position).id;
    }

    nearestPlayer.stamina = clamp(nearestPlayer.stamina + 0.05, 0.26, 1);

    if (wasShot) {
      this.message =
        nearestPlayer.team === "home"
          ? `${this.getTeamLabel("home")} 搶下籃板。`
          : `${this.getTeamLabel("away")} 搶下籃板。`;
      this.emitEvent("rebound", {
        team: nearestPlayer.team,
        teamLabel: this.getTeamLabel(nearestPlayer.team),
      });
    } else if (intercept) {
      this.message =
        nearestPlayer.team === "home"
          ? "成功抄到傳球。"
          : `${this.getTeamLabel("away")} 截斷傳球。`;
      this.emitEvent("steal", {
        team: nearestPlayer.team,
        teamLabel: this.getTeamLabel(nearestPlayer.team),
      });
    }

    this.ball.pendingShot = null;
  }

  switchDefender() {
    const homePlayers = this.getTeamPlayers("home");
    const reference = this.getBallOwner()?.position || this.ball.position;
    const sorted = [...homePlayers].sort(
      (first, second) =>
        distanceXZ(first.position, reference) - distanceXZ(second.position, reference),
    );
    const currentIndex = sorted.findIndex((player) => player.id === this.selectedHomePlayerId);
    const next = sorted[(currentIndex + 1 + sorted.length) % sorted.length];
    this.selectedHomePlayerId = next.id;
    this.message = `切換到 ${next.roleName} 防守。`;
  }

  updateCamera(delta) {
    const owner = this.getBallOwner();
    const focus = owner ? owner.position : this.ball.position;
    this.pointer.cameraFocus.lerp(
      new THREE.Vector3(
        clamp(focus.x * 0.52, -5.4, 5.4),
        0.3,
        clamp(focus.z * 0.24, -2.2, 2.2),
      ),
      1 - Math.exp(-delta * 3.2),
    );

    const desiredPosition = new THREE.Vector3(
      this.pointer.cameraFocus.x - 6.8,
      18.2,
      18.7 + Math.abs(this.pointer.cameraFocus.z) * 0.18,
    );

    this.pointer.cameraPosition.lerp(desiredPosition, 1 - Math.exp(-delta * 2.7));
    this.camera.position.copy(this.pointer.cameraPosition);

    if (this.cameraShake > 0) {
      this.camera.position.x += randomSigned(this.cameraShake * 0.5);
      this.camera.position.y += randomSigned(this.cameraShake * 0.22);
      this.camera.position.z += randomSigned(this.cameraShake * 0.5);
    }

    this.camera.lookAt(this.pointer.cameraFocus.x + 5.4, 0.4, this.pointer.cameraFocus.z);
  }

  animatePlayer(player, delta) {
    const visuals = player.visuals;
    const owner = this.getBallOwner();
    const shot = this.ball.pendingShot;
    const isOwner = owner?.id === player.id;
    const isShooting = shot?.shooterId === player.id;
    const speedRatio = clamp(player.velocity.length() / 5.5, 0, 1.15);

    player.animationTime += delta * (3 + speedRatio * 9);
    const cycle = player.animationTime;
    const walk = Math.sin(cycle);
    const walkOpp = Math.sin(cycle + Math.PI);
    const bob = Math.abs(Math.sin(cycle * 2)) * speedRatio * 0.08;
    const nearBallHandler =
      owner && owner.team !== player.team && distanceXZ(player.position, owner.position) < 1.6;

    visuals.rig.position.y = bob;
    visuals.torso.rotation.z = clamp(player.velocity.x * -0.05, -0.18, 0.18);
    visuals.torso.rotation.x = isOwner ? 0.06 : speedRatio * 0.05;
    visuals.head.rotation.y = Math.sin(cycle * 0.5) * 0.12;

    if (isShooting) {
      visuals.leftArm.pivot.rotation.x = -2.2;
      visuals.rightArm.pivot.rotation.x = -2.35;
      visuals.leftArm.lowerPivot.rotation.x = -0.18;
      visuals.rightArm.lowerPivot.rotation.x = -0.08;
      visuals.leftLeg.pivot.rotation.x = 0.32;
      visuals.rightLeg.pivot.rotation.x = 0.26;
    } else if (isOwner) {
      const dribblePulse = Math.sin(this.time * 10.5);
      visuals.rightArm.pivot.rotation.x = -0.4 - Math.abs(dribblePulse) * 0.92;
      visuals.rightArm.lowerPivot.rotation.x = 0.42 + Math.abs(dribblePulse) * 0.34;
      visuals.leftArm.pivot.rotation.x = walkOpp * 0.35;
      visuals.leftArm.lowerPivot.rotation.x = -0.15;
      visuals.leftLeg.pivot.rotation.x = walk * 0.58;
      visuals.rightLeg.pivot.rotation.x = walkOpp * 0.58;
      visuals.leftLeg.lowerPivot.rotation.x = clamp(-walk * 0.25, -0.35, 0.15);
      visuals.rightLeg.lowerPivot.rotation.x = clamp(-walkOpp * 0.25, -0.35, 0.15);
    } else if (nearBallHandler) {
      visuals.leftArm.pivot.rotation.z = -0.55;
      visuals.rightArm.pivot.rotation.z = 0.55;
      visuals.leftArm.pivot.rotation.x = -0.15;
      visuals.rightArm.pivot.rotation.x = -0.15;
      visuals.leftLeg.pivot.rotation.x = walk * 0.45;
      visuals.rightLeg.pivot.rotation.x = walkOpp * 0.45;
      visuals.leftLeg.lowerPivot.rotation.x = clamp(-walk * 0.15, -0.25, 0.1);
      visuals.rightLeg.lowerPivot.rotation.x = clamp(-walkOpp * 0.15, -0.25, 0.1);
    } else {
      visuals.leftArm.pivot.rotation.x = walk * 0.65;
      visuals.rightArm.pivot.rotation.x = walkOpp * 0.65;
      visuals.leftArm.pivot.rotation.z = 0;
      visuals.rightArm.pivot.rotation.z = 0;
      visuals.leftArm.lowerPivot.rotation.x = clamp(-walk * 0.24, -0.3, 0.2);
      visuals.rightArm.lowerPivot.rotation.x = clamp(-walkOpp * 0.24, -0.3, 0.2);
      visuals.leftLeg.pivot.rotation.x = walkOpp * 0.72;
      visuals.rightLeg.pivot.rotation.x = walk * 0.72;
      visuals.leftLeg.lowerPivot.rotation.x = clamp(-walkOpp * 0.3, -0.42, 0.15);
      visuals.rightLeg.lowerPivot.rotation.x = clamp(-walk * 0.3, -0.42, 0.15);
    }
  }

  syncMeshes(delta) {
    const controlled = this.getUserControlledPlayer();
    const owner = this.getBallOwner();

    for (const player of this.players) {
      player.group.position.copy(player.position);
      player.group.rotation.y = player.heading;
      player.selectionRing.visible = controlled?.id === player.id;
      player.possessionRing.visible = owner?.id === player.id;
      this.animatePlayer(player, delta);
    }

    this.ball.mesh.position.copy(this.ball.position);
  }

  autoSave(delta) {
    if (this.phase === "menu") {
      return;
    }

    this.autoSaveTimer += delta;
    if (this.autoSaveTimer >= 8) {
      this.autoSaveTimer = 0;
      this.saveGame(true);
    }
  }

  saveGame(silent = false) {
    const snapshot = {
      version: 3,
      difficulty: this.difficulty,
      modeId: this.modeId,
      homeThemeId: this.homeThemeId,
      awayThemeId: this.awayThemeId,
      score: this.score,
      shotClock: this.shotClock,
      possessionTeam: this.possessionTeam,
      selectedHomePlayerId: this.selectedHomePlayerId,
      message: this.message,
      deadBallTimer: this.deadBallTimer,
      breakTimer: this.breakTimer,
      nextPossessionTeam: this.nextPossessionTeam,
      pendingSetupAnnouncement: this.pendingSetupAnnouncement,
      phase: this.phase,
      periodNumber: this.periodNumber,
      overtimeCount: this.overtimeCount,
      periodClock: this.periodClock,
      periodStarterTeam: this.periodStarterTeam,
      ball: {
        ownerId: this.ball.ownerId,
        passTargetId: this.ball.passTargetId,
        pendingShot: this.ball.pendingShot,
        freeTimer: this.ball.freeTimer,
        lastTouchTeam: this.ball.lastTouchTeam,
        position: clonePosition(this.ball.position),
        velocity: clonePosition(this.ball.velocity),
      },
      players: this.players.map((player) => ({
        id: player.id,
        stamina: player.stamina,
        position: clonePosition(player.position),
        velocity: clonePosition(player.velocity),
        heading: player.heading,
        cooldown: player.cooldown,
        decisionTimer: player.decisionTimer,
        animationTime: player.animationTime,
      })),
    };

    saveGameState(snapshot);
    this.savePresentationSettings();
    if (!silent) {
      this.message = "已存檔，目前比賽進度已保存。";
    }
  }

  loadGame() {
    const snapshot = loadSavedGame();
    if (!snapshot) {
      this.message = "目前沒有可讀取的存檔。";
      this.pushHud();
      return false;
    }

    this.difficulty = DIFFICULTY_PRESETS[snapshot.difficulty]
      ? snapshot.difficulty
      : this.difficulty;
    this.modeId = GAME_MODES[snapshot.modeId] ? snapshot.modeId : this.modeId;
    this.homeThemeId = TEAM_THEMES[snapshot.homeThemeId]
      ? snapshot.homeThemeId
      : this.homeThemeId;
    this.awayThemeId = TEAM_THEMES[snapshot.awayThemeId]
      ? snapshot.awayThemeId
      : this.awayThemeId;
    this.mode = getModeConfig(this.modeId);
    this.applyThemeSelections();
    this.savePresentationSettings();

    this.score = snapshot.score || { home: 0, away: 0 };
    this.shotClock = snapshot.shotClock ?? this.mode.shotClock;
    this.possessionTeam = snapshot.possessionTeam || "home";
    this.selectedHomePlayerId = snapshot.selectedHomePlayerId || "home-0";
    this.message = snapshot.message || "已讀取存檔。";
    this.deadBallTimer = snapshot.deadBallTimer || 0;
    this.breakTimer = snapshot.breakTimer || 0;
    this.nextPossessionTeam = snapshot.nextPossessionTeam || this.possessionTeam;
    this.pendingSetupAnnouncement = snapshot.pendingSetupAnnouncement || null;
    this.phase = snapshot.phase === "menu" ? "paused" : snapshot.phase || "live";
    this.periodNumber = snapshot.periodNumber || 1;
    this.overtimeCount = snapshot.overtimeCount || 0;
    this.periodClock = snapshot.periodClock ?? this.getCurrentPeriodDuration();
    this.periodStarterTeam = snapshot.periodStarterTeam || this.possessionTeam;
    this.cancelShotMeter();

    for (const record of snapshot.players || []) {
      const player = this.getPlayerById(record.id);
      if (!player) {
        continue;
      }
      player.stamina = record.stamina ?? 1;
      player.position.set(record.position.x, record.position.y, record.position.z);
      player.velocity.set(record.velocity.x, record.velocity.y, record.velocity.z);
      player.heading = record.heading;
      player.cooldown = record.cooldown || 0;
      player.decisionTimer = record.decisionTimer || randomBetween(0.15, 0.55);
      player.animationTime = record.animationTime || randomBetween(0, Math.PI * 2);
    }

    if (snapshot.ball) {
      this.ball.ownerId = snapshot.ball.ownerId;
      this.ball.passTargetId = snapshot.ball.passTargetId;
      this.ball.pendingShot = snapshot.ball.pendingShot;
      this.ball.freeTimer = snapshot.ball.freeTimer || 0;
      this.ball.lastTouchTeam = snapshot.ball.lastTouchTeam || this.possessionTeam;
      this.ball.position.set(
        snapshot.ball.position.x,
        snapshot.ball.position.y,
        snapshot.ball.position.z,
      );
      this.ball.velocity.set(
        snapshot.ball.velocity.x,
        snapshot.ball.velocity.y,
        snapshot.ball.velocity.z,
      );
    }

    this.pushHud();
    return true;
  }

  getOverlayState() {
    if (this.phase === "paused") {
      return {
        visible: true,
        eyebrow: this.getPeriodDisplay(),
        title: "比賽暫停",
        text: "你可以先存檔，或直接回到首頁重新選模式與配色。",
        canResume: true,
      };
    }

    if (this.phase === "finished") {
      const homeWin = this.score.home > this.score.away;
      return {
        visible: true,
        eyebrow: "比賽結束",
        title: homeWin
          ? `${this.getTeamLabel("home")} 獲勝`
          : `${this.getTeamLabel("away")} 獲勝`,
        text: `最終比分 ${this.score.home} : ${this.score.away}。你可以直接回到首頁重新配隊，或讀取存檔。`,
        canResume: false,
      };
    }

    return {
      visible: false,
      eyebrow: "",
      title: "",
      text: "",
      canResume: false,
    };
  }

  getShotMeterText() {
    if (this.userShotMeter.active) {
      return this.userShotMeter.text;
    }
    if (this.phase === "finished") {
      return "比賽結束";
    }
    if (this.phase === "paused") {
      return "暫停中";
    }
    if (this.phase === "menu") {
      return "準備開打";
    }
    if (this.possessionTeam !== "home") {
      return "防守回合";
    }
    const owner = this.getBallOwner();
    return owner?.team === "home" ? "按住投籃鍵" : "先拿到球權";
  }

  pushHud() {
    if (!this.onHudUpdate) {
      return;
    }

    const controlled = this.getUserControlledPlayer();
    this.onHudUpdate({
      homeScore: this.score.home,
      awayScore: this.score.away,
      gameClock: formatClock(this.periodClock),
      shotClock:
        this.deadBallTimer > 0 || this.phase === "break" || this.phase === "menu"
          ? "--"
          : String(Math.max(0, Math.ceil(this.shotClock))),
      periodCode: this.getPeriodCode(),
      modeCode: this.mode.short,
      modeLabel: this.mode.label,
      phaseLabel: this.getPhaseLabel(),
      message: this.message,
      possession: this.getTeamLabel(this.possessionTeam),
      controlled: controlled
        ? `${controlled.team === "home" ? "Home" : "Away"} ${controlled.roleName}`
        : "無",
      difficulty: DIFFICULTY_LABELS[this.difficulty],
      stamina: controlled ? controlled.stamina : 1,
      shotMeterValue: this.userShotMeter.active ? this.userShotMeter.value : 0,
      shotMeterText: this.getShotMeterText(),
      shotWindowStart: SHOT_WINDOW_CENTER - (SHOT_WINDOW_SIZE * (this.difficultyPreset.shotWindow || 1)) / 2,
      shotWindowSize: SHOT_WINDOW_SIZE * (this.difficultyPreset.shotWindow || 1),
      pauseLabel: this.phase === "paused" ? "繼續" : "暫停",
      homeLabel: this.getTeamLabel("home"),
      awayLabel: this.getTeamLabel("away"),
      homeThemeLabel: getThemeConfig(this.homeThemeId).name,
      awayThemeLabel: getThemeConfig(this.awayThemeId).name,
      overlay: this.getOverlayState(),
    });
  }
}
