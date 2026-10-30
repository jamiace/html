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
    return Adaptive.pick(n, exclude);
  },
  ensureDaily() {
    const L = this.L, day = Life.today(); if (L.dailyDay && L.dailyDay >= day && L.dailyWords.length) return;   // >=: keeps a day started before the 06:00 rollover existed
    L.dailyDay = day; L.dailyWords = this.pick(20).map(i => VOCAB[i].w); L.dailyDone = false; L.reviewed = 0; L.dailyScore = '';
  },
  tts() { return typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined'; },
  canSpeak() { return this.tts(); },
  say(w) {
    if(!this.tts())return false;
    const engine=window.speechSynthesis,word=String(w||'').trim();if(!word)return false;
    clearTimeout(this._speechTimer);const request=this._speechRequest=(this._speechRequest||0)+1;
    try{
      engine.cancel();engine.resume();
      const voices=engine.getVoices(),english=voices.filter(v=>/^en[-_]/i.test(v.lang));
      const voice=english.find(v=>/^en[-_]US$/i.test(v.lang)&&/Google|Natural|Microsoft/i.test(v.name))||english.find(v=>/^en[-_]US$/i.test(v.lang))||english[0];
      const u=this.utterance=new SpeechSynthesisUtterance(word);u.lang=voice?.lang||'en-US';u.rate=.88;u.volume=1;if(voice)u.voice=voice;
      u.onend=()=>{if(this.utterance===u)this.utterance=null};
      u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))console.warn('[speech]',e.error)};
      this._speechTimer=setTimeout(()=>{if(this._speechRequest!==request)return;engine.resume();engine.speak(u)},60);
      return true;
    }catch(e){console.warn('[speech]',e);return false}
  },
  speak(w) { return this.say(w); },
  // ---------- sessions ----------
  start(kind, opts = {}) {
    if(kind==='chal'&&opts.k==='c_spell')return CatsTypo.openDaily();
    this.ensureDaily();
    let words, nq;
    if (kind === 'daily') { words = this.dailyIdx(); nq = 10; }
    else if (kind === 'redo') { words = shuffle(this.dailyIdx()).slice(0, 10); nq = 8; kind = 'practice'; }
    else if (kind === 'need') { words = this.pick(5); nq = 5; }
    else if (kind === 'train' || kind === 'help') { words = Adaptive.pick(4); nq = 4; }
    else if (kind === 'levelgate') { words = opts.questions.map(q => q.i); nq = words.length; opts.preset = opts.questions; }
    else if (kind === 'story') { const pk = Story.pack(opts.ch); if (!pk) return; words = pk.ids; nq = pk.qs.length; opts.preset = pk.qs; opts.strict = true; }
    else if (kind === 'team') { words = Feel.teamWords(opts); nq = words.length; if (!nq) return UI.openTasks('team'); }
    else if (kind === 'chal') { const t = Challenge.task(opts.k); if (!t || !t.words) return; words = Challenge.left(t).map(w => VIDX[w]); if (!words.length) return UI.openTasks('daily'); nq = words.length; }
    else { words = this.pick(10); nq = 8; }
    const s = this.sess = { kind, opts, words, nq, step: 'review', ri: kind === 'daily' ? Math.min(this.L.reviewed, words.length) : 0, flip: false, unsure: [], qs: null, qi: 0, ans: null, right: 0, wrong: [], newly: 0, mastered: 0, result: null, spoke: -1 };
    if (kind === 'chal') { s.task = Challenge.task(opts.k); if (s.task.k !== 'c_new' || s.task.reviewed) s.ri = words.length; }
    if (kind === 'train' && Feel.trainEasy(opts.pid)) s.easy = true;
    if (s.ri >= words.length || kind === 'train' || kind === 'help' || kind === 'team' || kind === 'story' || kind === 'levelgate') this.toQuiz();
    UI.openWin('study');
  },
  review(knew) {
    const s = this.sess; if (!s || s.step !== 'review') return;
    const i = s.words[s.ri]; if (!knew && !s.unsure.includes(i)) s.unsure.push(i); if (knew) s.unsure = s.unsure.filter(x => x !== i);
    const r = this.recMake(i, [0, this.dayNum(), 0, 0, 0]); if (!(s.seenIdx || (s.seenIdx = new Set())).has(i)) { s.seenIdx.add(i); r[2]++; }
    s.ri++; s.flip = false; if (s.kind === 'daily') this.L.reviewed = Math.max(this.L.reviewed, s.ri);
    if (s.kind === 'chal' && s.ri >= s.words.length) s.task.reviewed = true;
    if (s.ri >= s.words.length) this.toQuiz();
    else if (s.kind === 'daily' && s.ri % 5 === 0) s.step = 'pause';   // five at a time: "five more?"
    UI.refresh('study'); Game.save();
  },
  more() { const s = this.sess; if (s && s.step === 'pause') { s.step = 'review'; UI.refresh('study'); } },
  back() {
    const s = this.sess; if (!s || s.step !== 'review' || s.ri <= 0) return;
    s.ri--; s.flip = false; UI.refresh('study');
  },
  skipReview() { const s = this.sess; if (s && s.step === 'review' && s.kind !== 'daily') { if (s.kind === 'chal') s.task.reviewed = true; this.toQuiz(); UI.refresh('study'); } },
  toQuiz() {
    const s = this.sess; s.step = 'quiz';
    if (s.opts.preset) { s.qs = s.opts.preset; s.qi = 0; s.ans = null; Adaptive.prepare(s); return; }   // a story chapter: questions in story order
    const rest = shuffle(s.words.filter(i => !s.unsure.includes(i)));
    const ids = Adaptive.select([...s.unsure, ...rest], s.nq);
    s.qs = s.kind === 'chal' ? Challenge.makeQs(s.task, ids) : s.kind === 'team' ? Feel.teamQs(s.opts, ids) : this.makeQs(ids, s.easy); s.qi = 0; s.ans = null; Adaptive.prepare(s);
  },
  makeQs(ids, easy) {
    const types = Feel.types(easy);
    const off = Math.floor(Math.random() * types.length);
    const remaining = ids.slice();
    return ids.map((i, k) => {
      let type = types[(k + off) % types.length];
      [i] = Adaptive.select(remaining, 1, type, {mix:false});
      remaining.splice(remaining.indexOf(i), 1);
      const v = VOCAB[i];
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
    const typed = q.type === 'spell' || q.type === 'listenspell';
    const ok = typed ? String(val || '').trim().toLowerCase() === v.w.toLowerCase() : val === q.i;
    if(typed && document.activeElement?.id==='spell-in')document.activeElement.blur();
    s.ans = { ok, val };
    const r = this.recMake(q.i, [0, 0, 1, 0, 0]), today = this.dayNum();
    Adaptive.note(s, q.i, q.type, ok, q);
    Feel.note(s, ok);
    if (ok) { const before = r[0]; r[0] = Math.min(5, r[0] + 1); r[1] = today + SRS_INT[r[0]]; r[3]++; s.right++; if (before === 0) s.newly++; if (r[0] === 5 && before < 5) s.mastered++; Life.track('quizRight', 1);
      if (typed || q.type === 'listen') Life.track('engRight', 1);
      if (s.kind === 'chal') Challenge.got(s.task, v.w); }
    else { r[0] = Math.max(1, r[0] - 1); r[1] = today + 1; r[4]++; s.wrong.push(q.i); }
    if (ok) s.ans.lucky = Feel.luck(s, q);
    if (q.type !== 'listen' || !ok) this.speak(v.w);
    UI.refresh('study'); Game.save();
    if (ok) { const qi = s.qi; setTimeout(() => { if (this.sess === s && s.step === 'quiz' && s.qi === qi && s.ans) this.next(); }, s.ans.lucky ? 1900 : 1000); }
  },
  next() {
    const s = this.sess; if (!s || !s.ans) return; s.qi++; s.ans = null;
    if (s.qi >= s.qs.length && s.kind === 'story' && !s.redo && !s.opts.strict) {
      s.redo = true; const seen = new Set(), again = s.qs.filter((q, k) => s.wrong.includes(q.i) && !seen.has(q.i) && seen.add(q.i));
      if (again.length) { s.redoFrom = s.qs.length; s.qs.push(...again.map(q => Object.assign({}, q))); }
    }
    if (s.qi >= s.qs.length && s.kind === 'chal' && !s.redo) {
      // a challenge never restarts: the words you missed come back once more at the end
      s.redo = true; const again = [...new Set(s.wrong)].filter(i => !(s.task.got || []).includes(VOCAB[i].w));
      if (again.length) { s.redoFrom = s.qs.length; s.qs.push(...Challenge.makeQs(s.task, shuffle(again))); }
    }
    if (s.qi >= s.qs.length) this.finish(); else Adaptive.prepare(s); UI.refresh('study');
  },
  finish() {
    const s = this.sess; if (!s || s.step !== 'quiz' || s.result || !s.qs?.length || s.qi < s.qs.length) return;
    const n = s.qs.length, R = s.right, L = this.L; s.step = 'result';
    const res = { coins: 0, xp: R * 3 + s.newly * 2, items: [], msg: '' };
    if (s.kind === 'levelgate') { Object.assign(res, LevelGate.finish(s, R, n)); }
    else if (s.kind === 'daily') {
      res.coins = R * 2 + (R === n ? 15 : 0); L.dailyScore = `${R}/${n}`;
      if (!L.dailyDone) {
        L.dailyDone = true; const day = Life.today();
        L.streak = L.lastDone === this.yesterday() ? (L.streak || 0) + 1 : (L.lastDone >= day ? L.streak : 1); L.lastDone = day; L.best = Math.max(L.best || 0, L.streak);
        Life.track('vocab', 1); res.msg = I18n.s("u_46815ac416f8", [L.streak]);
      } else res.msg = I18n.s("u_35e0389748ca");
    } else if (s.kind === 'train') {
      res.coins = R; res.xp = R * 2; Object.assign(res, Pets.trainResult(s.opts.pid, s.opts.trick, R, n));
    } else if (s.kind === 'help') {
      res.coins = 0; res.xp = R * 2; Object.assign(res, Social.helpResult(s.opts, R, n));
    } else if (s.kind === 'story') {
      Object.assign(res, Story.finish(s, R));
    } else if (s.kind === 'team') {
      res.coins = R; res.msg = R ? I18n.s("u_67e08c8a3a18", [R]) : I18n.s("u_7884007316e9");
    } else if (s.kind === 'chal') {
      const t = s.task, left = Challenge.left(t).length; res.coins = R;
      res.msg = t.prog >= t.need ? I18n.s("u_1af5b15ce928") : I18n.s("u_ab786b0c095c", [t.prog, t.need, left]);
    } else if (s.kind === 'need') {
      const it = s.opts.item, cnt = R >= n ? 2 : R >= 3 ? 1 : 0; res.coins = R;
      if (cnt) { Life.give(it, cnt); res.items.push([it, cnt]); Life.track('swap', 1, { perfect: R >= n }); res.msg = cnt === 2 ? I18n.s("u_04b52e212d53", [SUPPLIES[it].n]) : I18n.s("u_8542d2a56bb4", [SUPPLIES[it].n]); }
      else res.msg = I18n.s("u_885171da72b8", [SUPPLIES[it].n]);
      const task = Challenge.task('l_swap');
      if (task && Challenge.tierOf(task)) {
        res.taskNote = task.prog >= task.need ? I18n.s("u_5db011cac36e", [task.prog, task.need]) : Challenge.tierOf(task) === 'h' && R < n ? I18n.s("u_23bd970ce5f8", [task.prog, task.need]) : I18n.s("u_30662d80cb83", [task.prog, task.need]);
      }
      Life.track('study', 0);
    } else {
      const day = Life.today(); if (L.pDay !== day) { L.pDay = day; L.pCoins = 0; }
      const c = Math.min(R * 2, Math.max(0, 40 - L.pCoins)); L.pCoins += c; res.coins = c;
      res.msg = c < R * 2 ? I18n.s("u_87b4cbf421fb") : I18n.s("u_17d887526210");
      Life.track('study', 1);
    }
    if (s.kind !== 'levelgate') res.coins += s.mastered * 3;
    res.coins = Game.reward(res.coins, res.xp, 'quiz');
    s.result = res; UI.badges(); UI.refresh('learn'); Game.save(); saveSoon();
  },
};

// Keyboard state belongs to a physical key press and a live input, never to a stale quiz DOM.
const SpellKeys={
 composing:new WeakSet(),pending:null,held:false,
 enter(e){return e.key==='Enter'||e.code==='Enter'||e.code==='NumpadEnter'||e.keyCode===13},
 live(){const s=Learn.sess,w=UI.wins&&UI.wins.study,el=document.getElementById('spell-in');if(!s||!w||w.el.hidden||s.step!=='quiz'||!el)return null;const q=s.qs[s.qi];return q&&['spell','listenspell'].includes(q.type)?{s,el}:null},
 submit(el){const live=this.live();if(!live||live.el!==el||live.s.ans||el.disabled)return;if(this.composing.has(el)){this.pending={s:live.s,qi:live.s.qi,el};return;}this.pending=null;Learn.answer(el.value)},
 start(el){this.composing.add(el)},
 end(el){this.composing.delete(el);const live=this.live();if(live&&live.el===el){live.s.typed=el.value;live.s.typedKey='q'+live.s.qi;}const p=this.pending;if(p&&p.el===el){this.pending=null;setTimeout(()=>{const now=this.live();if(now&&now.el===el&&now.s===p.s&&now.s.qi===p.qi)this.submit(el)},0)}},
 blur(el){this.composing.delete(el);if(this.pending&&this.pending.el===el)this.pending=null},
 keydown(e){if(!this.enter(e))return;const live=this.live();if(!live)return;const {s,el}=live,target=e.target;
   if(target&&target.closest&&target.closest('button'))return;
   if(target&&target!==el&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)))return;
   e.stopImmediatePropagation();if(this.composing.has(el)){this.held=true;this.pending={s,qi:s.qi,el};return;}e.preventDefault();if(e.repeat||this.held)return;this.held=true;if(s.ans)Learn.next();else this.submit(el);
 },
 keyup(e){if(!this.enter(e))return;if(this.held){this.held=false;return;}const live=this.live();if(!live||live.s.ans||this.composing.has(live.el))return;const t=e.target;if(t&&t!==live.el&&(t.closest&&t.closest('button')||['INPUT','TEXTAREA','SELECT'].includes(t.tagName)||t.isContentEditable))return;e.preventDefault();e.stopImmediatePropagation();this.submit(live.el)},
};
document.addEventListener('keydown',e=>SpellKeys.keydown(e),true);
document.addEventListener('keyup',e=>SpellKeys.keyup(e),true);
window.addEventListener('blur',()=>{SpellKeys.held=false;SpellKeys.pending=null;SpellKeys.composing=new WeakSet()});

