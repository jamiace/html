/* ============================================================
   0.92.48 Purr Cozy: developer (cheat) panel, extended for the newer features
   - 學習：英文程度測驗（直接設定年級、重做搬家日、今天再測、假歷史、名片顯示、獎狀）、Level L1–L6 勾選、每日任務「程度小測」
   - 寵物：地上的玩具（一次丟三個、清掉、補貓草）、吸引範圍顯示、叫附近的貓去貓抓柱
   - 環境：用自己的房間預覽拜訪模式
   - 存檔：帳號資訊（UID、測試帳號、後台修改紀錄、初始設定）、從雲端重新讀取
   Every change still goes through Dev.act (snapshot first, can be undone).
   ============================================================ */
(function () {
  if (typeof Dev === 'undefined' || typeof UI === 'undefined' || !UI.w_dev) return;
  const t = (id, a) => I18n.t('dev2.' + id, a);
  Dev.lureView = false;

  // ---------- helpers that change things ----------
  const P = () => (typeof Placement !== 'undefined' ? Placement : null);
  Object.assign(Dev, {
    setGrade(g) {
      const PL = P(); if (!PL) return; const G = PL.S(), day = Life.today(), first = G.theta == null;
      G.theta = g; G.se = .6; G.last = day; if (!G.first) G.first = day; G.n = (G.n || 0) + 8;
      G.hist = (G.hist || []).filter(x => x.d !== day); G.hist.push({ d: day, t: g, se: .6, n: 8, r: 5 });
      PL.anchor(g, first);
    },
    fakeHistory(days) {
      const PL = P(); if (!PL) return; const G = PL.S(); let th = G.theta != null ? G.theta - days * .05 : 4;
      G.hist = []; for (let i = days - 1; i >= 0; i--) { th += .05 + (Math.random() - .5) * .3; G.hist.push({ d: dayKey(gameDate(-i)), t: Math.round(Math.max(1, Math.min(12, th)) * 100) / 100, se: Math.max(.45, 1 - (days - i) * .03), n: 8, r: 4 + Math.floor(Math.random() * 4) }); }
      const last = G.hist[G.hist.length - 1]; G.theta = last.t; G.se = last.se; G.last = last.d; G.first = G.first || G.hist[0].d;
    },
    resetPlacement() { delete Game.S.grade; },
    gradeTask(done) { Life.ensureDaily(); const k = (Life.L.daily.tasks || []).find(x => x.k === 'c_grade'); if (k) { k.prog = done ? k.need : 0; if (!done) k.claimed = false; } },
    throwToys() {
      if (typeof PetPlay === 'undefined' || !PetPlay.throwToy) return;
      Pets.Z.tools.ball = 1; Pets.Z.tools.yarn = 1; Life.L.bag.catnip = Math.max(3, Life.L.bag.catnip || 0);
      const pets = PetPlay.pets(), kinds = ['ball', 'yarn', 'nip'], held = PetPlay.held;
      kinds.forEach((k, i) => { const a = pets[i % Math.max(1, pets.length)], x = a ? a.x + 18 : 60 + i * 60, y = a ? Math.min(160, Math.max(110, a.y)) : 150; PetPlay.held = k === 'nip' ? 'catnip' : k; PetPlay.throwToy(k, x, y); });
      PetPlay.held = held; PetPlay.renderTray();
    },
    clearToys() { if (typeof PetPlay === 'undefined') return; for (const toy of (PetPlay.toys || []).slice()) toy.remove(); for (const a of Game.pets || []) { a.lure = null; a.toyWaiting = false; } },
    callPost() { const post = Game.S.items.find(i => ITEMS[i.k] && (ITEMS[i.k].scratch || /scratcher/.test(i.k))); if (!post) return UI.toast(t('noPost'), 'i_dev', 3); if (typeof RoomFeel !== 'undefined' && RoomFeel.post) { if (!RoomFeel.post(post, '')) UI.toast(t('noCatNear'), 'i_dev', 3); } },
    previewVisit() {
      if (typeof Visit === 'undefined' || !Social.snapData) return;
      if (Visit.active) return Visit.exit();
      const d = JSON.parse(JSON.stringify(Social.snapData())); d.items = (d.items || []).filter(it => ITEMS[it.k]); d.pets = d.pets || []; d.needs = d.needs || [];
      UI.closeWin('dev'); Visit.enter({ fid: Cloud.user ? Cloud.user.uid : 'dev', name: t('visitSelf'), d });
    },
  });

  // ---------- overlay: how far toys and scratching posts reach ----------
  const render = Room.render.bind(Room);
  Room.render = function (dt) {
    render(dt); if (!Dev.on || !Dev.lureView || typeof RoomFeel === 'undefined' || Room.state !== Game.S) return;
    const c = this.ctx; c.save(); c.lineWidth = 1;
    const ring = (x, y, R, col) => { c.strokeStyle = col; c.beginPath(); c.ellipse(x, y, R, R / 1.2, 0, 0, Math.PI * 2); c.stroke(); };
    for (const toy of (PetPlay.toys || [])) if (Room.actors.includes(toy)) ring(toy.x, toy.y, RoomFeel.R_TOY, 'rgba(240,120,150,.85)');
    for (const it of Game.S.items) { const d = ITEMS[it.k]; if (!d || !(d.scratch || /scratcher/.test(it.k))) continue; const [w, hh] = itemSize(it); ring(it.x + w / 2, it.y + hh, RoomFeel.R_POST, 'rgba(110,170,230,.85)'); }
    for (const a of Game.pets || []) if (a.lure) { c.fillStyle = 'rgba(240,120,150,.9)'; c.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 22, 3, 3); }
    c.restore();
  };

  // ---------- extra rows in the existing tabs ----------
  const w = UI.w_dev.bind(UI);
  UI.w_dev = function () {
    const out = w(), body = out.find(n => n && n.classList && n.classList.contains('devbody')); if (!body) return out;
    const S = Game.S, D = Dev, rows = [];
    const B = (label, fn, cls = '') => h('button', { class: 'chip sm ' + cls, onclick: fn }, label);
    const A = (label, fn, cls) => B(label, () => D.act(label, fn), cls);
    const row = (title, ...btns) => h('div', { class: 'devrow' }, h('span', { class: 'devl', text: title }), h('div', { class: 'devbtns' }, ...btns));
    const head = text => h('div', { class: 'sub', text });
    if (D.tab === 'learn' && P()) {
      const PL = P(), G = PL.S(), done = PL.done();
      rows.push(head(t('gradeHead')));
      rows.push(row(done ? t('gradeNow', [PL.label(PL.gnum(G.theta)), G.theta.toFixed(2), (G.se || 0).toFixed(2), (G.hist || []).length, PL.todayDone() ? t('today1') : t('today0')]) : t('gradeNone'),
        B(t('open'), () => { UI.closeWin('dev'); UI.openWin('placement'); }),
        A(t('redoFirst'), () => D.resetPlacement()),
        A(t('again'), () => { PL.S().last = ''; D.gradeTask(false); })));
      const sel = h('select', { id: 'dev-grade' }, ...Array.from({ length: 12 }, (_, i) => h('option', { value: String(i + 1), selected: done && PL.gnum(G.theta) === i + 1 }, PL.label(i + 1))));
      rows.push(row(t('setGrade'), h('label', { class: 'field devsel' }, sel), B(t('apply'), () => { const g = +document.getElementById('dev-grade').value; D.act(t('setGradeTo', [PL.label(g)]), () => D.setGrade(g)); })));
      rows.push(row(t('history'), A(t('fake14'), () => D.fakeHistory(14)), A(t('fake60'), () => D.fakeHistory(60)), A(t('clearHist'), () => { const g2 = PL.S(); g2.hist = (g2.hist || []).slice(-1); })));
      rows.push(row(t('cardShow', [PL.show() ? t('on') : t('off')]), B(PL.show() ? t('turnOff') : t('turnOn'), () => { PL.toggleShow(); UI.refresh('dev'); }), A(t('giveCert'), () => { S.inv.grade_cert = (S.inv.grade_cert || 0) + 1; })));
      rows.push(row(t('gradeTask'), A(t('taskDone'), () => D.gradeTask(true)), A(t('taskReset'), () => D.gradeTask(false))));
      const on = new Set(Learn.levelsOn()), cnt = {}; for (const v of VOCAB) cnt[v.t] = (cnt[v.t] || 0) + 1;
      rows.push(head(t('levelsHead')));
      rows.push(row(t('levelsNow', [[...on].map(x => 'L' + x).join(' ')]), ...VLEVELS.map(x => B(`L${x}（${cnt[x] || 0}）`, () => { Learn.toggleLevel(x); UI.refresh('dev'); }, on.has(x) ? 'on' : '')),
        A(t('onlyL1'), () => { Learn.L.levels = [1]; }), A(t('allL'), () => { Learn.L.levels = []; })));
    }
    if (D.tab === 'pet' && typeof PetPlay !== 'undefined') {
      const n = (PetPlay.toys || []).filter(x => Room.actors.includes(x) && !x.done).length;
      rows.push(head(t('toysHead')));
      rows.push(row(t('toysNow', [n, typeof RoomFeel !== 'undefined' ? RoomFeel.MAX_TOYS : 3, Life.L.bag.catnip || 0]),
        B(t('throw3'), () => { UI.closeWin('dev'); D.act(t('throw3'), () => D.throwToys()); }), A(t('clearToys'), () => D.clearToys()), A(t('nip10'), () => Life.give('catnip', 10))));
      rows.push(row(t('lure'), B(D.lureView ? t('lureOff') : t('lureOn'), () => { D.lureView = !D.lureView; UI.refresh('dev'); }, D.lureView ? 'on' : ''),
        B(t('callPost'), () => { UI.closeWin('dev'); D.callPost(); }), A(t('givePost'), () => { S.inv.scratch_post = (S.inv.scratch_post || 0) + 1; })));
      rows.push(h('p', { class: 'hint', text: typeof RoomFeel !== 'undefined' ? t('lureHint', [RoomFeel.R_TOY, RoomFeel.R_POST, RoomFeel.R_CALL]) : '' }));
    }
    if (D.tab === 'env') {
      rows.push(row(t('visitHead'), B(typeof Visit !== 'undefined' && Visit.active ? t('visitEnd') : t('visitStart'), () => D.previewVisit())));
    }
    if (D.tab === 'save') {
      const u = Cloud.user, f = S.flags || {}, adm = S.admin;
      rows.push(head(t('acctHead')));
      rows.push(row(u ? t('acctIn', [u.email || u.name || '', u.uid]) : t('acctOut'), u ? B(t('copyUid'), () => { try { navigator.clipboard.writeText(u.uid); UI.toast(t('copied'), 'i_dev', 2); } catch (e) { } }) : null,
        u ? B(t('pull'), async () => { try { await Cloud.pull(true); UI.toast(t('pulled'), 'i_cloud', 2.4); } catch (e) { UI.toast(cloudErr(e), 'i_cloud', 3); } UI.refresh('dev'); }) : null));
      rows.push(row(t('tester', [f.tester ? t('yes') + (f.testGroup ? '・' + f.testGroup : '') : t('no')]), A(f.tester ? t('untest') : t('markTest'), () => { S.flags = Object.assign({}, S.flags, { tester: !f.tester }); })));
      rows.push(row(adm ? t('adminBy', [new Date(adm.at).toLocaleString(I18n.lang, { hour12: false }), adm.by || '', adm.note || '']) : t('adminNone'), S.seeded ? h('span', { class: 'hint', text: t('seeded', [new Date(S.seeded.at).toLocaleDateString(I18n.lang)]) }) : null));
    }
    if (rows.length) body.append(...rows);
    return out;
  };
})();
