/* ============================================================
   0.92.48 Purr Cozy: daily play-behaviour summary (for the back office "使用行為" page)
   One small document per player per day: learnlog/{logId}/bday/{YYYY-MM-DD}, written by the same anonymous
   account as the learning log and switched off by the same setting ("分享匿名學習紀錄").
   Everything is counted on the device and uploaded as a whole day at most every 15 minutes, when the game is
   hidden / closed (at most once per 2 minutes) and when the day changes — a normal day is 2–6 writes, no reads.
   Fields (minutes are rounded to 0.25):
     min active minutes (visible and touched in the last 2 minutes) · sess openings · h {hour: minutes}
     win {window: opens} · wt {window: minutes open} · mini {game: plays} · fp {furniture activity: opens}
     mus music minutes · songs songs started · pet {care / toy action: count} · furn {furniture group: taps}
     edit minutes decorating · focus minutes with the focus timer running · soc {visit, friend, help: count}
     first / last 'HH:MM' · acct real account UID when signed in · tester test account · dev / app device and version
   ============================================================ */
const ActLog = {
  KEY: 'purr-cozy.actlog', FLUSH_MS: 15 * 60e3, HIDE_MS: 2 * 60e3, TICK: 15, MAPMAX: 40,
  D: null, dirty: false, lastAct: Date.now(), sentAt: 0, busy: false, wasHidden: 0,
  on() { return typeof LearnLog !== 'undefined' && LearnLog.enabled() && window.NOOK_ENV !== 'artifact'; },
  blank(d) { return { v: 1, d, min: 0, sess: 0, h: {}, win: {}, wt: {}, mini: {}, fp: {}, mus: 0, songs: 0, pet: {}, furn: {}, edit: 0, focus: 0, soc: {}, first: '', last: '' }; },
  cur() {
    const d = Life.today();
    if (!this.D) { try { const x = JSON.parse(localStorage.getItem(this.KEY) || 'null'); if (x && x.v === 1) this.D = x; } catch (e) { } }
    if (!this.D || this.D.d !== d) { if (this.D && this.dirty) this.flush(true, this.D); this.D = this.blank(d); }
    return this.D;
  },
  keep() { try { localStorage.setItem(this.KEY, JSON.stringify(this.D)); } catch (e) { } },
  r(n) { return Math.round(n * 100) / 100; },
  add(map, key, n = 1) {
    if (!this.on()) return; const D = this.cur(), m = D[map] || (D[map] = {}); key = String(key || '?').replace(/[.\/\s]/g, '_').slice(0, 24);
    if (!(key in m) && Object.keys(m).length >= this.MAPMAX) key = 'other';
    m[key] = this.r((m[key] || 0) + n); this.dirty = true;
  },
  num(k, n) { if (!this.on()) return; const D = this.cur(); D[k] = this.r((D[k] || 0) + n); this.dirty = true; },
  hm() { const t = new Date(); return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); },
  session() { if (!this.on()) return; const D = this.cur(); D.sess = (D.sess || 0) + 1; if (!D.first) D.first = this.hm(); this.dirty = true; this.keep(); },
  // every 15 s: active time, open windows, music, decorating, focus timer
  tick() {
    if (!this.on() || document.visibilityState !== 'visible') return; const D = this.cur(), m = this.TICK / 60;
    const active = Date.now() - this.lastAct < 120e3;
    if (typeof Music !== 'undefined' && Music.playing) this.num('mus', m);
    if (typeof Game !== 'undefined' && Game.focusing && Game.focusing()) this.num('focus', m);
    if (!active) return;
    this.num('min', m); this.add('h', new Date().getHours(), m); D.last = this.hm(); if (!D.first) D.first = D.last;
    if (typeof Room !== 'undefined' && Room.edit) this.num('edit', m);
    for (const id in (UI.wins || {})) { const w = UI.wins[id]; if (w && w.el && !w.el.hidden) this.add('wt', id, m); }
    this.keep();
  },
  async flush(force, Dx) {
    const D = Dx || this.D; if (!D || this.busy || (!this.dirty && !Dx) || !this.on() || !navigator.onLine) return;
    if (!force && Date.now() - this.sentAt < this.FLUSH_MS) return;
    this.busy = true;
    try {
      if (!(await LearnLog.ready())) return;
      const F = LearnLog.F, S = Game.S || {}, tester = !!(S.flags && S.flags.tester);
      const doc = Object.assign({}, D, { lid: LearnLog.lid, acct: LearnLog.acct(), tester, app: (window.PURR_BUILD && PURR_BUILD.version) || '', dev: (tester ? 'test-' : '') + (typeof DEVICE_ID === 'string' ? DEVICE_ID.slice(0, 24) : ''), at: F.serverTimestamp() });
      await F.setDoc(F.doc(LearnLog.db, 'learnlog', LearnLog.lid, 'bday', D.d), doc);
      this.sentAt = Date.now(); if (!Dx || Dx === this.D) this.dirty = false;
    } catch (e) { console.warn('[actlog]', e && (e.code || e.message)); }
    finally { this.busy = false; }
  },
};

