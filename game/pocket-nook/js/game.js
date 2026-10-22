/* ============================================================
   Game: state, economy, timer, saving, co-working, main loop
   ============================================================ */
const SAVE_KEY = 'pocketnook.save.v1';
// save schema: bump when the shape of Game.S changes and add a step to MIGRATIONS
//   1  original release
//   2  vocabulary progress keyed by the English word (was an index into the 500-word list)
//   3  several pets (S.zoo), flags (legacy / dev), sync records, rev-checked cloud writes
const SAVE_SCHEMA = 4;   // 4: coupons & gift pity (wallet), merchant week, pet habits & relationships, wardrobe purchases, food bowls
const NOOK_VERSION = '2026.10.22.2';
const Game = {
  S: null, avatar: null, pet: null, visitors: {}, bubbles: [], scale: 4, lastHud: 0, lastEnv: 0, passiveAcc: 0,
  need(l) { return 100 + 50 * (l - 1); },
  focusing() { const t = this.S && this.S.timer; return !!(t && t.running && t.mode === 'focus'); },
  newState() {
    const S = {
      v: 1, coins: 150, xp: 0, lvl: 1, nextUid: 1,
      items: [], inv: { rug_runner: 1, cushion: 1, books_stack: 1, calendar: 1 },
      ownWP: ['cream_stripe'], ownFL: ['wood_honey'], wp: 'cream_stripe', fl: 'wood_honey', view: 'city', ownViews: ['city'], themes: ['cozy'],
      music: { list: [], idx: -1, vol: 0.7, shuffle: false, repeat: 'all', ctx: 'list', lidx: -1, libAlbum: '' },
      pets: ['cat:ginger'], pet: 'cat:ginger', petName: '麻糬',
      avatar: Object.assign(defaultAvatar(), { hairFront: 'short', hairBack: 'bun', topColor: 'rose', bottomColor: 'navy' }), closet: {}, outfits: [],
      todos: [{ id: 1, t: '把今天最重要的一件事寫在這裡', done: false, ex: true }, { id: 2, t: '喝一杯水', done: true, ex: true }],
      memos: [{ id: 1, text: '歡迎來到小窩！\n點點看家具和小貓，按番茄鐘開始專注，就能賺金幣買新家具。', color: 'butter', pin: false, x: 40, y: 120 }],
      timer: { focus: 25, short: 5, long: 15, mode: 'focus', running: false, endsAt: 0, remain: 25 * 60, round: 0, credited: 0 },
      stats: { focusMin: 0, sessions: 0, todos: 0, todoDay: '', todoToday: 0 },
      settings: { timeMode: 'auto', rain: false, autoBreak: true, autoMusic: false, lyrics: true },
      gifts: [], say: null, savedAt: 0, seenIntro: false,
      life: Life.newState(), vocab: {}, learn: Learn.newState(), zoo: null, schema: SAVE_SCHEMA,
    };
    S.items = this.buildLayout(THEMES.cozy.layout, () => S.nextUid++, k => k.split('|')[0]);
    return S;
  },
  // build item instances from a theme layout; pick(key) resolves 'a|b' fallbacks (or returns null to skip)
  buildLayout(layout, nextUid, pick) {
    const items = [];
    for (const [key, x, y, o = {}] of layout) {
      const k = pick(key); if (!k || !ITEMS[k]) continue;
      const it = { uid: nextUid(), k, x, y }; if (ITEMS[k].toggle) it.on = o.on !== false; if (o.flip) it.flip = true; if (o.closed) it.closed = true;
      items.push(it);
      const surf = ITEMS[k].surface; if (!surf) continue;
      for (const [ck, dx] of (o.kids || [])) {
        const kk = pick(ck); if (!kk || !ITEMS[kk]) continue;
        const cv = Room.itemCanvas({ k: kk }); const cy = y + surf.y - cv.height + 1;
        const c = { uid: nextUid(), k: kk, x: x + dx, y: cy, p: it.uid, dx, dy: cy - y }; if (ITEMS[kk].toggle) c.on = true; items.push(c);
      }
    }
    return items;
  },
  // ---------- themes ----------
  buyTheme(id) {
    const S = this.S, th = THEMES[id]; if (S.themes.includes(id)) return;
    if (S.lvl < th.lvl) return UI.toast(`需要 Lv ${th.lvl} 才能買這個主題`, 'i_star');
    if (S.coins < th.price) return UI.toast(`金幣不夠，還差 ${th.price - S.coins}`, 'i_coin');
    S.coins -= th.price; S.themes.push(id);
    if (!S.ownWP.includes(th.wp)) S.ownWP.push(th.wp); if (!S.ownFL.includes(th.fl)) S.ownFL.push(th.fl); if (!S.ownViews.includes(th.view)) S.ownViews.push(th.view);
    for (const g of th.grants) S.inv[g] = (S.inv[g] || 0) + 1;
    UI.toast(`買下「${th.n}」主題，家具放在收納箱`, 'i_theme', 5, { label: '整套佈置', fn: () => UI.themeConfirm(id) });
    UI.hud(true); UI.refresh('shop'); UI.refresh('storage'); this.save();
  },
  applyTheme(id, mode) {
    const S = this.S, th = THEMES[id]; if (!S.themes.includes(id)) return;
    S.wp = th.wp; S.fl = th.fl; S.view = th.view;
    if (mode === 'full') {
      if (this.avatar) this.avatar.stand();
      for (const it of S.items) S.inv[it.k] = (S.inv[it.k] || 0) + 1;
      const take = (key) => { for (const k of key.split('|')) if (ITEMS[k] && (S.inv[k] || 0) > 0) { S.inv[k]--; if (!S.inv[k]) delete S.inv[k]; return k; } return null; };
      S.items = this.buildLayout(th.layout, () => S.nextUid++, take);
      Room.state = S; Room.indexItems(); Room.sel = null;
      if (this.avatar) { this.avatar.x = 120; this.avatar.y = 152; this.avatar.state = 'idle'; this.avatar.timer = 1; }
      Pets.resetActors();
    }
    Room.buildBg(S.wp, S.fl); this.save(); UI.refresh('storage'); UI.refresh('shop');
    UI.toast(mode === 'full' ? `換成「${th.n}」了，原本的家具收進收納箱` : `換上「${th.n}」的牆面、地板和窗景`, 'i_theme', 3.5);
  },
  applyView(id) { this.S.view = id; this.save(); UI.refresh('storage'); },
  fixPlacements() {
    Room.state = this.S; Room.indexItems();
    for (const it of this.S.items) if (it._place) {
      const p = Room.uidMap[it.p], s = p && Room.surfaceOf(p), cv = Room.itemCanvas(it);
      if (s) { it.y = s.y - cv.height + 1; it.dx = it.x - p.x; it.dy = it.y - p.y; } else delete it.p;
      delete it._place;
    }
  },
  load(snapshot) {
    let S = snapshot || null;
    const first = this.loadedFp == null; let raw0 = null;
    if (!S) { try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { S = JSON.parse(raw); raw0 = raw; } } catch (e) { S = null; } }
    if (first) { this.loadedFp = S ? saveHash(raw0 || JSON.stringify(S)) : ''; this.loadedSavedAt = (S && S.savedAt) || 0; }
    const base = this.newState();
    if (!S || S.v !== 1) S = base;
    // which schema the stored save was written with (saves from before versioning had none)
    const from = S === base ? SAVE_SCHEMA : (S.schema || (Object.keys(S.vocab || {}).some(k => /^\d+$/.test(k)) ? 1 : S.zoo ? 3 : 2));
    if (from > SAVE_SCHEMA) this.outdated = true;   // written by a newer version of the game: never migrate or overwrite it
    for (const k in base) if (!(k in S)) S[k] = base[k];
    for (const k in base.timer) if (!(k in S.timer)) S.timer[k] = base.timer[k];
    for (const k in base.settings) if (!(k in S.settings)) S.settings[k] = base.settings[k];
    S.avatar = migrateAvatar(S.avatar); grandfatherCloset(S);
    for (const k in base.learn) if (!(k in S.learn)) S.learn[k] = base.learn[k];
    if (!S.flags) S.flags = {};
    if (!this.outdated) {
      // MIGRATIONS — each step is idempotent and detects the old shape itself
      Learn.migrate(S);                                         // 1 → 2  vocabulary keyed by word (no-op when already converted)
      if (S.savedAt && !S.zoo) S.flags.legacy = true;
      Life.migrate(S); Pets.migrate(S);                         // 2 → 3  pets, supplies, flags
      if (from < SAVE_SCHEMA) S.flags.migratedFrom = Math.min(S.flags.migratedFrom || from, from);
      S.schema = SAVE_SCHEMA; S.appVersion = NOOK_VERSION;
    }
    for (const list of [S.todos, S.memos]) { const seen = new Set(); for (const x of list || []) { while (seen.has(x.id)) x.id++; seen.add(x.id); } }
    S.items = S.items.filter(it => ITEMS[it.k]);
    this.S = S; this.fixPlacements();
  },
  save() {
    if (this.outdated) return;
    this.S.savedAt = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.S)); } catch (e) { }
    if (typeof Dev !== 'undefined') Dev.onSave();
    Cloud.schedule();
  },
  replaceState(S) {
    this.load(S); Room.state = this.S; Room.sel = null; Room.indexItems();
    Room.buildBg(this.S.wp, this.S.fl); Room.computeEnv(this.S.settings);
    if (this.avatar) { Game.pets = []; Pets.syncActors(); }
    Life.ensureDaily(); Learn.ensureDaily();
    UI.refreshAll(); UI.badges(); this.save();
  },
  // ---------- economy ----------
  reward(coins, xp, from) {
    const S = this.S;
    if (coins > 0 && from && from !== 'raw') coins = Math.round(coins * Life.coinMult());
    S.coins += coins; S.xp += xp; if (coins > 0 && S.life) S.life.stats.coins += coins;
    if (coins > 0 && from) this.popCoins(coins, from);
    while (S.xp >= this.need(S.lvl)) { S.xp -= this.need(S.lvl); S.lvl++; this.levelUp(); }
    UI.hud(true);
    return coins;
  },
  popCoins(n, from) {
    const a = this.avatar; if (!a) return; const [x, y] = a.headPos();
    Room.puff('p_coin', x - 2, y - 4, { vy: -12, max: 1.1 });
    UI.floatText('+' + n, x, y - 6);
  },
  levelUp() {
    const S = this.S; const [x, y] = freeFloorSpot(14, 12);
    S.gifts.push({ uid: S.nextUid++, x: Math.round(x - 6), y: Math.round(y), lvl: S.lvl, drop: 70 });
    UI.toast(`升到 Lv ${S.lvl}！房間裡送來一個禮物，點它打開`, 'i_star', 4.5);
    this.save();
  },
  openGift(g) {
    const S = this.S; S.gifts = S.gifts.filter(x => x !== g);
    const p = Rewards.roll({ pity: true, lvl: g.lvl }); Rewards.grant(p);
    for (let i = 0; i < 8; i++) Room.puff('p_spark', g.x + 6, g.y - 8, { vx: (Math.random() - 0.5) * 30, vy: -14 - Math.random() * 10, grav: 20, max: 1 });
    UI.prizeModal(p, '禮物盒'); UI.hud(true); this.save(); saveSoon();
  },
  // ---------- timer ----------
  T() { return this.S.timer; },
  modeLen(m) { const t = this.T(); return (m === 'focus' ? t.focus : m === 'short' ? t.short : t.long) * 60; },
  setMode(m) { const t = this.T(); t.mode = m; t.running = false; t.remain = this.modeLen(m); t.credited = 0; this.afterTimer(); },
  start() {
    const t = this.T(); if (t.running) return; if (t.remain <= 0) t.remain = this.modeLen(t.mode); t.endsAt = Date.now() + t.remain * 1000; t.running = true;
    const task = t.mode === 'focus' && this.S.todos.find(x => String(x.id) === String(this.S.focusTask) && !x.done);
    if (task && this.avatar) this.bubble(this.avatar, '專心做：' + task.t.slice(0, 18), 3);
    if (t.mode === 'focus' && this.S.settings.autoMusic && !Music.playing && (this.S.music.list.length || Lib.tracks.length)) Music.toggle(true);
    this.afterTimer();
  },
  pause() { const t = this.T(); if (!t.running) return; t.remain = Math.max(0, Math.round((t.endsAt - Date.now()) / 1000)); t.running = false; this.afterTimer(); },
  resetTimer() { const t = this.T(); t.running = false; t.remain = this.modeLen(t.mode); t.credited = 0; this.afterTimer(); },
  skip() { const t = this.T(); t.running = false; this.complete(true); },
  afterTimer() { UI.refresh('timer'); UI.hud(true); Cowork.push(); this.save(); },
  tickTimer() {
    const t = this.T(); if (!t.running) return;
    const remain = Math.max(0, (t.endsAt - Date.now()) / 1000); t.remain = Math.ceil(remain);
    if (t.mode === 'focus') {
      const elapsed = this.modeLen('focus') - remain; const whole = Math.floor(elapsed / 60);
      let gained = 0; while (t.credited < whole && t.credited < t.focus) { t.credited++; gained++; this.S.stats.focusMin++; }
      if (gained) { this.reward(gained * 2, gained * 4, 'focus'); Life.track('focusMin', gained); Social.addFocus(gained); this.save(); }
    }
    if (remain <= 0) this.complete(false);
  },
  complete(skipped) {
    const t = this.T(); t.running = false;
    if (t.mode === 'focus') {
      if (!skipped) {
        t.round++; this.S.stats.sessions++;
        const B = this.S.life.buff; let bonus = Math.round(t.focus * 0.4), bxp = Math.round(t.focus * 0.6), why = [];
        if (B.coin) { bonus += Math.round(t.focus * 2 * 0.3); delete B.coin; why.push('飯糰'); }
        if (B.xp) { bxp += Math.round(t.focus * 4 * 0.3); delete B.xp; why.push('咖啡'); }
        bonus = this.reward(bonus, bxp, 'done');
        UI.toast(`完成一輪專注！額外 +${bonus} 金幣、+${bxp} 經驗` + (why.length ? `（${why.join('、')}加成）` : ''), 'i_tomato', 4);
        if (Math.random() < 0.45) setTimeout(() => Life.addNeed(Math.random() < 0.5 ? 'ava_sleepy' : 'ava_hungry'), 5000);
        if (this.avatar) { this.avatar.happy = 3; this.avatar.hop = 0.45; Game.bubble(this.avatar, '完成了！休息一下吧', 3); }
        UI.flashTitle('專注完成');
      }
      const next = t.round > 0 && t.round % 4 === 0 ? 'long' : 'short';
      t.mode = next; t.remain = this.modeLen(next); t.credited = 0;
      if (!skipped && this.S.settings.autoBreak) { t.endsAt = Date.now() + t.remain * 1000; t.running = true; }
    } else {
      if (!skipped) { UI.toast('休息結束，準備好就再開始吧', 'i_bell', 4); UI.flashTitle('休息結束'); }
      t.mode = 'focus'; t.remain = this.modeLen('focus'); t.credited = 0;
    }
    this.afterTimer();
  },
  // ---------- shop & storage ----------
  buy(kind, id) {
    if (kind === 'pet') return Pets.adopt(id);
    const S = this.S; let d, price;
    if (kind === 'item') d = ITEMS[id]; else if (kind === 'wp') d = WALLPAPERS[id]; else if (kind === 'fl') d = FLOORS[id]; else if (kind === 'view') d = VIEWS[id]; else d = PETS[id];
    const cat = kind; price = Rewards.price(d.price, cat);
    if (S.lvl < d.lvl) return UI.toast(`需要 Lv ${d.lvl} 才能購買`, 'i_star');
    if (S.coins < price) return UI.toast(`金幣不夠，還差 ${price - S.coins}`, 'i_coin');
    S.coins -= price; Rewards.consume(d.price, cat, d.n);
    if (kind === 'item') { S.inv[id] = (S.inv[id] || 0) + 1; UI.toast(`買下了「${d.n}」，收在收納箱裡`, 'i_box', 3.2, { label: '馬上擺放', fn: () => this.place(id) }); }
    else if (kind === 'wp') { S.ownWP.push(id); this.applyWP(id); UI.toast(`換上了「${d.n}」壁紙`, 'i_wall'); }
    else if (kind === 'fl') { S.ownFL.push(id); this.applyFL(id); UI.toast(`換上了「${d.n}」地板`, 'i_floor'); }
    else if (kind === 'view') { S.ownViews.push(id); this.applyView(id); UI.toast(`窗外換成「${d.n}」`, 'i_view'); }
    Life.track('buy', 1, { kind, id });
    UI.hud(true); UI.refresh('shop'); UI.refresh('storage'); UI.refresh('pet'); this.save(); saveSoon();
  },
  applyWP(id) { this.S.wp = id; Room.buildBg(this.S.wp, this.S.fl); UI.refresh('storage'); this.save(); },
  applyFL(id) { this.S.fl = id; Room.buildBg(this.S.wp, this.S.fl); UI.refresh('storage'); this.save(); },
  setPet(id) { const p = Pets.list().find(x => x.sp === id); if (p) Pets.select(p.id); },
  place(id) {
    const S = this.S; if (!S.inv[id]) return; const d = ITEMS[id];
    S.inv[id]--; if (!S.inv[id]) delete S.inv[id];
    const it = { uid: S.nextUid++, k: id, x: 0, y: 0 }; if (d.toggle) it.on = true; S.items.push(it); Room.indexItems();
    const cv = Room.itemCanvas(it);
    if (d.layer === 'wall') { const [x, y] = freeWallSpot(cv.width, cv.height); it.x = x; it.y = y; Room.clampItem(it); }
    else if (d.layer === 'decor') {
      const surf = S.items.filter(o => o !== it && o.p == null && ITEMS[o.k].surface).map(o => Room.surfaceOf(o));
      const s = surf.find(s => s.x1 - s.x0 > cv.width + 2) || null;
      if (s) { it.x = Math.round(s.x0 + Math.random() * (s.x1 - s.x0 - cv.width)); it.y = s.y - cv.height + 1; Room.settleDecor(it); }
      else { const [x, y] = freeFloorSpot(cv.width, 10); it.x = Math.round(x - cv.width / 2); it.y = Math.round(y - cv.height); Room.clampItem(it); }
    } else if (d.layer === 'rug') { const [x, y] = freeFloorSpot(cv.width * 0.6, 6); it.x = Math.round(x - cv.width / 2); it.y = Math.round(y - cv.height / 2); Room.clampItem(it); }
    else { const [x, y] = freeFloorSpot(cv.width, 12); it.x = Math.round(x - cv.width / 2); it.y = Math.round(y - cv.height); Room.clampItem(it); }
    UI.setEdit(true); Room.sel = it; UI.editToolbar(); UI.refresh('storage');
    for (const n of this.S.life.needs) if (n.type === 'arrange') n.prog = 1;
    Life.track('place', 1); if (typeof PetAI !== 'undefined') PetAI.noticePlaced(it); this.save();
    UI.closeWin('storage'); UI.closeWin('shop');
  },
  storeItem(it) {
    const S = this.S; const kids = S.items.filter(o => o.p === it.uid);
    for (const o of [it, ...kids]) { S.inv[o.k] = (S.inv[o.k] || 0) + 1; }
    // food still in a bowl goes back to the bag (servings already started are finished off by nobody, so only whole ones return)
    let back = 0; if (it.bq) for (const q of it.bq) if (PET_FOODS[q.k] && q.left >= PET_FOODS[q.k].hunger - 0.5) { Life.give(q.k, 1); back++; }
    S.items = S.items.filter(o => o !== it && !kids.includes(o)); Room.state = S; Room.indexItems();
    if (Room.sel === it) Room.sel = null;
    UI.editToolbar(); UI.refresh('storage'); this.save();
    UI.toast((kids.length ? `收起了「${ITEMS[it.k].n}」和上面的小物` : `收起了「${ITEMS[it.k].n}」`) + (back ? `，碗裡的 ${back} 份食物放回道具` : ''), 'i_box', 2.4);
  },
  interact(it) {
    const d = ITEMS[it.k], A = this.avatar; const cv = Room.itemCanvas(it); const cx = it.x + cv.width / 2;
    it.shake = 0.25;
    const nd = Life.needOf('item', it.uid); if (nd && NEED_DEFS[nd.type].item) { UI.needCard(nd.id); return; }
    if (d.act && Fun[d.act]) return Fun[d.act](it, d, cx);
    if (it.k === 'guestbook') return UI.openFriends('guest');
    if (d.bowl) { const o = Pets.bowlOwner(it); if (o) Pets.Z.sel = o.id; UI.petBowl = it.uid; UI.petTab = 'care'; UI.openWin('pet'); UI.refresh('pet'); return; }
    if (d.toggle) { it.on = !it.on; Room.puff('p_spark', cx - 1, it.y - 2, { vy: -6, max: 0.7 }); this.save(); return; }
    if (d.window) { it.closed = !it.closed; this.save(); return; }
    if (d.bed) { if (this.focusing()) return this.bubbleAt(cx, it.y, '專注時間先不睡喔'); A.stand(); A.goSleep(it); return; }
    if (d.seat) { if (this.focusing()) return this.bubbleAt(cx, it.y, '等休息時間再來坐'); A.stand(); const [w, h] = itemSize(it); const sx = it.flip ? w - d.seat.x : d.seat.x; A.state = 'walk'; A.walkTo(it.x + sx, it.y + h + 3, () => { if (!Room.uidMap[it.uid]) { A.state = 'idle'; return; } A.state = 'sit'; A.seat = it; A.timer = 12; }); return; }
    if (d.desk || d.chair) { UI.openWin('timer'); return; }
    const r = d.react;
    if (r === 'water') return Fun.water(it, d, cx);
    if (r === 'word') return Fun.word(it, d, cx);
    if (r === 'rustle') { for (let i = 0; i < 3; i++) Room.puff('p_leaf', cx + (Math.random() - 0.5) * cv.width * 0.6, it.y + 4, { vx: (Math.random() - 0.5) * 14, vy: -6, grav: 14, wob: 8, max: 1.4 }); return; }
    if (r === 'notes') { for (let i = 0; i < 3; i++) Room.puff('p_note', cx - 2 + i * 3, it.y - 2, { vx: (i - 1) * 6, vy: -10 - i * 2, wob: 10, max: 1.8 }); return; }
    if (r === 'bubbles') { for (let i = 0; i < 4; i++) Room.puff('p_bubble', cx - 3 + Math.random() * 6, it.y + 3, { vx: 0, vy: -6 - Math.random() * 4, wob: 6, max: 1.2 }); return; }
    if (r === 'hearts') { Room.puff('p_heart', cx - 2, it.y - 3, { vy: -9 }); return; }
    if (r === 'time') { const n = new Date(); return this.bubbleAt(cx, it.y, `現在 ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`); }
    if (r === 'date') { const n = new Date(); return this.bubbleAt(cx, it.y, `${n.getMonth() + 1} 月 ${n.getDate()} 日 星期${'日一二三四五六'[n.getDay()]}`); }
    if (r === 'spin') { Room.puff('p_spark', cx, it.y, { vy: -8 }); return; }
    if (d.steam) { for (let i = 0; i < 3; i++) Room.puff('p_steam', cx - 1, it.y - 2, { vy: -6 - i * 2, vx: (Math.random() - 0.5) * 3, max: 1.4, alpha: 0.7 }); return; }
  },
  // ---------- todos ----------
  uid(list) { return Math.max(Date.now(), ...list.map(x => (+x.id || 0) + 1)); },
  addTodo(t) { t = t.trim().slice(0, 140); if (!t) return; const S = this.S; S.todos = S.todos.filter(x => !x.ex); S.todos.unshift({ id: this.uid(S.todos), t, done: false }); if (S.todos.length > 100) S.todos.length = 100; UI.refresh('todo'); UI.refresh('timer'); this.save(); },
  toggleTodo(id) {
    const S = this.S, td = S.todos.find(x => x.id === id); if (!td) return; td.done = !td.done;
    if (td.done && !td.paid && !td.ex) {
      const today = gameDate().toDateString(); if (S.stats.todoDay !== today) { S.stats.todoDay = today; S.stats.todoToday = 0; }
      td.paid = true; S.stats.todos++;
      if (S.stats.todoToday < 15) { S.stats.todoToday++; this.reward(3, 5, 'todo'); }
      Life.track('todo', 1);
      if (this.avatar) this.avatar.happy = 1.5;
    }
    UI.refresh('todo'); UI.refresh('timer'); this.save();
  },
  delTodo(id) { this.S.todos = this.S.todos.filter(x => x.id !== id); UI.refresh('todo'); UI.refresh('timer'); this.save(); },
  // ---------- memos ----------
  addMemo() { const S = this.S; if (S.memos.length >= 20) return UI.toast('便條最多 20 張'); S.memos.unshift({ id: this.uid(S.memos), text: '', color: ['butter', 'rose', 'mint', 'sky', 'lilac'][S.memos.length % 5], pin: false, x: 60 + (S.memos.length % 5) * 24, y: 110 + (S.memos.length % 5) * 18 }); UI.refresh('memo'); this.save(); },
  // ---------- bubbles ----------
  bubble(actor, text, secs = 2) { UI.bubble({ actor }, text, secs); },
  bubbleAt(x, y, text, secs = 2.2) { UI.bubble({ x, y }, text, secs); },
  // ---------- loop ----------
  frame(ts) {
    const now = ts / 1000; const dt = Math.min(0.05, Math.max(0, now - (this._last || now))); this._last = now;
    if (now - this.lastEnv > 1) { this.lastEnv = now; Room.computeEnv(this.S.settings); }
    this.tickTimer();
    if (!document.hidden) { this.passiveAcc += dt; if (this.passiveAcc > 300) { this.passiveAcc = 0; this.reward(1 + Math.floor(Life.comfortLv() / 2), 0, 'raw'); this.save(); } }
    Life.tick(dt);
    for (const a of Room.actors) a.update(dt);
    for (const g of this.S.gifts) if (g.drop == null) g.drop = 0;
    Room.render(dt);
    UI.tickOverlay(dt);
    if (now - this.lastHud > 0.25) { this.lastHud = now; UI.hud(); }
    requestAnimationFrame(t => this.frame(t));
  },
};

