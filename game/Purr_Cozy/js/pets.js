const BOWL_MAX = 3;
/* ============================================================
   Pets: several pets at once, growth, personality, care,
   tricks (trained with vocabulary quizzes), accessories
   ============================================================ */
const PET_MAX = 10, PET_ROOM_MAX = 5, PET_LV_MAX = 20;
const TRAITS = {
  glutton: { n: I18n.s("u_e69332f71cac"), d: I18n.s("u_439754628689") },
  clingy: { n: I18n.s("u_edd70324940b"), d: I18n.s("u_962999154f61") },
  playful: { n: I18n.s("u_96ebfa873e0c"), d: I18n.s("u_990a37d01c0b") },
  sleepy: { n: I18n.s("u_2dc659fad08f"), d: I18n.s("u_ea14e76d9113") },
  neat: { n: I18n.s("u_2748b9dcff24"), d: I18n.s("u_2d5966d79f1d") },
  curious: { n: I18n.s("u_0fec78517d69"), d: I18n.s("u_7253352db77b") },
};
const PET_FOODS = {
  cat_can: { hunger: 45, mood: 5, xp: 4, bond: 3 },
  fish_snack: { hunger: 20, mood: 8, xp: 3, bond: 3 },
  premium_food: { hunger: 70, mood: 15, energy: 10, xp: 8, bond: 5 },
  cat_treat: { hunger: 5, mood: 12, xp: 3, bond: 6 },
};
const PET_TOOLS = {
  brush: { n: I18n.s("u_fd5d96b3d730"), spr: 't_brush', price: 80, desc: I18n.s("u_a6cb5fb1e5c0") },
  wand: { n: I18n.s("u_d3e9d266480c"), spr: 't_wand', price: 120, toy: { mood: 18, energy: 20 }, desc: I18n.s("u_d6aa2d6dee2d") },
  yarn: { n: I18n.s("u_ce96f2f0503d"), spr: 't_yarn', price: 90, toy: { mood: 15, energy: 15 }, desc: I18n.s("u_3cdf73f316cf") },
  ball: { n: I18n.s("u_d52ef93e34f7"), spr: 't_ball', price: 90, toy: { mood: 16, energy: 18 }, desc: I18n.s("u_548f0f8f7a35") },
};
const PET_TOYS = ['wand', 'yarn', 'ball', 'catnip'];
const TRICKS = [
  { id: 'sit', n: I18n.s("u_30d4711445a2"), lv: 1, need: 3, d: I18n.s("u_6e8e785cd0fb") },
  { id: 'paw', n: I18n.s("u_14abb8137a3f"), lv: 3, need: 4, d: I18n.s("u_c956372a455f") },
  { id: 'spin', n: I18n.s("u_774991881f96"), lv: 5, need: 5, d: I18n.s("u_ce43bbb6dd58") },
  { id: 'backflip', n: I18n.s("u_de56bb071e4b"), lv: 7, need: 5, d: I18n.s("u_0e970f590e7d") },
  { id: 'bang', n: I18n.s("u_4955c0a8ab35"), lv: 9, need: 6, d: I18n.s("u_12d03dacf5c1") },
  { id: 'jordan', n: I18n.s("u_0964f79e80c3"), lv: 11, need: 6, d: I18n.s("u_bd99c0217878") },
  { id: 'firering', n: I18n.s("u_fb3d722d361b"), lv: 13, need: 7, d: I18n.s("u_86ee836da95f") },
  { id: 'moonlean', n: I18n.s("u_3eee5cc1df69"), lv: 15, need: 8, d: I18n.s("u_875ce92f2275") },
];
// older saves: the three tricks that were replaced keep their training progress
const TRICK_RENAME = { roll: 'backflip', jump: 'jordan', dance: 'moonlean' };
const PET_ACCS = {
  collar_red: { n: I18n.s("u_04c02e1e61b2"), slot: 'neck', price: 60, lv: 1, c: ['r', 'q'] },
  collar_blue: { n: I18n.s("u_841b3a59451a"), slot: 'neck', price: 60, lv: 1, c: ['n', 'm'] },
  collar_mint: { n: I18n.s("u_ecf8ba110b16"), slot: 'neck', price: 60, lv: 2, c: ['k', 'j'] },
  bell: { n: I18n.s("u_5be6ca47abf3"), slot: 'neck', price: 120, lv: 3, c: ['r', 'q'], bell: true },
  bandana: { n: I18n.s("u_dedda38a3bb3"), slot: 'neck', price: 140, lv: 5, c: ['S', 'R'], wide: true },
  bow: { n: I18n.s("u_f207987c7b46"), slot: 'head', price: 90, lv: 2, pat: ['s.s', 'sqs'] },
  flower: { n: I18n.s("u_142272c44dc7"), slot: 'head', price: 90, lv: 4, pat: ['.f.', 'fwf', '.f.'], dy: -1 },
  crown: { n: I18n.s("u_c75e00323501"), slot: 'head', price: 220, lv: 10, pat: ['x.x', 'wxw'], crown: true },
};
const DOG_TO_CAT = { 'dog:shiba': 'cat:ginger', 'dog:sesame': 'cat:cocoa', 'dog:cream': 'cat:snow', 'dog:coal': 'cat:ink' };
const PET_NAMES = { cat: [I18n.s("u_cb9eb5933024"), I18n.s("u_61b00e1b08a4"), I18n.s("u_2872b3af058c"), I18n.s("u_cf083eceef5e"), I18n.s("u_54b77038f0df"), I18n.s("u_e0df14af49c7"), I18n.s("u_37e1d7f35f3b"), I18n.s("u_d3e6d492301e"), I18n.s("u_936083f90a83"), I18n.s("u_6ba13b79bff9"), I18n.s("u_06d4490e6c4c"), I18n.s("u_60561479a056")], dog: [I18n.s("u_c709eb8f26d0"), I18n.s("u_10cb79937328"), I18n.s("u_984bc4634c64"), I18n.s("u_1a92b0645195"), I18n.s("u_1814a9293e8f"), I18n.s("u_8dcc854742a2"), I18n.s("u_bc22f74566b4"), I18n.s("u_054b35e9c982"), I18n.s("u_7739ff2ac7a8"), I18n.s("u_854b0ec8b4cf")] };
const STAGE_NAMES = { cat: [I18n.s("u_fd9d62516ce5"), I18n.s("u_96b55bcc8ba3"), I18n.s("u_129e98fe69d8")], dog: [I18n.s("u_8430a3a40485"), I18n.s("u_37028207fb5c"), I18n.s("u_6562ab608a76")] };

