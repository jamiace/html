# PokéSurvivor 繁體中文｜自架 Firebase 帳號與雲端存檔

這是「覆蓋修改包」，不是完整遊戲。請保留原本遊戲資料夾中的 `assets/`、未列出的 `js/` 檔案與原有著作權、素材來源及授權聲明。**只需自己的 Firebase；不會使用原作者的 Firebase 專案。**

## 已完成的程式修改

- 新增自己的 Firebase Authentication 登入（使用者名稱／密碼、Google）與 Cloud Firestore 存檔 `saves/{Firebase UID}`；沿用原專案既有的雲端合併、備份機制。
- 只有設定允許的網站網域才會嘗試連上自己的 Firebase；HTTP(S) 沒設定時，禁止「看起來像雲端帳號、其實只存本地」的註冊／登入。
- 新建立的雲端帳號起始金幣回復 **500**。先前單機測試版的 5 億起始金幣與 `ps.save.*` 本地作弊存檔 **不會自動匯入雲端**；本地存檔仍保留在原瀏覽器，不會自動刪除。
- Cheat Mode 改為在**主選單（標題畫面）或單人遊戲的暫停畫面**連續輸入 `JAMI`（不區分大小寫）才能開啟；**F9 已停用**。作弊功能仍只支援本地存檔，在 Firebase 雲端帳號下會提示停用，不會更動雲端存檔。
- 這個 B 方案不包含好友、合作房間與排行榜：關閉選單入口及背景排行寫入，Firestore 規則也只允許個人存檔。
- 雲端同步通常在變更後自動安排（重要變更約 5 秒，其餘約 1 分鐘；網路、Firebase 頻率限制等可能延遲）。主選單會標示「已同步到你的 Firebase」；**請看到已同步後再換裝置**。
- 內附輕量 `sw.js`，避免舊版 PWA 的快取攔截。**不提供離線 PWA 完整素材快取**。

## 你需要先完成的 Firebase 設定（必要）

1. 打開 https://console.firebase.google.com/ ，新建一個**屬於你**的專案，不要用原作者的 `pokesurvivor-free`。請留意 Firebase 各項配額與你自己的帳單設定。
2. 在專案的「專案設定」新增 **Web（網頁）應用程式**，複製「SDK 設定和配置」的 `firebaseConfig` 物件（`apiKey`, `authDomain`, `projectId`, `appId` 等）。
3. 在 **Authentication → Sign-in method／登入方式** 啟用「電子郵件／密碼」。要使用 Google 帳號登入，另啟用「Google」並完成要求的專案支援電子郵件設定。
4. 在 **Authentication → Settings／設定 → Authorized domains／授權網域** 加入發布網址的**主機名稱**，例如 `你的帳號.github.io` 或 `play.example.com`；不要填 `https://` 或 `/pokesurvivor/`。本機測試要用 `localhost` 時，也需要手動加入；新 Firebase 專案未必預設包含它。
5. 在 **Firestore Database** 建立 Cloud Firestore 資料庫（選定區域），到「規則 Rules」，用此包的 `firestore.rules` **完整取代預設規則並按發布**。此規則只允許使用者讀寫自己的 `saves/{uid}`，其他集合全部拒絕。請勿為了排除錯誤改成 `allow read, write: if true;`。
6. 打開遊戲檔案 `js/core/firebase-config.js`，把 `G.FIREBASE_CONFIG = null;` 換成第 2 步的設定，例如：

```js
G.FIREBASE_CONFIG = {
  apiKey: '在這裡填入你自己的 apiKey',
  authDomain: '你的專案.firebaseapp.com',
  projectId: '你的專案',
  appId: '在這裡填入自己的 appId'
};
```

同一份檔案的 `G.CLOUD_ALLOWED_HOSTS` 加上你的發布主機名稱：

```js
G.CLOUD_ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '你的帳號.github.io',
  'play.你的網域.com' // 沒有自訂網域就刪掉這一行
];
```

> Firebase 網頁用 `firebaseConfig` **不是管理員私密金鑰**，發布網頁時本來就會提供給前端；真正保護遊戲存檔的是 Authentication 與 Firestore 規則。**不要把 Firebase 服務帳戶 JSON、私人金鑰、管理員權杖或任何密碼放入網站程式或傳給別人。**

## 部署 GitHub Pages

1. **先備份原本可以玩的完整遊戲資料夾**，尤其是 `assets/`，不要直接把這個補丁 ZIP 當成完整遊戲。
2. 解壓縮本包，將 `index.html`、`dev.html`、`js/`、`css/`、`sw.js` 等按原路徑覆蓋到原遊戲資料夾。保留沒有列在此包的其他檔案。
3. 按上面步驟編輯 `js/core/firebase-config.js`，並先在 Firebase 後台發布 `firestore.rules`。
4. 如原專案根目錄留有 `CNAME` 指向 `pokesurvivor.com`，且你沒有擁有該網域，請**刪除舊 CNAME**。在 GitHub Pages 設定 `main` / `/ (root)`；將遊戲檔案（包含設定好的 `firebase-config.js`）上傳／推送到你自己的 GitHub 儲存庫。
5. 本包的 `index.html` 直接載入各 `js/` 原始碼，**不需要 Node.js 編譯就可以上架測試**。之後若要製作單一正式 JS，可在有完整原始碼的資料夾執行 `node tools/build.js --sin-seo` 再一併上傳生成的 `index.html`、`js/app.min.js` 與 `version.json`。
6. 首次部署、尤其之前裝過 PWA 的同一個網址，請使用強制重新整理（Ctrl+F5）測試。如果仍是舊畫面，到瀏覽器開發者工具的 Application → Service Workers 檢查舊版快取／服務工作者。