(function () {
  if (typeof UI === 'undefined' || typeof Game === 'undefined') return;
  const A = ActLog, act = () => { A.lastAct = Date.now(); };
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, act, { passive: true, capture: true });
  // windows
  const open = UI.openWin.bind(UI);
  UI.openWin = function (id) { const w = UI.wins && UI.wins[id], was = w && w.el && !w.el.hidden; const r = open(...arguments); if (!was) A.add('win', id); return r; };
  // furniture taps by group, furniture activities, mini games
  const inter = Game.interact.bind(Game);
  Game.interact = function (it) { try { const d = ITEMS[it.k]; if (d && !Room.edit && Room.state === Game.S) A.add('furn', d.fam || d.cat || 'item'); } catch (e) { } return inter(it); };
  if (typeof MiniTable !== 'undefined') { const o = MiniTable.open.bind(MiniTable); MiniTable.open = function (it, mode) { A.add('mini', mode); return o(it, mode); }; }
  if (typeof FurnPlay !== 'undefined') { const o = FurnPlay.open.bind(FurnPlay); FurnPlay.open = function (it, p) { A.add('fp', p); return o(it, p); }; }
  if (typeof CatsTypo !== 'undefined') { const o = CatsTypo.open.bind(CatsTypo); CatsTypo.open = function () { A.add('mini', 'meowtypo'); return o(...arguments); }; }
  // music
  if (typeof Music !== 'undefined' && Music.playAt) { const o = Music.playAt.bind(Music); Music.playAt = function () { A.num('songs', 1); return o(...arguments); }; }
  // pets: care with something in hand, toys
  if (typeof PetPlay !== 'undefined') {
    const down = PetPlay.down.bind(PetPlay); PetPlay.down = function () { if (this.held) A.add('pet', HAND[this.held] || this.held); return down(...arguments); };
  }
  if (typeof Pets !== 'undefined' && Pets.play) { const o = Pets.play.bind(Pets); Pets.play = function (pid, toy) { const r = o(...arguments); if (r) A.add('pet', 'played'); return r; }; }
  // social
  if (typeof Social !== 'undefined') {
    if (Social.visit) { const o = Social.visit.bind(Social); Social.visit = function () { A.add('soc', 'visit'); return o(...arguments); }; }
    if (Social.doHelp) { const o = Social.doHelp.bind(Social); Social.doHelp = function () { A.add('soc', 'help'); return o(...arguments); }; }
  }
  // openings, hiding, closing
  const start = setInterval(() => { if (!Game.S) return; clearInterval(start); A.session(); }, 1000);
  setInterval(() => A.tick(), A.TICK * 1000);
  setInterval(() => A.flush(false), 60e3);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { A.wasHidden = Date.now(); A.keep(); if (Date.now() - A.sentAt > A.HIDE_MS) A.flush(true); }
    else if (A.wasHidden && Date.now() - A.wasHidden > 30 * 60e3) A.session();
  });
  window.addEventListener('pagehide', () => { A.keep(); if (Date.now() - A.sentAt > A.HIDE_MS) A.flush(true); });
})();
