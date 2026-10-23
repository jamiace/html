/* ============================================================
   Life: supplies, pet stats, needs, daily tasks, achievements,
   room comfort — and the windows that show them
   ============================================================ */
const SUPPLIES = {
  cat_can: { n: '罐頭', spr: 'it_cat_can', price: 40, pet: 1, desc: '飽足 +45、心情 +5。寵物會走到碗旁邊吃。' },
  fish_snack: { n: '小魚乾', spr: 'it_fish', price: 25, pet: 1, desc: '飽足 +20、心情 +8，點心大小。' },
  premium_food: { n: '豪華餐', spr: 'it_premium', price: 75, pet: 1, desc: '飽足 +70、心情 +15、精力 +10，成長經驗加倍。' },
  cat_treat: { n: '零食', spr: 'it_cat_treat', price: 30, pet: 1, desc: '心情 +12、羈絆 +6。' },
  catnip: { n: '貓薄荷', spr: 'it_catnip', price: 45, pet: 1, desc: '寵物會興奮地滿屋子跑，心情 +30，消耗精力 25。' },
  shampoo: { n: '洗毛精', spr: 'it_shampoo', price: 35, pet: 1, desc: '洗澡，清潔直接回滿。貓咪不太喜歡水，愛乾淨的寵物例外。' },
  medicine: { n: '寵物藥', spr: 'it_medicine', price: 60, pet: 1, desc: '寵物不舒服時吃，馬上恢復健康。' },
  fertilizer: { n: '植物營養液', spr: 'it_fertilizer', price: 40, desc: '讓枯黃的植物恢復精神。' },
  spray: { n: '清潔噴霧', spr: 'it_spray', price: 40, desc: '把積灰塵的家具擦乾淨。' },
  bulb: { n: '燈泡', spr: 'it_bulb', price: 45, desc: '換掉燒壞的燈泡。' },
  coffee: { n: '咖啡', spr: 'it_coffee', price: 30, desc: '提神，下一輪專注的經驗 +30%。' },
  onigiri: { n: '飯糰', spr: 'it_onigiri', price: 30, desc: '吃飽，下一輪專注的金幣 +30%。' },
};
const PETNAME = (n) => (typeof Pets !== 'undefined' && Game.S && Game.S.zoo) ? Pets.name(n && n.pet != null ? n.pet : (Pets.sel() || {}).id) : '寵物';
const NEED_DEFS = {
  cat_hungry: { who: 'pet', item: 'cat_can', alt: ['fish_snack', 'premium_food'], t: (n) => `${PETNAME(n)}肚子餓了`, d: '牠一直盯著碗。罐頭、小魚乾、豪華餐都可以。', rw: { c: 12, x: 10, b: 8 } },
  cat_play: { who: 'pet', item: 'catnip', t: (n) => `${PETNAME(n)}好無聊`, d: '想玩！用貓薄荷，或在寵物視窗用逗貓棒、毛線球陪牠玩。', rw: { c: 10, x: 8, b: 8 } },
  cat_treat: { who: 'pet', item: 'cat_treat', t: (n) => `${PETNAME(n)}在撒嬌`, d: '蹭著你的腳，想討點心吃。', rw: { c: 8, x: 6, b: 10 } },
  cat_pet: { who: 'pet', action: 'pet', count: 3, icon: 'n_heart', t: (n) => `${PETNAME(n)}想被摸摸`, d: '摸牠三下：在房間裡點牠，或按下面的「摸摸牠」。', rw: { c: 6, x: 6, b: 6 } },
  pet_want: { who: 'pet', action: 'want', icon: 'n_seat', t: (n) => `${PETNAME(n)}想要${ITEMS[n.k] ? ITEMS[n.k].n : '新家具'}`, d: '在房間擺一個給牠，收納箱沒有的話可以到商店買。', rw: { c: 20, x: 15, b: 10 } },
  pet_dirty: { who: 'pet', item: 'shampoo', t: (n) => `${PETNAME(n)}身上髒髒的`, d: '用洗毛精幫牠洗澡，或在寵物視窗用梳子梳一梳。', rw: { c: 10, x: 8, b: 6 } },
  pet_sick: { who: 'pet', item: 'medicine', t: (n) => `${PETNAME(n)}不太舒服`, d: '餓太久或太髒會生病。餵牠吃寵物藥就會好。', rw: { c: 10, x: 10, b: 8 } },
  pet_train: { who: 'pet', action: 'train', icon: 'n_star', t: (n) => `${PETNAME(n)}想學新把戲`, d: '到寵物視窗的「把戲」訓練牠一次（訓練成功才算）。', rw: { c: 15, x: 15, b: 6 } },
  plant_wilt: { who: 'item', item: 'fertilizer', t: (n) => `${Life.targetName(n)}的葉子枯黃了`, d: '用植物營養液讓它恢復精神。', rw: { c: 12, x: 8 } },
  dusty: { who: 'item', item: 'spray', t: (n) => `${Life.targetName(n)}積了灰塵`, d: '用清潔噴霧擦乾淨。', rw: { c: 10, x: 8 } },
  bulb: { who: 'item', item: 'bulb', t: (n) => `${Life.targetName(n)}的燈泡燒壞了`, d: '換一顆新燈泡才能再打開。', rw: { c: 12, x: 10 } },
  curtain: { who: 'item', action: 'curtain', icon: 'n_sun', t: () => '外面天氣很好', d: '點一下窗戶，拉開窗簾讓陽光進來。', rw: { c: 6, x: 6 } },
  ava_hungry: { who: 'avatar', item: 'onigiri', t: () => '肚子有點餓', d: '來顆飯糰，下一輪專注的金幣 +30%。', rw: { c: 8, x: 8 } },
  ava_sleepy: { who: 'avatar', item: 'coffee', t: () => '好睏…', d: '來杯咖啡，下一輪專注的經驗 +30%。', rw: { c: 8, x: 8 } },
  arrange: { who: 'avatar', action: 'place', icon: 'n_box', t: () => '想佈置一下房間', d: '把收納箱裡的任一件東西擺到房間裡。', rw: { c: 10, x: 10 } },
  lights: { who: 'avatar', action: 'light', icon: 'n_light', t: () => '房間好暗', d: '打開任一盞燈。', rw: { c: 6, x: 6 } },
};
const TASK_DEFS = {
  vocab: { t: () => '完成今日 20 個單字複習與小測驗', need: () => 1, rw: { c: 50, x: 40, item: 1 }, go: 'learn' },
  buy: { t: (k) => `購買「${ITEMS[k.item] ? ITEMS[k.item].n : '家具'}」`, need: () => 1, rw: null, go: 'shopItem' },
  focus: { t: (k) => `專注 ${k.need} 分鐘`, need: () => (Game.S.lvl >= 4 ? 50 : 25), rw: { c: 30, x: 25 }, go: 'timer' },
  todo: { t: () => '完成 2 件待辦', need: () => 2, rw: { c: 20, x: 15 }, go: 'todo' },
  need: { t: () => '滿足 2 個房間需求', need: () => 2, rw: { c: 25, x: 20, item: 1 }, go: 'needs' },
  feed: { t: () => '餵寵物吃 2 次東西', need: () => 2, rw: { c: 15, x: 10 }, go: 'pet' },
  pet: { t: () => '摸摸寵物 5 次', need: () => 5, rw: { c: 10, x: 10 }, go: null },
  play: { t: () => '陪寵物玩 2 次', need: () => 2, rw: { c: 15, x: 12 }, go: 'pet' },
  groom: { t: () => '幫寵物梳毛或洗澡', need: () => 1, rw: { c: 12, x: 10 }, go: 'pet' },
  train: { t: () => '訓練寵物 1 次', need: () => 1, rw: { c: 20, x: 20 }, go: 'petTrain' },
  quiz: { t: () => '小測驗累積答對 15 題', need: () => 15, rw: { c: 25, x: 25 }, go: 'learn' },
  place: { t: () => '擺放或移動家具 3 次', need: () => 3, rw: { c: 15, x: 10 }, go: 'edit' },
  study: { t: () => '完成 1 次自由練習', need: () => 1, rw: { c: 20, x: 20 }, go: 'learn' },
  buyany: { t: () => '在商店買任意一樣東西', need: () => 1, rw: { c: 15, x: 10 }, go: 'shop' },
};
const ACHS = [
  { id: 'words', n: '單字收藏家', d: (v) => `學會 ${v} 個單字`, m: () => Learn.countLearned(), tiers: [20, 50, 100, 200, 500, 1000, 2000, 4000, 6800], special: { 2: 'trophy' } },
  { id: 'master', n: '單字精熟', d: (v) => `精熟 ${v} 個單字`, m: () => Learn.countMastered(), tiers: [10, 50, 150, 300, 1000, 3000, 6000] },
  { id: 'streak', n: '每天都來', d: (v) => `連續 ${v} 天完成每日單字`, m: () => (Game.S.learn.best || 0), tiers: [3, 7, 14, 30, 60], special: { 1: 'diploma' } },
  { id: 'quiz', n: '測驗高手', d: (v) => `小測驗累積答對 ${v} 題`, m: () => Life.L.stats.quizRight, tiers: [50, 200, 500, 1500, 3000] },
  { id: 'focus', n: '專注達人', d: (v) => `累積專注 ${v} 小時`, m: () => Math.floor(Game.S.stats.focusMin / 60), tiers: [1, 5, 20, 50, 100] },
  { id: 'needs', n: '貼心室友', d: (v) => `滿足 ${v} 個需求`, m: () => Life.L.stats.needs, tiers: [5, 20, 50, 120, 300] },
  { id: 'bond', n: '最好的朋友', d: (v) => `和一隻寵物的羈絆達到 Lv ${v}`, m: () => Pets.maxBlv(), tiers: [2, 4, 6, 8, 10], special: { 0: 'cushion' } },
  { id: 'family', n: '毛小孩家族', d: (v) => `一起生活的寵物有 ${v} 隻`, m: () => Pets.list().length, tiers: [2, 3, 5, 8] },
  { id: 'grow', n: '拉拔長大', d: (v) => `一隻寵物成長到 Lv ${v}`, m: () => Pets.maxLv(), tiers: [5, 10, 15, 20] },
  { id: 'trainer', n: '馴獸師', d: (v) => `寵物們一共學會 ${v} 個把戲`, m: () => Pets.trickCount(), tiers: [1, 3, 6, 12, 20, 30] },
  { id: 'decor', n: '佈置高手', d: (v) => `房間裡擺了 ${v} 件東西`, m: () => Game.S.items.length, tiers: [15, 25, 40, 60] },
  { id: 'rich', n: '小富翁', d: (v) => `累積賺到 ${v} 金幣`, m: () => Life.L.stats.coins, tiers: [500, 2000, 6000, 15000, 40000, 100000, 250000] },
];
const WILT_MAP = { k: 'w', l: 'x', j: 'v', i: 'u' };
const clamp100 = (v) => Math.max(0, Math.min(100, v));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const Life = {
  _hits: [], _acc: 0, notified: {},
  get L() { return Game.S.life; },
  newState() {
    return {
      bag: { cat_can: 2, cat_treat: 1, catnip: 1, coffee: 1 },
      pet: { hunger: 72, mood: 70, bond: 0, lv: 1, petDay: '', petN: 0, giftDay: '' },
      needs: [], nextNeedAt: Date.now() + 90 * 1000, lastTick: Date.now(), daily: null, ach: {}, buff: {}, nid: 1,
      stats: { needs: 0, fed: 0, coins: 0, quizRight: 0 },
    };
  },
  migrate(S) {
    const base = this.newState(); if (!S.life) S.life = base;
    for (const k in base) if (!(k in S.life)) S.life[k] = base[k];
    for (const k in base.pet) if (!(k in S.life.pet)) S.life.pet[k] = base.pet[k];
    for (const k in base.stats) if (!(k in S.life.stats)) S.life.stats[k] = base.stats[k];
    const hasBowl = S.items.some(i => i.k === 'pet_bowl') || (S.inv.pet_bowl || 0) > 0; if (!hasBowl) S.inv.pet_bowl = 1;
  },
  today() { return dayKey(gameDate()); },
  has(id) { return (this.L.bag[id] || 0) > 0; },
  give(id, n = 1) { this.L.bag[id] = (this.L.bag[id] || 0) + n; UI.refresh('storage'); UI.refresh('pet'); UI.refresh('need'); },
  randomSupply() { const ks = Object.keys(SUPPLIES); return ks[Math.floor(Math.random() * ks.length)]; },
  // ---------- comfort ----------
  comfort() { let c = 0; for (const it of Game.S.items) { const d = ITEMS[it.k]; if (d) c += d.comfort != null ? d.comfort : 1 + Math.floor((d.price || 0) / 40); } return c + Math.max(0, Game.S.themes.length - 1) * 4; },
  comfortLv() { return Math.min(10, Math.floor(this.comfort() / 12)); },
  coinMult() { return 1 + this.comfortLv() * 0.03; },
  // ---------- pet ----------
  bondNeed(lv) { return Pets.bondNeed(lv); },
  onPet() { const p = Pets.sel(); if (p) Pets.pet(p.id); },
  // ---------- needs ----------
  targetName(n) { const it = Room.uidMap[n.target]; return it ? ITEMS[it.k].n : '家具'; },
  needOf(who, key) { return this.L.needs.find(n => NEED_DEFS[n.type].who === who && (who === 'avatar' || (who === 'item' ? n.target === key : n.pet === key))); },
  activeCount() { return this.L.needs.filter(n => !['cat_hungry', 'pet_sick', 'pet_dirty', 'cat_play'].includes(n.type)).length; },
  candidates(type) {
    const S = Game.S, items = S.items.filter(i => i.p == null || ITEMS[i.k].layer === 'decor');
    if (type === 'plant_wilt') return items.filter(i => (ITEMS[i.k].cat === 'plant') && !i.wilt);
    if (type === 'dusty') return items.filter(i => { const d = ITEMS[i.k]; return !i.dust && (d.surface || d.desk || d.bed || d.seat) && d.layer !== 'wall'; });
    if (type === 'bulb') return items.filter(i => { const d = ITEMS[i.k]; return !i.broken && d.toggle && d.light && !d.fire && !d.flicker && !d.glow; });
    if (type === 'curtain') return items.filter(i => ITEMS[i.k].window && i.closed);
    return [];
  },
  addNeed(type, quiet, pid) {
    const L = this.L, def = NEED_DEFS[type]; if (!def) return false;
    if (def.who === 'pet') {
      if (pid == null) { const c = shuffle(Pets.home().filter(p => !L.needs.some(n => n.pet === p.id && n.type !== 'cat_hungry'))); if (!c.length) return false; pid = c[0].id; }
      const pp = Pets.get(pid); if (!pp || !pp.home) return false;
      if (L.needs.some(n => n.type === type && n.pet === pid)) return false;
      if (type === 'pet_want' && L.needs.some(n => n.type === 'pet_want')) return false;
      if (type === 'pet_train' && !TRICKS.some(t => pp.lv >= t.lv && !Pets.knows(pp, t.id))) return false;
    } else if (def.who === 'avatar') { if (L.needs.some(n => NEED_DEFS[n.type].who === 'avatar')) return false; }
    const n = { id: L.nid++, type, t: Date.now(), prog: 0 }; if (def.who === 'pet') n.pet = pid;
    if (def.who === 'item') {
      const c = this.candidates(type); if (!c.length) return false;
      const it = c[Math.floor(Math.random() * c.length)]; n.target = it.uid;
      if (type === 'plant_wilt') it.wilt = true; if (type === 'dusty') it.dust = true; if (type === 'bulb') { it.broken = true; it.on = false; }
    }
    if (type === 'arrange' && !Object.keys(Game.S.inv).some(k => Game.S.inv[k] > 0 && ITEMS[k])) return false;
    if (type === 'lights' && (Room.env.dark < 0.3 || this.anyLightOn() || !Game.S.items.some(i => ITEMS[i.k].toggle && ITEMS[i.k].light && !i.broken))) return false;
    if (type === 'curtain' && (Room.env.dark > 0.05 || Room.env.rain)) return false;
    if (type === 'pet_want') {
      const pool = ['cushion', 'cat_tree', 'beanbag', 'rug_round', 'yarn_basket', 'zabuton', 'rattan_chair'].filter(k => ITEMS[k] && ITEMS[k].lvl <= Game.S.lvl && !Game.S.items.some(i => i.k === k));
      if (!pool.length) return false; n.k = pool[Math.floor(Math.random() * pool.length)];
    }
    if (type === 'ava_hungry' || type === 'ava_sleepy') { if (Game.focusing()) return false; }
    L.needs.push(n);
    if (!quiet) UI.toast(`新的需求：${def.t(n)}`, def.item ? SUPPLIES[def.item].spr : def.icon, 3.5, { label: '看看', fn: () => UI.needCard(n.id) });
    if (def.who === 'pet') { const a = Pets.actor(Pets.get(pid)); if (a) Game.bubble(a, a.kind === 'dog' ? (type === 'cat_hungry' ? '汪…肚子餓' : '汪～') : (type === 'cat_hungry' ? '喵…肚子餓' : '喵～'), 2.2); }
    UI.refresh('tasks'); UI.badges(); Game.save(); saveSoon();
    return true;
  },
  anyLightOn() { return Game.S.items.some(i => { const d = ITEMS[i.k]; return d.toggle && d.light && i.on && !i.broken; }); },
  maybeNeeds() {
    const L = this.L, now = Date.now();
    for (const p of Pets.home()) {
      if (p.sick) this.addNeed('pet_sick', false, p.id);
      if (p.hunger < 35) this.addNeed('cat_hungry', false, p.id);
      if (p.mood < 28) this.addNeed('cat_play', false, p.id);
      if (p.clean < 30) this.addNeed('pet_dirty', false, p.id);
    }
    if (Game.focusing() || document.hidden) return;
    if (now < L.nextNeedAt) return;
    L.nextNeedAt = now + (4 + Math.random() * 7) * 60000;
    if (this.activeCount() >= 3 + Math.min(2, Pets.home().length - 1)) return;
    const pool = ['cat_treat', 'cat_pet', 'plant_wilt', 'dusty', 'bulb', 'ava_hungry', 'ava_sleepy', 'arrange', 'pet_want', 'curtain', 'lights', 'plant_wilt', 'dusty', 'cat_pet', 'pet_train', 'cat_treat'];
    for (const t of shuffle(pool)) if (this.addNeed(t)) return;
  },
  checkActionNeeds() {
    for (const n of [...this.L.needs]) {
      const def = NEED_DEFS[n.type];
      if (def.who === 'pet') { const pp = Pets.get(n.pet); if (!pp || !pp.home) { this.drop(n); continue; } }
      if (!def.action) { if (def.who === 'item' && !Room.uidMap[n.target]) this.drop(n); continue; }
      if (n.type === 'lights' && this.anyLightOn()) this.complete(n);
      else if (n.type === 'curtain') { const it = Room.uidMap[n.target]; if (!it) this.drop(n); else if (!it.closed) this.complete(n); }
      else if (n.type === 'pet_want' && Game.S.items.some(i => i.k === n.k)) this.complete(n);
      else if (n.type === 'arrange' && n.prog > 0) this.complete(n);
    }
  },
  drop(n) { this.L.needs = this.L.needs.filter(x => x !== n); UI.refresh('tasks'); UI.refresh('need'); UI.badges(); },
  clearTargetFlags(n) { const it = Room.uidMap[n.target]; if (!it) return; if (n.type === 'plant_wilt') delete it.wilt; if (n.type === 'dusty') delete it.dust; if (n.type === 'bulb') { delete it.broken; it.on = true; } },
  complete(n, silent) {
    if (!this.L.needs.includes(n)) return;
    const def = NEED_DEFS[n.type]; this.clearTargetFlags(n);
    this.L.needs = this.L.needs.filter(x => x !== n);
    const rw = def.rw; Game.reward(rw.c, rw.x, 'need');
    if (n.pet != null) { const pp = Pets.get(n.pet); if (pp) { if (rw.b) Pets.addBond(pp, rw.b); Pets.addXp(pp, 5); } }
    this.L.stats.needs++; this.track('need', 1);
    const pos = this.anchor(n) || [120, 120];
    for (let i = 0; i < 4; i++) Room.puff('p_spark', pos[0] - 4 + Math.random() * 8, pos[1] - 6, { vy: -10 - Math.random() * 6, vx: (Math.random() - 0.5) * 10, max: 0.9 });
    if (!silent) UI.toast(`完成需求：${def.t(n)}`, 'i_sparkle', 3);
    UI.refresh('tasks'); UI.refresh('need'); UI.badges(); Game.save(); saveSoon();
  },
  // ---------- using supplies ----------
  use(id, need, pid) {
    const L = this.L; if (!this.has(id)) { UI.toast(`沒有${SUPPLIES[id].n}了，可以學習換取或到商店買`, SUPPLIES[id].spr, 3.5); return false; }
    const find = (type) => need && need.type === type ? need : L.needs.find(n => n.type === type);
    if (SUPPLIES[id].pet) {
      const p = Pets.get(need && need.pet != null ? need.pet : pid != null ? pid : (Pets.sel() || {}).id); if (!p) return false;
      let ok;
      if (PET_FOODS[id]) ok = Pets.feed(p.id, id, need);
      else if (id === 'catnip') ok = Pets.play(p.id, 'catnip', need);
      else if (id === 'shampoo') ok = Pets.bath(p.id, need);
      else if (id === 'medicine') ok = Pets.medicine(p.id);
      if (need && !this.L.needs.includes(need) && UI.needId === need.id) UI.closeWin('need');
      return ok;
    }
    let target = null;
    if (id === 'coffee') { L.buff.xp = true; if (Game.avatar) { Game.avatar.happy = 2; Game.bubble(Game.avatar, '精神來了！', 2); } target = find('ava_sleepy'); }
    else if (id === 'onigiri') { L.buff.coin = true; if (Game.avatar) { Game.avatar.happy = 2; Game.bubble(Game.avatar, '好吃！', 2); } target = find('ava_hungry'); }
    else {
      const type = { fertilizer: 'plant_wilt', spray: 'dusty', bulb: 'bulb' }[id]; target = find(type);
      if (!target) { UI.toast({ fertilizer: '植物們都很健康', spray: '家具都很乾淨', bulb: '燈都好好的' }[id], SUPPLIES[id].spr); return false; }
      const it = Room.uidMap[target.target];
      if (it) { const cv = Room.itemCanvas(it); for (let i = 0; i < 6; i++) Room.puff(id === 'fertilizer' ? 'p_leaf' : id === 'spray' ? 'p_bubble' : 'p_spark', it.x + Math.random() * cv.width, it.y + Math.random() * 8, { vy: -8, vx: (Math.random() - 0.5) * 8, max: 1, wob: 6 }); }
    }
    L.bag[id]--; if (!L.bag[id]) delete L.bag[id];
    if (target) { this.complete(target); if (UI.needId === target.id) UI.closeWin('need'); }
    UI.refresh('pet'); UI.refresh('storage'); UI.refresh('need'); Game.save();
    return true;
  },
  // ---------- daily tasks ----------
  ensureDaily() {
    const L = this.L, day = this.today(); if (L.daily && L.daily.day >= day) return;
    const mk = (k, extra = {}) => Object.assign({ k, need: TASK_DEFS[k].need(), prog: 0, claimed: false }, extra);
    const tasks = [mk('vocab')];
    const S = Game.S;
    const own = (id) => S.items.some(i => i.k === id) || (S.inv[id] || 0) > 0;
    let cands = Object.values(ITEMS).filter(d => !d.giftOnly && !d.special && !d.merchant && d.lvl <= S.lvl && d.price >= 25 && d.price <= Math.max(120, S.coins + 160));
    const fresh = cands.filter(d => !own(d.id)); if (fresh.length) cands = fresh;
    if (cands.length) { const d = cands[Math.floor(Math.random() * cands.length)]; tasks.push(mk('buy', { item: d.id, rw: { c: Math.round(d.price * 0.35) + 10, x: 20 } })); }
    else tasks.push(mk('buyany'));
    for (const k of shuffle(['focus', 'todo', 'need', 'feed', 'pet', 'quiz', 'place', 'study', 'buyany', 'play', 'groom', 'train']).filter(k => !tasks.some(t => t.k === k)).slice(0, 3)) tasks.push(mk(k));
    L.daily = { day, tasks, bonus: false };
    if (Learn.L.dailyDone && Learn.L.dailyDay === day) tasks[0].prog = 1;
  },
  taskReward(t) { return t.rw || TASK_DEFS[t.k].rw; },
  track(ev, n = 1, data = {}) {
    const L = this.L; this.ensureDaily();
    if (typeof Team !== 'undefined') Team.onTrack(ev, n);
    const map = { focusMin: 'focus', todo: 'todo', need: 'need', feed: 'feed', pet: 'pet', quizRight: 'quiz', place: 'place', move: 'place', study: 'study', vocab: 'vocab', play: 'play', groom: 'groom', train: 'train' };
    if (ev === 'quizRight') L.stats.quizRight += n;
    for (const t of L.daily.tasks) {
      if (t.prog >= t.need) continue;
      let hit = map[ev] === t.k;
      if (ev === 'buy' && t.k === 'buyany') hit = true;
      if (ev === 'buy' && t.k === 'buy' && data.kind === 'item' && data.id === t.item) hit = true;
      if (!hit) continue;
      t.prog = Math.min(t.need, t.prog + n);
      if (t.prog >= t.need) UI.toast(`任務完成：${TASK_DEFS[t.k].t(t)}，到「任務」領獎勵`, 'i_task', 3.5, { label: '領取', fn: () => UI.openTasks('daily') });
    }
    this.checkAch(); UI.refresh('tasks'); UI.badges();
  },
  claimTask(i) {
    const t = this.L.daily.tasks[i]; if (!t || t.claimed || t.prog < t.need) return;
    t.claimed = true; const rw = this.taskReward(t);
    let extra = 0; if (t.k === 'vocab') extra = Math.min(50, (Learn.L.streak || 0) * 5);
    Game.reward(rw.c + extra, rw.x, 'task');
    let got = ''; if (rw.item) { const s = this.randomSupply(); this.give(s, 1); got = `、${SUPPLIES[s].n}`; }
    UI.toast(`領取 ${rw.c + extra} 金幣、${rw.x} 經驗${got}` + (extra ? `（連續 ${Learn.L.streak} 天加碼 ${extra}）` : ''), 'i_coin', 3.5);
    UI.refresh('tasks'); UI.badges(); Game.save(); saveSoon();
  },
  claimBonus() {
    const D = this.L.daily; if (D.bonus || !D.tasks.every(t => t.claimed)) return;
    D.bonus = true; Game.reward(40, 30, 'task'); const a = this.randomSupply(), b = this.randomSupply(); this.give(a, 1); this.give(b, 1);
    UI.toast(`今天的任務全部完成！獲得 40 金幣、30 經驗、${SUPPLIES[a].n}、${SUPPLIES[b].n}`, 'i_star', 4.5);
    UI.refresh('tasks'); UI.badges(); Game.save(); saveSoon();
  },
  // ---------- achievements ----------
  achState(a) { const done = this.L.ach[a.id] || 0, v = a.m(); const next = a.tiers[done]; return { done, v, next, ready: next != null && v >= next }; },
  achReward(a, i) { return { c: 30 + i * 40, x: 30 + i * 30, item: a.special && a.special[i] }; },
  claimAch(id) {
    const a = ACHS.find(x => x.id === id), st = this.achState(a); if (!st.ready) return;
    const rw = this.achReward(a, st.done); this.L.ach[id] = st.done + 1;
    Game.reward(rw.c, rw.x, 'task'); const s = this.randomSupply(); this.give(s, 1);
    if (rw.item) Game.S.inv[rw.item] = (Game.S.inv[rw.item] || 0) + 1;
    UI.toast(`成就「${a.n}」：${a.d(st.next)}！獲得 ${rw.c} 金幣、${rw.x} 經驗、${SUPPLIES[s].n}` + (rw.item ? `，還有「${ITEMS[rw.item].n}」` : ''), 'i_star', 5);
    UI.refresh('tasks'); UI.refresh('storage'); UI.badges(); Game.save(); saveSoon();
  },
  checkAch() { let n = 0; for (const a of ACHS) if (this.achState(a).ready) n++; this._achReady = n; },
  claimable() { this.ensureDaily(); const D = this.L.daily; let n = D.tasks.filter(t => !t.claimed && t.prog >= t.need).length; if (!D.bonus && D.tasks.every(t => t.claimed)) n++; return n + (typeof Team !== 'undefined' ? Team.claimableN() : 0) + (this._achReady || 0); },
  // ---------- tick ----------
  tick(dt) {
    this._acc += dt; if (this._acc < 1) return; this._acc = 0;
    const L = this.L, now = Date.now(), mins = Math.min(60 * 24, (now - (L.lastTick || now)) / 60000); L.lastTick = now;
    Pets.tick(mins);
    this.ensureDaily(); this.maybeNeeds(); this.checkActionNeeds();
    if (!this._tickN || this._tickN++ % 10 === 0) { this._tickN = this._tickN || 1; this.checkAch(); UI.badges(); }
  },
  // ---------- room bubbles ----------
  anchor(n) {
    const def = NEED_DEFS[n.type];
    if (def.who === 'pet') { const p = Pets.actor(Pets.get(n.pet)); if (!p) return null; return [p.x + (p.flip ? -3 : 3), p.y - 14 - (p.state === 'sleep' ? -4 : 0)]; }
    if (def.who === 'avatar') { const a = Game.avatar; if (!a) return null; const [x, y] = a.headPos(); return [x + 3, y + 1]; }
    const it = Room.uidMap[n.target]; if (!it) return null; const cv = Room.itemCanvas(it); return [it.x + cv.width / 2, it.y + 3];
  },
  drawBubbles(c) {
    this._hits = []; const t = Room.t, placed = [];
    for (const n of this.L.needs) {
      const pos = this.anchor(n); if (!pos) continue; const def = NEED_DEFS[n.type];
      let bx = Math.round(pos[0] - 4), by = Math.round(pos[1] - 20);
      for (let tries = 0; tries < 6 && placed.some(p => Math.abs(p[0] - bx) < 19 && Math.abs(p[1] - by) < 17); tries++) bx += 19;
      bx = Math.min(RW - 22, bx); placed.push([bx, by]);
      const bob = Math.round(Math.sin(t * 2.4 + n.id) * 1.2);
      const x = bx, y = by + bob;
      c.drawImage(SPR.get('p_think'), x, y);
      c.drawImage(SPR.get(def.item ? SUPPLIES[def.item].spr : def.icon), x + 4, y + 2);
      if (n.type === 'cat_pet') { c.fillStyle = '#c4566e'; for (let i = 0; i < 3; i++) c.fillRect(x + 6 + i * 3, y + 13, 2, 1); c.fillStyle = '#7fbf6a'; for (let i = 0; i < Math.min(3, n.prog || 0); i++) c.fillRect(x + 6 + i * 3, y + 13, 2, 1); }
      this._hits.push({ n, x, y, w: 20, h: 18 });
    }
  },
  hitBubble(x, y) { for (let i = this._hits.length - 1; i >= 0; i--) { const h = this._hits[i]; if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h.n; } return null; },
  drawDust(c, it, x, y, cv) {
    const cnt = Math.max(4, Math.floor(cv.width / 3));
    for (let i = 0; i < cnt; i++) { const dx = hsh(it.uid, i, 3) % cv.width, dy = 1 + hsh(i, it.uid, 7) % Math.min(8, cv.height - 2); if (!hitAlpha(cv, dx, dy)) continue; c.fillStyle = i % 3 ? 'rgba(120,112,130,0.55)' : 'rgba(200,196,206,0.7)'; c.fillRect(x + dx, y + dy, 1, 1); }
    if (Math.random() < 0.02) Room.puff('p_dot', x + Math.random() * cv.width, y + 2, { vy: -3, vx: (Math.random() - 0.5) * 3, max: 1.2, alpha: 0.5 });
  },
};

