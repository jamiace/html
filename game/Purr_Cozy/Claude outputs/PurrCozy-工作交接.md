# PurrCozy 工作交接（2026/11/11 18:10）

給新開的工作看的。先讀完這份再動手。

## 0. 目前狀態（2026/11/11 21:30）

- **網站是 0.93.6**（commit `9ba21c9`）。
- **0.93.7 已做好、測好**，所有檔案已寫進笔电 repo 並讀回比對過。要上線，Jami 需要：
  1. 執行 `Update-Game.cmd`，應該出現 `CRC32: ce649d15`。
  2. 到 Firebase 主控台發布新的 `firestore.rules`（問題回報需要）。
  3. commit、push。
- 也可以用 zip 裡的 `purrcozy-0.93.7.patch` 推（已確認能直接套在 `9ba21c9` 上）。
- 這個 Cowork 工作沒有 git 推送權限。
- 內容寫在 zip 裡的 `更新說明-0.93.7.md`：問題回報＋後台頁、今日 10 字、貓咪開場白、商人一定有 Lv1 商品、版本穩定後走 CDN、日文全面修正。
- **Jami 對文件第 10 節的回答（11/11）：**
  1. 沒有日本人，但日文要專業。
  2. 可能整班一起開。
  3. 每天 10 個單字。
  4. 新手順序照提議。
  5. 每位商人至少一件能買。
  6. 要有回報問題，並先做好範本，後台看得到。
- **規則測試：**`tests/` 用 Firebase 模擬器跑。團隊組隊倒數那一個測試在 0.93.6 以前就沒過，還沒查。

## 1. 專案基本資料

