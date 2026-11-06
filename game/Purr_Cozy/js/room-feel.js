/* ============================================================
   0.92.47 Purr Cozy: how the room feels to use
   - Mode bar: the "visiting a friend" card and the decorating bar sit in the top-left corner of the room
     (they used to cover the top bar, the lyrics and the item toolbar). It moves down when the lyrics
     would cover it, and the toolbar of a selected item never hides under it.
   - Tapping: a pet is hit only on its drawn pixels (not a 20×17 box), so furniture right next to a pet is
     easy to tap; a small thing next to a big piece of furniture wins when the tap is within a few pixels.
   - Toys: up to three balls / yarn / catnip piles on the floor at once. Each one draws the pets within its
     reach (not the whole room); the nearest plays first and the others wait their turn beside it.
     A toy nobody is near stays on the floor for a while, and a pet that wanders close picks it up.
   - Scratching posts: a tap calls the cats within reach (up to three); they take turns. Other cat
     furniture calls the nearest pet within reach. Pets far away are not pulled across the room.
   ============================================================ */
const RoomFeel = {
  R_TOY: 72,          // how far (room pixels) a pet notices a toy
  R_POST: 90,         // a scratching post
  R_CALL: 110,        // other cat furniture
  MAX_TOYS: 3,
  TOY_LIFE: 30,       // seconds a toy waits on the floor for someone to play with it
  MAX_PLAYERS: 3,     // pets per toy / post (one plays, the others wait)
  t(id, a) { return I18n.t('feel.' + id, a); },
  touch() { return typeof Mobile !== 'undefined' && (Mobile.on || Mobile.touch); },
};

/* ---------------- mode bar: visit card and decorating bar ---------------- */
const ModeBar = {
  el: null,
  host() {
    const wrap = document.querySelector('.room-wrap'); if (!wrap) return null;
    if (!this.el || !this.el.isConnected) { this.el = h('div', { class: 'modebar', 'aria-live': 'polite' }); wrap.append(this.el); }
    return this.el;
  },
  // the decorating bar from index.html moves into the corner once; its two buttons keep their handlers
  setupEdit() {
    const bar = document.getElementById('editbar'), host = this.host(); if (!bar || !host || bar.dataset.feel) return;
    bar.dataset.feel = '1';
    const span = bar.querySelector('span'), tipText = span ? span.textContent : '';
    const title = h('b', { class: 'mp-title' }, ico('i_brush', 20), h('span', { text: RoomFeel.t('editTitle') }));
    const tip = h('p', { class: 'mode-tip', text: tipText }); tip.hidden = true;
    const help = h('button', { class: 'chip sm mp-help', type: 'button', 'aria-expanded': 'false', title: tipText, onclick: () => { tip.hidden = !tip.hidden; help.setAttribute('aria-expanded', String(!tip.hidden)); this.fit(); } }, '?');
    if (span) span.remove();
    bar.classList.add('mode-pill'); bar.prepend(title, help); bar.after(tip); host.append(bar); this.tip = tip;
  },
  showTip(secs) { if (!this.tip) return; this.tip.hidden = false; clearTimeout(this.tipTimer); this.tipTimer = setTimeout(() => { if (this.tip) this.tip.hidden = true; this.fit(); }, secs * 1000); this.fit(); },
  // keep clear of the lyrics line (fixed near the top of the screen on a computer)
  fit() {
    const el = this.el; if (!el || !el.isConnected) return;
    el.classList.toggle('empty', ![...el.querySelectorAll('.mode-pill')].some(p => !p.hidden && getComputedStyle(p).display !== 'none'));
    // below the room's top trim, and below the top bar when the room reaches under it
    const wrap = el.parentNode.getBoundingClientRect(), ly = document.querySelector('.lyrics'), hud = document.querySelector('.hud');
    let top = Math.round(12 * (Game.scale || 1));
    if (hud && getComputedStyle(hud).display !== 'none') { const hb = hud.getBoundingClientRect().bottom; if (hb > wrap.top + top - 6) top = Math.round(hb - wrap.top + 8); }
    if (ly && !ly.hidden && getComputedStyle(ly).display !== 'none' && getComputedStyle(ly).position === 'fixed' && ly.textContent.trim()) {
      const r = ly.getBoundingClientRect(), mine = el.getBoundingClientRect();
      const across = r.left < wrap.left + 10 + mine.width && r.right > wrap.left;
      if (across && r.bottom > wrap.top + top - 6) top = Math.round(r.bottom - wrap.top + 6);
    }
    el.style.top = top + 'px';
    el.classList.toggle('empty', ![...el.querySelectorAll('.mode-pill')].some(p => !p.hidden && getComputedStyle(p).display !== 'none'));
    document.body.classList.toggle('has-modebar', !el.classList.contains('empty'));
  },
  bottom() { const el = this.el; if (!el || el.classList.contains('empty')) return 0; const r = el.getBoundingClientRect(), w = el.parentNode.getBoundingClientRect(); return r.bottom - w.top; },
  visitCard(V, onExit) {
    return h('div', { class: 'mode-pill visit-pill' }, h('b', { class: 'mp-title' }, ico('i_people', 20), h('span', { text: V.name + I18n.s("u_474004ce4f1c") })),
      h('button', { class: 'chip sm primary', type: 'button', onclick: onExit }, I18n.s("u_624fbfccd8f1")));
  },
};

