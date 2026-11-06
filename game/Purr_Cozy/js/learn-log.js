/* 0.92.42 Purr Cozy: anonymous learning log.
   Records only learning behaviour: review cards, quiz answers (every learning entry: daily, practice, room needs,
   pet training, helping friends, story, team, challenges, level gates) and Meow Typo spelling.
   Nothing about furniture, pets, chat or the player's name / e-mail is recorded.

   - One document per learning session: learnlog/{logId}/lsess/{sessionId}
     logId is an anonymous Firebase account that exists only for this log (a second Firebase app instance),
     so it never touches the player's real login or cloud save. acct = the real account UID when signed in.
   - Sessions are queued in localStorage and uploaded in batches (finish, every 30 s, next launch), so nothing is
     lost offline and there is only one write per session.
   - Players can turn it off in Settings ("Share anonymous learning data"); the queue is then discarded.
   Field reference: docs/學習紀錄與分析-設定教學.md (section "資料欄位").
   0.92.45 adds, inside ans / rev / typo items only (no new top-level field, so firestore.rules need no change):
     gr = the word's estimated school grade 1-12 · ge = 1 when gap is estimated from the due day (older records), 0 when exact
     h (spelling hint) = 0 none · 1 first letter (the usual spelling question) · 2 masked letters (story labels); before this
     version the usual first-letter hint was logged as 0 too.
   0.92.46 adds kind 'grade' (sub 'first' | 'daily'): the grade placement. Its session carries pl = {m mode, t theta, se, n, r right,
     g grade 1-12, d declared grade (0 = none), p previous theta (-1 = none), mu / sd prior}; each answer's p is the placement model's
     prediction and gr the word's grade, so the backend can check item fit. */
