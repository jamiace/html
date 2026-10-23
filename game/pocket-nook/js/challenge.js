/* ============================================================
   Daily tasks that need English
   - every day: today's words, one furniture to buy, two English challenges and one life task
   - English challenges use the word bank and the four question types; not timed, a wrong
     answer never restarts anything, the missed words come back once at the end, and you can
     stop half way (the words you got right stay counted)
   - life tasks go through the word quiz too: training a trick, or reviewing 5 words to get a
     supply for the room or a pet
   - every one of these three picks a tier before it starts: normal, or hard (x1.5 reward);
     once chosen (or once it has any progress) it stays for the day
   ============================================================ */
const CHAL = {
  c_spell: { n: '拼字挑戰', icon: 'i_learn', tiers: { n: 8, h: 10 }, d: { n: '看中文拼出英文，有字首和字數提示', h: '看中文拼出英文，沒有提示' } },
  c_listen: { n: '聽力挑戰', icon: 'i_speaker', tiers: { n: 10, h: 10 }, d: { n: '聽發音，選出中文意思', h: '聽發音，直接拼出英文' }, speak: true },
  c_review: { n: '錯字複習', icon: 'i_reset', tiers: { n: 8, h: 12 }, d: { n: '之前答錯過的字，選擇題', h: '之前答錯過的字，選擇題和拼字混合' } },
  c_new: { n: '新程度單字', icon: 'i_star', tiers: { n: 6, h: 10 }, d: { n: '比目前程度高一級的字，先看卡片再測驗', h: '比目前程度高一級的字，先看卡片再測驗（含拼字）' } },
};
const LIFE_TASKS = {
  l_train: { n: '訓練寵物成功', icon: 'i_paw', tiers: { n: 1, h: 2 }, d: { n: '訓練要答單字小測驗，答對 3 題算成功', h: '訓練要答單字小測驗，答對 3 題算成功' } },
  l_swap: { n: '複習單字換道具', icon: 'i_bag', tiers: { n: 1, h: 2 }, d: { n: '在「學習」複習 5 個單字換道具，換到就算一次', h: '在「學習」複習 5 個單字換道具，全對才算一次' } },
};
const TIER_N = { n: '普通', h: '困難' };
for (const k in CHAL) TASK_DEFS[k] = { t: (t) => `${CHAL[k].n}：答對 ${t.need} 個字`, need: () => CHAL[k].tiers.n, rw: { c: 35, x: 30 }, go: 'chal', tiers: CHAL[k].tiers };
TASK_DEFS.l_train = { t: (t) => `訓練寵物成功 ${t.need} 次`, need: () => 1, rw: { c: 25, x: 25 }, go: 'petTrain', tiers: LIFE_TASKS.l_train.tiers };
// kept only so a task already claimed today still shows its name
TASK_DEFS.l_ask = { t: () => '照顧寵物', need: () => 1, rw: { c: 25, x: 20 }, go: null };
TASK_DEFS.l_todo = { t: () => '完成待辦', need: () => 1, rw: { c: 20, x: 20 }, go: null };
TASK_DEFS.l_swap = { t: (t) => `複習單字換道具 ${t.need} 次`, need: () => 1, rw: { c: 25, x: 20 }, go: 'learn', tiers: LIFE_TASKS.l_swap.tiers };