(function () {
  if (typeof UI === 'undefined' || typeof Room === 'undefined') return;
  // visiting: the card goes into the corner instead of above the room
  if (typeof Visit !== 'undefined') {
    const enter = Visit.enter.bind(Visit);
    Visit.enter = function (V) {
      const r = enter(V); if (!this.active) return r;
      if (this.banner) this.banner.remove();
      const host = ModeBar.host(); if (host) { this.banner = ModeBar.visitCard(this.active, () => this.exit()); host.prepend(this.banner); }
      ModeBar.fit(); return r;
    };
    const exit = Visit.exit.bind(Visit);
    Visit.exit = function () { const r = exit(); ModeBar.fit(); return r; };
  }
  // decorating: the bar sits in the corner; the long hint shows for a few seconds the first time, then behind "?"
  const setEdit = UI.setEdit.bind(UI);
  UI.setEdit = function (on) {
    ModeBar.setupEdit(); const was = Room.edit; const r = setEdit(on);
    if (on && !was && Room.edit && !RoomFeel.touch()) { const S = Game.S; S.settings = S.settings || {}; const n = S.settings.editTips || 0; if (n < 3) { S.settings.editTips = n + 1; ModeBar.showTip(6); } }
    if (!Room.edit && ModeBar.tip) ModeBar.tip.hidden = true;
    ModeBar.fit(); return r;
  };
  // the toolbar of the selected item: never under the mode bar, never outside the room
  const pos = UI.posToolbar.bind(UI);
  UI.posToolbar = function () {
    pos(); const it = Room.sel, tb = this._tb; if (!tb || tb.hidden || !it) return;
    const s = Game.scale, cv = Room.itemCanvas(it), W = this.overlay.clientWidth || RW * s, half = tb.offsetWidth / 2, th = tb.offsetHeight;
    const x = Math.max(half + 4, Math.min(W - half - 4, (it.x + cv.width / 2) * s));
    let y = it.y * s - 8, below = false;
    const mb = ModeBar.bottom(), mbRight = ModeBar.el && !ModeBar.el.classList.contains('empty') ? ModeBar.el.getBoundingClientRect().right - this.overlay.getBoundingClientRect().left : 0;
    if (y - th < 4 || (y - th < mb + 4 && x - half < mbRight + 4)) { y = (it.y + cv.height) * s + 8; below = true; }
    tb.style.left = x + 'px'; tb.style.top = y + 'px'; tb.classList.toggle('below', below);
  };
  const layout = UI.layout && UI.layout.bind(UI);
  if (layout) UI.layout = function () { const r = layout(...arguments); ModeBar.fit(); return r; };
  setInterval(() => { if (ModeBar.el && !ModeBar.el.classList.contains('empty')) ModeBar.fit(); }, 1000);
  window.addEventListener('resize', () => ModeBar.fit());
})();

