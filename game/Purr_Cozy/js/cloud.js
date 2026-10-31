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
  auth.languageCode = I18n.lang;
  let persistence = '', persistenceError = null;
  for (const [name, storage] of [['local', U.indexedDBLocalPersistence], ['local', U.browserLocalPersistence], ['session', U.browserSessionPersistence]]) {
    try { await U.setPersistence(auth, storage); persistence = name; break; }
    catch (e) { persistenceError = e; }
  }
  if (!persistence) throw Object.assign(new Error(I18n.s("u_c31aef0255ae")), { code: 'auth/web-storage-unsupported', cause: persistenceError });
  const ref = uid => F.doc(db, 'saves', uid);
  const google = () => { const p = new U.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return p; };
  return {
    persistence,
    onAuth: cb => U.onAuthStateChanged(auth, cb),
    redirectResult: () => U.getRedirectResult(auth),
    // Called directly inside the login button's click; do not await initialization here.
    // Cross-site redirects lose their auth helper state with partitioned browser storage.
    google: () => U.signInWithPopup(auth, google()),
    signIn: (email, pw) => U.signInWithEmailAndPassword(auth, email, pw),
    signUp: (email, pw) => U.createUserWithEmailAndPassword(auth, email, pw),
    reset: email => U.sendPasswordResetEmail(auth, email),
    signOut: () => U.signOut(auth),
    async get(uid) { const s = await F.getDoc(ref(uid)); return s.exists() ? s.data() : null; },
    watchSave: (uid, cb) => F.onSnapshot(ref(uid), s => cb(s.exists() ? s.data() : null), () => { }),
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
        // live updates of one small document (one read when it changes); returns a function that stops watching
        watch: (path, cb) => F.onSnapshot(F.doc(db, path), s => cb(s.exists() ? norm(s.data()) : null), () => { }),
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
  'too-big': I18n.s("u_e69ac0eda952"),
  'conflict': I18n.s("u_e4a6649defaf"),
  'auth/invalid-email': I18n.s("u_74ebf71845be"),
  'auth/missing-email': I18n.s("u_a3c575d5c84b"),
  'auth/missing-password': I18n.s("u_d92e160178ba"),
  'auth/weak-password': I18n.s("u_acd3482a8732"),
  'auth/email-already-in-use': I18n.s("u_c9475318de78"),
  'auth/invalid-credential': I18n.s("u_bbff6d095fb5"),
  'auth/invalid-login-credentials': I18n.s("u_bbff6d095fb5"),
  'auth/wrong-password': I18n.s("u_bbff6d095fb5"),
  'auth/user-not-found': I18n.s("u_7ba60f506251"),
  'auth/user-disabled': I18n.s("u_6dc04cbb7b4e"),
  'auth/too-many-requests': I18n.s("u_db7e81ac023e"),
  'auth/network-request-failed': I18n.s("u_6eb95afe3620"),
  'auth/popup-closed-by-user': I18n.s("u_9e86a0e6b800"),
  'auth/cancelled-popup-request': '',
  'auth/popup-blocked': I18n.s("u_50490c32ad18"),
  'auth/web-storage-unsupported': I18n.s("u_da6e9aaf8d65"),
  'auth/operation-not-supported-in-this-environment': I18n.s("u_d912ff61b0e8"),
  'auth/no-current-user': I18n.s("u_dc015a9c8846"),
  'auth/unauthorized-domain': I18n.s("u_2903e0fc2aab"),
  'auth/operation-not-allowed': I18n.s("u_41a9cf17239f"),
  'auth/invalid-api-key': I18n.s("u_062c7ac363b8"),
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': I18n.s("u_062c7ac363b8"),
  'permission-denied': I18n.s("u_2bdd7dc97384"),
  'unavailable': I18n.s("u_a84ea4811c89"),
  'failed-precondition': I18n.s("u_f5ebf5d166f4"),
  'not-found': I18n.s("u_f5ebf5d166f4"),
};
function cloudErr(e) {
  const code = (e && e.code) || ''; if (code in CLOUD_ERR) return CLOUD_ERR[code];
  return I18n.s("u_4df011106d4a") + (code || (e && e.message) || e);
}
function agoText(ts) {
  if (!ts) return I18n.s("u_d93370d8c387"); const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 45) return I18n.s("u_dc48e8cd94cd"); if (s < 3600) return Math.round(s / 60) + I18n.s("u_b7493888054b"); if (s < 86400) return Math.round(s / 3600) + I18n.s("u_8939ff498ce7");
  return new Date(ts).toLocaleDateString(I18n.lang);
}

