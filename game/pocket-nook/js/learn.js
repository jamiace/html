/* ============================================================
   Learn: spaced-repetition vocabulary, daily review + quiz,
   study-for-items, practice, word book
   ============================================================ */
const SRS_INT = [0, 1, 2, 4, 7, 15]; // days until the next review for box 0..5
const Learn = {
  sess: null,
  get P() { return Game.S.vocab; },   // { word: [box, dueDay, seen, right, wrong] }
  get L() { return Game.S.learn; },
  newState() { return { streak: 0, best: 0, lastDone: '', dailyDay: '', dailyWords: [], dailyDone: false, reviewed: 0, dailyScore: '', pDay: '', pCoins: 0, levels: [], v: 2 }; },
  dayNum() { const d = gameDate(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); },
  yesterday() { return dayKey(gameDate(-1)); },
  rec(i) { return this.P[VOCAB[i].w]; },
  recMake(i, init) { const k = VOCAB[i].w; return this.P[k] || (this.P[k] = init); },
  box(i) { const r = this.rec(i); return r ? r[0] : 0; },
  levelsOn() { const l = this.L.levels; return l && l.length ? l : VLEVELS; },
  toggleLevel(t) { const cur = this.levelsOn().slice(), k = cur.indexOf(t); if (k >= 0) { if (cur.length > 1) cur.splice(k, 1); } else cur.push(t); cur.sort((a, b) => a - b); this.L.levels = cur.length === VLEVELS.length ? [] : cur; Game.save(); UI.refresh('learn'); },
  // old saves keyed progress by the index of the built-in 500-word list
  migrate(S) {
    const L = S.learn, OLD = OLD_WORDS_500;
    const old = Object.keys(S.vocab || {}).some(k => /^\d+$/.test(k)) || (L.dailyWords || []).some(x => typeof x === 'number'); if (!old) return;
    const P = {}; for (const k in S.vocab || {}) { const w = /^\d+$/.test(k) ? OLD[+k] : k; if (w != null && VIDX[w] != null) P[w] = S.vocab[k]; }
    S.flags = Object.assign({}, S.flags, { legacy: true });
    S.vocab = P; L.dailyWords = (L.dailyWords || []).map(i => typeof i === 'number' ? OLD[i] : i).filter(w => w != null && VIDX[w] != null);
    if (L.dailyWords.length < 10) { L.dailyDay = ''; L.dailyWords = []; }
    L.v = 2;
  },
  dailyIdx() { return this.L.dailyWords.map(w => VIDX[w]).filter(i => i != null); },
  countLearned() { let n = 0; for (const k in this.P) if (this.P[k][0] >= 2) n++; return n; },
  countLevel(t) { let n = 0; for (const k in this.P) { const i = VIDX[k]; if (i != null && VOCAB[i].t === t && this.P[k][0] >= 2) n++; } return n; },
  countMastered() { let n = 0; for (const k in this.P) if (this.P[k][0] >= 5) n++; return n; },
  countFamiliar() { let n = 0; for (const k in this.P) if (this.P[k][0] >= 3) n++; return n; },
  countSeen() { return Object.keys(this.P).length; },
  streakNow() { const L = this.L; return L.lastDone && L.lastDone >= this.yesterday() ? L.streak : 0; },
  pick(n, exclude) {
    const today = this.dayNum(), due = [], fresh = [], weak = [], lv = new Set(this.levelsOn());
    for (const v of VOCAB) {
      if (exclude && exclude.has(v.i)) continue;
      const r = this.P[v.w];
      if (!r || (r[0] === 0 && r[3] === 0)) { if (lv.has(v.t)) fresh.push(v.i); } else if (r[1] <= today) due.push(v.i); else if (r[0] <= 2) weak.push(v.i);
    }
    due.sort((a, b) => this.rec(a)[1] - this.rec(b)[1] || this.rec(a)[0] - this.rec(b)[0]);
    fresh.sort((a, b) => VOCAB[a].t - VOCAB[b].t || hsh(a, 17) % 997 - hsh(b, 17) % 997);
    const out = [], nDue = Math.min(due.length, Math.ceil(n * 0.6));
    out.push(...due.slice(0, nDue));
    out.push(...fresh.slice(0, n - out.length));
    if (out.length < n) out.push(...due.slice(nDue, nDue + n - out.length));
    if (out.length < n) out.push(...shuffle(weak).slice(0, n - out.length));
    if (out.length < n) { const rest = shuffle(VOCAB.filter(v => lv.has(v.t) && !out.includes(v.i)).map(v => v.i)); out.push(...rest.slice(0, n - out.length)); }
    return out.slice(0, n);
  },
  ensureDaily() {
    const L = this.L, day = Life.today(); if (L.dailyDay && L.dailyDay >= day && L.dailyWords.length) return;   // >=: keeps a day started before the 06:00 rollover existed
    L.dailyDay = day; L.dailyWords = this.pick(20).map(i => VOCAB[i].w); L.dailyDone = false; L.reviewed = 0; L.dailyScore = '';
  },
  tts() { return typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined'; },
  canSpeak() { return this.tts() || !!window.NOOK_AUDIO_BASE; },
  say(w) { if (!this.tts()) return; try { const u = new SpeechSynthesisUtterance(w); u.lang = 'en-US'; u.rate = 0.88; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } },
  speak(w) {
    const base = window.NOOK_AUDIO_BASE, i = VIDX[w];
    if (!base || i == null || this.noAudio?.[w]) return this.say(w);
    try {
      if (this.audio) this.audio.pause();
      const a = this.audio = new Audio(base + encodeURIComponent(VOCAB[i].au));
      a.onerror = () => { (this.noAudio || (this.noAudio = {}))[w] = 1; this.say(w); };
      a.play().catch(() => { });
    } catch (e) { this.say(w); }
  },
  // ---------- sessions ----------
  start(kind, opts = {}) {
    this.ensureDaily();
    let words, nq;
    if (kind === 'daily') { words = this.dailyIdx(); nq = 10; }
    else if (kind === 'redo') { words = shuffle(this.dailyIdx()).slice(0, 10); nq = 8; kind = 'practice'; }
    else if (kind === 'need') { words = this.pick(5); nq = 5; }
    else if (kind === 'train' || kind === 'help') { words = this.pick(4); nq = 4; }
    else { words = this.pick(10); nq = 8; }
    const s = this.sess = { kind, opts, words, nq, step: 'review', ri: kind === 'daily' ? Math.min(this.L.reviewed, words.length) : 0, flip: false, unsure: [], qs: null, qi: 0, ans: null, right: 0, wrong: [], newly: 0, mastered: 0, result: null, spoke: -1 };
    if (s.ri >= words.length || kind === 'train' || kind === 'help') this.toQuiz();
    UI.openWin('study');
  },
  review(knew) {
    const s = this.sess; if (!s || s.step !== 'review') return;
    const i = s.words[s.ri]; if (!knew && !s.unsure.includes(i)) s.unsure.push(i); if (knew) s.unsure = s.unsure.filter(x => x !== i);
    const r = this.recMake(i, [0, this.dayNum(), 0, 0, 0]); if (!(s.seenIdx || (s.seenIdx = new Set())).has(i)) { s.seenIdx.add(i); r[2]++; }
    s.ri++; s.flip = false; if (s.kind === 'daily') this.L.reviewed = Math.max(this.L.reviewed, s.ri);
    if (s.ri >= s.words.length) this.toQuiz();
    UI.refresh('study'); Game.save();
  },
  back() {
    const s = this.sess; if (!s || s.step !== 'review' || s.ri <= 0) return;
    s.ri--; s.flip = false; UI.refresh('study');
  },
  skipReview() { const s = this.sess; if (s && s.step === 'review' && s.kind !== 'daily') { this.toQuiz(); UI.refresh('study'); } },
  toQuiz() {
    const s = this.sess; s.step = 'quiz';
    const rest = shuffle(s.words.filter(i => !s.unsure.includes(i)));
    s.qs = this.makeQs(shuffle([...s.unsure, ...rest].slice(0, s.nq))); s.qi = 0; s.ans = null;
  },
  makeQs(ids) {
    const types = this.canSpeak() ? ['en2zh', 'zh2en', 'spell', 'listen'] : ['en2zh', 'zh2en', 'spell'];
    const off = Math.floor(Math.random() * types.length);
    return ids.map((i, k) => {
      const v = VOCAB[i]; let type = types[(k + off) % types.length];
      if (type === 'spell' && (v.w.length > 11 || !/^[A-Za-z][A-Za-z'-]*$/.test(v.w))) type = 'zh2en';
      return { i, type, opts: type === 'spell' ? null : this.options(v, type === 'zh2en' ? 'w' : 'z') };
    });
  },
  options(v, field) {
    const first = v.z.split('；')[0], pos = v.p.split('/')[0];
    let c = VOCAB.filter(x => x.t === v.t && x.i !== v.i && x.p.split('/')[0] === pos && x[field] !== v[field] && x.z.split('；')[0] !== first && x.w.toLowerCase() !== v.w.toLowerCase());
    if (c.length < 6) c = VOCAB.filter(x => x.i !== v.i && x.p.split('/')[0] === pos && x[field] !== v[field] && x.z.split('；')[0] !== first);
    const pick = shuffle(c.slice()).slice(0, 3);
    while (pick.length < 3) { const x = VOCAB[Math.floor(Math.random() * VOCAB.length)]; if (x.i !== v.i && !pick.includes(x)) pick.push(x); }
    return shuffle([v, ...pick]).map(x => x.i);
  },
  answer(val) {
    const s = this.sess; if (!s || s.step !== 'quiz' || s.ans) return;
    const q = s.qs[s.qi], v = VOCAB[q.i];
    const ok = q.type === 'spell' ? String(val || '').trim().toLowerCase() === v.w.toLowerCase() : val === q.i;
    s.ans = { ok, val };
    const r = this.recMake(q.i, [0, 0, 1, 0, 0]), today = this.dayNum();
    if (ok) { const before = r[0]; r[0] = Math.min(5, r[0] + 1); r[1] = today + SRS_INT[r[0]]; r[3]++; s.right++; if (before === 0) s.newly++; if (r[0] === 5 && before < 5) s.mastered++; Life.track('quizRight', 1); }
    else { r[0] = Math.max(1, r[0] - 1); r[1] = today + 1; r[4]++; s.wrong.push(q.i); }
    if (q.type !== 'listen' || !ok) this.speak(v.w);
    UI.refresh('study'); Game.save();
    if (ok) { const qi = s.qi; setTimeout(() => { if (this.sess === s && s.step === 'quiz' && s.qi === qi && s.ans) this.next(); }, 1000); }
  },
  next() { const s = this.sess; if (!s || !s.ans) return; s.qi++; s.ans = null; if (s.qi >= s.qs.length) this.finish(); UI.refresh('study'); },
  finish() {
    const s = this.sess, n = s.qs.length, R = s.right, L = this.L; s.step = 'result';
    const res = { coins: 0, xp: R * 3 + s.newly * 2, items: [], msg: '' };
    if (s.kind === 'daily') {
      res.coins = R * 2 + (R === n ? 15 : 0); L.dailyScore = `${R}/${n}`;
      if (!L.dailyDone) {
        L.dailyDone = true; const day = Life.today();
        L.streak = L.lastDone === this.yesterday() ? (L.streak || 0) + 1 : (L.lastDone >= day ? L.streak : 1); L.lastDone = day; L.best = Math.max(L.best || 0, L.streak);
        Life.track('vocab', 1); res.msg = `今日單字完成！連續 ${L.streak} 天。到「任務」領取每日獎勵。`;
      } else res.msg = '今天的單字已經完成過了。';
    } else if (s.kind === 'train') {
      res.coins = R; res.xp = R * 2; Object.assign(res, Pets.trainResult(s.opts.pid, s.opts.trick, R, n));
    } else if (s.kind === 'help') {
      res.coins = 0; res.xp = R * 2; Object.assign(res, Social.helpResult(s.opts, R, n));
    } else if (s.kind === 'need') {
      const it = s.opts.item, cnt = R >= n ? 2 : R >= 3 ? 1 : 0; res.coins = R;
      if (cnt) { Life.give(it, cnt); res.items.push([it, cnt]); res.msg = cnt === 2 ? `全對！得到 2 個${SUPPLIES[it].n}。` : `得到 1 個${SUPPLIES[it].n}，全對可以拿 2 個。`; }
      else res.msg = `答對 3 題才能換到${SUPPLIES[it].n}，再試一次吧！`;
      Life.track('study', 0);
    } else {
      const day = Life.today(); if (L.pDay !== day) { L.pDay = day; L.pCoins = 0; }
      const c = Math.min(R * 2, Math.max(0, 40 - L.pCoins)); L.pCoins += c; res.coins = c;
      res.msg = c < R * 2 ? '今天練習的金幣已達上限，經驗照拿。' : '練習完成！';
      Life.track('study', 1);
    }
    res.coins += s.mastered * 3;
    res.coins = Game.reward(res.coins, res.xp, 'quiz');
    s.result = res; UI.badges(); UI.refresh('learn'); Game.save(); saveSoon();
  },
};

/* ---------------- windows ---------------- */
Object.assign(UI.WIN, {
  learn: { t: '學習', i: 'i_learn', w: 450, at: ['l', 0] },
  study: { t: '單字', i: 'i_learn', w: 460, at: ['c', 0], modal: true },
  words: { t: '單字本', i: 'i_book', w: 460, at: ['l', 1] },
});
Object.assign(UI, {
  wq: '', wf: 'all', wt: 0,
  w_learn() {
    Learn.ensureDaily(); const L = Learn.L, done = L.dailyDone, rev = Math.min(20, L.reviewed);
    const step = (n, label, on, cur) => h('div', { class: 'lstep' + (on ? ' on' : '') + (cur ? ' cur' : '') }, h('b', { class: 'num', text: String(n) }), h('span', { text: label }));
    const preview = h('div', { class: 'wchips' }, ...L.dailyWords.slice(0, 8).map(w => h('span', { class: 'wchip', text: w })), L.dailyWords.length > 8 ? h('span', { class: 'hint', text: `…共 ${L.dailyWords.length} 個` }) : null);
    const today = h('div', { class: 'lcard' }, h('div', { class: 'lhead' }, h('b', { text: '今日單字' }), h('span', { class: 'hint', text: done ? `完成 · 測驗 ${L.dailyScore}` : rev >= 20 ? '複習完成，剩小測驗' : `複習 ${rev}/20` })),
      h('div', { class: 'lsteps' }, step(1, '複習 20 個字', rev >= 20, rev < 20), step(2, '小測驗 10 題', done, rev >= 20 && !done), step(3, '領取獎勵', done && Life.L.daily && Life.L.daily.tasks[0].claimed, done)), preview,
      done ? h('button', { class: 'chip', onclick: () => Learn.start('redo') }, ico('i_reset', 20), '再練一次今天的字') : h('button', { class: 'chip big primary', onclick: () => Learn.start('daily') }, ico('i_learn', 22), rev > 0 ? '繼續' : '開始今日複習'));
    const tot = VOCAB.length;
    const stat = (n, label) => h('div', { class: 'lstat' }, h('b', { class: 'num', text: String(n) }), h('span', { text: label }));
    const stats = h('div', { class: 'lstats' }, stat(Learn.countSeen(), '看過'), stat(Learn.countLearned(), '學會'), stat(Learn.countFamiliar(), '熟悉'), stat(Learn.countMastered(), '精熟'), stat(Learn.streakNow(), '連續天數'));
    if (!this._lvCount) { this._lvCount = {}; for (const v of VOCAB) this._lvCount[v.t] = (this._lvCount[v.t] || 0) + 1; }
    const on = new Set(Learn.levelsOn());
    const tiers = h('div', { class: 'ltiers' }, ...VLEVELS.map(t => { const all = this._lvCount[t], got = Learn.countLevel(t); return h('div', { class: 'ltier' + (on.has(t) ? '' : ' off') }, h('button', { class: 'lvtog' + (on.has(t) ? ' on' : ''), 'aria-pressed': on.has(t) ? 'true' : 'false', title: on.has(t) ? '新字會從這一級出' : '目前不出這一級的新字', onclick: () => Learn.toggleLevel(t) }, on.has(t) ? ico('i_check', 14) : null), h('span', { class: 'num', text: 'L' + t }), h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round(got / all * 100)}%` })), h('span', { class: 'num hint', text: `${got}/${all}` })); }));
    const day = Life.today(), left = L.pDay === day ? Math.max(0, 40 - L.pCoins) : 40;
    const swap = h('div', { class: 'swap' }, ...Object.keys(SUPPLIES).map(k => h('button', { class: 'swapbtn', title: SUPPLIES[k].desc, onclick: () => Learn.start('need', { item: k }) }, ico(SUPPLIES[k].spr, 32), h('span', { text: SUPPLIES[k].n }), h('em', { class: 'num', text: '×' + (Life.L.bag[k] || 0) }))));
    return [today, stats, h('div', { class: 'sub', text: '程度 Level 1–6（打勾的程度才會出新字）' }), tiers,
      h('div', { class: 'sub', text: '複習 5 個單字換道具（答對 3 題得 1 個，全對得 2 個）' }), swap,
      h('div', { class: 'row wrap' }, h('button', { class: 'chip', onclick: () => Learn.start('practice') }, ico('i_sparkle', 20), `自由練習（今天還能賺 ${left} 金幣）`), h('button', { class: 'chip', onclick: () => this.openWin('words') }, ico('i_book', 20), `單字本（${tot}）`)),
      h('p', { class: 'hint', text: '答對的字會隔 1、2、4、7、15 天再出現，答錯的字隔天再複習。' })];
  },
  w_study() {
    const s = Learn.sess;
    if (!s) return [h('div', { class: 'empty' }, h('p', { text: '從「學習」開始一次複習。' }))];
    const kindName = s.kind === 'daily' ? '今日單字' : s.kind === 'need' ? `換取${SUPPLIES[s.opts.item].n}` : s.kind === 'train' ? Pets.trainTitle(s.opts) : s.kind === 'help' ? Social.helpTitle(s.opts) : '自由練習';
    const bar = (a, b) => h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round(a / b * 100)}%` }));
    if (s.step === 'review') {
      const v = VOCAB[s.words[s.ri]];
      if (s.spoke !== 'r' + s.ri) { s.spoke = 'r' + s.ri; setTimeout(() => Learn.speak(v.w), 150); }
      return [h('div', { class: 'shead' }, h('b', { text: kindName }), h('span', { class: 'num hint', text: `複習 ${s.ri + 1}/${s.words.length}` })), bar(s.ri, s.words.length),
        h('button', { class: 'fcard' + (s.flip ? ' flip' : ''), id: 'fcard', onclick: () => { s.flip = !s.flip; this.refresh('study'); } },
          h('span', { class: 'ftier', text: TIER_NAME[v.t] }), h('span', { class: 'fword', text: v.w }), v.ph ? h('span', { class: 'fph', text: v.ph }) : null, h('span', { class: 'fpos', text: v.p }),
          s.flip ? h('span', { class: 'fzh', text: v.z }) : h('span', { class: 'hint', text: '點卡片看中文' })),
        h('div', { class: 'row center' }, h('button', { class: 'chip', 'aria-label': '發音', onclick: () => Learn.speak(v.w) }, ico('i_speaker', 20), '發音')),
        h('div', { class: 'row center sbtns' }, h('button', { class: 'chip big', id: 'rv-back', disabled: s.ri <= 0, 'aria-label': '上一個單字', title: '上一個單字（Backspace）', onclick: () => Learn.back() }, ico('i_back', 20), '上一個'), h('button', { class: 'chip big', onclick: () => Learn.review(false) }, '還不熟'), h('button', { class: 'chip big primary', onclick: () => Learn.review(true) }, '記得')),
        h('p', { class: 'hint center', text: '空白鍵翻面 · ← 還不熟 · → 記得 · Backspace 上一個（測驗時不能回頭）' }),
        s.kind !== 'daily' ? h('button', { class: 'chip sm', onclick: () => Learn.skipReview() }, '直接測驗') : null];
    }
    if (s.step === 'quiz') {
      const q = s.qs[s.qi], v = VOCAB[q.i], A = s.ans;
      if (q.type === 'listen' && s.spoke !== 'q' + s.qi) { s.spoke = 'q' + s.qi; setTimeout(() => Learn.speak(v.w), 200); }
      let prompt, sub;
      if (q.type === 'en2zh') { prompt = h('div', { class: 'qword' }, v.w, h('button', { class: 'xbtn', 'aria-label': '發音', onclick: () => Learn.speak(v.w) }, ico('i_speaker', 22))); sub = `${v.ph ? v.ph + ' · ' : ''}${v.p} · 選出中文意思`; }
      else if (q.type === 'zh2en') { prompt = h('div', { class: 'qzh', text: v.z }); sub = `${v.p} · 選出英文單字`; }
      else if (q.type === 'listen') { prompt = h('button', { class: 'chip big primary', onclick: () => Learn.speak(v.w) }, ico('i_speaker', 24), '再聽一次'); sub = '聽發音，選出中文意思'; }
      else { prompt = h('div', { class: 'qzh', text: v.z }); sub = `${v.p} · 拼出英文（${v.w.length} 個字母）`; }
      const parts = [h('div', { class: 'shead' }, h('b', { text: kindName }), h('span', { class: 'num hint', text: `測驗 ${s.qi + 1}/${s.qs.length} · 答對 ${s.right}` })), bar(s.qi, s.qs.length), h('div', { class: 'qbox' }, prompt, h('p', { class: 'hint', text: sub }))];
      if (q.type === 'spell') {
        const hintTxt = v.w[0] + ' ' + '_ '.repeat(v.w.length - 1).trim();
        const inp = h('input', { id: 'spell-in', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', disabled: !!A, placeholder: hintTxt, onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (!s.ans) Learn.answer(e.target.value); else Learn.next(); } } });
        parts.push(h('div', { class: 'spellhint num', text: hintTxt }), h('div', { class: 'row' }, h('div', { class: 'inset grow' }, inp), h('button', { class: 'chip primary', disabled: !!A, onclick: () => Learn.answer(inp.value) }, '確定')));
        if (!A) setTimeout(() => { const el = document.getElementById('spell-in'); if (el && document.activeElement !== el) el.focus(); }, 30);
      } else {
        parts.push(h('div', { class: 'qopts' }, ...q.opts.map((oi, k) => {
          const o = VOCAB[oi], txt = q.type === 'zh2en' ? o.w : o.z;
          let cls = 'qopt'; if (A) { if (oi === q.i) cls += ' right'; else if (A.val === oi) cls += ' wrong'; }
          return h('button', { class: cls, disabled: !!A, onclick: () => Learn.answer(oi) }, h('em', { class: 'num', text: String(k + 1) }), h('span', { text: txt }));
        })));
      }
      if (A) parts.push(h('div', { class: 'qfb ' + (A.ok ? 'ok' : 'no') }, h('div', {}, h('b', { text: A.ok ? '答對了！' : '再記一下：' }), h('span', { text: ` ${v.w} ${v.ph}  ${v.p} ${v.z}` })), h('button', { class: 'chip sm primary', id: 'q-next', onclick: () => Learn.next() }, s.qi + 1 >= s.qs.length ? '看結果' : '下一題')));
      return parts;
    }
    const r = s.result, n = s.qs.length;
    return [h('div', { class: 'result' }, h('div', { class: 'rscore num', text: `${s.right} / ${n}` }), h('p', { class: 'gift-t', text: r.msg }),
      h('div', { class: 'rw big' }, h('span', { class: 'rwc' }, ico('i_coin', 22), h('b', { class: 'num', text: '+' + r.coins })), h('span', { class: 'rwc' }, ico('i_star', 22), h('b', { class: 'num', text: '+' + r.xp })), ...r.items.map(([k, c]) => h('span', { class: 'rwc' }, ico(SUPPLIES[k].spr, 24), h('b', { class: 'num', text: '×' + c })))),
      s.newly || s.mastered ? h('p', { class: 'hint', text: `新學會 ${s.newly} 個字` + (s.mastered ? `、精熟 ${s.mastered} 個（每個 +3 金幣）` : '') }) : null),
      s.wrong.length ? h('div', { class: 'sub', text: '要再記一下的字' }) : null,
      s.wrong.length ? h('div', { class: 'wlist' }, ...s.wrong.map(i => h('div', { class: 'wrow' }, h('b', { text: VOCAB[i].w }), h('span', { class: 'hint', text: VOCAB[i].p }), h('span', { text: VOCAB[i].z }), h('button', { class: 'xbtn', 'aria-label': '發音', onclick: () => Learn.speak(VOCAB[i].w) }, ico('i_speaker', 18))))) : null,
      h('div', { class: 'row center wrap' },
        s.kind === 'need' && r.items.length && s.opts.needId && Life.L.needs.some(x => x.id === s.opts.needId) ? h('button', { class: 'chip primary', onclick: () => { const nd = Life.L.needs.find(x => x.id === s.opts.needId); this.closeWin('study'); if (nd) Life.use(s.opts.item, nd); } }, ico(SUPPLIES[s.opts.item].spr, 20), '馬上使用') : null,
        s.kind === 'need' && !r.items.length ? h('button', { class: 'chip primary', onclick: () => Learn.start('need', s.opts) }, ico('i_reset', 20), '再試一次') : null,
        s.kind === 'daily' ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('study'); this.openTasks('daily'); } }, ico('i_task', 20), '去領獎勵') : null,
        s.kind === 'train' ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('study'); Pets.select(s.opts.pid, 'train'); } }, ico('i_paw', 20), '回到寵物') : null,
        s.kind === 'help' && s.right < 3 ? h('button', { class: 'chip primary', onclick: () => Learn.start('help', s.opts) }, ico('i_reset', 20), '再試一次') : null,
        s.kind === 'help' ? h('button', { class: 'chip', onclick: () => { this.closeWin('study'); UI.openWin('visit'); } }, ico('i_people', 20), '回到好友房間') : null,
        h('button', { class: 'chip', onclick: () => this.closeWin('study') }, '完成'))];
  },
  w_words() {
    const q = this.wq.trim().toLowerCase();
    const filt = VOCAB.filter(v => {
      const r = Learn.P[v.w], b = r ? r[0] : 0, seen = !!r;
      if (this.wt && v.t !== this.wt) return false;
      if (this.wf === 'new' && seen) return false; if (this.wf === 'learning' && (!seen || b >= 3)) return false; if (this.wf === 'known' && b < 3) return false;
      return !q || v.w.toLowerCase().includes(q) || v.z.includes(q);
    });
    const tabs = h('div', { class: 'tabs' }, ...[['all', '全部'], ['new', '還沒學'], ['learning', '學習中'], ['known', '熟悉']].map(([k, l]) => h('button', { class: 'tab' + (this.wf === k ? ' on' : ''), onclick: () => { this.wf = k; this.refresh('words'); } }, l)));
    const ttabs = h('div', { class: 'tabs wrap' }, ...[[0, '全部'], ...VLEVELS.map(t => [t, 'L' + t])].map(([k, l]) => h('button', { class: 'tab' + (this.wt === k ? ' on' : ''), onclick: () => { this.wt = k; this.refresh('words'); } }, l)));
    const search = h('div', { class: 'inset' }, h('input', { id: 'w-q', type: 'search', value: this.wq, placeholder: '搜尋英文或中文', oninput: e => { this.wq = e.target.value; this.refresh('words'); } }));
    const MAX = 300;
    const rows = filt.slice(0, MAX).map(v => { const b = Learn.box(v.i); return h('div', { class: 'wrow' }, h('b', { text: v.w }), h('span', { class: 'hint', text: v.p }), h('span', { class: 'wz', text: v.z }), h('span', { class: 'dots', title: `熟練度 ${b}/5` }, ...[1, 2, 3, 4, 5].map(k => h('i', { class: k <= b ? 'on' : '' }))), h('button', { class: 'xbtn', 'aria-label': '發音', onclick: () => Learn.speak(v.w) }, ico('i_speaker', 18))); });
    return [search, tabs, ttabs, h('div', { class: 'sub', text: `${filt.length} 個單字` + (filt.length > MAX ? `（顯示前 ${MAX} 個，用搜尋找其他的）` : '') }), h('div', { class: 'scroll wlist' }, ...rows)];
  },
});
document.addEventListener('keydown', e => {
  const w = UI.wins && UI.wins.study; if (!w || w.el.hidden || !Learn.sess) return;
  const tag = (e.target && e.target.tagName) || ''; const s = Learn.sess;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (s.step === 'review') {
    if (e.key === ' ') { e.preventDefault(); s.flip = !s.flip; UI.refresh('study'); }
    else if (e.key === 'Backspace' || e.key === 'ArrowUp') { e.preventDefault(); Learn.back(); }
    else if (e.key === 'ArrowLeft' || e.key === '1') Learn.review(false);
    else if (e.key === 'ArrowRight' || e.key === '2') Learn.review(true);
  } else if (s.step === 'quiz') {
    const q = s.qs[s.qi];
    if (!s.ans && q.opts && /^[1-4]$/.test(e.key)) Learn.answer(q.opts[+e.key - 1]);
    else if (s.ans && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); Learn.next(); }
  }
});