/* ---------------- tapping: pets by their pixels, small things before big ones ---------------- */
(function () {
  if (typeof Pet === 'undefined') return;
  // remember where each image of the pet was drawn this frame (all pet drawing goes through drawImage)
  const draw = Pet.prototype.draw;
  Pet.prototype.draw = function (c) {
    const rec = [], orig = c.drawImage;
    c.drawImage = function (img, ...a) {
      if (img && img.alpha && img.width <= 64 && a.length === 2) { const m = c.getTransform(); rec.push({ img, x: m.a * a[0] + m.c * a[1] + m.e, y: m.b * a[0] + m.d * a[1] + m.f, sx: m.a || 1, sy: m.d || 1 }); }
      return orig.apply(this, [img, ...a]);
    };
    try { return draw.call(this, c); } finally { c.drawImage = orig; this._hb = rec.length ? { rec, at: Room.t } : null; }
  };
  const box = Pet.prototype.hit;
  Pet.prototype.hit = function (x, y) {
    const hb = this._hb; if (!hb || Room.t - hb.at > .5) return box.call(this, x, y);
    for (const r of hb.rec) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (hitAlpha(r.img, (x + dx - r.x) / r.sx, (y + dy - r.y) / r.sy)) return true;
    return false;
  };
  // a small thing within a few pixels of the tap wins over the big piece of furniture under it
  const area = it => { const cv = Room.itemCanvas(it); let n = cv._area; if (n == null) { n = 0; for (let i = 3; i < cv.alpha.length; i += 4) if (cv.alpha[i]) n++; cv._area = n; } return n; };
  const hit = Room.hit.bind(Room);
  Room.hit = function (x, y, opts = {}) {
    const r = hit(x, y, opts);
    if (!r || r.kind !== 'item') return r;
    try {
      const big = area(r.it); if (big < 500) return r;
      const T = RoomFeel.touch() ? 5 : 2; let best = null, bestA = big / 4;
      for (const e of this.drawList()) {
        if (e.kind !== 'item' || e.it === r.it) continue; const it = e.it, d = ITEMS[it.k]; if (!d || d.layer === 'rug' || d.window) continue;
        const cv = this.itemCanvas(it); if (x < it.x - T || x > it.x + cv.width + T || y < it.y - T || y > it.y + cv.height + T) continue;
        const a = area(it); if (a >= bestA) continue;
        let near = false; for (let dy = -T; dy <= T && !near; dy++) for (let dx = -T; dx <= T; dx++) if (dx * dx + dy * dy <= T * T && hitAlpha(cv, x + dx - it.x, y + dy - it.y)) { near = true; break; }
        if (near) { best = e; bestA = a; }
      }
      return best || r;
    } catch (e) { return r; }
  };
})();

