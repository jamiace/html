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
  c_spell: { n: 'Meow Typo', icon: 'i_learn', tiers: { n: 8, h: 10 }, d: { n: I18n.s("u_ea64e2fa5d7a"), h: I18n.s("u_fb331407c698") } },
  c_listen: { n: I18n.s("u_4e87cc689a38"), icon: 'i_speaker', tiers: { n: 10, h: 10 }, d: { n: I18n.s("u_2895e8416b32"), h: I18n.s("u_1b61e66ab35b") }, speak: true },
  c_review: { n: I18n.s("u_2bbf3832b89d"), icon: 'i_reset', tiers: { n: 8, h: 12 }, d: { n: I18n.s("u_02aeb4d9d51b"), h: I18n.s("u_05cff8777cf9") } },
  c_new: { n: I18n.s("u_8e6501f3684a"), icon: 'i_star', tiers: { n: 6, h: 10 }, d: { n: I18n.s("u_bc78854915f3"), h: I18n.s("u_b0634d4840ba") } },
};
const LIFE_TASKS = {
  l_train: { n: I18n.s("u_1d707d82c1f8"), icon: 'i_paw', tiers: { n: 1, h: 2 }, d: { n: I18n.s("u_1b438b426b1e"), h: I18n.s("u_1b438b426b1e") } },
  l_swap: { n: I18n.s("u_a363b5bc5f0c"), icon: 'i_bag', tiers: { n: 1, h: 2 }, d: { n: I18n.s("u_0893fd5f25a1"), h: I18n.s("u_efcd51760f7d") } },
};
const TIER_N = { n: I18n.s("u_de907d10df98"), h: I18n.s("u_60e83e465d28") };
for (const k in CHAL) TASK_DEFS[k] = { t: (t) => I18n.s("u_0d7b7af46522", [CHAL[k].n, t.need]), need: () => CHAL[k].tiers.n, rw: { c: 35, x: 30 }, go: 'chal', tiers: CHAL[k].tiers };
TASK_DEFS.l_train = { t: (t) => I18n.s("u_2ee3c99e7ea0", [t.need]), need: () => 1, rw: { c: 25, x: 25 }, go: 'petTrain', tiers: LIFE_TASKS.l_train.tiers };
// kept only so a task already claimed today still shows its name
TASK_DEFS.l_ask = { t: () => I18n.s("u_b3c8e7af698b"), need: () => 1, rw: { c: 25, x: 20 }, go: null };
TASK_DEFS.l_todo = { t: () => I18n.s("u_2b35ceedbe8f"), need: () => 1, rw: { c: 20, x: 20 }, go: null };
TASK_DEFS.l_swap = { t: (t) => I18n.s("u_e722de697c1a", [t.need]), need: () => 1, rw: { c: 25, x: 20 }, go: 'swap', tiers: LIFE_TASKS.l_swap.tiers };

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
      const lv = new Set(Learn.levelsOn());
      pool = VOCAB.filter(v => lv.has(v.t) && !P[v.w]);
    }
    if (tier === 'h' && k !== 'c_listen') pool = pool.filter(v => k !== 'c_spell' || this.spellable(v));
    const query = i => this.qType({k, tier}, VOCAB[i], 0);
    const out = Adaptive.select(pool.map(v => v.i), n, query).map(i => VOCAB[i].w);
    // not enough words of that kind yet (a new player): fill from the normal word picker
    if (out.length < n) for (const i of Adaptive.pick(n * 3, null, query)) { const v = VOCAB[i]; if (out.length >= n) break; if (out.includes(v.w)) continue; if ((k === 'c_spell' || (k === 'c_listen' && tier === 'h')) && !this.spellable(v)) continue; out.push(v.w); }
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
    if (t.prog >= t.need && was < t.need) UI.toast(I18n.s("u_202ec2a6caff", [TASK_DEFS[t.k].t(t)]), 'i_task', 3.5, { label: I18n.s("u_92edf81e0715"), fn: () => { UI.closeWin('study'); UI.openTasks('daily'); } });
    UI.refresh('tasks'); UI.badges();
  },
  title(t) { return `${CHAL[t.k].n}（${TIER_N[t.tier] || I18n.s("u_de907d10df98")}）`; },
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
    const chal = Object.keys(CHAL).filter(k => k !== 'c_spell' && (!CHAL[k].speak || Learn.canSpeak()) && (k !== 'c_review' || Challenge.wrongCount() >= 6));
    tasks.push(mk('c_spell', { tier: null }));
    for (const k of shuffle(chal).slice(0, 1)) tasks.push(mk(k, { tier: null }));
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
      if (t.prog >= t.need) UI.toast(I18n.s("u_202ec2a6caff", [TASK_DEFS[t.k].t(t)]), 'i_task', 3.5, { label: I18n.s("u_92edf81e0715"), fn: () => UI.openTasks('daily') });
    }
    return track(ev, n, data);
  };
})();

// life tasks from the first version of this update (pets speaking English, English to-dos) are swapped out of today's list
(function () {
  const ensure = Life.ensureDaily.bind(Life);
  Life.ensureDaily = function () {
    ensure(); const D = this.L.daily; if (!D) return;
    // Add today's missing Meow Typo task without replacing existing progress or claimed rewards.
    if(!D.tasks.some(t=>t.k==='c_spell')){D.tasks.push({k:'c_spell',need:CHAL.c_spell.tiers.n,prog:0,claimed:false,tier:null});}
    D.tasks.forEach((t, i) => { if ((t.k === 'l_ask' || t.k === 'l_todo') && !t.claimed) D.tasks[i] = { k: 'l_swap', need: 1, prog: 0, claimed: false, tier: null }; });
  };
})();
