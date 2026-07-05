# 模擬AI對戰 Web版 v6 UI 修正版

本版根據 2026-06-30 的畫面回饋調整：

1. 上方第 N 題固定顯示，字體放大，顏色改亮白色。
2. 倒數計時數字改紅色，並加白色描邊 / 陰影，避免與白色計時圖背景混在一起。
3. USER SCORE 與 AI SCORE 的直向分數條高度與位置統一。
4. 答題結果圖示改成 USER / AI 標籤 + 勾叉圖示，避免分不清是哪一方答題。
5. AI 對白框放大，文字放大。
6. 沿用 Google Sheets v4/v5 設定與新部署 URL。

## 使用方式

1. 解壓縮本資料夾。
2. 把原本的圖片、音樂、音效放入 `Resource/`。
3. 執行 `啟動本機伺服器.bat`。
4. 用瀏覽器開啟顯示的 localhost 網址。

## Apps Script

若後端也要同步使用 v5/v6 的稱號清理邏輯，可把：

- `google-apps-script/Code.gs`
- `google-apps-script/appsscript.json`

覆蓋到 Apps Script，重新部署新版本。