/* ---------------- toys on the floor: up to three, each draws the pets around it ---------------- */
(function () {
  if (typeof PetPlay === 'undefined' || typeof PetToy === 'undefined') return;
  const P = PetPlay; P.toys = [];
  const free = a => a && a.data && a.data.home && !P.busy(a) && a.state !== 'sleep' && !a.lure && !(a.hp && a.state === 'hand');
  const dist = (a, x, y) => Math.hypot(a.x - x, (a.y - y) * 1.2);
  P.floorToys = function () { this.toys = this.toys.filter(t => Room.actors.includes(t)); return this.toys.filter(t => !t.done); };
  // pets within reach, nearest first; tired or sick ones say so once
  P.nearby = function (x, y, R, filter) {
    return this.pets().filter(a => free(a) && dist(a, x, y) <= R && (!filter || filter(a))).sort((a, b) => dist(a, x, y) - dist(b, x, y));
  };
  const unpaidNip = () => P.toys.filter(t => t.k === 'nip' && !t.paid && Room.actors.includes(t)).length;

  P.throwToy = function (k, x, y) {
    if (this.floorToys().length >= RoomFeel.MAX_TOYS) { UI.toast(RoomFeel.t('toyMax', [RoomFeel.MAX_TOYS]), this.spr(this.held), 2.2); return; }
    if (y < 100) { UI.toast(HAND_HINT[k], this.spr(this.held), 2); return; }
    if (k === 'nip' && (Life.L.bag.catnip || 0) <= unpaidNip()) { UI.toast(I18n.s("u_a14a4c2de7ed"), 'it_catnip', 2); return this.afterUse(); }
    const [xa, xb] = floorX(y), X = Math.max(xa + 6, Math.min(xb - 6, x)), Y = Math.min(166, y);
    const A = Game.avatar, from = A ? [A.x, A.y - 8] : [X, Y - 20];
    const toy = new PetToy(k, from, [X, Y]); toy.id = this.held; toy.players = []; toy.age = 0; toy.paid = false; toy.lure = true;
    Room.actors.push(toy); this.toys.push(toy);
    const around = this.pets().some(a => a.state !== 'sleep' && dist(a, X, Y) <= RoomFeel.R_TOY);
    if (!this.attract(toy, true) && !around) UI.toast(RoomFeel.t('toyWait'), this.spr(this.held), 2.4);
    this.renderTray();
  };
  // assign pets around the toy; returns how many came
  P.attract = function (toy, first) {
    if (toy.fade > 0 || toy.done) return 0;
    const room = RoomFeel.MAX_PLAYERS - toy.players.length; if (room <= 0) return 0;
    const all = this.pets().filter(a => free(a) && dist(a, toy.x, toy.y) <= RoomFeel.R_TOY).sort((a, b) => dist(a, toy.x, toy.y) - dist(b, toy.x, toy.y));
    const ok = all.filter(a => !Pets.why(a.data, 'play') && (toy.k !== 'nip' || a.kind === 'cat' || !toy.players.length));
    if (first && all.length && !ok.length) { const w = Pets.why(all[0].data, 'play'); if (w) UI.toast(w, this.spr(this.held), 2.6); }
    const come = ok.slice(0, room);
    for (const a of come) { toy.players.push(a); a.lure = toy; if (toy.k === 'nip' || !toy.cur) this.playToy(a, toy); else this.waitToy(a, toy); }
    return come.length;
  };
  const spotNear = (toy, dx) => { const y = Math.min(166, Math.max(104, toy.y)), [xa, xb] = floorX(y); return [Math.max(xa + 6, Math.min(xb - 6, toy.x + dx)), y]; };
  P.release = function (a, toy) { if (a.lure === toy) a.lure = null; toy.players = toy.players.filter(p => p !== a); if (toy.cur === a) toy.cur = null; };
  P.toyNext = function (toy) {
    const next = toy.players.find(p => p !== toy.cur && p.lure === toy && p.toyWaiting);
    if (next) { next.toyWaiting = false; this.say(next, RoomFeel.t('myTurn'), RoomFeel.t('myTurn'), 1.2); this.playToy(next, toy); return; }
    if (!toy.players.length) { toy.done = true; toy.fade = 2.5; }
  };
  // waiting beside the toy, watching
  P.waitToy = function (a, toy) {
    a.toyWaiting = true; const side = (a.x < toy.x ? -1 : 1) * (14 + toy.players.length * 3);
    this.seq(a, [{ walk: () => spotNear(toy, side), speed: 40 }, { pose: 'look', t: 40, at: () => { a.flip = toy.x < a.x; this.say(a, RoomFeel.t('meToo'), RoomFeel.t('meToo'), 1.4); }, tick: () => { a.flip = toy.x < a.x; } }],
      () => { if (a.lure === toy && a.toyWaiting) { a.toyWaiting = false; this.release(a, toy); this.toyNext(toy); } });
    a.toyStart = Room.t;
  };
  // one pet's turn with the toy (the same little scenes as before, now aimed at wherever the toy is)
  P.playToy = function (a, toy) {
    toy.cur = toy.k === 'nip' ? null : a; a.toyStart = Room.t; a.toyWaiting = false;
    const k = toy.k, p = a.data, need = this.needFor(p.id), A = Game.avatar, tools = toy.id;
    const count = () => {
      let ok;
      if (k === 'nip') { if (toy.paid) { Life.L.bag.catnip = (Life.L.bag.catnip || 0) + 1; } ok = Pets.play(p.id, 'catnip', need, { quiet: true }); if (ok) toy.paid = true; else if (toy.paid) { Life.L.bag.catnip--; if (!Life.L.bag.catnip) delete Life.L.bag.catnip; } }
      else ok = Pets.play(p.id, tools, need, { quiet: true });
      if (ok) { a.happy = 2; Room.puff('p_heart', a.x - 2, a.y - 18, { vy: -9 }); }
      this.afterUse();
    };
    const end = () => { this.release(a, toy); if (toy.k === 'nip') { if (!toy.players.length) { toy.done = true; toy.fade = 0.8; } } else this.toyNext(toy); };
    const near = (dx) => spotNear(toy, dx);
    const i = toy.k === 'nip' ? toy.players.indexOf(a) : 0, off = [0, -11, 11][i] || 0;
    a.leaveSpot(() => {
      if (a.lure !== toy) return;
      if (k === 'ball' && a.kind === 'dog') {
        const home = A ? [A.x + (A.x > 120 ? -11 : 11), Math.min(167, A.y + 2)] : near(-30);
        this.seq(a, [{ pose: 'sit', t: 0.4 }, { walk: () => near(0), speed: 52 }, { pose: 'groom', rate: 5, t: 0.35, at: () => { toy.held = a; a.hp.carry = true; } },
          { walk: home, speed: 40 }, { pose: 'sit', t: 0.9, at: () => { a.hp.carry = false; toy.held = null; toy.land(a.x + (a.flip ? -7 : 7), a.y); this.say(a, I18n.s("u_0d29b23cb0d5"), I18n.s("u_0d29b23cb0d5"), 1.6); if (A) a.flip = A.x < a.x; count(); } }], end);
      } else if (k === 'ball' || (k === 'yarn' && a.kind === 'dog')) {
        const push = (dist) => ({ pose: 'look', t: 0.4, at: () => { const d = (a.flip ? -1 : 1) * dist; toy.roll(near(d)); } });
        this.seq(a, [{ pose: 'sit', t: 0.4 }, { walk: () => near(a.x < toy.x ? -8 : 8), speed: 44 }, push(22), { walk: () => near(0), speed: 40 }, push(16), { pose: 'sit', t: 0.8, at: count }], end);
      } else if (k === 'yarn') {
        this.seq(a, [{ pose: 'sit', t: 0.4 }, { walk: () => near(a.x < toy.x ? -6 : 6), speed: 46 }, { pose: 'belly', rate: 4, t: 2.6, at: () => { toy.held = a; toy.hug = true; } }, { pose: 'sit', t: 0.6, at: () => { toy.held = null; toy.hug = false; toy.land(a.x + 6, a.y); count(); } }], end);
      } else { // catnip: every cat around the pile rolls in it at the same time
        this.seq(a, [{ pose: 'look', t: 0.6 }, { walk: () => near(off), speed: 34 },
          a.kind === 'cat' ? { pose: 'belly', rate: 3, t: 3.2, tick: (t, dt) => { if (Math.random() < dt * 1.2) Room.puff('p_heart', a.x - 2, a.y - 14, { vy: -8, max: 1 }); } }
            : { pose: 'look', t: 1.2, at: () => this.say(a, '', I18n.s("u_9dae53e56128"), 1.2) },
          { pose: 'sit', t: 0.5, at: count }], end);
      }
    });
  };
  // a toy waits on the floor; pets that come close pick it up; a scene that something else interrupted lets the next one play
  const update = PetToy.prototype.update;
  PetToy.prototype.update = function (dt) {
    update.call(this, dt); if (!this.lure || this.fade > 0) return;
    this.age += dt; this.scan = (this.scan || 0) - dt;
    for (const a of this.players.slice()) {
      const lost = a.lure !== this || !Room.actors.includes(a) || (Room.t - (a.toyStart || 0) > 1.5 && a.state !== 'hand' && !a.walking && !a.jump) || Room.t - (a.toyStart || 0) > 45;
      if (lost) { const wasCur = this.cur === a; P.release(a, this); if (a.lure === this) a.lure = null; a.toyWaiting = false; if (wasCur || !this.cur) P.toyNext(this); }
    }
    if (this.scan <= 0) { this.scan = 0.7; if (this.players.length < RoomFeel.MAX_PLAYERS && !this.done) P.attract(this, false); }
    if (!this.players.length && this.age > RoomFeel.TOY_LIFE) { this.done = true; this.fade = 2.5; }
  };
  const remove = PetToy.prototype.remove;
  PetToy.prototype.remove = function () { remove.call(this); for (const a of (this.players || [])) if (a.lure === this) a.lure = null; P.toys = P.toys.filter(t => t !== this); P.renderTray && P.renderTray(); };
  // the toy count shows on the tray buttons
  const tray = P.renderTray.bind(P);
  P.renderTray = function () { const r = tray(); const el = this._tray; if (el) { const n = (this.toys || []).filter(t => Room.actors.includes(t) && !t.done).length; el.dataset.toys = n ? `${n}/${RoomFeel.MAX_TOYS}` : ''; el.title = n ? RoomFeel.t('toyCount', [n, RoomFeel.MAX_TOYS]) : ''; } return r; };
})();

