/* ============================================================
   Developer mode (cheat panel)
   Unlock: type the code "jami" into the redeem box on the 成就 tab of the 任務 window.
   Every change made here takes a snapshot first, so it can be undone / redone.
   While developer mode is on, ordinary play also leaves an automatic restore point
   at most once a minute.
   ============================================================ */
const DEV_KEY = 'pocketnook.dev', DEV_HIST = 'pocketnook.dev.hist', DEV_ENV = 'pocketnook.dev.env', DEV_MAX = 30;
const Dev = {
  on: false, hist: [], redoStack: [], prev: null, lastAuto: 0, tab: 'res', needType: 'cat_hungry', busy: false,
  init() {
    try { this.on = localStorage.getItem(DEV_KEY) === '1'; this.hist = JSON.parse(localStorage.getItem(DEV_HIST) || '[]'); } catch (e) { this.hist = []; }
    try { const env = JSON.parse(localStorage.getItem(DEV_ENV) || '{}'); if (this.on) { window.NOOK_DAY_SHIFT = env.day || 0; window.NOOK_DEV_HOUR = env.hour == null ? null : env.hour; } } catch (e) { }
    this.dock();
  },
  saveEnv() { try { localStorage.setItem(DEV_ENV, JSON.stringify({ day: window.NOOK_DAY_SHIFT || 0, hour: window.NOOK_DEV_HOUR == null ? null : window.NOOK_DEV_HOUR })); } catch (e) { } },
  redeem(code) {
    const c = String(code || '').trim().toLowerCase(); if (!c) return;
    if (c === 'jami') { this.enable(true); UI.toast('開發者模式已開啟', 'i_dev', 3); UI.openWin('dev'); }
    else UI.toast('兌換碼無效', 'i_task');
  },
  enable(v) {
    this.on = v; try { localStorage.setItem(DEV_KEY, v ? '1' : '0'); } catch (e) { }
    if (!v) { window.NOOK_DAY_SHIFT = 0; window.NOOK_DEV_HOUR = null; this.saveEnv(); Room.computeEnv(Game.S.settings); UI.closeWin('dev'); Life.ensureDaily(); Learn.ensureDaily(); UI.refreshAll(); UI.badges(); }
    else this.prev = JSON.stringify(Game.S);
    this.dock();
  },
  dock() {
    const d = UI.dockBtns; if (!d) return;
    if (this.on && !d.dev) { const b = h('button', { class: 'dock-btn dev', 'data-id': 'dev', onclick: () => UI.toggleWin('dev') }, ico('i_dev', 32), h('span', { text: '開發者' })); d.dev = b; document.querySelector('.dock-inner').append(b); }
    if (!this.on && d.dev) { d.dev.remove(); delete d.dev; }
  },
  // ---------- history ----------
  persist() {
    // keep the saved history small enough that it never crowds out the real save (localStorage is ~5 MB)
    let size = 0, n = 0;
    for (let i = this.hist.length - 1; i >= 0; i--) { size += this.hist[i].json.length; if (size > 1500000 && n > 0) break; n++; }
    for (; n >= 0; n--) { try { localStorage.setItem(DEV_HIST, JSON.stringify(this.hist.slice(this.hist.length - n))); return; } catch (e) { } }
  },
  push(label, json, auto) {
    this.hist.push({ label, ts: Date.now(), json, auto: !!auto }); if (this.hist.length > DEV_MAX) this.hist.splice(0, this.hist.length - DEV_MAX);
    this.persist();
  },
  taint() { const f = Game.S.flags || (Game.S.flags = {}); if (!f.dev) { f.dev = true; f.devAt = Date.now(); if (typeof Social !== 'undefined' && Game.S.social) Game.S.social.pubAt = 0; } },   // the leaderboard row is removed on the next social tick
  snap(label) { this.push(label, JSON.stringify(Game.S)); this.redoStack = []; },
  onSave() {
    if (!this.on || this.busy) return;
    const cur = JSON.stringify(Game.S), now = Date.now();
    if (this.prev && this.prev !== cur && now - this.lastAuto > 60000) { this.lastAuto = now; this.push('遊戲操作（自動還原點）', this.prev, true); this.redoStack = []; UI.refresh('dev'); }
    this.prev = cur;
  },
  load(json) { this.busy = true; const st = JSON.parse(json); st.flags = Object.assign({}, st.flags, { dev: true, devAt: (st.flags && st.flags.devAt) || Date.now() }); if (Game.S.owner) st.owner = Game.S.owner; Game.replaceState(st); this.busy = false; this.prev = JSON.stringify(Game.S); },
  undo() {
    const hh = this.hist.pop(); if (!hh) return UI.toast('沒有可以復原的紀錄', 'i_dev');
    this.redoStack.push({ label: hh.label, ts: Date.now(), json: JSON.stringify(Game.S) }); this.load(hh.json); this.persist();
    UI.toast(`已復原：${hh.label}`, 'i_reset', 2.6); UI.refresh('dev');
  },
  redo() {
    const r = this.redoStack.pop(); if (!r) return UI.toast('沒有可以重做的動作', 'i_dev');
    this.push(r.label, JSON.stringify(Game.S)); this.load(r.json); UI.toast(`已重做：${r.label}`, 'i_reset', 2.6); UI.refresh('dev');
  },
  restore(i) {
    const hh = this.hist[i]; if (!hh) return;
    this.redoStack = []; const cur = JSON.stringify(Game.S); this.hist = this.hist.slice(0, i); this.push('還原前的進度', cur); this.load(hh.json);
    UI.toast(`已還原到「${hh.label}」之前`, 'i_reset', 3); UI.refresh('dev');
  },
  act(label, fn) {
    this.snap(label); this.busy = true;
    try { fn(); this.taint(); } catch (e) { console.error(e); UI.toast('動作失敗：' + e.message, 'i_dev'); }
    Game.save(); saveSoon(); this.busy = false; this.prev = JSON.stringify(Game.S);
    UI.refreshAll(); UI.badges(); UI.hud(true); UI.refresh('dev');
  },
  // ---------- helpers ----------
  addCoins(n) { Game.S.coins = Math.max(0, Game.S.coins + n); },
  setLevel(lv) { const S = Game.S; lv = Math.max(1, Math.min(99, Math.round(lv) || 1)); S.lvl = lv; S.xp = 0; },
  completeDaily() {
    const L = Learn.L, day = Life.today(); L.reviewed = 20; L.dailyScore = '10/10';
    if (!L.dailyDone) { L.dailyDone = true; L.streak = L.lastDone === Learn.yesterday() ? (L.streak || 0) + 1 : (L.lastDone === day ? L.streak : 1); L.lastDone = day; L.best = Math.max(L.best || 0, L.streak); Life.track('vocab', 1); }
  },
  learnRandom(n) { const today = Learn.dayNum(); const pool = shuffle(VOCAB.filter(v => !Learn.P[v.w] || Learn.P[v.w][0] < 2)).slice(0, n); for (const v of pool) { const b = 2 + Math.floor(Math.random() * 4); Learn.P[v.w] = [b, today + SRS_INT[b], 1, b, 0]; } },
  resetPart(part) {
    const S = Game.S, base = Game.newState();
    if (part === 'all') { const owner = S.owner; Game.replaceState(Object.assign(base, owner ? { owner } : {}, { flags: { dev: true, devAt: (S.flags || {}).devAt || Date.now(), resetAt: Date.now() }, sync: S.sync })); return; }
    S.flags = Object.assign({}, S.flags, { resetAt: Date.now() });
    if (part === 'vocab') { S.vocab = {}; S.learn = Learn.newState(); }
    if (part === 'room') { for (const k of ['items', 'inv', 'gifts', 'wp', 'fl', 'view', 'ownWP', 'ownFL', 'ownViews', 'themes', 'nextUid']) S[k] = base[k]; }
    if (part === 'pets') { S.zoo = null; S.pets = ['cat:ginger']; S.pet = 'cat:ginger'; S.petName = '麻糬'; S.life.pet = Life.newState().pet; Pets.migrate(S); for (const n of [...S.life.needs]) if (n.pet != null) Life.drop(n); }
    if (part === 'tasks') { S.life.daily = null; S.life.ach = {}; S.life.needs = []; for (const it of S.items) { delete it.wilt; delete it.dust; delete it.broken; } }
    if (part === 'money') { S.coins = base.coins; S.lvl = 1; S.xp = 0; }
    Game.replaceState(S);
  },
  // list this developer save on the leaderboard (off by default); takes effect on the next leaderboard read
  setBoard(on) {
    const f = Game.S.flags || (Game.S.flags = {}); f.devBoard = !!on; Game.save(); saveSoon();
    if (typeof Social !== 'undefined') {
      const Z = Game.S.social; if (Z) { Z.pubAt = 0; if (on) Z.boardGone = false; }
      try { localStorage.removeItem('pocketnook.board.v2'); } catch (e) { } Social.board = null;
      if (Social.ready()) Social.publish(true).then(() => UI.refresh('friends')).catch(e => UI.toast('排行榜更新失敗：' + cloudErr(e), 'i_dev', 3.5));
    }
    const live = typeof Social !== 'undefined' && Social.ready();
    UI.toast(on ? (live ? '已列入排行榜：下次讀取排行榜時就會出現（會標上「開發者」）' : '已設定列入排行榜，登入雲端帳號後生效') : '已從排行榜移除，之後不會再列入', 'i_dev', 4);
    UI.refresh('dev'); UI.refresh('friends');
  },
  exportSave() {
    if (window.NOOK_ENV === 'artifact') { this.showJson = !this.showJson; UI.refresh('dev'); return; }
    const blob = new Blob([JSON.stringify(Game.S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pocket-nook-save-${dayKey(new Date())}.json`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  importSave(file) {
    if (!file) return; const r = new FileReader();
    r.onload = () => { try { const S = JSON.parse(r.result); if (!S || S.v !== 1) throw new Error('不是小窩時光的存檔'); if (Game.S.owner) S.owner = Game.S.owner; this.act('匯入存檔', () => Game.replaceState(S)); UI.toast('已匯入存檔', 'i_dev'); } catch (e) { UI.toast('匯入失敗：' + e.message, 'i_dev', 3.5); } };
    r.readAsText(file);
  },
};
/* ---------------- window ---------------- */
Object.assign(UI.WIN, { dev: { t: '開發者模式', i: 'i_dev', w: 520, at: ['c', 0] } });
Object.assign(UI, {
  w_dev() {
    const S = Game.S, D = Dev, out = [];
    const B = (label, fn, cls = '') => h('button', { class: 'chip sm ' + cls, onclick: fn }, label);
    const A = (label, fn, cls) => B(label, () => D.act(label, fn), cls);
    const danger = (label, msg, fn) => B(label, () => { if (confirm(msg + '\n\n（可以在開發者模式按「復原」救回來）')) D.act(label, fn); }, 'danger');
    const row = (title, ...btns) => h('div', { class: 'devrow' }, h('span', { class: 'devl', text: title }), h('div', { class: 'devbtns' }, ...btns));
    const num = (id, val, ph) => h('div', { class: 'inset devin' }, h('input', { id, type: 'number', value: val, placeholder: ph || '' }));
    const last = D.hist[D.hist.length - 1], nxt = D.redoStack[D.redoStack.length - 1];
    out.push(h('div', { class: 'devbar' },
      h('button', { class: 'chip primary', disabled: !last, onclick: () => D.undo(), title: last ? '復原：' + last.label : '' }, ico('i_reset', 18), '復原'),
      h('button', { class: 'chip', disabled: !nxt, onclick: () => D.redo(), title: nxt ? '重做：' + nxt.label : '' }, '重做'),
      h('span', { class: 'hint grow', text: last ? `上一步：${last.label}` : '還沒有紀錄' })));
    const onB = !!(S.flags && S.flags.devBoard);
    out.push(h('div', { class: 'devbar devboard' }, ico('i_star', 18), h('div', { class: 'grow' }, h('b', { text: '列入排行榜' }), h('div', { class: 'hint', text: onB ? '開：這份存檔的成績會上傳到排行榜，名字旁標上「開發者」。' : '關（預設）：用過開發者模式的存檔不會出現在排行榜上。' })),
      h('button', { class: 'switch' + (onB ? ' on' : ''), role: 'switch', 'aria-checked': onB ? 'true' : 'false', 'aria-label': '列入排行榜', onclick: () => D.setBoard(!onB) }, h('i'))));
    const tabs = [['res', '資源'], ['learn', '學習'], ['task', '任務需求'], ['pet', '寵物'], ['env', '時間環境'], ['save', '存檔重置'], ['hist', `紀錄（${D.hist.length}）`]];
    out.push(h('div', { class: 'tabs wrap' }, ...tabs.map(([k, l]) => h('button', { class: 'tab' + (D.tab === k ? ' on' : ''), onclick: () => { D.tab = k; this.refresh('dev'); } }, l))));
    const body = [];
    if (D.tab === 'res') {
      body.push(row(`金幣（${S.coins}）`, A('+100', () => D.addCoins(100)), A('+1,000', () => D.addCoins(1000)), A('+10,000', () => D.addCoins(10000)), A('歸零', () => { S.coins = 0; })));
      body.push(row('設定金幣', num('dev-coins', S.coins), B('套用', () => { const v = +document.getElementById('dev-coins').value; D.act(`金幣設為 ${v}`, () => { S.coins = Math.max(0, Math.round(v) || 0); }); })));
      body.push(row(`等級（Lv ${S.lvl}，${S.xp}/${Game.need(S.lvl)}）`, A('經驗 +100', () => Game.reward(0, 100, 'raw')), A('升 1 級', () => Game.reward(0, Game.need(S.lvl) - S.xp, 'raw')), A('Lv 10', () => D.setLevel(10)), A('Lv 20', () => D.setLevel(20))));
      body.push(row('設定等級', num('dev-lv', S.lvl), B('套用', () => { const v = +document.getElementById('dev-lv').value; D.act(`等級設為 ${v}`, () => D.setLevel(v)); })));
      body.push(row('道具', A('每種 +5', () => { for (const k in SUPPLIES) Life.give(k, 5); }), A('每種 +20', () => { for (const k in SUPPLIES) Life.give(k, 20); }), A('清空', () => { Life.L.bag = {}; })));
      body.push(row('家具與外觀', A('每種家具 +1', () => { for (const id in ITEMS) S.inv[id] = (S.inv[id] || 0) + 1; }), A('解鎖全部主題、壁紙、地板、窗景', () => { S.themes = Object.keys(THEMES); S.ownWP = Object.keys(WALLPAPERS); S.ownFL = Object.keys(FLOORS); S.ownViews = Object.keys(VIEWS); }), A('解鎖全部造型', () => { S.closet = S.closet || {}; for (const c in AVA_PARTS) for (const id in AVA_PARTS[c]) if (!partFree(c, id)) S.closet[closetKey(c, id)] = 1; }), A('清空已買造型', () => { S.closet = {}; S.closetV = 2; for (const c in AVA_PARTS) if (!partOwned(S.closet, c, S.avatar[c])) S.avatar[c] = defaultAvatar()[c]; })));
      body.push(row('寵物用品', A('全部工具與配件', () => { for (const k in PET_TOOLS) Pets.Z.tools[k] = 1; for (const k in PET_ACCS) Pets.Z.accs[k] = 1; })));
      body.push(row('升級禮物', A('掉一個禮物盒', () => Game.levelUp())));
    } else if (D.tab === 'learn') {
      const L = Learn.L;
      body.push(row(`今日單字（${L.dailyDone ? '已完成' : `複習 ${Math.min(20, L.reviewed)}/20`}）`, A('直接完成', () => D.completeDaily()), A('進度歸零', () => { L.dailyDone = false; L.reviewed = 0; L.dailyScore = ''; Life.L.daily && (Life.L.daily.tasks[0].prog = 0); }), A('重抽 20 個字', () => { L.dailyDay = ''; Learn.ensureDaily(); })));
      body.push(row(`連續天數（${L.streak || 0}，最佳 ${L.best || 0}）`, A('+1 天', () => { L.streak = (L.streak || 0) + 1; L.best = Math.max(L.best || 0, L.streak); L.lastDone = Life.today(); }), A('+7 天', () => { L.streak = (L.streak || 0) + 7; L.best = Math.max(L.best || 0, L.streak); L.lastDone = Life.today(); }), A('歸零', () => { L.streak = 0; })));
      body.push(row(`單字進度（看過 ${Learn.countSeen()}、學會 ${Learn.countLearned()}、精熟 ${Learn.countMastered()}）`, A('隨機學會 50 個', () => D.learnRandom(50)), A('隨機學會 500 個', () => D.learnRandom(500)), A('全部到期（今天要複習）', () => { const d = Learn.dayNum(); for (const k in Learn.P) Learn.P[k][1] = d; })));
      body.push(row('自由練習', A('今日練習金幣上限重置', () => { L.pCoins = 0; })));
      body.push(row('清除', danger('清除全部單字進度', '會刪掉每個單字的學習紀錄和連續天數。', () => D.resetPart('vocab'))));
    } else if (D.tab === 'task') {
      const LL = Life.L; Life.ensureDaily();
      body.push(row('每日任務', A('全部完成（待領取）', () => { for (const t of LL.daily.tasks) t.prog = t.need; }), A('重置領取狀態', () => { for (const t of LL.daily.tasks) t.claimed = false; LL.daily.bonus = false; }), A('重抽一批', () => { LL.daily = null; Life.ensureDaily(); })));
      body.push(row('成就', A('領取紀錄歸零', () => { LL.ach = {}; Life.checkAch(); })));
      const types = Object.keys(NEED_DEFS);
      const sel = h('select', { id: 'dev-need', onchange: e => { D.needType = e.target.value; } }, ...types.map(t => h('option', { value: t, selected: t === D.needType }, `${t}｜${NEED_DEFS[t].t({ pet: (Pets.sel() || {}).id, target: null, k: 'cushion' })}`)));
      body.push(row(`需求（目前 ${LL.needs.length} 個）`, h('label', { class: 'field devsel' }, sel), B('產生', () => { const t = document.getElementById('dev-need').value; D.needType = t; D.act(`產生需求 ${t}`, () => { const ok = Life.addNeed(t, false, NEED_DEFS[t].who === 'pet' ? (Pets.sel() || {}).id : undefined); if (!ok) UI.toast('現在的條件產生不了這個需求（例如沒有可以枯萎的植物、白天不能要求開燈）', 'i_dev', 4); }); })));
      body.push(row('', A('馬上冒出隨機需求', () => { LL.nextNeedAt = 0; Life.maybeNeeds(); }), A('全部完成（拿獎勵）', () => { for (const n of [...LL.needs]) Life.complete(n, true); }), A('全部清除', () => { for (const n of [...LL.needs]) { Life.clearTargetFlags(n); Life.drop(n); } })));
    } else if (D.tab === 'pet') {
      const p = Pets.sel();
      body.push(row('目前寵物', ...Pets.list().map(q => h('button', { class: 'chip sm' + (q.id === p.id ? ' on' : ''), onclick: () => { Pets.Z.sel = q.id; this.refresh('dev'); } }, q.name + (q.home ? '' : '（旅館）')))));
      if (p) {
        body.push(row(`${p.name} 狀態（飽足 ${Math.round(p.hunger)}、心情 ${Math.round(p.mood)}、清潔 ${Math.round(p.clean)}、精力 ${Math.round(p.energy)}）`, A('全部回滿', () => { p.hunger = p.mood = p.clean = p.energy = 100; p.sick = false; p.low = 0; Pets.checkNeeds(p); }), A('全部降到 10', () => { p.hunger = p.mood = p.clean = p.energy = 10; }), A(p.sick ? '治好' : '讓牠生病', () => { p.sick = !p.sick; p.low = 0; })));
        body.push(row(`成長（Lv ${p.lv}、${Pets.stageName(p)}）`, A('成長 +1 級', () => Pets.addXp(p, Pets.xpNeed(p.lv) - p.xp)), A('直接成年（Lv 10）', () => { p.lv = Math.max(p.lv, 10); p.xp = 0; }), A('Lv 20', () => { p.lv = PET_LV_MAX; p.xp = 0; }), A('變回幼年', () => { p.lv = 1; p.xp = 0; })));
        body.push(row(`羈絆 Lv ${p.blv}`, A('羈絆 +1 級', () => Pets.addBond(p, Pets.bondNeed(p.blv) - p.bond)), A('學會全部把戲', () => { for (const t of TRICKS) p.tricks[t.id] = t.need; p.lv = Math.max(p.lv, 14); }), A('表演次數重置', () => { p.day.show = {}; p.gift = ''; p.brushAt = 0; })));
        body.push(row('隱藏習慣（只有開發者看得到）：' + PetAI.habitsOf(p).map(id => `${id} ${HABITS[id].n}`).join('、'), A('重抽習慣', () => { p.habits = null; PetAI.habitsOf(p); })));
        { const rel = PetAI.relsOf(p), low = PetAI.low(p);
          body.push(row(`本週關係（${weekKey()}，${low ? '有狀態低於 40，負面關係會出現' : '狀態都在 40 以上，負面關係不會出現'}）：` + (rel.length ? rel.map(x => { const q = Pets.get(x.t); return `${x.r} ${RELS[x.r].good ? '＋' : '－'}${RELS[x.r].n} → ${q ? q.name : '（不在）'}`; }).join('、') : '房間裡沒有其他寵物'), A('重抽本週關係', () => { PetAI.rollRels(p); }))); }
        body.push(row('個性與喜好', ...Object.keys(TRAITS).map(t => A(TRAITS[t].n, () => { p.trait = t; }, p.trait === t ? 'on' : '')), A('揭曉喜好', () => { p.known.food = p.known.toy = true; })));
      }
      body.push(row('寵物', A('免費領養一隻隨機寵物', () => { if (Pets.list().length >= PET_MAX) return UI.toast('已經 10 隻了', 'i_paw'); const ks = Object.keys(PETS); const q = Pets.make(Pets.Z, ks[Math.floor(Math.random() * ks.length)]); q.home = !Pets.roomFull(); Pets.Z.pets.push(q); Pets.syncActors(); }), A('全部滿狀態', () => { for (const q of Pets.list()) { q.hunger = q.mood = q.clean = q.energy = 100; q.sick = false; Pets.checkNeeds(q); } })));
    } else if (D.tab === 'env') {
      const hr = window.NOOK_DEV_HOUR, setH = (v, l) => A(l, () => { window.NOOK_DEV_HOUR = v; D.saveEnv(); Room.computeEnv(S.settings); }, hr === v ? 'on' : '');
      body.push(row(`時間（${hr == null ? '跟著真實時間' : hr + ' 點'}）`, setH(null, '真實時間'), setH(8, '早上'), setH(12, '中午'), setH(18.2, '黃昏'), setH(21, '晚上'), setH(2, '深夜')));
      body.push(row('天氣', A(S.settings.rain ? '停雨' : '下雨', () => { S.settings.rain = !S.settings.rain; Room.computeEnv(S.settings); })));
      const ds = window.NOOK_DAY_SHIFT || 0;
      body.push(row(`日期（${ds ? `往後 ${ds} 天：${Life.today()}` : '今天'}）`, A('跳到明天', () => { window.NOOK_DAY_SHIFT = ds + 1; D.saveEnv(); Life.ensureDaily(); Learn.ensureDaily(); }), A('回到今天', () => { window.NOOK_DAY_SHIFT = 0; D.saveEnv(); Life.ensureDaily(); Learn.ensureDaily(); })));
      const t = S.timer;
      body.push(row(`番茄鐘（專注 ${t.focus} 分）`, A('這一輪馬上結束', () => { if (!t.running) Game.start(); t.endsAt = Date.now() + 1500; }), A('專注改成 1 分鐘', () => { t.focus = 1; if (!t.running) t.remain = Game.modeLen(t.mode); }), A('恢復 25 分鐘', () => { t.focus = 25; if (!t.running) t.remain = Game.modeLen(t.mode); })));
      body.push(h('p', { class: 'hint', text: '「跳到明天」會讓每日單字、每日任務、連續天數都當作已經過了一天，方便測試；關閉開發者模式會回到真實日期。' }));
    } else if (D.tab === 'save') {
      const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: e => D.importSave(e.target.files[0]) });
      body.push(row('備份', B(window.NOOK_ENV === 'artifact' ? (D.showJson ? '收起存檔內容' : '顯示存檔內容（JSON）') : '匯出存檔（JSON）', () => D.exportSave()), B('匯入存檔', () => file.click()), file, A('建立還原點', () => { })));
      if (D.showJson && window.NOOK_ENV === 'artifact') body.push(h('label', { class: 'field' }, h('span', { text: '存檔內容（全選後複製，存成 .json 檔，之後可以用「匯入存檔」讀回來）' }), h('textarea', { class: 'devjson', readonly: true, rows: 6, onfocus: e => e.target.select() }, JSON.stringify(Game.S))));
      body.push(row('重置', danger('只重置單字', '清除所有單字進度與連續天數。', () => D.resetPart('vocab')), danger('只重置房間', '家具、收納箱、壁紙地板、主題都回到一開始。', () => D.resetPart('room')), danger('只重置寵物', '所有寵物會換回一開始的一隻小橘貓。', () => D.resetPart('pets'))));
      body.push(row('', danger('只重置任務與成就', '每日任務重抽、成就領取紀錄與需求清空。', () => D.resetPart('tasks')), danger('只重置金幣與等級', '金幣回到 150、等級回到 Lv 1。', () => D.resetPart('money'))));
      body.push(row('', danger('重置整個帳號', '所有進度都會回到第一次打開的樣子（登入中會一起覆蓋雲端存檔）。', () => D.resetPart('all'))));
      body.push(h('p', { class: 'hint', text: Cloud.user ? `登入中（${Cloud.user.email || Cloud.user.name}），重置或修改都會同步到雲端。` : '重置前會自動建立還原點，按上面的「復原」就能救回來。' }));
    } else {
      if (!D.hist.length) body.push(h('p', { class: 'hint', text: '還沒有紀錄。開發者模式中的每個動作都會先存一份，正常遊玩時每分鐘最多也會留一個自動還原點。' }));
      const list = h('div', { class: 'devhist' }, ...D.hist.map((x, i) => ({ x, i })).reverse().map(({ x, i }) => h('div', { class: 'devh' + (x.auto ? ' auto' : '') }, h('span', { class: 'num hint', text: new Date(x.ts).toLocaleTimeString('zh-TW', { hour12: false }) }), h('span', { class: 'grow', text: x.label }), h('button', { class: 'chip sm', onclick: () => { if (confirm(`還原到「${x.label}」之前的進度？`)) D.restore(i); } }, '還原到這之前'))));
      body.push(list, h('div', { class: 'row' }, B('清除紀錄', () => { D.hist = []; D.redoStack = []; D.persist(); this.refresh('dev'); })));
    }
    out.push(h('div', { class: 'scroll devbody' }, ...body));
    out.push(h('div', { class: 'row between' }, h('span', { class: 'hint', text: '在「任務」→「成就」輸入兌換碼可以再打開。' }), h('button', { class: 'chip sm', onclick: () => { if (confirm('關閉開發者模式？')) Dev.enable(false); } }, '關閉開發者模式')));
    return out;
  },
});