| 項目 | 位置 |
|---|---|
| Repo | `D:\Dropbox\Github\html\`（GitHub `jamiace/html`，分支 `main`） |
| 遊戲資料夾 | `D:\Dropbox\Github\html\game\Purr_Cozy\` |
| 網站 | https://jamiace.github.io/html/game/Purr_Cozy/ （短網址 tinyurl.com/purrcozy） |
| 版本號來源 | `version.json`（從 0.93.x 起依序往後推） |
| 後台 | `tools/admin.html`（v0.5.03） |
| 更新流程 | 改檔 → 執行 `Update-Game.cmd`（`tools/rebuild-resources.py`）→ 全部一起 commit、push 一次 |
| 問題清單文件 | https://claude.ai/artifact/LNSZhTsMVcqqYpTbMEA4PM （Claude Doc，最上面有「0.93.5 已修正」） |

**素材載入方式：**`rebuild-resources.py` 會把檔案打包成 `build-packs/*.bin`（32 包），清單寫在 `build-manifests/<crc>.json`，`version.json` 指向清單。`js/asset-cache.js` 載入後會逐檔檢查 CRC。

- 文字檔的 CRC 用正規化後的內容算，換行是 CRLF 或 LF 都一樣（已實測）。
- **任何 js、css、i18n 改動都一定要重跑 rebuild。**不然遊戲讀到的還是舊素材包裡的舊檔案。

## 2. 0.93.5 改了什麼

完整說明在 zip 裡的 `更新說明-0.93.5.md`，重點：

- **用詞：**不再出現「看中文」「繁體中文」，改成「拼出英文」「選出意思」這種直接講要做什麼的說法。這是 Jami 的明確要求：一律避開語言描述。
- **新手流程：**
  - 第一次只開程度測驗（電腦版不再同時跳三個視窗）。
  - 商人提示等測驗結束才出現。
  - 「佈置高手」門檻改成 22／30／45／65（初始房間就有 17 件）。
  - 今日單字按鈕改成「開始今日單字」。
  - 第一次載入會提示大約要 1 分鐘。
- **故事測驗：**
  - 用剛教過的知識卡單字。
  - 拿掉 `progression.js` 偷加 2 題的那段，說 5 題就是 5 題。
- **升級測驗：**前幾級放寬。Lv2～4 是 8 題對 5 題、有首字母提示、10 分鐘後可重考；Lv5～8 是 8 題對 6 題、有首字母提示、30 分鐘；Lv9 以上照舊。
- **旅行商人：**商品要求等級減半，價格不變。
- **任務：**難度按鈕改成「選普通／選困難」；全部完成獎勵在沒做完前顯示「還差 N 個」。
- **顯示：**
  - 手機上可點的東西至少約 40px。
  - 深色模式下停用按鈕裡的文字看得清楚了。
  - 手機上的提示不會蓋住視窗的關閉鈕。
  - CSS 裡寫死的文字標籤會跟著介面語言切換。
- **翻譯系統：**`js/i18n.js` 的 `t()` 修好，已翻好的文字不會再被翻第二次（原本「箱を開ける」會變成「箱をオンける」，79 句受影響）。日文重譯 2,132 句；簡中修掉 5 個繁體字。
- **模擬：**`tools/sim/life.cjs` 會依個性去考升級測驗；`start-sim.ps1` 對代碼 3 改成顯示「正常換版本」。

## 3. 30 人模擬（笔电 ROG，rog-strix-g614）

- **期間：**2026-11-10 起，到 **2026-11-24 00:00（+08）**，全自動，不影響鍵盤、滑鼠、耳機。
- **啟動：**`tools/sim/Start-PurrCozy-Sim.cmd` → `start-sim.ps1` → `node life.cjs run --login --profiles ...`。用 playwright 1.63.0，裝在 `%LOCALAPPDATA%\PurrCozySim`。
- **狀態：**`C:\Users\sugas\AppData\Local\PurrCozySim\life\`
  - `state.json`：每人的參數和今天的排程，每分鐘更新。
  - `console.log`：主控台輸出。
  - `logs\YYYY-MM-DD.jsonl`：每次上線的結果。
- **行為紀錄：**`D:\Dropbox\Github\html\game\Purr_Cozy\.sim\行為紀錄\YYYY-MM-DD.txt`，每天一檔，所有人寫在一起。複習卡不記錄。
- **帳號：**`claude-test01`～`30@purrcozy.test`（sim01～sim30），後台顯示 md 裡的暱稱。控制帳號是 `claude-test00`。登入資料在 `.sim/accounts.json`，**不要把密碼抄進任何文件或對話**。
- **人物設定：**`tools/sim/people.json`，說明在 `docs/試玩計畫-30位測試帳號.md`。
- **自動換版：**`life.cjs` 檔案一改，等沒人上線就會自己結束（代碼 3），再由 `start-sim.ps1` 重開。
- **目前狀況：**
  - 到 11/11 17:40 為止，22 人玩過、31 次上線、約 945 題。載入、頁面錯誤、雲端同步都是 0 錯誤。
  - 17:38 已換上會考升級測驗的新 `life.cjs`。
- **待觀察：**
  - 柏翰（sim09，每天型）、阿哲（sim25）、Mia（sim26）、安安（sim02，週末型）還沒上線過。第一天被跳過是因為模擬 18:17 才開始，之後要看排程有沒有排到他們。
  - 升級測驗在網站 0.93.4 上還是 8 題對 6 題、沒有提示，程度弱的帳號可能一直考不過。0.93.5 上線後就會放寬。
  - `start-sim.ps1` 的新提示要等 PowerShell 視窗下次重開才會生效。
  - 舊的 11 個素材包還留在笔电資料夾（新工作推送時已經刪掉），下次跑 `Update-Game.cmd` 會清掉。

## 4. 還沒做完的事

1. 推送 0.93.7，並發布 firestore.rules（第 0 節）。
2. 雲端存檔、小遊戲、擺放模式、後台：0.93.6 已檢查過。小遊戲修了 2 個錯誤，其他都正常。
3. 日文（含 270 張商人知識卡、開發者面板）已全部看過。正式對外前，仍建議請日語母語者看一遍。
4. 推上 0.93.7 之後，確認網站 `version.json` 是 `0.93.7`、`manifest` 是 `build-manifests/ce649d15.json`，再到遊戲「設定」送一份測試回報，確認後台「問題回報」看得到。
5. 文件第 10 節的問題 Jami 已回答（見第 0 節），都已在 0.93.7 處理。

## 5. 測試方法（上一個工作實際用過）

- 用 `python3 -m http.server` 在本機架遊戲。Playwright 開新的 context，加上 `serviceWorkers: 'block'`，並攔掉 firestore、identitytoolkit、securetoken 等網址，這樣不會寫進後台。
- 判斷遊戲載入完成：`!document.getElementById('loading') && typeof UI !== 'undefined' && typeof Game !== 'undefined' && Game.S`。注意 `Game` 是 `const`，**不能**寫成 `window.Game`。
- 流程可以直接呼叫遊戲 API 跑：
  - `Placement.startFirst()`
  - `Learn.start('daily')`
  - `Learn.review / answer / next / more`
  - `Story.start(0)`、`Lore.*`
  - `Contest.join()`、`Contest.play()`
  - `LevelGate.start('owner')`
  - `Merchant.buy()`、`Game.buy()`
- 視窗檢查：逐一 `UI.openWin(k)`，檢查 JS 錯誤、按鈕尺寸、文字對比、文字被切。要跑手機、平板、電腦 × 繁中、簡中、日文 × 淺色、深色。
- 已知誤報：Meow Typo 卡片的底色是圖片，自動檢查會誤判對比不足，實際看截圖是清楚的。

## 6. 和 Jami 合作的注意事項

- **用繁體中文回答。**
- 沒驗證過的事不要說成功。寫到笔电的檔案，要重新讀回來比對內容（上一個工作曾因此出錯兩次）。
- 要直接、主動完成，不要叫他自己去按。但碰到真的做不到的事，要直接講清楚原因。
- 改程式先想清楚影響，改完一定實測。他非常在意「閱讀性、正確性」和「基本開發常識」。
- 不要幫他輸入密碼。
- 版本從 0.93.x 往後推；每次改版都要跑 rebuild，並一起 commit 打包出的檔案。
- commit 結尾要加上 session 提供的 Co-Authored-By 等歸屬行。