// ---------- save helpers shared by both cloud modes ----------
// write budget: routine changes are merged and written at most every 90 s; important events (rewards, purchases, quiz results) within ~10 s
const CLOUD_ROUTINE_MS = 90000, CLOUD_SOON_MS = 10000, CLOUD_PULL_MS = 120000;
// one device per account: the session is checked before cloud writes (at most every 5 min) and when the game comes back to the front (at most every 60 s)
const SESSION_CHECK_MS = 5 * 60e3, SESSION_FOCUS_MS = 60e3;
// coming back after this long counts as opening the game again (this device takes over); how long a new device waits for the old one's upload
const TAKEOVER_AWAY_MS = 10 * 60e3, HANDOFF_MS = 2500;
const SAVE_POLICY = () => Object.assign({ devSaves: 'flag' }, window.NOOK_SAVE_POLICY || {});
const IMPORT_MARK = 'pocketnook.imported';
function saveHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + str.length; }
function saveDate(ts) { return ts ? new Date(ts).toLocaleString(I18n.lang, { hour12: false }) : I18n.s("u_bd5a8814a363"); }
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
// cloudBase: the cloud holds the newer progress (decided by the progress stamp), so its room, tasks and needs are kept
function mergeHomeCare(a={},b={}) {
  const base=(b.messUpdatedAt||0)>(a.messUpdatedAt||0)?b:a,other=base===a?b:a,cleaned={...(a.cleanedMesses||{})};
  for(const [id,at]of Object.entries(b.cleanedMesses||{}))cleaned[id]=Math.max(cleaned[id]||0,at||0);
  const entries=new Map();for(const mark of [...(a.messes||[]),...(b.messes||[])]){if(!mark||!mark.id||cleaned[mark.id])continue;const prev=entries.get(mark.id);if(!prev||(mark.at||0)>(prev.at||0))entries.set(mark.id,{...mark});}
  const logs=new Map();for(const row of [...(a.log||[]),...(b.log||[])])logs.set(row.at+':'+row.text,row);
  return {...other,...base,messes:[...entries.values()].sort((x,y)=>(x.at||0)-(y.at||0)),cleanedMesses:cleaned,messUpdatedAt:Math.max(a.messUpdatedAt||0,b.messUpdatedAt||0),lastFight:Math.max(a.lastFight||0,b.lastFight||0),lastFishSpill:Math.max(a.lastFishSpill||0,b.lastFishSpill||0),log:[...logs.values()].sort((x,y)=>y.at-x.at).slice(0,30)};
}
function mergeSaves(a, b, common, cloudBase) {
  const base = cloudBase ? a : (b.savedAt || 0) > (a.savedAt || 0) ? b : a, o = base === a ? b : a, M = JSON.parse(JSON.stringify(base));
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
  if (L && OL.adaptive && (!L.adaptive || (OL.adaptive.at || 0) > (L.adaptive.at || 0))) L.adaptive = JSON.parse(JSON.stringify(OL.adaptive));
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
    if (!Z.code && O.code) { Z.code = O.code; Z.codeUid = O.codeUid; } if ((O.statusEditedAt || 0) > (Z.statusEditedAt || 0) || !Object.prototype.hasOwnProperty.call(Z,'status')) { Z.status=O.status || ''; Z.statusEditedAt=O.statusEditedAt || 0; } Z.gb = Z.gb || O.gb;
  }
  M.flags = Object.assign({}, o.flags, M.flags); if ((o.flags || {}).dev || (base.flags || {}).dev) M.flags.dev = true;
  if(o.playProgress){const A=M.playProgress||{},B=o.playProgress;const newest=(B.day||'')>(A.day||'')?B:A;M.playProgress=Object.assign({},newest,{total:Math.max(A.total||0,B.total||0)});if(A.day===B.day){M.playProgress.today=Math.max(A.today||0,B.today||0);M.playProgress.helpClaimed=!!(A.helpClaimed||B.helpClaimed);if(A.helpCredit||B.helpCredit)M.playProgress.helpCredit=[A.helpCredit,B.helpCredit].find(c=>c&&c.day===M.playProgress.day)||null;}}
  if(a.homeCare||b.homeCare)M.homeCare=mergeHomeCare(a.homeCare||{},b.homeCare||{});
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
// ---------- progress stamp (kept inside the save) ----------
// pv.rev: the cloud version this progress grew from. The cloud version number only ever goes up (the rules accept rev + 1 only),
// so comparing it tells which copy is newer; the clock (savedAt) is never used for that, a device opened later can hold older progress.
// pv.fp: fingerprint of the real progress at that moment; when it still matches, this device has done nothing since.
// pv.base: the totals at that moment, so a merge can add up what each device earned.
function progressKey(S) {
  const v = Object.values(S.vocab || {}), pets = (S.zoo && S.zoo.pets) || [];
  // only things that change because you did something (no counters that move on their own, nothing reset by the 6 a.m. rollover)
  return saveHash(JSON.stringify([totalXp(S), S.coins || 0, v.length, v.reduce((n, r) => n + (r ? (r[0] || 0) * 1000 + (r[1] || 0) : 0), 0),
    (S.items || []).map(i => [i.k, i.x, i.y, i.flip ? 1 : 0, i.p || 0, !!i.on, !!i.closed, !!i.soiled, !!i.fallen]), S.social?.status || '', S.social?.statusEditedAt || 0, S.settings || {}, S.playProgress || {}, [(S.homeCare?.messes||[]).map(m=>[m.id,m.x,m.y,m.pet,m.at]),S.homeCare?.cleanedMesses||{}], S.inv || {}, S.wp, S.fl, S.view, S.avatar || null,
    (S.music?.list || []).filter(e=>!e.builtin&&e.id!=='yt_nook'), (S.todos || []).map(t => [t.t, t.done ? 1 : 0]), (S.memos || []).map(m => [m.text,m.w,m.h,m.pin]), pets.map(p => [p.id, p.sp, p.name, p.bond || 0, p.blv || 0, p.lv || 0, p.xp || 0, p.home ? 1 : 0])]));
}
function makeStamp(S, rev) { return { rev, fp: progressKey(S), base: progressBase(S), dev: DEVICE_ID, at: Date.now() }; }
// real progress made on this device since its stamp (no stamp: an older version's save, treated as unknown)
function workSince(S) { return !S.pv || S.pv.fp !== progressKey(S); }
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
  active() { return !!this.uid() && !this.paused && (this.mode === 'firebase' ? !!this.fb : !!this.ref) && !['choose', 'loading', 'paused'].includes(this.status) && Game.S.owner === this.uid(); },

  async init() {
    if (window.NOOK_ENV === 'artifact') return this.initClaude();
    this.mode = 'firebase';
    if (!this.configured()) return this.set('unconfigured');
    this.set('loading');
    try { this.fb = await loadFirebase(window.NOOK_FIREBASE); }
    catch (e) { console.warn('[cloud]', e); return this.set('error', e && e.code ? cloudErr(e) : I18n.s("u_c90b464209b9")); }
    this.fb.onAuth(u => { this.onUser(u).catch(e => { this.authBusy = false; this.set('error', cloudErr(e)); }); });
    // Consume an old redirect result too, without making normal popup login wait for it.
    if (this.fb.redirectResult) this.fb.redirectResult().then(result => {
      if (result && result.user && (!this.user || this.user.uid !== result.user.uid)) return this.onUser(result.user);
    }).catch(e => { const m = cloudErr(e); if (m) { this.form.msg = m; UI.refresh('account'); } });
    // coming back after a while counts as opening the game again: this device takes over; a short look away only checks
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.hiddenAt = Date.now(); return; }
      const away = this.hiddenAt ? Date.now() - this.hiddenAt : 0; this.hiddenAt = 0;
      if (!this.user || this.mode !== 'firebase') return;
      if (away >= TAKEOVER_AWAY_MS) return this.resume(true);
      if (this.paused) return;
      this.checkSession(SESSION_FOCUS_MS).then(ok => { if (ok) this.pull(); });
    });
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
      this.user = { uid: 'claude:' + id, email: '', name: I18n.s("u_41a7c8f01af3"), provider: 'claude' };
      this.ref = db.doc('data/users/' + id + '/save'); this.bref = db.doc('data/users/' + id + '/backup');
      const snap = await this.ref.get();
      const raw = snap.exists ? (snap.data() || {}) : null, remote = raw ? raw.state : null; this.rev = raw ? (raw.rev || 0) : 0;
      if (remote && (raw.schema || remote.schema || 1) > SAVE_SCHEMA) return this.tooNew();
      await this.reconcile(remote && remote.v === 1 ? JSON.parse(JSON.stringify(remote)) : null);
    } catch (e) { console.warn('[cloud]', e); this.ref = null; this.set('off'); }
  },

  // ---------- Firebase ----------
  async onUser(u) {
    if (u && this.user && this.user.uid === u.uid && !['signedout', 'error'].includes(this.status)) return;
    this.authBusy = false;
    if (!u) { this.stopWatch(); this.paused = false; this.user = null; this.choice = null; UI.closeWin('cloudpick'); if (typeof Lights !== 'undefined') Lights.unpause(); return this.set('signedout'); }
    const prov = ((u.providerData || [])[0] || {}).providerId || 'password';
    this.user = { uid: u.uid, email: u.email || '', name: u.displayName || '', provider: prov };
    this.set('loading', ''); this.explicitAuth = false;
    // the device opened last takes over: the other one is paused and first uploads what it has not saved yet
    await this.claimSession(true);
    let remote;
    try { remote = await this.fb.get(u.uid); } catch (e) { return this.set('error', cloudErr(e)); }
    this.rev = remote ? (remote.rev || 0) : 0;
    if (remote && (remote.schema || 1) > SAVE_SCHEMA) return this.tooNew();
    await this.reconcile(this.parse(remote));
    this.watchSession();
  },
  // ---------- one device per account: the device opened last takes over, the others are paused ----------
  sessKey(uid) { return 'pocketnook.sess.' + uid; },
  mySid(uid) { try { return localStorage.getItem(this.sessKey(uid)) || ''; } catch (e) { return this.sid || ''; } },
  // handoff: when another device held the session, wait (up to HANDOFF_MS) for it to upload its unsaved progress
  async claimSession(handoff) {
    if (!this.fb || !this.fb.store || !this.user) return;
    const uid = this.user.uid; let prev = null;
    if (handoff) { try { prev = await this.fb.store.get('sess/' + uid); } catch (e) { } }
    let before = null; if (prev && prev.device !== DEVICE_ID) { try { const d = await this.fb.get(uid); before = d ? (d.rev || 0) : 0; } catch (e) { } }
    const sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    try { await this.fb.store.set('sess/' + uid, { sid, device: DEVICE_ID, at: '__now__' }); this.sid = sid; this.sessAt = Date.now(); try { localStorage.setItem(this.sessKey(uid), sid); } catch (e) { } }
    catch (e) { this.sid = ''; return; }   // rules not deployed yet: no single-device check
    if (before !== null) await this.awaitUpload(uid, before);
  },
  awaitUpload(uid, before) {
    return new Promise(res => {
      let done = false, stop = null, poll = null;
      const end = () => { if (done) return; done = true; clearTimeout(tm); clearInterval(poll); try { stop && stop(); } catch (e) { } res(); };
      const seen = d => { if (d && (d.rev || 0) > before) setTimeout(end, 150); };
      const tm = setTimeout(end, HANDOFF_MS);
      if (this.fb.watchSave) stop = this.fb.watchSave(uid, seen);
      else poll = setInterval(() => this.fb.get(uid).then(seen).catch(() => { }), 700);
    });
  },
  // live: another device taking over is noticed within a second (one small read per takeover)
  watchSession() {
    if (this.unwatch || this.mode !== 'firebase' || !this.fb || !this.fb.store || !this.fb.store.watch || !this.user || !this.sid) return;
    const uid = this.user.uid;
    this.unwatch = this.fb.store.watch('sess/' + uid, doc => { if (doc && doc.sid && this.sid && doc.sid !== this.sid && this.user && this.user.uid === uid) this.pauseForOther(); });
  },
  stopWatch() { if (this.unwatch) { try { this.unwatch(); } catch (e) { } this.unwatch = null; } },
  // false when another device has taken over since (this device is then paused)
  async checkSession(gap = SESSION_CHECK_MS) {
    if (this.mode !== 'firebase' || !this.fb || !this.fb.store || !this.user || this.paused) return !this.paused;
    const uid = this.user.uid, mine = this.sid || this.mySid(uid); if (!mine) return true;
    if (Date.now() - (this.sessAt || 0) < gap) return true;
    this.sessAt = Date.now();
    let doc = null; try { doc = await this.fb.store.get('sess/' + uid); } catch (e) { return true; }
    if (!doc) { await this.claimSession(); return true; }
    if (doc.sid === mine) { this.sid = mine; return true; }
    await this.pauseForOther(); return false;
  },
  // another device opened the game: hand over what this one has not uploaded, then turn the lights off here
  async pauseForOther() {
    if (this.paused) return; this.paused = true;
    clearTimeout(this.timer); this.timer = null; this.pending = false;
    const S = Game.S;
    if (this.uid() && S.owner === this.uid() && !Game.outdated && (this.dirty || workSince(S) || (this.lastHash && saveHash(JSON.stringify(S)) !== this.lastHash))) {
      try { Game.save(); await this.writeRemote(S); this.dirty = false; }
      catch (e) {
        try { await Backups.put(S, I18n.s("u_d58cd6e37d3e"), 'device'); } catch (e2) { }
        // the cloud moved on while this device was offline: combine both instead of dropping this device's progress
        if (e && e.code === 'conflict') { try { await this.onConflict(e); } catch (e3) { } }
      }
    }
    this.sid = ''; this.set('paused', '');
    if (typeof Lights !== 'undefined') Lights.pause(); else UI.toast(I18n.s("u_e53de39cedb5"), 'i_cloud', 6, { label: I18n.s("u_63ace269c7ba"), fn: () => this.resume() });
  },
  // "continue here": take the session back and start from the newest cloud progress
  async resume(auto) {
    if (!this.user || this.mode !== 'firebase' || this.resuming) return;
    this.resuming = true;
    try {
      if (auto && !this.paused) {
        // still the device in use: just catch up; otherwise take over quietly (this device uploaded when it was hidden)
        let doc = null; try { doc = await this.fb.store.get('sess/' + this.user.uid); } catch (e) { return; }
        const mine = this.sid || this.mySid(this.user.uid);
        if (!doc || !mine || doc.sid === mine) { await this.pull(true); return; }
        this.paused = true; clearTimeout(this.timer); this.timer = null; this.sid = '';
      }
      if (typeof Lights !== 'undefined') Lights.resuming();
      await this.claimSession(true);
      const doc = await this.fb.get(this.user.uid), rs = this.parse(doc);
      if (doc && (doc.schema || 1) > SAVE_SCHEMA) return this.tooNew();
      this.paused = false; this.rev = doc ? (doc.rev || 0) : 0;
      // nothing was played here while paused: the cloud is the progress to continue from
      if (rs) this.apply(rs, ''); else this.set('synced', '');
      this.watchSession();
      if (typeof Lights !== 'undefined') Lights.resumed();
    } catch (e) { this.set(this.paused ? 'paused' : 'error', cloudErr(e)); if (typeof Lights !== 'undefined' && this.paused) Lights.resumeFailed(); }
    finally { this.resuming = false; }
  },
  // which copy holds the newer progress: decided by the progress stamp, never by the clock
  lineage(L, rs) {
    const remoteRev = this.rev || 0, meta = syncMeta(this.uid());
    const lr = L.pv ? L.pv.rev : meta ? meta.rev : -1;
    const worked = L.pv ? workSince(L) : meta ? saveSignature(L) !== meta.sig : true;
    // the cloud holds exactly this progress already (this device's own upload): nothing to combine
    if (remoteRev >= lr && rs && rs.pv && rs.pv.fp === progressKey(L)) return remoteRev === lr ? 'same' : 'cloud';
    if (remoteRev > lr) return worked ? 'merge' : 'cloud';
    if (remoteRev === lr) return worked ? 'local' : 'same';
    return 'local';
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
      if (rs && isFreshSave(L) && this.remoteHasProgress && !(L.flags && L.flags.resetAt)) return this.apply(rs, I18n.s("u_982d7f8bf88f"));
      if (rs) {
        const how = this.lineage(L, rs);
        if (how === 'cloud') return this.apply(rs, (rs.pv && rs.pv.dev && rs.pv.dev !== DEVICE_ID) ? I18n.s("u_fdb4fca83832") : '');
        // both sides moved on (this device played offline, or an older version): combine them, the cloud's room and tasks are kept
        if (how === 'merge') return this.onConflict({ remote: rs, rev: this.rev || 0 });
        if (how === 'same') { this.set('synced'); this.lastSync = Date.now(); this.lastHash = saveHash(JSON.stringify(L)); return; }
      }
      this.set('synced'); this.lastSync = Date.now(); this.dirty = true; return this.flush();
    }
    // 2. nothing worth keeping on this device: take the cloud save, or start a new cloud save if there is none
    if (isFreshSave(L)) {
      if (rs) return this.apply(rs, I18n.s("u_47b967cba2df"));
      try { await this.commit(Game.newState(), { mode: 'new', from: 'none' }); UI.toast(I18n.s("u_df41bc198524"), 'i_cloud'); } catch (e) { this.set('error', cloudErr(e)); }
      return;
    }
    // 3. this device holds another account's progress (session ended without signing out): keep it as a backup, never mix accounts
    if (L.owner && L.owner !== uid) {
      await Backups.put(L, I18n.s("u_96360ed9dad1"), 'device');
      if (rs) return this.apply(rs, I18n.s("u_0d7033eaeaf7"));
      try { await this.commit(Game.newState(), { mode: 'new', from: 'none' }); UI.toast(I18n.s("u_17d6566a78ab"), 'i_cloud', 5); } catch (e) { this.set('error', cloudErr(e)); }
      return;
    }
    // 4. saves from before accounts existed (older version kept device and cloud in sync): identical progress means it is the same save
    if (rs && !rs.owner) { const x = saveSummary(L), y = saveSummary(rs), same = ['lvl', 'xp', 'coins', 'words', 'seen', 'items', 'focus', 'pets'].every(k => x[k] === y[k]);
      if (same) { const newer = (L.savedAt || 0) >= (rs.savedAt || 0) ? L : rs; setImportMark(uid, { at: Date.now(), fp: Game.loadedFp || '', mode: 'linked' }); const st = JSON.parse(JSON.stringify(newer)); st.sync = Object.assign({}, st.sync, { mode: 'kept-cloud', at: Date.now(), device: DEVICE_ID }); return this.apply(st, I18n.s("u_5f5c01df6dae")); } }
    // 5. guest / older-version progress on this device: ask once
    const mark = importMarks()[uid];
    if (mark && mark.fp === Game.loadedFp && rs) return this.apply(rs, I18n.s("u_d3a1cd77c06a"));
    this.choice = { mode: rs ? 'conflict' : 'import', remote: rs, local: L, localSum: saveSummary(L, true), remoteSum: rs ? saveSummary(rs) : null, localSavedAt: Game.loadedSavedAt || L.savedAt, sel: rs ? 'cloud' : 'import' };
    this.set('choose'); UI.openWin('cloudpick');
  },
  devBlocked() { return false; },   // developer-mode saves are never blocked
  async writeRemote(S) {
    const rev = (this.rev || 0) + 1, pv = makeStamp(S, rev), data = JSON.stringify(Object.assign({}, S, { pv }));
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
    S.pv = pv; this.rev = rev; this.lastHash = saveHash(JSON.stringify(S)); this.lastWriteAt = Date.now(); this.common = progressBase(S);
    // keep the stamp on this device right away (a reload must not mistake this copy for an older one)
    if (S === Game.S) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
    syncMeta(this.uid(), { rev, at: Date.now(), base: this.common, sig: saveSignature(S) });
  },
  async backupRemote(S, reason) {
    const rec = { v: 1, at: Date.now(), reason, device: DEVICE_ID, savedAt: S.savedAt || 0, lvl: S.lvl || 1, coins: S.coins || 0, data: JSON.stringify(S) };
    if (this.mode === 'firebase') { if (this.fb.backup) await this.fb.backup(this.user.uid, rec); }
    else if (this.bref) await this.bref.set({ state: JSON.parse(JSON.stringify(S)), at: rec.at, reason });
  },
  // write a new account save: back up first, write to the cloud, and only after that replace this device's save
  async commit(S2, meta, noMark) {
    const uid = this.uid(); S2 = JSON.parse(JSON.stringify(S2)); if (Game.S && Game.S.seenIntro) S2.seenIntro = true;
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
    Game.outdated = true; this.set('outdated', I18n.s("u_b8a7a6f41bd6"));
    UI.toast(I18n.s("u_285364f25b58"), 'i_cloud', 8, { label: I18n.s("u_5f451c71b46a"), fn: () => location.reload() });
  },
  // another device saved this account in the meantime (rev moved on): merge by the fixed rules, back up both sides first
  async onConflict(e, depth = 0) {
    this.rev = e.rev;
    if (!e.remote) return this.set('error', I18n.s("u_84016a252383"));
    if ((e.remote.schema || 1) > SAVE_SCHEMA) return this.tooNew();
    const L = JSON.parse(JSON.stringify(Game.S));
    // what both copies grew from: the stamp in this device's save (same cloud version as the base the cloud copy came from)
    const common = L.pv && L.pv.base && L.pv.rev <= e.rev ? L.pv.base : this.common;
    try {
      await Backups.put(L, I18n.s("u_93e730d3eb26"), 'device');
      await this.backupRemote(e.remote, I18n.s("u_7ee1740add75"));
      await this.commit(mergeSaves(e.remote, L, common, true), { mode: 'merge-concurrent', from: 'device+cloud', dev: !!((L.flags || {}).dev || (e.remote.flags || {}).dev) }, true);
      UI.toast(I18n.s("u_c68fd2a05b72"), 'i_cloud', 5);
    } catch (err) {
      if (err && err.code === 'conflict' && depth < 2) return this.onConflict(err, depth + 1);
      this.set('error', cloudErr(err));
    }
  },
  apply(rs, msg) {
    rs = JSON.parse(JSON.stringify(rs)); rs.owner = this.uid(); this.status = 'synced'; if (Game.S && Game.S.seenIntro) rs.seenIntro = true;
    rs.pv = makeStamp(rs, this.rev || 0);   // this progress is exactly the cloud version just read
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
      if (!c.backedUp) await Backups.put(c.local, which === 'cloud' ? I18n.s("u_a3058f390536") : which === 'fresh' ? I18n.s("u_89b1294baee3") : I18n.s("u_b15730e57d6e"), 'device');
      c.backedUp = true;
      if (which === 'cloud') { setImportMark(uid, { at: Date.now(), fp: Game.loadedFp || '', mode: 'kept-cloud' }); this.apply(c.remote, I18n.s("u_02644727cb93")); }
      else if (which === 'fresh') { await this.commit(Game.newState(), { mode: 'declined', from: 'device' }); UI.toast(I18n.s("u_e56ed3faa805"), 'i_cloud', 4.5); }
      else if (which === 'import') { await this.commit(c.local, { mode: 'import', from: 'device', srcSavedAt: c.localSavedAt, dev: devSrc }); UI.toast(I18n.s("u_306ea7cc6859"), 'i_cloud', 4); }
      else {
        if (c.remote) await this.backupRemote(c.remote, which === 'local' ? I18n.s("u_446febc8f3b0") : I18n.s("u_a05d72c79ea4"));
        if (which === 'local') { await this.commit(c.local, { mode: 'replace-cloud', from: 'device', srcSavedAt: c.localSavedAt, dev: devSrc }); UI.toast(I18n.s("u_de397784421a"), 'i_cloud', 4.5); }
        else { await this.commit(mergeSaves(c.remote, c.local), { mode: 'merge', from: 'device+cloud', srcSavedAt: c.localSavedAt, dev: devSrc || !!(c.remote.flags && c.remote.flags.dev) }); UI.toast(I18n.s("u_e7694336e009"), 'i_cloud', 4.5); }
      }
      this.choice = null; this.working = false; UI.closeWin('cloudpick');
    } catch (e) {
      console.warn('[cloud] migrate', e); this.working = false; this.status = 'choose';
      this.err = I18n.s("u_32e721709377") + cloudErr(e); UI.refresh('cloudpick'); UI.cloudChip();
    }
  },
  async restoreBackup(S, label) {
    if (!this.uid()) { Dev && Dev.on ? Dev.act(I18n.s("u_9df01cd68b95"), () => Game.replaceState(S)) : Game.replaceState(S); return UI.toast(I18n.s("u_8144cb99ff00"), 'i_reset'); }
    if (!confirm(I18n.s("u_a8a6b334efac", [label]))) return;
    try {
      await Backups.put(Game.S, I18n.s("u_c10a0c1fe750"), 'device'); await this.backupRemote(Game.S, I18n.s("u_9f371de9e4ed"));
      await this.commit(S, { mode: 'restore', from: 'backup', srcSavedAt: S.savedAt, dev: !!(S.flags && S.flags.dev) });
      UI.toast(I18n.s("u_9d15033c0e86"), 'i_reset', 3);
    } catch (e) { this.set('error', cloudErr(e)); }
  },
  async push() {
    if (!this.active() || Game.outdated) return;
    if (this.busy) { this.pending = true; return; }
    const S = Game.S;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.set('offline', ''); return; }
    if (this.lastHash && saveHash(JSON.stringify(S)) === this.lastHash) { if (this.status !== 'synced') this.set('synced', ''); return; }
    // safety net: never let a blank save replace real progress in the cloud unless the player reset on purpose
    if (isFreshSave(S) && this.remoteHasProgress && !(S.flags && S.flags.resetAt)) { this.set('error', I18n.s("u_31037521f9df")); return; }
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
  async pull(force) {
    if (this.mode !== 'firebase' || !this.active() || this.busy || (!force && Date.now() - this.lastPull < CLOUD_PULL_MS)) return; this.lastPull = Date.now();
    try {
      const doc = await this.fb.get(this.user.uid), rs = this.parse(doc);
      if (!doc || (doc.rev || 0) <= (this.rev || 0)) return;
      if ((doc.schema || 1) > SAVE_SCHEMA) return this.tooNew();
      if (!rs) return;
      this.rev = doc.rev || 0;
      if (this.lineage(Game.S, rs) === 'merge') this.onConflict({ remote: rs, rev: this.rev });
      else this.apply(rs, I18n.s("u_81cb1a0f23a7"));
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
    if (kind !== 'google' && !f.email) { f.msg = I18n.s("u_a3c575d5c84b"); return UI.refresh('account'); }
    if ((kind === 'in' || kind === 'up') && pw.length < 6) { f.msg = I18n.s("u_acd3482a8732"); return UI.refresh('account'); }
    this.authBusy = true; this.err = ''; this.explicitAuth = kind !== 'reset'; UI.refresh('account');
    try {
      let result;
      if (kind === 'google') result = await this.fb.google();
      else if (kind === 'in') result = await this.fb.signIn(f.email, pw);
      else if (kind === 'up') result = await this.fb.signUp(f.email, pw);
      else if (kind === 'reset') { await this.fb.reset(f.email); f.msg = I18n.s("u_718be77f4134"); this.authBusy = false; }
      if (kind !== 'reset') {
        if (result && result.user && (!this.user || this.user.uid !== result.user.uid)) await this.onUser(result.user);
        if (!this.user) throw { code: 'auth/no-current-user' };
        this.authBusy = false;
      }
    } catch (e) { this.authBusy = false; f.msg = cloudErr(e); }
    UI.refresh('account');
  },
  async signOut() {
    if (!this.user) return;
    if (this.mode === 'claude') return;
    if (Game.S.owner === this.user.uid) { Game.save(); await this.push(); }
    if (this.status === 'error') { if (!confirm(I18n.s("u_76c423c6c991"))) return; }
    try { localStorage.removeItem(this.sessKey(this.user.uid)); } catch (e) { }
    this.stopWatch();
    try { await this.fb.signOut(); } catch (e) { }
    this.user = null; this.choice = null; this.sid = '';
    Game.replaceState(Game.newState());
    this.set('signedout', '');
    UI.toast(I18n.s("u_d17e88e9e120"), 'i_cloud');
  },
};