## 手動確認是否真的有雲端存檔

1. 在裝置 A 打開自己的 GitHub Pages 網址、註冊新的名稱與密碼，應可正常建立角色；新的雲端帳號初始為 500 金幣（不是 5 億）。
2. 玩一局或取得報酬，回到主選單查看「☁ 已同步到你的 Firebase」，確認後在 Firebase Console 的 **Firestore Database → `saves` → 以該玩家 UID 命名的文件**，確認存在 `save` 欄位與金幣進度。
3. 在不同瀏覽器或裝置 B，開啟同一個網站並用同一組名稱與密碼登入，應取得雲端進度。
4. 驗證不同帳號的 `saves/{uid}` **無法由其他玩家讀取**（正式環境應透過 Firebase Rules Playground / Emulator 進行測試）。

## 重要差異與界線

- 網頁已發布，不代表已接通你的 Firebase。**必須由你親自建立專案、填設定、開啟登入方式、發布 Firestore 規則。**我沒有你的 Firebase 管理權限，因此無法替你完成 Firebase 後台動作。
- 設定於 `file://` 雙擊開啟時，遊戲仍採本地存檔，可使用 JAMI 隱藏輸入測試。`https://` 網站若 Firebase 設定缺失、域名不符或 SDK 載入失敗，將顯示設定錯誤而非默默改存本地。
- 現有「名稱／密碼」帳號是用內部虛擬 Email 建立 Firebase Auth，**不能寄送一般忘記密碼信件**；建議玩家登入後透過介面連結 Google 帳號作為恢復方式。Google 登入與名稱／密碼登入不是自動同一帳號，必須透過「連結帳號」功能連起來。
- **朋友能夠註冊雲端帳號**，但網站和 Firebase Auth 並未設定「只有受邀者才准註冊」。GitHub Pages 的公開儲存庫與靜態網址也不是私人存取權限。
- Firestore 規則只確保**每個玩家只能操作自己的存檔**，並做基本欄位限制；使用者可修改自己瀏覽器執行的 JavaScript／送出請求，**無法只靠前端與 Firestore 規則構成真正的伺服器防作弊**。日後若要正式競賽／排行榜，需要可信任的後端驗證。
- 跨裝置不要同時玩同一帳號，避免互相合併覆寫；同步受網路狀態影響，主選單顯示已同步再換裝置。
- 授權仍依原專案 `LICENSE-NONCOMMERCIAL.md`、`LICENSE`、`CREDITS.md` 等；本修改包不授予商業使用權，寶可夢商標與圖片有獨立權利限制。分享給朋友的非商業用途仍須保留規定的署名及授權資訊。

## 語法／程式測試

可在已安裝 Node.js 的遊戲資料夾執行：

```
node tests/cloud-smoke.js
```

測試使用**假的 Firebase**，驗證新註冊 500 金幣、雲端存取、跨裝置讀取、禁止把舊作弊存檔自動匯入、缺少設定時不產生假雲端帳號、雲端停用 Cheat Mode。這不是實際 Firebase 線上整合測試；部署後仍須親自跑一次真實跨裝置流程。原始上傳資料沒有 `assets/`，因此本修改包也不包含完整美術素材與實際戰鬥畫面測試。

## JAMI 隱藏作弊選單（2026-10-19 更新）

- **主選單（標題畫面）**：登入本機帳號後、進入有「開始遊戲／收藏／抽卡」的主選單畫面，直接依序按 `J`、`A`、`M`、`I`。
- **單人戰鬥暫停**：戰鬥中先按 `Esc` 進入 Pause 畫面，再依序按 `JAMI`。作弊面板出現時，遊戲維持暫停。
- 大小寫混用有效（例如 `jAmI`）；按鍵間隔應小於 2.5 秒。按 `Esc` 或面板右上角 × 關閉。
- 取消 F9。戰鬥進行中、其他選單、登入帳密輸入欄位、多人連線均不會觸發。
- 在 Pause 使用「立即升級」會自動恢復戰鬥，接著顯示升級選卡；召喚 Boss 或異色敵人時維持暫停，返回遊戲後開始戰鬥。
- **不更動 Firebase 限制**：因這個版本的作弊只授權本機帳號，在自己的 GitHub Pages 使用 Firebase 雲端帳號輸入 JAMI，會顯示停用提示。這不是管理員權限，也不是防止別人檢視程式的安全機制。
- GitHub Pages 單獨更新快捷鍵時，只需覆蓋 `js/core/cheats.js`，這份 `index.html` 是以個別 script 標籤載入，不需重新打包 `app.min.js`。更新網頁後可以用 `Ctrl+F5` 強制刷新。

本次測試包含 Node.js 模擬鍵盤測試與 Chromium 真實頁面互動測試；**尚未連接真實 Firebase，也未載入完整美術資源實玩整局**。
