/* ============================================================
   Caring for pets by hand, and pets using furniture in their own way
   - "手邊" tray under the room: pick up food, a brush, shampoo, medicine or a toy, then use it
     on the pet in the room (the care page's buttons pick things up too). Effects, prices and
     daily limits are exactly the ones in pets.js; only how you do it changed.
   - furniture behaviour: cats climb into boxes, knead soft spots before a nap, scratch posts,
     roll on rugs and pat plants; dogs carry their ball to bed and lie at your feet while you
     focus; every pet sniffs new furniture and slowly picks a favourite spot.
   Pets doing something here are in state 'hand' (driven by PetPlay.petUpdate) or 'inbox'.
   ============================================================ */

/* ---------------- sprites ---------------- */
(function () {
  const BOX = ['#7d5232', '#a0703f', '#c08a52', '#dcaa6c', '#efcb92'].map(palAdd);
  ;
  ;
  ;
  const sprite = (name, w, h, fn) => SPR.def(name, () => { const g = new Grid(w, h); fn(g); return g.outline(); });
  sprite('toy_ball', 5, 5, g => { g.ellipse(2.5, 2.5, 2.4, 2.4, 'r'); g.hl(1, 2, 3, 'f'); g.px(1, 1, 't'); });
  sprite('toy_yarn', 6, 6, g => { g.ellipse(3, 3, 2.8, 2.8, 's'); g.px(2, 2, 't'); g.px(1, 3, 'r'); g.px(4, 2, 'r'); g.px(3, 4, 'r'); });
  sprite('toy_nip', 11, 4, g => { for (const [x, y] of [[1, 2], [3, 1], [4, 2], [6, 1], [7, 2], [9, 2], [5, 3], [2, 3], [8, 3]]) g.px(x, y, (x + y) % 2 ? 'k' : 'j'); });
  sprite('toy_feather', 5, 8, g => { g.vl(2, 3, 5, 'b'); g.ellipse(2.5, 2.5, 2, 2.6, 's'); g.px(2, 1, 't'); g.px(1, 2, 'r'); });
  ;
  ;
})();

/* ---------------- furniture for pets ---------------- */
Object.assign(ITEMS, {
  pet_box: { n: I18n.s("u_81276f55ed0f"), cat: 'furniture', spr: 'pet_box', price: 30, lvl: 1, layer: 'floor', fam: 'pet', petBox: { x: 13, y: 16 }, desc: I18n.s("u_bc8bb9d36927") },
  scratch_post: { n: I18n.s("u_1f89dd634599"), cat: 'furniture', spr: 'scratch_post', price: 90, lvl: 2, layer: 'floor', fam: 'pet', scratch: true, desc: I18n.s("u_708c4379b81b") },
  pet_bed: { n: I18n.s("u_eb4d68452b22"), cat: 'furniture', spr: 'pet_bed', price: 70, lvl: 1, layer: 'floor', fam: 'pet', petSpot: { x: 14, y: 7 }, soft: true, desc: I18n.s("u_67dabcfcefa4") },
});
for (const k of ['pet_box', 'scratch_post', 'pet_bed']) ITEMS[k].id = k;
if (typeof FAM_NAMES !== 'undefined') FAM_NAMES.pet = FAM_NAMES.pet || I18n.s("u_26e29cac5227");

/* ---------------- what can be held ---------------- */
// kind decides how it is used; foods, treats, shampoo, medicine and catnip are used up, the rest are tools you own
const HAND = {
  cat_can: 'food', fish_snack: 'food', premium_food: 'food', cat_treat: 'treat',
  brush: 'brush', shampoo: 'bath', medicine: 'med',
  wand: 'wand', ball: 'ball', yarn: 'yarn', catnip: 'nip',
};
const HAND_HINT = {
  food: I18n.s("u_b799f7ce579f"), treat: I18n.s("u_7ee266a24b42"), brush: I18n.s("u_04c073733ec2"),
  bath: I18n.s("u_78ea21923b86"), med: I18n.s("u_e2e4c57f32fb"), wand: I18n.s("u_ed8d3ef46c16"),
  ball: I18n.s("u_ddac8d6004a7"), yarn: I18n.s("u_0cf98454c245"), nip: I18n.s("u_02f9f881619d"),
};

