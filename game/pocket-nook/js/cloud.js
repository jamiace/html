/* ============================================================
   Cloud save
   - artifact build: per-viewer storage of the Claude account (automatic)
   - web build: Firebase Authentication (Google / Email) + Cloud Firestore
     config lives in js/firebase-config.js (window.NOOK_FIREBASE)
   Firestore layout: saves/{uid} = { v, savedAt, device, lvl, coins, email, dev, sync, data: JSON string, updated }
                     saves/{uid}/backups/{id} = { v, at, reason, device, savedAt, lvl, coins, data, updated }  (written before any overwrite)
   ============================================================ */
const FIREBASE_SDK = '10.12.2';
const DEVICE_ID = (() => { try { let d = localStorage.getItem('pocketnook.device'); if (!d) { d = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('pocketnook.device', d); } return d; } catch (e) { return 'dev' + Math.random().toString(36).slice(2, 8); } })();

async function loadFirebase(cfg) {
  if (window.NOOK_FIREBASE_MOCK) return window.NOOK_FIREBASE_MOCK;
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}/`;
  const [A, U, F] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => import(base + f)));
  const app = A.initializeApp(cfg), auth = U.getAuth(app), db = F.getFirestore(app);
  auth.languageCode = 'zh-TW';
  const ref = uid => F.doc(db, 'saves', uid);
  const google = () => { const p = new U.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return p; };
  return {
    onAuth: cb => U.onAuthStateChanged(auth, cb),
    redirectResult: () => U.getRedirectResult(auth),
    async google() {
      try { return await U.signInWithPopup(auth, google()); }
      catch (e) { if (e && ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) return U.signInWithRedirect(auth, google()); throw e; }
    },
    signIn: (email, pw) => U.signInWithEmailAndPassword(auth, email, pw),
    signUp: (email, pw) => U.createUserWithEmailAndPassword(auth, email, pw),
    reset: email => U.sendPasswordResetEmail(auth, email),
    signOut: () => U.signOut(auth),
    async get(uid) { const s = await F.getDoc(ref(uid)); return s.exists() ? s.data() : null; },
    set: (uid, data) => F.setDoc(ref(uid), Object.assign({}, data, { updated: F.serverTimestamp() })),
    backup: (uid, data) => F.addDoc(F.collection(db, 'saves', uid, 'backups'), Object.assign({}, data, { updated: F.serverTimestamp() })),
    probe: {
      getOther: () => F.getDoc(F.doc(db, 'saves', '__nook_probe_other_user__')),
      listAll: () => F.getDocs(F.query(F.collection(db, 'saves'), F.limit(1))),
      badWrite: async (uid) => (await F.addDoc(F.collection(db, 'saves', uid, 'backups'), { v: 1, probe: true })).id,
      delBackup: (uid, id) => F.deleteDoc(F.doc(db, 'saves', uid, 'backups', id)),
    },
    // generic document access for friends, rooms and the leaderboard (social.js); '__now__' becomes the server time
    store: (() => {
      const stamp = (o) => { const r = {}; for (const k in o) r[k] = o[k] === '__now__' ? F.serverTimestamp() : o[k]; return r; };
      const norm = (o) => { const r = {}; for (const k in o) { const v = o[k]; r[k] = v && typeof v.toMillis === 'function' ? v.toMillis() : v; } return r; };
      const rows = (r) => r.docs.map(d => Object.assign({ id: d.id }, norm(d.data())));
      return {
        async get(path) { const s = await F.getDoc(F.doc(db, path)); return s.exists() ? norm(s.data()) : null; },
        set: (path, data) => F.setDoc(F.doc(db, path), stamp(data)),
        update: (path, data) => F.updateDoc(F.doc(db, path), stamp(data)),
        del: (path) => F.deleteDoc(F.doc(db, path)),
        add: (path, data) => F.addDoc(F.collection(db, path), stamp(data)),
        async list(path, n) { return rows(await F.getDocs(F.query(F.collection(db, path), F.limit(n || 50)))); },
        batch: (ops) => { const b = F.writeBatch(db); for (const [op, path, data] of ops) { const r = F.doc(db, path); if (op === 'set') b.set(r, stamp(data)); else if (op === 'update') b.update(r, stamp(data)); else b.delete(r); } return b.commit(); },
        async query(path, wheres, n) { return rows(await F.getDocs(F.query(F.collection(db, path), ...wheres.map(([f, op, v]) => F.where(f, op, v)), F.limit(n || 20)))); },
        newId: (path) => F.doc(F.collection(db, path)).id,
        // transaction: fn gets { get, set, update, del }; reads must come before writes
        tx: (fn) => F.runTransaction(db, (t) => fn({
          async get(path) { const s = await t.get(F.doc(db, path)); return s.exists() ? norm(s.data()) : null; },
          set: (path, data) => { t.set(F.doc(db, path), stamp(data)); },
          update: (path, data) => { t.update(F.doc(db, path), stamp(data)); },
          del: (path) => { t.delete(F.doc(db, path)); },
        })),
        async top(path, field, n) { return rows(await F.getDocs(F.query(F.collection(db, path), F.orderBy(field, 'desc'), F.limit(n)))); },
      };
    })(),
    async backups(uid) { const q = F.query(F.collection(db, 'saves', uid, 'backups'), F.orderBy('at', 'desc'), F.limit(10)); const r = await F.getDocs(q); return r.docs.map(d => Object.assign({ id: d.id }, d.data())); },
  };
}

const CLOUD_ERR = {
  'too-big': '存檔太大（超過 880 KB），沒有上傳。',
  'conflict': '另一台裝置也存了進度。',
  'auth/invalid-email': 'Email 格式不正確。',
  'auth/missing-email': '請輸入 Email。',
  'auth/missing-password': '請輸入密碼。',
  'auth/weak-password': '密碼至少要 6 個字元。',
  'auth/email-already-in-use': '這個 Email 已經註冊過了，請直接登入。',
  'auth/invalid-credential': 'Email 或密碼不正確。',
  'auth/invalid-login-credentials': 'Email 或密碼不正確。',
  'auth/wrong-password': 'Email 或密碼不正確。',
  'auth/user-not-found': '找不到這個帳號，要不要先註冊？',
  'auth/user-disabled': '這個帳號已被停用。',
  'auth/too-many-requests': '嘗試太多次了，請過幾分鐘再試。',
  'auth/network-request-failed': '網路連線失敗，請檢查網路。',
  'auth/popup-closed-by-user': '登入視窗被關掉了，再試一次吧。',
  'auth/cancelled-popup-request': '',
  'auth/unauthorized-domain': '這個網址還沒加進 Firebase 的授權網域（Authentication → 設定 → 授權網域）。',
  'auth/operation-not-allowed': 'Firebase 還沒啟用這種登入方式（Authentication → 登入方式）。',
  'auth/invalid-api-key': 'firebase-config.js 裡的 apiKey 不正確。',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'firebase-config.js 裡的 apiKey 不正確。',
  'permission-denied': 'Firestore 安全規則拒絕存取，請貼上 README 裡的 firestore.rules。',
  'unavailable': '暫時連不上雲端，等一下會自動重試。',
  'failed-precondition': 'Firestore 資料庫還沒建立（Firebase 主控台 → Firestore Database → 建立資料庫）。',
  'not-found': 'Firestore 資料庫還沒建立（Firebase 主控台 → Firestore Database → 建立資料庫）。',
};
function cloudErr(e) {
  const code = (e && e.code) || ''; if (code in CLOUD_ERR) return CLOUD_ERR[code];
  return '發生錯誤：' + (code || (e && e.message) || e);
}
function agoText(ts) {
  if (!ts) return '還沒同步'; const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 45) return '剛剛'; if (s < 3600) return Math.round(s / 60) + ' 分鐘前'; if (s < 86400) return Math.round(s / 3600) + ' 小時前';
  return new Date(ts).toLocaleDateString('zh-TW');
}

// ---------- save helpers shared by both cloud modes ----------
// write budget: routine changes are merged and written at most every 90 s; important events (rewards, purchases, quiz results) within ~10 s
const CLOUD_ROUTINE_MS = 90000, CLOUD_SOON_MS = 10000, CLOUD_PULL_MS = 120000;
// one device per account: the session is checked before cloud writes (at most every 5 min) and when the game comes back to the front (at most every 60 s)
const SESSION_CHECK_MS = 5 * 60e3, SESSION_FOCUS_MS = 60e3;
const SAVE_POLICY = () => Object.assign({ devSaves: 'flag' }, window.NOOK_SAVE_POLICY || {});
const IMPORT_MARK = 'pocketnook.imported';
function saveHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + str.length; }
function saveDate(ts) { return ts ? new Date(ts).toLocaleString('zh-TW', { hour12: false }) : '不明'; }
function deviceUsedDev() { try { return localStorage.getItem('pocketnook.dev') === '1' || !!localStorage.getItem('pocketnook.dev.hist'); } catch (e) { return false; } }
function saveSummary(S, local) {
  const vocab = Object.values(S.vocab || {});
  return {
    lvl: S.lvl || 1, xp: S.xp || 0, coins: S.coins || 0, words: vocab.filter(r => r && r[0] >= 2).length, seen: vocab.length,
    pets: S.zoo && S.zoo.pets ? S.zoo.pets.length : (S.pets || []).length, items: (S.items || []).length, focus: Math.round(((S.stats || {}).focusMin || 0)),
    streak: (S.learn || {}).best || 0,
    dev: !!(S.flags && S.flags.dev) || (local && deviceUsedDev()), legacy: !!(S.flags && S.flags.legacy),
  };
}
function isFreshSave(S) { return (S.lvl || 1) <= 1 && (S.xp || 0) < 30 && !Object.keys(S.vocab || {}).length && !((S.stats || {}).focusMin > 0) && !((S.stats || {}).todos > 0); }
// merge rule: the newer save is the base (room layout, today's tasks, needs); progress is combined so nothing earned is lost
// totals that only ever grow by playing, used to add up both devices' earnings after a simultaneous save
function totalXp(S) { let t = S.xp || 0; for (let l = 1; l < (S.lvl || 1); l++) t += Game.need(l); return t; }
function progressBase(S) { return { coins: S.coins || 0, xp: totalXp(S), stats: Object.assign({}, S.stats), life: Object.assign({}, (S.life || {}).stats) }; }
// a = cloud, b = this device; base = what both started from (known only for a simultaneous save, not for a first-time import)
function mergeSaves(a, b, common) {
  const base = (b.savedAt || 0) > (a.savedAt || 0) ? b : a, o = base === a ? b : a, M = JSON.parse(JSON.stringify(base));
  const max = (x, y) => Math.max(x || 0, y || 0);
  if (common) {
    // both devices started from the same save: keep what each one earned or spent
    M.coins = Math.max(0, (a.coins || 0) + (b.coins || 0) - common.coins);
    let t = Math.max(0, totalXp(a) + totalXp(b) - common.xp), lv = 1; while (t >= Game.need(lv)) { t -= Game.need(lv); lv++; } M.lvl = lv; M.xp = t;
    for (const k in common.stats) if (typeof common.stats[k] === 'number') M.stats[k] = Math.max(0, ((a.stats || {})[k] || 0) + ((b.stats || {})[k] || 0) - common.stats[k]);
    if (M.life) for (const k in common.life) if (typeof common.life[k] === 'number') M.life.stats[k] = Math.max(0, (((a.life || {}).stats || {})[k] || 0) + (((b.life || {}).stats || {})[k] || 0) - common.life[k]);
  } else {
    if ((o.lvl || 1) > M.lvl || ((o.lvl || 1) === M.lvl && (o.xp || 0) > M.xp)) { M.lvl = o.lvl; M.xp = o.xp; }
    M.coins = max(M.coins, o.coins);
  }
  M.vocab = M.vocab || {}; for (const w in o.vocab || {}) { const r = o.vocab[w], m = M.vocab[w]; if (!m || r[0] > m[0] || (r[0] === m[0] && r[1] > m[1])) M.vocab[w] = r.slice(); }
  const L = M.learn, OL = o.learn || {}; if (L) { L.streak = max(L.streak, OL.streak); L.best = max(L.best, OL.best); if ((OL.lastDone || '') > (L.lastDone || '')) L.lastDone = OL.lastDone; }
  for (const k in o.inv || {}) M.inv[k] = max(M.inv[k], o.inv[k]);
  for (const k of ['ownWP', 'ownFL', 'ownViews', 'themes', 'pets']) M[k] = [...new Set([...(M[k] || []), ...(o[k] || [])])];
  if (!common) for (const k in o.stats || {}) if (typeof o.stats[k] === 'number') M.stats[k] = max(M.stats[k], o.stats[k]);
  if (M.life && o.life) {
    for (const k in o.life.bag || {}) M.life.bag[k] = max(M.life.bag[k], o.life.bag[k]);
    for (const k in o.life.ach || {}) M.life.ach[k] = max(M.life.ach[k], o.life.ach[k]);
    if (!common) for (const k in o.life.stats || {}) M.life.stats[k] = max(M.life.stats[k], o.life.stats[k]);
    // daily tasks: a reward claimed on either device stays claimed (prevents claiming it twice)
    if (M.life.daily && o.life.daily && M.life.daily.day === o.life.daily.day) { M.life.daily.tasks.forEach((t, i) => { const u = o.life.daily.tasks[i]; if (u && u.k === t.k) { t.prog = Math.max(t.prog, u.prog); t.claimed = t.claimed || u.claimed; } }); M.life.daily.bonus = M.life.daily.bonus || o.life.daily.bonus; }
  }
  if (M.learn && o.learn && M.learn.dailyDay === o.learn.dailyDay) { M.learn.dailyDone = M.learn.dailyDone || o.learn.dailyDone; M.learn.reviewed = max(M.learn.reviewed, o.learn.reviewed); }
  if (M.zoo && o.zoo) {
    Object.assign(M.zoo.tools, o.zoo.tools || {}); Object.assign(M.zoo.accs, o.zoo.accs || {});
    for (const p of o.zoo.pets || []) {
      if (M.zoo.pets.length >= PET_MAX) break;
      if (M.zoo.pets.some(q => q.sp === p.sp && q.name === p.name && q.at === p.at)) continue;
      const q = JSON.parse(JSON.stringify(p)); q.id = M.zoo.nid++; q.home = M.zoo.pets.filter(x => x.home).length < PET_ROOM_MAX; M.zoo.pets.push(q);
    }
  }
  const seenT = new Set((M.todos || []).map(t => t.t)); M.todos = (M.todos || []).filter(t => !t.ex); for (const t of o.todos || []) if (!t.ex && !seenT.has(t.t)) { M.todos.push(Object.assign({}, t, { id: Game.uid(M.todos) })); seenT.add(t.t); }
  const seenM = new Set((M.memos || []).map(m => m.text)); for (const m of o.memos || []) if (m.text && !seenM.has(m.text) && M.memos.length < 20) { M.memos.push(Object.assign({}, m, { id: Game.uid(M.memos) })); }
  M.closet = Object.assign({}, o.closet || {}, M.closet || {}); M.closetV = Math.max(M.closetV || 0, o.closetV || 0);
  const seenO = new Set((M.outfits || []).map(x => JSON.stringify(x.a))); M.outfits = M.outfits || []; for (const x of o.outfits || []) if (M.outfits.length < 8 && !seenO.has(JSON.stringify(x.a))) M.outfits.push(x);
  if (o.wallet) {
    const W = M.wallet = M.wallet || { coupons: [], usedDay: '', sel: null, giftMiss: 0, tickets: 0, nid: 1 }, OW = o.wallet;
    W.tickets = Math.max(W.tickets || 0, OW.tickets || 0); if ((OW.usedDay || '') > (W.usedDay || '')) W.usedDay = OW.usedDay; W.nid = Math.max(W.nid || 1, OW.nid || 1);
    // coupons: keep the ones either device has, minus any either device already used
    const spent = new Set([...(W.spent || []), ...(OW.spent || [])]), key = (c) => c.got + ':' + c.off, have = new Set();
    W.coupons = [...(W.coupons || []), ...(OW.coupons || [])].filter(c => { const k = key(c); if (spent.has(k) || have.has(k)) return false; have.add(k); return true; });
    W.coupons.forEach((c, i) => { c.id = i + 1; }); W.nid = W.coupons.length + 1; W.sel = null; W.spent = [...spent].slice(-200);
  }
  if (o.team) {
    const T = M.team = M.team || {}, O = o.team;
    T.claims = Object.assign({}, O.claims, T.claims);
    for (const type of ['d', 'w']) { const a = T[type], b = O[type]; if (!a && b) T[type] = b; else if (a && b && a.p === b.p && a.id === b.id) a.mine = Math.max(a.mine || 0, b.mine || 0); else if (a && b && b.p > a.p) T[type] = b; }
    const seen = new Set((T.hist || []).map(x => x.id)); T.hist = [...(T.hist || []), ...(O.hist || []).filter(x => !seen.has(x.id))].filter(x => !T.claims[x.type + ':' + x.p]).slice(0, 12);
  }
  if (o.social) {
    const Z = M.social = M.social || {}, O = o.social;
    Z.total = Math.max(Z.total || 0, O.total || 0); Z.gid = Math.max(Z.gid || 1, O.gid || 1);
    if (Z.hd === O.hd) { Z.hn = Math.max(Z.hn || 0, O.hn || 0); Z.helped = Object.assign({}, O.helped, Z.helped); } else if ((O.hd || '') > (Z.hd || '')) { Z.hd = O.hd; Z.hn = O.hn; Z.helped = O.helped; }
    if (Z.wk && O.wk && O.wk.k === Z.wk.k) Z.wk.m = Math.max(Z.wk.m || 0, O.wk.m || 0); else if (O.wk && (O.wk.k || '') > ((Z.wk || {}).k || '')) Z.wk = O.wk;
    const gk = (g) => g.uid + ':' + (g.nk || g.at); const seenG = new Map((Z.guest || []).map(g => [gk(g), g]));
    for (const g of O.guest || []) { const m = seenG.get(gk(g)); if (m) { m.read = m.read || g.read; m.back = m.back || g.back; } else seenG.set(gk(g), g); }
    Z.guest = [...seenG.values()].sort((x, y) => y.at - x.at).slice(0, 100);
    const readIds = new Set(Z.guest.filter(g => g.read).map(gk)); Z.marks = (Z.marks || []).filter(m => { const g = Z.guest.find(x => x.id === m.g); return !g || !readIds.has(gk(g)); });
    if (!Z.code && O.code) { Z.code = O.code; Z.codeUid = O.codeUid; } if (!Z.status && O.status) Z.status = O.status; Z.gb = Z.gb || O.gb;
  }
  M.flags = Object.assign({}, o.flags, M.flags); if ((o.flags || {}).dev || (base.flags || {}).dev) M.flags.dev = true;
  M.savedAt = Date.now();
  return M;
}
// local backups (IndexedDB, falls back to memory)
const Backups = {
  db: null, mem: [],
  open() { if (this.db || typeof indexedDB === 'undefined') return Promise.resolve(this.db); return new Promise(res => { try { const r = indexedDB.open('pocketnook-backups', 1); r.onupgradeneeded = () => r.result.createObjectStore('b', { keyPath: 'id' }); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => res(null); } catch (e) { res(null); } }); },
  async put(S, reason, source) {
    const rec = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), at: Date.now(), reason, source, savedAt: S.savedAt || 0, owner: S.owner || '', sum: saveSummary(S), json: JSON.stringify(S) };
    const db = await this.open();
    if (!db) { this.mem.push(rec); return rec; }
    await new Promise((res, rej) => { const tx = db.transaction('b', 'readwrite'); tx.objectStore('b').put(rec); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    const all = await this.list(); for (const x of all.slice(12)) await this.del(x.id);
    return rec;
  },
  async list() {
    const db = await this.open(); if (!db) return this.mem.slice().reverse();
    return new Promise(res => { const out = []; const tx = db.transaction('b', 'readonly'); const c = tx.objectStore('b').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out.sort((x, y) => y.at - x.at)); }; c.onerror = () => res(out); });
  },
  async del(id) { const db = await this.open(); if (!db) { this.mem = this.mem.filter(x => x.id !== id); return; } await new Promise(res => { const tx = db.transaction('b', 'readwrite'); tx.objectStore('b').delete(id); tx.oncomplete = res; tx.onerror = res; }); },
};
// what this device last synced for an account: rev, progress base and a signature of the save (ignoring values that drift on their own)
function saveSignature(S) {
  const c = JSON.parse(JSON.stringify(S)); delete c.savedAt; delete c.owner; delete c.sync;
  if (c.life) { delete c.life.lastTick; delete c.life.nextNeedAt; }
  if (c.zoo) for (const p of c.zoo.pets || []) for (const k of ['hunger', 'mood', 'clean', 'energy', 'low']) delete p[k];
  return saveHash(JSON.stringify(c));
}
function syncMeta(uid, v) { const k = 'pocketnook.sync.' + uid; try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
function importMarks() { try { return JSON.parse(localStorage.getItem(IMPORT_MARK) || '{}'); } catch (e) { return {}; } }
function setImportMark(uid, rec) { try { const m = importMarks(); m[uid] = rec; localStorage.setItem(IMPORT_MARK, JSON.stringify(m)); } catch (e) { } }

const Cloud = {
  mode: 'none',          // 'claude' | 'firebase'
  status: 'off',         // off | unconfigured | loading | signedout | choose | saving | synced | error
  user: null, fb: null, ref: null, bref: null, timer: null, busy: false, pending: false, lastSync: 0, lastPull: 0, err: '', authBusy: false,
  form: { tab: 'in', email: '', msg: '' }, choice: null, remoteHasProgress: false, working: false,
  configured() { const c = window.NOOK_FIREBASE; return !!(c && c.apiKey && c.projectId); },
  set(st, err) { this.status = st; if (err !== undefined) this.err = err; UI.cloudChip(); UI.refresh('account'); UI.refresh('cloudpick'); if (st === 'synced' && typeof Social !== 'undefined') Social.onSynced(); },
  uid() { return this.mode === 'claude' ? (this.user && this.user.uid) : (this.user && this.user.uid); },
  active() { return !!this.uid() && (this.mode === 'firebase' ? !!this.fb : !!this.ref) && !['choose', 'loading'].includes(this.status) && Game.S.owner === this.uid(); },

  async init() {
    if (window.NOOK_ENV === 'artifact') return this.initClaude();
    this.mode = 'firebase';
    if (!this.configured()) return this.set('unconfigured');
    this.set('loading');
    try { this.fb = await loadFirebase(window.NOOK_FIREBASE); }
    catch (e) { console.warn('[cloud]', e); return this.set('error', '載入 Firebase 失敗，請檢查網路或 js/firebase-config.js。'); }
    if (this.fb.redirectResult) this.fb.redirectResult().catch(e => { const m = cloudErr(e); if (m) this.set(this.status, m); });
    this.fb.onAuth(u => this.onUser(u));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.checkSession(SESSION_FOCUS_MS).then(ok => { if (ok) this.pull(); }); });
    this.watchNet();
  },

  watchNet() {
    window.addEventListener('offline', () => { if (this.uid()) this.set('offline', ''); });
    window.addEventListener('online', () => { if (this.uid() && this.status === 'offline') { this.set('synced', ''); this.lastPull = 0; this.pull().then(() => this.flush()); } });
  },
  // ---------- Claude artifact storage ----------
  async initClaude() {
    this.mode = 'claude'; this.set('loading'); this.watchNet();
    try {
      const cl = window.claude; if (!cl || !cl.use) return this.set('off');
      const [user, db] = await Promise.all([cl.use('user'), cl.use('db')]); if (!user || !db) return this.set('off');
      const id = await user.id(); if (!id) return this.set('off');
      this.user = { uid: 'claude:' + id, email: '', name: 'Claude 帳號', provider: 'claude' };
      this.ref = db.doc('data/users/' + id + '/save'); this.bref = db.doc('data/users/' + id + '/backup');
      const snap = await this.ref.get();
      const raw = snap.exists ? (snap.data() || {}) : null, remote = raw ? raw.state : null; this.rev = raw ? (raw.rev || 0) : 0;
      if (remote && (raw.schema || remote.schema || 1) > SAVE_SCHEMA) return this.tooNew();
      await this.reconcile(remote && remote.v === 1 ? JSON.parse(JSON.stringify(remote)) : null);
    } catch (e) { console.warn('[cloud]', e); this.ref = null; this.set('off'); }
  },

  // ---------- Firebase ----------
  async onUser(u) {
    this.authBusy = false;
    if (!u) { this.user = null; this.choice = null; UI.closeWin('cloudpick'); return this.set('signedout'); }
    const prov = ((u.providerData || [])[0] || {}).providerId || 'password';
    this.user = { uid: u.uid, email: u.email || '', name: u.displayName || '', provider: prov };
    this.set('loading', '');
    let remote;
    try { remote = await this.fb.get(u.uid); } catch (e) { return this.set('error', cloudErr(e)); }
    this.rev = remote ? (remote.rev || 0) : 0;
    if (remote && (remote.schema || 1) > SAVE_SCHEMA) return this.tooNew();
    // a fresh sign-in on this device takes over the account; a device that only restored an old session checks it is still the active one
    const fresh = this.explicitAuth || !this.mySid(u.uid); this.explicitAuth = false;
    if (fresh) await this.claimSession(); else if (!(await this.checkSession(0))) return;
    await this.reconcile(this.parse(remote));
  },
  // ---------- one device per account: the newest sign-in wins, other devices are signed out ----------
  sessKey(uid) { return 'pocketnook.sess.' + uid; },
  mySid(uid) { try { return localStorage.getItem(this.sessKey(uid)) || ''; } catch (e) { return this.sid || ''; } },
  async claimSession() {
    if (!this.fb || !this.fb.store || !this.user) return;
    const sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    try { await this.fb.store.set('sess/' + this.user.uid, { sid, device: DEVICE_ID, at: '__now__' }); this.sid = sid; this.sessAt = Date.now(); try { localStorage.setItem(this.sessKey(this.user.uid), sid); } catch (e) { } }
    catch (e) { this.sid = ''; }   // rules not deployed yet: no single-device check
  },
  // false when another device has signed in since (this device is then signed out)
  async checkSession(gap = SESSION_CHECK_MS) {
    if (this.mode !== 'firebase' || !this.fb || !this.fb.store || !this.user || this.kicking) return true;
    const uid = this.user.uid, mine = this.sid || this.mySid(uid); if (!mine) return true;
    if (Date.now() - (this.sessAt || 0) < gap) return true;
    this.sessAt = Date.now();
    let doc = null; try { doc = await this.fb.store.get('sess/' + uid); } catch (e) { return true; }
    if (!doc) { await this.claimSession(); return true; }
    if (doc.sid === mine) { this.sid = mine; return true; }
    await this.kicked(); return false;
  },
  async kicked() {
    this.kicking = true;
    try { await Backups.put(Game.S, '同一個帳號在另一台裝置登入，這台裝置被登出前的進度', 'device'); } catch (e) { }
    clearTimeout(this.timer); this.timer = null; this.dirty = false; this.pending = false;
    const uid = this.user && this.user.uid; this.user = null; this.choice = null; this.sid = '';
    try { if (uid) localStorage.removeItem(this.sessKey(uid)); } catch (e) { }
    try { await this.fb.signOut(); } catch (e) { }
    Game.replaceState(Game.newState());
    this.set('signedout', '這個帳號已經在另一台裝置登入，這台裝置自動登出了。重新登入就會換回這台。');
    UI.closeWin('cloudpick');
    UI.toast('你的帳號在另一台裝置登入，這台裝置已登出（登出前的進度有備份在「帳號」視窗）', 'i_cloud', 6);
    this.kicking = false;
  },
  parse(doc) {
    if (!doc || typeof doc.data !== 'string') return null;
    try { const s = JSON.parse(doc.data); return s && s.v === 1 ? s : null; } catch (e) { return null; }
  },
  isFresh(S) { return isFreshSave(S); },

  // ---------- one-time migration / reconcile ----------
  async reconcile(rs) {
    const uid = this.uid(), L = Game.S;
    this.remoteHasProgress = !!rs && !isFreshSave(rs);
    // 1. this device already belongs to the account: normal sync, newest wins, but a blank device never replaces real cloud progress
    if (L.owner === uid) {
      if (rs && isFreshSave(L) && this.remoteHasProgress && !(L.flags && L.flags.resetAt)) return this.apply(rs, '已載入雲端進度');
      const meta = syncMeta(uid);
      if (rs && meta) {
        const remoteChanged = (this.rev || 0) !== meta.rev, localChanged = saveSignature(L) !== meta.sig;
        if (remoteChanged && !localChanged) return this.apply(rs, '已載入你在其他裝置的最新進度');
        if (remoteChanged && localChanged) { this.common = meta.base; return this.onConflict({ remote: rs, rev: this.rev || 0 }); }
        this.common = meta.base;
      } else if (rs && (rs.savedAt || 0) > (L.savedAt || 0)) return this.apply(rs, '已載入雲端上較新的進度');
      this.set('synced'); this.lastSync = Date.now(); this.dirty = true; return this.flush();
    }
    // 2. nothing worth keeping on this device: take the cloud save, or start a new cloud save if there is none
    if (isFreshSave(L)) {
      if (rs) return this.apply(rs, '歡迎回來！已載入你的雲端進度');
      try { await this.commit(Game.newState(), { mode: 'new', from: 'none' }); UI.toast('已建立你的雲端存檔', 'i_cloud'); } catch (e) { this.set('error', cloudErr(e)); }
      return;
    }
    // 3. this device holds another account's progress (session ended without signing out): keep it as a backup, never mix accounts
    if (L.owner && L.owner !== uid) {
      await Backups.put(L, '另一個帳號留在這台裝置的進度', 'device');
      if (rs) return this.apply(rs, '這台裝置上的是另一個帳號的進度，已備份起來；現在載入你的雲端存檔');
      try { await this.commit(Game.newState(), { mode: 'new', from: 'none' }); UI.toast('這台裝置上的是另一個帳號的進度，已備份起來；已幫你建立新的雲端存檔', 'i_cloud', 5); } catch (e) { this.set('error', cloudErr(e)); }
      return;
    }
    // 4. saves from before accounts existed (older version kept device and cloud in sync): identical progress means it is the same save
    if (rs && !rs.owner) { const x = saveSummary(L), y = saveSummary(rs), same = ['lvl', 'xp', 'coins', 'words', 'seen', 'items', 'focus', 'pets'].every(k => x[k] === y[k]);
      if (same) { const newer = (L.savedAt || 0) >= (rs.savedAt || 0) ? L : rs; setImportMark(uid, { at: Date.now(), fp: Game.loadedFp || '', mode: 'linked' }); const st = JSON.parse(JSON.stringify(newer)); st.sync = Object.assign({}, st.sync, { mode: 'kept-cloud', at: Date.now(), device: DEVICE_ID }); return this.apply(st, '這台裝置和雲端是同一份進度，已連結到你的帳號'); } }
    // 5. guest / older-version progress on this device: ask once
    const mark = importMarks()[uid];
    if (mark && mark.fp === Game.loadedFp && rs) return this.apply(rs, '已載入雲端進度（這台裝置的舊存檔之前處理過了）');
    this.choice = { mode: rs ? 'conflict' : 'import', remote: rs, local: L, localSum: saveSummary(L, true), remoteSum: rs ? saveSummary(rs) : null, localSavedAt: Game.loadedSavedAt || L.savedAt, sel: rs ? 'cloud' : 'import' };
    this.set('choose'); UI.openWin('cloudpick');
  },
  devBlocked() { return false; },   // developer-mode saves are never blocked
  async writeRemote(S) {
    const rev = (this.rev || 0) + 1, data = JSON.stringify(S);
    if (data.length > 880000) throw { code: 'too-big' };
    if (this.mode === 'firebase') {
      try { await this.fb.set(this.user.uid, { v: 1, schema: S.schema || SAVE_SCHEMA, rev, savedAt: S.savedAt || Date.now(), device: DEVICE_ID, lvl: S.lvl, coins: S.coins, email: this.user.email || '', dev: !!(S.flags && S.flags.dev), sync: S.sync || {}, data }); }
      catch (e) {
        // the rules only accept rev = previous rev + 1, so a rejected write may mean another device saved in between
        if (e && e.code === 'permission-denied') { let doc = null; try { doc = await this.fb.get(this.user.uid); } catch (e2) { } if (doc && (doc.rev || 0) !== (this.rev || 0)) throw { code: 'conflict', remote: this.parse(doc), rev: doc.rev || 0, device: doc.device }; }
        throw e;
      }
    } else {
      const snap = await this.ref.get(), cur = snap.exists ? (snap.data() || {}) : null;
      if (cur && (cur.rev || 0) !== (this.rev || 0) && cur.state) throw { code: 'conflict', remote: cur.state, rev: cur.rev || 0 };
      await this.ref.set({ state: JSON.parse(data), v: 1, rev, schema: S.schema || SAVE_SCHEMA });
    }
    this.rev = rev; this.lastHash = saveHash(data); this.lastWriteAt = Date.now(); this.common = progressBase(S);
    syncMeta(this.uid(), { rev, at: Date.now(), base: this.common, sig: saveSignature(S) });
  },
  async backupRemote(S, reason) {
    const rec = { v: 1, at: Date.now(), reason, device: DEVICE_ID, savedAt: S.savedAt || 0, lvl: S.lvl || 1, coins: S.coins || 0, data: JSON.stringify(S) };
    if (this.mode === 'firebase') { if (this.fb.backup) await this.fb.backup(this.user.uid, rec); }
    else if (this.bref) await this.bref.set({ state: JSON.parse(JSON.stringify(S)), at: rec.at, reason });
  },
  // write a new account save: back up first, write to the cloud, and only after that replace this device's save
  async commit(S2, meta, noMark) {
    const uid = this.uid(); S2 = JSON.parse(JSON.stringify(S2));
    S2.owner = uid; S2.savedAt = Date.now();
    S2.sync = Object.assign({}, meta, { at: Date.now(), device: DEVICE_ID, history: [...(((S2.sync || {}).history) || []).slice(-9), Object.assign({ at: Date.now() }, meta)] });
    if (meta.dev) S2.flags = Object.assign({}, S2.flags, { dev: true, devFrom: meta.from });
    this.set('saving');
    await this.writeRemote(S2);
    this.status = 'synced'; Game.replaceState(S2); this.lastSync = Date.now(); this.set('synced', '');
    this.common = progressBase(Game.S); syncMeta(uid, { rev: this.rev || 0, at: Date.now(), base: this.common, sig: saveSignature(Game.S) });
    this.remoteHasProgress = !isFreshSave(S2);
    this.dirty = false;
    if (!noMark) setImportMark(uid, { at: Date.now(), fp: Game.loadedFp || '', mode: meta.mode });
  },
  tooNew() {
    Game.outdated = true; this.set('outdated', '雲端存檔來自比較新的遊戲版本。請重新整理頁面（必要時清除快取）載入新版；為了保護存檔，這個舊版本不會儲存任何進度。');
    UI.toast('雲端存檔來自較新版本，請重新整理頁面', 'i_cloud', 8, { label: '重新整理', fn: () => location.reload() });
  },
  // another device saved this account in the meantime (rev moved on): merge by the fixed rules, back up both sides first
  async onConflict(e, depth = 0) {
    this.rev = e.rev;
    if (!e.remote) return this.set('error', '雲端存檔讀不到，等一下會再試。');
    if ((e.remote.schema || 1) > SAVE_SCHEMA) return this.tooNew();
    const L = JSON.parse(JSON.stringify(Game.S));
    try {
      await Backups.put(L, '兩台裝置同時存檔：合併前這台裝置的進度', 'device');
      await this.backupRemote(e.remote, '兩台裝置同時存檔：合併前的雲端存檔');
      await this.commit(mergeSaves(e.remote, L, this.common), { mode: 'merge-concurrent', from: 'device+cloud', dev: !!((L.flags || {}).dev || (e.remote.flags || {}).dev) }, true);
      UI.toast('另一台裝置也存了進度，已自動合併（合併前兩份都有備份）', 'i_cloud', 5);
    } catch (err) {
      if (err && err.code === 'conflict' && depth < 2) return this.onConflict(err, depth + 1);
      this.set('error', cloudErr(err));
    }
  },
  apply(rs, msg) {
    rs = JSON.parse(JSON.stringify(rs)); rs.owner = this.uid(); this.status = 'synced';
    Game.replaceState(rs); this.lastSync = Date.now(); this.set('synced');
    // what we just read is what the cloud holds: no need to write it back
    this.lastWriteAt = Date.now(); this.lastHash = saveHash(JSON.stringify(Game.S)); this.dirty = false; this.common = progressBase(Game.S);
    syncMeta(this.uid(), { rev: this.rev || 0, at: Date.now(), base: this.common, sig: saveSignature(Game.S) });
    if (msg) UI.toast(msg, 'i_cloud', 3.5);
  },
  async pick(which) {
    const c = this.choice; if (!c || this.working) return; const uid = this.uid();
    const devSrc = c.localSum.dev;
    this.working = true; this.err = ''; UI.refresh('cloudpick');
    try {
      // the device's original save is always kept as a backup on this device
      if (!c.backedUp) await Backups.put(c.local, which === 'cloud' ? '登入時改用雲端存檔，保留這台裝置原本的進度' : which === 'fresh' ? '選擇不匯入，保留這台裝置原本的進度' : '匯入雲端前的這台裝置原始存檔', 'device');
      c.backedUp = true;
      if (which === 'cloud') { setImportMark(uid, { at: Date.now(), fp: Game.loadedFp || '', mode: 'kept-cloud' }); this.apply(c.remote, '已載入雲端進度，這台裝置原本的進度備份在「帳號」視窗'); }
      else if (which === 'fresh') { await this.commit(Game.newState(), { mode: 'declined', from: 'device' }); UI.toast('已建立新的雲端存檔，這台裝置原本的進度備份在「帳號」視窗', 'i_cloud', 4.5); }
      else if (which === 'import') { await this.commit(c.local, { mode: 'import', from: 'device', srcSavedAt: c.localSavedAt, dev: devSrc }); UI.toast('匯入完成！這台裝置的進度已經存到雲端', 'i_cloud', 4); }
      else {
        if (c.remote) await this.backupRemote(c.remote, which === 'local' ? '被這台裝置的進度取代前的雲端存檔' : '合併前的雲端存檔');
        if (which === 'local') { await this.commit(c.local, { mode: 'replace-cloud', from: 'device', srcSavedAt: c.localSavedAt, dev: devSrc }); UI.toast('已用這台裝置的進度取代雲端，原本的雲端存檔有備份', 'i_cloud', 4.5); }
        else { await this.commit(mergeSaves(c.remote, c.local), { mode: 'merge', from: 'device+cloud', srcSavedAt: c.localSavedAt, dev: devSrc || !!(c.remote.flags && c.remote.flags.dev) }); UI.toast('合併完成！兩邊的進度都留下來了，合併前的兩份存檔都有備份', 'i_cloud', 4.5); }
      }
      this.choice = null; this.working = false; UI.closeWin('cloudpick');
    } catch (e) {
      console.warn('[cloud] migrate', e); this.working = false; this.status = 'choose';
      this.err = '移轉沒有完成，這台裝置的進度沒有被改動：' + cloudErr(e); UI.refresh('cloudpick'); UI.cloudChip();
    }
  },
  async restoreBackup(S, label) {
    if (!this.uid()) { Dev && Dev.on ? Dev.act('還原備份', () => Game.replaceState(S)) : Game.replaceState(S); return UI.toast('已還原備份', 'i_reset'); }
    if (!confirm(`用「${label}」取代目前的進度？目前的進度會先備份。`)) return;
    try {
      await Backups.put(Game.S, '還原備份前的進度', 'device'); await this.backupRemote(Game.S, '還原備份前的雲端存檔');
      await this.commit(S, { mode: 'restore', from: 'backup', srcSavedAt: S.savedAt, dev: !!(S.flags && S.flags.dev) });
      UI.toast('已還原備份並同步到雲端', 'i_reset', 3);
    } catch (e) { this.set('error', cloudErr(e)); }
  },
  async push() {
    if (!this.active() || Game.outdated) return;
    if (this.busy) { this.pending = true; return; }
    const S = Game.S;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.set('offline', ''); return; }
    if (this.lastHash && saveHash(JSON.stringify(S)) === this.lastHash) { if (this.status !== 'synced') this.set('synced', ''); return; }
    // safety net: never let a blank save replace real progress in the cloud unless the player reset on purpose
    if (isFreshSave(S) && this.remoteHasProgress && !(S.flags && S.flags.resetAt)) { this.set('error', '這台裝置的進度是空白的，沒有上傳，避免蓋掉雲端存檔。請重新登入。'); return; }
    if (!(await this.checkSession())) return;
    this.busy = true; this.set('saving');
    try { await this.writeRemote(S); this.dirty = false; this.lastSync = Date.now(); this.busy = false; this.remoteHasProgress = !isFreshSave(S); this.set('synced', ''); }
    catch (e) {
      this.busy = false;
      if (e && e.code === 'conflict') { this.pending = false; return this.onConflict(e); }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.set('offline', ''); return; }
      this.set('error', cloudErr(e)); if (!e || (e.code !== 'permission-denied' && e.code !== 'too-big' && !['not_granted', 'revoked', 'capability_disabled', 'capability_removed'].includes(e.code))) this.retry(30000);
    }
    if (this.pending) { this.pending = false; this.schedule(1500); }
  },
  async pull() {
    if (this.mode !== 'firebase' || !this.active() || this.busy || Date.now() - this.lastPull < CLOUD_PULL_MS) return; this.lastPull = Date.now();
    try {
      const doc = await this.fb.get(this.user.uid), rs = this.parse(doc);
      if (!doc || (doc.rev || 0) === (this.rev || 0)) return;
      if ((doc.schema || 1) > SAVE_SCHEMA) return this.tooNew();
      if (rs && !this.dirty) { this.rev = doc.rev || 0; this.apply(rs, '已同步你在其他裝置的最新進度'); }
      else if (rs) this.onConflict({ remote: rs, rev: doc.rev || 0 });
    } catch (e) { }
  },
  // routine change → merged into one write at most every 90 s
  schedule() { this.dirty = true; this.plan(CLOUD_ROUTINE_MS); },
  // important event (reward claimed, item bought, quiz finished…) → written within ~10 s
  soon() { this.dirty = true; this.plan(CLOUD_SOON_MS); },
  retry(ms) { this.plan(ms, true); },
  plan(gap, fromNow) {
    if (!this.active() || Game.outdated) return;
    const now = Date.now(), at = fromNow ? now + gap : Math.max(now + 1500, (this.lastWriteAt || 0) + gap);
    if (this.timer && this.timerAt <= at) return;
    clearTimeout(this.timer); this.timerAt = at;
    this.timer = setTimeout(() => { this.timer = null; this.push(); }, at - now);
  },
  async flush() { clearTimeout(this.timer); this.timer = null; return this.push(); },
  async auth(kind) {
    if (this.authBusy) return; const f = this.form;
    const email = (document.getElementById('cl-email') || {}).value || f.email, pw = (document.getElementById('cl-pw') || {}).value || '';
    f.email = email.trim(); f.msg = '';
    if (kind !== 'google' && !f.email) { f.msg = '請輸入 Email。'; return UI.refresh('account'); }
    if ((kind === 'in' || kind === 'up') && pw.length < 6) { f.msg = '密碼至少要 6 個字元。'; return UI.refresh('account'); }
    this.authBusy = true; this.err = ''; this.explicitAuth = kind !== 'reset'; UI.refresh('account');
    try {
      if (kind === 'google') await this.fb.google();
      else if (kind === 'in') await this.fb.signIn(f.email, pw);
      else if (kind === 'up') await this.fb.signUp(f.email, pw);
      else if (kind === 'reset') { await this.fb.reset(f.email); f.msg = '重設密碼的信已寄出，請到信箱收信。'; this.authBusy = false; }
    } catch (e) { this.authBusy = false; f.msg = cloudErr(e); }
    UI.refresh('account');
  },
  async signOut() {
    if (!this.user) return;
    if (this.mode === 'claude') return;
    if (Game.S.owner === this.user.uid) { Game.save(); await this.push(); }
    if (this.status === 'error') { if (!confirm('最近的進度還沒成功存到雲端，確定要登出嗎？登出後這台裝置會換回空白的小窩。')) return; }
    try { localStorage.removeItem(this.sessKey(this.user.uid)); } catch (e) { }
    try { await this.fb.signOut(); } catch (e) { }
    this.user = null; this.choice = null; this.sid = '';
    Game.replaceState(Game.newState());
    this.set('signedout', '');
    UI.toast('已登出。你的小窩安全存在雲端，下次登入就會回來', 'i_cloud');
  },
};

// ---------------- UI ----------------
Object.assign(UI.WIN, {
  account: { t: '帳號與雲端存檔', i: 'i_cloud', w: 420, at: ['r', 0] },
  cloudpick: { t: '存檔移轉', i: 'i_cloud', w: 560, at: ['c', 0], modal: true, noclose: true },
});
UI.cloudChip = function () {
  const el = this.el && this.el.cloud; if (!el) return;
  const c = Cloud, st = c.status; let t = '', tip = '';
  if (c.mode === 'claude' && st === 'choose') { t = '選擇進度'; tip = '請選擇要使用哪一份進度'; }
  else if (c.mode === 'claude') { tip = st === 'synced' ? '進度自動存在你的 Claude 帳號' : '雲端存檔'; }
  else if (st === 'unconfigured') { tip = '雲端存檔尚未設定，進度只存在這台裝置'; }
  else if (st === 'signedout') { t = '登入'; tip = '登入後進度會存到雲端'; }
  else if (st === 'loading') { tip = '連線中…'; }
  else if (st === 'saving') { tip = '儲存到雲端中…'; }
  else if (st === 'synced') { tip = '已同步到雲端（' + (c.user ? c.user.email || c.user.name : '') + '）'; }
  else if (st === 'choose') { t = '選擇進度'; tip = '請選擇要使用哪一份進度'; }
  else if (st === 'error') { tip = c.err || '雲端存檔發生問題'; }
  else if (st === 'offline') { tip = '離線中：進度先存在這台裝置，連上網路後會自動上傳'; }
  else if (st === 'outdated') { t = '請重新整理'; tip = c.err; }
  el.dataset.st = c.mode === 'claude' && st === 'synced' ? 'synced' : st;
  el.querySelector('.cl-t').textContent = t; el.classList.toggle('icon-only', !t);
  el.title = tip; el.setAttribute('aria-label', '帳號與雲端存檔：' + tip);
};
UI.w_account = function () {
  const c = Cloud, f = c.form, out = [];
  const status = (txt, cls) => h('p', { class: 'cl-status ' + (cls || '') }, h('i', { class: 'cl-dot', 'data-st': cls || c.status }), h('span', { text: txt }));
  out.push(UI.nameField()); if (typeof Social !== 'undefined' && Social.enabled()) out.push(UI.statusField());
  if (c.mode === 'claude' || window.NOOK_ENV === 'artifact') {
    out.push(status(c.status === 'synced' ? '已自動存到你的 Claude 帳號' : c.status === 'loading' ? '連線中…' : '這個環境沒有雲端儲存，進度只存在這台裝置', c.status === 'synced' ? 'synced' : c.status));
    out.push(h('p', { class: 'hint', text: '在 Claude 上玩時不用另外登入：進度跟著你的 Claude 帳號走，換一台裝置打開同一個頁面就能接著玩。想用 Google 或 Email 帳號登入，請用 GitHub 版本（README 有 Firebase 設定教學）。' }));
    if (c.lastSync) out.push(h('p', { class: 'hint', text: '上次同步：' + agoText(c.lastSync) }));
    if (c.status === 'choose') out.push(h('button', { class: 'chip primary', onclick: () => UI.openWin('cloudpick') }, '選擇要用哪一份進度'));
    out.push(...UI.backupSection());
    return out;
  }
  if (c.status === 'unconfigured') {
    out.push(status('雲端存檔尚未設定', 'off'));
    out.push(h('p', { class: 'hint', text: '目前進度只存在這台裝置的瀏覽器。網站主人在 js/firebase-config.js 填入 Firebase 設定後，大家就能用 Google 或 Email 登入，把進度存到雲端。步驟請看 README 的「雲端存檔」。' }));
    return out;
  }
  if (c.status === 'loading' && !c.user) { out.push(status('連線中…', 'loading')); return out; }
  if (!c.user) {
    out.push(h('p', { class: 'hint', text: '登入之後，進度（房間、金幣、單字、任務、寵物）會自動存到雲端，換手機或電腦登入同一個帳號就能接著玩。' }));
    out.push(h('button', { class: 'chip big primary cl-google', disabled: c.authBusy, onclick: () => c.auth('google') }, ico('i_key', 22), '使用 Google 帳號登入'));
    out.push(h('div', { class: 'cl-or' }, h('span', { text: '或使用 Email' })));
    out.push(h('div', { class: 'tabs' }, ...[['in', '登入'], ['up', '註冊新帳號'], ['reset', '忘記密碼']].map(([k, l]) => h('button', { class: 'tab' + (f.tab === k ? ' on' : ''), onclick: () => { f.email = (document.getElementById('cl-email') || {}).value || f.email; f.tab = k; f.msg = ''; UI.refresh('account'); } }, l))));
    const submit = () => c.auth(f.tab);
    const em = h('input', { id: 'cl-email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com', value: f.email, 'aria-label': 'Email', onkeydown: e => { if (e.key === 'Enter') submit(); } });
    out.push(h('label', { class: 'field' }, h('span', { text: 'Email' }), h('div', { class: 'inset grow' }, em)));
    if (f.tab !== 'reset') {
      const pw = h('input', { id: 'cl-pw', type: 'password', autocomplete: f.tab === 'up' ? 'new-password' : 'current-password', placeholder: f.tab === 'up' ? '至少 6 個字元' : '密碼', 'aria-label': '密碼', onkeydown: e => { if (e.key === 'Enter') submit(); } });
      out.push(h('label', { class: 'field' }, h('span', { text: '密碼' }), h('div', { class: 'inset grow' }, pw)));
    }
    out.push(h('button', { class: 'chip primary', disabled: c.authBusy, onclick: submit }, ico('i_mail', 20), c.authBusy ? '處理中…' : f.tab === 'in' ? '登入' : f.tab === 'up' ? '註冊並登入' : '寄送重設密碼信'));
    if (f.msg) out.push(h('p', { class: 'cl-msg', role: 'status', text: f.msg }));
    if (c.err) out.push(h('p', { class: 'cl-msg', role: 'status', text: c.err }));
    out.push(h('p', { class: 'hint', text: '你現在在這台裝置上的進度，登入後可以選擇要不要帶上雲端。' }));
    return out;
  }
  const u = c.user, provName = u.provider === 'google.com' ? 'Google 帳號' : 'Email 帳號';
  const stText = { loading: '讀取雲端進度中…', saving: '儲存中…', synced: '已同步 · ' + agoText(c.lastSync), choose: '等你選擇要用哪一份進度', error: '同步失敗', offline: '離線中：進度先存在這台裝置，連線後自動上傳', outdated: '需要重新整理載入新版' }[c.status] || '';
  out.push(h('div', { class: 'cl-user' }, ico('i_cloud', 32), h('div', { class: 'grow' }, h('b', { text: u.name || u.email || '已登入' }), h('div', { class: 'hint', text: provName + (u.name && u.email ? ' · ' + u.email : '') }))));
  out.push(status(stText));
  if (c.err) out.push(h('p', { class: 'cl-msg', role: 'status', text: c.err }));
  out.push(h('p', { class: 'hint', text: '遊戲會在你操作後幾秒內自動存檔，切換分頁或關閉頁面時也會存。在另一台裝置玩過後回到這裡，會自動載入較新的進度。' }));
  out.push(h('div', { class: 'row wrap' },
    h('button', { class: 'chip', disabled: c.status === 'saving' || c.status === 'choose', onclick: () => { Game.save(); c.flush(); } }, ico('i_reset', 20), '立即同步'),
    c.status === 'choose' ? h('button', { class: 'chip primary', onclick: () => UI.openWin('cloudpick') }, '選擇進度') : null,
    h('button', { class: 'chip', onclick: () => c.signOut() }, '登出')));
  out.push(...UI.backupSection());
  return out;
};
Cloud.selfTest = async function () {
  if (this.testing) return; this.testing = true; UI.refresh('account'); const res = [], add = (name, ok, detail, warn) => res.push({ name, ok, detail, warn });
  const cfg = window.NOOK_FIREBASE || {}, uid = this.user && this.user.uid;
  add('firebase-config.js 已填寫', !!(cfg.apiKey && cfg.appId && cfg.projectId && cfg.messagingSenderId), `projectId：${cfg.projectId || '（空白）'}`);
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  add('網址使用 HTTPS（或 localhost）', secure, `${location.protocol}//${location.host}；這個網域要在 Authentication → 授權網域裡`);
  add('Firebase SDK 已載入', !!this.fb, `firebasejs ${FIREBASE_SDK}`);
  add('已登入並取得 UID', !!uid, uid ? `UID：${uid.slice(0, 6)}…（${this.user.email || this.user.provider}）` : '');
  const expectDenied = async (name, fn) => { try { await fn(); add(name, false, '沒有被拒絕！安全規則可能沒有部署，請重新貼上 firestore.rules。'); return false; } catch (e) { const ok = e && e.code === 'permission-denied'; add(name, ok, ok ? '正確被拒絕（permission-denied）' : '錯誤：' + cloudErr(e)); return ok; } };
  if (uid && this.fb) {
    try { const d = await this.fb.get(uid); add(`讀取自己的存檔 saves/${uid.slice(0, 6)}…`, true, d ? `有存檔：schema ${d.schema || 1}、rev ${d.rev || 0}、${Math.round((d.data || '').length / 1024)} KB` : '還沒有存檔'); }
    catch (e) { add('讀取自己的存檔', false, cloudErr(e)); }
    if (this.fb.probe) {
      await expectDenied('讀取別人的存檔', () => this.fb.probe.getOther());
      await expectDenied('列出所有玩家的存檔', () => this.fb.probe.listAll());
      const okBad = await expectDenied('寫入格式錯誤的資料', async () => { const id = await this.fb.probe.badWrite(uid); try { await this.fb.probe.delBackup(uid, id); } catch (e) { } });
      try { await this.fb.backups(uid); add('讀取自己的雲端備份', true, ''); } catch (e) { add('讀取自己的雲端備份', false, cloudErr(e)); }
    }
  }
  const size = JSON.stringify(Game.S).length; add('存檔大小在上限內', size < 880000, `${Math.round(size / 1024)} KB（上限約 880 KB）`);
  add('存檔版本', !Game.outdated, `schema ${Game.S.schema}（這個版本支援到 ${SAVE_SCHEMA}）、rev ${this.rev || 0}`);
  add('未登入時無法存取', true, '請另外用無痕視窗、不登入打開網址，確認右上角只顯示「登入」、不會讀到任何存檔。', true);
  this.testRes = res; this.testing = false; UI.refresh('account');
};
const SYNC_MODES = { 'merge-concurrent': '兩台裝置同時存檔，自動合併', new: '新建立的雲端存檔', import: '從這台裝置匯入', declined: '選擇不匯入，重新開始', 'replace-cloud': '用裝置進度取代雲端', merge: '裝置與雲端合併', restore: '從備份還原', 'kept-cloud': '使用雲端存檔' };
Cloud.bk = { local: [], cloud: [], at: 0 };
Cloud.loadBackups = async function (withCloud) {
  this.bk.local = await Backups.list().catch(() => []);
  if (withCloud) { this.bk.cloud = []; this.bk.cloudLoaded = true; }
  if (withCloud && this.mode === 'firebase' && this.user && this.fb && this.fb.backups) { try { this.bk.cloud = await this.fb.backups(this.user.uid); } catch (e) { } }
  if (withCloud && this.mode === 'claude' && this.bref) { try { const sn = await this.bref.get(); if (sn.exists) { const d = sn.data() || {}; if (d.state) this.bk.cloud = [{ id: 'claude', at: d.at, reason: d.reason, savedAt: d.state.savedAt, lvl: d.state.lvl, coins: d.state.coins, state: d.state }]; } } catch (e) { } }
  this.bk.at = Date.now(); UI.refresh('account');
};
UI.backupSection = function () {
  const c = Cloud, S = Game.S, out = [];
  if (Date.now() - c.bk.at > 15000) { c.bk.at = Date.now(); setTimeout(() => c.loadBackups(false), 0); }
  const sy = S.sync;
  out.push(h('div', { class: 'sub', text: '存檔來源與備份' }));
  out.push(h('p', { class: 'hint', text: sy && sy.mode ? `目前存檔：${SYNC_MODES[sy.mode] || sy.mode} · ${saveDate(sy.at)}` + (sy.srcSavedAt ? `（來源存檔修改於 ${saveDate(sy.srcSavedAt)}）` : '') : '這份存檔還沒有移轉紀錄。' }));
  const row = (b, label, fn) => h('div', { class: 'devh' }, h('div', { class: 'grow' }, h('div', { text: b.reason || '備份' }), h('div', { class: 'hint num', text: `${saveDate(b.at)} · Lv ${b.lvl || (b.sum || {}).lvl || 1} · ${(b.coins != null ? b.coins : (b.sum || {}).coins) || 0} 金幣` + (b.sum ? ` · 學會 ${b.sum.words} 字` : '') })), h('button', { class: 'chip sm', onclick: fn }, label));
  const loc = c.bk.local.slice(0, 6), cl = c.bk.cloud.slice(0, 6);
  if (loc.length) out.push(h('div', { class: 'hint', text: '這台裝置上的備份' }), h('div', { class: 'devhist' }, ...loc.map(b => row(b, '還原', () => c.restoreBackup(JSON.parse(b.json), b.reason)))));
  if (cl.length) out.push(h('div', { class: 'hint', text: '雲端上的備份' }), h('div', { class: 'devhist' }, ...cl.map(b => row(b, '還原', () => { const st = b.state || JSON.parse(b.data); c.restoreBackup(st, b.reason); }))));
  if (!c.bk.cloudLoaded && c.uid()) out.push(h('button', { class: 'chip sm', onclick: () => c.loadBackups(true) }, '讀取雲端上的備份'));
  if (!loc.length && !cl.length) out.push(h('p', { class: 'hint', text: '還沒有備份。移轉、合併或取代存檔之前，都會自動先備份。' }));
  if (c.mode === 'firebase' && c.uid()) {
    out.push(h('div', { class: 'sub', text: '雲端自我檢查' }), h('p', { class: 'hint', text: '在正式網址上按一次，確認設定、登入、安全規則都正確（會做 6 次讀取、1 次被拒絕的寫入）。' }),
      h('button', { class: 'chip sm', disabled: c.testing, onclick: () => c.selfTest() }, c.testing ? '檢查中…' : '開始檢查'));
    if (c.testRes) out.push(h('div', { class: 'devhist' }, ...c.testRes.map(r => h('div', { class: 'devh' }, h('b', { class: r.ok ? 'ok' : 'bad', text: r.ok ? '通過' : r.warn ? '注意' : '失敗' }), h('div', { class: 'grow' }, h('div', { text: r.name }), h('div', { class: 'hint', text: r.detail || '' }))))));
  }
  return out;
};
UI.w_cloudpick = function () {
  const ch = Cloud.choice; if (!ch) return [];
  const pol = SAVE_POLICY(), blocked = Cloud.devBlocked(ch.localSum), busy = Cloud.working;
  const card = (sum, title, src, when, extra, on) => h('div', { class: 'cl-card' + (on ? ' on' : '') }, h('b', { text: title }),
    h('dl', { class: 'stats' }, h('dt', { text: '來源' }), h('dd', { text: src }), h('dt', { text: '修改日期' }), h('dd', { class: 'num', text: saveDate(when) }),
      h('dt', { text: '等級' }), h('dd', { class: 'num', text: `Lv ${sum.lvl}` }), h('dt', { text: '金幣' }), h('dd', { class: 'num', text: String(sum.coins) }),
      h('dt', { text: '單字' }), h('dd', { class: 'num', text: `學會 ${sum.words}／看過 ${sum.seen}` }), h('dt', { text: '寵物、家具' }), h('dd', { class: 'num', text: `${sum.pets} 隻、${sum.items} 件` }),
      h('dt', { text: '累積專注' }), h('dd', { class: 'num', text: `${sum.focus} 分鐘` })),
    extra);
  const tags = (sum) => h('div', { class: 'ptraits' }, sum.legacy ? h('span', { class: 'ptag', text: '舊版存檔（已轉成新格式）' }) : null);
  const out = [];
  const localCard = card(ch.localSum, '這台裝置', '這台裝置的瀏覽器（localStorage）', ch.localSavedAt, tags(ch.localSum), ch.mode === 'import');
  if (ch.mode === 'import') {
    out.push(h('p', {}, `你已經登入（${Cloud.user.email || Cloud.user.name}），這個帳號在雲端還沒有存檔。這台裝置上有一份還沒連到任何帳號的進度，要把它匯入雲端嗎？`));
    out.push(h('div', { class: 'cl-cards one' }, localCard));
  } else {
    out.push(h('p', {}, `這個帳號在雲端已經有存檔，這台裝置上也有一份還沒連到帳號的進度。請選擇要怎麼處理：`));
    out.push(h('div', { class: 'cl-cards' }, card(ch.remoteSum, '雲端存檔', Cloud.mode === 'claude' ? '你的 Claude 帳號' : '雲端（Firebase）', ch.remote.savedAt, tags(ch.remoteSum), false), localCard));
    const opt = (k, label, desc, dis) => h('label', { class: 'cl-opt' + (ch.sel === k ? ' on' : '') + (dis ? ' dis' : '') }, h('input', { type: 'radio', name: 'clpick', checked: ch.sel === k, disabled: dis, onchange: () => { ch.sel = k; UI.refresh('cloudpick'); } }), h('div', {}, h('b', { text: label }), h('div', { class: 'hint', text: desc })));
    out.push(h('div', { class: 'cl-opts' },
      opt('cloud', '使用雲端存檔', '這台裝置的進度會備份在這台裝置上，之後可以在「帳號」視窗還原。'),
      opt('merge', '合併兩份', '以修改日期較新的那份為主（房間擺設、今天的任務）；等級、金幣取較高的；每個單字取熟練度較高的；家具、外觀、道具、寵物用品、成就、待辦合在一起；寵物兩邊都留下（最多 10 隻）。合併前兩份都會備份。', blocked),
      opt('local', '用這台裝置的進度取代雲端', '雲端存檔會先備份到雲端，之後可以還原。', blocked)));
  }
  if (Cloud.err) out.push(h('p', { class: 'cl-msg', role: 'status', text: Cloud.err }));
  out.push(h('p', { class: 'hint', text: '不論選哪一種，這台裝置原本的存檔都會先備份，完成後會記下匯入紀錄，下次登入不會再問。' }));
  if (ch.mode === 'import') out.push(h('div', { class: 'row wrap center' },
    h('button', { class: 'chip primary', disabled: busy || blocked, onclick: () => Cloud.pick('import') }, ico('i_cloud', 18), busy ? '處理中…' : '匯入到雲端'),
    h('button', { class: 'chip', disabled: busy, onclick: () => { if (confirm('不匯入的話，雲端會建立一個新的小窩，這台裝置原本的進度只留在備份裡。確定嗎？')) Cloud.pick('fresh'); } }, '不要匯入，從新的小窩開始')));
  else out.push(h('div', { class: 'row wrap center' }, h('button', { class: 'chip primary', disabled: busy, onclick: () => { if (ch.sel === 'local' && !confirm('確定要用這台裝置的進度取代雲端存檔嗎？（雲端存檔會先備份）')) return; Cloud.pick(ch.sel); } }, busy ? '處理中…' : '確定')));
  return out;
};
