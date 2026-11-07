/* ============================================================
   Purr Cozy: daily play-behaviour summary (back office "使用行為")
   0.92.48 first version; 0.92.49 reworked so every number means what a person would expect:
   - Time is measured from real timestamps (not by counting timer ticks, which browsers slow down in the background).
   - vis  在線：the game is on screen.            min 主動：on screen and touched in the last 2 minutes.
   - wt   主動時間花在哪裡：each active minute goes to exactly ONE activity — the window the player is using
          (the one last touched or opened), or the room itself, decorating, holding a pet item, visiting a friend.
          Windows left open in the background do not count.
   - mus  音樂：minutes the music was actually playing (also while the game is in the background), songs = songs started.
   - focus 番茄鐘：minutes the focus timer was running (also in the background).
   - h    上線時段：on-screen minutes per hour of the day.
   - pet  照顧寵物：only actions that happened (fed, treat, brushed, bathed, medicine, played with a toy, petted, toy thrown).
   - mini 小遊戲 (each game start once; instruments included) · fp 家具小時光 (the other furniture activities) · furn 點家具 (by shop category) · win 打開視窗 (by window) · soc 拜訪 / 幫忙
   One small document per player per day: learnlog/{logId}/bday/{YYYY-MM-DD}, written by the learning log's anonymous
   account and switched off by the same setting. Uploaded at most every 15 minutes, when the game is hidden or closed
   (at most once per 2 minutes) and when the day changes: a normal day is 2–6 writes and no reads.
   ============================================================ */