/* ---------------- scratching posts and cat furniture: only the pets around it come ---------------- */
(function () {
  if (typeof Furn === 'undefined' || typeof PetPlay === 'undefined') return;
  const P = PetPlay, pick = Furn.pet;
  const base = it => { const [w, h] = itemSize(it); return [it.x + w / 2, it.y + h]; };
  const free = a => a && a.data && a.data.home && !P.busy(a) && !a.lure && !['eat', 'trick', 'hand', 'inbox', 'zoom'].includes(a.state) && !a.jump;
  const dist = (a, x, y) => Math.hypot(a.x - x, (a.y - y) * 1.2);
  const callPet = Furn.callPet.bind(Furn);
  Furn.callPet = function (it, pose, line) {
    if (Game.focusing()) return false;
    if (this.pet !== pick) return callPet(it, pose, line);   // "call a cat" from the furniture window: that cat, wherever it is
    const [x, y] = base(it);
    if (pose === 'scratch') return RoomFeel.post(it, line);
    const p = (Game.pets || []).filter(a => free(a) && a.state !== 'sleep' && dist(a, x, y) <= RoomFeel.R_CALL).sort((a, b) => dist(a, x, y) - dist(b, x, y))[0];
    if (!p) return false;
    this.pet = () => p; try { return callPet(it, pose, line); } finally { this.pet = pick; }
  };
  // a post: the cats around it come; one scratches, the others wait beside it and take turns
  RoomFeel.posts = new Map();
  RoomFeel.post = function (it, line) {
    const [x, y] = base(it); let q = this.posts.get(it.uid);
    if (!q) { q = { it, list: [], cur: null }; this.posts.set(it.uid, q); }
    q.list = q.list.filter(a => a.lure === q && Room.actors.includes(a));
    const room = this.MAX_PLAYERS - q.list.length; if (room <= 0) return true;
    const cats = (Game.pets || []).filter(a => a.kind === 'cat' && free(a) && a.state !== 'sleep' && dist(a, x, y) <= this.R_POST).sort((a, b) => dist(a, x, y) - dist(b, x, y)).slice(0, room);
    if (!cats.length) return q.list.length > 0;
    for (const a of cats) { q.list.push(a); a.lure = q; if (!q.cur) this.scratchTurn(a, q, line); else this.postWait(a, q); }
    return true;
  };
  RoomFeel.postNext = function (q) {
    q.list = q.list.filter(a => a.lure === q && Room.actors.includes(a));
    const next = q.list.find(a => a !== q.cur && a.postWaiting);
    if (next) { next.postWaiting = false; P.say(next, this.t('myTurn'), this.t('myTurn'), 1.2); this.scratchTurn(next, q); }
    else if (!q.list.length) this.posts.delete(q.it.uid);
  };
  RoomFeel.postDone = function (a, q) { if (a.lure === q) a.lure = null; q.list = q.list.filter(x => x !== a); if (q.cur === a) q.cur = null; this.postNext(q); };
  RoomFeel.scratchTurn = function (a, q, line) {
    q.cur = a; a.postStart = Room.t; const post = q.it;
    a.leaveSpot(() => {
      if (a.lure !== q || !Room.uidMap[post.uid]) return this.postDone(a, q);
      if (line) Game.bubble(a, line, 1.8);
      const [w, hgt] = itemSize(post), y = Math.min(167, post.y + hgt - 1), [xa] = floorX(y), x = Math.max(xa + 6, post.x + Math.floor(w / 2) - 9);
      P.seq(a, [{ walk: [x, y] }, { pose: 'scratch', rate: 7, t: 2.6, at: () => { a.flip = false; }, tick: (t, dt) => { if (Math.random() < dt * 6) Room.puff('p_dot', a.x + 8, a.y - 10 - Math.random() * 6, { vx: 4, vy: -2, grav: 20, max: 0.4 }); if (Math.random() < dt * 2) post.shake = 0.2; } },
        { pose: 'sit', t: 0.6, at: () => { a.happy = 1.5; } }], () => this.postDone(a, q));
    });
  };
  RoomFeel.postWait = function (a, q) {
    a.postWaiting = true; a.postStart = Room.t; const post = q.it, [w, hgt] = itemSize(post), n = q.list.indexOf(a);
    const y = Math.min(167, post.y + hgt + 2 + n * 2), [xa, xb] = floorX(y), x = Math.max(xa + 6, Math.min(xb - 6, post.x + (n % 2 ? w + 8 : -10)));
    a.leaveSpot(() => {
      if (a.lure !== q) return;
      P.seq(a, [{ walk: [x, y] }, { pose: 'look', t: 30, at: () => { a.flip = post.x + w / 2 < a.x; P.say(a, this.t('meToo'), this.t('meToo'), 1.4); } }],
        () => { if (a.postWaiting) { a.postWaiting = false; this.postDone(a, q); } });
    });
  };
  // a cat whose turn was interrupted by something else frees its place in the line
  setInterval(() => {
    for (const q of RoomFeel.posts.values()) {
      for (const a of q.list.slice()) if (a.lure !== q || !Room.actors.includes(a) || (Room.t - (a.postStart || 0) > 1.5 && a.state !== 'hand' && !a.walking && !a.jump) || Room.t - (a.postStart || 0) > 40) { a.postWaiting = false; if (a.lure === q) a.lure = null; RoomFeel.postDone(a, q); }
      if (!Room.uidMap[q.it.uid]) { for (const a of q.list) if (a.lure === q) a.lure = null; RoomFeel.posts.delete(q.it.uid); }
    }
  }, 700);
  // pets busy with a toy or a post are not sent off by the idle wander
  if (typeof PetAI !== 'undefined' && PetAI.react) { const react = PetAI.react.bind(PetAI); PetAI.react = function (a, dt) { if (a.lure) return; return react(a, dt); }; }
})();