/* ---------------- windows ---------------- */
Object.assign(UI.WIN, {
  swap: { t: I18n.s("u_e5ce3e7b0e48"), i: 'i_bag', w: 450, at: ['c', 0] },
  learn: { t: I18n.s("u_dcb9874582c0"), i: 'i_learn', w: 450, at: ['l', 0] },
  study: { t: I18n.s("u_53a60ddde56e"), i: 'i_learn', w: 460, at: ['c', 0], modal: true },
  words: { t: I18n.s("u_07ae75b78ba7"), i: 'i_book', w: 460, at: ['l', 1] },
});
Object.assign(UI, {
  wq: '', wf: 'all', wt: 0,
  swapOptions() {
    return h('div', { class: 'swap' }, ...Object.keys(SUPPLIES).map(k => h('button', { class: 'swapbtn', title: SUPPLIES[k].desc, onclick: () => { this.closeWin('swap'); Learn.start('need', { item: k }); } }, ico(SUPPLIES[k].spr, 32), h('span', { text: SUPPLIES[k].n }), h('em', { class: 'num', text: '×' + (Life.L.bag[k] || 0) }))));
  },
  w_swap() {
    const t = Challenge.task('l_swap'), hard = t && Challenge.tierOf(t) === 'h';
    return [h('p', { text: I18n.s("u_e71c556e229c") }),
      t ? h('p', { class: 'swap-rule', text: hard ? I18n.s("u_d74b0dd25406", [t.prog, t.need]) : I18n.s("u_d26cea506616", [t.prog, t.need]) }) : null,
      this.swapOptions()];
  },
  w_learn() {
    Learn.ensureDaily(); const L = Learn.L, done = L.dailyDone, rev = Math.min(20, L.reviewed);
    const step = (n, label, on, cur) => h('div', { class: 'lstep' + (on ? ' on' : '') + (cur ? ' cur' : '') }, h('b', { class: 'num', text: String(n) }), h('span', { text: label }));
    const preview = h('div', { class: 'wchips' }, ...L.dailyWords.slice(0, 8).map(w => h('span', { class: 'wchip', text: w })), L.dailyWords.length > 8 ? h('span', { class: 'hint', text: I18n.s("u_84515a556895", [L.dailyWords.length]) }) : null);
    const today = h('div', { class: 'lcard' }, h('div', { class: 'lhead' }, h('b', { text: I18n.s("u_520b669f7f3e") }), h('span', { class: 'hint', text: done ? I18n.s("u_6652ba2ec4e7", [L.dailyScore]) : rev >= 20 ? I18n.s("u_4a871e9ab4af") : I18n.s("u_093339fa02fb", [rev]) })),
      h('div', { class: 'lsteps' }, step(1, I18n.s("u_e056822f6361"), rev >= 20, rev < 20), step(2, I18n.s("u_24f699917a5d"), done, rev >= 20 && !done), step(3, I18n.s("u_ffdcd522f85e"), done && Life.L.daily && Life.L.daily.tasks[0].claimed, done)), preview,
      done ? h('button', { class: 'chip', onclick: () => Learn.start('redo') }, ico('i_reset', 20), I18n.s("u_ffae5de7b95d")) : h('button', { class: 'chip big primary', onclick: () => Learn.start('daily') }, ico('i_learn', 22), rev >= 20 ? I18n.s("u_621b53c8d4a3") : rev > 0 ? I18n.s("u_847050f5fd0c", [rev]) : I18n.s("u_c69404c0634c")));
    const tot = VOCAB.length;
    const stat = (n, label) => h('div', { class: 'lstat' }, h('b', { class: 'num', text: String(n) }), h('span', { text: label }));
    const stats = h('div', { class: 'lstats' }, stat(Learn.countSeen(), I18n.s("u_c6db6723c33c")), stat(Learn.countLearned(), I18n.s("u_7e02b75bee98")), stat(Learn.countFamiliar(), I18n.s("u_963d09bf058c")), stat(Learn.countMastered(), I18n.s("u_d93677166837")), stat(Learn.streakNow(), I18n.s("u_4bca91e71efd")));
    if (!this._lvCount) { this._lvCount = {}; for (const v of VOCAB) this._lvCount[v.t] = (this._lvCount[v.t] || 0) + 1; }
    const on = new Set(Learn.levelsOn());
    const tiers = h('div', { class: 'ltiers' }, ...VLEVELS.map(t => { const all = this._lvCount[t], got = Learn.countLevel(t); return h('div', { class: 'ltier' + (on.has(t) ? '' : ' off') }, h('button', { class: 'lvtog' + (on.has(t) ? ' on' : ''), 'aria-pressed': on.has(t) ? 'true' : 'false', title: on.has(t) ? I18n.s("u_337c5b441fcc") : I18n.s("u_55ca1f9f1727"), onclick: () => Learn.toggleLevel(t) }, on.has(t) ? ico('i_check', 14) : null), h('span', { class: 'num', text: 'L' + t }), h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round(got / all * 100)}%` })), h('span', { class: 'num hint', text: `${got}/${all}` })); }));
    const day = Life.today(), left = L.pDay === day ? Math.max(0, 40 - L.pCoins) : 40;
    const swap = this.swapOptions();
    return [today, stats, h('div', { class: 'sub', text: I18n.s("u_7000eb20ceea") }), tiers,
      h('div', { class: 'sub', text: I18n.s("u_b86787cac8d4") }), swap,
      h('div', { class: 'row wrap' }, h('button', { class: 'chip', onclick: () => Learn.start('practice') }, ico('i_sparkle', 20), I18n.s("u_a6a356cb54c8", [left])), h('button', { class: 'chip', onclick: () => this.openWin('words') }, ico('i_book', 20), I18n.s("u_16719b915698", [tot]))),
      h('p', { class: 'hint', text: I18n.s("u_0f86034eca95") })];
  },
  w_study() {
    const s = Learn.sess;
    if (!s) return [h('div', { class: 'empty' }, h('p', { text: I18n.s("u_4e050d5eddfa") }))];
    const kindName = s.kind === 'story' ? Story.title(s.opts) : s.kind === 'team' ? I18n.s("u_710a2b764c77") : s.kind === 'chal' ? Challenge.title(s.task) : s.kind === 'daily' ? I18n.s("u_520b669f7f3e") : s.kind === 'need' ? I18n.s("u_c5e7811c416c", [SUPPLIES[s.opts.item].n]) : s.kind === 'train' ? Pets.trainTitle(s.opts) : s.kind === 'help' ? Social.helpTitle(s.opts) : I18n.s("u_747d826c1843");
    const bar = (a, b) => h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round(a / b * 100)}%` }));
    if (s.step === 'pause') {
      const left = s.words.length - s.ri;
      return [h('div', { class: 'shead' }, h('b', { text: kindName }), h('span', { class: 'num hint', text: I18n.s("u_1419fcffa7e1", [s.ri, s.words.length]) })), bar(s.ri, s.words.length),
        h('div', { class: 'result' }, ico('i_sparkle', 40), h('p', { class: 'gift-t', text: I18n.s("u_9b1ccd11ba29", [s.ri]) }), h('p', { class: 'hint', text: I18n.s("u_d163bed5080c", [left]) })),
        h('div', { class: 'row center sbtns' }, h('button', { class: 'chip big', onclick: () => this.closeWin('study') }, I18n.s("u_afd0cddd2a62")), h('button', { class: 'chip big primary', id: 'more5', onclick: () => Learn.more() }, I18n.s("u_7607066411e2", [Math.min(5, left)])))];
    }
    if (s.step === 'review') {
      const v = VOCAB[s.words[s.ri]];
      if (s.spoke !== 'r' + s.ri) { s.spoke = 'r' + s.ri; setTimeout(() => Learn.speak(v.w), 150); }
      return [h('div', { class: 'shead' }, h('b', { text: kindName }), h('span', { class: 'num hint', text: I18n.s("u_1419fcffa7e1", [s.ri + 1, s.words.length]) })), bar(s.ri, s.words.length),
        h('button', { class: 'fcard' + (s.flip ? ' flip' : ''), id: 'fcard', onclick: () => { s.flip = !s.flip; this.refresh('study'); } },
          h('span', { class: 'ftier', text: TIER_NAME[v.t] }), h('span', { class: 'fword', text: v.w }), v.ph ? h('span', { class: 'fph', text: v.ph }) : null, h('span', { class: 'fpos', text: v.p }),
          s.flip ? h('span', { class: 'fzh', text: v.z }) : h('span', { class: 'hint', text: I18n.s("u_085cc863c4b1") })),
        h('div', { class: 'row center' }, h('button', { class: 'chip', 'aria-label': I18n.s("u_07c1b097b4a1"), onclick: () => Learn.speak(v.w) }, ico('i_speaker', 20), I18n.s("u_07c1b097b4a1"))),
        h('div', { class: 'row center sbtns' }, h('button', { class: 'chip big', id: 'rv-back', disabled: s.ri <= 0, 'aria-label': I18n.s("u_f410d9aecc82"), title: I18n.s("u_a97f55fc8ecc"), onclick: () => Learn.back() }, ico('i_back', 20), I18n.s("u_f60cafb25326")), h('button', { class: 'chip big', onclick: () => Learn.review(false) }, I18n.s("u_f816431d3ad1")), h('button', { class: 'chip big primary', onclick: () => Learn.review(true) }, I18n.s("u_defc0240409f"))),
        h('p', { class: 'hint center kbd-hint', text: I18n.s("u_f25880e19a13") }),
        s.kind !== 'daily' ? h('button', { class: 'chip sm', onclick: () => Learn.skipReview() }, I18n.s("u_812fb961ff4b")) : null];
    }
    if (s.step === 'quiz') {
      const q = s.qs[s.qi], v = VOCAB[q.i], A = s.ans;
      if (q.type === 'listen' && s.spoke !== 'q' + s.qi) { s.spoke = 'q' + s.qi; setTimeout(() => Learn.speak(v.w), 200); }
      let prompt, sub;
      if (q.type === 'en2zh') { prompt = h('div', { class: 'qword' }, v.w, h('button', { class: 'xbtn', 'aria-label': I18n.s("u_07c1b097b4a1"), onclick: () => Learn.speak(v.w) }, ico('i_speaker', 22))); sub = I18n.s("u_6d4c94ada1df", [v.ph ? v.ph + ' · ' : '', v.p]); }
      else if (q.type === 'zh2en') { prompt = h('div', { class: 'qzh', text: v.z }); sub = I18n.s("u_12c496f4a564", [v.p]); }
      else if (q.type === 'listen') { prompt = h('button', { class: 'chip big primary', onclick: () => Learn.speak(v.w) }, ico('i_speaker', 24), I18n.s("u_95ea7762946e")); sub = I18n.s("u_2895e8416b32"); }
      else if (q.type === 'listenspell') { prompt = h('button', { class: 'chip big primary', onclick: () => Learn.speak(v.w) }, ico('i_speaker', 24), I18n.s("u_95ea7762946e")); sub = I18n.s("u_1fb5519fb68c"); }
      else { prompt = h('div', { class: 'qzh', text: v.z }); sub = q.noHint ? I18n.s("u_e0bc10bbdefb", [v.p]) : I18n.s("u_a23b5e2f5b3e", [v.p, v.w.length]); }
      const redo = s.redoFrom != null && s.qi >= s.redoFrom;
      const ctx = q.ctx ? h('p', { class: 'qctx', text: q.ctx }) : null;
      const parts = [h('div', { class: 'shead' }, h('b', { text: kindName }), h('span', { class: 'num hint', text: redo ? I18n.s("u_ac75ea2713f3", [s.qi - s.redoFrom + 1, s.qs.length - s.redoFrom]) : I18n.s("u_a8ce1fb26c0f", [s.qi + 1, s.redoFrom != null ? s.redoFrom : s.qs.length, s.right]) })), bar(s.qi, s.qs.length), h('div', { class: 'qbox' }, ctx, prompt, h('p', { class: 'hint', text: sub }))];
      let spellingSlots = null;
      if (q.type === 'spell' || q.type === 'listenspell') {
        const hintTxt = q.hint || (q.noHint || q.type === 'listenspell' ? '' : v.w[0] + ' ' + '_ '.repeat(v.w.length - 1).trim());
        const key = 'q' + s.qi;
        const hinted=q.hint?Array.from(q.hint.replace(/\s/g,'')):q.noHint||q.type==='listenspell'?[]:[v.w[0]];
        const cells=Array.from(v.w).map(ch=>h('span',{class:/[a-z]/i.test(ch)?'spell-letter':'spell-separator','aria-hidden':'true'}));
        const paint=value=>{const typed=Array.from(value);cells.forEach((cell,i)=>{cell.textContent=(!/[a-z]/i.test(v.w[i])?v.w[i]:typed[i])||((hinted[i]&&hinted[i]!=='_')?hinted[i]:'\u00a0');cell.classList.toggle('hinted',!typed[i]&&!!hinted[i]&&hinted[i]!=='_')});};
        spellingSlots=h('div',{class:'spell-slots',role:'img','aria-label':I18n.t('spell.letterCount',[(v.w.match(/[a-z]/ig)||[]).length]),'data-length':v.w.length},...cells);
        paint(!A&&s.typedKey===key?s.typed||'':'');
        const inp = h('input', { id: 'spell-in', type: 'text', lang: 'en', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done', disabled: !!A, placeholder: hintTxt, value: !A && s.typedKey === key ? s.typed || '' : '',
          oninput: e => { s.typed = e.target.value; s.typedKey = key; paint(e.target.value); },
          oncompositionstart: e => SpellKeys.start(e.target),
          oncompositionend: e => SpellKeys.end(e.target),
          onblur: e => SpellKeys.blur(e.target) });
        parts.push(h('form', { class: 'row', onsubmit: e => { e.preventDefault(); SpellKeys.submit(inp); } }, h('div', { class: 'inset grow' }, inp), h('button', { type:'submit', class: 'chip primary', disabled: !!A }, I18n.s("u_20db9f87b860"))));
        if (!A) setTimeout(() => { const el = document.getElementById('spell-in'); if (el && document.activeElement !== el) { el.focus({preventScroll:true}); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) { } } }, 30);
      } else {
        parts.push(h('div', { class: 'qopts' }, ...q.opts.map((oi, k) => {
          const o = VOCAB[oi], txt = q.type === 'zh2en' ? o.w : o.z;
          let cls = 'qopt'; if (A) { if (oi === q.i) cls += ' right'; else if (A.val === oi) cls += ' wrong'; }
          return h('button', { class: cls, disabled: !!A, onclick: () => Learn.answer(oi) }, h('em', { class: 'num', text: String(k + 1) }), h('span', { text: txt }));
        })));
      }
      // the answer line always has its room: the window keeps the same height before and after answering
      const fbTxt = `${v.w} ${v.ph}  ${v.p} ${v.z}`;
      parts.push(h('div', { class: 'qslot' }, A ? h('div', { class: 'qfb ' + (A.ok ? 'ok' : 'no') + (A.lucky ? ' luck' : '') },
        h('div', { class: 'qfb-t' }, h('div', { class: 'qfb-l1' }, h('b', { text: A.ok ? I18n.s("u_97c6bbf85445") : I18n.s("u_be3854998308") }), A.lucky ? h('span', { class: 'lucky' }, ico(A.lucky.icon, 18), h('b', { text: I18n.s("u_786a5b4a0cf2") }), h('span', { text: A.lucky.text })) : null), h('div', { class: 'qfb-l2', 'data-i18n-skip':true, title: fbTxt, text: fbTxt })),
        h('button', { class: 'chip sm primary', id: 'q-next', onclick: () => Learn.next() }, s.qi + 1 >= s.qs.length ? I18n.s("u_3f188107191e") : I18n.s("u_c52524b00455"))) : null));
      const meta=parts.splice(0,2), feedback=parts.pop();
      const entry=parts.find(node=>node&&node.tagName==='FORM');
      const question=parts.filter(node=>node&&node!==entry);
      if(entry)entry.classList.add('quiz-entry');
      return [h('div',{class:'quiz-shell'+(A?' answered':'')},
        h('div',{class:'quiz-meta'},...meta),
        h('div',{class:'quiz-content scroll'},...question),
        entry?h('div',{class:'quiz-input'},spellingSlots,entry):null,
        feedback)];
    }
    const r = s.result, n = s.qs.length;
    return [h('div', { class: 'result' }, h('div', { class: 'rscore num', text: `${s.right} / ${n}` }), h('p', { class: 'gift-t', text: r.msg }), r.taskNote ? h('p', { class: 'swap-rule', text: r.taskNote }) : null,
      h('div', { class: 'rw big' }, h('span', { class: 'rwc' }, ico('i_coin', 22), h('b', { class: 'num', text: '+' + r.coins })), h('span', { class: 'rwc' }, ico('i_star', 22), h('b', { class: 'num', text: '+' + r.xp })), ...r.items.map(([k, c]) => h('span', { class: 'rwc' }, ico(SUPPLIES[k].spr, 24), h('b', { class: 'num', text: '×' + c })))),
      s.luckyN ? h('p', { class: 'hint', text: I18n.s("u_ecc018bdb57f", [s.luckyN]) }) : null,
      s.newly || s.mastered ? h('p', { class: 'hint', text: I18n.s("u_cdcf6169899d", [s.newly]) + (s.mastered ? I18n.s("u_4155a119672e", [s.mastered]) : '') }) : null),
      s.wrong.length ? h('div', { class: 'sub', text: I18n.s("u_dfcac72f08a7") }) : null,
      s.wrong.length ? h('div', { class: 'wlist' }, ...s.wrong.map(i => h('div', { class: 'wrow' }, h('b', { text: VOCAB[i].w }), h('span', { class: 'hint', text: VOCAB[i].p }), h('span', { text: VOCAB[i].z }), h('button', { class: 'xbtn', 'aria-label': I18n.s("u_07c1b097b4a1"), onclick: () => Learn.speak(VOCAB[i].w) }, ico('i_speaker', 18))))) : null,
      h('div', { class: 'row center wrap' },
        s.kind === 'need' && r.items.length && s.opts.needId && Life.L.needs.some(x => x.id === s.opts.needId) ? h('button', { class: 'chip primary', onclick: () => { const nd = Life.L.needs.find(x => x.id === s.opts.needId); this.closeWin('study'); if (nd) Life.use(s.opts.item, nd); } }, ico(SUPPLIES[s.opts.item].spr, 20), I18n.s("u_22a970cc999a")) : null,
        s.kind === 'need' ? h('button', { class: 'chip primary', onclick: () => Learn.start('need', s.opts) }, ico('i_reset', 20), r.items.length ? I18n.s("u_a53cdc600e62") : I18n.s("u_2f5a858ab28f")) : null,
        s.kind === 'need' && r.taskNote ? h('button', { class: 'chip', onclick: () => { this.closeWin('study'); this.openTasks('daily'); } }, ico('i_task', 20), I18n.s("u_731ccb418eab")) : null,
        s.kind === 'daily' || (s.kind === 'chal' && s.task.prog >= s.task.need) ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('study'); this.openTasks('daily'); } }, ico('i_task', 20), I18n.s("u_0105098a9af9")) : null,
        s.kind === 'story' ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('study'); Story.open(); } }, ico('i_shop', 20), I18n.s("u_0956b0fb5251", [MERCHANTS[Story.week().mk].n])) : null,
        s.kind === 'chal' && s.task.prog < s.task.need ? h('button', { class: 'chip primary', onclick: () => Learn.start('chal', s.opts) }, ico('i_reset', 20), I18n.s("u_c9ec7dfd33a7")) : null,
        s.kind === 'train' ? h('button', { class: 'chip primary', onclick: () => { this.closeWin('study'); Pets.select(s.opts.pid, 'train'); } }, ico('i_paw', 20), I18n.s("u_b8a85ecdf2d2")) : null,
        s.kind === 'help' && s.right < 3 ? h('button', { class: 'chip primary', onclick: () => Learn.start('help', s.opts) }, ico('i_reset', 20), I18n.s("u_2f5a858ab28f")) : null,
        s.kind === 'help' ? h('button', { class: 'chip', onclick: () => { this.closeWin('study'); if (Visit.active) Visit.refreshMarks(); else UI.openWin('visit'); } }, ico('i_people', 20), I18n.s("u_7507b3066073")) : null,
        h('button', { class: 'chip', onclick: () => this.closeWin('study') }, I18n.s("u_c0b3fbff51cc")))];
  },
  w_words() {
    const q = this.wq.trim().toLowerCase();
    const filt = VOCAB.filter(v => {
      const r = Learn.P[v.w], b = r ? r[0] : 0, seen = !!r;
      if (this.wt && v.t !== this.wt) return false;
      if (this.wf === 'new' && seen) return false; if (this.wf === 'learning' && (!seen || b >= 3)) return false; if (this.wf === 'known' && b < 3) return false;
      return !q || v.w.toLowerCase().includes(q) || v.z.includes(q);
    });
    const tabs = h('div', { class: 'tabs' }, ...[['all', I18n.s("u_5c55a67935af")], ['new', I18n.s("u_6b1e0b08564b")], ['learning', I18n.s("u_44380c741c82")], ['known', I18n.s("u_963d09bf058c")]].map(([k, l]) => h('button', { class: 'tab' + (this.wf === k ? ' on' : ''), onclick: () => { this.wf = k; this.refresh('words'); } }, l)));
    const ttabs = h('div', { class: 'tabs wrap' }, ...[[0, I18n.s("u_5c55a67935af")], ...VLEVELS.map(t => [t, 'L' + t])].map(([k, l]) => h('button', { class: 'tab' + (this.wt === k ? ' on' : ''), onclick: () => { this.wt = k; this.refresh('words'); } }, l)));
    const search = h('div', { class: 'inset' }, h('input', { id: 'w-q', type: 'search', value: this.wq, placeholder: I18n.s("u_81fb14424e7e"), oninput: e => { this.wq = e.target.value; this.refresh('words'); } }));
    const MAX = 300;
    const rows = filt.slice(0, MAX).map(v => { const b = Learn.box(v.i); return h('div', { class: 'wrow' }, h('b', { text: v.w }), h('span', { class: 'hint', text: v.p }), h('span', { class: 'wz', text: v.z }), h('span', { class: 'dots', title: I18n.s("u_1c50df01d4e0", [b]) }, ...[1, 2, 3, 4, 5].map(k => h('i', { class: k <= b ? 'on' : '' }))), h('button', { class: 'xbtn', 'aria-label': I18n.s("u_07c1b097b4a1"), onclick: () => Learn.speak(v.w) }, ico('i_speaker', 18))); });
    return [search, tabs, ttabs, h('div', { class: 'sub', text: I18n.s("u_0e4752b5342e", [filt.length]) + (filt.length > MAX ? I18n.s("u_6a162aee6e09", [MAX]) : '') }), h('div', { class: 'scroll wlist' }, ...rows)];
  },
});
// Choice shortcuts use physical key codes as well as locale-dependent key values.
Learn.choiceKey=function(e){
 if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
 const target=e.target;if(target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)))return;
 const w=UI.wins?.study,s=this.sess;if(!w||w.el.hidden||!s||s.step!=='quiz'||s.ans)return;
 const q=s.qs?.[s.qi];if(!q||['spell','listenspell'].includes(q.type)||!Array.isArray(q.opts))return;
 const other=Object.values(UI.wins).some(v=>v!==w&&!v.el.hidden&&(Number(v.el.style.zIndex)||0)>(Number(w.el.style.zIndex)||0));if(other)return;
 const physical=/^(?:Digit|Numpad)([1-4])$/.exec(e.code||''),key=String(e.key||'').replace(/[１２３４]/g,ch=>String(ch.charCodeAt(0)-0xff10));
 const n=physical?Number(physical[1]):/^[1-4]$/.test(key)?Number(key):0;if(!n||n>q.opts.length)return;
 e.preventDefault();e.stopImmediatePropagation();this.answer(q.opts[n-1]);
};
window.addEventListener('keydown',e=>Learn.choiceKey(e),true);
document.addEventListener('keydown', e => {
  const w = UI.wins && UI.wins.study; if (!w || w.el.hidden || !Learn.sess) return;
  const tag = (e.target && e.target.tagName) || ''; const s = Learn.sess;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;   // the focused button handles it (no double "next")
  if (s.step === 'quiz' && !s.ans) {
    const q = s.qs[s.qi], el = document.getElementById('spell-in');
    if (q && (q.type === 'spell' || q.type === 'listenspell') && el && !el.disabled) {
      // the spelling box lost focus (a click somewhere, a refresh): Enter still answers, letters go back into the box
      if (e.key === 'Enter') { e.preventDefault(); Learn.answer(el.value); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { el.focus(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); el.focus(); el.value = el.value.slice(0, -1); s.typed = el.value; s.typedKey = 'q' + s.qi; return; }
    }
  }
  if (s.step === 'pause') { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); Learn.more(); } return; }
  if (s.step === 'review') {
    if (e.key === ' ') { e.preventDefault(); s.flip = !s.flip; UI.refresh('study'); }
    else if (e.key === 'Backspace' || e.key === 'ArrowUp') { e.preventDefault(); Learn.back(); }
    else if (e.key === 'ArrowLeft' || e.key === '1') Learn.review(false);
    else if (e.key === 'ArrowRight' || e.key === '2') Learn.review(true);
  } else if (s.step === 'quiz') {
    const q = s.qs[s.qi];
    if (s.ans && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); Learn.next(); }
  }
});

