/* ============================================================
   0.92.49 Purr Cozy: 程度挑戰賽 (weekly level contest) and 每週任務 (weekly tasks)

   程度挑戰賽
   - Optional, once a week (the game week: Monday 06:00 → next Monday 06:00). Sign up, then climb L1 → L6.
   - Every Level is 15 questions from that Level only: 看英選中 4, 看中選英 4, 拼字 3 (no hints), 聽音選義 2, 聽寫 2.
     On a device without speech the listening questions become 看英選中 / 拼字, and the window says so.
   - The words are not just random: the Level's words are sorted by difficulty and cut into 15 bands, one word from each
     band, so every player gets the same spread from easy to hard (fair for a ranking) and the questions get harder
     towards the end. Words this player already had in the contest this week are avoided while there are others.
   - 11 of 15 right (≥ 70%) breaks through to the next Level and earns the 「通過 Lx」 badge. A Level is over as soon as
     11 right is out of reach (the 5th wrong answer), so nobody has to sit through questions that no longer matter.
   - Stop any time: every answer is saved, the same question is waiting when you come back.
   - A failed Level ends the run; sign up again to start over from L1. The week keeps the best run (highest Level
     passed, then accuracy), so failing never takes anything away. Level rewards are given once per Level per week.
   - Ranking: passed Level, then accuracy over the Levels broken through in that run, then who got there first.
     Top 50 are listed; your own row is always shown, without a rank when you are not in the top 50.
     Rank rewards (Top 50 / Top 10 / Top 3) are handed out on the first visit after the week ends.
   - Firestore: contest/{week}/rows/{uid} (test accounts write to contest/{week}/test/{uid} instead, so they never show
     on real players' boards). One small write per finished Level; the board is 50 reads, cached 10 minutes.

   每週任務: a tab in 任務 with four tasks for the week, including the contest.
   ============================================================ */
const CONTEST = {
  N: 15, PASS: 11, TOP: 50, LV: 6, BOARD_MS: 10 * 60e3,
  MIX: [['en2zh', 4], ['zh2en', 4], ['spell', 3], ['listen', 2], ['listenspell', 2]],
  // tier colours: 青銅 bronze, 白銀 silver, 黃金 gold, 鉑金 platinum (silver blue), 鑽石 diamond (bright blue), 星耀 star (violet)
  TIER: [null, ['#b9773e', '#f1c08e', '#6f4220'], ['#8f9aa5', '#e6ecf1', '#56616b'], ['#d39b12', '#ffe28a', '#7c5a00'], ['#6f8fbf', '#dbe7f7', '#34507a'], ['#2b8fe8', '#bfe6ff', '#164f8f'], ['#8c4ad8', '#f0d6ff', '#4b1f80']],
  // first pass of a Level each week
  LV_RW: { 1: { c: 20, x: 15, it: [['cat_can', 1]] }, 2: { c: 40, x: 20, it: [['fish_snack', 1]] }, 3: { c: 60, x: 30, it: [['cat_treat', 1]] }, 4: { c: 90, x: 40, it: [['catnip', 1]] }, 5: { c: 130, x: 50, it: [['premium_food', 1]] }, 6: { c: 200, x: 80, it: [['premium_food', 2], ['coffee', 2]] } },
  // final rank of the week
  RANK_RW: [[1, 1, { c: 1000, x: 200, it: [['premium_food', 3], ['cat_treat', 3], ['catnip', 2], ['coffee', 2]] }], [2, 2, { c: 800, x: 160, it: [['premium_food', 2], ['cat_treat', 3], ['catnip', 2], ['coffee', 2]] }], [3, 3, { c: 650, x: 130, it: [['premium_food', 2], ['cat_treat', 2], ['catnip', 1], ['coffee', 1]] }],
    [4, 10, { c: 400, x: 80, it: [['premium_food', 1], ['cat_treat', 2], ['coffee', 1]] }], [11, 50, { c: 150, x: 40, it: [['cat_can', 2], ['coffee', 1]] }]],
};
const WEEKLY_DEFS = {
  contest: { need: 1, rw: { c: 60, x: 40, it: [['cat_treat', 1]] }, prog: () => Contest.best() ? Contest.best().l : 0 },
  daily5: { need: 5, rw: { c: 120, x: 80, it: [['premium_food', 1]] }, prog: () => Weekly.W.bonus.length },
  vocab4: { need: 4, rw: { c: 80, x: 50, it: [['fish_snack', 2]] }, prog: () => Weekly.W.vocab.length },
  focus: { need: 150, rw: { c: 100, x: 60, it: [['coffee', 2]] }, prog: () => Math.floor(typeof Social !== 'undefined' ? Social.weekFocus() : 0) },
};
const ct = (id, a) => I18n.t('ct.' + id, a);