const ActLog = {
  KEY: 'purr-cozy.actlog', V: 2, FLUSH_MS: 15 * 60e3, HIDE_MS: 2 * 60e3, ACTIVE_MS: 120e3, MAPMAX: 40,
  D: null, dirty: false, lastAct: 0, lastTick: Date.now(), sentAt: 0, busy: false, wasHidden: 0, fg: 'room', oldRules: false,
  // which activity a window belongs to (the back office shows these groups)
  GROUP: { learn: 'learn', study: 'learn', words: 'learn', catstypo: 'learn', typodesk: 'learn', placement: 'learn', contest: 'learn', lorebook: 'learn', story: 'learn', swap: 'learn',
    cozygame: 'mini', furnplay: 'furn', device: 'furn', pet: 'pet', storage: 'decor', themeask: 'decor', shop: 'shop', merchant: 'shop', gacha: 'shop', prize: 'shop', gift: 'social',
    friends: 'social', visit: 'social', card: 'social', cowork: 'focus', timer: 'focus', todo: 'focus', memo: 'focus', tasks: 'tasks', need: 'tasks',
    music: 'music', avatar: 'avatar', settings: 'settings', account: 'settings', cloudpick: 'settings', more: 'settings', dev: 'settings' },
  on() { return typeof LearnLog !== 'undefined' && LearnLog.enabled() && window.NOOK_ENV !== 'artifact'; },
  blank(d) { return { v: this.V, d, min: 0, vis: 0, sess: 0, h: {}, win: {}, wt: {}, mini: {}, fp: {}, mus: 0, songs: 0, pet: {}, furn: {}, edit: 0, focus: 0, soc: {}, first: '', last: '' }; },
  cur() {
    const d = Life.today();
    if (!this.D) { try { const x = JSON.parse(localStorage.getItem(this.KEY) || 'null'); if (x && x.v === this.V) this.D = x; } catch (e) { } }
    if (!this.D || this.D.d !== d) { if (this.D && this.dirty) this.flush(true, this.D); this.D = this.blank(d); }
    return this.D;
  },
  keep() { try { localStorage.setItem(this.KEY, JSON.stringify(this.D)); } catch (e) { } },
  r(n) { return Math.round(n * 100) / 100; },
  add(map, key, n = 1) {
    if (!this.on()) return; const D = this.cur(), m = D[map] || (D[map] = {}); key = String(key == null ? '?' : key).replace(/[.\/\s]/g, '_').slice(0, 24);
    if (!(key in m) && Object.keys(m).length >= this.MAPMAX) key = 'other';
    m[key] = this.r((m[key] || 0) + n); this.dirty = true;
  },
  num(k, n) { if (!this.on()) return; const D = this.cur(); D[k] = this.r((D[k] || 0) + n); this.dirty = true; },
  hm() { const t = new Date(); return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); },
  session() { if (!this.on()) return; const D = this.cur(); D.sess = (D.sess || 0) + 1; if (!D.first) D.first = this.hm(); this.dirty = true; this.keep(); },
  // what the player is doing right now (one answer)
  activity() {
    if (typeof Visit !== 'undefined' && Visit.active) return 'social';
    if (typeof Room !== 'undefined' && Room.edit) return 'decor';
    const w = this.fg !== 'room' && UI.wins && UI.wins[this.fg];
    if (w && w.el && !w.el.hidden) {
      // playing an instrument in 家具小時光 is a mini game, the other furniture activities are their own group
      if (this.fg === 'furnplay' && typeof FurnPlay !== 'undefined' && FurnPlay.session && FurnPlay.session.profile === 'instrument') return 'mini';
      return this.GROUP[this.fg] || 'other';
    }
    if (typeof PetPlay !== 'undefined' && PetPlay.held) return 'pet';
    return 'room';
  },
  // real elapsed time since the last tick (browsers run background timers only about once a minute)
  tick() {
    const now = Date.now(), dt = Math.min(5 * 60e3, Math.max(0, now - this.lastTick)) / 60000; this.lastTick = now;
    if (!this.on() || !dt) return;
    const music = typeof Music !== 'undefined' && Music.playing, focus = typeof Game !== 'undefined' && Game.focusing && Game.focusing();
    if (music) this.num('mus', dt);
    if (focus) this.num('focus', dt);
    if (document.visibilityState === 'visible') {
      const D = this.cur(); this.num('vis', dt); this.add('h', new Date().getHours(), dt);
      if (now - this.lastAct < this.ACTIVE_MS) { this.num('min', dt); this.add('wt', this.activity(), dt); if (Room.edit) this.num('edit', dt); D.last = this.hm(); if (!D.first) D.first = D.last; }
    }
    if (music || focus || document.visibilityState === 'visible') this.keep();
  },
  async flush(force, Dx) {
    const D = Dx || this.D; if (!D || this.busy || (!this.dirty && !Dx) || !this.on() || !navigator.onLine) return;
    if (!force && Date.now() - this.sentAt < this.FLUSH_MS) return;
    this.busy = true;
    try {
      if (!(await LearnLog.ready())) return;
      const F = LearnLog.F, S = Game.S || {}, tester = !!(S.flags && S.flags.tester);
      let doc = Object.assign({}, D, { lid: LearnLog.lid, acct: LearnLog.acct(), tester, app: (window.PURR_BUILD && PURR_BUILD.version) || '', dev: (tester ? 'test-' : '') + (typeof DEVICE_ID === 'string' ? DEVICE_ID.slice(0, 24) : ''), at: F.serverTimestamp() });
      // until the 0.92.49 rules are published the server only knows version 1 without `vis`
      if (this.oldRules) { doc = Object.assign({}, doc, { v: 1 }); delete doc.vis; }
      const ref = F.doc(LearnLog.db, 'learnlog', LearnLog.lid, 'bday', D.d);
      try { await F.setDoc(ref, doc); }
      catch (e) { if (e && e.code === 'permission-denied' && !this.oldRules) { this.oldRules = true; const d1 = Object.assign({}, doc, { v: 1 }); delete d1.vis; await F.setDoc(ref, d1); } else throw e; }
      this.sentAt = Date.now(); if (!Dx || Dx === this.D) this.dirty = false;
    } catch (e) { console.warn('[actlog]', e && (e.code || e.message)); }
    finally { this.busy = false; }
  },
};

