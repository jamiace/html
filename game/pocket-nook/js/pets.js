const BOWL_MAX = 3;
/* ============================================================
   Pets: several pets at once, growth, personality, care,
   tricks (trained with vocabulary quizzes), accessories
   ============================================================ */
const PET_MAX = 10, PET_ROOM_MAX = 5, PET_LV_MAX = 20;
const TRAITS = {
  glutton: { n: '貪吃', d: '肚子餓得比較快，吃到東西特別開心。' },
  clingy: { n: '黏人', d: '被摸摸時羈絆加倍，太久沒理會比較失落。' },
  playful: { n: '活潑', d: '玩耍時心情加得比較多，也比較不容易累。' },
  sleepy: { n: '愛睡', d: '常常在睡覺，睡覺時精力恢復得更快。' },
  neat: { n: '愛乾淨', d: '不容易弄髒，被梳毛時特別開心。' },
  curious: { n: '好奇', d: '喜歡在房間裡探險，叼禮物回來的機率比較高。' },
};
const PET_FOODS = {
  cat_can: { hunger: 45, mood: 5, xp: 4, bond: 3 },
  fish_snack: { hunger: 20, mood: 8, xp: 3, bond: 3 },
  premium_food: { hunger: 70, mood: 15, energy: 10, xp: 8, bond: 5 },
  cat_treat: { hunger: 5, mood: 12, xp: 3, bond: 6 },
};
const PET_TOOLS = {
  brush: { n: '梳子', spr: 't_brush', price: 80, desc: '幫寵物梳毛：清潔 +15、心情 +6。同一隻 20 分鐘可以梳一次。' },
  wand: { n: '逗貓棒', spr: 't_wand', price: 120, toy: { mood: 18, energy: 20 }, desc: '陪寵物玩：心情 +18，消耗精力 20。' },
  yarn: { n: '毛線球', spr: 't_yarn', price: 90, toy: { mood: 15, energy: 15 }, desc: '陪寵物玩：心情 +15，消耗精力 15。' },
  ball: { n: '小皮球', spr: 't_ball', price: 90, toy: { mood: 16, energy: 18 }, desc: '陪寵物玩：心情 +16，消耗精力 18。' },
};
const PET_TOYS = ['wand', 'yarn', 'ball', 'catnip'];
const TRICKS = [
  { id: 'sit', n: '坐下', lv: 1, need: 3 },
  { id: 'paw', n: '握手', lv: 3, need: 4 },
  { id: 'spin', n: '轉圈圈', lv: 5, need: 5 },
  { id: 'roll', n: '翻滾', lv: 7, need: 6 },
  { id: 'jump', n: '跳高', lv: 10, need: 7 },
  { id: 'dance', n: '跳舞', lv: 14, need: 8 },
];
const PET_ACCS = {
  collar_red: { n: '紅色項圈', slot: 'neck', price: 60, lv: 1, c: ['r', 'q'] },
  collar_blue: { n: '藍色項圈', slot: 'neck', price: 60, lv: 1, c: ['n', 'm'] },
  collar_mint: { n: '薄荷項圈', slot: 'neck', price: 60, lv: 2, c: ['k', 'j'] },
  bell: { n: '鈴鐺項圈', slot: 'neck', price: 120, lv: 3, c: ['r', 'q'], bell: true },
  bandana: { n: '格紋領巾', slot: 'neck', price: 140, lv: 5, c: ['S', 'R'], wide: true },
  bow: { n: '蝴蝶結', slot: 'head', price: 90, lv: 2, pat: ['s.s', 'sqs'] },
  flower: { n: '小花', slot: 'head', price: 90, lv: 4, pat: ['.f.', 'fwf', '.f.'], dy: -1 },
  crown: { n: '小王冠', slot: 'head', price: 220, lv: 10, pat: ['x.x', 'wxw'], crown: true },
};
const PET_NAMES = { cat: ['麻糬', '湯圓', '布丁', '小橘', '奶茶', '芝麻', '可樂', '雪球', '團子', '豆花', '仙草', '咪咪'], dog: ['阿柴', '栗子', '黑糖', '饅頭', '小虎', '豆豆', '餅乾', '旺財', '花生', '拿鐵'] };
const STAGE_NAMES = { cat: ['幼貓', '少年貓', '成貓'], dog: ['幼犬', '少年犬', '成犬'] };