const PetPlay = {
  held: null, forPid: null, ptr: null, ptrAt: 0, brushing: null, toy: null, chaser: null, trayOpen: false,
  isTool(id) { return !!HAND[id]; },
  kind(id) { return HAND[id]; },
  name(id) { return (SUPPLIES[id] || PET_TOOLS[id] || {}).n || id; },
  spr(id) { return (SUPPLIES[id] || PET_TOOLS[id] || {}).spr || 'i_paw'; },
  owned(id) { return PET_TOOLS[id] ? !!Pets.Z.tools[id] : (Life.L.bag[id] || 0) > 0; },
  count(id) { return PET_TOOLS[id] ? (Pets.Z.tools[id] ? '' : '') : (Life.L.bag[id] || 0); },
  // ---------- picking up / putting down ----------
  pick(id, pid) {
    if (Room.edit) UI.setEdit(false);
    if (this.held === id && pid == null) return this.drop();
    if (!this.owned(id)) {
      if (PET_TOOLS[id]) UI.toast(I18n.s("u_ada0fe2f050f", [this.name(id), PET_TOOLS[id].price]), this.spr(id), 3.2);
      else UI.toast(I18n.s("u_d9c40d9eb404", [this.name(id)]), this.spr(id), 3.2);
      return false;
    }
    this.cancelBrush();this.held = id; this.forPid = pid != null ? pid : null; this.endChase(); this.showHint(); this.renderTray(); return true;
  },
  drop() { this.cancelBrush();this.held = null; this.forPid = null; this.endChase(); this.showHint(); this.renderTray(); this.cursor(null); },
  // ---------- who ----------
  pets() { return (Game.pets || []).filter(a => a.data && a.data.home); },
  petAt(x, y) {
    const h = Room.hit(x, y); if (h && h.kind === 'actor' && h.a instanceof Pet) return h.a;
    let best = null, bd = 13; for (const a of this.pets()) { const d = Math.hypot(a.x - x, (a.y - 7 - y) * 1.3); if (d < bd) { bd = d; best = a; } } return best;
  },
  // Every throw uses distance from this click, independent of the roster selection.
  player(x, y) {
    return this.pets().sort((a,b)=>Math.hypot(a.x-x,a.y-7-y)-Math.hypot(b.x-x,b.y-7-y))[0]||null;
  },
  busy(a) { return !a || a.careLock || a.toiletToken || a.scuffle || ['trick', 'eat', 'hand', 'zoom', 'jump'].includes(a.state) || a.jump; },
  needFor(pid) { return Life.L.needs.find(n => n.pet === pid) || null; },
  say(a, cat, dog, secs = 1.6) { Game.bubble(a, a.kind === 'dog' ? dog : cat, secs); },
  afterUse() { if (this.held && !PET_TOOLS[this.held] && !this.owned(this.held)) { UI.toast(I18n.s("u_73bf24cfdd20", [this.name(this.held)]), this.spr(this.held), 2); this.drop(); } else this.renderTray(); },

  // ---------- pointer (from game.js while something is held) ----------
  down(x, y, click=[x,y]) {
    const id = this.held, k = HAND[id]; this.ptr = [x, y]; this.ptrAt = performance.now();
    if (k === 'wand') { const nearest=this.player(click[0],click[1]);if(this.chaser!==nearest)this.endChase();this.wandMove(x,y,nearest);return true; }
    if (k === 'ball' || k === 'yarn' || k === 'nip') { this.throwToy(k, x, y); return true; }
    const a = this.petAt(x, y);
    if (!a) {
      if (k === 'food') { const h = Room.hit(x, y, { itemsOnly: true }); if (h && ITEMS[h.it.k].bowl) { if (Pets.fillBowl(h.it.uid, id)) this.afterUse(); return true; } }
      UI.toast(HAND_HINT[k], this.spr(id), 2.2); return true;
    }
    if (this.busy(a) && !(k === 'brush' && a.state === 'hand' && this.brushing && this.brushing.a === a)) { this.say(a, I18n.s("u_9672d1022225"), I18n.s("u_f8b30a7f815b"), 1.2); return true; }
    if (k === 'food') this.feed(a, id);
    else if (k === 'treat') this.treat(a);
    else if (k === 'brush') this.startBrush(a, x);
    else if (k === 'bath') this.bath(a);
    else if (k === 'med') this.medicine(a);
    return true;
  },
  move(x, y) {
    if (this.ptr && Math.hypot(x - this.ptr[0], y - this.ptr[1]) > 0.8) this.ptrAt = performance.now();
    this.ptr = [x, y]; this.ptrIn = true; this.cursor([x, y]);
    const b = this.brushing;
    if (b) {
      const a = b.a, over = Math.hypot(x - a.x, (y - (a.y - 7)) * 1.2) < 15;
      const dx = x - b.lastX;
      if (over && Math.abs(dx) >= 2.5) { const dir = Math.sign(dx); if (b.dir && dir !== b.dir) this.stroke(b, x, y); b.dir = dir; b.lastX = x; }
    }
    if (HAND[this.held] === 'wand') this.wandMove(x, y);
  },
  // A tap starts a visible brushing scene; releasing the pointer does not abort it.
  up() { },
  cancelBrush(){const b=this.brushing;this.brushing=null;if(b?.a.hp){b.a.hp=null;b.a.state='sit';b.a.timer=2}},
  leave() { this.ptrIn = false; this.cursor(null); if (this.brushing) this.up(); },

  // ---------- step-by-step little scenes on one pet ----------
  // steps: { pose, t, rate, at(), walk: [x, y], speed, jitter, lift } in order; done() at the end
  seq(a, steps, done) {
    // scenes that walk somewhere start by getting down from the furniture it is on
    if (a.on && a.state !== 'inbox' && steps.some(s => s.walk)) { a.state = 'hand'; a.hp = { steps: [], i: 0, t: 0 }; return a.leaveSpot(() => this.seq(a, steps, done)); }
    a.walking = false; a.state = 'hand'; a.hp = { steps, i: -1, t: 0, done }; a.timer = 99;
    this.nextStep(a);
  },
  nextStep(a) {
    const P = a.hp; if (!P) return;
    if (a.state !== 'hand') { a.hp = null; return; }
    P.i++; P.t = 0;
    const s = P.steps[P.i];
    if (!s) { a.hp = null; if (a.state === 'hand') { a.state = 'sit'; a.timer = 2 + Math.random() * 2; } if (P.done) P.done(); return; }
    if (s.at) s.at();
    // a walk target can be a function when the place is only known at that moment
    const w = typeof s.walk === 'function' ? s.walk() : s.walk;
    if (w) { if (s.speed) { P.speed0 = a.speed; a.speed = s.speed; } a.walkTo(w[0], w[1], () => { if (P.speed0) { a.speed = P.speed0; P.speed0 = 0; } if (a.hp === P) this.nextStep(a); }, true); a.state = 'hand'; }
    else if (s.walk) this.nextStep(a);
  },
  petUpdate(a, dt) {
    const P = a.hp; if (!P) { a.state = 'sit'; a.timer = 1; return; }
    if (P.chase) return this.chaseUpdate(a, dt);
    const b=this.brushing;
    if(b?.a===a){b.elapsed+=dt;P.t+=dt;if(b.elapsed>=b.nextAt){b.nextAt+=.5;this.stroke(b,a.x+Math.sin(b.elapsed*8)*6,a.y-9)}return;}
    const s = P.steps[P.i]; if (!s) return;
    if (s.walk) { a.step(dt); return; }
    P.t += dt; if (s.tick) s.tick(P.t, dt);
    if (s.t != null && P.t >= s.t) this.nextStep(a);
  },
  // how a pet in state 'hand' or 'inbox' is drawn; true when handled
  drawPet(c, a) {
    if (a.state === 'inbox') return this.drawInBox(c, a);
    if (a.state !== 'hand' || !a.hp) return false;
    const P = a.hp, s = P.chase ? null : P.steps[P.i];
    let pose = 'sit', f = Math.floor(Room.t * 1.4) % 2, lift = 0, jx = 0;
    if (a.walking) { pose = 'walk'; f = Math.floor(a.anim * 11) % 4; }
    else if (P.chase) { const pc = P.pounce || 0; if (pc > 0.35) { pose = 'stretch'; f = 0; } else if (pc > 0) { pose = 'walk'; f = 1; lift = Math.round(Math.sin(pc / 0.35 * Math.PI) * 6); } else if (P.tired) { pose = 'lie'; f = 0; } }
    else if (s) { pose = s.pose || 'sit'; f = pose === 'look' ? 0 : Math.floor(P.t * (s.rate || 2)) % (pose === 'walk' ? 4 : 2); if (s.jitter) jx = Math.round(Math.sin(P.t * 50) * 1.2); if (s.lift) lift = Math.round(s.lift(P.t)); }
    const d = a.data, cv = petCanvas(a.kind, a.color, pose, f, a.flip, d && d.acc), x = Math.round(a.x) + jx, y = Math.round(a.y);
    c.fillStyle = 'rgba(46,34,48,0.2)'; c.fillRect(x - 6, y - 1, 12, 2);
    c.drawImage(cv, x - Math.floor(cv.width / 2), y - canvasBottom(cv) - lift);
    if(this.brushing?.a===a){const b=this.brushing,brush=SPR.get('t_brush'),bx=Math.round(x+Math.sin(b.elapsed*8)*7-brush.width/2),by=y-18+Math.round(Math.cos(b.elapsed*8));c.drawImage(brush,bx,by);}
    if (P.carry) { const bs = SPR.get('toy_ball'); c.drawImage(bs, x + (a.flip ? -Math.floor(cv.width / 2) + 1 : Math.floor(cv.width / 2) - 5), y - 8 - lift); }
    return true;
  },

  // ---------- A: care ----------
  feed(a, id) {
    const p = a.data; a.flip = this.ptr ? this.ptr[0] < a.x : a.flip;
    const ok = Pets.feed(p.id, id, this.needFor(p.id), { quiet: true }); if (!ok) return;
    this.seq(a, [{ pose: 'groom', rate: 6, t: 1.6, tick: (t) => { if (t > 0.3 && t < 1.4 && Math.random() < 0.08) Room.puff('p_dot', a.x + (a.flip ? -7 : 7), a.y - 6, { vy: -3, grav: 20, max: 0.4 }); } },
      { pose: 'sit', t: 0.5, at: () => { a.happy = 2; this.say(a, I18n.s("u_1052da390b08"), I18n.s("u_e2fe8140cfed")); } }]);
    this.afterUse();
  },
  treat(a) {
    const p = a.data; if (!Life.has('cat_treat')) return this.afterUse();
    this.seq(a, [{ pose: 'beg', rate: 3, t: 1.3, at: () => this.say(a, I18n.s("u_a94af52094f9"), I18n.s("u_3dac12737f3f"), 1.2) },
      { pose: 'groom', rate: 6, t: 0.9, at: () => { if (Pets.feed(p.id, 'cat_treat', this.needFor(p.id), { quiet: true })) { a.happy = 2; Room.puff('p_heart', a.x - 2, a.y - 18, { vy: -9 }); } this.afterUse(); } }]);
  },
  startBrush(a, x) {
    const p = a.data;
    if (!Pets.Z.tools.brush) return this.afterUse();
    const wait = p.brushAt + 20 * 60000 - Date.now(); if (wait > 0) { UI.toast(I18n.s("u_6a9a2cc978d6", [p.name, Math.ceil(wait / 60000)]), 't_brush', 2.6); return; }
    if(this.brushing?.a===a)return;this.cancelBrush();
    this.seq(a, [{ pose: 'sit', t: null }]);
    this.brushing = { a, lastX: x, dir: 0, strokes: 0, elapsed:0, nextAt:.45 };
  },
  stroke(b, x, y) {
    const a = b.a; b.strokes++;
    for (let i = 0; i < 2; i++) Room.puff('p_fur', x - 1 + i * 2, y - 2, { vx: (Math.random() - 0.5) * 10, vy: -6 - Math.random() * 4, max: 0.9, wob: 4, alpha: 0.9 });
    if (b.strokes === 2) this.say(a, I18n.s("u_905e8122e597"), I18n.s("u_5f0615f35f7b"), 1.2);
    if (b.strokes >= 4) {
      this.brushing = null;
      if (Pets.brush(a.data.id)) this.seq(a, [{ pose: 'knead', rate: 3, t: 1.6 }]); else { a.hp = null; a.state = 'sit'; a.timer = 2; }
    }
  },
  bath(a) {
    const p = a.data; if (!Life.has('shampoo')) return this.afterUse();
    a.leaveSpot(() => this.seq(a, [{ pose: 'sit', t: 1.5, at: () => { Pets.bath(p.id, this.needFor(p.id)); this.afterUse(); } },
      { pose: 'shake', rate: 9, t: 1.1, jitter: true, at: () => this.say(a, I18n.s("u_ed243b6dc1aa"), I18n.s("u_ed243b6dc1aa"), 1), tick: () => { if (Math.random() < 0.5) Room.puff('p_drop', a.x - 8 + Math.random() * 16, a.y - 6 - Math.random() * 8, { vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 6, grav: 40, max: 0.6 }); } },
      { pose: 'sit', t: 0.4, at: () => { a.happy = 1.5; } }]));
  },
  medicine(a) {
    const p = a.data;
    if (!p.sick) { UI.toast(I18n.s("u_f2f9255c55b7", [p.name]), 'it_medicine', 2.4); return; }
    if (!Life.has('medicine')) return this.afterUse();
    this.seq(a, [{ pose: 'look', t: 0.7, at: () => this.say(a, I18n.s("u_199d2882c9a5"), I18n.s("u_199d2882c9a5"), 1) },
      { pose: 'groom', rate: 4, t: 0.8, at: () => { Pets.medicine(p.id); this.afterUse(); } }]);
  },

  // ---------- B: play ----------
  wandMove(x, y, chosen) {
    if (this.chaser||!chosen) return;
    const a = chosen; if (!a || this.busy(a)) return;
    const p = a.data, why = Pets.why(p, 'play'); if (why) { if (!this.wandNag) { this.wandNag = true; UI.toast(why, 't_wand', 2.6); } return; }
    this.chaser = a;
    a.leaveSpot(() => { if (this.chaser !== a) return; a.walking = false; a.state = 'hand'; a.hp = { chase: true, t: 0, play: 0, counted: false, pounce: 0, lazy: p.trait === 'sleepy' || p.energy < 30 }; });
  },
  chaseUpdate(a, dt) {
    const P = a.hp; P.t += dt;
    const idle = performance.now() - this.ptrAt > 2600, held = HAND[this.held] === 'wand' && this.ptr;
    if (!held || idle || P.t > 12 || (P.tired && P.t > P.tiredAt + 2)) return this.endChase();
    if (P.tired) return;
    const [px, py] = this.ptr, ty = Math.max(104, Math.min(167, py + 6)), [xa, xb] = floorX(ty), tx = Math.max(xa + 6, Math.min(xb - 6, px));
    const d = Math.hypot(tx - a.x, ty - a.y);
    if (P.pounce > 0) { P.pounce -= dt; if (P.pounce <= 0.35 && P.pounce + dt > 0.35) { a.x += (tx - a.x) * 0.5; a.y += (ty - a.y) * 0.5; Room.puff('p_spark', tx, ty - 4, { vy: -5, max: 0.4 }); } return; }
    if (d > 7) { a.tx = tx; a.ty = ty; a.walking = true; a.speed = P.lazy ? 24 : 46; a.onArrive = null; a.step(dt); }
    else { a.walking = false; if (Math.random() < dt * 1.6) { P.pounce = 0.6; a.flip = tx < a.x; } }
    if (d < 45 && !idle) P.play += dt;
    if (P.lazy && P.play > 1.6 && !P.tired) { P.tired = true; P.tiredAt = P.t; a.walking = false; this.say(a, I18n.s("u_7f0eac826da2"), I18n.s("u_45b00ab7e88b"), 1.5); }
    if (!P.counted && P.play > 2.6) {
      P.counted = true;
      if (Pets.play(a.data.id, 'wand', this.needFor(a.data.id), { quiet: true })) { a.happy = 2; Room.puff('p_heart', a.x - 2, a.y - 18, { vy: -9 }); }
      else { P.tired = true; P.tiredAt = P.t; }
    }
  },
  endChase() {
    const a = this.chaser; this.chaser = null; this.wandNag = false;
    if (a && a.hp && a.hp.chase) { a.hp = null; a.walking = false; a.speed = a.baseSpeed(); a.state = 'sit'; a.timer = 2.5; }
  },
  // throwing a ball / rolling yarn / scattering catnip onto the floor
  throwToy(k, x, y) {
    if (this.toy) { UI.toast(I18n.s("u_d3b5a99c8dde"), this.spr(this.held), 1.8); return; }
    if (y < 100) { UI.toast(HAND_HINT[k], this.spr(this.held), 2); return; }
    const a = this.player(x, y); if (!a) { UI.toast(I18n.s("u_a0a987c5f9e4"), this.spr(this.held), 2); return; }
    if (this.busy(a)) { this.say(a, I18n.s("u_9672d1022225"), I18n.s("u_f8b30a7f815b"), 1.2); return; }
    const p = a.data, why = Pets.why(p, 'play'); if (why) { UI.toast(why, this.spr(this.held), 2.6); return; }
    if (k === 'nip' && !Life.has('catnip')) return this.afterUse();
    const [xa, xb] = floorX(y), X = Math.max(xa + 6, Math.min(xb - 6, x)), Y = Math.min(166, y);
    const A = Game.avatar, from = A ? [A.x, A.y - 8] : [X, Y - 20];
    const toy = this.toy = new PetToy(k, from, [X, Y]); Room.actors.push(toy);
    const id = this.held, need = this.needFor(p.id), done = () => { toy.fade = 2.5; };
    const count = () => { if (Pets.play(p.id, k === 'nip' ? 'catnip' : id, need, { quiet: true })) { a.happy = 2; Room.puff('p_heart', a.x - 2, a.y - 18, { vy: -9 }); } this.afterUse(); };
    a.leaveSpot(() => {
      const near = (dx) => [Math.max(xa + 6, Math.min(xb - 6, X + dx)), Y];
      if (k === 'ball' && a.kind === 'dog') {
        const home = A ? [A.x + (A.x > 120 ? -11 : 11), Math.min(167, A.y + 2)] : near(-30);
        this.seq(a, [{ pose: 'sit', t: 0.65 }, { walk: [X, Y], speed: 52 }, { pose: 'groom', rate: 5, t: 0.35, at: () => { toy.held = a; a.hp.carry = true; } },
          { walk: home, speed: 40 }, { pose: 'sit', t: 0.9, at: () => { a.hp.carry = false; toy.held = null; toy.land(a.x + (a.flip ? -7 : 7), a.y); this.say(a, I18n.s("u_0d29b23cb0d5"), I18n.s("u_0d29b23cb0d5"), 1.6); if (A) a.flip = A.x < a.x; count(); } }], done);
      } else if (k === 'ball' || (k === 'yarn' && a.kind === 'dog')) {
        // cats pat the ball away, dogs nudge the yarn along
        const push = (dist) => ({ pose: 'look', t: 0.4, at: () => { const d = (a.flip ? -1 : 1) * dist; toy.roll(near(d)); } });
        this.seq(a, [{ pose: 'sit', t: 0.6 }, { walk: near(a.x < X ? -8 : 8), speed: 44 }, push(22), { walk: () => near(0), speed: 40 }, push(16), { pose: 'sit', t: 0.8, at: count }], done);
      } else if (k === 'yarn') {
        this.seq(a, [{ pose: 'sit', t: 0.6 }, { walk: near(a.x < X ? -6 : 6), speed: 46 }, { pose: 'belly', rate: 4, t: 2.6, at: () => { toy.held = a; toy.hug = true; } }, { pose: 'sit', t: 0.6, at: () => { toy.held = null; toy.hug = false; toy.land(a.x + 6, a.y); count(); } }], done);
      } else { // catnip
        this.seq(a, [{ pose: 'look', t: 0.8 }, { walk: near(0), speed: 34 },
          a.kind === 'cat' ? { pose: 'belly', rate: 3, t: 3.2, tick: (t, dt) => { if (Math.random() < dt * 1.2) Room.puff('p_heart', a.x - 2, a.y - 14, { vy: -8, max: 1 }); } }
            : { pose: 'look', t: 1.2, at: () => this.say(a, '', I18n.s("u_9dae53e56128"), 1.2) },
          { pose: 'sit', t: 0.5, at: () => { count(); toy.fade = 0.8; } }], done);
      }
    });
  },

  // ---------- C: furniture ----------
  isSoft(it) { const d = it && ITEMS[it.k]; return !!d && (d.soft || d.bed || ['cushion', 'zabuton', 'beanbag', 'yarn_basket', 'futon'].includes(it.k) || d.fam === 'sofa'); },
  free(it, a) { return !(Game.pets || []).some(o => o !== a && (o.on === it || o.target === it.uid)); },
  // a free-time choice; returns true when something started
  think(a, go) {
    const p = a.data; if (!p) return false; const items = Room.state.items.filter(i => i.p == null && ITEMS[i.k]);
    // new furniture: every pet goes to have a sniff once
    const fresh = (PetAI.recent || []).find(x => !x.by.has(a.pid) && Room.uidMap[x.uid] && Date.now() - x.at < 15 * 60e3);
    if (fresh && Math.random() < 0.7) { fresh.by.add(a.pid); return go(() => this.sniff(a, Room.uidMap[fresh.uid])), true; }
    const A = Game.avatar;
    if (a.kind === 'dog' && A && A.state === 'work' && Math.random() < 0.5) return go(() => this.atFeet(a, A)), true;
    if (Math.random() > 0.26) return false;
    const opts = [];
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const boxes = items.filter(i => ITEMS[i.k].petBox && this.free(i, a));
    if (a.kind === 'cat' && boxes.length) opts.push(() => this.intoBox(a, pick(boxes)));
    const posts = items.filter(i => ITEMS[i.k].scratch || i.k === 'cat_tree');
    if (a.kind === 'cat' && posts.length) opts.push(() => { const post = pick(posts), spot = a.spots().find(s => s.it === post); if (ITEMS[post.k].petSteps && spot && this.free(post, a)) a.goSpot(spot, Math.random() < 0.7 ? 'sleep' : 'sit'); else this.scratch(a, post); });
    const rugs = items.filter(i => ITEMS[i.k].layer === 'rug');
    if (rugs.length) opts.push(() => this.rugRoll(a, pick(rugs)));
    const plants = items.filter(i => ITEMS[i.k].cat === 'plant' && ITEMS[i.k].layer === 'floor');
    if (a.kind === 'cat' && plants.length) opts.push(() => this.patPlant(a, pick(plants)));
    const softs = items.filter(i => this.isSoft(i) && ITEMS[i.k].petSpot && this.free(i, a));
    if (a.kind === 'dog' && Pets.Z.tools.ball && softs.length && !this.toy) opts.push(() => this.carryToBed(a, pick(softs)));
    const fav = this.favSpot(p), favIt = fav && items.find(i => i.k === fav && this.free(i, a) && (ITEMS[i.k].petSpot || ITEMS[i.k].bed));
    if (favIt) opts.push(() => { const s = a.spots().find(s => s.it === favIt); if (s) a.goSpot(s, Math.random() < 0.6 ? 'sleep' : 'sit'); else a.state = 'sit'; });
    if (!opts.length) return false;
    go(pick(opts)); return true;
  },
  front(it, dx = 0, dy = 3) { const [w, h] = itemSize(it); const y = Math.min(167, it.y + h + dy), [xa, xb] = floorX(y); return [Math.max(xa + 6, Math.min(xb - 6, it.x + w / 2 + dx)), y]; },
  sniff(a, it) {
    const [w] = itemSize(it), L = this.front(it, -w / 2 - 6, 2), R = this.front(it, w / 2 + 6, 2), C = this.front(it, 0, 4);
    this.seq(a, [{ walk: L }, { pose: 'look', t: 0.8, at: () => { a.flip = false; this.say(a, I18n.s("u_aa2df6f1bc91"), I18n.s("u_aa2df6f1bc91"), 1.2); } }, { walk: C }, { walk: R }, { pose: 'look', t: 0.7, at: () => { a.flip = true; } }]);
  },
  atFeet(a, A) {
    const y = Math.min(167, A.y + 3), [xa, xb] = floorX(y), x = Math.max(xa + 8, Math.min(xb - 8, A.x + (A.x > 120 ? -13 : 13)));
    a.state = 'walk'; a.walkTo(x, y, () => { a.flip = A.x < a.x; a.state = 'sleep'; a.timer = 25 + Math.random() * 25; PetAI.sleepSpin && PetAI.sleepSpin(a); });
  },
  intoBox(a, box) {
    const [w, h] = itemSize(box), sp = ITEMS[box.k].petBox, fx = box.x + (box.flip ? w - sp.x : sp.x), fy = Math.min(167, box.y + h + 3);
    a.state = 'walk'; a.target = box.uid;
    a.walkTo(fx, fy, () => {
      a.target = null; if (!Room.uidMap[box.uid] || !this.free(box, a)) { a.state = 'sit'; a.timer = 2; return; }
      a.startJump(fx, box.y + sp.y, () => {
        a.on = box; a.onOff = [fx - box.x, sp.y]; a.state = 'inbox'; a.timer = 9 + Math.random() * 9; a.boxNap = Math.random() < 0.35;
        this.say(a, I18n.s("u_8cf360cf0d09"), I18n.s("u_28452697f131"), 1);
      }, 9);
    }, true);
  },
  // only the head shows above the front of the box
  drawInBox(c, a) {
    const box = a.on; if (!box || !Room.uidMap[box.uid]) { a.state = 'sit'; return false; }
    const d = a.data, nap = a.boxNap && a.timer < 7, cv = petCanvas(a.kind, a.color, nap ? 'sleep' : 'sit', nap ? Math.floor(Room.t * 0.8) % 2 : Math.floor(Room.t * 1.4) % 2, a.flip, d && d.acc);
    const x = Math.round(a.x), y = Math.round(a.y) - (nap ? 2 : 0);
    c.drawImage(cv, x - Math.floor(cv.width / 2), y - canvasBottom(cv));
    const bc = Room.itemCanvas(box), rim = 7; c.drawImage(bc, 0, rim, bc.width, bc.height - rim, box.x, box.y + rim, bc.width, bc.height - rim);
    return true;
  },
  boxUpdate(a, dt) {
    if (!a.on || !Room.uidMap[a.on.uid]) { a.on = null; a.state = 'sit'; return; }
    a.x = a.on.x + a.onOff[0]; a.y = a.on.y + a.onOff[1];
    a.timer -= dt; if (a.timer <= 0) { a.boxNap = false; a.leaveSpot(() => { a.state = 'sit'; a.timer = 2; }); }
  },
  scratch(a, post) {
    const [w, h] = itemSize(post), y = Math.min(167, post.y + h - 1), [xa] = floorX(y), x = Math.max(xa + 6, post.x + Math.floor(w / 2) - 9);
    this.seq(a, [{ walk: [x, y] }, { pose: 'scratch', rate: 7, t: 2.6, at: () => { a.flip = false; }, tick: (t, dt) => { if (Math.random() < dt * 6) Room.puff('p_dot', a.x + 8, a.y - 10 - Math.random() * 6, { vx: 4, vy: -2, grav: 20, max: 0.4 }); if (Math.random() < dt * 2) post.shake = 0.2; } },
      { pose: 'sit', t: 0.6, at: () => { a.happy = 1.5; } }]);
  },
  rugRoll(a, rug) {
    const [w, h] = itemSize(rug), y = Math.min(166, rug.y + h * (0.45 + Math.random() * 0.3)), [xa, xb] = floorX(y), x = Math.max(xa + 8, Math.min(xb - 8, rug.x + w * (0.25 + Math.random() * 0.5)));
    this.seq(a, [{ walk: [x, y] }, { pose: 'belly', rate: 3, t: 2.8, at: () => this.say(a, I18n.s("u_c5dcf13f646c"), I18n.s("u_3fd17e9ffa52"), 1.2), tick: (t, dt) => { if (Math.random() < dt * 0.8) Room.puff('p_heart', a.x - 2, a.y - 12, { vy: -7, max: 0.9 }); } }, { pose: 'sit', t: 0.4 }]);
  },
  patPlant(a, pl) {
    const [w, h] = itemSize(pl), y = Math.min(167, pl.y + h + 2), [xa] = floorX(y), x = Math.max(xa + 6, pl.x - 6);
    this.seq(a, [{ walk: [x, y] }, { pose: 'look', t: 1.0, at: () => { a.flip = false; } },
      { pose: 'knead', rate: 6, t: 0.6, at: () => { pl.shake = 0.35; Room.puff('p_leaf', pl.x + w / 2, pl.y + 6, { vx: -6, vy: -2, grav: 12, max: 1.2 }); } }, { pose: 'sit', t: 0.6 }]);
  },
  carryToBed(a, bed) {
    const [x0, y0] = randFloor(14), toy = this.toy = new PetToy('ball', [x0, y0], [x0, y0]); toy.t = 1; Room.actors.push(toy);
    const s = a.spots().find(q => q.it === bed), [fx, fy] = this.front(bed, 6, 3);
    this.seq(a, [{ walk: [x0 + 4, y0] }, { pose: 'groom', rate: 5, t: 0.4, at: () => { toy.held = a; a.hp.carry = true; } }, { walk: [fx, fy] },
      { pose: 'sit', t: 0.5, at: () => { a.hp.carry = false; toy.held = null; toy.land(fx + 6, fy); toy.fade = 25; } }], () => { if (s && this.free(bed, a)) a.goSpot(s, 'sleep', 30 + Math.random() * 20); });
  },
  // favourite spot: the furniture it has spent the most time on (at least 2 minutes)
  noteSpot(a, dt) { const p = a.data; if (!p || !a.on || !Room.uidMap[a.on.uid]) return; const k = a.on.k; p.spotT = p.spotT || {}; p.spotT[k] = Math.min(1e7, (p.spotT[k] || 0) + dt); },
  favSpot(p) { let best = null, bt = 120; for (const k in p.spotT || {}) if (ITEMS[k] && p.spotT[k] > bt) { bt = p.spotT[k]; best = k; } return best; },

  // ---------- cursor, hint, tray ----------
  cursor(pt) {
    let el = this._cur;
    if (!this.held || !pt) { if (el) el.hidden = true; if (Room.cv) Room.cv.style.cursor = ''; return; }
    if (!el || el.dataset.id !== this.held) { if (el) el.remove(); el = this._cur = h('div', { class: 'hand-cur' }, ico(this.spr(this.held), 30)); el.dataset.id = this.held; UI.overlay.append(el); }
    // while a pet is eating, taking medicine or shaking off right under the pointer, the held item steps aside so the pet stays visible
    const busyHere = !this.brushing && this.pets().some(q => q.state === 'hand' && q.hp && !q.hp.chase && Math.hypot(q.x - pt[0], (q.y - 7 - pt[1]) * 1.3) < 16);
    if (busyHere) { el.hidden = true; if (Room.cv) Room.cv.style.cursor = ''; return; }
    // the wand: its feather is drawn in the room at the pointer, so that is the only one shown
    if (HAND[this.held] === 'wand') { el.hidden = true; if (Room.cv) Room.cv.style.cursor = 'none'; return; }
    el.hidden = false; const s = Game.scale; el.style.transform = `translate(${Math.round(pt[0] * s)}px, ${Math.round(pt[1] * s)}px) translate(-35%, -75%)`;
    if (Room.cv) Room.cv.style.cursor = 'none';
  },
  showHint() {
    let el = this._hint;
    if (!this.held) { if (el) el.hidden = true; return; }
    if (!el) { el = this._hint = h('div', { class: 'hand-hint' }); UI.overlay.append(el); }
    el.hidden = false; el.replaceChildren(ico(this.spr(this.held), 20), h('span', { text: I18n.s("u_eedf1350189c", [this.name(this.held), HAND_HINT[HAND[this.held]]]) }), h('button', { class: 'chip sm', onclick: () => this.drop() }, I18n.s("u_e0f2d3ead59c")));
  },
  renderTray() {
    const wrap = document.querySelector('.room-wrap'); if (!wrap) return;
    let el = this._tray; if (!el) { el = this._tray = h('div', { class: 'handtray' }); wrap.append(el); }
    const toggle = h('button', { class: 'chip sm handtray-t' + (this.trayOpen ? ' on' : ''), 'aria-expanded': this.trayOpen ? 'true' : 'false', title: I18n.s("u_2ba281181e83"), onclick: () => { this.trayOpen = !this.trayOpen; if (!this.trayOpen && this.held) this.drop(); this.renderTray(); } }, ico('i_paw', 18), I18n.s("u_30691e0f6ca5"));
    if (!this.trayOpen || Room.edit) { el.replaceChildren(toggle); return; }
    const btns = Object.keys(HAND).map(id => {
      const own = this.owned(id), n = PET_TOOLS[id] ? null : (Life.L.bag[id] || 0);
      return h('button', { class: 'handbtn' + (this.held === id ? ' on' : '') + (own ? '' : ' none'), title: `${this.name(id)}：${HAND_HINT[HAND[id]]}` + (own ? '' : PET_TOOLS[id] ? I18n.s("u_e259191dbdc3") : I18n.s("u_b5c19b33ebfa")), onclick: () => this.held === id ? this.drop() : this.pick(id) },
        ico(this.spr(id), 24), n != null ? h('em', { class: 'num', text: String(n) }) : null);
    });
    el.replaceChildren(toggle, h('div', { class: 'handtray-row' }, ...btns));
  },
};

