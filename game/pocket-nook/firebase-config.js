/* 小窩時光 — Firebase 設定（Google / Email 登入 + 雲端存檔）
 *
 * 留空 → 遊戲照常運作，進度只存在玩家自己的瀏覽器。
 * 填好 → 右上角出現「登入」，玩家登入後進度自動存到你的 Cloud Firestore。
 *
 * 去哪裡拿這些值：
 *   Firebase 主控台 → 專案設定（齒輪）→ 一般 → 你的應用程式 → 網頁應用程式 </>
 *   → 「SDK 設定和配置」選「設定」，把 firebaseConfig 的內容貼過來。
 *
 * 這些值本來就會出現在網頁原始碼裡，不是密碼，可以放心推到 GitHub。
 * 真正保護資料的是 firestore.rules（每個人只能讀寫自己的存檔），記得照 README 部署規則。
 * 完整步驟請看 README.md 的「雲端存檔（Firebase）」。
 */
window.NOOK_FIREBASE = {
  apiKey: 'AIzaSyCZDorIT08dX1oqF4RZ8pTqDStl0pwWR_Q',                                   // ← 貼上（AIza 開頭）
  authDomain: 'pocket-nook.firebaseapp.com',
  projectId: 'pocket-nook',
  storageBucket: 'pocket-nook.firebasestorage.app',
  messagingSenderId: '290029663226',                        // ← 貼上（一串數字）
  appId: '1:290029663226:web:f4377fda4325faa13eaa43',                                    // ← 貼上（1: 開頭）
};

/* 存檔政策
 * devSaves：用過開發者模式（作弊、測試）的存檔要怎麼處理
 *   'flag'   可以匯入雲端，但存檔會永久標記 dev: true（之後有排行榜、交易時請排除這些存檔）
 *   'block'  不允許把這種裝置存檔匯入或合併進雲端帳號（玩家只能用雲端存檔或重新開始）
 */
window.NOOK_SAVE_POLICY = {
  devSaves: 'flag',
};