(function () {
  if (typeof UI === 'undefined' || typeof Game === 'undefined') return;
  const A = ActLog;
  // the window last touched is the one being used; a touch on the room means the room
  const touch = e => {
    A.lastAct = Date.now(); const t = e.target; if (!t || !t.closest) return;
    const win = t.closest('.win[data-id]'); if (win) { A.fg = win.dataset.id; return; }
    if (t.closest('#room, #overlay, .room-wrap')) A.fg = 'room';
  };
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, touch, { passive: true, capture: true });
  // windows: opening one makes it the current activity; closing it goes back to the room
  const open = UI.openWin.bind(UI);
  UI.openWin = function (id) { const w = UI.wins && UI.wins[id], was = w && w.el && !w.el.hidden; const r = open(...arguments); if (!was) { A.add('win', id); A.fg = id; } return r; };
  const close = UI.closeWin.bind(UI);
  UI.closeWin = function (id) { const r = close(...arguments); if (A.fg === id) A.fg = 'room'; return r; };
  // furniture taps by shop category, furniture activities, mini games
  const inter = Game.interact.bind(Game);
  Game.interact = function (it) { try { const d = ITEMS[it.k]; if (d && !Room.edit && Room.state === Game.S) A.add('furn', d.fam || d.cat || 'item'); } catch (e) { } return inter(it); };
  if (typeof MiniTable !== 'undefined') { const o = MiniTable.open.bind(MiniTable); MiniTable.open = function (it, mode) { A.add('mini', mode); return o(it, mode); }; }
  // each game start is counted once: canvas games when MiniTable opens them, pianos/guitars when 家具小時光 opens the instrument
  const tableGame = m => typeof MiniTable !== 'undefined' && MiniTable.games && MiniTable.games[m];
  if (typeof CozyGames !== 'undefined') { const o = CozyGames.open.bind(CozyGames); CozyGames.open = function (it, mode) { if (!tableGame(mode) && !(mode === 'reaction' && tableGame('vending')) && mode !== 'instrument') A.add('mini', mode); return o(it, mode); }; }
  if (typeof FurnPlay !== 'undefined') { const o = FurnPlay.open.bind(FurnPlay); FurnPlay.open = function (it, p) { if (p === 'instrument') A.add('mini', 'instrument'); else if (!(['reaction', 'puzzle', 'balance', 'weave'].includes(p) && tableGame(p))) A.add('fp', p); return o(it, p); }; }
  if (typeof CatsTypo !== 'undefined') { const o = CatsTypo.open.bind(CatsTypo); CatsTypo.open = function () { A.add('mini', 'meowtypo'); return o(...arguments); }; }
  // music: songs started (the minutes come from the tick)
  if (typeof Music !== 'undefined' && Music.playAt) { const o = Music.playAt.bind(Music); Music.playAt = function () { A.num('songs', 1); return o(...arguments); }; }
  // pets: only what actually happened
  if (typeof Pets !== 'undefined') {
    const wrap = (name, key) => { if (!Pets[name]) return; const o = Pets[name].bind(Pets); Pets[name] = function () { const r = o(...arguments); if (r) A.add('pet', typeof key === 'function' ? key(...arguments) : key); return r; }; };
    wrap('feed', (pid, food) => food === 'cat_treat' ? 'treat' : 'food');
    wrap('brush', 'brush'); wrap('bath', 'bath'); wrap('medicine', 'med');
    wrap('play', (pid, toy) => toy === 'catnip' ? 'nip' : toy);
  }
  if (typeof Pet !== 'undefined' && Pet.prototype.poke) { const o = Pet.prototype.poke; Pet.prototype.poke = function () { A.add('pet', 'pat'); return o.apply(this, arguments); }; }
  if (typeof PetPlay !== 'undefined' && PetPlay.throwToy) { const o = PetPlay.throwToy.bind(PetPlay); PetPlay.throwToy = function (k) { const n = (this.toys || []).length; const r = o(...arguments); if ((this.toys || []).length > n) A.add('pet', 'throw_' + k); return r; }; }
  // social
  if (typeof Social !== 'undefined') {
    if (Social.visit) { const o = Social.visit.bind(Social); Social.visit = function () { A.add('soc', 'visit'); return o(...arguments); }; }
    if (Social.doHelp) { const o = Social.doHelp.bind(Social); Social.doHelp = function () { A.add('soc', 'help'); return o(...arguments); }; }
  }
  // openings, hiding, closing
  const start = setInterval(() => { if (!Game.S) return; clearInterval(start); A.lastTick = Date.now(); A.lastAct = Date.now(); A.session(); }, 1000);
  setInterval(() => A.tick(), 15000);
  setInterval(() => A.flush(false), 60e3);
  document.addEventListener('visibilitychange', () => {
    A.tick();
    if (document.visibilityState === 'hidden') { A.wasHidden = Date.now(); A.keep(); if (Date.now() - A.sentAt > A.HIDE_MS) A.flush(true); }
    else if (A.wasHidden && Date.now() - A.wasHidden > 30 * 60e3) A.session();
  });
  window.addEventListener('pagehide', () => { A.tick(); A.keep(); if (Date.now() - A.sentAt > A.HIDE_MS) A.flush(true); });
})();