const Challenge = {
  info(k) { return CHAL[k] || LIFE_TASKS[k] || null; },
  task(k) { const D = Life.L.daily; return D && D.tasks.find(t => t.k === k) || null; },
  tierOf(t) { return t.tier || (t.prog > 0 ? 'n' : null); },
  // choosing normal / hard; challenges fix their words at this moment so leaving and coming back continues the same list
  choose(k, tier) {
    const t = this.task(k); if (!t || this.tierOf(t)) return;
    t.tier = tier; t.need = TASK_DEFS[k].tiers[tier];
    if (CHAL[k]) { t.words = this.pickWords(k, tier, t.need); t.got = []; t.need = Math.max(1, Math.min(t.need, t.words.length)); }
    UI.refresh('tasks'); Game.save(); saveSoon();
  },
  left(t) { return (t.words || []).filter(w => !(t.got || []).includes(w) && VIDX[w] != null); },
  spellable(v) { return v.w.length <= 11 && /^[A-Za-z][A-Za-z'-]*$/.test(v.w); },
  pickWords(k, tier, n) {
    Learn.ensureDaily();
    // words you have met: everything already studied, plus today's 20 words (a new player studies those today)
    const P = Learn.P, today = new Set(Learn.L.dailyWords), seen = VOCAB.filter(v => P[v.w] || today.has(v.w)), box = (v) => P[v.w] ? P[v.w][0] : 0;
    let pool = [];
    if (k === 'c_spell' || (k === 'c_listen' && tier === 'h')) pool = shuffle(seen.filter(v => this.spellable(v))).sort((a, b) => box(a) - box(b));
    else if (k === 'c_listen') pool = shuffle(seen.slice()).sort((a, b) => box(a) - box(b));
    else if (k === 'c_review') pool = shuffle(seen.filter(v => P[v.w] && P[v.w][4] > 0)).sort((a, b) => (P[b.w][4] - P[b.w][3] * 0.3) - (P[a.w][4] - P[a.w][3] * 0.3));
    else if (k === 'c_new') {
      const up = this.nextLevel();
      pool = shuffle(VOCAB.filter(v => v.t === up && !P[v.w]));
      if (pool.length < n) pool.push(...shuffle(VOCAB.filter(v => v.t === up && P[v.w] && P[v.w][0] < 3)));
    }
    if (tier === 'h' && k !== 'c_listen') pool = pool.filter(v => k !== 'c_spell' || this.spellable(v));
    const out = pool.slice(0, n).map(v => v.w);
    // not enough words of that kind yet (a new player): fill from the normal word picker
    if (out.length < n) for (const i of Learn.pick(n * 3)) { const v = VOCAB[i]; if (out.length >= n) break; if (out.includes(v.w)) continue; if ((k === 'c_spell' || (k === 'c_listen' && tier === 'h')) && !this.spellable(v)) continue; out.push(v.w); }
    return out;
  },
  // your level = the lowest checked level that still has words you have never seen (where new words come from); one above it
  nextLevel() {
    const P = Learn.P, lv = Learn.levelsOn().slice().sort((a, b) => a - b), top = Math.max(...VLEVELS);
    const cur = lv.find(t => VOCAB.some(v => v.t === t && !P[v.w])) || lv[lv.length - 1];
    return Math.min(top, cur + 1);
  },
  wrongCount() { let n = 0; for (const k in Learn.P) if (Learn.P[k][4] > 0) n++; return n; },
  // question type for one word
  qType(t, v, n) {
    const k = t.k, hard = t.tier === 'h', sp = this.spellable(v), speak = Learn.canSpeak();
    if (k === 'c_spell') return { type: sp ? 'spell' : 'zh2en', noHint: hard };
    if (k === 'c_listen') return hard ? { type: sp ? 'listenspell' : 'listen' } : { type: 'listen' };
    const mix = hard ? (speak ? ['en2zh', 'spell', 'zh2en', 'listen', 'spell'] : ['en2zh', 'spell', 'zh2en', 'spell']) : (speak ? ['en2zh', 'zh2en', 'listen'] : ['en2zh', 'zh2en']);
    let type = mix[n % mix.length]; if (type === 'spell' && !sp) type = 'zh2en';
    return { type };
  },
  makeQs(t, ids) {
    const off = Math.floor(Math.random() * 5);
    return ids.map((i, n) => { const v = VOCAB[i], q = this.qType(t, v, n + off); return { i, type: q.type, noHint: !!q.noHint, opts: q.type === 'spell' || q.type === 'listenspell' ? null : Learn.options(v, q.type === 'zh2en' ? 'w' : 'z') }; });
  },
  got(t, w) {
    t.got = t.got || []; if (t.got.includes(w)) return;
    t.got.push(w); const was = t.prog; t.prog = Math.min(t.need, t.got.length);
    if (t.prog >= t.need && was < t.need) UI.toast(`任務完成：${TASK_DEFS[t.k].t(t)}，到「任務」領獎勵`, 'i_task', 3.5, { label: '領取', fn: () => { UI.closeWin('study'); UI.openTasks('daily'); } });
    UI.refresh('tasks'); UI.badges();
  },
  title(t) { return `${CHAL[t.k].n}（${TIER_N[t.tier] || '普通'}）`; },
};

/* ---------------- daily tasks: new mix, tiers, rewards ---------------- */
Object.assign(Life, {
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
    // two English challenges (listening only where the device can speak) and one life task
    const chal = Object.keys(CHAL).filter(k => (!CHAL[k].speak || Learn.canSpeak()) && (k !== 'c_review' || Challenge.wrongCount() >= 6));
    for (const k of shuffle(chal).slice(0, 2)) tasks.push(mk(k, { tier: null }));
    const home = Pets.home().length > 0, canTrain = home && Pets.home().some(p => TRICKS.some(tr => tr.lv <= p.lv && !Pets.knows(p, tr.id)));
    const life = ['l_swap', ...(canTrain ? ['l_train'] : [])];
    tasks.push(mk(life[Math.floor(Math.random() * life.length)], { tier: null }));
    L.daily = { day, tasks, bonus: false };
    if (Learn.L.dailyDone && Learn.L.dailyDay === day) tasks[0].prog = 1;
  },
  taskReward(t) { const rw = t.rw || TASK_DEFS[t.k].rw; return t.tier === 'h' ? Object.assign({}, rw, { c: Math.round(rw.c * 1.5), x: Math.round(rw.x * 1.5) }) : rw; },
});
(function () {
  const track = Life.track.bind(Life);
  Life.track = function (ev, n = 1, data = {}) {
    this.ensureDaily();
    const map = { trainOk: 'l_train' };
    for (const t of this.L.daily.tasks) {
      if (!TASK_DEFS[t.k] || !LIFE_TASKS[t.k] || t.prog >= t.need) continue;
      let add = 0;
      if (map[ev] === t.k) add = n;
      if (ev === 'swap' && t.k === 'l_swap' && (Challenge.tierOf(t) !== 'h' || data.perfect)) add = 1;
      if (!add) continue;
      if (!t.tier) t.tier = 'n';
      t.prog = Math.min(t.need, t.prog + add);
      if (t.prog >= t.need) UI.toast(`任務完成：${TASK_DEFS[t.k].t(t)}，到「任務」領獎勵`, 'i_task', 3.5, { label: '領取', fn: () => UI.openTasks('daily') });
    }
    return track(ev, n, data);
  };
})();

// life tasks from the first version of this update (pets speaking English, English to-dos) are swapped out of today's list
(function () {
  const ensure = Life.ensureDaily.bind(Life);
  Life.ensureDaily = function () {
    ensure(); const D = this.L.daily; if (!D) return;
    D.tasks.forEach((t, i) => { if ((t.k === 'l_ask' || t.k === 'l_todo') && !t.claimed) D.tasks[i] = { k: 'l_swap', need: 1, prog: 0, claimed: false, tier: null }; });
  };
})();