// ---------------- UI ----------------
Object.assign(UI.WIN, {
  account: { t: I18n.s("u_6eaf4d04daf1"), i: 'i_cloud', w: 420, at: ['r', 0] },
  cloudpick: { t: I18n.s("u_d09a287ac706"), i: 'i_cloud', w: 560, at: ['c', 0], modal: true, noclose: true },
});
UI.cloudChip = function () {
  const el = this.el && this.el.cloud; if (!el) return;
  const c = Cloud, st = c.status; let t = '', tip = '';
  if (c.mode === 'claude' && st === 'choose') { t = I18n.s("u_c836543ad625"); tip = I18n.s("u_856c08959ddf"); }
  else if (c.mode === 'claude') { tip = st === 'synced' ? I18n.s("u_14237b4957b6") : I18n.s("u_19fb673bb74e"); }
  else if (st === 'unconfigured') { tip = I18n.s("u_fce4fd133e6f"); }
  else if (st === 'signedout') { t = I18n.s("u_92fc480bee59"); tip = I18n.s("u_2a859e7e04fb"); }
  else if (st === 'loading') { tip = I18n.s("u_429d44d10399"); }
  else if (st === 'saving') { tip = I18n.s("u_50fb57f603e3"); }
  else if (st === 'synced') { tip = I18n.s("u_eaa7dbba116c") + (c.user ? c.user.email || c.user.name : '') + '）'; }
  else if (st === 'choose') { t = I18n.s("u_c836543ad625"); tip = I18n.s("u_856c08959ddf"); }
  else if (st === 'error') { tip = c.err || I18n.s("u_b11b528a7214"); }
  else if (st === 'offline') { tip = I18n.s("u_b8734dc53f53"); }
  else if (st === 'outdated') { t = I18n.s("u_f6df668fd43a"); tip = c.err; }
  else if (st === 'paused') { t = I18n.s("u_cb3d772c4a36"); tip = I18n.s("u_7b7075f3f090"); }
  el.dataset.st = c.mode === 'claude' && st === 'synced' ? 'synced' : st;
  el.querySelector('.cl-t').textContent = t; el.classList.toggle('icon-only', !t);
  el.title = tip; el.setAttribute('aria-label', I18n.s("u_a92e2e3e77bd") + tip);
};
UI.w_account = function () {
  const c = Cloud, f = c.form, out = [];
  const status = (txt, cls) => h('p', { class: 'cl-status ' + (cls || '') }, h('i', { class: 'cl-dot', 'data-st': cls || c.status }), h('span', { text: txt }));
  out.push(UI.nameField()); if (typeof Social !== 'undefined' && Social.enabled()) out.push(UI.statusField());
  if (c.mode === 'claude' || window.NOOK_ENV === 'artifact') {
    out.push(status(c.status === 'synced' ? I18n.s("u_949af61ceb85") : c.status === 'loading' ? I18n.s("u_429d44d10399") : I18n.s("u_fd8fd2f71bc9"), c.status === 'synced' ? 'synced' : c.status));
    out.push(h('p', { class: 'hint', text: I18n.s("u_3764f023e98d") }));
    if (c.lastSync) out.push(h('p', { class: 'hint', text: I18n.s("u_d3642789ee37") + agoText(c.lastSync) }));
    if (c.status === 'choose') out.push(h('button', { class: 'chip primary', onclick: () => UI.openWin('cloudpick') }, I18n.s("u_ec91c0388651")));
    out.push(...UI.backupSection());
    return out;
  }
  if (c.status === 'unconfigured') {
    out.push(status(I18n.s("u_da7c3b93e5aa"), 'off'));
    out.push(h('p', { class: 'hint', text: I18n.s("u_4068ed0bb3af") }));
    return out;
  }
  if (c.status === 'loading' && !c.user) { out.push(status(I18n.s("u_429d44d10399"), 'loading')); return out; }
  if (c.status === 'error' && !c.fb) { out.push(status(I18n.s("u_042887d69946"), 'error'), h('p', { class: 'cl-msg', text: c.err }), h('button', { class: 'chip primary', onclick: () => c.init() }, I18n.s("u_4d71f06e3db3"))); return out; }
  if (c.fb && c.fb.persistence === 'session') out.push(h('p', { class: 'hint', text: I18n.s("u_7154b12b06fb") }));
  if (!c.user) {
    out.push(h('p', { class: 'hint', text: I18n.s("u_d792bbca3cce") }));
    out.push(h('button', { class: 'chip big primary cl-google', disabled: c.authBusy, onclick: () => c.auth('google') }, ico('i_key', 22), I18n.s("u_f2a23af75b5a")));
    out.push(h('div', { class: 'cl-or' }, h('span', { text: I18n.s("u_6bb07915b6aa") })));
    out.push(h('div', { class: 'tabs' }, ...[['in', I18n.s("u_92fc480bee59")], ['up', I18n.s("u_932431bff183")], ['reset', I18n.s("u_cdef206d6e89")]].map(([k, l]) => h('button', { class: 'tab' + (f.tab === k ? ' on' : ''), onclick: () => { f.email = (document.getElementById('cl-email') || {}).value || f.email; f.tab = k; f.msg = ''; UI.refresh('account'); } }, l))));
    const submit = () => c.auth(f.tab);
    const em = h('input', { id: 'cl-email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com', value: f.email, 'aria-label': 'Email', onkeydown: e => { if (e.key === 'Enter') submit(); } });
    out.push(h('label', { class: 'field' }, h('span', { text: 'Email' }), h('div', { class: 'inset grow' }, em)));
    if (f.tab !== 'reset') {
      const pw = h('input', { id: 'cl-pw', type: 'password', autocomplete: f.tab === 'up' ? 'new-password' : 'current-password', placeholder: f.tab === 'up' ? I18n.s("u_922ad57febef") : I18n.s("u_ef8b49458c14"), 'aria-label': I18n.s("u_ef8b49458c14"), onkeydown: e => { if (e.key === 'Enter') submit(); } });
      out.push(h('label', { class: 'field' }, h('span', { text: I18n.s("u_ef8b49458c14") }), h('div', { class: 'inset grow' }, pw)));
    }
    out.push(h('button', { class: 'chip primary', disabled: c.authBusy, onclick: submit }, ico('i_mail', 20), c.authBusy ? I18n.s("u_d166e71ff3ae") : f.tab === 'in' ? I18n.s("u_92fc480bee59") : f.tab === 'up' ? I18n.s("u_ce88047c8109") : I18n.s("u_397bd4ecbf3d")));
    if (f.msg) out.push(h('p', { class: 'cl-msg', role: 'status', text: f.msg }));
    if (c.err) out.push(h('p', { class: 'cl-msg', role: 'status', text: c.err }));
    out.push(h('p', { class: 'hint', text: I18n.s("u_4854fe90575b") }));
    return out;
  }
  const u = c.user, provName = u.provider === 'google.com' ? I18n.s("u_d1ab5d5544a2") : I18n.s("u_1f1a88281a97");
  const stText = { loading: I18n.s("u_957c550bdc53"), saving: I18n.s("u_00190ad393a3"), synced: I18n.s("u_aa7e8f4a2b8d") + agoText(c.lastSync), choose: I18n.s("u_01a4a674ad4f"), error: I18n.s("u_449405c514b7"), offline: I18n.s("u_cc2c5f9e26d0"), outdated: I18n.s("u_52c77df3b77a"), paused: I18n.s("u_c80a566801a4") }[c.status] || '';
  out.push(h('div', { class: 'cl-user' }, ico('i_cloud', 32), h('div', { class: 'grow' }, h('b', { text: u.name || u.email || I18n.s("u_c42a66e27201") }), h('div', { class: 'hint', text: provName + (u.name && u.email ? ' · ' + u.email : '') }))));
  out.push(status(stText));
  if (c.status === 'paused') out.push(h('button', { class: 'chip primary', onclick: () => c.resume() }, ico('i_cloud', 20), I18n.s("u_63ace269c7ba")));
  // the progress number only ever goes up; the copy with the bigger number is the newer progress
  if (Game.S.pv && c.status !== 'paused') out.push(h('p', { class: 'hint', text: I18n.s("u_bcda2ad97dcc", [Game.S.pv.rev]) }));
  if (c.err) out.push(h('p', { class: 'cl-msg', role: 'status', text: c.err }));
  out.push(h('p', { class: 'hint', text: I18n.s("u_fb1e52d0730f") }));
  out.push(h('div', { class: 'row wrap' },
    h('button', { class: 'chip', disabled: c.status === 'saving' || c.status === 'choose', onclick: () => { Game.save(); c.flush(); } }, ico('i_reset', 20), I18n.s("u_36e7a43a1c67")),
    c.status === 'choose' ? h('button', { class: 'chip primary', onclick: () => UI.openWin('cloudpick') }, I18n.s("u_c836543ad625")) : null,
    h('button', { class: 'chip', onclick: () => c.signOut() }, I18n.s("u_057f31bc16c8"))));
  out.push(...UI.backupSection());
  return out;
};
Cloud.selfTest = async function () {
  if (this.testing) return; this.testing = true; UI.refresh('account'); const res = [], add = (name, ok, detail, warn) => res.push({ name, ok, detail, warn });
  const cfg = window.NOOK_FIREBASE || {}, uid = this.user && this.user.uid;
  add(I18n.s("u_caedbf2763ef"), !!(cfg.apiKey && cfg.appId && cfg.projectId && cfg.messagingSenderId), `projectId：${cfg.projectId || I18n.s("u_cda3ac17e609")}`);
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  add(I18n.s("u_5654a6d76c62"), secure, I18n.s("u_a2f97d85f07c", [location.protocol, location.host]));
  add(I18n.s("u_8eebeeabe35a"), !!this.fb, `firebasejs ${FIREBASE_SDK}`);
  add(I18n.s("u_164e4951221f"), !!uid, uid ? `UID：${uid.slice(0, 6)}…（${this.user.email || this.user.provider}）` : '');
  const expectDenied = async (name, fn) => { try { await fn(); add(name, false, I18n.s("u_3d9bff0c4645")); return false; } catch (e) { const ok = e && e.code === 'permission-denied'; add(name, ok, ok ? I18n.s("u_0571ba4b0fa0") : I18n.s("u_f78e031368d5") + cloudErr(e)); return ok; } };
  if (uid && this.fb) {
    try { const d = await this.fb.get(uid); add(I18n.s("u_b8eb8eb708d3", [uid.slice(0, 6)]), true, d ? I18n.s("u_be92ab3fa1e1", [d.schema || 1, d.rev || 0, Math.round((d.data || '').length / 1024)]) : I18n.s("u_b4f74d8df740")); }
    catch (e) { add(I18n.s("u_5190fa6625b0"), false, cloudErr(e)); }
    if (this.fb.probe) {
      await expectDenied(I18n.s("u_8e5af561bbfc"), () => this.fb.probe.getOther());
      await expectDenied(I18n.s("u_c5a46ba66c29"), () => this.fb.probe.listAll());
      const okBad = await expectDenied(I18n.s("u_b54327f92aa3"), async () => { const id = await this.fb.probe.badWrite(uid); try { await this.fb.probe.delBackup(uid, id); } catch (e) { } });
      try { await this.fb.backups(uid); add(I18n.s("u_2b44ed37b8c0"), true, ''); } catch (e) { add(I18n.s("u_2b44ed37b8c0"), false, cloudErr(e)); }
    }
  }
  const size = JSON.stringify(Game.S).length; add(I18n.s("u_c9820b1c808b"), size < 880000, I18n.s("u_3500d1edaa5a", [Math.round(size / 1024)]));
  add(I18n.s("u_17378e9a477b"), !Game.outdated, I18n.s("u_68745d9681f7", [Game.S.schema, SAVE_SCHEMA, this.rev || 0]));
  add(I18n.s("u_845074de34c9"), true, I18n.s("u_ca0e7f894375"), true);
  this.testRes = res; this.testing = false; UI.refresh('account');
};
const SYNC_MODES = { 'merge-concurrent': I18n.s("u_3c2907336f33"), new: I18n.s("u_26e16a71020d"), import: I18n.s("u_cfb1c4d0a751"), declined: I18n.s("u_14fc53ed8fd2"), 'replace-cloud': I18n.s("u_977da1e59c5b"), merge: I18n.s("u_575bb29f9c86"), restore: I18n.s("u_1956fe6d42b2"), 'kept-cloud': I18n.s("u_58812ffd742d") };
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
  out.push(h('div', { class: 'sub', text: I18n.s("u_c908bb5a6754") }));
  out.push(h('p', { class: 'hint', text: sy && sy.mode ? I18n.s("u_6898c6f3c762", [SYNC_MODES[sy.mode] || sy.mode, saveDate(sy.at)]) + (sy.srcSavedAt ? I18n.s("u_548fd51c43be", [saveDate(sy.srcSavedAt)]) : '') : I18n.s("u_2a63d48f7a2e") }));
  const row = (b, label, fn) => h('div', { class: 'devh' }, h('div', { class: 'grow' }, h('div', { text: b.reason || I18n.s("u_7811b9a40d7c") }), h('div', { class: 'hint num', text: I18n.s("u_48ec332cf4fb", [saveDate(b.at), b.lvl || (b.sum || {}).lvl || 1, (b.coins != null ? b.coins : (b.sum || {}).coins) || 0]) + (b.sum ? I18n.s("u_43d5229678b0", [b.sum.words]) : '') })), h('button', { class: 'chip sm', onclick: fn }, label));
  const loc = c.bk.local.slice(0, 6), cl = c.bk.cloud.slice(0, 6);
  if (loc.length) out.push(h('div', { class: 'hint', text: I18n.s("u_707fa2f50010") }), h('div', { class: 'devhist' }, ...loc.map(b => row(b, I18n.s("u_c07fb8c4d3e4"), () => c.restoreBackup(JSON.parse(b.json), b.reason)))));
  if (cl.length) out.push(h('div', { class: 'hint', text: I18n.s("u_36832926e803") }), h('div', { class: 'devhist' }, ...cl.map(b => row(b, I18n.s("u_c07fb8c4d3e4"), () => { const st = b.state || JSON.parse(b.data); c.restoreBackup(st, b.reason); }))));
  if (!c.bk.cloudLoaded && c.uid()) out.push(h('button', { class: 'chip sm', onclick: () => c.loadBackups(true) }, I18n.s("u_bc868c22f1c3")));
  if (!loc.length && !cl.length) out.push(h('p', { class: 'hint', text: I18n.s("u_16f2a0272d9c") }));
  if (c.mode === 'firebase' && c.uid()) {
    out.push(h('div', { class: 'sub', text: I18n.s("u_6a7ad373067e") }), h('p', { class: 'hint', text: I18n.s("u_187767a96e71") }),
      h('button', { class: 'chip sm', disabled: c.testing, onclick: () => c.selfTest() }, c.testing ? I18n.s("u_4e592d9d3638") : I18n.s("u_6b41b6dafe4a")));
    if (c.testRes) out.push(h('div', { class: 'devhist' }, ...c.testRes.map(r => h('div', { class: 'devh' }, h('b', { class: r.ok ? 'ok' : 'bad', text: r.ok ? I18n.s("u_dd55c6c25912") : r.warn ? I18n.s("u_4ffef8f3113a") : I18n.s("u_37d266e0ab12") }), h('div', { class: 'grow' }, h('div', { text: r.name }), h('div', { class: 'hint', text: r.detail || '' }))))));
  }
  return out;
};
UI.w_cloudpick = function () {
  const ch = Cloud.choice; if (!ch) return [];
  const pol = SAVE_POLICY(), blocked = Cloud.devBlocked(ch.localSum), busy = Cloud.working;
  const card = (sum, title, src, when, extra, on) => h('div', { class: 'cl-card' + (on ? ' on' : '') }, h('b', { text: title }),
    h('dl', { class: 'stats' }, h('dt', { text: I18n.s("u_c21db84c0653") }), h('dd', { text: src }), h('dt', { text: I18n.s("u_2cbced881b2d") }), h('dd', { class: 'num', text: saveDate(when) }),
      h('dt', { text: I18n.s("u_31b0f533e8db") }), h('dd', { class: 'num', text: `Lv ${sum.lvl}` }), h('dt', { text: I18n.s("u_ca5f4cb3273e") }), h('dd', { class: 'num', text: String(sum.coins) }),
      h('dt', { text: I18n.s("u_53a60ddde56e") }), h('dd', { class: 'num', text: I18n.s("u_2c8bb33a4b96", [sum.words, sum.seen]) }), h('dt', { text: I18n.s("u_5923e40773ec") }), h('dd', { class: 'num', text: I18n.s("u_1b502698618d", [sum.pets, sum.items]) }),
      h('dt', { text: I18n.s("u_2829735daebd") }), h('dd', { class: 'num', text: I18n.s("u_40a8f80e5512", [sum.focus]) })),
    extra);
  const tags = (sum) => h('div', { class: 'ptraits' }, sum.legacy ? h('span', { class: 'ptag', text: I18n.s("u_826bc359f396") }) : null);
  const out = [];
  const localCard = card(ch.localSum, I18n.s("u_893f68afda0b"), I18n.s("u_8a9af09df210"), ch.localSavedAt, tags(ch.localSum), ch.mode === 'import');
  if (ch.mode === 'import') {
    out.push(h('p', {}, I18n.s("u_b85e5aa65df8", [Cloud.user.email || Cloud.user.name])));
    out.push(h('div', { class: 'cl-cards one' }, localCard));
  } else {
    out.push(h('p', {}, I18n.s("u_8c26c2fab942")));
    out.push(h('div', { class: 'cl-cards' }, card(ch.remoteSum, I18n.s("u_19fb673bb74e"), Cloud.mode === 'claude' ? I18n.s("u_e5a320deabac") : I18n.s("u_bd1af157629c"), ch.remote.savedAt, tags(ch.remoteSum), false), localCard));
    const opt = (k, label, desc, dis) => h('label', { class: 'cl-opt' + (ch.sel === k ? ' on' : '') + (dis ? ' dis' : '') }, h('input', { type: 'radio', name: 'clpick', checked: ch.sel === k, disabled: dis, onchange: () => { ch.sel = k; UI.refresh('cloudpick'); } }), h('div', {}, h('b', { text: label }), h('div', { class: 'hint', text: desc })));
    out.push(h('div', { class: 'cl-opts' },
      opt('cloud', I18n.s("u_58812ffd742d"), I18n.s("u_370468efb5b2")),
      opt('merge', I18n.s("u_703e82ff8f7c"), I18n.s("u_adf5aba3dd6d"), blocked),
      opt('local', I18n.s("u_c7a279cba516"), I18n.s("u_de249216f750"), blocked)));
  }
  if (Cloud.err) out.push(h('p', { class: 'cl-msg', role: 'status', text: Cloud.err }));
  out.push(h('p', { class: 'hint', text: I18n.s("u_97baa33be915") }));
  if (ch.mode === 'import') out.push(h('div', { class: 'row wrap center' },
    h('button', { class: 'chip primary', disabled: busy || blocked, onclick: () => Cloud.pick('import') }, ico('i_cloud', 18), busy ? I18n.s("u_d166e71ff3ae") : I18n.s("u_bc6d637eb494")),
    h('button', { class: 'chip', disabled: busy, onclick: () => { if (confirm(I18n.s("u_aa8a6a6f7b6d"))) Cloud.pick('fresh'); } }, I18n.s("u_574322b386a6"))));
  else out.push(h('div', { class: 'row wrap center' }, h('button', { class: 'chip primary', disabled: busy, onclick: () => { if (ch.sel === 'local' && !confirm(I18n.s("u_bc693e1bb777"))) return; Cloud.pick(ch.sel); } }, busy ? I18n.s("u_d166e71ff3ae") : I18n.s("u_20db9f87b860"))));
  return out;
};
