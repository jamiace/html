/* ============================================================
   A small ritual at the start and the end of a focus session
   - start (a fresh focus, not a resume after pause): once you are at the desk, the desk
     lamp comes on, the screen lights up, the mug steams, one soft "ding"
   - end (a finished focus, not a skip or reset): a stretch at the desk, a small card
     with this session and today's total and a line about the pet that kept you company,
     one pet comes over for a nuzzle, then a small break thing (water a plant, a sip of tea)
   - giving up stays quiet: no card, no lecture
   ============================================================ */
const Ritual = {
  pend: null, comp: {}, slept: {}, litByUs: [], card: null,
  today() { const S = Game.S, d = Life.today(); if (!S.stats.fDay || S.stats.fDay.d !== d) S.stats.fDay = { d, m: 0 }; return S.stats.fDay; },
  // ---------- sound: two soft sine notes, no file needed ----------
  chime(up) {
    if (Game.S.settings.chime === false) return;
    try {
      if (!nookTouched()) return;   // browsers only allow sound after the first tap: before that, stay silent (no console warnings)
      const A = this.ac || (this.ac = new (window.AudioContext || window.webkitAudioContext)()); if (A.state === 'suspended') A.resume();
      const notes = up ? [659.3, 987.8] : [987.8, 784];
      notes.forEach((f, i) => {
        const o = A.createOscillator(), g = A.createGain(), t0 = A.currentTime + i * 0.16;
        o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.07, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.2);
        o.connect(g); g.connect(A.destination); o.start(t0); o.stop(t0 + 1.3);
      });
    } catch (e) { }
  },
  desk() { const A = Game.avatar; return A && A.seat && Room.uidMap[A.seat.uid] ? A.seat : null; },
  // the desk and what stands on it
  deskItems() {
    const desks = Room.state.items.filter(i => ITEMS[i.k] && ITEMS[i.k].desk && i.p == null); if (!desks.length) return { desk: null, on: [] };
    const A = Game.avatar, desk = desks.sort((a, b) => Math.abs(a.x - A.x) - Math.abs(b.x - A.x))[0];
    return { desk, on: Room.state.items.filter(i => i.p === desk.uid) };
  },
  // ---------- start ----------
  start() { this.pend = { at: performance.now() }; this.comp = {}; this.slept = {}; this.restoreLights(); },
  atDesk() {
    const { desk, on } = this.deskItems(); this.chime(true);
    if (!desk) return;
    for (const it of on) {
      const d = ITEMS[it.k], [w] = itemSize(it);
      if (d.toggle && d.light && !it.on) { it.on = true; this.litByUs.push(it.uid); Room.puff('p_spark', it.x + w / 2, it.y - 2, { vy: -6, max: 0.7 }); }
      if (d.screen) for (let i = 0; i < 3; i++) Room.puff('p_spark', it.x + 2 + Math.random() * (w - 4), it.y + 2 + Math.random() * 4, { vy: -4, max: 0.6 + i * 0.15 });
      if (d.steam) for (let i = 0; i < 3; i++) setTimeout(() => Room.puff('p_steam', it.x + w / 2 - 1, it.y - 1, { vy: -6, vx: (Math.random() - 0.5) * 2, max: 1.6, alpha: 0.7, wob: 3 }), i * 350);
    }
  },
  restoreLights() { for (const uid of this.litByUs) { const it = Room.uidMap[uid]; if (it) it.on = false; } this.litByUs = []; },
  tick(dt) {
    const A = Game.avatar; if (!A) return;
    if (this.pend && Game.focusing() && (A.state === 'work' || A.state === 'deskstand')) { this.pend = null; this.atDesk(); }
    if (this.pend && (!Game.focusing() || performance.now() - this.pend.at > 20000)) this.pend = null;
    // who keeps you company during a focus
    if (Game.focusing() && Game.pets) for (const a of Game.pets) {
      if (!a.data || !a.data.home) continue;
      if (Math.hypot(a.x - A.x, (a.y - A.y) * 1.4) < 48) this.comp[a.pid] = (this.comp[a.pid] || 0) + dt;
      if (a.state === 'sleep') this.slept[a.pid] = (this.slept[a.pid] || 0) + dt;
    }
  },
  companyLine(mins) {
    const best = (o) => { let k = null, v = 0; for (const id in o) if (o[id] > v) { v = o[id]; k = +id; } return [k, v]; };
    const [cp, cv] = best(this.comp), [sp, sv] = best(this.slept), secs = mins * 60, nm = (id) => Pets.name(id);
    if (cp != null && cv >= secs * 0.5) return `${nm(cp)}在旁邊陪了你一整段`;
    if (cp != null && cv >= 20) return `${nm(cp)}中途過來陪了你一下`;
    if (sp != null && sv >= secs * 0.4) return `${nm(sp)}睡得很香，一直沒吵你`;
    const home = Pets.home(); return home.length ? `${home[0].name}在房間裡等你休息` : '';
  },
  // ---------- end ----------
  end(o) {
    const A = Game.avatar, day = this.today(), line = this.companyLine(o.mins);
    const seated = A && A.state === 'work' && this.desk();
    if (A) { A.happy = 3; if (seated) { A.stretchT = 2.4; A.afterStretch = () => this.breakAct(); setTimeout(() => Game.bubble(A, '呼～', 1.4), 300); } else { A.hop = 0.45; setTimeout(() => this.breakAct(), 1800); } }
    this.chime(false);
    setTimeout(() => this.showCard(o, day.m, line), 900);
    setTimeout(() => this.petComes(), 1400);
    this.comp = {}; this.slept = {};
  },
  showCard(o, todayMin, line) {
    let el = this.card; if (el) el.remove();
    el = this.card = h('button', { class: 'ritual-card', title: '點一下收起', onclick: () => this.hideCard() },
      h('div', { class: 'rc-t' }, ico('i_tomato', 22), h('b', { text: '專注完成' })),
      h('div', { class: 'rc-m num', text: `這次 ${o.mins} 分鐘・今天累積 ${todayMin} 分鐘` }),
      h('div', { class: 'rc-rw' }, h('span', { class: 'rwc' }, ico('i_coin', 16), h('b', { class: 'num', text: '+' + o.bonus })), h('span', { class: 'rwc' }, ico('i_star', 16), h('b', { class: 'num', text: '+' + o.bxp })), o.why && o.why.length ? h('span', { class: 'hint', text: `${o.why.join('、')}加成` }) : null),
      line ? h('div', { class: 'rc-pet' }, ico('i_paw', 16), h('span', { text: line })) : null);
    UI.overlay.append(el);
    clearTimeout(this._cardT); this._cardT = setTimeout(() => this.hideCard(), 7000);
  },
  hideCard() { if (this.card) { this.card.classList.add('out'); const el = this.card; this.card = null; setTimeout(() => el.remove(), 260); } },
  // the nearest free pet walks over and nuzzles you
  petComes() {
    const A = Game.avatar; if (!A || !Game.pets) return;
    const free = Game.pets.filter(a => a.data && a.data.home && ['sit', 'idle', 'walk', 'sleep'].includes(a.state) && !a.jump);
    if (!free.length) return;
    const a = free.sort((p, q) => Math.hypot(p.x - A.x, p.y - A.y) - Math.hypot(q.x - A.x, q.y - A.y))[0];
    const y = Math.min(167, A.y + 4), [xa, xb] = floorX(y), x = Math.max(xa + 8, Math.min(xb - 8, A.x + (A.x > 120 ? -12 : 12)));
    a.leaveSpot(() => { a.state = 'walk'; a.walkTo(x, y, () => { a.state = 'sit'; a.flip = A.x < a.x; a.timer = 4; a.happy = 2; Room.puff('p_heart', a.x - 2, a.y - 18, { vy: -9 }); Game.bubble(a, a.kind === 'dog' ? '汪～辛苦了！' : '喵～辛苦了', 2); }); });
  },
  // a small thing to start the break with
  breakAct() {
    const A = Game.avatar; if (!A || Game.focusing()) return;
    this.restoreLights();
    const plants = Room.state.items.filter(i => ITEMS[i.k] && ITEMS[i.k].cat === 'plant' && i.p == null && ITEMS[i.k].layer === 'floor');
    const mug = Room.state.items.find(i => ITEMS[i.k] && ITEMS[i.k].steam);
    const opts = [];
    if (plants.length) opts.push(() => {
      const pl = plants[Math.floor(Math.random() * plants.length)], [w, hh] = itemSize(pl), y = Math.min(167, pl.y + hh + 3), [xa, xb] = floorX(y), x = Math.max(xa + 8, Math.min(xb - 8, pl.x + w / 2 + (pl.x > 120 ? -10 : 10)));
      A.stand(); A.state = 'walk'; A.walkTo(x, y, () => { A.state = 'idle'; A.face = 'side'; A.flip = pl.x + w / 2 < A.x; A.timer = 3.5;
        for (let i = 0; i < 6; i++) setTimeout(() => Room.puff('p_drop', pl.x + w / 2 - 3 + Math.random() * 6, pl.y + 2, { vy: 6, grav: 30, max: 0.5 }), i * 180);
        setTimeout(() => { Room.puff('p_leaf', pl.x + w / 2, pl.y + 4, { vy: -6, max: 1 }); Game.bubble(A, '喝水囉', 1.6); }, 1100); });
    });
    if (mug) opts.push(() => {
      const [w, hh] = itemSize(mug), host = mug.p != null ? Room.uidMap[mug.p] : mug, [hw, hh2] = itemSize(host), y = Math.min(167, host.y + hh2 + 3);
      A.stand(); A.state = 'walk'; A.walkTo(mug.x + w / 2, y, () => { A.state = 'idle'; A.face = 'back'; A.timer = 3.5;
        for (let i = 0; i < 4; i++) setTimeout(() => Room.puff('p_steam', mug.x + w / 2 - 1, mug.y - 1, { vy: -6, max: 1.6, alpha: 0.7, wob: 3 }), i * 300);
        setTimeout(() => { A.face = 'front'; A.happy = 1.6; Game.bubble(A, '喝口茶', 1.6); }, 1300); });
    });
    if (!opts.length) { A.stand(); A.happy = 1.5; A.timer = 2; return; }
    opts[Math.floor(Math.random() * opts.length)]();
  },
};
(function () {
  const track = Life.track.bind(Life);
  Life.track = function (ev, n = 1, data = {}) { if (ev === 'focusMin') Ritual.today().m += n; return track(ev, n, data); };
  let last = performance.now();
  setInterval(() => { const now = performance.now(), dt = Math.min(1, (now - last) / 1000); last = now; try { Ritual.tick(dt); } catch (e) { console.warn(e); } }, 250);
})();
