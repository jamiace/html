# Purr Cozy 0.92.46 ＋ 後台 v0.5.0：更新報告

> 2026/11/06。遊戲 0.92.46、後台 v0.5.0（後台從這版開始有自己的版本號）。
> zip 解壓到 `D:\Dropbox\Github\html\game\Purr_Cozy\` 覆蓋，推送步驟在第 6 節。

## 1. 這次做了什麼

| 需求 | 結果 |
|---|---|
| 1. G1～G12 程度測驗做進遊戲，固定每日任務，玩家資料標示年級，可開關顯示 | **完成**：搬家日（第一次 8～12 題）＋每日小測（每日任務「程度小測」8 題）、年級徽章與成長曲線、名片標籤（設定與程度視窗都能開關，其他玩家看得到）、英文程度獎狀家具。設計細節見 `docs/程度測驗-設計與實作.md` |
| 2. 後台報表新增相關分析 | **完成**：「學習分析 → 程度測驗」分頁：8 個 KPI、5 張圖、自填 vs 實測表、單字年級修正建議（可下載 CSV） |
| 3. 面向 300 名國小學生的 C 端效果 | 遊戲性：搬家日包裝、固定獎勵、獎狀、名片標籤；學習性：測出的年級直接定錨自適應出題與 Level，第一天就拿到合適的字；數據回收：每回合都寫入學習紀錄（`kind: grade` ＋ `pl` 摘要），後台可看成長與題目校正 |
| 4. 後台 Meow Typo 沒有單字清單 | **是顯示門檻，不是沒資料**。舊版只列拼過 3 次以上的字，真實資料很少達到。現在門檻跟著資料量調（1／2／3 次），表格上方會註明，並加「年級」「常見錯拼」欄 |
| 5. MVP＋v2＋v3（不含選圖） | 做了：搬家日、選擇＋拼字、依年級的題目難度、寫回自適應、結果卡、獎狀家具、成長曲線、以學習紀錄校正題目難度（item fit ＋ Δg 建議）。沒做：聽音選圖（依指示）、句子填空（單字表沒有例句）、故事依年級分級（留到下一版）。 |
| 另：別人用 LINE 開後台登不進去 | **修正**：後台 v0.5 的登入改法見第 3 節 |

## 2. 遊戲端改了哪些檔案

| 檔案 | 內容 |
|---|---|
| `version.json` | 0.92.46、2026/11/06 |
| `js/placement.js` | **新檔**：程度測驗全部邏輯、視窗、結果卡、任務、名片、獎狀、樣式 |
| `js/bootstrap.js` | 載入清單加入 `js/placement.js`（在 `minigame-wiring.js` 之後、`learn-log.js` 之前） |
| `js/adaptive.js` | 程度測驗的回合不經過自適應出題 |
| `js/learn-log.js` | 記錄 `kind: 'grade'`、每題用測驗模型的預測機率 `p`、回合摘要 `pl` |
| `js/social.js` | 排行榜列多帶 `grade` |
| `js/cloud.js` | 合併存檔時保留較新的程度資料 |
| `i18n/ui.json` | 新增 73 個 `pl.*` 字串（zh-TW／zh-CN／ja） |
| `tools/rebuild-resources.py` | 打包時略過 `Claude outputs/` 資料夾（見 2.1） |
| `firestore.rules` | `profiles`／`board` 允許 `grade`、`learnlog` 允許 `pl`（**要重新發布**） |

### 2.1 順便發現的問題：報告圖片被打包進遊戲

`resources.json` 裡有 `Claude outputs/learn_analytics_demo.png` 和 `splash_before_after.png`（共 0.6 MB）。打包工具只排除 `tools/`、`docs/` 等資料夾，`Claude outputs/` 裡的 PNG 就被當成遊戲資源，每個玩家第一次載入都會下載並解碼。這版的 `tools/rebuild-resources.py` 多排除這個資料夾；跑過 `Update-Game.cmd` 後 `resources.json` 會少這兩個檔案。以後報告請放 `docs/`（本來就不打包），這次的報告也放在 `docs/`。

## 3. 後台 v0.5.0 改了什麼

| 項目 | 內容 |
|---|---|
| 版本號 | 登入畫面、左上角、「我的帳號」都顯示 v0.5.0；「我的帳號」有版本紀錄表 |
| 程度測驗分頁 | 見第 1 節 |
| Meow Typo | 門檻調整與新欄位 |
| **登入相容性** | 見下 |

### 登入失敗的原因與修法

截圖的錯誤「Unable to process request due to missing initial state… storage-partitioned browser environment」來自 Google 登入的**轉址（redirect）**方式：後台在 `jamiace.github.io`，Google 登入頁在 `pocket-nook.firebaseapp.com`，iOS 17+／新版 Chrome 把兩個網域的暫存隔開，登入完成跳回來時找不到原本的狀態。從 LINE 開更糟：LINE 的內建瀏覽器根本不讓 Google 登入視窗出現。

v0.5 的做法（`tools/admin.html`）：

1. **偵測 App 內建瀏覽器**（LINE、Facebook、Instagram、WeChat、TikTok）：顯示說明和「用外部瀏覽器開啟」按鈕。LINE 會直接跳到手機的 Safari／Chrome（網址加 `openExternalBrowser=1`），其他 App 提示按「⋯ → 以瀏覽器開啟」；也可以直接在裡面用 Email 登入。
2. **一律先用彈出視窗登入**（`signInWithPopup`），不再預設轉址。
3. 彈出視窗被擋時：只有在後台本身放在 Firebase 網域（`*.firebaseapp.com`／`*.web.app`）才改用轉址；否則提示改用 Email 登入。頁面載入時會先處理轉址回來的結果。
4. **新增 Email＋密碼登入**：登入／第一次使用註冊／忘記密碼。安全規則要求 Email 已驗證，所以未驗證時會顯示「寄驗證信」「我已驗證，繼續」。**需要在 Firebase 主控台 → Authentication → 登入方式 啟用「電子郵件/密碼」**（一次性設定）。
5. 登入紀錄會記下用哪種方式、是否在 App 內建瀏覽器，方便之後看誰卡在哪。

**想一次解決所有瀏覽器**：把遊戲資料夾也部署到 Firebase Hosting（專案裡的 `firebase.json` 已經有設定），後台改用 `https://pocket-nook.web.app/tools/admin.html`。同網域之下，彈出視窗和轉址都正常。指令：`npx firebase-tools deploy --only hosting`。設定教學 3-6 有完整說明。