// ---------- co-working via live presence ----------
const Cowork = {
  room: null, status: 'loading', peers: [], connected: false,
  async init() {
    try {
      const cl = window.claude; if (!cl || !cl.use) { this.status = 'off'; UI.refresh('cowork'); return; }
      const room = await cl.use('room'); if (!room) { this.status = 'off'; UI.refresh('cowork'); return; }
      this.room = room; this.status = 'on';
      room.onConnection(c => { this.connected = c; UI.refresh('cowork'); }, () => { this.status = 'off'; this.room = null; this.clear(); UI.refresh('cowork'); });
      room.onPeers(ch => this.sync(ch.peers), () => { });
      this.push(); UI.refresh('cowork');
    } catch (e) { this.status = 'off'; UI.refresh('cowork'); }
  },
  presenceObj() {
    const S = Game.S, t = S.timer, a = S.avatar;
    const st = t.running ? (t.mode === 'focus' ? 'focus' : 'break') : 'idle';
    const o = { nick: (a.name || '').slice(0, 16), ava: sanitizeAvatar(a), st, end: t.running ? t.endsAt : 0, lvl: S.lvl, pet: S.pet };
    if (S.say && Date.now() - S.say.ts < 20000) o.say = S.say; else o.say = null;
    return o;
  },
  push() { if (!this.room) return; this.room.presence(this.presenceObj()).catch(() => { }); },
  sync(peers) {
    const seen = new Set(); this.peers = [];
    for (const p of peers) {
      if (p.isMe || p.kind !== 'viewer') continue;
      this.peers.push(p); if (seen.size >= 6) continue; seen.add(p.peer);
      let v = Game.visitors[p.peer];
      if (!v) { v = Game.visitors[p.peer] = new Visitor(p); Room.actors.push(v); }
      else v.applyPresence(p.presence);
    }
    for (const k in Game.visitors) if (!seen.has(k)) { const v = Game.visitors[k]; Room.actors = Room.actors.filter(a => a !== v); delete Game.visitors[k]; UI.dropTag(v); }
    UI.refresh('cowork');
  },
  clear() { for (const k in Game.visitors) { const v = Game.visitors[k]; Room.actors = Room.actors.filter(a => a !== v); UI.dropTag(v); } Game.visitors = {}; this.peers = []; },
  say(text) {
    text = String(text || '').replace(/[\u0000-\u001f​-‏‪-‮⁠-⁤﻿]/g, '').trim().slice(0, 60); if (!text) return;
    Game.S.say = { t: text, ts: Date.now() }; Game.bubble(Game.avatar, text, 4); this.push();
  },
};