const OLD_WORDS_500 = ["ability", "absent", "active", "actually", "admire", "advice", "afford", "agree", "allow", "ancient", "anger", "annoy", "anxious", "apartment", "appear", "argue", "arrange", "arrive", "attack", "attend", "attention", "award", "balance", "battle", "belief", "belong", "benefit", "blank", "bother", "brave", "brief", "budget", "burden", "career", "celebrate", "challenge", "citizen", "clever", "climate", "collect", "common", "compare", "complain", "confident", "consider", "contain", "control", "convenient", "correct", "create", "crowd", "culture", "customer", "damage", "danger", "decorate", "degree", "deliver", "describe", "desert", "deserve", "destroy", "develop", "difference", "direction", "discuss", "disease", "distance", "doubt", "education", "effort", "energy", "enemy", "enter", "especially", "event", "exact", "excellent", "exercise", "expect", "explain", "express", "fail", "famous", "favorite", "fever", "figure", "final", "foreign", "forgive", "freedom", "friendly", "future", "gentle", "goal", "government", "greet", "guess", "guest", "handle", "harm", "health", "honest", "huge", "human", "hurry", "imagine", "important", "include", "increase", "influence", "invite", "island", "journey", "judge", "language", "lazy", "lesson", "limit", "local", "lonely", "manage", "market", "material", "medicine", "member", "memory", "message", "method", "mistake", "moment", "nature", "nervous", "notice", "offer", "opinion", "peace", "perfect", "period", "personal", "polite", "popular", "possible", "praise", "prepare", "pretend", "pride", "private", "prize", "progress", "promise", "protect", "provide", "purpose", "quality", "reason", "receive", "record", "refuse", "regular", "relax", "repeat", "reply", "respect", "result", "safety", "satisfy", "schedule", "secret", "select", "serious", "share", "silent", "similar", "society", "solve", "spirit", "strange", "strength", "stress", "suggest", "support", "surprise", "talent", "task", "teenager", "terrible", "thirsty", "threaten", "tradition", "treasure", "trust", "truth", "valuable", "victory", "volunteer", "weigh", "wisdom", "wonder", "youth", "absorb", "academic", "accurate", "achieve", "adapt", "adequate", "adjust", "adventure", "advertisement", "affect", "ambition", "analyze", "annual", "apologize", "appetite", "approach", "appropriate", "approve", "assist", "assume", "attitude", "attract", "audience", "aware", "awkward", "background", "behave", "biology", "brilliant", "broadcast", "calculate", "capable", "capture", "category", "certificate", "chemistry", "classical", "colleague", "combine", "committee", "communicate", "community", "competition", "concentrate", "concern", "conclusion", "condition", "confirm", "conflict", "connect", "consequence", "constant", "consume", "contact", "content", "contribute", "convince", "cope", "creative", "creature", "criticize", "crucial", "curiosity", "current", "debate", "declare", "decline", "defeat", "delicate", "delight", "demand", "demonstrate", "deny", "desire", "despite", "detail", "device", "devote", "dialogue", "digital", "diligent", "disaster", "discipline", "distinguish", "diverse", "domestic", "donate", "eager", "economic", "elderly", "element", "eliminate", "emergency", "emotion", "employ", "encounter", "encourage", "ensure", "entertain", "enthusiasm", "establish", "estimate", "eventually", "evidence", "exaggerate", "exchange", "exhausted", "exhibition", "expand", "expense", "explore", "export", "extend", "facility", "factor", "faith", "fascinate", "feature", "fluent", "focus", "formal", "fortunate", "foundation", "fragile", "frustrate", "fundamental", "generation", "generous", "genius", "global", "graduate", "grateful", "guidance", "harmony", "highlight", "horizon", "identify", "ignore", "illustrate", "immediate", "impact", "impress", "incident", "income", "independent", "individual", "industry", "inform", "initial", "injure", "insist", "inspire", "install", "instant", "instruct", "intelligent", "intend", "intense", "interpret", "interrupt", "interview", "investigate", "involve", "journal", "justice", "labor", "launch", "legend", "leisure", "logical", "luxury", "majority", "mature", "meaningful", "merchant", "miracle", "mission", "monitor", "moral", "mysterious", "narrow", "negative", "negotiate", "neutral", "nutrition", "objective", "obstacle", "obvious", "occasion", "occur", "operate", "opportunity", "oppose", "optimistic", "original", "outstanding", "particular", "passion", "perform", "permanent", "permit", "perspective", "persuade", "philosophy", "physical", "pleasant", "pollution", "positive", "poverty", "precious", "precise", "preference", "pressure", "primary", "principle", "procedure", "profession", "profit", "prominent", "promote", "property", "proportion", "prospect", "psychology", "publish", "qualify", "quantity", "rational", "react", "recall", "recommend", "recover", "refer", "reflect", "reform", "regret", "reject", "relevant", "reliable", "reluctant", "rely", "remain", "remote", "represent", "request", "require", "research", "resident", "resist", "resource", "respond", "restore", "restrict", "reveal", "revolution", "routine", "satellite", "scholar", "section", "sensitive", "sequence", "signal", "significant", "situation", "solution", "sophisticated", "spectacular", "stable", "strategy", "structure", "stubborn", "submit", "substance", "subtle", "sufficient", "superior", "survey", "survive", "sustain", "symbol", "technique", "temporary", "tendency", "theory", "thorough", "tragedy", "transfer", "transport", "tremendous", "trend", "ultimate", "undergo", "urban", "urgent", "valid", "vehicle", "venture", "vital", "vivid", "witness"];