// ---------- accessory drawing ----------
const _row = (y, x0, x1) => { const o = []; for (let x = x0; x <= x1; x++) o.push([x, y]); return o; };
const _col = (x, y0, y1) => { const o = []; for (let y = y0; y <= y1; y++) o.push([x, y]); return o; };
const ACC_ANCHOR = {
  cat: {
    sit: { neck: _row(8, 5, 12), dir: [0, 1], bell: [9, 9], head: [13, 0], crown: [9, 0] },
    walk: { neck: _col(12, 6, 10), dir: [-1, 0], bell: [12, 11], head: [18, 1], crown: [15, 2] },
    sleep: { neck: _col(12, 8, 12), dir: [-1, 0], bell: [11, 12], head: [17, 4], crown: [14, 5] },
    stretch: { neck: _col(13, 8, 12), dir: [-1, 0], bell: [13, 12], head: [18, 3], crown: [15, 5] },
  },
  dog: {
    sit: { neck: _row(8, 9, 15), dir: [0, 1], bell: [12, 9], head: [15, 0], crown: [11, 0] },
    walk: { neck: _col(14, 6, 10), dir: [-1, 0], bell: [14, 11], head: [19, 0], crown: [16, 1] },
    sleep: { neck: _col(14, 9, 13), dir: [-1, 0], bell: [13, 13], head: [19, 5], crown: [16, 6] },
    stretch: { neck: _col(14, 9, 13), dir: [-1, 0], bell: [14, 14], head: [19, 4], crown: [16, 5] },
  },
};
function applyPetAcc(g, kind, pose, acc) {
  const ap = ['look', 'groom', 'knead', 'beg', 'shake', 'yawn', 'stare'].includes(pose) ? 'sit' : pose === 'lie' ? 'sleep' : pose;
  const A = ACC_ANCHOR[kind] && ACC_ANCHOR[kind][ap]; if (!A || !acc) return g;
  g = g.clone();
  const inside = (x, y) => { const c = g.get(x, y); return c && c !== '.' && c !== '0'; };
  const stamp = (x0, y0, rows) => {
    const put = [];
    rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') { const x = x0 + i, y = y0 + j; if (x >= 0 && y >= 0 && x < g.w && y < g.h) { g.px(x, y, c); put.push([x, y]); } } }));
    for (const [x, y] of put) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.get(nx, ny) === '.') g.px(nx, ny, '0'); }
  };
  const n = acc.neck && PET_ACCS[acc.neck];
  if (n) {
    A.neck.forEach(([x, y], i) => { if (inside(x, y)) g.px(x, y, n.wide ? n.c[i % 2] : n.c[0]); });
    if (n.wide) A.neck.forEach(([x, y], i) => { const X = x + A.dir[0], Y = y + A.dir[1]; if (inside(X, Y)) g.px(X, Y, n.c[(i + 1) % 2]); });
    if (n.bell) stamp(A.bell[0], A.bell[1], ['w']);
  }
  const hd = acc.head && PET_ACCS[acc.head];
  if (hd) { const [x, y] = hd.crown ? A.crown : A.head; stamp(x, y + (hd.dy || 0), hd.pat); }
  return g;
}