// ---------- input on the room canvas ----------
function setupInput(cv) {
  const toRoom = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * RW, (e.clientY - r.top) / r.height * RH]; };
  let down = null;
  cv.addEventListener('pointerdown', e => {
    const [x, y] = toRoom(e);
    if (Room.edit) {
      const h = Room.hit(x, y, { itemsOnly: true });
      if (h && h.kind === 'item') { const it = h.it; Room.sel = it; Room.drag = { it, ox: x - it.x, oy: y - it.y, sx: x, sy: y, moved: false }; cv.setPointerCapture(e.pointerId); }
      else Room.sel = null;
      UI.editToolbar(); e.preventDefault(); return;
    }
    down = { x, y, t: performance.now() };
  });
  cv.addEventListener('pointermove', e => {
    const [x, y] = toRoom(e);
    if (Room.edit && Room.drag) {
      const d = Room.drag, it = d.it, def = ITEMS[it.k];
      if (!d.moved && Math.hypot(x - d.sx, y - d.sy) > 1.5) { d.moved = true; if (it.p != null) { delete it.p; delete it.dx; delete it.dy; } UI.editToolbar(true); }
      if (!d.moved) return;
      it.x = Math.round(x - d.ox); it.y = Math.round(y - d.oy);
      if (def.layer === 'decor') { d.snap = Room.findSurface(it); if (!d.snap) Room.clampItem(it); }
      else Room.clampItem(it);
      return;
    }
    if (Room.edit) { const h = Room.hit(x, y, { itemsOnly: true }); Room.hover = h ? h.it : null; cv.style.cursor = h ? 'grab' : 'default'; return; }
    const h = Life.hitBubble(x, y) || Room.hit(x, y); cv.style.cursor = h ? 'pointer' : 'default';
  });
  const end = (e) => {
    if (Room.edit && Room.drag) {
      const d = Room.drag; if (d.moved) { const it = d.it; if (ITEMS[it.k].layer === 'decor') Room.settleDecor(it); else Room.clampItem(it); Room.indexItems(); Life.track('move', 1); Game.save(); }
      Room.drag = null; UI.editToolbar(); return;
    }
    if (!down || Room.edit) return; const [x, y] = toRoom(e); const moved = Math.hypot(x - down.x, y - down.y) > 3; down = null; if (moved) return;
    const nb = Life.hitBubble(x, y); if (nb) { UI.needCard(nb.id); return; }
    const h = Room.hit(x, y); if (!h) return;
    if (h.kind === 'actor') {
      const isPet = h.a instanceof Pet, who = isPet ? 'pet' : h.a === Game.avatar ? 'avatar' : null, nd = who && Life.needOf(who, isPet ? h.a.pid : undefined);
      if (nd && NEED_DEFS[nd.type].item) { UI.needCard(nd.id); return; }
      h.a.poke();
    } else if (h.kind === 'gift') Game.openGift(h.g); else Game.interact(h.it);
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { Room.drag = null; down = null; });
  cv.addEventListener('pointerleave', () => { Room.hover = null; });
}

