/* ============================================================
   0.92.46 Purr Cozy: English grade placement (小一～高三), "搬家日" + daily probe
   - First time ("搬家日"): the cat brings in moving boxes with English labels; 8–12 adaptive
     questions give a first estimate of the player's vocabulary grade (θ on a 1–12 grade scale).
   - Every day after that: a fixed daily task "程度小測" (8 questions) updates the estimate with a
     Bayesian step (yesterday's estimate is the prior, widened a little for each day that passed),
     so the grade shown is stable from day to day but follows real growth over weeks.
   - Model: 3-parameter logistic on the grade scale. Every word carries an estimated grade g
     (vocab.js); a question's difficulty is g plus an offset for its type (spelling is harder than
     recognition). Choice questions have a 25 % guessing floor, spelling none.
   - What it changes elsewhere: the Adaptive ability baseline (so the daily words fit from day
     one), the checked Levels on the first placement, the daily task list (c_grade), the name
     card (grade tag, switchable in Settings), one furniture gift (英文程度獎狀), and the learning
     log (kind 'grade' with a `pl` summary per session).
   - Rewards are fixed per session and never depend on the score, so there is nothing to gain
     from answering wrong on purpose.
   ============================================================ */
const PLACE = {
  A: 1.1,                                            // discrimination per grade unit
  OFF: { en2zh: 0, zh2en: 0.4, spell: 0.7 },         // question-type difficulty offsets (grades); spelling keeps its first-letter hint
  GUESS: { en2zh: 0.25, zh2en: 0.25, spell: 0 },
  GRID: { lo: 0.5, hi: 13, step: 0.1 },
  first: { max: 12, min: 8, stopSe: 0.75, sd: 3 },
  daily: { max: 8, min: 8, drift: 0.12, sdMin: 0.6, sdMax: 2 },
  recent: 80,                                        // words kept out of the next probes
  reward: { first: { c: 60, x: 40 }, daily: { c: 10, x: 10 } },
  POS_OK: ['n', 'v', 'adj', 'adv', 'num', 'interj'],
};
const Placement = {
  // ---------- state ----------
  S() { const S = Game.S; if (!S.grade) S.grade = { v: 1, theta: null, se: null, n: 0, declared: 0, first: '', last: '', hist: [], recent: [], anchor: null, asked: 0, cert: false }; return S.grade; },
  show() { const st = Game.S.settings; return st.showGrade !== false; },
  done() { return this.S().theta != null; },
  todayDone() { const g = this.S(); return g.last === Life.today(); },
  gnum(t) { return Math.max(1, Math.min(12, Math.round(t))); },
  label(g) { return I18n.t('pl.g' + Math.max(1, Math.min(12, g))); },
  band(g) { return I18n.t(g <= 6 ? 'pl.bandE' : g <= 9 ? 'pl.bandJ' : 'pl.bandS'); },
  range(t, se) { const lo = this.gnum(t - se), hi = this.gnum(t + se); return lo === hi ? this.label(lo) : I18n.t('pl.range', [this.label(lo), this.label(hi)]); },
  publicLabel() { const g = this.S(); return this.done() && this.show() ? 'G' + this.gnum(g.theta) : ''; },   // language-neutral; readers show it with gradeTag()
  gradeToD(t) {
    const P = [[1, .3], [2, .4], [4, .6], [6, .8], [7, 1], [9, 1.4], [10, 1.8], [11, 3.5], [12, 5.5], [13, 6]];
    if (t <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; return y0 + (y1 - y0) * (t - x0) / (x1 - x0); } return P[P.length - 1][1];
  },
  // ---------- model ----------
  prob(theta, b, c) { return c + (1 - c) / (1 + Math.exp(-PLACE.A * (theta - b))); },
  posterior(mu, sd, resp) {
    const { lo, hi, step } = PLACE.GRID; let sum = 0, s1 = 0, s2 = 0; const ws = [];
    for (let t = lo; t <= hi + 1e-9; t += step) {
      let l = -((t - mu) ** 2) / (2 * sd * sd);
      for (const r of resp) { const p = this.prob(t, r.b, r.c); l += Math.log(r.ok ? p : 1 - p); }
      ws.push([t, l]);
    }
    const m = Math.max(...ws.map(w => w[1]));
    for (const [t, l] of ws) { const w = Math.exp(l - m); sum += w; s1 += w * t; s2 += w * t * t; }
    const mean = s1 / sum, v = Math.max(0.01, s2 / sum - mean * mean);
    return { theta: mean, se: Math.sqrt(v) };
  },
  // ---------- questions ----------
  pool(type, s) {
    const run = s.run, g = this.S(), recent = new Set(g.recent || []);
    return VOCAB.filter(v => v.g && PLACE.POS_OK.includes(v.ps[0]) && !run.seen.has(v.i) && !recent.has(v.w) && !/[ .'/]/.test(v.w)
      && (type !== 'spell' || (Learn.spellable(v) && v.w.length <= (run.theta < 4 ? 5 : 8))));
  },
  options(v, field) {
    const text = o => field === 'w' ? Learn.norm(o.w) : Learn.qz(o), pos = v.ps[0], ok = o => !Learn.clash(v, o, field) && !/[ .'/]/.test(o.w);
    const near = w => VOCAB.filter(o => o.g && Math.abs(o.g - v.g) <= w && o.ps.includes(pos) && ok(o));
    let c = near(v.g <= 6 ? 2 : 1); if (c.length < 8) c = near(4); if (c.length < 8) c = VOCAB.filter(o => o.ps.includes(pos) && ok(o)); if (c.length < 3) c = VOCAB.filter(ok);
    const pick = [], seen = new Set([text(v)]);
    for (const o of shuffle(c.slice())) { const t = text(o); if (seen.has(t) || pick.some(p => Learn.clash(p, o, field))) continue; seen.add(t); pick.push(o); if (pick.length === 3) break; }
    return shuffle([v, ...pick]).map(x => x.i);
  },
  nextQuestion(s) {
    const run = s.run, n = run.resp.length, seq = ['en2zh', 'zh2en', 'spell'];
    let type = seq[n % 3]; if (type === 'spell' && run.theta < 2.2 && n % 6 !== 2) type = 'en2zh';   // beginners: fewer spelling questions
    const target = run.theta + (n === 0 ? -1.2 : 0.3);                                             // an easy opener, then the most informative item
    let cand = this.pool(type, s); if (!cand.length) { type = 'en2zh'; cand = this.pool(type, s); } if (!cand.length) return null;
    const beff = v => v.g + PLACE.OFF[type];
    cand.sort((a, b) => Math.abs(beff(a) - target) - Math.abs(beff(b) - target) || Math.random() - .5);
    const v = cand[Math.floor(Math.random() * Math.min(8, cand.length))];
    run.seen.add(v.i);
    const b = beff(v), c = PLACE.GUESS[type];
    return { i: v.i, type, b, c, pp: Math.round(this.prob(run.theta, b, c) * 1000) / 1000, noHint: false, opts: type === 'spell' ? null : this.options(v, type === 'zh2en' ? 'w' : 'z'), ctx: this.ctx(s, n) };
  },
  ctx(s, n) {
    if (s.opts.mode === 'first') return I18n.t('pl.box' + Math.min(12, n + 1));
    const k = (n === 0) ? 'pl.dailyHi' : n === PLACE.daily.max - 1 ? 'pl.dailyLast' : null; return k ? I18n.t(k) : '';
  },
  shouldStop(s) { const r = s.run, cfg = PLACE[s.opts.mode === 'first' ? 'first' : 'daily'], n = r.resp.length; return n >= cfg.max || (n >= cfg.min && r.se < (cfg.stopSe || 0)); },
  // ---------- a session ----------
  begin(mode) {
    const g = this.S(), first = mode === 'first';
    let mu, sd;
    if (first || g.theta == null) { mode = 'first'; mu = g.declared ? Math.min(12, Math.max(1, g.declared)) : 4; sd = PLACE.first.sd; }
    else { const days = Math.max(1, Math.round((gameDate().getTime() - new Date(g.last + 'T06:00').getTime()) / 864e5)); mu = g.theta; sd = Math.min(PLACE.daily.sdMax, Math.max(PLACE.daily.sdMin, Math.sqrt(g.se * g.se + PLACE.daily.drift * days))); }
    const run = { mode, mu, sd, resp: [], seen: new Set(), theta: mu, se: sd, recordedQi: -1 };
    const s = { kind: 'grade', opts: { mode }, words: [], nq: PLACE[first ? 'first' : 'daily'].max, step: 'quiz', ri: 0, flip: false, unsure: [], qs: [], qi: 0, ans: null, right: 0, wrong: [], newly: 0, mastered: 0, result: null, spoke: -1, run };
    const q = this.nextQuestion(s); if (!q) return null; s.qs.push(q); s.words.push(q.i);
    return s;
  },
  record(s) {
    const run = s.run; if (!s.ans || run.recordedQi === s.qi) return; run.recordedQi = s.qi;
    const q = s.qs[s.qi]; run.resp.push({ b: q.b, c: q.c, ok: !!s.ans.ok, w: VOCAB[q.i].w, type: q.type });
    Object.assign(run, this.posterior(run.mu, run.sd, run.resp));
  },
  finish(s) {
    if (!s || s.step !== 'quiz' || s.result) return;
    if (s.ans) this.record(s);
    s.step = 'result';
    const g = this.S(), run = s.run, first = run.mode === 'first', day = Life.today(), prev = g.theta;
    const theta = Math.round(run.theta * 100) / 100, se = Math.round(run.se * 100) / 100;
    g.theta = theta; g.se = se; g.n += run.resp.length; g.last = day; if (!g.first) g.first = day;
    g.hist = (g.hist || []).filter(x => x.d !== day); g.hist.push({ d: day, t: theta, se, n: run.resp.length, r: s.right }); g.hist = g.hist.slice(-120);
    g.recent = [...(g.recent || []), ...run.resp.map(r => r.w)].slice(-PLACE.recent);
    this.anchor(theta, first);
    const rw = PLACE.reward[first ? 'first' : 'daily'];
    const res = { coins: rw.c, xp: rw.x, items: [], msg: '' };
    res.grade = { theta, se, g: this.gnum(theta), prev, first };
    let gift = false;
    if (!g.cert && ITEMS.grade_cert) { g.cert = true; const S = Game.S; S.inv.grade_cert = (S.inv.grade_cert || 0) + 1; gift = true; res.items = []; }
    res.msg = first ? I18n.t('pl.firstDone', [this.label(res.grade.g)]) : prev != null && Math.abs(theta - prev) >= 0.5 ? I18n.t(theta > prev ? 'pl.up' : 'pl.down', [this.label(res.grade.g)]) : I18n.t('pl.steady', [this.label(res.grade.g)]);
    res.coins = Game.reward(res.coins, res.xp, 'quiz');
    s.result = res; s.pl = { m: run.mode, t: theta, se, n: run.resp.length, r: s.right, g: res.grade.g, d: g.declared || 0, p: prev == null ? -1 : prev, mu: Math.round(run.mu * 100) / 100, sd: Math.round(run.sd * 100) / 100 };
    this.completeTask();
    if (first) setTimeout(() => UI.toast(I18n.s("u_ad58744f914c"), 'i_sparkle', 7), 2600);   // 0.93.7: the daily-words tip, now that it is the next step
    if (gift) UI.toast(I18n.t('pl.certGift'), 'i_star', 6, { label: I18n.s("u_36441bffaeab"), fn: () => { UI.closeWin('study'); Game.place('grade_cert'); } });
    if (typeof Social !== 'undefined' && Social.ready && Social.ready()) { try { Social.publish(true); } catch (e) { } }
    UI.badges(); UI.refresh('learn'); UI.refresh('placement'); Game.save(); saveSoon();
    return res;
  },
  // the Adaptive ability baseline follows the measured grade: set on the first placement, re-anchored when the grade moves a full step
  anchor(theta, first) {
    const g = this.S(), a = Adaptive.state(), d = this.gradeToD(theta);
    if (g.anchor == null) {
      const base = .75 * d + Math.log(Adaptive.target / (1 - Adaptive.target));
      for (const k of Adaptive.skills) a.skills[k].ability = base - (k === 'meaning' || k === 'listen' ? .35 : 0);
      if (first) Learn.L.levels = theta < 7.5 ? [1] : theta < 9.5 ? [1, 2] : theta < 10.5 ? [1, 2, 3] : theta < 11.5 ? [1, 2, 3, 4] : [];   // 0.93.6: 國二～國三 also get Level 2
    } else if (Math.abs(theta - g.anchor) >= 1) {
      const delta = .75 * (d - this.gradeToD(g.anchor));
      for (const k of Adaptive.skills) a.skills[k].ability = Adaptive.clamp(a.skills[k].ability + delta, -2, 9);
    } else return;
    g.anchor = theta; a.at = Math.max(Date.now(), (a.at || 0) + 1);
  },
  completeTask() {
    Life.ensureDaily(); const t = (Life.L.daily.tasks || []).find(x => x.k === 'c_grade'); if (!t || t.prog >= t.need) return;
    t.prog = t.need; t.tier = t.tier || 'n';
    UI.toast(I18n.s("u_202ec2a6caff", [TASK_DEFS.c_grade.t(t)]), 'i_task', 3.5, { label: I18n.s("u_92edf81e0715"), fn: () => { UI.closeWin('study'); UI.openTasks('daily'); } });
    UI.refresh('tasks'); UI.badges();
  },
  // ---------- entry points ----------
  open() { if (!this.done()) { UI.openWin('placement'); return; } if (this.todayDone()) { UI.openWin('placement'); return; } this.startDaily(); },
  startFirst() { const g = this.S(); const sel = document.getElementById('pl-declared'); if (sel) g.declared = +sel.value || 0; g.asked = 99; Game.save(); UI.closeWin('placement'); Learn.start('grade', { mode: 'first' }); },
  startDaily() { if (this.todayDone()) return UI.openWin('placement'); UI.closeWin('placement'); Learn.start('grade', { mode: 'daily' }); },
  later() { const g = this.S(); g.asked = (g.asked || 0) + 1; Game.save(); UI.closeWin('placement'); },
  toggleShow() { const st = Game.S.settings; st.showGrade = !this.show(); Game.save(); UI.refresh('settings'); UI.refresh('placement'); if (typeof Social !== 'undefined' && Social.ready && Social.ready()) { try { Social.publish(true); } catch (e) { } } },
  setDeclared(v) { this.S().declared = +v || 0; Game.save(); },
  // ---------- views ----------
  declaredSelect(id) {
    const g = this.S();
    return h('select', { id, class: 'pl-select', onchange: e => { if (id === 'pl-declared2') this.setDeclared(e.target.value); } }, h('option', { value: '0', text: I18n.t('pl.declNone') }), ...Array.from({ length: 12 }, (_, i) => h('option', { value: String(i + 1), selected: g.declared === i + 1 ? true : null, text: this.band(i + 1) + ' ' + this.label(i + 1) })));
  },
  badge(g, big) { return h('div', { class: 'pl-badge' + (big ? ' big' : '') }, h('span', { class: 'pl-band', text: this.band(g) }), h('b', { class: 'pl-grade', text: this.label(g) })); },
  chart() {
    const g = this.S(), H = (g.hist || []).slice(-40); if (H.length < 2) return h('p', { class: 'hint center', text: I18n.t('pl.chartSoon') });
    const W = 400, Hh = 150, L = 34, R = 10, T = 10, B = 24, ns = 'http://www.w3.org/2000/svg';
    const ys = H.flatMap(x => [x.t - x.se, x.t + x.se]), ylo = Math.max(1, Math.floor(Math.min(...ys)) - 0.5), yhi = Math.min(12, Math.ceil(Math.max(...ys)) + 0.5);
    const X = i => L + (W - L - R) * (H.length === 1 ? .5 : i / (H.length - 1)), Y = t => T + (Hh - T - B) * (1 - (t - ylo) / (yhi - ylo));
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`); svg.setAttribute('class', 'pl-chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', I18n.t('pl.chartAria'));
    const el = (tag, attrs, txt) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (txt != null) e.textContent = txt; svg.append(e); return e; };
    for (let gr = Math.ceil(ylo); gr <= yhi; gr++) { el('line', { x1: L, x2: W - R, y1: Y(gr), y2: Y(gr), class: 'pl-grid' }); el('text', { x: L - 4, y: Y(gr) + 4, class: 'pl-ylab', 'text-anchor': 'end' }, this.label(gr)); }
    const band = H.map((x, i) => `${X(i)},${Y(x.t + x.se)}`).concat(H.map((x, i) => `${X(i)},${Y(x.t - x.se)}`).reverse()).join(' ');
    el('polygon', { points: band, class: 'pl-band-area' });
    el('polyline', { points: H.map((x, i) => `${X(i)},${Y(x.t)}`).join(' '), class: 'pl-line' });
    H.forEach((x, i) => el('circle', { cx: X(i), cy: Y(x.t), r: 3, class: 'pl-dot' }));
    el('text', { x: L, y: Hh - 6, class: 'pl-xlab' }, H[0].d.slice(5)); el('text', { x: W - R, y: Hh - 6, class: 'pl-xlab', 'text-anchor': 'end' }, H[H.length - 1].d.slice(5));
    return svg;
  },
  window() {
    const g = this.S();
    if (!this.done()) {
      return [h('div', { class: 'pl-intro' }, ico('i_sparkle', 36), h('p', { class: 'pl-story', text: I18n.t('pl.introStory') }), h('p', { class: 'hint', text: I18n.t('pl.introHint') })),
        h('div', { class: 'row pl-row' }, h('span', { text: I18n.t('pl.declAsk') }), this.declaredSelect('pl-declared')),
        h('p', { class: 'hint', text: I18n.t('pl.declWhy') }),
        h('div', { class: 'row center sbtns' }, h('button', { class: 'chip big', onclick: () => this.later() }, I18n.t('pl.later')), h('button', { class: 'chip big primary', onclick: () => this.startFirst() }, ico('i_learn', 22), I18n.t('pl.startFirst')))];
    }
    const gn = this.gnum(g.theta), H = g.hist || [], last = H[H.length - 1], before = H.length > 1 ? H[H.length - 2] : null, firstH = H[0];
    const delta = before ? g.theta - before.t : 0, week = H.filter(x => x.d >= dayKey(gameDate(-7)));
    const stat = (v, l) => h('div', { class: 'lstat' }, h('b', { class: 'num', text: v }), h('span', { text: l }));
    return [h('div', { class: 'pl-top' }, this.badge(gn, true), h('div', { class: 'grow' },
        h('p', { class: 'pl-range', text: I18n.t('pl.rangeLine', [this.range(g.theta, g.se)]) }),
        h('p', { class: 'hint', text: I18n.t('pl.measures') }),
        this.todayDone() ? h('p', { class: 'pl-done', text: I18n.t('pl.todayDone', [last ? last.r + '/' + last.n : '']) }) : h('button', { class: 'chip primary', onclick: () => this.startDaily() }, ico('i_learn', 20), I18n.t('pl.startDaily')))),
      h('div', { class: 'lstats pl-stats' }, stat(String(H.length), I18n.t('pl.statTimes')), stat((delta >= 0 ? '+' : '') + delta.toFixed(1), I18n.t('pl.statDelta')), stat(firstH ? this.label(this.gnum(firstH.t)) : '–', I18n.t('pl.statFirst')), stat(String(week.length), I18n.t('pl.statWeek'))),
      h('div', { class: 'sub', text: I18n.t('pl.chartTitle') }), this.chart(),
      h('div', { class: 'sub', text: I18n.t('pl.settings') }),
      h('div', { class: 'row wrap' }, h('button', { class: 'chip' + (this.show() ? ' on' : ''), 'aria-pressed': String(this.show()), onclick: () => this.toggleShow() }, ico('i_people', 20), this.show() ? I18n.t('pl.showOn') : I18n.t('pl.showOff')),
        h('label', { class: 'row pl-row' }, h('span', { class: 'hint', text: I18n.t('pl.declLabel') }), this.declaredSelect('pl-declared2'))),
      h('p', { class: 'hint', text: I18n.t('pl.footnote') })];
  },
  resultCard(s) {
    const r = s.result.grade, g = this.S(), arrow = r.prev == null ? '' : r.theta - r.prev >= 0.5 ? '▲' : r.theta - r.prev <= -0.5 ? '▼' : '◆';
    return h('div', { class: 'pl-card' }, this.badge(r.g, true), h('div', { class: 'grow' },
      h('p', { class: 'pl-range', text: I18n.t('pl.rangeLine', [this.range(r.theta, r.se)]) }),
      r.prev != null ? h('p', { class: 'hint', text: `${arrow} ${I18n.t('pl.vsLast', [(r.theta - r.prev >= 0 ? '+' : '') + (r.theta - r.prev).toFixed(1)])}` }) : h('p', { class: 'hint', text: I18n.t('pl.firstNote') }),
      h('button', { class: 'chip sm', onclick: () => { UI.closeWin('study'); UI.openWin('placement'); } }, ico('i_book', 18), I18n.t('pl.seeChart'))));
  },
  // the first visit: offer the moving-day placement once the room is ready (at most three times)
  tryIntro() {
    if (!Game.S || this.done() || (this.S().asked || 0) >= 3) return;
    if (UI.introUntil && Date.now() < UI.introUntil) return void setTimeout(() => this.tryIntro(), UI.introUntil - Date.now());   // 0.93.7: let the cat finish first
    if (typeof Visit !== 'undefined' && Visit.active) return;
    if (UI.wins && UI.wins.study && !UI.wins.study.el.hidden) return;
    this.S().asked = (this.S().asked || 0) + 1; Game.save();
    UI.openWin('placement');
  },
};

/* ---------------- wiring ---------------- */
(function () {
  if (typeof Learn === 'undefined' || typeof UI === 'undefined') return;
  // furniture: the certificate reuses the diploma artwork (new ids need a PNG entry, so the entry is aliased)
  if (ITEMS.diploma && PNGArt.meta.items.diploma && !ITEMS.grade_cert) {
    ITEMS.grade_cert = Object.assign({}, ITEMS.diploma, { id: 'grade_cert', n: I18n.t('pl.certName'), price: 0, lvl: 1, giftOnly: true, special: true, gradeCert: true, desc: I18n.t('pl.certDesc') });
    PNGArt.meta.items.grade_cert = PNGArt.meta.items.diploma;
  }
  const tag = Pets.ownerTag.bind(Pets);
  Pets.ownerTag = function (it) { const d = it && ITEMS[it.k]; if (d && d.gradeCert && Placement.done()) { const g = Placement.S(); return I18n.t('pl.certTip', [Placement.label(Placement.gnum(g.theta)), g.last]); } return tag(it); };
  // daily task
  TASK_DEFS.c_grade = { t: () => I18n.t('pl.task'), need: () => 1, rw: { c: 30, x: 30 }, go: 'grade' };
  const ensure = Life.ensureDaily.bind(Life);
  Life.ensureDaily = function () { ensure(); const D = this.L.daily; if (!D || D.tasks.some(t => t.k === 'c_grade')) return; const task = { k: 'c_grade', need: 1, prog: Placement.todayDone() ? 1 : 0, claimed: false, tier: 'n' }; const i = D.tasks.findIndex(t => t.k === 'c_spell'); if (i >= 0) D.tasks.splice(i + 1, 0, task); else D.tasks.push(task); };
  const go = UI.go.bind(UI); UI.go = function (where, t) { if (where === 'grade') return Placement.open(); return go(where, t); };
  // window
  UI.WIN.placement = { t: I18n.t('pl.winTitle'), i: 'i_learn', w: 460, at: ['c', 0] };
  UI.w_placement = function () { return Placement.window(); };
  // quiz sessions of kind 'grade'
  const start = Learn.start.bind(Learn);
  Learn.start = function (kind, opts = {}) {
    if (kind !== 'grade') return start(kind, opts);
    if (typeof LevelGate !== 'undefined' && this.sess && this.sess.kind === 'levelgate' && this.sess.step !== 'result') LevelGate.abandon();
    const s = Placement.begin(opts.mode); if (!s) return UI.toast(I18n.t('pl.noWords'), 'i_learn', 3);
    this.sess = s; UI.openWin('study'); setTimeout(() => { if (this.sess === s) Adaptive.prepare(s); }, 0);
  };
  const next = Learn.next.bind(Learn);
  Learn.next = function () { const s = this.sess; if (s && s.kind === 'grade' && s.ans && !s.result) { Placement.record(s); if (!Placement.shouldStop(s)) { const q = Placement.nextQuestion(s); if (q) { s.qs.push(q); s.words.push(q.i); } } } return next(); };
  const finish = Learn.finish.bind(Learn);
  Learn.finish = function () { const s = this.sess; if (s && s.kind === 'grade') return Placement.finish(s); return finish(); };
  // placement answers do not move the per-skill ability or the 70–85 % feel (they are measured, not practised); no lucky rewards either
  const note = Adaptive.note.bind(Adaptive); Adaptive.note = function (session, i, type, ok, q) { if (session && session.kind === 'grade') return false; return note(session, i, type, ok, q); };
  const fnote = Feel.note.bind(Feel); Feel.note = function (s, ok) { if (s && s.kind === 'grade') return; return fnote(s, ok); };
  const luck = Feel.luck.bind(Feel); Feel.luck = function (s, q) { if (s && s.kind === 'grade') return null; return luck(s, q); };
  // study window: title, "question n of at most N", result card
  const study = UI.w_study.bind(UI);
  UI.w_study = function () {
    const out = study(), s = Learn.sess; if (!s || s.kind !== 'grade') return out;
    const root = out[0], title = root && root.querySelector && root.querySelector('.shead b'), cnt = root && root.querySelector && root.querySelector('.shead .num.hint'), bar = root && root.querySelector && root.querySelector('.pbar i');
    if (title) title.textContent = I18n.t(s.opts.mode === 'first' ? 'pl.titleFirst' : 'pl.titleDaily');
    if (s.step === 'quiz') { if (cnt) cnt.textContent = I18n.t('pl.qCount', [s.qi + 1, s.nq]); if (bar) bar.style.width = Math.round(s.qi / s.nq * 100) + '%'; }
    if (s.step === 'result' && s.result && s.result.grade) { const k = out.findIndex(n => n && n.classList && n.classList.contains('result')); out.splice(k >= 0 ? k + 1 : 0, 0, Placement.resultCard(s)); }
    return out;
  };
  // settings card + a line in the learn window
  const settings = UI.w_settings.bind(UI);
  UI.w_settings = function () {
    const out = settings(...arguments), g = Placement.S();
    const card = h('section', { class: 'settings-card pl-settings' }, h('b', { text: I18n.t('pl.winTitle') }),
      h('p', { class: 'hint', text: Placement.done() ? I18n.t('pl.settingsLine', [Placement.label(Placement.gnum(g.theta)), g.last]) : I18n.t('pl.settingsNone') }),
      h('div', { class: 'row wrap' }, h('button', { class: 'chip' + (Placement.show() ? ' on' : ''), 'aria-pressed': String(Placement.show()), onclick: () => Placement.toggleShow() }, ico('i_people', 20), Placement.show() ? I18n.t('pl.showOn') : I18n.t('pl.showOff')),
        h('button', { class: 'chip', onclick: () => { UI.closeWin('settings'); Placement.open(); } }, ico('i_learn', 20), Placement.done() ? I18n.t('pl.open') : I18n.t('pl.startFirst'))));
    if (Array.isArray(out)) out.push(card); else if (out && out.append) out.append(card);
    return out;
  };
  const learn = UI.w_learn.bind(UI);
  UI.w_learn = function () {
    const out = learn(...arguments), g = Placement.S();
    const row = h('div', { class: 'pl-learnrow' }, Placement.done() ? Placement.badge(Placement.gnum(g.theta)) : h('span', { class: 'hint', text: I18n.t('pl.settingsNone') }),
      h('button', { class: 'chip sm' + (!Placement.done() || !Placement.todayDone() ? ' primary' : ''), onclick: () => Placement.open() }, ico('i_learn', 18), !Placement.done() ? I18n.t('pl.startFirst') : Placement.todayDone() ? I18n.t('pl.open') : I18n.t('pl.startDaily')));
    if (Array.isArray(out)) out.splice(1, 0, row);
    return out;
  };
  // name card: the grade tag next to the level (only when the player shows it)
  if (typeof Social !== 'undefined') {
    const card = Social.card.bind(Social); Social.card = function () { const c = card(); c.grade = Placement.publicLabel(); return c; };
    const wcard = UI.w_card.bind(UI);
    UI.w_card = function () { const out = wcard(), C = Social.cardSt, c = C && C.c; if (c && c.grade && out[0] && out[0].querySelector) { const nm = out[0].querySelector('.cardname'), tag = UI.gradeTag ? UI.gradeTag(c.grade) : null; if (nm && tag) nm.append(tag); } return out; };
  }
  // developer reset of vocabulary progress also clears the placement
  if (typeof Dev !== 'undefined' && Dev.resetPart) { const rp = Dev.resetPart.bind(Dev); Dev.resetPart = function (part) { if (part === 'vocab' && Game.S) delete Game.S.grade; return rp(part); }; }
  // styles
  document.head.append(h('style', { html: `
.pl-badge{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;min-width:64px;padding:6px 10px;background:var(--chip-on);box-shadow:inset 0 0 0 2px var(--ink);line-height:1.1}
.pl-badge.big{min-width:96px;padding:10px 14px}.pl-badge .pl-band{font-size:11px;color:var(--ink-2)}.pl-badge .pl-grade{font-size:20px}.pl-badge.big .pl-grade{font-size:30px}
.pl-top,.pl-card{display:flex;gap:14px;align-items:center;padding:8px 0}.pl-card{background:var(--paper-2);padding:10px 12px;margin:8px 0}
.pl-range{margin:0 0 4px;font-weight:700}.pl-done{margin:4px 0 0;color:var(--mint);font-weight:700}
.pl-intro{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:8px 0}.pl-story{margin:0;font-size:15px;line-height:1.6}
.pl-row{gap:8px;align-items:center}.pl-select{font:inherit;padding:4px 6px;background:var(--paper);color:var(--ink);border:0;box-shadow:inset 0 0 0 2px var(--line)}
.pl-stats{grid-template-columns:repeat(4,1fr)}.pl-chart{width:100%;height:auto;display:block;background:var(--paper-2);margin:4px 0 8px}
.pl-grid{stroke:var(--line);stroke-width:1}.pl-ylab,.pl-xlab{font-size:10px;fill:var(--ink-2)}.pl-band-area{fill:var(--primary);opacity:.25}.pl-line{fill:none;stroke:var(--ink);stroke-width:2}.pl-dot{fill:var(--rose)}
.pl-learnrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:var(--paper-2);margin:0 0 8px}
.ptag.pl-tag{background:var(--chip-on);margin-left:6px;font-size:11px;vertical-align:middle;white-space:nowrap}.bname .pl-tag,.frname .pl-tag{font-weight:400}` }));
  // first visit
  const poll = setInterval(() => { if (!Game.S || !UI.el || !UI.el.lvl) return; if (document.body.classList.contains('mini')) return; clearInterval(poll); setTimeout(() => Placement.tryIntro(), 3500); }, 1000);
})();
