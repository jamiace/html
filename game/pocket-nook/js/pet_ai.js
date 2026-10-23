/* ============================================================
   Pet habits and relationships (autonomous behaviour only)
   - every pet gets 3 of 20 hidden habits once, kept for good
   - every week (Monday 06:00) each pet gets 3 directed relationships
     towards other pets in the room; negative ones only play while the
     pet itself has a stat (fullness, mood, cleanliness, energy) under 40
   - both only change what the pet chooses to do in its free time:
     no stats, rewards, success rates or player commands are touched
   - players never see the lists; developer mode shows them
   ============================================================ */
const HABITS = {
  H01: { n: '窗邊發呆', d: '閒暇時走到窗前看外面' },
  H02: { n: '睡前轉圈', d: '躺下睡覺前先轉兩圈' },
  H03: { n: '喜歡角落', d: '常常窩到房間角落' },
  H04: { n: '巡邏', d: '沿著房間走一圈，每個點停一下' },
  H05: { n: '偷看主人', d: '偶爾停下來轉頭看你' },
  H06: { n: '喜歡高處', d: '喜歡跳到櫃子、床這類高的地方' },
  H07: { n: '飯後整理', d: '吃完飯會舔爪子整理' },
  H08: { n: '跟著同伴', d: '會跟在別的寵物後面走一段' },
  H09: { n: '喜歡地毯', d: '常常跑到地毯上趴著' },
  H10: { n: '看魚', d: '房間有魚缸、水族箱時會去盯著看' },
  H11: { n: '聽音樂', d: '放音樂時會靠近唱機或喇叭' },
  H12: { n: '看雨', d: '下雨時特別常到窗邊' },
  H13: { n: '找暖光', d: '喜歡趴在亮著的燈、暖爐旁邊' },
  H14: { n: '躲桌下', d: '會鑽到桌子底下趴著' },
  H15: { n: '伸懶腰', d: '閒暇時伸個大懶腰' },
  H16: { n: '聞新物件', d: '新擺的家具會過去聞一聞' },
  H17: { n: '回頭確認', d: '走一走會停下來回頭看' },
  H18: { n: '坐姿整理', d: '坐著坐著會換成趴著' },
  H19: { n: '追自己的尾巴', d: '偶爾原地追尾巴' },
  H20: { n: '抬頭看燈', d: '會抬頭盯著亮著的燈' },
};
const RELS = {
  R01: { n: '喜歡跟著對方走', good: true }, R02: { n: '喜歡並排坐', good: true }, R03: { n: '喜歡靠近午睡', good: true },
  R04: { n: '主動聞聞打招呼', good: true }, R05: { n: '邀請短暫追逐', good: true }, R06: { n: '模仿對方動作', good: true },
  R07: { n: '看到對方會靠近', good: true }, R08: { n: '喜歡一起看窗外', good: true }, R09: { n: '對方醒來時過去看看', good: true },
  R10: { n: '偶爾互相整理毛髮', good: true },
  R11: { n: '對方靠近便移開' }, R12: { n: '不願並排坐' }, R13: { n: '被跟隨時短暫回頭抗議' }, R14: { n: '遇到對方時背過身' },
  R15: { n: '對方太靠近時短促叫一聲' }, R16: { n: '不願加入對方玩耍' }, R17: { n: '看見對方後另找休息處' }, R18: { n: '經過對方身旁時加快離開' },
  R19: { n: '對方示好時暫不回應' }, R20: { n: '同處一區時刻意拉開距離' },
};
const REL_LOW = 40, REL_COOLDOWN = [18, 34], HABIT_CHANCE = 0.32, REL_CHANCE = 0.22;