const Contest = {
  N: CONTEST.N, PASS: CONTEST.PASS, LV: CONTEST.LV, TOP: CONTEST.TOP,
  board: null, loading: false, err: '', tab: 'climb', claimBusy: false,
  get Z() {
    const S = Game.S; if (!S.contest) S.contest = { wk: '', on: false, run: null, top: null, got: {}, tries: 0, used: [], hist: [], claim: null };
    const Z = S.contest, k = weekKey();
    if (Z.wk !== k) {
      // the week ended: keep the result, rank rewards are claimed from the final board
      if (Z.wk && Z.top && Z.top.n > 0) { Z.hist.unshift({ wk: Z.wk, l: Z.top.l, a: Z.top.a, rank: null }); Z.hist = Z.hist.slice(0, 12); Z.claim = { wk: Z.wk, test: this.isTest() }; }
      Object.assign(Z, { wk: k, on: false, run: null, top: null, got: {}, tries: 0, used: [] });
    }
    return Z;
  },
  isTest() { const f = Game.S.flags || {}; return !!f.tester; },
  best() { return this.Z.top; },
  acc(ok, n) { return n ? Math.round(ok / n * 1000) : 0; },
  pct(a) { return (a / 10).toFixed(a % 10 ? 1 : 0) + '%'; },
  // better run = higher Level, then higher accuracy
  better(a, b) { return !b || a.l > b.l || (a.l === b.l && a.a > b.a); },
  canSpeak() { try { return Learn.canSpeak(); } catch (e) { return false; } },
  // ---------- questions ----------
  makeLevel(l) {
    const Z = this.Z, used = new Set(Z.used), speak = this.canSpeak();
    const pool = VOCAB.filter(v => v.t === l), fresh = pool.filter(v => !used.has(v.w));
    const src = (fresh.length >= this.N * 3 ? fresh : pool).slice().sort((a, b) => (a.d || 0) - (b.d || 0) || (a.g || 0) - (b.g || 0));
    const types = shuffle(CONTEST.MIX.flatMap(([t, n]) => Array(n).fill(t))).map(t => speak ? t : t === 'listen' ? 'en2zh' : t === 'listenspell' ? 'spell' : t);
    const typed = t => t === 'spell' || t === 'listenspell', okSpell = v => Learn.spellable(v) && v.w.length >= 3;
    const qs = [], taken = new Set(), band = src.length / this.N;
    for (let k = 0; k < this.N; k++) {
      const lo = Math.floor(k * band), hi = Math.max(lo + 1, Math.floor((k + 1) * band)), t = types[k];
      let cand = src.slice(lo, hi).filter(v => !taken.has(v.w) && (!typed(t) || okSpell(v)));
      // a band without a spellable word borrows from its neighbours
      for (let r = 1; !cand.length && r < this.N; r++) cand = src.slice(Math.max(0, lo - r * band), Math.min(src.length, hi + r * band)).filter(v => !taken.has(v.w) && (!typed(t) || okSpell(v)));
      const v = cand[Math.floor(Math.random() * cand.length)]; if (!v) continue; taken.add(v.w);
      qs.push({ i: v.i, type: t, noHint: typed(t), opts: typed(t) ? null : Learn.options(v, t === 'zh2en' ? 'w' : 'z') });
    }
    Z.used = [...used, ...taken].slice(-400);
    return qs;
  },
  // ---------- the run ----------
  join() {
    const Z = this.Z; Z.on = true; Z.tries = (Z.tries || 0) + 1;
    Z.run = { l: 1, passed: 0, qs: null, qi: 0, right: 0, wrong: 0, n: 0, ok: 0, over: false, t0: Date.now() };
    Game.save(); this.push(); UI.refresh('contest'); UI.refresh('tasks');
  },
  // start or continue the current Level in the quiz window
  play() {
    const R = this.Z.run; if (!R || R.over) return;
    if (!R.qs) { R.qs = this.makeLevel(R.l); R.qi = 0; R.right = 0; R.wrong = 0; Game.save(); }
    // the Level was already decided when the quiz was closed: show its result
    if (R.qi >= this.N || this.lost(R)) { const res = this.endLevel(); if (!res) return; res.coins = res.coins ? Game.reward(res.coins, res.xp, 'quiz') : 0; Learn.sess = { kind: 'contest', opts: { level: res.lvl }, step: 'result', result: Object.assign({ msg: '' }, res), wrong: [], qs: [], qi: 0, right: res.right }; return UI.openWin('study'); }
    if (UI.wins.contest && !UI.wins.contest.el.hidden) UI.closeWin('contest');
    Learn.start('contest', { questions: R.qs.slice(R.qi), level: R.l, mode: 'L' + R.l });
  },
  // every answer is saved right away (so the run can be resumed from the same question)
  note(s, q, ok) {
    const R = this.Z.run; if (!R || R.over || !R.qs) return;
    R.qi++; R.n++; if (ok) { R.right++; R.ok++; } else R.wrong++;
    (R.pips || (R.pips = [])).push(ok ? 1 : 0); Game.save();
  },
  // decided: 11 right is out of reach
  lost(R = this.Z.run) { return !!R && R.wrong > this.N - this.PASS; },
  won(R = this.Z.run) { return !!R && R.right >= this.PASS; },
  endLevel() {
    const Z = this.Z, R = Z.run; if (!R || R.over) return null;
    const lvl = R.l, pass = R.right >= this.PASS, res = { lvl, pass, right: R.right, n: R.qi, coins: 0, xp: 0, items: [] };
    // accuracy counts the Levels that were broken through (a Level that was lost does not pull it down)
    if (pass) {
      R.passed = lvl; R.pn = (R.pn || 0) + R.qi; R.pok = (R.pok || 0) + R.right;
      if (!Z.got[lvl]) { Z.got[lvl] = true; const rw = CONTEST.LV_RW[lvl]; res.coins = rw.c; res.xp = rw.x; for (const [k, n] of rw.it) { Life.give(k, n); res.items.push([k, n]); } res.first = true; }
      if (lvl >= this.LV) R.over = true; else { R.l = lvl + 1; R.qs = null; R.qi = 0; R.right = 0; R.wrong = 0; R.pips = []; }
    } else R.over = true;
    const now = R.passed ? { l: R.passed, a: this.acc(R.pok, R.pn), n: R.pn } : { l: 0, a: this.acc(R.right, R.qi), n: R.qi };
    if (this.better(now, Z.top)) { Z.top = now; res.best = true; }
    res.run = Object.assign({}, now); res.top = Object.assign({}, Z.top);
    Game.save(); this.push(); UI.refresh('contest'); UI.refresh('tasks');
    return res;
  },
  // ---------- board ----------
  path(wk, test) { return `contest/${wk}/${test ? 'test' : 'rows'}`; },
  online() { return typeof Social !== 'undefined' && Social.ready(); },
  async push() {
    const Z = this.Z; if (!this.online() || !Z.top) return;
    if (Social.dev() && !Social.devListed()) return;
    clearTimeout(this._pt); const wait = Math.max(0, 15000 - (Date.now() - (this._pushAt || 0)));
    this._pt = setTimeout(async () => {
      this._pushAt = Date.now();
      try {
        const c = Social.card(), T = Z.top;
        await Cloud.fb.store.set(this.path(Z.wk, this.isTest()) + '/' + Social.uid, { name: c.name, ava: c.ava, grade: c.grade || '', l: T.l, a: T.a, n: T.n, s: T.l * 1000 + T.a, tries: Z.tries || 0, at: '__now__' });
        this.cacheDrop(Z.wk);
      } catch (e) { console.warn('[contest]', e && (e.code || e.message)); }
    }, wait);
  },
  cache() { try { return JSON.parse(localStorage.getItem('purr-cozy.contest.board') || 'null') || {}; } catch (e) { return {}; } },
  cacheDrop(wk) { const c = this.cache(); delete c[wk]; try { localStorage.setItem('purr-cozy.contest.board', JSON.stringify(c)); } catch (e) { } },
  sortRows(rows) { return rows.filter(r => r.s > 0 || r.n > 0).sort((a, b) => b.s - a.s || (a.at || 0) - (b.at || 0) || (a.id < b.id ? -1 : 1)); },
  async fetch(wk, test, force) {
    const c = this.cache(), hit = c[wk];
    if (!force && hit && hit.uid === Social.uid && hit.test === test && Date.now() - hit.at < CONTEST.BOARD_MS) return hit.rows;
    const rows = this.sortRows(await Cloud.fb.store.top(this.path(wk, test), 's', this.TOP)).map(r => ({ id: r.id, name: clipName(r.name) || '…', ava: r.ava || null, grade: typeof r.grade === 'string' ? r.grade.slice(0, 12) : '', l: r.l | 0, a: r.a | 0, n: r.n | 0, s: r.s | 0, at: r.at || 0 }));
    c[wk] = { at: Date.now(), uid: Social.uid, test, rows }; for (const k of Object.keys(c)) if (k !== wk && Date.now() - c[k].at > 8 * 864e5) delete c[k];
    try { localStorage.setItem('purr-cozy.contest.board', JSON.stringify(c)); } catch (e) { }
    return rows;
  },
  async loadBoard(force) {
    if (!this.online()) return; this.loading = true; UI.refresh('contest');
    try { this.board = { wk: this.Z.wk, rows: await this.fetch(this.Z.wk, this.isTest(), force) }; this.err = ''; }
    catch (e) { this.err = typeof cloudErr === 'function' ? cloudErr(e) : String(e && e.code || e); }
    this.loading = false; UI.refresh('contest');
  },
  myRank() { const B = this.board; if (!B || B.wk !== this.Z.wk || !Social.uid) return 0; const i = B.rows.findIndex(r => r.id === Social.uid); return i >= 0 ? i + 1 : 0; },
  rankReward(rank) { const r = CONTEST.RANK_RW.find(([a, b]) => rank >= a && rank <= b); return r ? r[2] : null; },
  // last week's final rank: one board read after the week ends
  async claimRank() {
    const Z = this.Z; if (!Z.claim || this.claimBusy || !this.online()) return;
    this.claimBusy = true;
    try {
      const rows = await this.fetch(Z.claim.wk, !!Z.claim.test, true), i = rows.findIndex(r => r.id === Social.uid), rank = i >= 0 ? i + 1 : 0;
      const h0 = Z.hist.find(x => x.wk === Z.claim.wk); if (h0) h0.rank = rank || null;
      const rw = rank ? this.rankReward(rank) : null;
      if (rw) { const c = Game.reward(rw.c, rw.x, 'raw'); for (const [k, n] of rw.it) Life.give(k, n); if (h0) h0.rw = true; Z.lastRank = { wk: Z.claim.wk, rank, c, it: rw.it, l: h0 ? h0.l : 0, a: h0 ? h0.a : 0, seen: false }; }
      Z.claim = null; Game.save(); typeof saveSoon === 'function' && saveSoon();
      if (rw) { UI.toast(ct('rankToast', [rank]), 'i_star', 6, () => { this.tab = 'reward'; UI.openWin('contest'); }); }
      UI.refresh('contest');
    } catch (e) { console.warn('[contest] claim', e && (e.code || e.message)); }
    this.claimBusy = false;
  },
  timeLeft() { const ms = Math.max(0, weekEnd() - Date.now()), d = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 3600e3); return d ? ct('leftDH', [d, hh]) : ct('leftH', [hh, Math.floor(ms % 3600e3 / 60e3)]); },
  open(tab) { if (tab) this.tab = tab; this.scrollNow = true; UI.openWin('contest'); if (this.tab === 'board') this.loadBoard(); this.claimRank(); },
};