const LearnLog = {
 V: 1, KEY: 'purr-cozy.learnlog.q', MAX_QUEUE: 300, BATCH: 20, APP: 'purr-learnlog',
 cur: null, typo: null, busy: false, db: null, F: null, lid: '', failed: 0, off: false,

 enabled() { return !this.off && typeof Game !== 'undefined' && Game.S && Game.S.settings && Game.S.settings.learnShare !== false && window.NOOK_ENV !== 'artifact' && !(typeof Visit !== 'undefined' && Visit.active); },
 id() { const a = new Uint8Array(10); crypto.getRandomValues(a); return Date.now().toString(36) + '-' + [...a].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 14); },
 acct() { try { return typeof Cloud !== 'undefined' && Cloud.mode === 'firebase' && Cloud.user ? String(Cloud.user.uid || '') : ''; } catch (e) { return ''; } },
 level(i) { return VOCAB[i] ? VOCAB[i].t : 0; },
 grade(i) { return VOCAB[i] && VOCAB[i].g ? VOCAB[i].g : 0; },
 word(i) { return VOCAB[i] ? VOCAB[i].w : ''; },

 // ---------- sessions ----------
 open(kind, sub) {
  return { v: this.V, id: this.id(), kind: String(kind || '').slice(0, 16), sub: String(sub ?? '').slice(0, 40), t0: Date.now(), t1: 0, dur: 0,
   done: false, stop: '', n: 0, right: 0, coins: 0, xp: 0, streak: 0, lv: Learn.levelsOn().join(''),
   app: (window.PURR_BUILD && PURR_BUILD.version) || '', lang: (typeof I18n !== 'undefined' && I18n.lang) || '', dev: (Game.S && Game.S.flags && Game.S.flags.tester ? 'test-' : '') + (typeof DEVICE_ID === 'string' ? DEVICE_ID.slice(0, 24) : ''),   // test accounts (0.92.48) are left out of the analysis by default
   ans: [], rev: [], typo: [] };
 },
 close(rec, how) {
  if (!rec || rec.t1) return; rec.t1 = Date.now(); rec.dur = rec.t1 - rec.t0; rec.stop = String(how || '').slice(0, 24);
  try { rec.streak = Learn.streakNow(); } catch (e) { }
  if (!rec.ans.length && !rec.rev.length && !rec.typo.length) return;   // opened and closed without learning anything
  if (this.enabled()) this.enqueue(rec);
 },
 stopOf(s) { if (!s) return 'gone'; return s.result ? 'result' : s.step === 'quiz' ? 'quiz@' + s.qi + '/' + (s.qs ? s.qs.length : 0) : s.step + '@' + s.ri + '/' + (s.words ? s.words.length : 0); },
 closeLearn(how) { const c = this.cur; if (!c) return; this.cur = null; this.close(c.rec, how || this.stopOf(c.s)); },

 // ---------- queue + upload ----------
 queue() { try { const q = JSON.parse(localStorage.getItem(this.KEY) || '[]'); return Array.isArray(q) ? q : []; } catch (e) { return []; } },
 store(q) { try { localStorage.setItem(this.KEY, JSON.stringify(q.slice(-this.MAX_QUEUE))); } catch (e) { } },
 enqueue(rec) { const q = this.queue(); q.push(rec); this.store(q); setTimeout(() => this.flush(), 1500); },
 async ready() {
  if (this.db) return true;
  const cfg = window.NOOK_FIREBASE; if (!cfg || !cfg.apiKey || !cfg.projectId) return false;
  const base = 'https://www.gstatic.com/firebasejs/' + (typeof FIREBASE_SDK === 'string' ? FIREBASE_SDK : '10.12.2') + '/';
  const [A, U, F] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => import(base + f)));
  const app = A.getApps().find(a => a.name === this.APP) || A.initializeApp(cfg, this.APP), auth = U.getAuth(app);
  if (auth.authStateReady) await auth.authStateReady(); else await new Promise(r => { const off = U.onAuthStateChanged(auth, () => { off(); r(); }); });
  if (!auth.currentUser) await U.signInAnonymously(auth);
  this.F = F; this.db = F.getFirestore(app); this.lid = auth.currentUser.uid; return true;
 },
 async flush() {
  if (this.busy || !navigator.onLine) return; let q = this.queue(); if (!q.length) return;
  if (!this.enabled()) { this.store([]); return; }
  this.busy = true;
  try {
   if (!(await this.ready())) return;
   while ((q = this.queue()).length) {
    const part = q.slice(0, this.BATCH), b = this.F.writeBatch(this.db), acct = this.acct();
    for (const r of part) b.set(this.F.doc(this.db, 'learnlog', this.lid, 'lsess', r.id), Object.assign({}, r, { lid: this.lid, acct: r.acct || acct, at: this.F.serverTimestamp() }));
    try { await b.commit(); this.failed = 0; }
    catch (e) {
     if (!e || e.code !== 'permission-denied') throw e;
     // One refused document (usually one that was already uploaded: the rules allow create, never update) used to
     // throw away all twenty sessions of the batch. Write them one by one and drop only the ones that are refused.
     let dropped = 0;
     for (const r of part) {
      try { await this.F.setDoc(this.F.doc(this.db, 'learnlog', this.lid, 'lsess', r.id), Object.assign({}, r, { lid: this.lid, acct: r.acct || acct, at: this.F.serverTimestamp() })); }
      catch (e2) { if (e2 && e2.code === 'permission-denied') dropped++; else throw e2; }
     }
     if (dropped) console.warn('[learnlog] dropped', dropped, 'of', part.length);
    }
    const ids = new Set(part.map(r => r.id)); this.store(this.queue().filter(r => !ids.has(r.id)));
   }
  } catch (e) {
   this.failed++; if (e && /admin-restricted-operation|operation-not-allowed/.test(e.code || '')) { this.off = true; console.warn('[learnlog] anonymous sign-in is not enabled in Firebase; logging paused'); }
   else console.warn('[learnlog] upload later', e && (e.code || e.message));
  } finally { this.busy = false; }
 },
};

