/* 小窩時光 — 執行設定
 *
 * NOOK_ENV
 *   'web'      GitHub Pages 或任何自架網站（預設）
 *
 * NOOK_USE_PNG_SPRITES
 *   true   啟動時讀取 assets/sprites/*.png，用 PNG 取代程式內建的像素圖。
 *          想自己改圖，就直接編輯那些 PNG（檔名不要改）。
 *   false  只用 js/sprites_*.js 裡用程式畫出來的版本。
 *
 * NOOK_AUDIO_BASE
 *   ''               單字發音用瀏覽器內建語音（預設）
 *   'assets/audio/'  改用這個資料夾裡的音檔（檔名見 data/vocab.json 的 audio 欄位），找不到時再用內建語音
 *
 * 注意：用 file:// 直接雙擊開啟 index.html 時，瀏覽器不允許讀取 PNG 像素，
 *      遊戲會自動改用程式內建的圖；YouTube 播放也需要透過 http(s) 開啟。
 */
window.NOOK_ENV = 'web';
window.NOOK_USE_PNG_SPRITES = true;
window.NOOK_AUDIO_BASE = '';