/* ---------------- 每週任務 ---------------- */
const Weekly = {
  get W() { const S = Game.S, k = weekKey(); if (!S.weekly || S.weekly.wk !== k) S.weekly = { wk: k, bonus: [], vocab: [], claimed: {} }; return S.weekly; },
  addDay(list) { const d = Life.today(), W = this.W; if (!W[list].includes(d)) { W[list].push(d); UI.refresh('tasks'); } },
  ready(k) { const d = WEEKLY_DEFS[k]; return !this.W.claimed[k] && d.prog() >= d.need; },
  readyN() { return Object.keys(WEEKLY_DEFS).filter(k => this.ready(k)).length; },
  claim(k) {
    if (!this.ready(k)) return; const rw = WEEKLY_DEFS[k].rw; this.W.claimed[k] = true;
    Game.reward(rw.c, rw.x, 'task'); for (const [it, n] of rw.it) Life.give(it, n);
    UI.toast(ct('wkClaimed'), 'i_star', 3); Game.save(); UI.refresh('tasks'); UI.badges && UI.badges();
  },
};

/* ---------------- drawing: crests, the ladder, the breakthrough ---------------- */
const CtArt = {
  // a shield crest for Level l. state: 'done' | 'now' | 'lock' | 'fail'
  // the Level badge (assets/contest/l1–l6.png). state: 'done' | 'now' | 'lock' | 'fail'
  crest(l, state, size = 56, extra = '') {
    const lock = state === 'lock';
    return `<span class="lc-crest ${state} ${extra}" style="--s:${size}px" aria-hidden="true"><img src="assets/contest/l${l}.png" alt="" draggable="false">${lock ? '<svg class="lc-lock" viewBox="0 0 28 32"><rect x="1" y="12" width="26" height="19" rx="4" fill="#6f6679"/><path d="M7 13 V8 a7 7 0 0 1 14 0 V13" fill="none" stroke="#6f6679" stroke-width="4"/></svg>' : ''}${state === 'done' ? '<svg class="lc-check" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#3f8a4f" stroke="#fff" stroke-width="2.5"/><path d="M7.5 14 l4.5 4.5 l8.5 -9.5" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</span>`;
  },
  badge(l, small) {
    if (!l) return h('span', { class: 'lc-badge none', text: ct('noBadge') });
    const [c, g, d] = CONTEST.TIER[l]; return h('span', { class: 'lc-badge' + (small ? ' sm' : ''), style: `--c:${c};--g:${g};--d:${d}`, text: l >= 6 ? ct('badgeTop') : ct('badge', [l]) });
  },
  html(s) { const d = h('div'); d.innerHTML = s; return d.firstElementChild; },
  // the climb: L6 (summit) on top, L1 at the bottom; the path is lit up to where you are
  ladder(Z) {
    const R = Z.run, T = Z.top, passed = Math.max(R ? R.passed : 0, 0), bestL = T ? T.l : 0, cur = R && !R.over ? R.l : 0;
    const failL = R && R.over && R.passed < 6 ? R.passed + 1 : 0, wrap = h('div', { class: 'lc-ladder' });
    const summit = h('div', { class: 'lc-summit' + (bestL >= 6 ? ' lit' : '') }, this.html(`<svg width="64" height="40" viewBox="0 0 64 40" aria-hidden="true"><path d="M6 34 L14 10 L26 24 L32 4 L38 24 L50 10 L58 34 Z" fill="${bestL >= 6 ? '#ffd34d' : '#ddd5e4'}" stroke="${bestL >= 6 ? '#a07800' : '#b3aabd'}" stroke-width="3" stroke-linejoin="round"/></svg>`), h('b', { text: bestL >= 6 ? ct('summitDone') : ct('summit') }));
    wrap.append(summit);
    for (let l = 6; l >= 1; l--) {
      const st = l <= passed ? 'done' : l === cur ? 'now' : l === failL ? 'fail' : l <= bestL ? 'best' : 'lock';
      const rw = CONTEST.LV_RW[l], got = Z.got[l];
      const prog = st === 'now' && R.qs ? h('div', { class: 'lc-prog' }, ...Array.from({ length: CONTEST.N }, (_, k) => h('i', { class: k < (R.pips || []).length ? (R.pips[k] ? 'ok' : 'no') : '' })), h('span', { class: 'lc-need', style: `left:${CONTEST.PASS / CONTEST.N * 100}%`, title: ct('needN', [CONTEST.PASS]) })) : null;
      const sub = st === 'done' ? ct('stDone', [l]) : st === 'now' ? (R.qs ? ct('stNow', [R.qi, CONTEST.N, R.right, CONTEST.PASS]) : ct('stReady', [CONTEST.N, CONTEST.PASS])) : st === 'fail' ? ct('stFail') : st === 'best' ? ct('stBest') : ct('stLock');
      const row = h('div', { class: 'lc-step ' + st, style: `--c:${CONTEST.TIER[l][0]};--g:${CONTEST.TIER[l][1]}` },
        h('div', { class: 'lc-rail' + (l <= passed ? ' lit' : '') }),
        this.html(this.crest(l, st === 'done' || st === 'best' ? 'done' : st === 'now' ? 'now' : st === 'fail' ? 'fail' : 'lock', 62)),
        h('div', { class: 'lc-info' }, h('div', { class: 'lc-name' }, h('b', { text: 'L' + l + ' ' + ct('lvName' + l) }), st === 'now' ? h('span', { class: 'lc-here', text: ct('here') }) : null), h('div', { class: 'hint', text: sub }), prog),
        h('div', { class: 'lc-rw' + (got ? ' got' : '') }, h('span', { class: 'rwc' }, ico('i_coin', 14), h('b', { class: 'num', text: String(rw.c) })), ...rw.it.map(([k, n]) => h('span', { class: 'rwc', title: SUPPLIES[k].n }, ico(SUPPLIES[k].spr, 16), h('b', { class: 'num', text: '×' + n }))), got ? h('span', { class: 'lc-gotmark', text: ct('got') }) : null));
      if (st === 'now') row.append(h('div', { class: 'lc-me' }, UI.avaPic(Game.S.avatar, 30)));
      wrap.append(row);
    }
    return wrap;
  },
};