// ---------- accessory drawing ----------
const _row = (y, x0, x1) => { const o = []; for (let x = x0; x <= x1; x++) o.push([x, y]); return o; };
const _col = (x, y0, y1) => { const o = []; for (let y = y0; y <= y1; y++) o.push([x, y]); return o; };
const ACC_ANCHOR = {
  cat: {
    sit: { neck: _row(8, 5, 12), dir: [0, 1], bell: [9, 9], head: [13, 0], crown: [9, 0] },
    walk: { neck: _col(12, 6, 10), dir: [-1, 0], bell: [12, 11], head: [18, 1], crown: [15, 3] },
    sleep: { neck: _col(12, 8, 12), dir: [-1, 0], bell: [11, 12], head: [17, 4], crown: [14, 5] },
  },
  dog: {
    sit: { neck: _row(8, 9, 15), dir: [0, 1], bell: [12, 9], head: [15, 0], crown: [11, 0] },
    walk: { neck: _col(14, 6, 10), dir: [-1, 0], bell: [14, 11], head: [19, 0], crown: [16, 1] },
    sleep: { neck: _col(14, 9, 13), dir: [-1, 0], bell: [13, 13], head: [19, 5], crown: [16, 6] },
  },
};
function applyPetAcc(g, kind, pose, acc) {
  const A = ACC_ANCHOR[kind] && ACC_ANCHOR[kind][pose]; if (!A || !acc) return g;
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
      for (const p of S.zoo.pets) { for (const k in tpl) if (!(k in p)) p[k] = JSON.parse(JSON.stringify(tpl[k])); if (!PETS[p.sp]) p.sp = 'cat:ginger'; }
      if (!S.zoo.pets.length) S.zoo.pets.push(this.make(S.zoo, 'cat:ginger', '麻糬'));
      return;
    }
    const Z = S.zoo = this.newState(), old = (S.life && S.life.pet) || {};
    const list = [S.pet || 'cat:ginger', ...(S.pets || []).filter(id => id !== S.pet)].filter(id => PETS[id]);
    if (!list.length) list.push('cat:ginger');
    list.slice(0, PET_MAX).forEach((sp, i) => {
      const p = this.make(Z, sp, i === 0 ? (S.petName || '麻糬') : null);
      if (i === 0) { if (old.hunger != null) p.hunger = old.hunger; if (old.mood != null) p.mood = old.mood; p.bond = old.bond || 0; p.blv = old.lv || 1; p.lv = Math.min(PET_LV_MAX, 1 + Math.max(0, (old.lv || 1) - 1) * 2); }
      p.home = i < PET_ROOM_MAX; Z.pets.push(p);
    });
    Z.sel = Z.pets[0].id;
  },
  list() { return this.Z.pets; },
  home() { return this.Z.pets.filter(p => p.home); },
  get(id) { return this.Z.pets.find(p => p.id === id) || null; },
  name(id) { const p = this.get(id); return p ? p.name : '寵物'; },
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
    if (p.lv >= PET_LV_MAX || n <= 0) return; p.xp += n;
    while (p.lv < PET_LV_MAX && p.xp >= this.xpNeed(p.lv)) {
      const st0 = this.stage(p); p.xp -= this.xpNeed(p.lv); p.lv++;
      const c = 8 * p.lv; Game.reward(c, 10, 'raw');
      const st1 = this.stage(p);
      if (st1 !== st0) UI.toast(`${p.name}長大了，變成${this.stageName(p)}！獲得 ${c} 金幣`, 'i_paw', 4.5);
      else UI.toast(`${p.name}升到 Lv ${p.lv}！獲得 ${c} 金幣` + (TRICKS.some(t => t.lv === p.lv) ? `，可以學「${TRICKS.find(t => t.lv === p.lv).n}」了` : ''), 'i_paw', 4);
      this.puff(p, 'p_spark', 4);
      Life.track('petLv', 1);
    }
    if (p.lv >= PET_LV_MAX) p.xp = 0;
  },
  addBond(p, n) {
    if (p.trait === 'clingy' && n > 0) n = Math.round(n * 1.5);
    p.bond += n;
    while (p.bond >= this.bondNeed(p.blv)) {
      p.bond -= this.bondNeed(p.blv); p.blv++;
      const c = 15 * p.blv; Game.reward(c, 20, 'raw'); Life.give('cat_treat', 1);
      UI.toast(`和${p.name}的羈絆升到 Lv ${p.blv}！獲得 ${c} 金幣和零食`, 'i_heart', 4.5);
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
  bowlOf(p) { return this.bowls().find(b => b.pet === p.id) || null; },
  // the bowl this pet eats from: its own, otherwise a shared one that has food
  bowlFor(p) { const own = this.bowlOf(p); if (own) return this.bowlLeft(own) > 0 ? own : null; return this.bowls().find(b => !this.bowlOwner(b) && this.bowlLeft(b) > 0) || null; },
  assignBowl(uid, pid) {
    const b = Room.uidMap[uid]; if (!b) return;
    if (pid == null) { delete b.pet; UI.toast('這個碗改成大家都能吃', 'i_paw', 2.5); }
    else { for (const o of this.bowls()) if (o !== b && o.pet === pid) delete o.pet; b.pet = pid; const p = this.get(pid); UI.toast(`這個碗現在是${p.name}的`, 'i_paw', 2.5); }
    Game.save(); UI.refresh('pet');
  },
  fillBowl(uid, food) {
    const b = Room.uidMap[uid], f = PET_FOODS[food]; if (!b || !f) return false;
    b.bq = b.bq || [];
    if (b.bq.length >= BOWL_MAX) { UI.toast(`碗已經滿了（最多 ${BOWL_MAX} 份）`, 'i_paw', 2.5); return false; }
    if (!Life.has(food)) { UI.toast(`沒有${SUPPLIES[food].n}了，可以學習換取或到商店買`, SUPPLIES[food].spr, 3.5); return false; }
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
        if (p.low > 45 && !p.sick) { p.sick = true; p.low = 0; UI.toast(`${p.name}好像不太舒服，需要寵物藥`, 'it_medicine', 4.5); }
      }
      if (p.sick) p.mood = Math.min(p.mood, 60);
    }
  },

  // ---------- care ----------
  why(p, act) {
    if (!p) return '沒有寵物';
    if (act === 'play' || act === 'train') { if (p.sick) return `${p.name}不舒服，先讓牠吃藥休息`; if (p.energy < (act === 'train' ? 25 : 15)) return `${p.name}太累了，讓牠睡一下`; }
    if (act === 'train' && p.mood < 35) return `${p.name}心情不好，先陪牠玩或餵點零食`;
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
    UI.toast(`發現了！${p.name}最喜歡的${what === 'food' ? '食物' : '玩具'}是${nm}`, 'i_heart', 4); return nm;
  },
  feed(pid, food, need) {
    const p = this.get(pid), f = PET_FOODS[food]; if (!p || !f) return false;
    if (!Life.has(food)) { UI.toast(`沒有${SUPPLIES[food].n}了，可以學習換取或到商店買`, SUPPLIES[food].spr, 3.5); return false; }
    if (p.hunger >= 96 && food !== 'cat_treat') { this.say(p, this.voice(p, '喵…吃不下了', '汪…好飽')); UI.toast(`${p.name}現在不餓`, SUPPLIES[food].spr); return false; }
    const fav = p.fav.food === food ? 1.5 : 1, glut = p.trait === 'glutton' ? 1.2 : 1;
    p.hunger = clamp100(p.hunger + f.hunger); this.mood(p, Math.round(f.mood * fav * glut)); if (f.energy) p.energy = clamp100(p.energy + f.energy);
    this.addXp(p, f.xp); this.addBond(p, f.bond + (fav > 1 ? 3 : 0)); this.reveal(p, 'food', food);
    Life.L.bag[food]--; if (!Life.L.bag[food]) delete Life.L.bag[food];
    p.st.fed++; Life.L.stats.fed++;
    const a = this.actor(p);
    if (a) { if (food === 'cat_treat' || food === 'fish_snack') { a.happy = 2; this.puff(p, 'p_heart', 1); this.say(p, fav > 1 ? this.voice(p, '最愛這個了！', '汪汪！最愛！') : this.voice(p, '好好吃！', '汪！好吃！')); } else a.eat(); }
    if (need && need.pet === pid && ['cat_treat'].includes(need.type) && food === 'cat_treat') Life.complete(need);
    Life.track('feed', 1); this.checkNeeds(p); UI.refresh('pet'); UI.refresh('storage'); UI.refresh('need'); UI.badges(); Game.save();
    return true;
  },
  play(pid, toy, need) {
    const p = this.get(pid); if (!p) return false; const w = this.why(p, 'play'); if (w) { UI.toast(w, 'i_paw', 3); return false; }
    let mood, energy;
    if (toy === 'catnip') { if (!Life.has('catnip')) { UI.toast('沒有貓薄荷了', 'it_catnip'); return false; } Life.L.bag.catnip--; if (!Life.L.bag.catnip) delete Life.L.bag.catnip; mood = 30; energy = 25; }
    else { const t = PET_TOOLS[toy]; if (!t || !t.toy) return false; if (!this.Z.tools[toy]) { UI.toast(`還沒有${t.n}，可以在寵物視窗買`, t.spr); return false; } mood = t.toy.mood; energy = t.toy.energy; }
    const fav = p.fav.toy === toy ? 1.5 : 1, lively = p.trait === 'playful';
    this.mood(p, Math.round(mood * fav * (lively ? 1.25 : 1))); p.energy = clamp100(p.energy - Math.round(energy * (lively ? 0.75 : 1)));
    this.addXp(p, 6); this.addBond(p, 3 + (fav > 1 ? 2 : 0)); this.reveal(p, 'toy', toy); p.st.play++;
    const a = this.actor(p); if (a) a.zoom(toy === 'catnip' ? 6 : 3, toy);
    if (need && need.pet === pid && need.type === 'cat_play') Life.complete(need);
    this.after(p, 'play'); return true;
  },
  brush(pid) {
    const p = this.get(pid); if (!p) return false;
    if (!this.Z.tools.brush) { UI.toast('還沒有梳子，可以在寵物視窗買', 't_brush'); return false; }
    const wait = p.brushAt + 20 * 60000 - Date.now(); if (wait > 0) { UI.toast(`${p.name}剛梳過毛，${Math.ceil(wait / 60000)} 分鐘後再梳`, 't_brush'); return false; }
    p.brushAt = Date.now(); p.clean = clamp100(p.clean + 15); this.mood(p, p.trait === 'neat' ? 12 : 6); this.addBond(p, 2); this.addXp(p, 3); p.st.groom++;
    const a = this.actor(p); if (a) { a.happy = 2; for (let i = 0; i < 3; i++) Room.puff('p_spark', a.x - 6 + i * 6, a.y - 10, { vy: -6, max: 0.7 }); }
    this.say(p, this.voice(p, '呼嚕呼嚕…', '好舒服～')); this.after(p, 'groom'); return true;
  },
  bath(pid, need) {
    const p = this.get(pid); if (!p) return false; if (!Life.has('shampoo')) { UI.toast('沒有洗毛精了', 'it_shampoo'); return false; }
    Life.L.bag.shampoo--; if (!Life.L.bag.shampoo) delete Life.L.bag.shampoo;
    p.clean = 100; this.mood(p, p.trait === 'neat' ? 10 : this.kind(p) === 'cat' ? -4 : 6); this.addBond(p, 2); this.addXp(p, 5); p.st.groom++;
    const a = this.actor(p); if (a) for (let i = 0; i < 7; i++) Room.puff('p_bubble', a.x - 8 + Math.random() * 16, a.y - 6 - Math.random() * 8, { vy: -6, vx: (Math.random() - 0.5) * 6, max: 1.2, wob: 5 });
    this.say(p, this.kind(p) === 'cat' && p.trait !== 'neat' ? '喵！不要水！' : '香噴噴～');
    if (need) this.checkNeeds(p); this.after(p, 'groom'); return true;
  },
  medicine(pid) {
    const p = this.get(pid); if (!p) return false; if (!p.sick) { UI.toast(`${p.name}很健康`, 'it_medicine'); return false; }
    if (!Life.has('medicine')) { UI.toast('沒有寵物藥了', 'it_medicine'); return false; }
    Life.L.bag.medicine--; if (!Life.L.bag.medicine) delete Life.L.bag.medicine;
    p.sick = false; p.low = 0; p.hunger = Math.max(p.hunger, 30); p.clean = Math.max(p.clean, 30); this.mood(p, 8); this.addBond(p, 3);
    this.puff(p, 'p_heart', 2); this.say(p, this.voice(p, '喵～好多了', '汪！好多了')); this.after(p, 'care'); return true;
  },
  sleep(pid) {
    const p = this.get(pid), a = this.actor(p); if (!a) { UI.toast(`${p ? p.name : '寵物'}不在房間裡`, 'i_moon'); return; }
    a.goNap(); UI.toast(`${p.name}去睡覺了，睡覺時精力恢復得比較快`, 'i_moon', 2.6);
  },
  pet(pid) {
    const p = this.get(pid); if (!p) return; this.dayReset(p); const day = Life.today();
    p.day.pet++; p.st.pet++; this.mood(p, 3); if (p.day.pet <= 6) { this.addBond(p, 1); this.addXp(p, 1); }
    Life.track('pet', 1);
    for (const n of Life.L.needs) if (n.type === 'cat_pet' && n.pet === pid) { n.prog = (n.prog || 0) + 1; if (n.prog >= 3) Life.complete(n); }
    const chance = 0.3 + (p.trait === 'curious' ? 0.2 : 0) + TRICKS.filter(t => this.knows(p, t.id)).length * 0.03;
    if (p.blv >= 2 && p.gift !== day && Math.random() < chance) {
      p.gift = day;
      setTimeout(() => {
        if (Math.random() < 0.6) { const c = 10 + p.blv * 3 + p.lv; Game.reward(c, 0, 'raw'); UI.toast(`${p.name}叼來了 ${c} 枚金幣送你`, 'i_coin', 3.5); }
        else { const s = Life.randomSupply(); Life.give(s, 1); UI.toast(`${p.name}叼來了一個${SUPPLIES[s].n}`, 'i_paw', 3.5); }
        const a = this.actor(p); if (a) Room.puff('p_coin', a.x - 2, a.y - 18, { vy: -12, max: 1.2 });
      }, 900);
    }
    UI.refresh('pet'); Game.save();
  },
  // ---------- tricks ----------
  trainTitle(o) { const p = this.get(o.pid), t = TRICKS.find(x => x.id === o.trick); return `訓練${p ? p.name : ''}「${t ? t.n : ''}」`; },
  train(pid, tid) {
    const p = this.get(pid), t = TRICKS.find(x => x.id === tid); if (!p || !t) return;
    if (p.lv < t.lv) return UI.toast(`${p.name}要 Lv ${t.lv} 才能學「${t.n}」`, 'i_paw');
    if (this.knows(p, tid)) return UI.toast(`${p.name}已經學會「${t.n}」了`, 'i_paw');
    const w = this.why(p, 'train'); if (w) return UI.toast(w, 'i_paw', 3);
    Learn.start('train', { pid, trick: tid });
  },
  trainResult(pid, tid, R, n) {
    const p = this.get(pid), t = TRICKS.find(x => x.id === tid); if (!p || !t) return { msg: '' };
    p.energy = clamp100(p.energy - 25); p.st.train++; Life.track('train', 1);
    const ok = R >= Math.ceil(n * 0.75);
    let msg;
    if (ok) {
      p.tricks[tid] = Math.min(t.need, (p.tricks[tid] || 0) + 1); this.addXp(p, 8 + R * 2); this.addBond(p, 3); this.mood(p, 6);
      if (p.tricks[tid] >= t.need) { msg = `${p.name}學會「${t.n}」了！在寵物視窗按「表演」看看。`; Life.track('trick', 1); this.puff(p, 'p_heart', 4); }
      else msg = `訓練成功！「${t.n}」進度 ${p.tricks[tid]}/${t.need}`;
    } else { this.addXp(p, 3); msg = `答對 ${Math.ceil(n * 0.75)} 題才算訓練成功，${p.name}還在努力。`; }
    for (const nd of [...Life.L.needs]) if (nd.type === 'pet_train' && nd.pet === pid && ok) Life.complete(nd);
    UI.refresh('pet'); Game.save(); saveSoon();
    return { msg };
  },
  perform(pid, tid) {
    const p = this.get(pid), t = TRICKS.find(x => x.id === tid); if (!p || !t || !this.knows(p, tid)) return;
    const a = this.actor(p); if (!a) return UI.toast(`${p.name}在寵物旅館，帶牠回房間才能表演`, 'i_paw');
    this.dayReset(p); a.doTrick(tid);
    if (!p.day.show[tid]) { p.day.show[tid] = 1; const c = 5 + p.lv + TRICKS.indexOf(t) * 3; Game.reward(c, 4, 'task'); this.mood(p, 5); this.addBond(p, 1); UI.toast(`${p.name}表演了「${t.n}」！今天第一次表演獲得 ${c} 金幣`, 'i_star', 3); }
    UI.refresh('pet'); Game.save(); saveSoon();
  },
  // ---------- shop / roster ----------
  buyTool(id) {
    const t = PET_TOOLS[id]; if (this.Z.tools[id]) return; if (Game.S.coins < t.price) return UI.toast(`金幣不夠，還差 ${t.price - Game.S.coins}`, 'i_coin');
    Game.S.coins -= t.price; this.Z.tools[id] = 1; Life.track('buy', 1, { kind: 'tool', id }); UI.toast(`買了${t.n}`, t.spr); UI.hud(true); UI.refresh('pet'); Game.save(); saveSoon();
  },
  buyAcc(id) {
    const a = PET_ACCS[id]; if (this.Z.accs[id]) return; if (Game.S.lvl < a.lv) return UI.toast(`需要 Lv ${a.lv}`, 'i_star');
    if (Game.S.coins < a.price) return UI.toast(`金幣不夠，還差 ${a.price - Game.S.coins}`, 'i_coin');
    Game.S.coins -= a.price; this.Z.accs[id] = 1; Life.track('buy', 1, { kind: 'acc', id }); UI.toast(`買了${a.n}，所有寵物都可以戴`, 'i_paw'); UI.hud(true);
    const p = this.sel(); if (p && !p.acc[a.slot]) p.acc[a.slot] = id;
    UI.refresh('pet'); Game.save(); saveSoon();
  },
  equip(pid, slot, id) { const p = this.get(pid); if (!p) return; p.acc[slot] = p.acc[slot] === id ? null : id; UI.refresh('pet'); Game.save(); },
  adopt(sp) {
    const Z = this.Z, d = PETS[sp]; if (!d) return;
    if (Z.pets.length >= PET_MAX) return UI.toast(`最多養 ${PET_MAX} 隻寵物`, 'i_paw');
    if (Game.S.lvl < d.lvl) return UI.toast(`需要 Lv ${d.lvl} 才能領養`, 'i_star');
    const price = this.adoptPrice(sp); if (Game.S.coins < price) return UI.toast(`金幣不夠，還差 ${price - Game.S.coins}`, 'i_coin');
    Game.S.coins -= price; const p = this.make(Z, sp); p.home = !this.roomFull(); Z.pets.push(p); Z.sel = p.id;
    if (!Game.S.pets.includes(sp)) Game.S.pets.push(sp);
    this.syncActors(); Life.track('buy', 1, { kind: 'pet', id: sp });
    UI.toast(`領養了${d.n}「${p.name}」！` + (p.home ? '' : `房間最多 ${PET_ROOM_MAX} 隻，牠先住在寵物旅館`), 'i_paw', 4);
    UI.hud(true); UI.refresh('shop'); UI.petTab = 'care'; UI.openWin('pet'); Game.save(); saveSoon();
    setTimeout(() => { const el = document.getElementById('pet-name'); if (el) { el.focus(); el.select(); } }, 60);
  },
  setHome(pid, on) {
    const p = this.get(pid); if (!p) return;
    if (on && !p.home && this.roomFull()) return UI.toast(`房間最多同時 ${PET_ROOM_MAX} 隻寵物，先讓一隻去寵物旅館`, 'i_paw', 3.5);
    if (!on && this.home().length <= 1) return UI.toast('房間裡至少要留一隻寵物', 'i_paw');
    p.home = on; for (const n of [...Life.L.needs]) if (n.pet === pid) Life.drop(n);
    this.syncActors(); UI.toast(on ? `${p.name}回到房間了` : `${p.name}去寵物旅館住幾天，那裡會好好照顧牠`, 'i_paw', 3); UI.refresh('pet'); Game.save();
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
Object.assign(UI, {
  petTab: 'care',
  w_pet() {
    const Z = Pets.Z, p = Pets.sel(); if (!p) return [];
    Z.sel = p.id; const [k, c] = p.sp.split(':');
    const roster = h('div', { class: 'proster' }, ...Z.pets.map(q => {
      const [kk, cc] = q.sp.split(':'), warn = q.sick || q.hunger < 30 || q.clean < 30 || q.mood < 30;
      return h('button', { class: 'pcard' + (q.id === p.id ? ' cur' : '') + (q.home ? '' : ' away'), title: q.name + (q.home ? '' : '（寵物旅館）'), onclick: () => { Z.sel = q.id; this.refresh('pet'); } },
        sprPreview(petCanvas(kk, cc, 'sit', 0, false, q.acc), 40, 2), h('span', { text: q.name }), warn ? h('i', { class: 'pwarn' }) : null);
    }), Z.pets.length < PET_MAX ? h('button', { class: 'pcard add', title: '領養新寵物', onclick: () => { this.shopTab = 'pet'; this.openWin('shop'); } }, ico('i_plus', 22), h('span', { text: '領養' })) : null);
    const pv = sprPreview(petCanvas(k, c, 'sit', 0, false, p.acc), 104, 4);
    const bar = (label, v, cls, tip) => h('div', { class: 'pstat', title: tip || '' }, h('span', { text: label }), h('div', { class: 'pbar ' + cls }, h('i', { style: `width:${Math.round(v)}%` })), h('b', { class: 'num', text: String(Math.round(v)) }));
    const need = Pets.xpNeed(p.lv);
    const head = h('div', { class: 'ava-row' }, h('div', { class: 'ava-stage pet' }, pv, p.sick ? h('span', { class: 'ptag sick', text: '不舒服' }) : null),
      h('div', { class: 'ava-opts' },
        h('label', { class: 'field' }, h('span', { text: `${PETS[p.sp].n} · ${Pets.stageName(p)}` }), h('div', { class: 'inset' }, h('input', { id: 'pet-name', type: 'text', maxlength: '12', value: p.name, onchange: e => { Pets.rename(p.id, e.target.value); this.refresh('pet'); } }))),
        h('div', { class: 'pstat' }, h('span', { text: `成長 Lv ${p.lv}` }), h('div', { class: 'pbar xp' }, h('i', { style: `width:${p.lv >= PET_LV_MAX ? 100 : Math.round(p.xp / need * 100)}%` })), h('b', { class: 'num', text: p.lv >= PET_LV_MAX ? 'MAX' : `${p.xp}/${need}` })),
        h('div', { class: 'pstat' }, h('span', { text: `羈絆 Lv ${p.blv}` }), h('div', { class: 'pbar bond' }, h('i', { style: `width:${Math.round(p.bond / Pets.bondNeed(p.blv) * 100)}%` })), h('b', { class: 'num', text: `${p.bond}/${Pets.bondNeed(p.blv)}` })),
        h('div', { class: 'ptraits' }, h('span', { class: 'ptag', title: TRAITS[p.trait].d, text: TRAITS[p.trait].n }),
          h('span', { class: 'ptag', title: '最喜歡的食物', text: '愛吃：' + (p.known.food ? SUPPLIES[p.fav.food].n : '？？') }),
          h('span', { class: 'ptag', title: '最喜歡的玩具', text: '愛玩：' + (p.known.toy ? (PET_TOOLS[p.fav.toy] || SUPPLIES[p.fav.toy]).n : '？？') }))));
    const stats = h('div', { class: 'pstats2' }, bar('飽足', p.hunger, 'food', '低於 35 會肚子餓'), bar('心情', p.mood, 'mood', '玩耍、零食、摸摸會變好'), bar('清潔', p.clean, 'clean', '梳毛、洗澡會變乾淨'), bar('精力', p.energy, 'energy', '睡覺會恢復；玩耍和訓練會消耗'));
    const tabs = h('div', { class: 'tabs' }, ...[['care', '照顧'], ['train', '把戲'], ['acc', '配件'], ['info', '紀錄']].map(([id, l]) => h('button', { class: 'tab' + (this.petTab === id ? ' on' : ''), onclick: () => { this.petTab = id; this.refresh('pet'); } }, l)));
    const bag = Life.L.bag, body = [];
    const sbtn = (spr, label, cnt, fn, opts = {}) => h('button', { class: 'swapbtn' + (opts.fav ? ' fav' : ''), title: opts.title || '', disabled: !!opts.disabled, onclick: fn }, ico(spr, 30), h('span', { text: label }), cnt != null ? h('em', { class: 'num', text: cnt }) : null);
    if (this.petTab === 'care') {
      const bowls = Pets.bowls();
      if (bowls.length) {
        const cur = Room.uidMap[this.petBowl] && ITEMS[Room.uidMap[this.petBowl].k].bowl ? Room.uidMap[this.petBowl] : (Pets.bowlOf(p) || bowls.find(b => !Pets.bowlOwner(b)) || bowls[0]);
        this.petBowl = cur.uid;
        const lvlTxt = (b) => { const n = (b.bq || []).length; return n ? `${n} 份（${b.bq.map(q => SUPPLIES[q.k].n).join('、')}）` : '空的'; };
        body.push(h('div', { class: 'sub', text: '飼料碗' }));
        if (bowls.length > 1) body.push(h('div', { class: 'tabs wrap' }, ...bowls.map((b, i) => { const o = Pets.bowlOwner(b); return h('button', { class: 'tab sm' + (b === cur ? ' on' : ''), onclick: () => { this.petBowl = b.uid; this.refresh('pet'); } }, `碗 ${i + 1}：${o ? o.name : '共用'}`); })));
        const owner = Pets.bowlOwner(cur), mine = owner && owner.id === p.id;
        body.push(h('div', { class: 'pbowl' }, sprPreview(SPR.get(Pets.bowlLevel(cur) ? 'pet_bowl_' + Pets.bowlLevel(cur) : 'pet_bowl'), 44, 2),
          h('div', { class: 'grow' }, h('div', { text: owner ? `${owner.name}的碗` : '共用的碗（沒有指定的寵物都能吃）' }), h('div', { class: 'hint', text: `碗裡：${lvlTxt(cur)}，最多 ${BOWL_MAX} 份。肚子餓了會自己去吃，一次吃一點。` })),
          mine ? h('button', { class: 'chip sm', onclick: () => Pets.assignBowl(cur.uid, null) }, '改成共用') : h('button', { class: 'chip sm primary', onclick: () => Pets.assignBowl(cur.uid, p.id) }, `指定給${p.name}`)));
        body.push(h('div', { class: 'swap' }, ...Object.keys(PET_FOODS).filter(f => f !== 'cat_treat').map(f => sbtn(SUPPLIES[f].spr, '放' + SUPPLIES[f].n, '×' + (bag[f] || 0), () => Pets.fillBowl(cur.uid, f), { title: `把一份${SUPPLIES[f].n}放進碗裡：${SUPPLIES[f].desc}`, disabled: !(bag[f] > 0) || (cur.bq || []).length >= BOWL_MAX }))));
      }
      body.push(h('div', { class: 'sub', text: '直接餵' }), h('div', { class: 'swap' }, ...Object.keys(PET_FOODS).map(f => sbtn(SUPPLIES[f].spr, SUPPLIES[f].n, '×' + (bag[f] || 0), () => Pets.feed(p.id, f), { title: SUPPLIES[f].desc, fav: p.known.food && p.fav.food === f }))));
      body.push(h('div', { class: 'sub', text: '玩耍' }), h('div', { class: 'swap' }, ...PET_TOYS.map(t => {
        if (t === 'catnip') return sbtn('it_catnip', '貓薄荷', '×' + (bag.catnip || 0), () => Pets.play(p.id, 'catnip'), { title: SUPPLIES.catnip.desc, fav: p.known.toy && p.fav.toy === t });
        const T = PET_TOOLS[t], own = Z.tools[t];
        return sbtn(T.spr, T.n, own ? '' : T.price + '金', () => own ? Pets.play(p.id, t) : Pets.buyTool(t), { title: own ? T.desc : `買${T.n}（${T.price} 金幣）：${T.desc}`, fav: p.known.toy && p.fav.toy === t });
      })));
      const brushWait = Math.max(0, Math.ceil((p.brushAt + 20 * 60000 - Date.now()) / 60000));
      body.push(h('div', { class: 'sub', text: '清潔與休息' }), h('div', { class: 'swap' },
        Z.tools.brush ? sbtn('t_brush', brushWait ? `梳毛（${brushWait} 分）` : '梳毛', '', () => Pets.brush(p.id), { title: PET_TOOLS.brush.desc }) : sbtn('t_brush', '買梳子', '80金', () => Pets.buyTool('brush'), { title: PET_TOOLS.brush.desc }),
        sbtn('it_shampoo', '洗澡', '×' + (bag.shampoo || 0), () => Pets.bath(p.id), { title: SUPPLIES.shampoo.desc }),
        sbtn('it_medicine', '吃藥', '×' + (bag.medicine || 0), () => Pets.medicine(p.id), { title: SUPPLIES.medicine.desc, disabled: !p.sick }),
        sbtn('i_moon', '去睡覺', null, () => Pets.sleep(p.id), { title: '讓牠找個地方睡覺，精力恢復得比較快' })));
      body.push(h('p', { class: 'hint', text: `${TRAITS[p.trait].n}：${TRAITS[p.trait].d} 在房間裡點牠可以摸摸。缺道具時，到「學習」複習單字就能換。` }));
    } else if (this.petTab === 'train') {
      body.push(h('p', { class: 'hint', text: '訓練一次要答 4 題單字小測驗，答對 3 題以上算成功。每次訓練消耗 25 精力，心情要 35 以上。學會的把戲每天第一次表演可以拿金幣。' }));
      for (const t of TRICKS) {
        const prog = p.tricks[t.id] || 0, known = prog >= t.need, locked = p.lv < t.lv;
        body.push(h('div', { class: 'task' + (known ? ' claimed' : '') }, h('div', { class: 'task-main' }, h('div', { class: 'task-t', text: t.n + (locked ? `（Lv ${t.lv}）` : '') }), h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round(prog / t.need * 100)}%` })), h('div', { class: 'task-meta' }, h('span', { class: 'num hint', text: `${prog}/${t.need}` }), known ? h('span', { class: 'hint', text: p.day.d === Life.today() && p.day.show[t.id] ? '今天表演過了' : '今天還沒表演' }) : null)),
          known ? h('button', { class: 'chip sm primary', onclick: () => Pets.perform(p.id, t.id) }, '表演') : h('button', { class: 'chip sm', disabled: locked, onclick: () => Pets.train(p.id, t.id) }, ico('i_learn', 16), '訓練')));
      }
    } else if (this.petTab === 'acc') {
      for (const slot of ['neck', 'head']) {
        body.push(h('div', { class: 'sub', text: slot === 'neck' ? '脖子' : '頭上' }));
        body.push(h('div', { class: 'grid small accs' }, ...Object.keys(PET_ACCS).filter(id => PET_ACCS[id].slot === slot).map(id => {
          const A = PET_ACCS[id], own = Z.accs[id], on = p.acc[slot] === id, acc = Object.assign({}, p.acc, { [slot]: id });
          return h('button', { class: 'card pick' + (on ? ' cur' : ''), title: own ? (on ? '再點一下拿下來' : '戴上') : `${A.price} 金幣` + (Game.S.lvl < A.lv ? `（Lv ${A.lv}）` : ''), onclick: () => own ? Pets.equip(p.id, slot, id) : Pets.buyAcc(id) },
            h('div', { class: 'pvbox' }, sprPreview(petCanvas(k, c, 'sit', 0, false, acc), 48, 2)), h('div', { class: 'cn', text: A.n }), own ? (on ? h('span', { class: 'own', text: '戴著' }) : null) : h('div', { class: 'price' }, ico('i_coin', 14), h('b', { class: 'num', text: String(A.price) })));
        })));
      }
      body.push(h('p', { class: 'hint', text: '配件買一次，所有寵物都可以戴。' }));
    } else {
      const days = Math.max(1, Math.floor((Date.now() - p.at) / 86400000) + 1);
      body.push(h('dl', { class: 'stats' }, h('dt', { text: '一起生活' }), h('dd', { class: 'num', text: `${days} 天` }), h('dt', { text: '餵食' }), h('dd', { class: 'num', text: `${p.st.fed} 次` }), h('dt', { text: '玩耍' }), h('dd', { class: 'num', text: `${p.st.play} 次` }), h('dt', { text: '梳毛洗澡' }), h('dd', { class: 'num', text: `${p.st.groom} 次` }), h('dt', { text: '訓練' }), h('dd', { class: 'num', text: `${p.st.train} 次` }), h('dt', { text: '摸摸' }), h('dd', { class: 'num', text: `${p.st.pet} 次` }), h('dt', { text: '學會把戲' }), h('dd', { class: 'num', text: `${TRICKS.filter(t => Pets.knows(p, t.id)).length}/${TRICKS.length}` })));
      body.push(h('div', { class: 'row wrap' },
        h('button', { class: 'chip', onclick: () => Pets.setHome(p.id, !p.home) }, ico(p.home ? 'i_box' : 'i_heart', 18), p.home ? '送去寵物旅館' : '帶回房間'),
        Z.pets.length > 1 ? h('button', { class: 'chip', onclick: () => { if (confirm(`確定要讓${p.name}去新家嗎？這個動作不能復原。`)) Pets.release(p.id); } }, '送養') : null));
      body.push(h('p', { class: 'hint', text: `房間裡最多同時 ${PET_ROOM_MAX} 隻寵物，最多養 ${PET_MAX} 隻。住在寵物旅館的寵物不會餓，也不會出現需求。` }));
    }
    return [roster, head, stats, tabs, ...body];
  },
});
UI.WIN.pet.w = 470;