(function () {
 if (typeof Learn === 'undefined' || typeof Adaptive === 'undefined') return;
 const L = LearnLog, now = () => performance.now();

 // ----- Learn sessions -----
 const start = Learn.start.bind(Learn);
 Learn.start = function (kind, opts = {}) {
  const before = this.sess; const r = start(kind, opts);
  if (this.sess && this.sess !== before) {
   L.closeLearn('restart');
   const o = opts || {}, sub = o.k || o.ch || o.trick || o.mode || (o.item != null ? 'item' : '') || '';
   L.cur = { s: this.sess, rec: L.open(this.sess.kind, sub), card: now() };
  }
  return r;
 };
 const live = () => { const c = L.cur; if (!c) return null; if (c.s !== Learn.sess) { L.closeLearn(); return null; } return c; };

 const review = Learn.review.bind(Learn);
 Learn.review = function (knew) {
  const c = live(), s = this.sess, i = s && s.step === 'review' ? s.words[s.ri] : null, ms = c ? Math.round(now() - c.card) : 0;
  const r = review(knew);
  if (c && i != null) { c.rec.rev.push({ w: L.word(i), l: L.level(i), gr: L.grade(i), k: knew ? 1 : 0, ms: Math.min(ms, 600000) }); c.card = now(); }
  return r;
 };
 const more = Learn.more.bind(Learn); Learn.more = function () { const r = more(); if (L.cur) L.cur.card = now(); return r; };

 // question shown: start its clock, reset the replay counter
 const prepare = Adaptive.prepare.bind(Adaptive);
 Adaptive.prepare = function (s) { const r = prepare(s); const c = L.cur; if (c && c.s === s) { c.q = s.qi; c.shown = now(); c.replays = 0; } return r; };
 const say = Learn.say.bind(Learn);
 Learn.say = function (w) { const c = L.cur; if (c && c.s === this.sess && this.sess && this.sess.step === 'quiz' && !this.sess.ans) c.replays = (c.replays || 0) + 1; return say(w); };

 const answer = Learn.answer.bind(Learn);
 Learn.answer = function (val) {
  const c = live(), s = this.sess;
  if (!c || !s || s.step !== 'quiz' || s.ans) return answer(val);
  const q = s.qs[s.qi], i = q.i, rec = this.rec(i), typed = q.type === 'spell' || q.type === 'listenspell';
  let p = null; try { p = s.kind === 'grade' && q.pp != null ? q.pp : Adaptive.probability(i, q.type, q); } catch (e) { }   // placement questions carry the placement model's prediction
  // gap = days since this word was last answered. Records from 0.92.45 keep that day (index 5); older ones only allow an
  // estimate from the due day, which is wrong after a miss (due is always tomorrow then), so it is marked ge:1.
  const box0 = rec ? rec[0] : 0, seenBefore = rec && (rec[3] + rec[4]) > 0, exact = !!rec && rec[5] != null;
  const gap = seenBefore ? this.dayNum() - (exact ? rec[5] : rec[1] - SRS_INT[rec[0]]) : -1;
  const ms = c.shown ? Math.round(now() - c.shown) : 0, replays = c.replays || 0, idx = s.qi;
  const r = answer(val);
  if (s.ans) {
   const after = this.rec(i), ok = !!s.ans.ok;
   const given = ok ? '' : typed ? Learn.norm(val).slice(0, 40) : (VOCAB[val] ? VOCAB[val].w : String(val ?? '').slice(0, 40));
   c.rec.ans.push({ t: Date.now() - c.rec.t0, w: L.word(i), l: L.level(i), gr: L.grade(i), ge: seenBefore && !exact ? 1 : 0, q: q.type, ok: ok ? 1 : 0, ms: Math.min(ms, 600000), g: given,
    b0: box0, b1: after ? after[0] : 0, gap, p: p == null ? -1 : Math.round(p * 1000) / 1000, h: !typed || q.noHint || q.type === 'listenspell' ? 0 : q.hint ? 2 : 1, r: Math.max(0, replays - 1), i: idx,
    re: s.redoFrom != null && idx >= s.redoFrom ? 1 : 0 });
  }
  return r;
 };
 const finish = Learn.finish.bind(Learn);
 Learn.finish = function () {
  const c = live(), s = this.sess, r = finish();
  if (c && s && s.result) { const rec = c.rec; rec.done = true; rec.n = s.qs.length; rec.right = s.right; rec.coins = s.result.coins || 0; rec.xp = s.result.xp || 0; if (s.pl) rec.pl = s.pl; L.cur = null; L.close(rec, 'result'); }
  return r;
 };

 // ----- Meow Typo -----
 if (typeof CatsTypo !== 'undefined') {
  const T = CatsTypo, tlive = () => { const t = L.typo; if (!t) return null; if (t.s !== T.session) { L.typo = null; L.close(t.rec, t.s && t.s.done ? 'result' : 'left'); return null; } return t; };
  // the first question is shown inside start(), before the session is known here
  const item = t => { const v = T.current(); t.item = { w: v ? v.w : '', l: v ? v.t : 0, gr: v && v.g ? v.g : 0, ok: 0, att: 0, ms: 0, rv: 0, cat: 0, g: [] }; t.shown = now(); };
  const begin = name => { const fn = T[name].bind(T); T[name] = function () { const before = this.session, r = fn(...arguments); if (this.session && this.session !== before) { const t = L.typo; if (t) { L.typo = null; L.close(t.rec, 'restart'); } L.typo = { s: this.session, rec: L.open('typo', this.session.mode || 'free') }; item(L.typo); } return r; }; };
  begin('start'); begin('openDaily');
  const next = T.nextQuestion.bind(T);
  T.nextQuestion = function () { const r = next(); const t = tlive(); if (t) item(t); return r; };
  const flushItem = (t, ok, revealed) => { const it = t.item; if (!it) return; it.ok = ok ? 1 : 0; it.rv = revealed ? 1 : 0; it.ms = Math.min(Math.round(now() - t.shown), 600000); t.rec.typo.push(it); t.item = null; };
  const submit = T.submit.bind(T);
  T.submit = function () {
   const t = tlive(), s = this.session, wasOpen = s && this.active && !s.answered, value = Learn.norm(this.value), cat = (this.catFlags || []).some(Boolean);
   const r = submit();
   if (t && t.item && wasOpen) { t.item.att++; if (cat) t.item.cat = 1; if (s.answered) flushItem(t, true, false); else if (t.item.g.length < 3) t.item.g.push(value.slice(0, 40)); }
   return r;
  };
  const reveal = T.reveal.bind(T);
  T.reveal = function () { const t = tlive(), r = reveal(); if (t && t.item) flushItem(t, false, true); return r; };
  const advance = T.advance.bind(T);
  T.advance = function () { const r = advance(); const t = L.typo; if (t && t.s.done) { L.typo = null; t.rec.done = true; t.rec.n = t.rec.typo.length; t.rec.right = t.rec.typo.filter(x => x.ok && !x.rv).length; L.close(t.rec, 'result'); } return r; };
  if (T.close) { const close = T.close.bind(T); T.close = function () { const r = close(...arguments); const t = L.typo; if (t && t.s && !t.s.done && t.s !== this.session) { L.typo = null; L.close(t.rec, 'left'); } return r; }; }
 }

 // ----- leaving -----
 const leave = () => { L.closeLearn(); const t = L.typo; if (t) { L.typo = null; if (t.item) { t.rec.typo.push(Object.assign(t.item, { ms: Math.min(Math.round(now() - t.shown), 600000) })); } L.close(t.rec, t.s.done ? 'result' : 'left'); } };
 window.addEventListener('pagehide', leave);
 // a session left open in a background tab for 30 minutes counts as abandoned
 setInterval(() => { const c = L.cur; if (c && c.s === Learn.sess && Date.now() - (c.rec.t0) > 30 * 60000 && (!c.shown || now() - c.shown > 30 * 60000) && now() - c.card > 30 * 60000) L.closeLearn('idle'); L.flush(); }, 30000);
 window.addEventListener('online', () => L.flush());
 window.addEventListener('load', () => setTimeout(() => L.flush(), 8000));

 // ----- settings: one switch -----
 if (typeof UI !== 'undefined' && UI.w_settings) {
  const settings = UI.w_settings.bind(UI);
  UI.w_settings = function () {
   const out = settings(...arguments), st = Game.S.settings, on = st.learnShare !== false;
   const card = h('section', { class: 'settings-card learnlog-card' },
    h('b', { text: I18n.t('learnlog.title') }),
    h('p', { class: 'hint', text: I18n.t('learnlog.desc') }),
    h('div', { class: 'row wrap' },
     h('button', { class: 'chip' + (on ? ' on' : ''), 'aria-pressed': String(on), onclick: () => { st.learnShare = true; L.off = false; Game.save(); UI.refresh('settings'); L.flush(); } }, I18n.t('learnlog.on')),
     h('button', { class: 'chip' + (on ? '' : ' on'), 'aria-pressed': String(!on), onclick: () => { st.learnShare = false; L.store([]); L.cur = null; L.typo = null; Game.save(); UI.refresh('settings'); } }, I18n.t('learnlog.off'))));
   if (Array.isArray(out)) out.push(card); else if (out && out.append) out.append(card);
   return out;
  };
 }
})();