const PetAI = {
  rnd: (a) => a[Math.floor(Math.random() * a.length)],
  // ---------- data ----------
  habitsOf(p) {
    if (!p) return [];
    if (!Array.isArray(p.habits) || p.habits.length !== 3 || p.habits.some(h => !HABITS[h])) { const ids = Object.keys(HABITS); p.habits = shuffle(ids).slice(0, 3); p.habitsAt = Date.now(); }
    return p.habits;
  },
  has(a, id) { const d = a && a.data; return !!d && this.habitsOf(d).includes(id); },
  rollRels(p) {
    const others = Pets.home().filter(q => q.id !== p.id), list = [];
    if (others.length) {
      const sign = {}, ids = Object.keys(RELS);
      for (let i = 0; i < 3 && list.length < 3; i++) {
        const t = this.rnd(others).id;
        // one direction towards one pet is all positive or all negative in a week
        const pool = ids.filter(r => !list.some(x => x.r === r && x.t === t) && (sign[t] == null || !!RELS[r].good === sign[t]));
        if (!pool.length) continue; const r = this.rnd(pool); sign[t] = !!RELS[r].good; list.push({ r, t });
      }
    }
    p.rel = { wk: weekKey(), list, n: others.length };
    return p.rel;
  },
  relsOf(p) {
    if (!p) return [];
    if (!p.rel || p.rel.wk !== weekKey() || (!p.rel.list.length && Pets.home().length > 1)) this.rollRels(p);
    return p.rel.list;
  },
  low(p) { return !!p && (p.hunger < REL_LOW || p.mood < REL_LOW || p.clean < REL_LOW || p.energy < REL_LOW); },
  // relationships this pet can act on right now (target in the room, negative ones only when low)
  liveRels(a) {
    const p = a.data; if (!p) return [];
    const low = this.low(p);
    return this.relsOf(p).filter(x => (RELS[x.r].good || low) && this.actorOf(x.t)).map(x => ({ r: x.r, t: this.actorOf(x.t) }));
  },
  actorOf(pid) { return (Game.pets || []).find(o => o.pid === pid) || null; },
  relTo(a, other, r) { return this.liveRels(a).some(x => x.t === other && (!r || x.r === r)); },
  // ---------- small helpers ----------
  act(a, pose, secs, cb) { a.walking = false; a.state = 'act'; a.actPose = pose; a.actT = 0; a.timer = secs; a.actCb = cb || null; },
  walkAct(a, x, y, pose, secs, cb) { a.state = 'walk'; a.walkTo(x, y, () => { this.act(a, pose, secs, cb); }); },
  face(a, x) { a.flip = x < a.x; },
  dist(a, b) { return Math.hypot(a.x - b.x, (a.y - b.y) * 1.6); },
  away(a, from, d = 40) { const dx = a.x >= from.x ? 1 : -1; const y = Math.max(104, Math.min(162, a.y + (Math.random() - 0.5) * 20)); const [xa, xb] = floorX(y); return [Math.max(xa + 10, Math.min(xb - 10, a.x + dx * d)), y]; },
  litItems() { return Room.state.items.filter(it => { const d = ITEMS[it.k]; return d && d.light && it.p == null && (!d.toggle || it.on) && d.layer !== 'wall'; }); },
  itemFront(it, dy = 3) { const [w, h] = itemSize(it); return [it.x + w / 2, Math.min(166, it.y + h + dy)]; },
  windows() { return Room.state.items.filter(it => ITEMS[it.k] && ITEMS[it.k].window); },
  recent: [],   // furniture placed this session: [{ uid, at, sniffed: Set }]
  noticePlaced(it) { this.recent.push({ uid: it.uid, at: Date.now(), by: new Set() }); if (this.recent.length > 8) this.recent.shift(); },
  // ---------- habits: one free-time choice, returns true when something started ----------
  habit(a, go) {
    const p = a.data, hs = this.habitsOf(p); if (!hs.length) return false;
    const order = shuffle(hs.slice());
    if (Room.env && Room.env.rain && hs.includes('H12')) order.unshift('H12');
    for (const id of order) { const fn = this.H[id]; if (fn && fn.call(this, a, go)) return true; }
    return false;
  },
  H: {
    H01(a, go) { const w = this.windows(); if (!w.length) return false; const it = this.rnd(w), [ww] = itemSize(it); return go(() => this.walkAct(a, it.x + ww / 2 + (Math.random() - 0.5) * 10, 104 + Math.random() * 4, 'look', 5 + Math.random() * 4)), true; },
    H02() { return false; },   // happens when lying down (see sleepSpin)
    H03(a, go) { const y = Math.random() < 0.6 ? 104 + Math.random() * 6 : 160 + Math.random() * 5, [xa, xb] = floorX(y), x = Math.random() < 0.5 ? xa + 12 : xb - 12; return go(() => this.walkAct(a, x, y, 'lie', 8 + Math.random() * 6)), true; },
    H04(a, go) {
      const pts = [0, 1, 2].map(() => randFloor(14)); let i = 0;
      const next = () => { if (i >= pts.length) { a.state = 'sit'; a.timer = 2; return; } const [x, y] = pts[i++]; a.state = 'walk'; a.walkTo(x, y, () => this.act(a, 'sit', 0.8, next)); };
      return go(next), true;
    },
    H05(a) { const A = Game.avatar; if (!A || A.state === 'sleep') return false; this.face(a, A.x); this.act(a, 'look', 2.2); return true; },
    H06(a, go) { const sp = a.freeSpots().filter(s => s.high); if (!sp.length) return false; const s = this.rnd(sp); return go(() => a.goSpot(s, 'sit', 6 + Math.random() * 6)), true; },
    H07() { return false; },   // happens after eating (see afterEat)
    H08(a, go) {
      const os = a.others().filter(o => o.walking || o.state === 'sit'); if (!os.length) return false; const o = this.rnd(os); let n = 3;
      const hop = () => { if (n-- <= 0 || !Game.pets.includes(o)) { a.state = 'sit'; a.timer = 2; return; } a.state = 'walk'; a.walkTo(o.x + (o.flip ? 14 : -14), o.y + 1, () => this.act(a, 'sit', 0.6, hop)); };
      return go(hop), true;
    },
    H09(a, go) { const rugs = Room.state.items.filter(it => ITEMS[it.k] && ITEMS[it.k].layer === 'rug'); if (!rugs.length) return false; const it = this.rnd(rugs), [w, h] = itemSize(it); return go(() => this.walkAct(a, it.x + w * (0.3 + Math.random() * 0.4), it.y + h * (0.4 + Math.random() * 0.3), 'lie', 8 + Math.random() * 8)), true; },
    H10(a, go) { const f = Room.state.items.filter(it => { const d = ITEMS[it.k]; return d && (d.fish || d.act === 'feedfish'); }); if (!f.length) return false; const it = this.rnd(f), base = it.p != null && Room.uidMap[it.p] ? Room.uidMap[it.p] : it, [x, y] = this.itemFront(base, 4); return go(() => this.walkAct(a, x + 6, y, 'look', 5 + Math.random() * 3)), true; },
    H11(a, go) { if (typeof Music === 'undefined' || !Music.playing) return false; const m = Room.state.items.filter(it => ITEMS[it.k] && ITEMS[it.k].music); if (!m.length) return false; const it = this.rnd(m), base = it.p != null && Room.uidMap[it.p] ? Room.uidMap[it.p] : it, [x, y] = this.itemFront(base, 4); return go(() => this.walkAct(a, x + (Math.random() < 0.5 ? -10 : 10), y, 'sit', 6, () => { Room.puff('p_note', a.x, a.y - 18, { vy: -8, max: 1.2 }); a.state = 'sit'; a.timer = 2; })), true; },
    H12(a, go) { if (!Room.env || !Room.env.rain) return false; return this.H.H01.call(this, a, go); },
    H13(a, go) { const L = this.litItems(); if (!L.length) return false; const it = this.rnd(L), [x, y] = this.itemFront(it, 4); return go(() => this.walkAct(a, x + (Math.random() - 0.5) * 12, y, 'lie', 8 + Math.random() * 6)), true; },
    H14(a, go) {
      const T = Room.state.items.filter(it => { const d = ITEMS[it.k]; if (!d || d.layer !== 'floor' || !d.surface || it.p != null) return false; const [w] = itemSize(it); return w >= 26 && /desk|table|桌/.test(it.k + d.n); });
      if (!T.length) return false; const it = this.rnd(T), [w, h] = itemSize(it);
      return go(() => this.walkAct(a, it.x + w / 2 + (Math.random() - 0.5) * (w / 3), it.y + h - 2, 'lie', 8 + Math.random() * 6)), true;
    },
    H15(a) { this.act(a, 'stretch', 2.2); return true; },
    H16(a, go) { const r = this.recent.find(x => !x.by.has(a.pid) && Room.uidMap[x.uid] && Date.now() - x.at < 15 * 60e3); if (!r) return false; r.by.add(a.pid); const it = Room.uidMap[r.uid], base = it.p != null && Room.uidMap[it.p] ? Room.uidMap[it.p] : it, [x, y] = this.itemFront(base, 3); return go(() => this.walkAct(a, x + 8, y, 'look', 2.5, () => { Game.bubble(a, '嗅嗅…', 1.4); a.state = 'sit'; a.timer = 2; })), true; },
    H17(a, go) { const [x, y] = randFloor(12); return go(() => { a.state = 'walk'; a.walkTo(x, y, () => { a.flip = !a.flip; this.act(a, 'look', 0.9, () => { a.flip = !a.flip; a.state = 'sit'; a.timer = 2; }); }); }), true; },
    H18(a) { if (a.on) return false; this.act(a, 'lie', 6 + Math.random() * 6); return true; },
    H19(a) { if (a.on) return false; this.act(a, 'chase', 2.4); return true; },
    H20(a) { if (!this.litItems().length && !this.windows().length) return false; this.act(a, 'look', 3); return true; },
  },
  // called when a pet lies down to sleep
  sleepSpin(a) { if (this.has(a, 'H02')) a.preSleep = 1.2; },
  afterEat(a) { if (this.has(a, 'H07')) { this.act(a, 'groom', 3); return true; } return false; },
  // a floor spot to nap next to a pet it likes napping with
  napNear(a) { const x = this.liveRels(a).find(r => r.r === 'R03' && r.t.state === 'sleep'); if (!x) return null; const t = x.t; return [Math.max(20, Math.min(220, t.x + (t.x > 120 ? -16 : 16))), t.y + 1]; },
  // ---------- relationships: actions this pet starts ----------
  relate(a, go) {
    if ((a.relCd || 0) > 0) return false;
    const live = shuffle(this.liveRels(a)); if (!live.length) return false;
    for (const { r, t } of live) {
      const fn = this.R[r]; if (fn && fn.call(this, a, t, go)) { a.relCd = REL_COOLDOWN[0] + Math.random() * (REL_COOLDOWN[1] - REL_COOLDOWN[0]); return true; }
    }
    return false;
  },
  R: {
    R01(a, t, go) {
      if (t.state === 'sleep' || t.on) return false; let n = 3;
      const hop = () => { if (n-- <= 0 || !Game.pets.includes(t)) { a.state = 'sit'; a.timer = 2; return; } a.state = 'walk'; a.walkTo(t.x + (t.flip ? 14 : -14), t.y + 1, () => this.act(a, 'sit', 0.6, hop)); };
      return go(hop), true;
    },
    R02(a, t, go) { if (t.state !== 'sit' && !(t.state === 'act' && t.actPose === 'lie') || t.on || t.walking) return false; return go(() => this.walkAct(a, t.x + (t.x > 120 ? -13 : 13), t.y, 'sit', 6, () => { Room.puff('p_heart', (a.x + t.x) / 2, a.y - 16, { vy: -7, max: 0.9 }); a.state = 'sit'; a.timer = 2; })), true; },
    R03() { return false; },   // used when choosing where to nap (napNear)
    R04(a, t, go) { if (t.on) return false; return go(() => this.walkAct(a, t.x + (t.x > a.x ? -12 : 12), t.y + 1, 'look', 1.4, () => { this.face(a, t.x); Game.bubble(a, '嗅嗅', 1.2); Room.puff('p_heart', (a.x + t.x) / 2, a.y - 16, { vy: -7, max: 0.8 }); a.state = 'sit'; a.timer = 2; })), true; },
    R05(a, t, go) {
      if (t.on || t.state === 'sleep' || t.state === 'eat' || t.state === 'trick') return false;
      return go(() => { a.state = 'walk'; a.speed = 46; a.walkTo(t.x + (t.x > a.x ? -10 : 10), t.y, () => {
        const [x, y] = this.away(a, t, 50); a.walkTo(x, y, () => { a.speed = a.baseSpeed(); a.state = 'sit'; a.timer = 2; a.happy = 1.5; });
        if (!t.walking && (t.state === 'sit' || t.state === 'act')) { t.speed = 40; t.state = 'walk'; t.walkTo(x + (x > t.x ? -12 : 12), y, () => { t.speed = t.baseSpeed(); t.state = 'sit'; t.timer = 2; }); }
      }); }), true;
    },
    R06(a, t) { const pose = t.state === 'act' && ['look', 'lie', 'stretch', 'groom'].includes(t.actPose) ? t.actPose : t.state === 'sit' ? 'look' : null; if (!pose || this.dist(a, t) > 90) return false; this.face(a, t.x); this.act(a, pose, 2.5); return true; },
    R07(a, t, go) { if (this.dist(a, t) < 30 || t.on) return false; return go(() => { a.state = 'walk'; a.walkTo(t.x + (t.x > a.x ? -20 : 20), t.y + 2, () => { this.face(a, t.x); a.state = 'sit'; a.timer = 3; }); }), true; },
    R08(a, t, go) { if (!(t.state === 'act' && t.actPose === 'look' && t.y < 110)) return false; return go(() => this.walkAct(a, t.x + (t.x > 120 ? -14 : 14), t.y + 1, 'look', 5)), true; },
    R09() { return false; },   // reacts when the other wakes up (see react)
    R10(a, t, go) { if (t.on || t.walking || t.state === 'sleep') return false; return go(() => this.walkAct(a, t.x + (t.x > a.x ? -11 : 11), t.y + 1, 'groom', 3, () => { Room.puff('p_heart', (a.x + t.x) / 2, a.y - 16, { vy: -7, max: 0.9 }); a.state = 'sit'; a.timer = 2; })), true; },
    // negatives a pet starts on its own (only while it is low)
    R17(a, t, go) { if (!(t.on || t.state === 'sleep')) return false; const sp = a.freeSpots().filter(s => Math.abs(s.x - t.x) > 50); if (!sp.length) return false; const s = this.rnd(sp); return go(() => a.goSpot(s, 'sit', 6)), true; },
    R20(a, t, go) { if (this.dist(a, t) > 50) return false; const [x, y] = this.away(a, t, 70); return go(() => { a.state = 'walk'; a.walkTo(x, y, () => { a.state = 'sit'; a.timer = 3; }); }), true; },
  },
  // ---------- relationships: reactions while others move around ----------
  react(a, dt) {
    a.reactT = (a.reactT || 0) - dt; if (a.reactT > 0) return; a.reactT = 0.5;
    const p = a.data; if (!p) return;
    const live = this.liveRels(a); if (!live.length) return;
    for (const { r, t } of live) {
      const was = (a.seen || (a.seen = {}))[t.pid]; a.seen[t.pid] = t.state;
      // R09: the other just woke up
      if (r === 'R09' && was === 'sleep' && t.state !== 'sleep' && !a.walking && !a.on && (a.state === 'sit' || a.state === 'act') && (a.relCd || 0) <= 0) {
        a.relCd = REL_COOLDOWN[0]; a.state = 'walk'; a.walkTo(t.x + (t.x > a.x ? -14 : 14), t.y + 1, () => { this.face(a, t.x); this.act(a, 'look', 1.6); }); return;
      }
      if (RELS[r].good || (a.relCd || 0) > 0 || a.on || a.state === 'sleep' || a.state === 'eat' || a.state === 'trick' || a.jump) continue;
      const d = this.dist(a, t), idle = !a.walking && (a.state === 'sit' || a.state === 'act');
      const coming = t.walking && t.tx != null && Math.hypot(t.tx - a.x, t.ty - a.y) < 22;
      let did = false;
      if (r === 'R11' && idle && (coming || d < 18)) { const [x, y] = this.away(a, t, 36); a.state = 'walk'; a.walkTo(x, y, () => { a.state = 'sit'; a.timer = 2; }); did = true; }
      else if (r === 'R12' && idle && d < 20 && (t.state === 'sit' || (t.state === 'act' && t.actPose === 'lie')) && !t.walking) { const [x, y] = this.away(a, t, 34); a.state = 'walk'; a.walkTo(x, y, () => { a.state = 'sit'; a.timer = 3; }); did = true; }
      else if (r === 'R13' && a.walking && t.walking && d < 22) { a.walking = false; this.face(a, t.x); this.act(a, 'look', 0.9, () => { a.state = 'sit'; a.timer = 1.5; }); Game.bubble(a, a.kind === 'dog' ? '汪！' : '喵！', 1); did = true; }
      else if (r === 'R14' && idle && d < 26) { a.flip = t.x > a.x; this.act(a, 'sit', 2.5); did = true; }
      else if (r === 'R15' && d < 16) { Game.bubble(a, a.kind === 'dog' ? '汪！' : '嘶！', 1); did = true; }
      else if (r === 'R16' && idle && d < 50 && (t.state === 'zoom' || t.state === 'trick')) { const [x, y] = this.away(a, t, 50); a.state = 'walk'; a.walkTo(x, y, () => { a.state = 'sit'; a.timer = 3; }); did = true; }
      else if (r === 'R18' && a.walking && d < 22) { a.speed = a.baseSpeed() * 1.8; a.fastT = 1.2; did = true; }
      if (did) { a.relCd = REL_COOLDOWN[0] + Math.random() * (REL_COOLDOWN[1] - REL_COOLDOWN[0]); return; }
    }
  },
  // R19: `to` came over to say hello; returns true when it is ignored
  snub(to, from) {
    if (!this.relTo(to, from, 'R19') || (to.relCd || 0) > 0) return false;
    to.relCd = REL_COOLDOWN[0]; to.flip = from.x > to.x; Game.bubble(to, '…', 1.2); return true;
  },
  // ---------- per-frame upkeep for states this file adds ----------
  tick(a, dt) {
    if (a.relCd > 0) a.relCd -= dt;
    if (a.preSleep > 0) a.preSleep -= dt;
    if (a.fastT > 0) { a.fastT -= dt; if (a.fastT <= 0 && a.state !== 'zoom') a.speed = a.baseSpeed(); }
  },
  update(a, dt) {
    a.actT += dt; a.timer -= dt;
    if (a.actPose === 'chase' && Math.random() < dt * 2) Room.puff('p_spark', a.x, a.y - 6, { vy: -5, max: 0.5 });
    if (a.timer <= 0) { const cb = a.actCb; a.actCb = null; a.actPose = null; a.state = 'sit'; a.timer = 1.5 + Math.random() * 2; if (cb) cb(); }
  },
  pose(a, t) {
    const k = a.actT || 0;
    if (a.actPose === 'chase') return { pose: 'walk', f: Math.floor(k * 12) % 4, flip: Math.floor(k * 4) % 2 === 0 };
    if (a.actPose === 'look' || a.actPose === 'sit') return { pose: a.actPose === 'look' ? 'look' : 'sit', f: 0 };
    if (a.actPose === 'groom') return { pose: 'groom', f: Math.floor(k * 3) % 2 };
    if (a.actPose === 'lie') return { pose: 'lie', f: Math.floor(t * 0.5) % 2 };
    if (a.actPose === 'stretch') return { pose: 'stretch', f: k > 1.2 ? 1 : 0 };
    if (['knead', 'beg', 'shake', 'belly', 'scratch'].includes(a.actPose)) return { pose: a.actPose, f: Math.floor(k * 3) % 2 };
    if (a.actPose === 'yawn') return { pose: 'yawn', f: k > 0.35 && k < 1.1 ? 1 : 0 };
    if (a.actPose === 'stare') return { pose: 'stare', f: (k % 2.4) > 2.2 ? 1 : 0 };
    return { pose: 'sit', f: 0 };
  },
};
