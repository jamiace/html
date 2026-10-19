PokéSurvivor — 單機作弊模式（繁體中文）
====================================

此檔案是『修改檔覆蓋包』，不是完整遊戲。使用者原先的 1.zip 不包含 assets/ 資料夾，
因此請覆蓋到你自己『原本可正常執行、包含所有 assets/』的繁體中文遊戲資料夾。

【安裝】
1. 關閉遊戲，先備份原遊戲資料夾；建議也下載備份既有存檔。
2. 將本 ZIP 內的 index.html、dev.html、css/、js/ 等檔案，依照相同路徑
   『覆蓋』回原本正在玩的 PokéSurvivor 遊戲資料夾。
3. 保留原本的 assets/、其餘 js/、圖片與音樂檔，不要清空原遊戲資料夾。
4. 雙擊 index.html（支援 file://），或使用原本的本機 HTTP 伺服器載入。
5. 進入原本的本地帳號後按 F9；使用介面設定。再次 F9 或 Esc 關閉。
6. 這份 index.html 是『直接載入原始 JS 的免編譯測試版』，所以替換檔案後
   不必執行 node tools/build.js；js/app.min.js 不會被這份 index.html 使用。
   想產生正式壓縮版，日後可自行執行 node tools/build.js --sin-seo。

【功能】
金幣自訂（上限 999,999,999）；普通／十連抽卡券自訂；
取得全部收錄寶可夢、取得素材支援的異色寶可夢；
將目前選定夥伴的永久升級升到上限（下次開局生效）；
戰鬥中：無敵、傷害倍率、移動速度倍率、冷卻時間、經驗值倍率、
回滿生命、立刻升級、強制產生異色敵人、立即召喚 Boss。
可下載本地存檔 JSON 備份。

【運作及重要說明】
- 本版本將 js/core/firebase-config.js 設為 null，強制使用本地模式。
  不會連線原作者 Firebase；因此也無法使用原作者的雲端帳號、好友、排行榜。
- 既有本地存檔沿用原始遊戲的 ps.save.* / ps.accounts 等鍵，不會清除存檔。
- 注意：瀏覽器不同網址、file:// 和 http://localhost 的 localStorage 通常不共享。
  必須在『原本同一個網址與瀏覽器』打開，才會看到原本本地存檔。
- 遊客模式不能寫入永久存檔，所以作弊選單只允許已登入的本地帳號。
- 第一次修改資源／收藏／升級前自動在 localStorage 建立備份：ps.cheat.backup.*。
  建議先使用面板的「下載本地存檔備份」功能保留 JSON 檔案。
- 戰鬥作弊只在該回合有效；新回合重置。作弊回合會被標記為非正常成績。
- 原始資料已套用遊戲自己的存檔 sanitize 規則。
- 如果以 localhost 開啟曾安裝過 PWA 的遊戲、F9 卻沒出現，請先 Ctrl+F5
  強制重整。必要時檢查原 Service Worker 是否還在供應舊的 index.html。

【本次修改檔案】
index.html               免編譯本地入口（改成載入 70 個原始腳本）
dev.html                 新增 js/core/cheats.js 載入點
css/style.css             作弊選單樣式
js/core/cheats.js         全新的作弊功能與繁體中文面板
js/core/firebase-config.js  關閉原作者 Firebase
js/game.js               呼叫初始化、作弊時暫停、單局成績標記
js/entities/player.js    無敵、傷害／移速／經驗倍率與技能動畫冷卻
js/systems/combat.js     技能實際冷卻倍率
js/systems/spawner.js    召喚 Boss、異色測試；下回合重置測試值

【測試狀態】
已完成相關 JS 語法檢查與 Node 模擬測試，包括 F9、金幣、抽卡券、
收藏／異色解鎖、備份、無敵、倍率、雲端限制與回合重置。
由於上傳內容不含完整遊戲 assets，且目前無法在瀏覽器環境進行完整實玩，
尚未實測遊戲中 Boss、異色生成、畫面與完整對戰流程，遇到問題可回報截圖。

【授權】
原始專案與素材依其現有授權使用：請保留原遊戲原有 LICENSE、
LICENSE-NONCOMMERCIAL.md、CREDITS.md 等，勿將此補丁理解成取得商業授權。