/* ---------------- windows ---------------- */
Object.assign(UI.WIN, {
  tasks: { t: '任務', i: 'i_task', w: 430, at: ['r', 0] },
  need: { t: '需求', i: 'i_sparkle', w: 340, at: ['c', 0], modal: true },
});
Object.assign(UI, {
  tasksTab: 'daily', needId: null,
  openTasks(tab) { this.tasksTab = tab || this.tasksTab; this.openWin('tasks'); },
  needCard(id) { this.needId = id; this.openWin('need'); },
  rewardChips(rw, extraItem) {
    return h('span', { class: 'rw' }, h('span', { class: 'rwc' }, ico('i_coin', 16), h('b', { class: 'num', text: String(rw.c) })), h('span', { class: 'rwc' }, ico('i_star', 16), h('b', { class: 'num', text: String(rw.x) })),
      rw.b ? h('span', { class: 'rwc' }, ico('i_heart', 16), h('b', { class: 'num', text: String(rw.b) })) : null, (rw.item || extraItem) ? h('span', { class: 'rwc', title: '隨機道具' }, ico('i_bag', 16)) : null);
  },
  go(where, t) {
    if (where === 'learn') return this.openWin('learn');
    if (where === 'chal') return t && Learn.start('chal', { k: t.k });
    if (where === 'timer') return this.openWin('timer');
    if (where === 'todo') return this.openWin('todo');
    if (where === 'pet') { this.petTab = 'care'; return this.openWin('pet'); }
    if (where === 'petTrain') { this.petTab = 'train'; return this.openWin('pet'); }
    if (where === 'shop') { this.shopTab = 'supply'; return this.openWin('shop'); }
    if (where === 'needs') { this.tasksTab = 'needs'; return this.refresh('tasks'); }
    if (where === 'edit') { this.closeWin('tasks'); return this.setEdit(true); }
  },
  w_tasks() {
    Life.ensureDaily(); const L = Life.L, tab = this.tasksTab;
    const nNeeds = L.needs.length;
    const tabs = h('div', { class: 'tabs' }, ...[['daily', '每日任務'], ['needs', `需求${nNeeds ? '（' + nNeeds + '）' : ''}`], ['ach', '成就'], ...(typeof Team !== 'undefined' && Social.enabled() ? [['team', '團隊' + (Team.claimableN() + Team.invites.length ? `（${Team.claimableN() + Team.invites.length}）` : '')]] : [])].map(([k, l]) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { this.tasksTab = k; this.refresh('tasks'); } }, l)));
    const cl = Life.comfortLv();
    const head = h('div', { class: 'tsum' }, h('span', {}, ico('i_theme', 18), `舒適度 Lv ${cl}`), h('span', { class: 'hint', text: cl ? `金幣收入 +${cl * 3}%` : '多擺些家具提升舒適度，金幣收入會增加' }), h('span', {}, ico('i_fire', 18), `連續 ${Learn.L.streak || 0} 天`));
    const body = [];
    if (tab === 'daily') {
      const D = L.daily;
      D.tasks.forEach((t, i) => {
        const def = TASK_DEFS[t.k], rw = Life.taskReward(t), done = t.prog >= t.need;
        let goBtn = null;
        const tier = def.tiers ? Challenge.tierOf(t) : null, info = def.tiers ? Challenge.info(t.k) : null;
        if (!done && def.go) goBtn = h('button', { class: 'chip sm', onclick: () => { if (def.go === 'shopItem') { this.shopTab = ITEMS[t.item] ? ITEMS[t.item].cat : 'furniture'; this.shopFocus = t.item; this.openWin('shop'); } else this.go(def.go, t); } }, def.go === 'chal' ? (t.prog > 0 || (t.got && t.got.length) ? '繼續' : '開始') : '前往');
        // tasks with tiers: pick normal or hard first (hard = x1.5 reward); fixed for the day once chosen
        if (def.tiers && !tier && !t.claimed) {
          const base = TASK_DEFS[t.k].rw || t.rw;
          goBtn = h('div', { class: 'tierpick' },
            h('button', { class: 'chip sm', title: info.d.n, onclick: () => Challenge.choose(t.k, 'n') }, `普通 ${def.tiers.n}`),
            h('button', { class: 'chip sm hard', title: `${info.d.h}，獎勵 ×1.5（${Math.round(base.c * 1.5)} 金幣）`, onclick: () => Challenge.choose(t.k, 'h') }, `困難 ${def.tiers.h}`));
        }
        body.push(h('div', { class: 'task' + (t.claimed ? ' claimed' : done ? ' ready' : '') },
          h('div', { class: 'task-main' }, h('div', { class: 'task-t' }, def.t(t), tier ? h('span', { class: 'tiertag' + (tier === 'h' ? ' hard' : ''), text: TIER_N[tier] }) : null),
            info ? h('div', { class: 'hint', text: tier ? info.d[tier] : `普通：${info.d.n}。困難：${info.d.h}，獎勵 ×1.5。` }) : null, h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round(t.prog / t.need * 100)}%` })), h('div', { class: 'task-meta' }, h('span', { class: 'num hint', text: `${t.prog}/${t.need}` }), this.rewardChips(rw), t.k === 'vocab' && Learn.L.streak ? h('span', { class: 'hint', text: `連續加碼 +${Math.min(50, Learn.L.streak * 5)}` }) : null)),
          t.claimed ? h('span', { class: 'own', text: '已領取' }) : done ? h('button', { class: 'chip sm primary', onclick: () => Life.claimTask(i) }, '領取') : goBtn));
      });
      const all = D.tasks.every(t => t.claimed);
      body.push(h('div', { class: 'task bonus' + (D.bonus ? ' claimed' : all ? ' ready' : '') }, h('div', { class: 'task-main' }, h('div', { class: 'task-t', text: '全部完成獎勵' }), h('div', { class: 'task-meta' }, this.rewardChips({ c: 40, x: 30 }, true), h('span', { class: 'hint', text: '＋2 個道具' }))),
        D.bonus ? h('span', { class: 'own', text: '已領取' }) : h('button', { class: 'chip sm primary', disabled: !all, onclick: () => Life.claimBonus() }, '領取')));
      body.push(h('p', { class: 'hint', text: '每天早上 6 點換一批新任務。英文挑戰不計時，答錯不用重來，可以中途離開，答對的字都會留著。' }));
    } else if (tab === 'team') {
      body.push(...this.w_team());
    } else if (tab === 'needs') {
      if (!L.needs.length) body.push(h('div', { class: 'empty' }, ico('i_sparkle', 40), h('p', { text: '目前沒有需求。房間裡偶爾會冒出泡泡，點泡泡或點對象就能處理。' })));
      for (const n of L.needs) {
        const def = NEED_DEFS[n.type], icon = def.item ? SUPPLIES[def.item].spr : def.icon;
        body.push(h('div', { class: 'task' }, ico(icon, 32), h('div', { class: 'task-main' }, h('div', { class: 'task-t', text: def.t(n) }), h('div', { class: 'hint', text: def.d }), h('div', { class: 'task-meta' }, this.rewardChips(def.rw))),
          h('button', { class: 'chip sm primary', onclick: () => this.needCard(n.id) }, '處理')));
      }
    } else {
      for (const a of ACHS) {
        const st = Life.achState(a), maxed = st.next == null, goal = maxed ? a.tiers[a.tiers.length - 1] : st.next;
        const rw = maxed ? null : Life.achReward(a, st.done);
        body.push(h('div', { class: 'task' + (st.ready ? ' ready' : maxed ? ' claimed' : '') },
          h('div', { class: 'ach-tier num', text: `${st.done}/${a.tiers.length}` }),
          h('div', { class: 'task-main' }, h('div', { class: 'task-t', text: a.n }), h('div', { class: 'hint', text: maxed ? '全部達成！' : a.d(goal) }), h('div', { class: 'pbar' }, h('i', { style: `width:${Math.min(100, Math.round(st.v / goal * 100))}%` })),
            h('div', { class: 'task-meta' }, h('span', { class: 'num hint', text: `${Math.min(st.v, goal)}/${goal}` }), rw ? this.rewardChips(rw, true) : null, rw && rw.item ? h('span', { class: 'hint', text: `＋「${ITEMS[rw.item].n}」` }) : null)),
          st.ready ? h('button', { class: 'chip sm primary', onclick: () => Life.claimAch(a.id) }, '領取') : null));
      }
    }
    // the redeem box only lives on the achievements tab
    if (tab !== 'ach') return [tabs, head, h('div', { class: 'scroll tasks' }, ...body)];
    const code = h('input', { id: 'redeem-in', type: 'text', maxlength: '24', autocomplete: 'off', spellcheck: 'false', placeholder: '輸入兌換碼', 'aria-label': '兌換碼', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { Dev.redeem(e.target.value); e.target.value = ''; } } });
    const redeem = h('div', { class: 'row redeem' }, h('div', { class: 'inset grow' }, code), h('button', { class: 'chip sm', onclick: () => { Dev.redeem(code.value); code.value = ''; } }, '兌換'), Dev.on ? h('button', { class: 'chip sm', onclick: () => this.openWin('dev') }, ico('i_dev', 16), '開發者') : null);
    return [tabs, head, h('div', { class: 'scroll tasks' }, ...body), redeem];
  },
  w_need() {
    const n = Life.L.needs.find(x => x.id === this.needId);
    if (!n) return [h('div', { class: 'empty' }, ico('i_sparkle', 40), h('p', { text: '這個需求已經完成了。' })), h('button', { class: 'chip', onclick: () => this.closeWin('need') }, '好')];
    const def = NEED_DEFS[n.type], sup = def.item && SUPPLIES[def.item];
    const out = [h('div', { class: 'need-head' }, ico(sup ? sup.spr : def.icon, 48), h('div', {}, h('div', { class: 'gift-t', text: def.t(n) }), h('p', { class: 'hint', text: def.d }))),
      h('div', { class: 'task-meta' }, h('span', { class: 'hint', text: '完成獎勵' }), this.rewardChips(def.rw))];
    // the care page only helps where it can actually do the job (feeding, grooming, playing, training)
    if (n.pet != null && !['cat_pet', 'pet_want'].includes(n.type)) { const pp = Pets.get(n.pet); if (pp) out.splice(1, 0, h('button', { class: 'chip sm', onclick: () => { this.closeWin('need'); Pets.select(pp.id, n.type === 'pet_train' ? 'train' : 'care'); } }, ico('i_paw', 16), `打開${pp.name}的照顧頁`)); }
    if (sup) {
      const have = Life.L.bag[def.item] || 0;
      // pet supplies are picked up and used on the pet in the room; the card closes so the room is visible
      const forPet = n.pet != null && sup.pet, take = (id) => () => { if (PetPlay.pick(id, n.pet)) this.closeWin('need'); };
      out.push(h('button', { class: 'chip primary', disabled: !have, onclick: forPet ? take(def.item) : () => { Life.use(def.item, n); } }, ico(sup.spr, 22), !have ? `沒有${sup.n}` : forPet ? `拿起${sup.n}（有 ${have} 個）` : `使用${sup.n}（有 ${have} 個）`));
      for (const alt of def.alt || []) if (Life.L.bag[alt]) out.push(h('button', { class: 'chip', onclick: forPet && SUPPLIES[alt].pet ? take(alt) : () => { Life.use(alt, n); } }, ico(SUPPLIES[alt].spr, 22), `${forPet ? '改拿' : '改用'}${SUPPLIES[alt].n}（有 ${Life.L.bag[alt]} 個）`));
      if (n.type === 'pet_dirty' && Pets.Z.tools.brush) out.push(h('button', { class: 'chip', onclick: take('brush') }, ico('t_brush', 22), '拿起梳子幫牠梳一梳'));
      if (n.type === 'cat_play') for (const t of ['wand', 'yarn', 'ball']) if (Pets.Z.tools[t]) { out.push(h('button', { class: 'chip', onclick: take(t) }, ico(PET_TOOLS[t].spr, 22), `拿起${PET_TOOLS[t].n}陪牠玩`)); break; }
      out.push(h('button', { class: 'chip', onclick: () => { this.closeWin('need'); Learn.start('need', { item: def.item, needId: n.id }); } }, ico('i_learn', 22), `複習 5 個單字換${sup.n}`));
      out.push(h('button', { class: 'chip', disabled: Game.S.coins < sup.price, onclick: () => { Life.buySupply(def.item, 1); } }, ico('i_coin', 20), `用 ${sup.price} 金幣買一個`));
    } else {
      if (n.type === 'cat_pet') {
        const pp = Pets.get(n.pet), a = pp && Pets.actor(pp), busy = a && ['eat', 'zoom', 'trick'].includes(a.state);
        out.push(h('p', { class: 'hint', text: `已經摸了 ${n.prog || 0} 下，還差 ${Math.max(0, 3 - (n.prog || 0))} 下。` }));
        // the button only takes you to the pet: the card closes, the pet sits still and asks to be petted; the petting itself happens in the room
        out.push(h('button', { class: 'chip primary', disabled: !a, onclick: () => { this.closeWin('need'); UI.askPet(n.pet, n.id); } }, ico('n_heart', 20), !a ? `${pp ? pp.name : '牠'}不在房間裡` : busy ? '摸摸牠（牠正在忙，等一下會過來）' : '摸摸牠'));
      }
      if (n.type === 'pet_want' && ITEMS[n.k]) {
        const own = (Game.S.inv[n.k] || 0) > 0;
        out.push(h('div', { class: 'need-want' }, sprPreview(SPR.get(ITEMS[n.k].spr, ITEMS[n.k].map, false, n.k), 80, 3)));
        out.push(own ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('need'); Game.place(n.k); } }, ico('i_brush', 20), '從收納箱擺出來') : h('button', { class: 'chip primary', onclick: () => { this.closeWin('need'); this.shopTab = ITEMS[n.k].cat; this.shopFocus = n.k; this.openWin('shop'); } }, ico('i_shop', 20), `到商店買（${ITEMS[n.k].price} 金幣）`));
      }
      if (n.type === 'pet_train') out.push(h('button', { class: 'chip primary', onclick: () => { this.closeWin('need'); Pets.select(n.pet, 'train'); } }, ico('i_learn', 20), '去訓練'));
      if (n.type === 'arrange') out.push(h('button', { class: 'chip primary', onclick: () => { this.closeWin('need'); this.stoTab = 'items'; this.openWin('storage'); } }, ico('i_box', 20), '打開收納箱'));
    }
    out.push(h('button', { class: 'chip', onclick: () => this.closeWin('need') }, '晚點再說'));
    return out;
  },
  badges() {
    const set = (id, n, dot) => { const b = this.dockBtns && this.dockBtns[id]; if (!b) return; let el = b.querySelector('.badge-dot'); if (!n && !dot) { if (el) el.remove(); return; } if (!el) { el = h('span', { class: 'badge-dot' }); b.append(el); } el.textContent = n ? String(n) : '!'; };
    if (!Game.S || !Game.S.life) return;
    set('tasks', Life.claimable() + Life.L.needs.length + (typeof Team !== 'undefined' && Team.ready() ? Team.claimableN() + Team.invites.length : 0));
    Learn.ensureDaily(); set('learn', 0, !Learn.L.dailyDone);
    if (Game.S.zoo) set('pet', 0, Pets.home().some(p => p.sick || p.hunger < 30 || p.clean < 25));
    if (typeof Merchant !== 'undefined' && Merchant.S) set('merchant', 0, Merchant.waiting());
  },
});
Life.buySupply = function (id, n) {
  const sup = SUPPLIES[id], cost = sup.price * n; if (Game.S.coins < cost) { UI.toast(`金幣不夠，還差 ${cost - Game.S.coins}`, 'i_coin'); return false; }
  Game.S.coins -= cost; this.give(id, n); this.track('buy', 1, { kind: 'supply', id });
  UI.toast(`買了 ${n} 個${sup.n}`, sup.spr, 2.4); UI.hud(true); UI.refresh('shop'); UI.refresh('need'); Game.save(); saveSoon(); return true;
};
