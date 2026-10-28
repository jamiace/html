# Purr Cozy / 呼嚕小窩

版本由根目錄 version.json 統一提供。之後發布更新只需修改其中 version 與 date，HTML、存檔版本、設定顯示、更新檢查、程式與樣式快取、Service Worker 快取都會使用它；發布時請一次上傳整批變更。請使用 HTTP/HTTPS 網站開啟，不支援直接雙擊 index.html。

## 替換舊資料夾

1. 先保留原資料夾作為備份，將本包 Purr_Cozy 作為新的遊戲根目錄；維持原網站網址，以沿用瀏覽器本機存檔。
2. 將原 music/ 裡的音樂、LRC/SRT 歌詞及子資料夾搬回本包 music/，保留原路徑。本包已附原 playlist.json；歌曲有變動時執行 node tools/make-playlist.mjs。
3. 若原本使用單字音檔，搬回 assets/audio/ 的音檔與子資料夾。字庫文字已完整保留於 js/vocab.js，不需額外 vocab 資料夾。NOOK_AUDIO_BASE 目前留空，使用瀏覽器語音。
4. 不需搬回 HD-2D assets，本版已移除此模式。
5. 部署後重新開啟網站，設定應顯示本次 version.json 的版本。

## 程式與維護資料

js/、css/ 為遊戲程式；assets/fonts/ 為字型；assets/previews/view_*.png 為仍使用的窗景；assets/sprites/ 保留椅背、靠身動畫與自訂圖入口。家具正面與配色由 js/sprites_*.js、catalog.js 等程式產生。

Firebase 設定與規則、tests/、package.json、tools/、.github/workflows/ 為仍有用途的維護檔案，已保留。npm 僅供規則測試等維護操作，遊戲本身不需要 npm。

## 本次整理

- 移除 HD-2D 模式、展示入口、載入依賴與專用樣式；既有存檔的 hd2d 設定於載入時忽略並清除。
- 椅子方向改由 js/chair-views.js 獨立處理，靠近書桌或人物 work/sit 時使用背面，獨立擺放為正面；人物坐姿遮擋仍使用 Room.itemCanvas，相同方向與配色。39 款椅子均具備背面。
- 保留原本床鋪依枕位決定棉被遮擋高度的修正。
- 原批次 Markdown、JSON 與測試結果描述的是 HD 素材製作進度，並不是遊戲設定；移除該模式後，這些檔案不再作為部署內容。
- 移除未引用的家具 PNG 參考稿、商品預覽參考圖、批次展示圖與舊更新說明。未啟用的圖稿不再隨正式版出貨；若日後要修改原稿，請從備份取用。
- 最新提供的 CSS 與壓縮檔內 CSS 相同；以此版為基礎，只移除 HD 專用規則。

## 驗證範圍

桌機及 320px 手機視窗啟動、重新載入、版本顯示、新版提醒；39 款椅子的獨立／靠桌／work／sit 共 156 項方向檢查。瀏覽器無執行錯誤。雲端測試使用未設定帳號的替身；本次未實際連線讀寫你的 Firebase，亦未驗證你省略的實體音檔。