/* ---------------- windows ---------------- */
Object.assign(UI.WIN, { contest: { t: ct('title'), i: 'i_star', w: 480, at: ['c', 0], resize: { minW: 360, minH: 460, h: 760 } } });
Object.assign(UI, {
  w_contest() {
    const Z = Contest.Z, R = Z.run, T = Z.top, tab = Contest.tab;
    const tabs = h('div', { class: 'tabs' }, ...[['climb', ct('tabClimb')], ['board', ct('tabBoard')], ['reward', ct('tabReward')]].map(([k, l]) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { Contest.tab = k; if (k === 'board') Contest.loadBoard(); this.refresh('contest'); } }, l)));
    const head = h('div', { class: 'lc-head' }, h('div', { class: 'grow' }, h('b', { text: ct('weekOf', [weekStart().getMonth() + 1, weekStart().getDate()]) }), h('div', { class: 'hint', text: ct('resetAt', [Contest.timeLeft()]) })),
      h('div', { class: 'lc-best' }, CtArt.badge(T ? T.l : 0)));
    const out = [tabs, head];
    if (tab === 'climb') {
      const body = h('div', { class: 'scroll lc-body' });
      if (Z.lastRank && !Z.lastRank.seen) out.push(this.ctRankCard(Z.lastRank));
      body.append(CtArt.ladder(Z));
      out.push(body);
      // open on the step you are standing on
      if (Contest.scrollNow) { Contest.scrollNow = false; setTimeout(() => { const el = body.querySelector('.lc-step.now') || body.querySelector('.lc-step.fail') || body.querySelector('.lc-step.done'); if (el) body.scrollTop = Math.max(0, el.offsetTop - body.clientHeight / 2 + el.offsetHeight / 2); }, 30); }
      // the one big button
      let btn, note = '';
      if (!Z.on) { btn = h('button', { class: 'chip big primary lc-go', onclick: () => Contest.join() }, ico('i_star', 22), ct('join')); note = ct('joinNote', [CONTEST.N, CONTEST.PASS]); }
      else if (R && !R.over) { const mid = R.qs && R.qi > 0; btn = h('button', { class: 'chip big primary lc-go', onclick: () => { this.closeWin('contest'); Contest.play(); } }, ico('i_play', 22), mid ? ct('resume', [R.l, R.qi + 1]) : ct('go', [R.l])); note = mid ? ct('resumeNote') : ct('goNote', [CONTEST.N, CONTEST.PASS]); }
      else { const top6 = T && T.l >= 6; btn = h('button', { class: 'chip big primary lc-go', onclick: () => Contest.join() }, ico('i_reset', 22), top6 ? ct('againTop') : ct('again')); note = top6 ? ct('againTopNote') : ct('againNote'); }
      out.push(h('div', { class: 'lc-cta' }, btn, h('p', { class: 'hint center', text: note }), !Contest.canSpeak() ? h('p', { class: 'hint center warn', text: ct('noSpeak') }) : null));
    } else if (tab === 'board') out.push(...this.ctBoard());
    else out.push(this.ctRewards());
    return out;
  },
  ctRankCard(L) {
    const card = h('div', { class: 'lc-rankcard' }, CtArt.html(CtArt.crest(Math.max(1, L.l || 1), 'done', 44)), h('div', { class: 'grow' }, h('b', { text: ct('lastRank', [L.rank]) }), h('div', { class: 'hint', text: ct('lastRankRw', [L.c, L.it.map(([k, n]) => SUPPLIES[k].n + '×' + n).join('、')]) })),
      h('button', { class: 'chip sm', onclick: () => { L.seen = true; Game.save(); this.refresh('contest'); } }, ct('ok')));
    return card;
  },
  ctBoard() {
    const out = [];
    if (!Contest.online()) return [h('div', { class: 'empty' }, ico('i_people', 40), h('p', { text: ct('boardOffline') }))];
    if (Contest.isTest()) out.push(h('p', { class: 'hint', text: ct('boardTest') }));
    const B = Contest.board && Contest.board.wk === Contest.Z.wk ? Contest.board : null;
    if (Contest.err) out.push(h('p', { class: 'hint warn', text: Contest.err }));
    if (!B) { out.push(h('p', { class: 'hint', text: Contest.loading ? ct('loading') : ct('boardEmpty') })); if (!Contest.loading) setTimeout(() => Contest.loadBoard(), 0); return out; }
    const row = (r, rank, me) => h('li', { class: 'lc-brow' + (me ? ' me' : '') + (rank && rank <= 3 ? ' top' + rank : '') },
      h('span', { class: 'brank num', text: rank ? String(rank) : '—' }), this.avaPic(r.ava, 30),
      h('span', { class: 'bname grow' }, h('span', { text: r.name }), this.gradeTag(r.grade)), CtArt.badge(r.l, true), h('span', { class: 'bval num', text: Contest.pct(r.a) }));
    const list = h('ol', { class: 'board lc-board' }, ...B.rows.map((r, i) => row(r, i + 1, r.id === Social.uid)));
    out.push(h('div', { class: 'scroll' }, list));
    const T = Contest.Z.top;
    if (!B.rows.some(r => r.id === Social.uid)) out.push(h('div', { class: 'lc-mine' }, h('div', { class: 'sub', text: T ? ct('notTop', [CONTEST.TOP]) : ct('notJoined') }), T ? h('ol', { class: 'board lc-board' }, row({ name: Social.myName(), ava: Game.S.avatar, grade: '', l: T.l, a: T.a }, 0, true)) : null));
    out.push(h('div', { class: 'row' }, h('button', { class: 'chip sm', disabled: Contest.loading, onclick: () => Contest.loadBoard(true) }, ico('i_reset', 14), ct('refresh'))));
    return out;
  },
  ctRewards() {
    const Z = Contest.Z, body = h('div', { class: 'scroll lc-body' });
    const chips = rw => h('span', { class: 'rw' }, h('span', { class: 'rwc' }, ico('i_coin', 16), h('b', { class: 'num', text: String(rw.c) })), ...rw.it.map(([k, n]) => h('span', { class: 'rwc', title: SUPPLIES[k].n }, ico(SUPPLIES[k].spr, 18), h('b', { class: 'num', text: '×' + n }))));
    body.append(h('div', { class: 'sub', text: ct('rwLevels') }), h('p', { class: 'hint', text: ct('rwLevelsNote') }));
    for (let l = 1; l <= 6; l++) body.append(h('div', { class: 'task' + (Z.got[l] ? ' claimed' : '') }, CtArt.html(CtArt.crest(l, Z.got[l] ? 'done' : 'lock', 34)), h('div', { class: 'task-main' }, h('div', { class: 'task-t', text: ct('rwPass', [l]) }), h('div', { class: 'task-meta' }, chips(CONTEST.LV_RW[l]))), Z.got[l] ? h('span', { class: 'own', text: ct('got') }) : null));
    body.append(h('div', { class: 'sub', text: ct('rwRanks') }), h('p', { class: 'hint', text: ct('rwRanksNote') }));
    for (const [a, b, rw] of CONTEST.RANK_RW) body.append(h('div', { class: 'task lc-rankrw' + (a <= 3 ? ' top' + a : '') }, h('span', { class: 'lc-rankno num', text: a === b ? '#' + a : `#${a}–${b}` }), h('div', { class: 'task-main' }, h('div', { class: 'task-meta' }, chips(rw)))));
    if (Z.hist.length) { body.append(h('div', { class: 'sub', text: ct('history') })); for (const x of Z.hist.slice(0, 8)) body.append(h('div', { class: 'lc-hist' }, h('span', { class: 'num', text: x.wk.slice(6).replace('-', '/') + ' ' + ct('weekShort') }), CtArt.badge(x.l, true), h('span', { class: 'num hint', text: Contest.pct(x.a) }), h('span', { class: 'hint', text: x.rank ? '#' + x.rank : Z.claim && Z.claim.wk === x.wk ? ct('rankPending') : '—' }))); }
    body.append(h('p', { class: 'hint', text: ct('rules', [CONTEST.N, CONTEST.PASS]) }));
    return body;
  },
});