// ---------- boot ----------
function boot(data) {
  Game.load(data && data.S);
  Room.init(document.getElementById('room'));
  Room.state = Game.S; Room.indexItems();
  Room.buildBg(Game.S.wp, Game.S.fl); Room.computeEnv(Game.S.settings);
  Game.avatar = new Avatar(() => Game.S.avatar); Game.avatar.x = 112; Game.avatar.y = 148;
  Room.actors = [Game.avatar]; Game.pets = []; Pets.syncActors(); Merchant.spawn(); setInterval(() => Merchant.check(), 30000);
  UI.init();
  Music.init();
  Dev.init(); Life.ensureDaily(); Learn.ensureDaily(); UI.badges();
  setupInput(document.getElementById('room'));
  requestAnimationFrame(t => Game.frame(t));
  setInterval(() => { if (document.hidden) { Game.tickTimer(); UI.hud(); } }, 1000);
  Cloud.init(); Cowork.init();
  window.claude?.hot?.snapshot?.(() => ({ S: Game.S }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { Game.save(); Cloud.flush(); } });
  if (Game.outdated) UI.toast('這份存檔來自比較新的遊戲版本，請重新整理頁面載入新版；這個版本不會儲存進度', 'i_cloud', 10, { label: '重新整理', fn: () => location.reload() });
  window.addEventListener('pagehide', () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(Game.S)); } catch (e) { } });
}