## 4. 後台相關檔案

| 檔案 | 內容 |
|---|---|
| `tools/admin.html` | 後台 v0.5.0 |
| `tools/learn-analytics.html` | 轉址到 admin.html（同上一版） |
| `firestore.rules` | 新欄位（見第 2 節） |
| `tests/admin-rules.test.mjs` | 規則測試新增「0.92.46 欄位」案例（emulator 全數通過） |
| `docs/學習紀錄與分析-設定教學.md` | 新增 3-6 登入方式與相容性、程度測驗分頁、Meow Typo 說明、`grade`／`pl`／`gr`／`h` 欄位 |
| `docs/程度測驗-設計與實作.md` | 設計、模型、參數、和其他系統的關係、測試前建議 |

## 5. 測試

- 程度測驗模擬（node，載入真實題庫與 `learn.js`／`adaptive.js`）：搬家日平均誤差 0.55～0.9 個年級；每天小測 30 天平均誤差約 0.45；自填年級錯 4 個年級仍能拉回。
- 視窗、結果卡、成長曲線、設定卡、學習列在 jsdom 實際渲染：沒有錯誤、沒有缺字串（三種語言的 `pl.*` 都齊）。
- 後台在 Chromium 用示範資料跑過：程度測驗分頁 5 張圖與 2 個表都有內容、Meow Typo 表有 50 列、LINE 的 UA 會顯示外部瀏覽器提示、Email 面板可開合、沒有 console 錯誤。
- `firestore.rules` 在 emulator 測試：角色權限、新欄位全部通過。
- 所有 JS 通過 `node --check`。
- 我這邊沒有完整的遊戲資源（6,500 個圖檔要逐一驗證才能開機），所以**整個遊戲的實機流程請你在本機跑一次**：新存檔 → 搬家日跳出 → 做完看結果卡與獎狀 → 名片有標籤 → 設定關掉標籤 → 隔天（或改系統時間）做每日小測。

## 6. 推送步驟

1. 解壓 zip 覆蓋到專案資料夾。
2. Firebase 主控台 → Firestore → 規則：貼上整份 `firestore.rules` → 發布。
3. Firebase 主控台 → Authentication → 登入方式：啟用「電子郵件/密碼」。
4. 執行 `Update-Game.cmd`（會重算 `resources.json`，並移除 `Claude outputs/` 的圖片）。
5. 本機玩一輪（第 5 節最後一點）。
6. 全部一起 commit、push 一次。
7. 發後台連結給別人時，提醒：從 LINE 開要按「用外部瀏覽器開啟」，或用 Email 登入。

## 7. 備忘

- 後台版本從 v0.5.0 開始，之後每次後台更新加版本號與 `CHANGELOG`（在 `tools/admin.html` 開頭的 `ADMIN_VERSION`／`CHANGELOG`）。
- 下一版候選：故事依年級選字、句子填空（需要例句資料）、每週「小窩英檢」挑戰、搬家日的箱子美術。