/* ---------------- quiz window: header strip during a Level, breakthrough screen at the end ---------------- */
(function () {
  const start = Learn.start.bind(Learn);
  Learn.start = function (kind, opts = {}) {
    if (kind !== 'contest') return start(kind, opts);
    // like a story chapter: the questions are fixed, no review cards, no lucky bonus
    if (this.sess && this.sess.kind === 'levelgate' && this.sess.step !== 'result' && typeof LevelGate !== 'undefined') LevelGate.abandon();
    this.ensureDaily();
    const qs = opts.questions.map(q => Object.assign({}, q)), s = this.sess = { kind, opts: Object.assign({}, opts, { preset: qs, strict: true }), words: qs.map(q => q.i), nq: qs.length, step: 'quiz', ri: qs.length, flip: false, unsure: [], qs: null, qi: 0, ans: null, right: 0, wrong: [], newly: 0, mastered: 0, result: null, spoke: -1 };
    this.toQuiz(); UI.openWin('study');
  };
  if (typeof Feel !== 'undefined' && Feel.luck) { const luck = Feel.luck.bind(Feel); Feel.luck = function (s, q) { return s && s.kind === 'contest' ? null : luck(s, q); }; }
  const answer = Learn.answer.bind(Learn);
  Learn.answer = function (val) {
    const s = this.sess, before = s && s.ans; const r = answer(val);
    if (s && s.kind === 'contest' && !before && s.ans) { Contest.note(s, s.qs[s.qi], s.ans.ok); UI.refresh('study'); }
    return r;
  };
  const next = Learn.next.bind(Learn);
  Learn.next = function () {
    const s = this.sess;
    // the Level is decided as soon as 11 right is out of reach
    if (s && s.kind === 'contest' && s.ans && Contest.lost()) { s.qs.length = s.qi + 1; }
    return next();
  };
  const finish = Learn.finish.bind(Learn);
  Learn.finish = function () {
    const s = this.sess;
    if (!s || s.kind !== 'contest') return finish();
    if (s.step !== 'quiz' || s.result || s.qi < s.qs.length) return;
    s.step = 'result'; const res = Contest.endLevel() || { lvl: s.opts.level, pass: false, right: 0, n: 0, coins: 0, xp: 0, items: [] };
    res.coins = res.coins ? Game.reward(res.coins, res.xp, 'quiz') : 0; if (!res.coins && res.xp) Game.reward(0, res.xp, 'quiz');
    s.result = Object.assign({ msg: '' }, res); UI.badges && UI.badges(); Game.save(); typeof saveSoon === 'function' && saveSoon(); UI.refresh('study');
  };
  // closing the quiz never loses anything; the contest window shows where you are
  const close = UI.closeWin.bind(UI);
  UI.closeWin = function (id) { const s = Learn.sess, back = id === 'study' && s && s.kind === 'contest'; const r = close(...arguments); if (back && s.step !== 'result') UI.toast(ct('paused'), 'i_pause', 3, () => Contest.open('climb')); return r; };
  const study = UI.w_study.bind(UI);
  UI.w_study = function () {
    const s = Learn.sess, hd = UI.wins.study && UI.wins.study.el.querySelector('.win-h h2');
    if (hd) hd.textContent = s && s.kind === 'contest' ? ct('title') : UI.WIN.study.t;
    if (!s || s.kind !== 'contest') return study();
    if (s.step === 'result') return [UI.ctBreak(s)];
    const out = study(), R = Contest.Z.run; if (!R) return out;
    const strip = h('div', { class: 'lc-strip', style: `--c:${CONTEST.TIER[R.l][0]};--g:${CONTEST.TIER[R.l][1]}` }, CtArt.html(CtArt.crest(R.l, 'now', 30)),
      h('div', { class: 'grow' }, h('div', { class: 'lc-strip-t' }, h('b', { text: ct('stripT', [R.l]) }), h('span', { class: 'num hint', text: ct('stripN', [Math.min(R.qi + (s.ans ? 0 : 1), CONTEST.N), CONTEST.N]) })),
        h('div', { class: 'lc-prog' }, ...Array.from({ length: CONTEST.N }, (_, k) => h('i', { class: k < (R.pips || []).length ? (R.pips[k] ? 'ok' : 'no') : k === (R.pips || []).length ? 'cur' : '' })), h('span', { class: 'lc-need', style: `left:${CONTEST.PASS / CONTEST.N * 100}%` })),
        h('div', { class: 'hint lc-strip-s', text: Contest.won(R) ? ct('stripWon') : Contest.lost(R) ? ct('stripLost') : ct('stripNeed', [R.right, Math.max(0, CONTEST.PASS - R.right), CONTEST.N - R.qi]) })));
    // the strip replaces the quiz's own counter (which would restart from 1 after a pause)
    const meta = out[0] && out[0].querySelector && out[0].querySelector('.quiz-meta'); if (meta) meta.remove();
    return [strip, ...out];
  };
  Object.assign(UI, {
    // the moment of breaking through (or not)
    ctBreak(s) {
      const r = s.result, Z = Contest.Z, l = r.lvl, [c, g, d] = CONTEST.TIER[l], top = r.pass && l >= 6, nextL = l + 1;
      const rewards = r.coins || r.items.length ? h('div', { class: 'rw big' }, r.coins ? h('span', { class: 'rwc' }, ico('i_coin', 22), h('b', { class: 'num', text: '+' + r.coins })) : null, r.xp ? h('span', { class: 'rwc' }, ico('i_star', 22), h('b', { class: 'num', text: '+' + r.xp })) : null, ...r.items.map(([k, n]) => h('span', { class: 'rwc' }, ico(SUPPLIES[k].spr, 24), h('b', { class: 'num', text: '×' + n })))) : null;
      if (r.pass) {
        const stage = CtArt.html(`<div class="lc-stage" style="--c:${c};--g:${g};--d:${d}"><div class="lc-rays"></div>
          <div class="lc-shards">${Array.from({ length: 8 }, (_, k) => `<i style="--a:${k * 45 + 20}deg"></i>`).join('')}</div>
          <div class="lc-old">${CtArt.crest(l, 'now', 92)}</div><div class="lc-new">${CtArt.crest(l, 'done', 110, 'pop')}</div>${top ? '' : `<div class="lc-next-peek">${CtArt.crest(nextL, 'lock', 46)}<span>▲</span></div>`}</div>`);
        return h('div', { class: 'lc-break pass' }, stage,
          h('h2', { class: 'lc-big', text: top ? ct('topDone') : ct('broke', [l]) }),
          h('p', { class: 'lc-score num', text: ct('score', [r.right, r.n, Contest.pct(Contest.acc(r.right, r.n))]) }),
          h('div', { class: 'row center' }, CtArt.badge(l)), h('p', { class: 'hint center', text: top ? ct('topNote') : ct('newBadge', [l]) }), rewards,
          r.first ? null : h('p', { class: 'hint center', text: ct('noRepeatRw') }),
          h('div', { class: 'row center wrap lc-actions' },
            top ? h('button', { class: 'chip big primary', onclick: () => { this.closeWin('study'); Contest.open('board'); } }, ico('i_people', 20), ct('seeBoard'))
              : h('button', { class: 'chip big primary lc-go', onclick: () => Contest.play() }, '▲ ', ct('toNext', [nextL])),
            h('button', { class: 'chip', onclick: () => { this.closeWin('study'); Contest.open('climb'); } }, ct('rest'))));
      }
      const T = Z.top;
      return h('div', { class: 'lc-break fail' }, CtArt.html(`<div class="lc-stage dim" style="--c:${c};--g:${g};--d:${d}"><div class="lc-old shake">${CtArt.crest(l, 'now', 96)}</div></div>`),
        h('h2', { class: 'lc-big', text: ct('notBroke', [l]) }),
        h('p', { class: 'lc-score num', text: ct('scoreNeed', [r.right, r.n, CONTEST.PASS]) }),
        T && T.l ? h('div', { class: 'lc-keep' }, CtArt.badge(T.l), h('span', { class: 'hint', text: ct('keepBest', [Contest.pct(T.a)]) })) : h('p', { class: 'hint center', text: ct('firstTry') }),
        s.wrong.length ? h('div', { class: 'wlist' }, ...s.wrong.slice(0, 6).map(i => h('div', { class: 'wrow' }, h('b', { text: VOCAB[i].w }), h('span', { class: 'hint', text: VOCAB[i].p }), h('span', { text: VOCAB[i].z }), h('button', { class: 'xbtn', 'aria-label': 'speak', onclick: () => Learn.speak(VOCAB[i].w) }, ico('i_speaker', 18))))) : null,
        h('div', { class: 'row center wrap lc-actions' },
          h('button', { class: 'chip big primary', onclick: () => { Contest.join(); Contest.play(); } }, ico('i_reset', 20), ct('again')),
          h('button', { class: 'chip', onclick: () => { this.closeWin('study'); Contest.open('board'); } }, ct('seeBoard')),
          h('button', { class: 'chip', onclick: () => { this.closeWin('study'); Contest.open('climb'); } }, ct('rest'))));
    },
  });
})();

