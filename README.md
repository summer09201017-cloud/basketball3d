# 3D 全場籃球遊戲

這是一個用 `Vite + Three.js` 製作的 3D 全場 5v5 籃球遊戲原型，支援：

- 玩家隊對戰 AI
- `入門 / 標準 / 職業` 三段 AI 強度
- 手機與 PC 共用操作
- 本機存檔與讀檔
- PWA 安裝到主畫面

## 啟動方式

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

## 操作

- 移動: `WASD` / 方向鍵
- 投籃: `Space`
- 傳球: `J`
- 抄截 / 防守動作: `K`
- 切換防守球員: `Tab`
- 衝刺: `Shift`

手機版可直接使用畫面下方的虛擬按鈕。

## 手機安裝

這個專案已經具備 PWA 所需的 `manifest` 與 `service worker`。

- Android: 部署到 HTTPS 網址後，可直接點選「安裝到手機」
- iPhone: 用 Safari 開啟後，從分享選單選擇「加入主畫面」

如果你要進一步包成 APK / App Store 專案，可以再接 `Capacitor`。