const Pets = {
  get Z() { return Game.S.zoo; },
  newState() { return { pets: [], nid: 1, sel: 0, tools: {}, accs: {} }; },
  make(Z, sp, name) {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const kind = sp.split(':')[0], used = new Set(Z.pets.map(p => p.name));
    const free = PET_NAMES[kind].filter(n => !used.has(n));
    return {
      id: Z.nid++, sp, name: name || (free.length ? pick(free) : PETS[sp].n + Z.nid), at: Date.now(),
      lv: 1, xp: 0, hunger: 80, mood: 75, clean: 85, energy: 85, bond: 0, blv: 1,
      trait: pick(Object.keys(TRAITS)), fav: { food: pick(Object.keys(PET_FOODS)), toy: pick(PET_TOYS) }, known: {},
      tricks: {}, acc: {}, home: true, sick: false, low: 0, day: { d: '', pet: 0, show: {} }, gift: '', brushAt: 0,
      st: { fed: 0, play: 0, groom: 0, train: 0, pet: 0 },
    };
  },
  migrate(S) {
    if (S.zoo && Array.isArray(S.zoo.pets)) {
      const base = this.newState(); for (const k in base) if (!(k in S.zoo)) S.zoo[k] = base[k];
      const tpl = this.make({ pets: [], nid: 0 }, 'cat:ginger');
      for (const p of S.zoo.pets) {
        for (const k in tpl) if (!(k in p)) p[k] = JSON.parse(JSON.stringify(tpl[k]));
        // cats only now: a dog becomes the cat of the nearest colour, keeping its name, level, bond and tricks
        if (!PETS[p.sp]) { const to = DOG_TO_CAT[p.sp] || 'cat:ginger'; if (String(p.sp).startsWith('dog:')) (S.zoo.dogsGone = S.zoo.dogsGone || []).push(p.name); p.sp = to; }
        for (const o in TRICK_RENAME) if (p.tricks[o] != null) { const n = TRICK_RENAME[o], t = TRICKS.find(x => x.id === n); p.tricks[n] = Math.min(t.need, Math.max(p.tricks[n] || 0, p.tricks[o])); delete p.tricks[o]; }
      }
      if (!S.zoo.pets.length) S.zoo.pets.push(this.make(S.zoo, 'cat:ginger', I18n.s("u_cb9eb5933024")));
      return;
    }
    const Z = S.zoo = this.newState(), old = (S.life && S.life.pet) || {};
    const list = [S.pet || 'cat:ginger', ...(S.pets || []).filter(id => id !== S.pet)].filter(id => PETS[id]);
    if (!list.length) list.push('cat:ginger');
    list.slice(0, PET_MAX).forEach((sp, i) => {
      const p = this.make(Z, sp, i === 0 ? (S.petName || I18n.s("u_cb9eb5933024")) : null);
      if (i === 0) { if (old.hunger != null) p.hunger = old.hunger; if (old.mood != null) p.mood = old.mood; p.bond = old.bond || 0; p.blv = old.lv || 1; p.lv = Math.min(PET_LV_MAX, 1 + Math.max(0, (old.lv || 1) - 1) * 2); }
      p.home = i < PET_ROOM_MAX; Z.pets.push(p);
    });
    Z.sel = Z.pets[0].id;
  },
  list() { return this.Z.pets; },
  home() { return this.Z.pets.filter(p => p.home); },
  get(id) { return this.Z.pets.find(p => p.id === id) || null; },
  name(id) { const p = this.get(id); return p ? p.name : I18n.s("u_5b825353b534"); },
  kind(p) { return p.sp.split(':')[0]; },
  sel() { return this.get(this.Z.sel) || this.home()[0] || this.Z.pets[0]; },
  select(id, tab) { this.Z.sel = id; if (tab) UI.petTab = tab; UI.openWin('pet'); UI.refresh('pet'); },
  actor(p) { return (Game.pets || []).find(a => a.pid === (p && p.id)); },
  stage(p) { return p.lv >= 10 ? 2 : p.lv >= 5 ? 1 : 0; },
  stageName(p) { return STAGE_NAMES[this.kind(p)][this.stage(p)]; },
  xpNeed(lv) { return 20 + lv * 12; },
  bondNeed(lv) { return 30 + lv * 20; },
  maxBlv() { return Math.max(1, ...this.Z.pets.map(p => p.blv)); },
  maxLv() { return Math.max(1, ...this.Z.pets.map(p => p.lv)); },
  trickCount() { let n = 0; for (const p of this.Z.pets) for (const t of TRICKS) if (this.knows(p, t.id)) n++; return n; },
  knows(p, tid) { const t = TRICKS.find(x => x.id === tid); return t && (p.tricks[tid] || 0) >= t.need; },
  adoptPrice(sp) { const n = this.Z.pets.length; return n === 0 ? 0 : (PETS[sp].price || 80) + 60 * (n - 1); },
  roomFull() { return this.home().length >= PET_ROOM_MAX; },
  dayReset(p) { const d = Life.today(); if (p.day.d !== d) p.day = { d, pet: 0, show: {} }; },
  say(p, lines) { const a = this.actor(p); if (a) Game.bubble(a, Array.isArray(lines) ? lines[Math.floor(Math.random() * lines.length)] : lines, 2); },
  voice(p, cat, dog) { return this.kind(p) === 'dog' ? dog : cat; },
  puff(p, spr, n = 2) { const a = this.actor(p); if (!a) return; for (let i = 0; i < n; i++) Room.puff(spr, a.x - 4 + i * 4, a.y - 18, { vy: -9 - i * 2, vx: (i - (n - 1) / 2) * 5 }); },

  // ---------- growth ----------
  addXp(p, n) {
    if (p.lv >= PET_LV_MAX || n < 0) return; p.xp += n;
    while (p.lv < PET_LV_MAX && p.xp >= this.xpNeed(p.lv)) {
      if (typeof LevelGate !== 'undefined' && !LevelGate.allowed('pet', p.id, p.lv + 1)) break;
      const st0 = this.stage(p); p.xp -= this.xpNeed(p.lv); p.lv++;
      const c = 8 * p.lv; Game.reward(c, 10, 'raw');
      const st1 = this.stage(p);
      if (st1 !== st0) UI.toast(I18n.s("u_b20062d19ff0", [p.name, this.stageName(p), c]), 'i_paw', 4.5);
      else UI.toast(I18n.s("u_5ca182bf7850", [p.name, p.lv, c]) + (TRICKS.some(t => t.lv === p.lv) ? I18n.s("u_6108861a1f93", [TRICKS.find(t => t.lv === p.lv).n]) : ''), 'i_paw', 4);
      this.puff(p, 'p_spark', 4);
      Life.track('petLv', 1);
    }
    if (typeof LevelGate !== 'undefined') LevelGate.notifyPet(p);
    if (p.lv >= PET_LV_MAX) p.xp = 0;
  },
  addBond(p, n) {
    if (p.trait === 'clingy' && n > 0) n = Math.round(n * 1.5);
    p.bond += n;
    while (p.bond >= this.bondNeed(p.blv)) {
      p.bond -= this.bondNeed(p.blv); p.blv++;
      const c = 15 * p.blv; Game.reward(c, 20, 'raw'); Life.give('cat_treat', 1);
      UI.toast(I18n.s("u_12286ffbdacf", [p.name, p.blv, c]), 'i_heart', 4.5);
      this.puff(p, 'p_heart', 5);
    }
  },
  mood(p, n) { p.mood = clamp100(p.mood + n); if (p.sick) p.mood = Math.min(p.mood, 60); },

  // ---------- food bowls ----------
  // a bowl in the room can belong to one pet; it holds up to BOWL_MAX servings that the pet eats bit by bit
  bowls() { return Room.state.items.filter(i => ITEMS[i.k] && ITEMS[i.k].bowl && i.p == null); },
  bowlLeft(b) { return (b.bq || []).reduce((n, q) => n + q.left, 0); },
  bowlLevel(b) { const n = this.bowlLeft(b); return n >= 60 ? 'full' : n > 20 ? 'half' : n > 0 ? 'low' : ''; },
  bowlOwner(b) { return b.pet != null && this.get(b.pet) ? this.get(b.pet) : null; },
  // who the bowl is kept for right now: its owner while the owner is home; a bowl whose owner is at the pet hotel is shared meanwhile
  bowlUser(b) { const o = this.bowlOwner(b); return o && o.home ? o : null; },
  bowlOf(p) { return this.bowls().find(b => b.pet === p.id) || null; },
  // "whose is this?" for anything in the room that belongs to someone (today: food bowls); null for ordinary items
  ownerTag(it) {
    const d = it && ITEMS[it.k]; if (!d) return null;
    const o = it.pet != null ? this.get(it.pet) : null;
    if (o) return I18n.s("u_308e50ed7d63", [o.name, d.n]) + (o.home ? '' : I18n.s("u_a40faff5ffc9"));
    return d.bowl ? I18n.s("u_54e0463b36e2", [d.n]) : null;
  },
  sharedBowls() { return this.bowls().filter(b => !this.bowlUser(b)); },
  // the bowl this pet eats from: its own while it has food, otherwise a shared one that has food
  bowlFor(p) { const own = this.bowlOf(p); if (own && this.bowlLeft(own) > 0) return own; return this.sharedBowls().find(b => b !== own && this.bowlLeft(b) > 0) || null; },
  // the bowl shown with this pet in the care tab: its own, otherwise the first shared one
  bowlShown(p) { return this.bowlOf(p) || this.sharedBowls()[0] || null; },
  assignBowl(uid, pid) {
    const b = Room.uidMap[uid]; if (!b) return;
    if (pid == null) { delete b.pet; UI.toast(I18n.s("u_68e8d338098a"), 'i_paw', 2.5); }
    else { for (const o of this.bowls()) if (o !== b && o.pet === pid) delete o.pet; b.pet = pid; const p = this.get(pid); UI.toast(I18n.s("u_e28e63b798e9", [p.name]), 'i_paw', 2.5); }
    Game.save(); UI.refresh('pet');
  },
  fillBowl(uid, food) {
    const b = Room.uidMap[uid], f = PET_FOODS[food]; if (!b || !f) return false;
    b.bq = b.bq || [];
    if (b.bq.length >= BOWL_MAX) { UI.toast(I18n.s("u_aaa74e203e02", [BOWL_MAX]), 'i_paw', 2.5); return false; }
    if (!Life.has(food)) { UI.toast(I18n.s("u_a69ae09bed39", [SUPPLIES[food].n]), SUPPLIES[food].spr, 3.5); return false; }
    Life.L.bag[food]--; if (!Life.L.bag[food]) delete Life.L.bag[food];
    b.bq.push({ k: food, left: f.hunger });
    const [w] = itemSize(b); Room.puff('p_spark', b.x + w / 2, b.y - 2, { vy: -6, max: 0.8 });
    Game.save(); UI.refresh('pet'); UI.refresh('storage'); return true;
  },
  // eat up to `max` fullness from the bowl; a serving's mood / growth / bond count once it is finished
  eatFromBowl(p, b, max = 40) {
    if (!p || !b || !b.bq || !b.bq.length) return 0;
    let room = Math.min(max, 100 - p.hunger), ate = 0;
    while (room > 0.5 && b.bq.length) {
      const q = b.bq[0], bite = Math.min(room, q.left); q.left -= bite; room -= bite; ate += bite;
      if (q.left <= 0.5) {
        b.bq.shift(); const f = PET_FOODS[q.k], fav = p.fav.food === q.k ? 1.5 : 1, glut = p.trait === 'glutton' ? 1.2 : 1;
        this.mood(p, Math.round(f.mood * fav * glut)); if (f.energy) p.energy = clamp100(p.energy + f.energy);
        this.addXp(p, f.xp); this.addBond(p, f.bond + (fav > 1 ? 3 : 0)); this.reveal(p, 'food', q.k); p.st.fed++; Life.L.stats.fed++; Life.track('feed', 1);
      }
    }
    if (!b.bq.length) delete b.bq;
    p.hunger = clamp100(p.hunger + ate); this.checkNeeds(p); UI.refresh('pet'); UI.badges(); Game.save();
    return ate;
  },

  tick(mins) {
    const away = mins > 2, k = away ? 0.35 : 1;
    for (const p of this.Z.pets) {
      if (!p.home) { for (const s of ['hunger', 'mood', 'clean', 'energy']) p[s] = Math.max(p[s], Math.min(70, p[s] + mins)); continue; }
      const a = this.actor(p), sleeping = a && a.state === 'sleep';
      const h0 = p.hunger, c0 = p.clean;
      p.hunger = clamp100(p.hunger - mins / 5 * k * (p.trait === 'glutton' ? 1.35 : 1));
      p.clean = clamp100(p.clean - mins / 12 * k * (p.trait === 'neat' ? 0.6 : 1));
      let md = mins / 8 * k * (p.trait === 'clingy' ? 1.2 : 1); if (p.hunger < 20 || p.clean < 20) md *= 1.8;
      p.mood = clamp100(p.mood - md);
      p.energy = clamp100(p.energy + mins * (sleeping ? 1.2 : 0.25) * (p.trait === 'sleepy' ? 1.5 : 1) * (p.sick ? 0.5 : 1));
      if (p.hunger < 45 && (away || !a)) { const b = this.bowlFor(p); if (b) this.eatFromBowl(p, b, 100); }
      if (away) { p.hunger = Math.max(Math.min(h0, 15), p.hunger); p.clean = Math.max(Math.min(c0, 15), p.clean); }
      else {
        if (p.hunger < 10 || p.clean < 10) p.low += mins; else p.low = Math.max(0, p.low - mins);
        if (p.low > 45 && !p.sick) { p.sick = true; p.low = 0; UI.toast(I18n.s("u_657c9bf6b152", [p.name]), 'it_medicine', 4.5); }
      }
      if (p.sick) p.mood = Math.min(p.mood, 60);
    }
  },

  // ---------- care ----------
  why(p, act) {
    if (!p) return I18n.s("u_965fb519513c");
    if (act === 'play' || act === 'train') { if (p.sick) return I18n.s("u_46d5640c30b2", [p.name]); if (p.energy < (act === 'train' ? 25 : 15)) return I18n.s("u_922a90a7a2e6", [p.name]); }
    if (act === 'train' && p.mood < 35) return I18n.s("u_c9293607bd8e", [p.name]);
    return '';
  },
  after(p, ev) { Life.track(ev, 1); this.checkNeeds(p); UI.refresh('pet'); UI.refresh('storage'); UI.refresh('need'); UI.badges(); Game.save(); },
  checkNeeds(p) {
    for (const n of [...Life.L.needs]) {
      if (n.pet !== p.id) continue;
      if (n.type === 'cat_hungry' && p.hunger >= 60) Life.complete(n);
      else if (n.type === 'cat_play' && p.mood >= 50) Life.complete(n);
      else if (n.type === 'pet_dirty' && p.clean >= 60) Life.complete(n);
      else if (n.type === 'pet_sick' && !p.sick) Life.complete(n);
    }
  },
  reveal(p, what, id) {
    if (p.fav[what] !== id || p.known[what]) return '';
    p.known[what] = true; const nm = what === 'food' ? SUPPLIES[id].n : (PET_TOOLS[id] || SUPPLIES[id]).n;
    UI.toast(I18n.s("u_abdbc7042fce", [p.name, what === 'food' ? I18n.s("u_ab2775f0d353") : I18n.s("u_6d29c1279635"), nm]), 'i_heart', 4); return nm;
  },
  // opts.quiet: the caller animates the pet itself (feeding by hand)
  feed(pid, food, need, opts) {
    const p = this.get(pid), f = PET_FOODS[food]; if (!p || !f) return false;
    if (!Life.has(food)) { UI.toast(I18n.s("u_a69ae09bed39", [SUPPLIES[food].n]), SUPPLIES[food].spr, 3.5); return false; }
    if (p.hunger >= 96 && food !== 'cat_treat') { this.say(p, this.voice(p, I18n.s("u_abfc136e68b0"), I18n.s("u_d2133a40514b"))); UI.toast(I18n.s("u_a4a4c1ea04ae", [p.name]), SUPPLIES[food].spr); return false; }
    const fav = p.fav.food === food ? 1.5 : 1, glut = p.trait === 'glutton' ? 1.2 : 1;
    p.hunger = clamp100(p.hunger + f.hunger); this.mood(p, Math.round(f.mood * fav * glut)); if (f.energy) p.energy = clamp100(p.energy + f.energy);
    this.addXp(p, f.xp); this.addBond(p, f.bond + (fav > 1 ? 3 : 0)); this.reveal(p, 'food', food);
    Life.L.bag[food]--; if (!Life.L.bag[food]) delete Life.L.bag[food];
    p.st.fed++; Life.L.stats.fed++;
    const a = this.actor(p);
    if (a && !(opts && opts.quiet)) { if (food === 'cat_treat' || food === 'fish_snack') { a.happy = 2; this.puff(p, 'p_heart', 1); this.say(p, fav > 1 ? this.voice(p, I18n.s("u_5adfdcb6a202"), I18n.s("u_dd5c9d41b540")) : this.voice(p, I18n.s("u_fd92e13e44df"), I18n.s("u_e2fe8140cfed"))); } else a.eat(); }
    if (need && need.pet === pid && ['cat_treat'].includes(need.type) && food === 'cat_treat') Life.complete(need);
    Life.track('feed', 1); this.checkNeeds(p); UI.refresh('pet'); UI.refresh('storage'); UI.refresh('need'); UI.badges(); Game.save();
    return true;
  },
  play(pid, toy, need, opts) {
    const p = this.get(pid); if (!p) return false; const w = this.why(p, 'play'); if (w) { UI.toast(w, 'i_paw', 3); return false; }
    let mood, energy;
    if (toy === 'catnip') { if (!Life.has('catnip')) { UI.toast(I18n.s("u_a14a4c2de7ed"), 'it_catnip'); return false; } Life.L.bag.catnip--; if (!Life.L.bag.catnip) delete Life.L.bag.catnip; mood = 30; energy = 25; }
    else { const t = PET_TOOLS[toy]; if (!t || !t.toy) return false; if (!this.Z.tools[toy]) { UI.toast(I18n.s("u_ddf57db52c2b", [t.n]), t.spr); return false; } mood = t.toy.mood; energy = t.toy.energy; }
    const fav = p.fav.toy === toy ? 1.5 : 1, lively = p.trait === 'playful';
    this.mood(p, Math.round(mood * fav * (lively ? 1.25 : 1))); p.energy = clamp100(p.energy - Math.round(energy * (lively ? 0.75 : 1)));
    this.addXp(p, 6); this.addBond(p, 3 + (fav > 1 ? 2 : 0)); this.reveal(p, 'toy', toy); p.st.play++;
    const a = this.actor(p); if (a && !(opts && opts.quiet)) a.zoom(toy === 'catnip' ? 6 : 3, toy);
    if (need && need.pet === pid && need.type === 'cat_play') Life.complete(need);
    this.after(p, 'play'); return true;
  },
  brush(pid) {
    const p = this.get(pid); if (!p) return false;
    if (!this.Z.tools.brush) { UI.toast(I18n.s("u_b6f1d8a5c957"), 't_brush'); return false; }
    const wait = p.brushAt + 20 * 60000 - Date.now(); if (wait > 0) { UI.toast(I18n.s("u_6a9a2cc978d6", [p.name, Math.ceil(wait / 60000)]), 't_brush'); return false; }
    p.brushAt = Date.now(); p.clean = clamp100(p.clean + 15); this.mood(p, p.trait === 'neat' ? 12 : 6); this.addBond(p, 2); this.addXp(p, 3); p.st.groom++;
    const a = this.actor(p); if (a) { a.happy = 2; for (let i = 0; i < 3; i++) Room.puff('p_spark', a.x - 6 + i * 6, a.y - 10, { vy: -6, max: 0.7 }); }
    this.say(p, this.voice(p, I18n.s("u_e00184f317c3"), I18n.s("u_9cf93812bc38"))); this.after(p, 'groom'); return true;
  },
  bath(pid, need) {
    const p = this.get(pid); if (!p) return false; if (!Life.has('shampoo')) { UI.toast(I18n.s("u_558459b4d425"), 'it_shampoo'); return false; }
    Life.L.bag.shampoo--; if (!Life.L.bag.shampoo) delete Life.L.bag.shampoo;
    p.clean = 100; this.mood(p, p.trait === 'neat' ? 10 : this.kind(p) === 'cat' ? -4 : 6); this.addBond(p, 2); this.addXp(p, 5); p.st.groom++;
    const a = this.actor(p); if (a) for (let i = 0; i < 7; i++) Room.puff('p_bubble', a.x - 8 + Math.random() * 16, a.y - 6 - Math.random() * 8, { vy: -6, vx: (Math.random() - 0.5) * 6, max: 1.2, wob: 5 });
    this.say(p, this.kind(p) === 'cat' && p.trait !== 'neat' ? I18n.s("u_56824bfb3cad") : I18n.s("u_feeb72cba00d"));
    if (need) this.checkNeeds(p); this.after(p, 'groom'); return true;
  },
  medicine(pid) {
    const p = this.get(pid); if (!p) return false; if (!p.sick) { UI.toast(I18n.s("u_4d69a3950698", [p.name]), 'it_medicine'); return false; }
    if (!Life.has('medicine')) { UI.toast(I18n.s("u_ec5c45811156"), 'it_medicine'); return false; }
    Life.L.bag.medicine--; if (!Life.L.bag.medicine) delete Life.L.bag.medicine;
    p.sick = false; p.low = 0; p.hunger = Math.max(p.hunger, 30); p.clean = Math.max(p.clean, 30); this.mood(p, 8); this.addBond(p, 3);
    this.puff(p, 'p_heart', 2); this.say(p, this.voice(p, I18n.s("u_6638cf05a14d"), I18n.s("u_32e296044060"))); this.after(p, 'care'); return true;
  },
  sleep(pid) {
    const p = this.get(pid), a = this.actor(p); if (!a) { UI.toast(I18n.s("u_0c8a925bd452", [p ? p.name : I18n.s("u_5b825353b534")]), 'i_moon'); return; }
    a.goNap(); UI.toast(I18n.s("u_2717fd17d7a5", [p.name]), 'i_moon', 2.6);
  },
  pet(pid) {
    const p = this.get(pid); if (!p) return; this.dayReset(p); const day = Life.today();
    p.day.pet++; p.st.pet++; this.mood(p, 3); if (p.day.pet <= 6) { this.addBond(p, 1); this.addXp(p, 1); }
    Life.track('pet', 1);
    for (const n of Life.L.needs) if (n.type === 'cat_pet' && n.pet === pid) { n.prog = (n.prog || 0) + 1; if (n.prog >= 3) Life.complete(n); }
    const chance = 0.3 + (p.trait === 'curious' ? 0.2 : 0) + TRICKS.filter(t => this.knows(p, t.id)).length * 0.03;
    // three days in a row without a gift: the next day's first pat brings one
    const lucky = p.blv >= 2 && p.gift !== day && (((p.giftDry || 0) >= 3 && p.giftDryDay !== day) || Math.random() < chance);
    if (p.blv >= 2 && p.gift !== day && !lucky && p.giftDryDay !== day) { p.giftDryDay = day; p.giftDry = (p.giftDry || 0) + 1; }
    if (lucky) {
      p.gift = day; p.giftDry = 0;
      setTimeout(() => {
        if (Math.random() < 0.6) { const c = 10 + p.blv * 3 + p.lv; Game.reward(c, 0, 'raw'); UI.toast(I18n.s("u_1fcb8c6968ae", [p.name, c]), 'i_coin', 3.5); }
        else { const s = Life.randomSupply(); Life.give(s, 1); UI.toast(I18n.s("u_6e0c97ef4d0b", [p.name, SUPPLIES[s].n]), 'i_paw', 3.5); }
        const a = this.actor(p); if (a) Room.puff('p_coin', a.x - 2, a.y - 18, { vy: -12, max: 1.2 });
      }, 900);
    }
    UI.refresh('pet'); Game.save();
  },
  // ---------- tricks ----------
  trainTitle(o) { const p = this.get(o.pid), t = TRICKS.find(x => x.id === o.trick); return I18n.s("u_f7ca0025e374", [p ? p.name : '', t ? t.n : '']); },
  train(pid, tid) {
    const p = this.get(pid), t = TRICKS.find(x => x.id === tid); if (!p || !t) return;
    if (p.lv < t.lv) return UI.toast(I18n.s("u_58e7ba40b186", [p.name, t.lv, t.n]), 'i_paw');
    if (this.knows(p, tid)) return UI.toast(I18n.s("u_1b5b3958cf27", [p.name, t.n]), 'i_paw');
    const w = this.why(p, 'train'); if (w) return UI.toast(w, 'i_paw', 3);
    Learn.start('train', { pid, trick: tid });
  },
  trainResult(pid, tid, R, n) {
    const p = this.get(pid), t = TRICKS.find(x => x.id === tid); if (!p || !t) return { msg: '' };
    p.energy = clamp100(p.energy - 25); p.st.train++; Life.track('train', 1);
    const ok = R >= Math.ceil(n * 0.75);
    let msg;
    p.trainFail = ok ? 0 : (p.trainFail || 0) + 1;   // two misses in a row: the next training uses words you know well
    if (ok) {
      Life.track('trainOk', 1);
      p.tricks[tid] = Math.min(t.need, (p.tricks[tid] || 0) + 1); this.addXp(p, 8 + R * 2); this.addBond(p, 3); this.mood(p, 6);
      if (p.tricks[tid] >= t.need) { msg = I18n.s("u_fd4d894c4169", [p.name, t.n]); Life.track('trick', 1); this.puff(p, 'p_heart', 4); }
      else msg = I18n.s("u_8ecb9b153027", [t.n, p.tricks[tid], t.need]);
    } else { this.addXp(p, 3); msg = I18n.s("u_23942c38b65a", [Math.ceil(n * 0.75), p.name]); }
    for (const nd of [...Life.L.needs]) if (nd.type === 'pet_train' && nd.pet === pid && ok) Life.complete(nd);
    UI.refresh('pet'); Game.save(); saveSoon();
    return { msg };
  },
  perform(pid, tid) {
    const p = this.get(pid), t = TRICKS.find(x => x.id === tid); if (!p || !t || !this.knows(p, tid)) return;
    const a = this.actor(p); if (!a) return UI.toast(I18n.s("u_98806220831b", [p.name]), 'i_paw');
    if (TrickShow.busy()) return UI.toast(I18n.s("u_fad899398a3b"), 'i_paw', 2.4);
    this.dayReset(p); a.doTrick(tid);
    if (!p.day.show[tid]) { p.day.show[tid] = 1; const c = 5 + p.lv + TRICKS.indexOf(t) * 3; Game.reward(c, 4, 'task'); this.mood(p, 5); this.addBond(p, 1); UI.toast(I18n.s("u_824a1a071ff0", [p.name, t.n, c]), 'i_star', 3); }
    UI.refresh('pet'); Game.save(); saveSoon();
  },
  // ---------- shop / roster ----------
  buyTool(id) {
    const t = PET_TOOLS[id]; if (this.Z.tools[id]) return; const pr = Rewards.price(t.price, 'pettool'); if (Game.S.coins < pr) return UI.toast(I18n.s("u_55ac75b47b82", [pr - Game.S.coins]), 'i_coin');
    Game.S.coins -= pr; Rewards.consume(t.price, 'pettool', t.n); this.Z.tools[id] = 1; Life.track('buy', 1, { kind: 'tool', id }); UI.toast(I18n.s("u_92cbd029ff0a", [t.n]), t.spr); UI.hud(true); UI.refresh('pet'); Game.save(); saveSoon();
  },
  buyAcc(id) {
    const a = PET_ACCS[id]; if (this.Z.accs[id]) return; if (Game.S.lvl < a.lv) return UI.toast(I18n.s("u_06b9cc394097", [a.lv]), 'i_star');
    const pr = Rewards.price(a.price, 'petacc'); if (Game.S.coins < pr) return UI.toast(I18n.s("u_55ac75b47b82", [pr - Game.S.coins]), 'i_coin');
    Game.S.coins -= pr; Rewards.consume(a.price, 'petacc', a.n); this.Z.accs[id] = 1; Life.track('buy', 1, { kind: 'acc', id }); UI.toast(I18n.s("u_98a03c0fdbc8", [a.n]), 'i_paw'); UI.hud(true);
    const p = this.sel(); if (p && !p.acc[a.slot]) p.acc[a.slot] = id;
    UI.refresh('pet'); Game.save(); saveSoon();
  },
  equip(pid, slot, id) { const p = this.get(pid); if (!p) return; p.acc[slot] = p.acc[slot] === id ? null : id; UI.refresh('pet'); Game.save(); },
  adopt(sp) {
    const Z = this.Z, d = PETS[sp]; if (!d) return;
    if (Z.pets.length >= PET_MAX) return UI.toast(I18n.s("u_812629446833", [PET_MAX]), 'i_paw');
    if (Game.S.lvl < d.lvl) return UI.toast(I18n.s("u_85ee9f0dad9e", [d.lvl]), 'i_star');
    const price = this.adoptPrice(sp); if (Game.S.coins < price) return UI.toast(I18n.s("u_55ac75b47b82", [price - Game.S.coins]), 'i_coin');
    Game.S.coins -= price; const p = this.make(Z, sp); p.home = !this.roomFull(); Z.pets.push(p); Z.sel = p.id;
    if (!Game.S.pets.includes(sp)) Game.S.pets.push(sp);
    this.syncActors(); Life.track('buy', 1, { kind: 'pet', id: sp });
    UI.toast(I18n.s("u_5c6efa1ee50f", [d.n, p.name]) + (p.home ? '' : I18n.s("u_9ba7a3ce5207", [PET_ROOM_MAX])), 'i_paw', 4);
    UI.hud(true); UI.refresh('shop'); UI.petTab = 'care'; UI.openWin('pet'); Game.save(); saveSoon();
    setTimeout(() => { const el = document.getElementById('pet-name'); if (el) { el.focus(); el.select(); } }, 60);
  },
  setHome(pid, on) {
    const p = this.get(pid); if (!p) return;
    if (on && !p.home && this.roomFull()) return UI.toast(I18n.s("u_8883a54c6bfa", [PET_ROOM_MAX]), 'i_paw', 3.5);
    if (!on && this.home().length <= 1) return UI.toast(I18n.s("u_b9a16ea4fff9"), 'i_paw');
    p.home = on; for (const n of [...Life.L.needs]) if (n.pet === pid) Life.drop(n);
    this.syncActors(); UI.toast(on ? I18n.s("u_2a0bdefc375b", [p.name]) : I18n.s("u_ca72372fd898", [p.name]), 'i_paw', 3); UI.refresh('pet'); Game.save();
  },
  release(pid) {
    const Z = this.Z; if (Z.pets.length <= 1) return; Z.pets = Z.pets.filter(p => p.id !== pid);
    for (const n of [...Life.L.needs]) if (n.pet === pid) Life.drop(n);
    if (!Z.pets.some(p => p.home)) Z.pets[0].home = true; if (Z.sel === pid) Z.sel = Z.pets[0].id; this.syncActors(); UI.refresh('pet'); Game.save();
  },
  rename(pid, name) { const p = this.get(pid); if (!p) return; p.name = (name || '').trim().slice(0, 12) || p.name; const h0 = this.home()[0]; if (h0) Game.S.petName = h0.name; UI.refresh('tasks'); Game.save(); },
  syncActors() {
    const S = Game.S, home = this.home(); if (!Game.pets) Game.pets = [];
    Game.pets = Game.pets.filter(a => home.some(p => p.id === a.pid));
    home.forEach((p, i) => {
      let a = Game.pets.find(x => x.pid === p.id);
      if (!a) { a = new Pet(p.id); const [x, y] = randFloor(10); a.x = x; a.y = y; Game.pets.push(a); }
      a.set(p.sp);
    });
    Room.actors = [Game.avatar, ...Game.pets, ...Room.actors.filter(a => a !== Game.avatar && !(a instanceof Pet))].filter(Boolean);
    S.pet = (home[0] || S.zoo.pets[0]).sp; S.petName = (home[0] || S.zoo.pets[0]).name;
    if (typeof Cowork !== 'undefined' && Cowork.push) Cowork.push();
  },
  resetActors() { for (const a of Game.pets || []) { a.on = null; a.onOff = null; a.jump = null; const [x, y] = randFloor(10); a.x = x; a.y = y; a.state = 'sit'; a.timer = 1 + Math.random() * 2; } },
};

