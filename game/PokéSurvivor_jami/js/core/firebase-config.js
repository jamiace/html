/* PokéSurvivor · 獨立 Firebase 雲端存檔版本（非原作者雲端）
 * 1. 在 Firebase Console 建立自己的 Web App，複製「SDK 設定」的 firebaseConfig。
 * 2. 將下面的 null 改成自己的 Firebase 網頁設定物件。
 * 3. 在 CLOUD_ALLOWED_HOSTS 填入發布網域（只有 hostname，不含 https:// 或路徑）。
 *    例如：yourname.github.io 或 game.example.com。
 * 未設定完成時，http(s) 網站禁止以本地帳號冒充雲端帳號。
 */
G.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD0Pp5LbHRwrOmE3ln0239iBqUEN65Yu5E',
  authDomain: 'pokesurvivor-jami.firebaseapp.com',
  projectId: 'pokesurvivor-jami',
  storageBucket: 'pokesurvivor-jami.firebasestorage.app',
  messagingSenderId: '554760069001',
  appId: '1:554760069001:web:96d44c655fea11282b4b58',
  measurementId: 'G-HDLMYD5LLM'
};
/* 貼上 Firebase Console 複製的設定，例如：
G.FIREBASE_CONFIG = {
  apiKey: '...',
  authDomain: '你的專案.firebaseapp.com',
  projectId: '你的專案',
  appId: '1:...:web:...'
};
*/
G.CLOUD_ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'jamiace.github.io',
  // 'play.你的網域.com',
];
/* 目前只做帳號與個人雲端存檔。好友、合作、排行榜未連線。 */
G.CLOUD_SOCIAL_ENABLED = false;
