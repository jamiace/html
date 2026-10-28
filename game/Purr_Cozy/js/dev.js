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
    if (c === 'jami') { this.enable(true); UI.toast(I18n.s("u_dae9efcc4bdf"), 'i_dev', 3); UI.openWin('dev'); }
    else UI.toast(I18n.s("u_fef034ca76d9"), 'i_task');
  },
  enable(v) {
    this.on = v; try { localStorage.setItem(DEV_KEY, v ? '1' : '0'); } catch (e) { }
    if (!v) { window.NOOK_DAY_SHIFT = 0; window.NOOK_DEV_HOUR = null; this.saveEnv(); Room.computeEnv(Game.S.settings); UI.closeWin('dev'); Life.ensureDaily(); Learn.ensureDaily(); UI.refreshAll(); UI.badges(); }
    else this.prev = JSON.stringify(Game.S);
    this.dock();
  },
  dock() {
    const d = UI.dockBtns; if (!d) return;
    if (this.on && !d.dev) { const b = h('button', { class: 'dock-btn dev', 'data-id': 'dev', onclick: () => UI.toggleWin('dev') }, ico('i_dev', 32), h('span', { text: I18n.s("u_7f4b958db72f") })); d.dev = b; document.querySelector('.dock-inner').append(b); }
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
  // marks the save as a developer save; it then leaves the leaderboard at the next update unless the switch below is on
  taint() { const f = Game.S.flags || (Game.S.flags = {}); if (!f.dev) { f.dev = true; f.devAt = Date.now(); if (Game.S.social) Game.S.social.pubAt = 0; } },
  snap(label) { this.push(label, JSON.stringify(Game.S)); this.redoStack = []; },
  onSave() {
    if (!this.on || this.busy) return;
    const cur = JSON.stringify(Game.S), now = Date.now();
    if (this.prev && this.prev !== cur && now - this.lastAuto > 60000) { this.lastAuto = now; this.push(I18n.s("u_3fb7a9560202"), this.prev, true); this.redoStack = []; UI.refresh('dev'); }
    this.prev = cur;
  },
  load(json) { this.busy = true; const st = JSON.parse(json); st.flags = Object.assign({}, st.flags, { dev: true, devAt: (st.flags && st.flags.devAt) || Date.now() }); if (Game.S.owner) st.owner = Game.S.owner; Game.replaceState(st); this.busy = false; this.prev = JSON.stringify(Game.S); },
  undo() {
    const hh = this.hist.pop(); if (!hh) return UI.toast(I18n.s("u_ffdea988b395"), 'i_dev');
    this.redoStack.push({ label: hh.label, ts: Date.now(), json: JSON.stringify(Game.S) }); this.load(hh.json); this.persist();
    UI.toast(I18n.s("u_4c6e266d7069", [hh.label]), 'i_reset', 2.6); UI.refresh('dev');
  },
  redo() {
    const r = this.redoStack.pop(); if (!r) return UI.toast(I18n.s("u_3fdca4ade10e"), 'i_dev');
    this.push(r.label, JSON.stringify(Game.S)); this.load(r.json); UI.toast(I18n.s("u_824496fd7ba6", [r.label]), 'i_reset', 2.6); UI.refresh('dev');
  },
  restore(i) {
    const hh = this.hist[i]; if (!hh) return;
    this.redoStack = []; const cur = JSON.stringify(Game.S); this.hist = this.hist.slice(0, i); this.push(I18n.s("u_5259c1883382"), cur); this.load(hh.json);
    UI.toast(I18n.s("u_b9fb887cdb4a", [hh.label]), 'i_reset', 3); UI.refresh('dev');
  },
  act(label, fn) {
    this.snap(label); this.busy = true;
    try { fn(); this.taint(); } catch (e) { console.error(e); UI.toast(I18n.s("u_ed99cd9ea2c2") + e.message, 'i_dev'); }
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
    if (part === 'pets') { S.zoo = null; S.pets = ['cat:ginger']; S.pet = 'cat:ginger'; S.petName = I18n.s("u_cb9eb5933024"); S.life.pet = Life.newState().pet; Pets.migrate(S); for (const n of [...S.life.needs]) if (n.pet != null) Life.drop(n); }
    if (part === 'tasks') { S.life.daily = null; S.life.ach = {}; S.life.needs = []; for (const it of S.items) { delete it.wilt; delete it.dust; delete it.broken; } }
    if (part === 'money') { S.coins = base.coins; S.lvl = 1; S.xp = 0; }
    Game.replaceState(S);
  },
  exportSave() {
    if (window.NOOK_ENV === 'artifact') { this.showJson = !this.showJson; UI.refresh('dev'); return; }
    const blob = new Blob([JSON.stringify(Game.S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pocket-nook-save-${dayKey(new Date())}.json`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  importSave(file) {
    if (!file) return; const r = new FileReader();
    r.onload = () => { try { const S = JSON.parse(r.result); if (!S || S.v !== 1) throw new Error(I18n.s("u_8decbe908c69")); if (Game.S.owner) S.owner = Game.S.owner; this.act(I18n.s("u_c28fc4a5abc0"), () => Game.replaceState(S)); UI.toast(I18n.s("u_cd93e169ccd9"), 'i_dev'); } catch (e) { UI.toast(I18n.s("u_9133b2b9eb5a") + e.message, 'i_dev', 3.5); } };
    r.readAsText(file);
  },
};
/* ---------------- window ---------------- */
Object.assign(UI.WIN, { dev: { t: I18n.s("u_b417da1c78eb"), i: 'i_dev', w: 520, at: ['c', 0] } });
Object.assign(UI, {
  w_dev() {
    const S = Game.S, D = Dev, out = [];
    const B = (label, fn, cls = '') => h('button', { class: 'chip sm ' + cls, onclick: fn }, label);
    const A = (label, fn, cls) => B(label, () => D.act(label, fn), cls);
    const danger = (label, msg, fn) => B(label, () => { if (confirm(msg + I18n.s("u_f643a9cc9999"))) D.act(label, fn); }, 'danger');
    const row = (title, ...btns) => h('div', { class: 'devrow' }, h('span', { class: 'devl', text: title }), h('div', { class: 'devbtns' }, ...btns));
    const num = (id, val, ph) => h('div', { class: 'inset devin' }, h('input', { id, type: 'number', value: val, placeholder: ph || '' }));
    const last = D.hist[D.hist.length - 1], nxt = D.redoStack[D.redoStack.length - 1];
    out.push(h('div', { class: 'devbar' },
      h('button', { class: 'chip primary', disabled: !last, onclick: () => D.undo(), title: last ? I18n.s("u_d49ee46db717") + last.label : '' }, ico('i_reset', 18), I18n.s("u_2abdcba8d536")),
      h('button', { class: 'chip', disabled: !nxt, onclick: () => D.redo(), title: nxt ? I18n.s("u_66a78da1f03d") + nxt.label : '' }, I18n.s("u_03717b6f1070")),
      h('span', { class: 'hint grow', text: last ? I18n.s("u_c8822a46f7cc", [last.label]) : I18n.s("u_2e13a415d696") })));
    const tabs = [['res', I18n.s("u_7880dd3efa82")], ['learn', I18n.s("u_dcb9874582c0")], ['task', I18n.s("u_3b219aafd2b5")], ['pet', I18n.s("u_5b825353b534")], ['env', I18n.s("u_c1608d718d29")], ['save', I18n.s("u_8bb7edf171f8")], ['hist', I18n.s("u_7c404bd3e0b6", [D.hist.length])]];
    out.push(h('div', { class: 'tabs wrap' }, ...tabs.map(([k, l]) => h('button', { class: 'tab' + (D.tab === k ? ' on' : ''), onclick: () => { D.tab = k; this.refresh('dev'); } }, l))));
    const body = [];
    if (D.tab === 'res') {
      body.push(row(I18n.s("u_d038d244fb0a", [S.coins]), A('+100', () => D.addCoins(100)), A('+1,000', () => D.addCoins(1000)), A('+10,000', () => D.addCoins(10000)), A(I18n.s("u_fd66f9dd1014"), () => { S.coins = 0; })));
      body.push(row(I18n.s("u_4eabe6de2083"), num('dev-coins', S.coins), B(I18n.s("u_77af807d6a3e"), () => { const v = +document.getElementById('dev-coins').value; D.act(I18n.s("u_34e55ff4b820", [v]), () => { S.coins = Math.max(0, Math.round(v) || 0); }); })));
      body.push(row(I18n.s("u_1d803b0ff312", [S.lvl, S.xp, Game.need(S.lvl)]), A(I18n.s("u_4c59c8363b53"), () => Game.reward(0, 100, 'raw')), A(I18n.s("u_fe5874ea481e"), () => Game.reward(0, Game.need(S.lvl) - S.xp, 'raw')), A('Lv 10', () => D.setLevel(10)), A('Lv 20', () => D.setLevel(20))));
      body.push(row(I18n.s("u_c7fef2acbc7a"), num('dev-lv', S.lvl), B(I18n.s("u_77af807d6a3e"), () => { const v = +document.getElementById('dev-lv').value; D.act(I18n.s("u_1422f07bea41", [v]), () => D.setLevel(v)); })));
      body.push(row(I18n.s("u_7483f8ec95d8"), A(I18n.s("u_c5cc9a0528ba"), () => { for (const k in SUPPLIES) Life.give(k, 5); }), A(I18n.s("u_e0c799b8add8"), () => { for (const k in SUPPLIES) Life.give(k, 20); }), A(I18n.s("u_1ef3de06b32e"), () => { Life.L.bag = {}; })));
      body.push(row(I18n.s("u_5e02675b3bac"), A(I18n.s("u_f1d700fac902"), () => { for (const id in ITEMS) S.inv[id] = (S.inv[id] || 0) + 1; }), A(I18n.s("u_18bbd926743e"), () => { S.themes = Object.keys(THEMES); S.ownWP = Object.keys(WALLPAPERS); S.ownFL = Object.keys(FLOORS); S.ownViews = Object.keys(VIEWS); }), A(I18n.s("u_578c606b10e3"), () => { S.closet = S.closet || {}; for (const c in AVA_PARTS) for (const id in AVA_PARTS[c]) if (!partFree(c, id)) S.closet[closetKey(c, id)] = 1; }), A(I18n.s("u_c9f165c7dc30"), () => { S.closet = {}; S.closetV = 2; for (const c in AVA_PARTS) if (!partOwned(S.closet, c, S.avatar[c])) S.avatar[c] = defaultAvatar()[c]; })));
      body.push(row(I18n.s("u_e24e1c6cb31a"), A(I18n.s("u_9e6601c2269d"), () => { for (const k in PET_TOOLS) Pets.Z.tools[k] = 1; for (const k in PET_ACCS) Pets.Z.accs[k] = 1; })));
      body.push(row(I18n.s("u_8b62f26da525"), A(I18n.s("u_db60f0f23f74"), () => Game.levelUp())));
    } else if (D.tab === 'learn') {
      const L = Learn.L;
      body.push(row(I18n.s("u_5f0212f0b3ef", [L.dailyDone ? I18n.s("u_f28461bb49c8") : I18n.s("u_093339fa02fb", [Math.min(20, L.reviewed)])]), A(I18n.s("u_b7247f87c702"), () => D.completeDaily()), A(I18n.s("u_354aed2a5ad9"), () => { L.dailyDone = false; L.reviewed = 0; L.dailyScore = ''; Life.L.daily && (Life.L.daily.tasks[0].prog = 0); }), A(I18n.s("u_75a45223b681"), () => { L.dailyDay = ''; Learn.ensureDaily(); })));
      body.push(row(I18n.s("u_a510d856d084", [L.streak || 0, L.best || 0]), A(I18n.s("u_0c6176a81571"), () => { L.streak = (L.streak || 0) + 1; L.best = Math.max(L.best || 0, L.streak); L.lastDone = Life.today(); }), A(I18n.s("u_102a7240c40a"), () => { L.streak = (L.streak || 0) + 7; L.best = Math.max(L.best || 0, L.streak); L.lastDone = Life.today(); }), A(I18n.s("u_fd66f9dd1014"), () => { L.streak = 0; })));
      body.push(row(I18n.s("u_27517d6b0704", [Learn.countSeen(), Learn.countLearned(), Learn.countMastered()]), A(I18n.s("u_781b1cbb6cbd"), () => D.learnRandom(50)), A(I18n.s("u_6580972c4f08"), () => D.learnRandom(500)), A(I18n.s("u_86d4f79a669a"), () => { const d = Learn.dayNum(); for (const k in Learn.P) Learn.P[k][1] = d; })));
      body.push(row(I18n.s("u_747d826c1843"), A(I18n.s("u_e9dfcc0cca36"), () => { L.pCoins = 0; })));
      body.push(row(I18n.s("u_bce2377283c2"), danger(I18n.s("u_1a418090a712"), I18n.s("u_8dffbd453074"), () => D.resetPart('vocab'))));
    } else if (D.tab === 'task') {
      const LL = Life.L; Life.ensureDaily();
      body.push(row(I18n.s("u_de86b365c994"), A(I18n.s("u_6d69a21fb461"), () => { for (const t of LL.daily.tasks) t.prog = t.need; }), A(I18n.s("u_6e31a6e1a052"), () => { for (const t of LL.daily.tasks) t.claimed = false; LL.daily.bonus = false; }), A(I18n.s("u_830d630ae93c"), () => { LL.daily = null; Life.ensureDaily(); })));
      body.push(row(I18n.s("u_52b0e1703d14"), A(I18n.s("u_93c88e7d407d"), () => { LL.ach = {}; Life.checkAch(); })));
      const types = Object.keys(NEED_DEFS);
      const sel = h('select', { id: 'dev-need', onchange: e => { D.needType = e.target.value; } }, ...types.map(t => h('option', { value: t, selected: t === D.needType }, `${t}｜${NEED_DEFS[t].t({ pet: (Pets.sel() || {}).id, target: null, k: 'cushion' })}`)));
      body.push(row(I18n.s("u_630987814f7f", [LL.needs.length]), h('label', { class: 'field devsel' }, sel), B(I18n.s("u_25e23f7f30ba"), () => { const t = document.getElementById('dev-need').value; D.needType = t; D.act(I18n.s("u_ccf61286819f", [t]), () => { const ok = Life.addNeed(t, false, NEED_DEFS[t].who === 'pet' ? (Pets.sel() || {}).id : undefined); if (!ok) UI.toast(I18n.s("u_bb47716d8c91"), 'i_dev', 4); }); })));
      body.push(row('', A(I18n.s("u_807d292f0e87"), () => { LL.nextNeedAt = 0; Life.maybeNeeds(); }), A(I18n.s("u_5a84e92e18fa"), () => { for (const n of [...LL.needs]) Life.complete(n, true); }), A(I18n.s("u_6ef0acce0f3b"), () => { for (const n of [...LL.needs]) { Life.clearTargetFlags(n); Life.drop(n); } })));
    } else if (D.tab === 'pet') {
      const p = Pets.sel();
      body.push(row(I18n.s("u_626c9bc25816"), ...Pets.list().map(q => h('button', { class: 'chip sm' + (q.id === p.id ? ' on' : ''), onclick: () => { Pets.Z.sel = q.id; this.refresh('dev'); } }, q.name + (q.home ? '' : I18n.s("u_e3d6d5aa5dd2"))))));
      if (p) {
        body.push(row(I18n.s("u_45f93aedd97a", [p.name, Math.round(p.hunger), Math.round(p.mood), Math.round(p.clean), Math.round(p.energy)]), A(I18n.s("u_7ccba6aaf104"), () => { p.hunger = p.mood = p.clean = p.energy = 100; p.sick = false; p.low = 0; Pets.checkNeeds(p); }), A(I18n.s("u_6464564183ce"), () => { p.hunger = p.mood = p.clean = p.energy = 10; }), A(p.sick ? I18n.s("u_0b6ce22a2472") : I18n.s("u_3ba1bf7f8ab7"), () => { p.sick = !p.sick; p.low = 0; })));
        body.push(row(I18n.s("u_0a0c922cbc6d", [p.lv, Pets.stageName(p)]), A(I18n.s("u_8c8ee9377aec"), () => Pets.addXp(p, Pets.xpNeed(p.lv) - p.xp)), A(I18n.s("u_dd75a8646af4"), () => { p.lv = Math.max(p.lv, 10); p.xp = 0; }), A('Lv 20', () => { p.lv = PET_LV_MAX; p.xp = 0; }), A(I18n.s("u_a280bcfaf0d6"), () => { p.lv = 1; p.xp = 0; })));
        body.push(row(I18n.s("u_fbc14e01d0d6", [p.blv]), A(I18n.s("u_9dd57dca07cf"), () => Pets.addBond(p, Pets.bondNeed(p.blv) - p.bond)), A(I18n.s("u_3dbd5398dcf3"), () => { for (const t of TRICKS) p.tricks[t.id] = t.need; p.lv = Math.max(p.lv, 15); }), A(I18n.s("u_d50b10336d57"), () => { p.day.show = {}; p.gift = ''; p.brushAt = 0; })));
        body.push(row(I18n.s("u_c8e572343d4b") + PetAI.habitsOf(p).map(id => `${id} ${HABITS[id].n}`).join('、'), A(I18n.s("u_ab813775d56d"), () => { p.habits = null; PetAI.habitsOf(p); })));
        { const rel = PetAI.relsOf(p), low = PetAI.low(p);
          body.push(row(I18n.s("u_18004251b815", [weekKey(), low ? I18n.s("u_041a35a6d2ae") : I18n.s("u_2f4045754512")]) + (rel.length ? rel.map(x => { const q = Pets.get(x.t); return `${x.r} ${RELS[x.r].good ? '＋' : '－'}${RELS[x.r].n} → ${q ? q.name : I18n.s("u_b8f02f377eda")}`; }).join('、') : I18n.s("u_ff8a62c5f27f")), A(I18n.s("u_e49db8713223"), () => { PetAI.rollRels(p); }))); }
        body.push(row(I18n.s("u_b6e6cbb468bb"), ...Object.keys(TRAITS).map(t => A(TRAITS[t].n, () => { p.trait = t; }, p.trait === t ? 'on' : '')), A(I18n.s("u_e307b6c39007"), () => { p.known.food = p.known.toy = true; })));
      }
      body.push(row(I18n.s("u_5b825353b534"), A(I18n.s("u_16970fe30a14"), () => { if (Pets.list().length >= PET_MAX) return UI.toast(I18n.s("u_13188d108860"), 'i_paw'); const ks = Object.keys(PETS); const q = Pets.make(Pets.Z, ks[Math.floor(Math.random() * ks.length)]); q.home = !Pets.roomFull(); Pets.Z.pets.push(q); Pets.syncActors(); }), A(I18n.s("u_f1273584b9cb"), () => { for (const q of Pets.list()) { q.hunger = q.mood = q.clean = q.energy = 100; q.sick = false; Pets.checkNeeds(q); } })));
    } else if (D.tab === 'env') {
      const hr = window.NOOK_DEV_HOUR, setH = (v, l) => A(l, () => { window.NOOK_DEV_HOUR = v; D.saveEnv(); Room.computeEnv(S.settings); }, hr === v ? 'on' : '');
      body.push(row(I18n.s("u_c87036f10ecb", [hr == null ? I18n.s("u_0c1a8ce2f752") : hr + I18n.s("u_799d4080d747")]), setH(null, I18n.s("u_fb9265bf26c0")), setH(8, I18n.s("u_c6fe2eb2c986")), setH(12, I18n.s("u_5422a304a0bf")), setH(18.2, I18n.s("u_c9453a643f97")), setH(21, I18n.s("u_a9b1124b3461")), setH(2, I18n.s("u_30003ad423e4"))));
      body.push(row(I18n.s("u_bb7bfa3a214f"), A(S.settings.rain ? I18n.s("u_fceb5b6e5527") : I18n.s("u_024b2708ed8e"), () => { S.settings.rain = !S.settings.rain; Room.computeEnv(S.settings); })));
      const ds = window.NOOK_DAY_SHIFT || 0;
      body.push(row(I18n.s("u_92adbaf7f08e", [ds ? I18n.s("u_de2adfcca4b1", [ds, Life.today()]) : I18n.s("u_d5f5a7a01073")]), A(I18n.s("u_cc1e4fa80bd0"), () => { window.NOOK_DAY_SHIFT = ds + 1; D.saveEnv(); Life.ensureDaily(); Learn.ensureDaily(); }), A(I18n.s("u_c4aa445b580a"), () => { window.NOOK_DAY_SHIFT = 0; D.saveEnv(); Life.ensureDaily(); Learn.ensureDaily(); })));
      const t = S.timer;
      body.push(row(I18n.s("u_02ca86f2a991", [t.focus]), A(I18n.s("u_8aea8e1968a4"), () => { if (!t.running) Game.start(); t.endsAt = Date.now() + 1500; }), A(I18n.s("u_9b5650167936"), () => { t.focus = 1; if (!t.running) t.remain = Game.modeLen(t.mode); }), A(I18n.s("u_3ba867ae56b4"), () => { t.focus = 25; if (!t.running) t.remain = Game.modeLen(t.mode); })));
      body.push(h('p', { class: 'hint', text: I18n.s("u_71796b8cc1b8") }));
    } else if (D.tab === 'save') {
      const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: e => D.importSave(e.target.files[0]) });
      body.push(row(I18n.s("u_7811b9a40d7c"), B(window.NOOK_ENV === 'artifact' ? (D.showJson ? I18n.s("u_98be2c34646f") : I18n.s("u_78f8baf69ec9")) : I18n.s("u_4a79125db57c"), () => D.exportSave()), B(I18n.s("u_c28fc4a5abc0"), () => file.click()), file, A(I18n.s("u_dbb7c861fab9"), () => { })));
      if (D.showJson && window.NOOK_ENV === 'artifact') body.push(h('label', { class: 'field' }, h('span', { text: I18n.s("u_e5a7e79992f5") }), h('textarea', { class: 'devjson', readonly: true, rows: 6, onfocus: e => e.target.select() }, JSON.stringify(Game.S))));
      // leaderboard switch: off by default; turning it on lists this save at the next leaderboard update
      const lb = !!(S.flags && S.flags.devBoard);
      body.push(row(I18n.s("u_1ee95aa94712"), h('button', { class: 'chip sm' + (lb ? ' on' : ''), 'aria-pressed': lb ? 'true' : 'false', onclick: () => {
        S.flags = Object.assign({}, S.flags, { devBoard: !lb }); if (S.social) { S.social.pubAt = 0; S.social.boardGone = false; }
        Game.save(); saveSoon(); UI.toast(lb ? I18n.s("u_d958dabe5183") : I18n.s("u_84b61c9476f2"), 'i_dev', 3); this.refresh('dev'); } }, lb ? I18n.s("u_d9d65c823465") : I18n.s("u_4b984c6e5214"))));
      body.push(row(I18n.s("u_cb5d682bac3d"), danger(I18n.s("u_d5a77ced7aa9"), I18n.s("u_f4f68d9ded85"), () => D.resetPart('vocab')), danger(I18n.s("u_57c13115ea28"), I18n.s("u_4d718e400e4a"), () => D.resetPart('room')), danger(I18n.s("u_103452c618a8"), I18n.s("u_c316c2f2ad6f"), () => D.resetPart('pets'))));
      body.push(row('', danger(I18n.s("u_64367e115a0f"), I18n.s("u_d008ccb86c9d"), () => D.resetPart('tasks')), danger(I18n.s("u_652c6f4019e7"), I18n.s("u_435050a3db2e"), () => D.resetPart('money'))));
      body.push(row('', danger(I18n.s("u_88e2ccc2fee6"), I18n.s("u_c65be85e36bb"), () => D.resetPart('all'))));
      body.push(h('p', { class: 'hint', text: Cloud.user ? I18n.s("u_8e5b006e2865", [Cloud.user.email || Cloud.user.name]) : I18n.s("u_2c8addbe0297") }));
    } else {
      if (!D.hist.length) body.push(h('p', { class: 'hint', text: I18n.s("u_ae4a31902794") }));
      const list = h('div', { class: 'devhist' }, ...D.hist.map((x, i) => ({ x, i })).reverse().map(({ x, i }) => h('div', { class: 'devh' + (x.auto ? ' auto' : '') }, h('span', { class: 'num hint', text: new Date(x.ts).toLocaleTimeString(I18n.lang, { hour12: false }) }), h('span', { class: 'grow', text: x.label }), h('button', { class: 'chip sm', onclick: () => { if (confirm(I18n.s("u_e6950fb98cd7", [x.label]))) D.restore(i); } }, I18n.s("u_2169bde987b2")))));
      body.push(list, h('div', { class: 'row' }, B(I18n.s("u_0164e4195c0f"), () => { D.hist = []; D.redoStack = []; D.persist(); this.refresh('dev'); })));
    }
    out.push(h('div', { class: 'scroll devbody' }, ...body));
    out.push(h('div', { class: 'row between' }, h('span', { class: 'hint', text: I18n.s("u_e895e205b240") }), h('button', { class: 'chip sm', onclick: () => { if (confirm(I18n.s("u_0331d806cb3d"))) Dev.enable(false); } }, I18n.s("u_f597d6a5cfac"))));
    return out;
  },
});