const OLD_WORDS_500 = ["ability", "absent", "active", "actually", "admire", "advice", "afford", "agree", "allow", "ancient", "anger", "annoy", "anxious", "apartment", "appear", "argue", "arrange", "arrive", "attack", "attend", "attention", "award", "balance", "battle", "belief", "belong", "benefit", "blank", "bother", "brave", "brief", "budget", "burden", "career", "celebrate", "challenge", "citizen", "clever", "climate", "collect", "common", "compare", "complain", "confident", "consider", "contain", "control", "convenient", "correct", "create", "crowd", "culture", "customer", "damage", "danger", "decorate", "degree", "deliver", "describe", "desert", "deserve", "destroy", "develop", "difference", "direction", "discuss", "disease", "distance", "doubt", "education", "effort", "energy", "enemy", "enter", "especially", "event", "exact", "excellent", "exercise", "expect", "explain", "express", "fail", "famous", "favorite", "fever", "figure", "final", "foreign", "forgive", "freedom", "friendly", "future", "gentle", "goal", "government", "greet", "guess", "guest", "handle", "harm", "health", "honest", "huge", "human", "hurry", "imagine", "important", "include", "increase", "influence", "invite", "island", "journey", "judge", "language", "lazy", "lesson", "limit", "local", "lonely", "manage", "market", "material", "medicine", "member", "memory", "message", "method", "mistake", "moment", "nature", "nervous", "notice", "offer", "opinion", "peace", "perfect", "period", "personal", "polite", "popular", "possible", "praise", "prepare", "pretend", "pride", "private", "prize", "progress", "promise", "protect", "provide", "purpose", "quality", "reason", "receive", "record", "refuse", "regular", "relax", "repeat", "reply", "respect", "result", "safety", "satisfy", "schedule", "secret", "select", "serious", "share", "silent", "similar", "society", "solve", "spirit", "strange", "strength", "stress", "suggest", "support", "surprise", "talent", "task", "teenager", "terrible", "thirsty", "threaten", "tradition", "treasure", "trust", "truth", "valuable", "victory", "volunteer", "weigh", "wisdom", "wonder", "youth", "absorb", "academic", "accurate", "achieve", "adapt", "adequate", "adjust", "adventure", "advertisement", "affect", "ambition", "analyze", "annual", "apologize", "appetite", "approach", "appropriate", "approve", "assist", "assume", "attitude", "attract", "audience", "aware", "awkward", "background", "behave", "biology", "brilliant", "broadcast", "calculate", "capable", "capture", "category", "certificate", "chemistry", "classical", "colleague", "combine", "committee", "communicate", "community", "competition", "concentrate", "concern", "conclusion", "condition", "confirm", "conflict", "connect", "consequence", "constant", "consume", "contact", "content", "contribute", "convince", "cope", "creative", "creature", "criticize", "crucial", "curiosity", "current", "debate", "declare", "decline", "defeat", "delicate", "delight", "demand", "demonstrate", "deny", "desire", "despite", "detail", "device", "devote", "dialogue", "digital", "diligent", "disaster", "discipline", "distinguish", "diverse", "domestic", "donate", "eager", "economic", "elderly", "element", "eliminate", "emergency", "emotion", "employ", "encounter", "encourage", "ensure", "entertain", "enthusiasm", "establish", "estimate", "eventually", "evidence", "exaggerate", "exchange", "exhausted", "exhibition", "expand", "expense", "explore", "export", "extend", "facility", "factor", "faith", "fascinate", "feature", "fluent", "focus", "formal", "fortunate", "foundation", "fragile", "frustrate", "fundamental", "generation", "generous", "genius", "global", "graduate", "grateful", "guidance", "harmony", "highlight", "horizon", "identify", "ignore", "illustrate", "immediate", "impact", "impress", "incident", "income", "independent", "individual", "industry", "inform", "initial", "injure", "insist", "inspire", "install", "instant", "instruct", "intelligent", "intend", "intense", "interpret", "interrupt", "interview", "investigate", "involve", "journal", "justice", "labor", "launch", "legend", "leisure", "logical", "luxury", "majority", "mature", "meaningful", "merchant", "miracle", "mission", "monitor", "moral", "mysterious", "narrow", "negative", "negotiate", "neutral", "nutrition", "objective", "obstacle", "obvious", "occasion", "occur", "operate", "opportunity", "oppose", "optimistic", "original", "outstanding", "particular", "passion", "perform", "permanent", "permit", "perspective", "persuade", "philosophy", "physical", "pleasant", "pollution", "positive", "poverty", "precious", "precise", "preference", "pressure", "primary", "principle", "procedure", "profession", "profit", "prominent", "promote", "property", "proportion", "prospect", "psychology", "publish", "qualify", "quantity", "rational", "react", "recall", "recommend", "recover", "refer", "reflect", "reform", "regret", "reject", "relevant", "reliable", "reluctant", "rely", "remain", "remote", "represent", "request", "require", "research", "resident", "resist", "resource", "respond", "restore", "restrict", "reveal", "revolution", "routine", "satellite", "scholar", "section", "sensitive", "sequence", "signal", "significant", "situation", "solution", "sophisticated", "spectacular", "stable", "strategy", "structure", "stubborn", "submit", "substance", "subtle", "sufficient", "superior", "survey", "survive", "sustain", "symbol", "technique", "temporary", "tendency", "theory", "thorough", "tragedy", "transfer", "transport", "tremendous", "trend", "ultimate", "undergo", "urban", "urgent", "valid", "vehicle", "venture", "vital", "vivid", "witness"];