/* a toy lying on (or rolling over) the floor; lives in Room.actors so it is drawn in depth order */
class PetToy {
  constructor(k, from, to) { this.k = k; this.x0 = from[0]; this.y0 = from[1]; this.x = to[0]; this.y = to[1]; this.tx = to[0]; this.ty = to[1]; this.t = 0; this.held = null; this.fade = 0; this.spin = 0;
    if (k === 'nip') { this.t = 1; for (let i = 0; i < 6; i++) Room.puff('p_leaf', to[0] - 4 + Math.random() * 8, to[1] - 4, { vx: (Math.random() - 0.5) * 8, vy: -4, grav: 14, max: 0.9 }); } }
  z() { return this.y + 0.02; }
  hit() { return false; }
  land(x, y) { this.x0 = this.x; this.y0 = this.y - 4; this.tx = x; this.ty = y; this.t = 0.4; }
  roll(to) { this.x0 = this.x; this.y0 = this.y; this.tx = to[0]; this.ty = to[1]; this.t = 0.5; this.rolling = true; }
  update(dt) {
    if (this.held) { const a = this.held; this.x = a.x + (this.hug ? 0 : a.flip ? -8 : 8); this.y = a.y; return; }
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / (this.rolling ? 0.7 : 0.6)); const k = this.t, e = this.rolling ? 1 - (1 - k) * (1 - k) : k;
      this.x = this.x0 + (this.tx - this.x0) * e; this.y = this.y0 + (this.ty - this.y0) * e - (this.rolling ? 0 : Math.sin(k * Math.PI) * 14 * (1 - k * 0.5));
      this.spin += dt * 12; if (this.t >= 1) this.rolling = false;
    }
    if (this.fade > 0) { this.fade -= dt; if (this.fade <= 0) this.remove(); }
  }
  remove() { const i = Room.actors.indexOf(this); if (i >= 0) Room.actors.splice(i, 1); if (PetPlay.toy === this) PetPlay.toy = null; }
  draw(c) {
    const spr = this.k === 'ball' ? 'toy_ball' : this.k === 'yarn' ? 'toy_yarn' : 'toy_nip', cv = SPR.get(spr);
    if (this.held && !this.hug && this.k === 'ball') return;   // carried in the mouth: drawn with the pet
    const x = Math.round(this.x - cv.width / 2), y = Math.round(this.y - cv.height + (this.k === 'nip' ? 2 : 0));
    if (this.k !== 'nip') { c.fillStyle = 'rgba(46,34,48,0.18)'; c.fillRect(Math.round(this.x) - 2, Math.round(this.ty) - 1, 5, 1); }
    c.globalAlpha = this.fade > 0 && this.fade < 0.8 ? this.fade / 0.8 : 1; c.drawImage(cv, x, y); c.globalAlpha = 1;
  }
}

// the wand's feather follows the pointer inside the room (drawn over everything, it is in your hand)
(function () {
  const render = Room.render.bind(Room);
  Room.render = function (dt) {
    render(dt);
    if (PetPlay.held && PetPlay.ptrIn) PetPlay.cursor(PetPlay.ptr);
    if (HAND[PetPlay.held] === 'wand' && PetPlay.ptr && PetPlay.ptrIn && !Room.edit && !(Mobile.on || Mobile.touch)) { const f = SPR.get('toy_feather'), [x, y] = PetPlay.ptr, sw = Math.round(Math.sin(Room.t * 9) * 1.5); this.ctx.drawImage(f, Math.round(x - 2 + sw), Math.round(y - 7)); }
  };
})();
document.addEventListener('keydown', e => { if (e.key === 'Escape' && PetPlay.held) PetPlay.drop(); });

// the tray's counts follow the bag (refreshes of the pet and storage windows happen whenever something is used or bought)
(function () { const refresh = UI.refresh.bind(UI); UI.refresh = function (id) { refresh(id); if ((id === 'pet' || id === 'storage' || id === 'shop') && PetPlay._tray) PetPlay.renderTray(); }; })();