/* Compact phone quiz surface: the input and explanation never sit below the question scroller. */
const StudyMobile = {
  key:null, frame:null,
  compact(){return window.innerWidth<760||(typeof Mobile!=='undefined'&&Mobile.on);},
  sync(){
    const w=UI.wins.study, active=!!(w&&!w.el.hidden&&this.compact());
    document.body.classList.toggle('purr-study-open',active);
    document.body.classList.toggle('purr-quiz-open',active&&Learn.sess?.step==='quiz');
    if(!active)return;
    const vv=window.visualViewport,height=vv?vv.height:window.innerHeight,top=vv?vv.offsetTop:0;
    w.el.style.setProperty('--study-height',Math.round(height)+'px');
    w.el.style.setProperty('--study-top',Math.round(top)+'px');
    w.el.classList.toggle('study-short',height<430);
    const s=Learn.sess,key=s?s.kind+':'+s.step+':'+s.qi+':'+s.ri:'';
    const scroller=w.body.querySelector('.quiz-content');
    if(this.key!==key&&scroller)scroller.scrollTop=0;
    this.key=key;
  },
  schedule(){cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(()=>this.sync());}
};
(function(){
  const render=UI.render.bind(UI);
  UI.render=function(id){const result=render(id);if(id==='study')StudyMobile.sync();return result;};
  for(const name of ['openWin','closeWin']){
    const original=UI[name].bind(UI);
    UI[name]=function(...args){const result=original(...args);StudyMobile.sync();return result;};
  }
  window.addEventListener('resize',()=>StudyMobile.schedule());
  window.visualViewport?.addEventListener('resize',()=>StudyMobile.schedule());
  window.visualViewport?.addEventListener('scroll',()=>StudyMobile.schedule());
})();