/* ---------------- pet window ---------------- */
// what the pet is asking for right now, shown on its card in the roster (the first open need; more are counted)
function petNeedBadge(q) {
  const list = (Life.L.needs || []).filter(n => n.pet === q.id && NEED_DEFS[n.type]); if (!list.length) return null;
  const def = NEED_DEFS[list[0].type], spr = def.item && SUPPLIES[def.item] ? SUPPLIES[def.item].spr : def.icon;
  return h('span', { class: 'pneed', title: list.map(n => NEED_DEFS[n.type].t(n)).join('、') }, ico(spr, 18), list.length > 1 ? h('b', { class: 'num', text: '+' + (list.length - 1) }) : null);
}
Object.assign(UI, {
  petTab: 'care',
  w_pet() {
    const Z = Pets.Z, p = Pets.sel(); if (!p) return [];
    Z.sel = p.id; const [k, c] = p.sp.split(':');
    const roster = h('div', { class: 'proster' }, ...Z.pets.map(q => {
      const [kk, cc] = q.sp.split(':'), warn = q.injury || q.sick || q.hunger < 30 || q.clean < 30 || q.mood < 30;
      return h('button', { class: 'pcard' + (q.id === p.id ? ' cur' : '') + (q.home ? '' : ' away'), title: q.name + (q.home ? '' : I18n.s("u_d1c9b9e17d77")), onclick: () => { Z.sel = q.id; this.refresh('pet'); } },
        sprPreview(petCanvas(kk, cc, 'sit', 0, false, q.acc), 40, 2), h('span', { text: q.name }), petNeedBadge(q) || (warn ? h('i', { class: 'pwarn' }) : null));
    }), Z.pets.length < PET_MAX ? h('button', { class: 'pcard add', title: I18n.s("u_b56b772e4960"), onclick: () => { this.shopTab = 'pet'; this.openWin('shop'); } }, ico('i_plus', 22), h('span', { text: I18n.s("u_bb20e95e3271") })) : null);
    const pv = sprPreview(petCanvas(k, c, 'sit', 0, false, p.acc), 104, 4);
    const bar = (label, v, cls, tip) => h('div', { class: 'pstat', title: tip || '' }, h('span', { text: label }), h('div', { class: 'pbar ' + cls }, h('i', { style: `width:${Math.round(v)}%` })), h('b', { class: 'num', text: String(Math.round(v)) }));
    const need = Pets.xpNeed(p.lv);
    const head = h('div', { class: 'ava-row' }, h('div', { class: 'ava-stage pet' }, pv, p.sick ? h('span', { class: 'ptag sick', text: I18n.s("u_bc91c3832c6c") }) : null),
      h('div', { class: 'ava-opts' },
        h('label', { class: 'field' }, h('span', { text: `${PETS[p.sp].n} · ${Pets.stageName(p)}` }), h('div', { class: 'inset' }, h('input', { id: 'pet-name', type: 'text', maxlength: '12', value: p.name, onchange: e => { Pets.rename(p.id, e.target.value); this.refresh('pet'); } }))),
        h('div', { class: 'pstat' }, h('span', { text: I18n.s("u_b4ff05f4e4b4", [p.lv]) }), h('div', { class: 'pbar xp' }, h('i', { style: `width:${p.lv >= PET_LV_MAX ? 100 : Math.round(p.xp / need * 100)}%` })), h('b', { class: 'num', text: p.lv >= PET_LV_MAX ? 'MAX' : `${p.xp}/${need}` })),
        h('div', { class: 'pstat' }, h('span', { text: I18n.s("u_fbc14e01d0d6", [p.blv]) }), h('div', { class: 'pbar bond' }, h('i', { style: `width:${Math.round(p.bond / Pets.bondNeed(p.blv) * 100)}%` })), h('b', { class: 'num', text: `${p.bond}/${Pets.bondNeed(p.blv)}` })),
        h('div', { class: 'ptraits' }, h('span', { class: 'ptag', title: TRAITS[p.trait].d, text: TRAITS[p.trait].n }),
          h('span', { class: 'ptag', title: I18n.s("u_6ca8e52b0a80"), text: I18n.s("u_1f3c8b855110") + (p.known.food ? SUPPLIES[p.fav.food].n : '？？') }),
          h('span', { class: 'ptag', title: I18n.s("u_db254bddc6df"), text: I18n.s("u_169490a7062a") + (p.known.toy ? (PET_TOOLS[p.fav.toy] || SUPPLIES[p.fav.toy]).n : '？？') }))));
    const stats = h('div', { class: 'pstats2' }, bar(I18n.s("u_adb487eb68e1"), p.hunger, 'food', I18n.s("u_5b68cbb49c4f")), bar(I18n.s("u_28f5b8588878"), p.mood, 'mood', I18n.s("u_6c157b79f31f")), bar(I18n.s("u_468ae5d8d33f"), p.clean, 'clean', I18n.s("u_c6e6bf696ed0")), bar(I18n.s("u_31b1dd3af5a4"), p.energy, 'energy', I18n.s("u_ee688f79073d")));
    const tabs = h('div', { class: 'tabs' }, ...[['care', I18n.s("u_ad5ff6a45354")], ['train', I18n.s("u_7d895f839ae7")], ['acc', I18n.s("u_2f38acdabe06")], ['info', I18n.s("u_1e672bcb8178")]].map(([id, l]) => h('button', { class: 'tab' + (this.petTab === id ? ' on' : ''), onclick: () => { this.petTab = id; this.refresh('pet'); } }, l)));
    const bag = Life.L.bag, body = [];
    const sbtn = (spr, label, cnt, fn, opts = {}) => h('button', { class: 'swapbtn' + (opts.fav ? ' fav' : ''), title: opts.title || '', disabled: !!opts.disabled, onclick: fn }, ico(spr, 30), h('span', { text: label }), cnt != null ? h('em', { class: 'num', text: cnt }) : null);
    if (this.petTab === 'care') {
      const bowls = Pets.bowls();
      if (bowls.length) {
        // the pet and the bowl always go together: a bowl that belongs to another pet is never shown on this pet's page
        let cur = Room.uidMap[this.petBowl];
        const fits = (b) => b && ITEMS[b.k] && ITEMS[b.k].bowl && b.p == null && (!Pets.bowlOwner(b) || Pets.bowlOwner(b).id === p.id);
        if (this.petBowlPet !== p.id || !fits(cur)) cur = Pets.bowlShown(p);
        this.petBowl = cur ? cur.uid : null; this.petBowlPet = p.id;
        const lvlTxt = (b) => { const n = (b.bq || []).length; return n ? I18n.s("u_68078bb1bf2e", [n, b.bq.map(q => SUPPLIES[q.k].n).join('、')]) : I18n.s("u_6516ee0da826"); };
        body.push(h('div', { class: 'sub', text: I18n.s("u_a94b6f129916") }));
        // picking another pet's bowl switches the whole page to that pet; a shared bowl keeps the pet
        const pickBowl = (b) => { const o = Pets.bowlOwner(b); if (o && o.id !== p.id) Z.sel = o.id; this.petBowl = b.uid; this.petBowlPet = Z.sel; this.refresh('pet'); };
        if (bowls.length > 1 || !cur) body.push(h('div', { class: 'tabs wrap' }, ...bowls.map((b, i) => { const o = Pets.bowlOwner(b); return h('button', { class: 'tab sm' + (b === cur ? ' on' : ''), title: o && o.id !== p.id ? I18n.s("u_274aefcb25c5", [o.name]) : '', onclick: () => pickBowl(b) }, I18n.s("u_91ad88adab2d", [i + 1, o ? o.name : I18n.s("u_a899f10572c1")])); })));
        if (!cur) body.push(h('p', { class: 'hint', text: I18n.s("u_46f448be6ab1", [p.name, p.name]) }));
        else {
          const owner = Pets.bowlOwner(cur), mine = owner && owner.id === p.id;
          const who = owner ? (owner.home ? I18n.s("u_9c96c40a538e", [owner.name]) : I18n.s("u_6bba48949b8e", [owner.name, owner.name])) : I18n.s("u_c73a114036ab");
          body.push(h('div', { class: 'pbowl' }, sprPreview(SPR.get(Pets.bowlLevel(cur) ? 'pet_bowl_' + Pets.bowlLevel(cur) : 'pet_bowl'), 44, 2),
            h('div', { class: 'grow' }, h('div', { text: who }), h('div', { class: 'hint', text: I18n.s("u_42114d0ab2e1", [lvlTxt(cur), BOWL_MAX]) })),
            mine ? h('button', { class: 'chip sm', onclick: () => Pets.assignBowl(cur.uid, null) }, I18n.s("u_94cc7a42fc7e")) : h('button', { class: 'chip sm primary', onclick: () => Pets.assignBowl(cur.uid, p.id) }, I18n.s("u_25231471717f", [p.name]))));
        }
        if (cur) body.push(h('p', { class: 'hint', text: I18n.s("u_66cb01518183") }));
      }
      // everything here is picked up and used on the pet in the room
      const take = (id) => () => { if (PetPlay.pick(id, p.id)) this.closeWin('pet'); };
      body.push(h('div', { class: 'sub', text: I18n.s("u_606082fedbc2") }), h('div', { class: 'swap' }, ...Object.keys(PET_FOODS).map(f => sbtn(SUPPLIES[f].spr, I18n.s("u_acb0970edc4a") + SUPPLIES[f].n, '×' + (bag[f] || 0), take(f), { title: SUPPLIES[f].desc, fav: p.known.food && p.fav.food === f, disabled: !(bag[f] > 0) }))));
      body.push(h('div', { class: 'sub', text: I18n.s("u_dba84fc32780") }), h('div', { class: 'swap' }, ...PET_TOYS.map(t => {
        if (t === 'catnip') return sbtn('it_catnip', I18n.s("u_e33d3900ee6c"), '×' + (bag.catnip || 0), take('catnip'), { title: SUPPLIES.catnip.desc, fav: p.known.toy && p.fav.toy === t, disabled: !(bag.catnip > 0) });
        const T = PET_TOOLS[t], own = Z.tools[t];
        return sbtn(T.spr, own ? I18n.s("u_acb0970edc4a") + T.n : T.n, own ? '' : T.price + I18n.s("u_3c1e31a193cd"), () => own ? take(t)() : Pets.buyTool(t), { title: own ? T.desc : I18n.s("u_a774892cccb5", [T.n, T.price, T.desc]), fav: p.known.toy && p.fav.toy === t });
      })));
      const brushWait = Math.max(0, Math.ceil((p.brushAt + 20 * 60000 - Date.now()) / 60000));
      body.push(h('div', { class: 'sub', text: I18n.s("u_e74ed824f274") }), h('div', { class: 'swap' },
        Z.tools.brush ? sbtn('t_brush', brushWait ? I18n.s("u_b612ce8bd827", [brushWait]) : I18n.s("u_741bc03de307"), '', take('brush'), { title: PET_TOOLS.brush.desc + I18n.s("u_f47813cc6fec"), disabled: brushWait > 0 }) : sbtn('t_brush', I18n.s("u_fb6d20e1a57d"), I18n.s("u_6fb4ece54134"), () => Pets.buyTool('brush'), { title: PET_TOOLS.brush.desc }),
        sbtn('it_shampoo', I18n.s("u_da33680ef4df"), '×' + (bag.shampoo || 0), take('shampoo'), { title: SUPPLIES.shampoo.desc, disabled: !(bag.shampoo > 0) }),
        sbtn('it_medicine', I18n.s("u_9d4debbfc620"), '×' + (bag.medicine || 0), take('medicine'), { title: SUPPLIES.medicine.desc, disabled: !p.sick || !(bag.medicine > 0) }),
        sbtn('i_moon', I18n.s("u_41722f6b2865"), null, () => Pets.sleep(p.id), { title: I18n.s("u_a124d6d923e6") })));
      body.push(h('p', { class: 'hint', text: I18n.s("u_e1740fdf1c72", [TRAITS[p.trait].n, TRAITS[p.trait].d]) }));
    } else if (this.petTab === 'train') {
      body.push(h('p', { class: 'hint', text: I18n.s("u_fd415a23aab4") }));
      for (const t of TRICKS) {
        const prog = p.tricks[t.id] || 0, known = prog >= t.need, locked = p.lv < t.lv;
        body.push(h('div', { class: 'task' + (known ? ' claimed' : '') }, h('div', { class: 'task-main' }, h('div', { class: 'task-t', text: t.n + (locked ? `（Lv ${t.lv}）` : '') }), h('div', { class: 'hint', text: t.d }), h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round(prog / t.need * 100)}%` })), h('div', { class: 'task-meta' }, h('span', { class: 'num hint', text: `${prog}/${t.need}` }), known ? h('span', { class: 'hint', text: p.day.d === Life.today() && p.day.show[t.id] ? I18n.s("u_7dad488a10cd") : I18n.s("u_ab07d1a8dd81") }) : null)),
          known ? h('button', { class: 'chip sm primary', onclick: () => Pets.perform(p.id, t.id) }, I18n.s("u_1596ad4e4e5c")) : h('button', { class: 'chip sm', disabled: locked, onclick: () => Pets.train(p.id, t.id) }, ico('i_learn', 16), I18n.s("u_2504f9b08203"))));
      }
    } else if (this.petTab === 'acc') {
      for (const slot of ['neck', 'head']) {
        body.push(h('div', { class: 'sub', text: slot === 'neck' ? I18n.s("u_e3b1367eddea") : I18n.s("u_4c509544c446") }));
        body.push(h('div', { class: 'grid small accs' }, ...Object.keys(PET_ACCS).filter(id => PET_ACCS[id].slot === slot).map(id => {
          const A = PET_ACCS[id], own = Z.accs[id], on = p.acc[slot] === id, acc = Object.assign({}, p.acc, { [slot]: id });
          return h('button', { class: 'card pick' + (on ? ' cur' : ''), title: own ? (on ? I18n.s("u_3e8fcd2ca2a0") : I18n.s("u_eb031b60f0b2")) : I18n.s("u_c3ae1626d7ca", [A.price]) + (Game.S.lvl < A.lv ? `（Lv ${A.lv}）` : ''), onclick: () => own ? Pets.equip(p.id, slot, id) : Pets.buyAcc(id) },
            h('div', { class: 'pvbox' }, sprPreview(petCanvas(k, c, 'sit', 0, false, acc), 48, 2)), h('div', { class: 'cn', text: A.n }), own ? (on ? h('span', { class: 'own', text: I18n.s("u_5b0521f33dc3") }) : null) : h('div', { class: 'price' }, ico('i_coin', 14), h('b', { class: 'num', text: String(A.price) })));
        })));
      }
      body.push(h('p', { class: 'hint', text: I18n.s("u_7de7b85721b5") }));
    } else {
      const days = Math.max(1, Math.floor((Date.now() - p.at) / 86400000) + 1);
      body.push(h('dl', { class: 'stats' }, h('dt', { text: I18n.s("u_1cec712ade68") }), h('dd', { class: 'num', text: I18n.s("u_84b058156452", [days]) }), h('dt', { text: I18n.s("u_d21deb40d1ee") }), h('dd', { class: 'num', text: I18n.s("u_2aa79928fce8", [p.st.fed]) }), h('dt', { text: I18n.s("u_dba84fc32780") }), h('dd', { class: 'num', text: I18n.s("u_2aa79928fce8", [p.st.play]) }), h('dt', { text: I18n.s("u_acd1d4d9e98c") }), h('dd', { class: 'num', text: I18n.s("u_2aa79928fce8", [p.st.groom]) }), h('dt', { text: I18n.s("u_2504f9b08203") }), h('dd', { class: 'num', text: I18n.s("u_2aa79928fce8", [p.st.train]) }), h('dt', { text: I18n.s("u_b545d54af639") }), h('dd', { class: 'num', text: I18n.s("u_2aa79928fce8", [p.st.pet]) }), h('dt', { text: I18n.s("u_ba174503b206") }), h('dd', { class: 'num', text: `${TRICKS.filter(t => Pets.knows(p, t.id)).length}/${TRICKS.length}` }), h('dt', { text: I18n.s("u_b59310cc7d4e") }), h('dd', { text: (() => { const k = PetPlay.favSpot(p); return k ? ITEMS[k].n : I18n.s("u_bc75a4eeed4d"); })() })));
      body.push(h('div', { class: 'row wrap' },
        h('button', { class: 'chip', onclick: () => Pets.setHome(p.id, !p.home) }, ico(p.home ? 'i_box' : 'i_heart', 18), p.home ? I18n.s("u_223ff4190781") : I18n.s("u_9b69fc41a7f4")),
        Z.pets.length > 1 ? h('button', { class: 'chip', onclick: () => { if (confirm(I18n.s("u_fe4181c2a040", [p.name]))) Pets.release(p.id); } }, I18n.s("u_6a9c5de35f10")) : null));
      body.push(h('p', { class: 'hint', text: I18n.s("u_0479982e6b1c", [PET_ROOM_MAX, PET_MAX]) }));
    }
    return [roster, head, stats, tabs, this.petTab === 'care' || this.petTab === 'acc' ? this.couponBar() : null, ...body];
  },
});
UI.WIN.pet.w = 470;