/* ---------------- 每週任務 tab in 任務 ---------------- */
(function () {
  if (Life.claimBonus) { const o = Life.claimBonus.bind(Life); Life.claimBonus = function () { const D = Life.L.daily, was = D && D.bonus; const r = o(...arguments); if (!was && Life.L.daily && Life.L.daily.bonus) Weekly.addDay('bonus'); return r; }; }
  if (Life.track) { const o = Life.track.bind(Life); Life.track = function (k) { if (k === 'vocab') Weekly.addDay('vocab'); return o(...arguments); }; }
  const tasks = UI.w_tasks.bind(UI);
  UI.w_tasks = function () {
    const want = this.tasksTab; if (want === 'weekly') this.tasksTab = 'daily';
    const out = tasks(); this.tasksTab = want;
    const tabs = out[0], n = Weekly.readyN();
    if (tabs && tabs.classList && tabs.classList.contains('tabs')) {
      const b = h('button', { class: 'tab' + (want === 'weekly' ? ' on' : ''), onclick: () => { this.tasksTab = 'weekly'; this.refresh('tasks'); } }, ct('wkTab') + (n ? `（${n}）` : ''));
      if (want === 'weekly') for (const x of tabs.querySelectorAll('.tab.on')) x.classList.remove('on');
      tabs.insertBefore(b, tabs.children[1] || null);
    }
    if (want !== 'weekly') return out;
    const W = Weekly.W, body = [], Z = Contest.Z, T = Z.top, R = Z.run;
    body.push(h('p', { class: 'hint', text: ct('wkNote', [Contest.timeLeft()]) }));
    // the contest card, with the six crests as a small climb
    const mini = h('div', { class: 'lc-mini' }, ...[1, 2, 3, 4, 5, 6].map(l => CtArt.html(CtArt.crest(l, T && T.l >= l ? 'done' : R && !R.over && R.l === l ? 'now' : 'lock', 30))));
    body.push(h('div', { class: 'task lc-task' + (Weekly.ready('contest') ? ' ready' : W.claimed.contest ? ' claimed' : '') },
      h('div', { class: 'task-main' }, h('div', { class: 'task-t' }, ct('title'), ' ', T ? CtArt.badge(T.l, true) : null), h('div', { class: 'hint', text: ct('wkContest', [CONTEST.N, CONTEST.PASS]) }), mini,
        h('div', { class: 'task-meta' }, h('span', { class: 'num hint', text: T ? ct('wkContestNow', [T.l, Contest.pct(T.a)]) : Z.on ? ct('wkJoined') : ct('wkNotJoined') }), this.rewardChips(WEEKLY_DEFS.contest.rw, true))),
      W.claimed.contest ? h('span', { class: 'own', text: ct('got') }) : Weekly.ready('contest') ? h('button', { class: 'chip sm primary', onclick: () => Weekly.claim('contest') }, ct('claim')) : h('button', { class: 'chip sm primary', onclick: () => Contest.open('climb') }, Z.on ? ct('goContest') : ct('join'))));
    for (const k of ['daily5', 'vocab4', 'focus']) {
      const d = WEEKLY_DEFS[k], p = Math.min(d.need, d.prog()), done = p >= d.need;
      body.push(h('div', { class: 'task' + (W.claimed[k] ? ' claimed' : done ? ' ready' : '') },
        h('div', { class: 'task-main' }, h('div', { class: 'task-t', text: ct('wk_' + k, [d.need]) }), h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round(p / d.need * 100)}%` })), h('div', { class: 'task-meta' }, h('span', { class: 'num hint', text: `${p}/${d.need}` }), this.rewardChips(d.rw, true))),
        W.claimed[k] ? h('span', { class: 'own', text: ct('got') }) : done ? h('button', { class: 'chip sm primary', onclick: () => Weekly.claim(k) }, ct('claim')) : k === 'focus' ? h('button', { class: 'chip sm', onclick: () => this.openWin('timer') }, ct('goFocus')) : k === 'vocab4' ? h('button', { class: 'chip sm', onclick: () => this.openWin('learn') }, ct('goLearn')) : null));
    }
    return [out[0], out[1], h('div', { class: 'scroll tasks' }, ...body)];
  };
  // an entry in 學習: this week's contest at a glance
  const learn = UI.w_learn.bind(UI);
  UI.w_learn = function () {
    const out = learn(), Z = Contest.Z, T = Z.top, R = Z.run;
    const card = h('button', { class: 'lc-entry', onclick: () => Contest.open('climb') }, CtArt.html(CtArt.crest(R && !R.over ? R.l : T ? Math.min(6, Math.max(1, T.l)) : 1, T && T.l >= 6 ? 'done' : 'now', 36)),
      h('span', { class: 'grow' }, h('b', { text: ct('title') }), h('span', { class: 'hint', text: !Z.on ? ct('entryJoin') : R && !R.over ? ct('entryNow', [R.l, R.qs ? R.qi : 0, CONTEST.N]) : T ? ct('entryBest', [T.l, Contest.pct(T.a)]) : ct('entryAgain') })), T ? CtArt.badge(T.l, true) : null);
    out.splice(Math.min(1, out.length), 0, card);
    return out;
  };
})();

/* ---------------- developer panel ---------------- */
(function () {
  if (typeof Dev === 'undefined' || !UI.w_dev) return;
  const w = UI.w_dev.bind(UI);
  UI.w_dev = function () {
    const out = w(); if (Dev.tab !== 'learn') return out;
    const body = out.find(n => n && n.classList && n.classList.contains('devbody')); if (!body) return out;
    const Z = Contest.Z, R = Z.run, A = (label, fn) => h('button', { class: 'chip sm', onclick: () => Dev.act(label, fn) }, label);
    const row = (title, ...btns) => h('div', { class: 'devrow' }, h('span', { class: 'devl', text: title }), h('div', { class: 'devbtns' }, ...btns));
    body.append(h('div', { class: 'sub', text: ct('devHead') }),
      row(ct('devNow', [Z.on ? (R ? (R.over ? ct('devOver') : 'L' + R.l + ' ' + R.qi + '/' + CONTEST.N) : '—') : ct('devOff'), Z.top ? 'L' + Z.top.l + ' ' + Contest.pct(Z.top.a) : '—', Z.tries || 0]),
        h('button', { class: 'chip sm', onclick: () => { UI.closeWin('dev'); Contest.open('climb'); } }, ct('devOpen')),
        A(ct('devJoin'), () => Contest.join()),
        A(ct('devPassNow'), () => { const r = Contest.Z.run; if (!r || r.over) return; if (!r.qs) r.qs = Contest.makeLevel(r.l); r.right = CONTEST.PASS + 2; r.wrong = 0; r.qi = CONTEST.N; r.n += CONTEST.N; r.ok += CONTEST.PASS + 2; r.pips = Array(CONTEST.N).fill(1).map((x, k) => k < CONTEST.PASS + 2 ? 1 : 0); Contest.endLevel(); }),
        A(ct('devFailNow'), () => { const r = Contest.Z.run; if (!r || r.over) return; if (!r.qs) r.qs = Contest.makeLevel(r.l); r.right = 6; r.wrong = 5; r.qi = 11; r.n += 11; r.ok += 6; Contest.endLevel(); })),
      row(ct('devWeek'), A(ct('devReset'), () => { delete Game.S.contest; delete Game.S.weekly; }), A(ct('devEndWeek'), () => { const Z2 = Contest.Z; Z2.wk = 'w2000-01-03'; void Contest.Z; }),
        A(ct('devClaim'), () => { const Z2 = Contest.Z; Z2.lastRank = { wk: Z2.wk, rank: 2, c: CONTEST.RANK_RW[1][2].c, it: CONTEST.RANK_RW[1][2].it, l: 6, a: 933, seen: false }; }),
        A(ct('devWeekly'), () => { const W = Weekly.W; W.bonus = ['a', 'b', 'c', 'd', 'e']; W.vocab = ['a', 'b', 'c', 'd']; W.claimed = {}; })));
    return out;
  };
})();

/* ---------------- look ---------------- */
(function () {
  const css = `
.lc-head{display:flex;gap:10px;align-items:center;margin:4px 0 8px}.lc-best{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.lc-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-weight:800;font-size:13px;color:#fff;background:linear-gradient(180deg,var(--g),var(--c) 60%,var(--d));box-shadow:0 0 0 2px var(--d) inset,0 1px 3px rgba(0,0,0,.25);text-shadow:0 1px 0 var(--d);white-space:nowrap}
.lc-badge.sm{font-size:11px;padding:2px 8px}.lc-badge.none{background:var(--chip,#eee);color:var(--ink2,#777);box-shadow:none;text-shadow:none}
.lc-body{position:relative;display:flex;flex-direction:column;gap:6px;padding-bottom:6px}
.lc-ladder{position:relative;display:flex;flex-direction:column;gap:6px;padding:6px 2px}
.lc-summit{display:flex;align-items:center;gap:8px;justify-content:center;padding:4px 0;color:var(--ink2,#777)}.lc-summit.lit{color:#a07800;filter:drop-shadow(0 0 8px #ffd34d)}
.lc-step{position:relative;display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border-radius:14px;background:var(--card,#fff);border:2px solid transparent}
.lc-step.lock{opacity:.6;filter:grayscale(.5)}.lc-step.done,.lc-step.best{border-color:var(--c);background:linear-gradient(90deg,color-mix(in srgb,var(--g) 35%,transparent),transparent 70%)}
.lc-step.now{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 30%,transparent),0 6px 18px color-mix(in srgb,var(--c) 30%,transparent);animation:ctGlow 2.2s ease-in-out infinite}
.lc-step.fail{border-color:#d9566f55}
.lc-rail{position:absolute;left:41px;top:-8px;width:6px;height:10px;border-radius:3px;background:#ddd5e4}.lc-rail.lit{background:linear-gradient(var(--g),var(--c))}
.lc-step:first-of-type .lc-rail{display:none}
.lc-name{display:flex;gap:6px;align-items:center}.lc-here{font-size:11px;font-weight:800;color:#fff;background:var(--c);border-radius:999px;padding:1px 8px}
.lc-rw{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;font-size:12px;max-width:120px}.lc-rw.got{opacity:.55}.lc-gotmark{font-size:11px;color:#3f8a4f;font-weight:800}
.lc-me{position:absolute;left:-6px;top:-10px;animation:ctBob 1.6s ease-in-out infinite}
.lc-crest{position:relative;display:inline-block;width:var(--s);height:var(--s);flex:none}.lc-crest img{width:100%;height:100%;object-fit:contain;display:block}
.lc-crest.now img{filter:drop-shadow(0 0 calc(var(--s) * .12) var(--g,#fff))}.lc-crest.fail img{filter:grayscale(.65) brightness(.9)}.lc-crest.lock img{filter:grayscale(1) brightness(1.15) contrast(.75);opacity:.45}
.lc-lock{position:absolute;right:2%;bottom:4%;width:30%;height:auto}.lc-check{position:absolute;right:-2%;bottom:0;width:34%;height:auto}
.lc-prog{position:relative;display:grid;grid-template-columns:repeat(15,1fr);gap:2px;margin-top:4px;height:9px}
.lc-prog i{border-radius:3px;background:#e6e0ec}.lc-prog i.ok{background:#3f8a4f}.lc-prog i.no{background:#d9566f}.lc-prog i.cur{background:var(--c,#8c5aa8);animation:ctBlink 1s steps(2) infinite}
.lc-need{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1.5px;background:#4a3a52;border-radius:2px}
.lc-need::after{content:'11';position:absolute;top:-13px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:800;color:#4a3a52}
.lc-cta{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0 2px}.lc-go{font-size:17px;padding:12px 22px;box-shadow:0 6px 0 rgba(0,0,0,.12)}
.lc-strip{display:flex;gap:10px;align-items:center;padding:8px 10px;margin-bottom:8px;border-radius:12px;border:2px solid var(--c);background:linear-gradient(90deg,color-mix(in srgb,var(--g) 40%,transparent),transparent)}
.lc-strip-t{display:flex;justify-content:space-between;gap:8px}.lc-strip-s{margin-top:2px}
.lc-break{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:4px 0}
.lc-stage{position:relative;width:240px;height:170px;display:flex;align-items:center;justify-content:center;overflow:visible}
.lc-rays{position:absolute;inset:-30px;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--g) 70%,transparent) 0 10deg,transparent 10deg 24deg);border-radius:50%;mask:radial-gradient(circle,#000 25%,transparent 70%);-webkit-mask:radial-gradient(circle,#000 25%,transparent 70%);animation:ctSpin 9s linear infinite,ctFadeIn .6s .55s both}
.lc-old{position:absolute;animation:ctCrack .7s ease-in forwards}.lc-stage.dim .lc-old{animation:none}.lc-old.shake{animation:ctShake .6s ease-in-out 2}
.lc-new{position:absolute;animation:ctPop .7s .55s cubic-bezier(.2,1.6,.4,1) both}
.lc-shards i{position:absolute;left:50%;top:50%;width:16px;height:20px;margin:-10px -8px;background:linear-gradient(var(--g),var(--c));clip-path:polygon(50% 0,100% 60%,30% 100%,0 40%);transform:rotate(var(--a)) translateY(0);opacity:0;animation:ctShard .9s .45s ease-out forwards}
.lc-next-peek{position:absolute;right:-6px;top:-4px;display:flex;flex-direction:column;align-items:center;font-weight:900;color:var(--c);animation:ctFadeIn .5s 1.2s both,ctBob 1.6s 1.7s ease-in-out infinite}
.lc-big{margin:4px 0 0;font-size:28px;letter-spacing:.04em;background:linear-gradient(180deg,#4a3a52,#8c5aa8);-webkit-background-clip:text;background-clip:text;color:transparent;animation:ctFadeIn .4s .9s both}
.lc-break.pass .lc-big{background:linear-gradient(180deg,#b07a00,#e8a400 50%,#8c5a00);-webkit-background-clip:text;background-clip:text}
.lc-score{font-size:15px;font-weight:700;margin:0}.lc-actions{margin-top:6px;gap:8px}.lc-keep{display:flex;gap:8px;align-items:center;justify-content:center}
.lc-rankcard{display:flex;gap:10px;align-items:center;padding:10px;border-radius:12px;background:linear-gradient(90deg,#fff3c4,transparent);border:2px solid #e8b400}
.lc-board li{list-style:none}.lc-brow{display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:10px}.lc-brow.me{background:color-mix(in srgb,#8c5aa8 14%,transparent);outline:2px solid #8c5aa8}
.lc-brow.top1 .brank{color:#c08d00}.lc-brow.top2 .brank{color:#7d8790}.lc-brow.top3 .brank{color:#a8693a}.lc-brow .brank{min-width:26px;text-align:center;font-weight:900}
.lc-mine{margin-top:8px;border-top:1px dashed var(--line,#ddd);padding-top:6px}
.lc-rankrw.top1{border-color:#e8b400}.lc-rankno{min-width:62px;font-weight:900;font-size:15px}.lc-hist{display:flex;gap:10px;align-items:center;padding:3px 0}
.lc-mini{display:flex;gap:4px;margin:6px 0}.lc-entry{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:8px 10px;margin:4px 0 8px;border-radius:12px;border:2px solid #d39b12;background:linear-gradient(90deg,#fff3c4,transparent 80%);cursor:pointer}
.lc-entry .grow{display:flex;flex-direction:column}
@keyframes ctGlow{50%{box-shadow:0 0 0 5px color-mix(in srgb,var(--c) 22%,transparent),0 8px 22px color-mix(in srgb,var(--c) 40%,transparent)}}
@keyframes ctBob{50%{transform:translateY(-4px)}}@keyframes ctBlink{50%{opacity:.35}}@keyframes ctSpin{to{transform:rotate(360deg)}}@keyframes ctFadeIn{from{opacity:0;transform:scale(.9)}}
@keyframes ctCrack{0%{transform:scale(1)}40%{transform:scale(1.08) rotate(-3deg)}70%{transform:scale(1.12) rotate(3deg);opacity:1;filter:brightness(1.6)}100%{transform:scale(1.4);opacity:0;filter:brightness(3)}}
@keyframes ctPop{from{transform:scale(.2) translateY(30px);opacity:0}to{transform:none;opacity:1}}
@keyframes ctShard{0%{opacity:1;transform:rotate(var(--a)) translateY(0)}100%{opacity:0;transform:rotate(var(--a)) translateY(-110px) rotate(200deg)}}
@keyframes ctShake{25%{transform:translateX(-6px) rotate(-2deg)}75%{transform:translateX(6px) rotate(2deg)}}
@media (prefers-reduced-motion:reduce){.lc-step.now,.lc-me,.lc-rays,.lc-old,.lc-new,.lc-shards i,.lc-next-peek,.lc-big,.lc-prog i.cur{animation:none!important}.lc-old{display:none}}
`;
  const st = document.createElement('style'); st.id = 'contest-css'; st.textContent = css; document.head.append(st);
})();

// rank rewards of last week: checked once the cloud is ready after a new week
setTimeout(function check() { try { if (Game.S && Contest.Z.claim) { if (Contest.online()) Contest.claimRank(); else setTimeout(check, 60e3); } } catch (e) { } }, 15e3);
