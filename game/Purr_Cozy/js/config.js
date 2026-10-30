/* All game artwork is now preloaded from assets/png. SpeechSynthesis remains the word voice. */
window.NOOK_ENV = 'web';
window.NOOK_USE_PNG_SPRITES = true;
window.NOOK_AUDIO_BASE = '';

/* 內建音樂：Google 雲端硬碟資料夾（含子資料夾）
 *
 * NOOK_DRIVE_FOLDER   資料夾網址或 ID。資料夾要設成「知道連結的任何人都能檢視」。
 * NOOK_DRIVE_API_KEY  Google Cloud 的 API 金鑰（只能讀公開檔案，不是密碼）。
 *                     請在 Google Cloud Console 把金鑰限制為：
 *                       1. API 限制：只允許 Google Drive API
 *                       2. 應用程式限制：HTTP 參照網址，只允許你的網站（例如 https://你的帳號.github.io/*）
 *                     留空就不會連到雲端硬碟，只播放 music/playlist.json 裡的歌。
 *
 * 子資料夾會變成播放清單裡的分類。歌曲清單會在玩家的瀏覽器快取 12 小時，
 * 不會寫進存檔，也不會占用 Firestore 用量。
 * 想完全不依賴雲端硬碟，可以用 tools/fetch-drive-music.mjs 把歌下載進 music/。
 */
window.NOOK_DRIVE_FOLDER = '';   // 內建音樂改放在網站的 music/ 資料夾，不再從雲端硬碟播放（原本的資料夾 ID：11uJHdrWUOjZBRGfyqc763bUeT6qTfD6w）
window.NOOK_DRIVE_API_KEY = 'AIzaSyCDmAUMuPI1dYgENKhxMQ9hDnOcop6-WSQ';

/* 附近天氣：留空使用 Open-Meteo 免費非商業端點。
 * 商業部署請使用供應商授權方案；可填入自己的代理網址，回傳相容的 forecast JSON。
 * 代理接收 latitude、longitude、current、timezone 參數；商業金鑰保留在後端。
 * 設定範例：window.NOOK_WEATHER_ENDPOINT = '/api/weather';
 * 城市搜尋另使用 Open-Meteo Geocoding API。詳細說明見 更新說明_0.92.md。
 */
window.NOOK_WEATHER_ENDPOINT = '';
