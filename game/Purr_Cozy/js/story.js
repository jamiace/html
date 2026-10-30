/* ============================================================
   The travelling merchant's little story of the week
   - five chapters a week: chapter 1 on Monday, one more each day at 06:00; missed ones can be
     caught up later in the week (in order); the weekend is for catching up
   - nothing is written out chapter by chapter: each week is put together from
       * scenes (a smudged label, a machine with English buttons, a menu board, a delivery
         list, a foreign customer, a letter with a blurred word, boxes labelled in English)
       * the merchant's own word list (40-ish words, Level 1-3) and own nouns and voice
       * a plot for the week (2-3 per merchant): how it starts, what gets a name on Friday
     so the same merchant six weeks later tells it differently, with words you have not
     seen in their stories before
   - every chapter is 5 questions: 2-3 from the scene, the rest from your own review words
     (the 70-85 % mix from feel.js applies); a wrong answer never fails a chapter, missed
     words come back once at the end
   - Friday you name something with one of three English words; finishing the week gives
     that merchant's keepsake, which shows the names you gave it
   ============================================================ */
const STORY_M = {
  cocoa: {
    nouns: { box: I18n.s("u_d5d4dc1fe93d"), jar: I18n.s("u_cb2d0126351c"), machine: I18n.s("u_c9a4f4a60bc9"), board: I18n.s("u_b5b88c1b3297"), guest: I18n.s("u_8dd49b2272ea"), note: I18n.s("u_1c53d0124fea") },
    words: 'honey lemon cream cake milk egg sugar bread butter cookie candy chocolate apple banana strawberry juice tea coffee cup plate spoon bowl sweet bake oven menu pie salt ice dessert fruit orange jam pancake breakfast snack delicious fresh warm',
    voice: {
      bridge: [I18n.s("u_f645be570c59"), I18n.s("u_1c8c71b23bda"), I18n.s("u_fac202042669")],
      quiz: [I18n.s("u_089bc4a3d377"), I18n.s("u_4353264151de"), I18n.s("u_a30e5bada9d9")],
      done: [I18n.s("u_4969d37b51b8"), I18n.s("u_2bc3df0b0a72"), I18n.s("u_42a92c1537f5")],
    },
    arcs: [
      { open: [I18n.s("u_b742efdf36c5"), I18n.s("u_2e551bda3da2")], what: I18n.s("u_3ddf1c53820f"), ask: I18n.s("u_a2430748c0f7"), names: ['soft', 'cloud', 'sweet', 'snow', 'moon', 'happy'], close: [I18n.s("u_82b265883733"), I18n.s("u_47944b5f02fe")] },
      { open: [I18n.s("u_930bba5f6842"), I18n.s("u_dd268d5d75a3")], what: I18n.s("u_90276359bccd"), ask: I18n.s("u_4dfed73036c8"), names: ['love', 'sweet', 'forever', 'happy', 'kind', 'golden'], close: [I18n.s("u_763f160afed6"), I18n.s("u_caa7421f1fda")] },
      { open: [I18n.s("u_07b4f380ead3"), I18n.s("u_18ead2b90bf6")], what: I18n.s("u_6df6e717327c"), ask: I18n.s("u_c3ed4a509f25"), names: ['sunny', 'warm', 'little', 'dream', 'lucky', 'honey'], close: [I18n.s("u_5600125fb2dd"), I18n.s("u_bdadb3ee6f5f")] },
    ],
  },
  moss: {
    nouns: { box: I18n.s("u_f17bdc6a1ebe"), jar: I18n.s("u_59c39561dc32"), machine: I18n.s("u_24935bb73e50"), board: I18n.s("u_c8315eeb84e7"), guest: I18n.s("u_4d68ad4ea9d4"), note: I18n.s("u_028914ea4eb7") },
    words: 'seed leaf flower rain root grass tree garden soil water sun plant grow green rose lily forest stone bee butterfly insect wind pot bamboo mushroom branch fresh wild river hill spring summer autumn winter rainbow',
    voice: {
      bridge: [I18n.s("u_1c33369a341a"), I18n.s("u_3c2e00f63d15"), I18n.s("u_f55998b2d75c")],
      quiz: [I18n.s("u_185d566cfa5f"), I18n.s("u_36ad22668eda"), I18n.s("u_ec4a8a076043")],
      done: [I18n.s("u_997d0a15aa20"), I18n.s("u_e4157d79b3fc"), I18n.s("u_7828d2dafa73")],
    },
    arcs: [
      { open: [I18n.s("u_a8ff2d827deb"), I18n.s("u_948022b19cf9")], what: I18n.s("u_027e893b2e94"), ask: I18n.s("u_d73ef055cbe0"), names: ['tiny', 'hope', 'spring', 'little', 'brave', 'green'], close: [I18n.s("u_a97ca7a7bf2d"), I18n.s("u_585742a7abd1")] },
      { open: [I18n.s("u_3d47740450c7"), I18n.s("u_dac263dbd3b1")], what: I18n.s("u_8fa4088e982d"), ask: I18n.s("u_e5335cac8952"), names: ['sunny', 'lucky', 'kind', 'warm', 'green', 'dream'], close: [I18n.s("u_1c1b5e2ea09d"), I18n.s("u_67e571ee806a")] },
    ],
  },
  clock: {
    nouns: { box: I18n.s("u_4f1eb8e3d3aa"), jar: I18n.s("u_15893dd13707"), machine: I18n.s("u_610c66a4da1e"), board: I18n.s("u_8bf5e9016320"), guest: I18n.s("u_8dd49b2272ea"), note: I18n.s("u_2b17acaa7a73") },
    words: 'clock watch time hour minute second key box old gold silver letter picture map mirror candle bell coin ring story secret history past remember lamp chair door window paper glass ship train',
    voice: {
      bridge: [I18n.s("u_a327b0e7bf3e"), I18n.s("u_8cb4edd0b740"), I18n.s("u_e9f78ec1f21b")],
      quiz: [I18n.s("u_55203d9d1100"), I18n.s("u_a2f3c7c0552a"), I18n.s("u_0094200c41e1")],
      done: [I18n.s("u_edffb4dfc678"), I18n.s("u_f673490e50c5"), I18n.s("u_f2d66bcd4480")],
    },
    arcs: [
      { open: [I18n.s("u_9774c189f31d"), I18n.s("u_d69791b65f6c")], what: I18n.s("u_a8025e2b921b"), ask: I18n.s("u_48ef1267a77f"), names: ['memory', 'forever', 'silver', 'golden', 'brave', 'kind'], close: [I18n.s("u_dd08c0981805"), I18n.s("u_d94eb1153e75")] },
      { open: [I18n.s("u_6addba2160f5"), I18n.s("u_f68b75a4c76e")], what: I18n.s("u_44fdb2e64d3d"), ask: I18n.s("u_d011b78cda37"), names: ['memory', 'dream', 'happy', 'kind', 'golden', 'little'], close: [I18n.s("u_cb1c96322605"), I18n.s("u_043d72d5915f")] },
    ],
  },
  fluff: {
    nouns: { box: I18n.s("u_ebce9cc28940"), jar: I18n.s("u_c9ec4ba30973"), machine: I18n.s("u_2b493971c9f2"), board: I18n.s("u_459655c26a9b"), guest: I18n.s("u_6d26d67891c0"), note: I18n.s("u_5a7954bfe17f") },
    words: 'dog cat puppy kitten ball bone collar bell name home bark tail fur bath brush toy bed blanket friend walk park street hungry tired happy cute bird fish rabbit mouse',
    voice: {
      bridge: [I18n.s("u_cdde05fb38c8"), I18n.s("u_d9ac30d56cdd"), I18n.s("u_964a1f19de89")],
      quiz: [I18n.s("u_6e4cd66fc797"), I18n.s("u_5544714abb7f"), I18n.s("u_571b1270bc0a")],
      done: [I18n.s("u_2395661a4991"), I18n.s("u_61dd3bb588ef"), I18n.s("u_0939eb3b0882")],
    },
    arcs: [
      { open: [I18n.s("u_4daa9f1ae012"), I18n.s("u_1f1d0fd2cb27")], what: I18n.s("u_291b0888f1c6"), ask: I18n.s("u_bf2361bef295"), names: ['lucky', 'happy', 'brave', 'little', 'sunny', 'cloud'], close: [I18n.s("u_d5c4c20a9043"), I18n.s("u_23fd2a0b1cd0")] },
      { open: [I18n.s("u_884bb0ea62d1"), I18n.s("u_a56a5488bd15")], what: I18n.s("u_c9845eaffb90"), ask: I18n.s("u_76d4bb3f0dfb"), names: ['happy', 'sweet', 'lucky', 'kind', 'dream', 'warm'], close: [I18n.s("u_5590e37b91a6"), I18n.s("u_d80d0eda0d15")] },
    ],
  },
  star: {
    nouns: { box: I18n.s("u_1b4f46387b1c"), jar: I18n.s("u_4cf44636b59a"), machine: I18n.s("u_c64958738326"), board: I18n.s("u_ce5776e03b4e"), guest: I18n.s("u_9a327869f13d"), note: I18n.s("u_d4e72abdd14f") },
    words: 'star moon sun sky night dream light dark cloud planet wish space earth bright shine gold silver north south east west map lucky magic morning evening tonight fly',
    voice: {
      bridge: [I18n.s("u_6e321f875b42"), I18n.s("u_70ddd4b4326d"), I18n.s("u_9aaf44e8fab2")],
      quiz: [I18n.s("u_8570622a933d"), I18n.s("u_aabacebd4962"), I18n.s("u_a78b2e456ba0")],
      done: [I18n.s("u_d6c8f9e3b821"), I18n.s("u_b1b3991ac026"), I18n.s("u_a7ea3917fd97")],
    },
    arcs: [
      { open: [I18n.s("u_406f8b65106f"), I18n.s("u_115686769377")], what: I18n.s("u_86440f44b186"), ask: I18n.s("u_d5901e51f9be"), names: ['hope', 'dream', 'lucky', 'tiny', 'silver', 'wish'], close: [I18n.s("u_8fb3facc49e5"), I18n.s("u_4ce6d25c4d3d")] },
      { open: [I18n.s("u_5b6df25ed6dc"), I18n.s("u_4538f39cac6b")], what: I18n.s("u_022c6cbcf320"), ask: I18n.s("u_b63d320f5563"), names: ['wish', 'dream', 'bright', 'magic', 'night', 'hope'], close: [I18n.s("u_3ef21429dc82"), I18n.s("u_ce019cc10855")] },
    ],
  },
  yarn: {
    nouns: { box: I18n.s("u_fdcc2b88f6e5"), jar: I18n.s("u_934f187bbff0"), machine: I18n.s("u_c3d41ff16031"), board: I18n.s("u_d1b83b7de60e"), guest: I18n.s("u_9e1c27d71935"), note: I18n.s("u_b24ae3c2dd4d") },
    words: 'wool scarf glove hat sock sweater button needle thread cloth color red blue pink white soft warm pattern ribbon bag pocket gift winter cotton shirt dress coat yellow purple',
    voice: {
      bridge: [I18n.s("u_1172ee766840"), I18n.s("u_2f0c37087047"), I18n.s("u_176d251f65b0")],
      quiz: [I18n.s("u_9f27e423ab06"), I18n.s("u_e18fd41941ec"), I18n.s("u_8beffec5799d")],
      done: [I18n.s("u_25943903b5bb"), I18n.s("u_4bb003453faf"), I18n.s("u_19e38edaf63e")],
    },
    arcs: [
      { open: [I18n.s("u_160f4feba900"), I18n.s("u_83cf46085894")], what: I18n.s("u_5ccbc26a917a"), ask: I18n.s("u_28b10d2a3b46"), names: ['warm', 'soft', 'cozy', 'snow', 'winter', 'happy'], close: [I18n.s("u_ca239721127b"), I18n.s("u_fb2b5674b3fb")] },
      { open: [I18n.s("u_683f7d688dbe"), I18n.s("u_ee9ed41004a5")], what: I18n.s("u_4db0b8f384e0"), ask: I18n.s("u_b1c0923b27f5"), names: ['love', 'warm', 'home', 'kind', 'soft', 'sunny'], close: [I18n.s("u_a10bee636e6b"), I18n.s("u_9594a5ce0bfa")] },
    ],
  },
};

// scenes: what happens, which questions it asks (t: question type, n: how many scene words)
const STORY_SCENES = {
  label: { n: 2, lines: [[I18n.s("u_23ba1bea3cab"), I18n.s("u_1684932c2cb0")], [I18n.s("u_2261f03b4a87"), I18n.s("u_e34ab76e7d2d")]], ctx: I18n.s("u_3c1b1d53b03c") },
  machine: { n: 2, lines: [[I18n.s("u_0e18accd8ca0"), I18n.s("u_39b359600a97")], [I18n.s("u_eff170efad6f"), I18n.s("u_65c4d5deb89b")]], ctx: I18n.s("u_d27eecc9a6a6") },
  board: { n: 2, lines: [[I18n.s("u_cce4077ce656"), I18n.s("u_dbb26ec1ceb9")], [I18n.s("u_1ad9a86e025d"), I18n.s("u_f06bb4c6f94b")]], ctx: I18n.s("u_6f9670d8fcb1") },
  list: { n: 3, lines: [[I18n.s("u_040852aee59a"), I18n.s("u_10c58b574172")], [I18n.s("u_3f5d6d38961e"), I18n.s("u_f5edb7d858f3")]], ctx: I18n.s("u_9ace8bb79167") },
  guest: { n: 2, lines: [[I18n.s("u_82dc6f447edc"), I18n.s("u_0d6a42f5eec2")], [I18n.s("u_c09f88536cad"), I18n.s("u_c4bdec108a29")]], ctx: I18n.s("u_eff5a7804a9d") },
  letter: { n: 2, lines: [[I18n.s("u_cd405ee8427c"), I18n.s("u_9eca5e3409ac")], [I18n.s("u_18dd9fe801e7"), I18n.s("u_7021db529e61")]], ctx: '{note}：「{sent}」', sents: ["Don't forget the ____.", 'Please bring some ____ next time.', 'I found a little ____ today.', 'The ____ is waiting for you.', 'I think of you and the ____.'] },
  find: { n: 2, lines: [[I18n.s("u_8c0648a21ab6"), I18n.s("u_0c927ea74c2e")], [I18n.s("u_cbc71c00addf"), I18n.s("u_5f5d31f8952a")]], ctx: I18n.s("u_c69f4df4c2f9") },
};
const STORY_SCENE_IDS = Object.keys(STORY_SCENES);
const STORY_KEEP = {
  cocoa: { n: I18n.s("u_d1904f87f1f2"), thing: I18n.s("u_4fc4012b1e20") }, moss: { n: I18n.s("u_dfab51a47c5e"), thing: I18n.s("u_c77f3b608f95") }, clock: { n: I18n.s("u_b2bc63d1536d"), thing: I18n.s("u_a8025e2b921b") },
  fluff: { n: I18n.s("u_9250c43e6ccd"), thing: I18n.s("u_32cc5dc05e6e") }, star: { n: I18n.s("u_ca3d3378cdd7"), thing: I18n.s("u_bdda654edc25") }, yarn: { n: I18n.s("u_2a3e64a88a7e"), thing: I18n.s("u_5ccbc26a917a") },
};

/* ---------------- keepsake sprites (one per merchant; the name you gave shows on hover) ---------------- */
(function () {
  const C = (hex) => palAdd(hex);
  const mk = (name, w, h, fn) => SPR.def(name, () => { const g = new Grid(w, h); fn(g); return g.outline(); });
  mk('keep_cocoa', 16, 16, g => {   // a round white cake on a plate, a little flag on top
    g.ellipse(8, 14, 7.4, 1.6, C('#e8e4ef')); g.hl(1, 14, 14, C('#c9c2d8'));
    g.rect(3, 8, 10, 6, C('#fff6ec')); g.ellipse(8, 8, 5, 1.6, C('#fffdf8')); g.hl(3, 12, 10, C('#f2c9d2'));
    for (const x of [4, 7, 10]) g.px(x, 8, C('#e8607a'));
    g.vl(9, 2, 6, C('#8a5a36')); g.rect(10, 2, 4, 3, C('#f6c75a')); g.hl(10, 4, 4, C('#e8a63d'));
  });
  mk('keep_moss', 14, 16, g => {   // a little pot with a sprout and a name tag
    g.rect(3, 10, 8, 5, C('#c0704a')); g.hl(2, 9, 10, C('#d88c62')); g.hl(3, 14, 8, C('#9a5434'));
    g.vl(7, 4, 6, C('#5e9a48')); g.ellipse(5, 5, 2, 1.2, C('#7cc05a')); g.ellipse(9.5, 3.5, 2.2, 1.2, C('#7cc05a'));
    g.vl(11, 7, 4, C('#8a5a36')); g.rect(10, 6, 3, 2, C('#fff6ec'));
  });
  mk('keep_clock', 14, 16, g => {   // a pocket watch on a small stand
    g.rect(3, 13, 8, 2, C('#6b4a32')); g.vl(7, 9, 4, C('#8a6a48'));
    g.ellipse(7, 6, 4.6, 4.6, C('#d8b04a')); g.ellipse(7, 6, 3.4, 3.4, C('#fff6ec'));
    g.px(7, 1, C('#d8b04a')); g.px(7, 0, C('#d8b04a')); g.vl(7, 4, 2, C('#2e2230')); g.hl(7, 6, 2, C('#2e2230'));
  });
  mk('keep_fluff', 14, 14, g => {   // a small plush puppy with a tag
    g.ellipse(7, 9, 4.6, 3.6, C('#f0c08a')); g.ellipse(7, 5, 3.6, 3.2, C('#f6d2a2'));
    g.px(4, 2, C('#c98c56')); g.px(10, 2, C('#c98c56')); g.px(3, 3, C('#c98c56')); g.px(11, 3, C('#c98c56'));
    g.px(6, 5, C('#2e2230')); g.px(8, 5, C('#2e2230')); g.px(7, 6, C('#7a4a3a'));
    g.hl(5, 8, 5, C('#e8607a')); g.px(7, 9, C('#f6c75a'));
  });
  mk('keep_star', 14, 15, g => {   // a glass ball with a star inside, on a base
    g.rect(3, 12, 8, 2, C('#4b4560')); g.ellipse(7, 7, 5.2, 5.2, C('#cfe6ee')); g.ellipse(7, 7, 4.2, 4.2, C('#b9d7e6'));
    ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.'].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'X') g.px(x + 4, y + 3, C('#f6c75a')); }));
    g.px(7, 5, C('#fff3b0'));
    g.px(4, 4, C('#f4fbff'));
  });
  mk('keep_yarn', 16, 15, g => {   // a little knitted scarf on a stand
    g.vl(3, 1, 13, C('#8a5a36')); g.rect(1, 13, 5, 2, C('#6b4a32')); g.hl(2, 1, 12, C('#8a5a36'));
    for (let y = 2; y < 11; y++) for (let x = 5; x < 11; x++) g.px(x, y, (x + y) % 3 ? C('#4aa0a0') : C('#6cc0bc'));
    for (const x of [6, 8, 10]) g.px(x, 11, C('#4aa0a0'));
  });
  for (const k in STORY_KEEP) ITEMS['keep_' + k] = { id: 'keep_' + k, n: STORY_KEEP[k].n, cat: 'decor', spr: 'keep_' + k, price: 0, lvl: 1, layer: 'decor', giftOnly: true, keepsake: k, desc: I18n.s("u_83f3698cdf34") };
})();

const Story = {
  get S() { const S = Game.S; if (!S.story) S.story = { used: {}, keep: {} }; if (!S.story.used) S.story.used = {}; if (!S.story.keep) S.story.keep = {}; return S.story; },
  M(mk) { return STORY_M[mk || Merchant.id()]; },
  pick(a) { return a[Math.floor(Math.random() * a.length)]; },
  fill(s, mk, extra = {}) { const n = this.M(mk).nouns; return I18n.named(s,Object.assign({},n,extra)); },
  zh(v) { return v.z.split(/[；;，,]/)[0].replace(/（.*?）|\(.*?\)/g, '').trim(); },
  // this week's story, put together the first time it is opened this week
  week() {
    const St = this.S, wk = weekKey(), mk = Merchant.id();
    if (St.wk === wk && St.mk === mk && St.ch) return St;
    const M = this.M(mk); if (!M) return null;
    const arcI = (St.arcs && St.arcs[mk] != null ? St.arcs[mk] + 1 : Math.floor(Math.random() * M.arcs.length)) % M.arcs.length;
    St.arcs = St.arcs || {}; St.arcs[mk] = arcI;
    // words: this merchant's list, ones you have not had in their stories first
    const used = new Set(St.used[mk] || []), all = M.words.split(/\s+/).filter(w => VIDX[w] != null && VOCAB[VIDX[w]].t <= 3);
    let pool = shuffle(all.filter(w => !used.has(w))); if (pool.length < 14) { St.used[mk] = []; pool = shuffle(all.slice()); }
    const scenes = shuffle(STORY_SCENE_IDS.slice()), ch = [];
    for (let i = 0; i < 5; i++) {
      const sc = i < 4 ? scenes[i] : this.pick(['letter', 'find', 'board', 'guest']), n = STORY_SCENES[sc].n - (i === 4 ? 1 : 0);
      const type = sc === 'label' ? 'spell' : (sc === 'machine' || sc === 'guest') && Learn.canSpeak() ? 'listen' : 'zh2en';
      const words = Adaptive.select(pool.map(w => VIDX[w]), n, type).map(id => VOCAB[id].w);
      pool = pool.filter(w => !words.includes(w)); const sv = Math.floor(Math.random() * STORY_SCENES[sc].lines.length);
      ch.push({ sc, sv, words, done: false, bridge: Math.floor(Math.random() * 3), sent: Math.floor(Math.random() * 5) });
    }
    Object.assign(St, { wk, mk, arc: arcI, ch, name: null, names: shuffle(M.arcs[arcI].names.filter(w => VIDX[w] != null)).slice(0, 3), toldDay: '' });
    Game.save(); return St;
  },
  // chapters open: Monday 1, Tuesday 2 ... Friday 5; the weekend only catches up
  unlocked() { const d = (gameDate().getDay() + 6) % 7; return Math.min(5, d + 1); },
  next() { const St = this.week(); if (!St) return -1; const i = St.ch.findIndex(c => !c.done); return i >= 0 && i < this.unlocked() ? i : -1; },
  pending() { try { return this.next() >= 0; } catch (e) { return false; } },
  // ---------- the chapter as a quiz ----------
  pack(i) {
    const St = this.week(), c = St && St.ch[i]; if (!c) return null;
    const mk = St.mk, M = this.M(mk), sc = STORY_SCENES[c.sc], sp = Learn.canSpeak();
    const qs = [];
    const scene = (w, k) => {
      const v = VOCAB[VIDX[w]], z = this.zh(v); let type, extra = { z, i: k + 1 };
      if (c.sc === 'label') { type = Challenge.spellable(v) ? 'spell' : 'zh2en'; }
      else if (c.sc === 'machine' || c.sc === 'guest') type = sp ? 'listen' : 'en2zh';
      else if (c.sc === 'list') type = 'en2zh';
      else type = 'zh2en';
      if (c.sc === 'letter') extra.sent = sc.sents[(c.sent + k) % sc.sents.length];
      const q = { i: v.i, type, opts: type === 'spell' ? null : Learn.options(v, type === 'zh2en' ? 'w' : 'z'), ctx: this.fill(sc.ctx, mk, extra) };
      if (c.sc === 'label' && type === 'spell') q.hint = this.mask(v.w);
      return q;
    };
    c.words.forEach((w, k) => { if (VIDX[w] != null) qs.push(scene(w, k)); });
    // Friday: spell the name you chose
    if (i === 4 && St.name && VIDX[St.name] != null) { const v = VOCAB[VIDX[St.name]]; qs.push({ i: v.i, type: Challenge.spellable(v) ? 'spell' : 'zh2en', opts: Challenge.spellable(v) ? null : Learn.options(v, 'w'), ctx: I18n.s("u_41f112a9d417", [STORY_KEEP[mk].thing, this.zh(v)]) }); }
    // the rest from your own review words
    const have = new Set(qs.map(q => q.i)), own = Learn.pick(10).filter(x => !have.has(x)).slice(0, 5 - qs.length);
    const ownQs = Learn.makeQs(own); if (ownQs[0]) ownQs[0].ctx = this.pick(M.voice.quiz);
    return { qs: [...qs, ...ownQs], ids: [...qs, ...ownQs].map(q => q.i) };
  },
  // a smudged label: about half the letters left (always the first one)
  mask(w) { const keep = new Set([0]); const n = Math.max(1, Math.round(w.length * 0.45)); const idx = shuffle([...Array(w.length).keys()].slice(1)).slice(0, n - 1); idx.forEach(k => keep.add(k)); return [...w].map((ch, k) => keep.has(k) ? ch : '_').join(' '); },
  start(i) { const St = this.week(); if (!St || !St.ch[i] || i >= this.unlocked()) return; if (St.ch[i].done) return this.review(i); if (i === 4 && !this.S.name) return; this.cur = i; UI.closeWin('story'); Learn.start('story', { ch: i }); },
  title(o) { const St = this.week(); return I18n.s("u_b53c31653c1b", [MERCHANTS[St.mk].n, o.ch + 1]); },
  finish(s, R) {
    const St = this.week(), c = St.ch[s.opts.ch], mk = St.mk, M = this.M(mk), A = M.arcs[St.arc];
    if (c.done) return { coins: 0, xp: 0, items: [], msg: I18n.s("u_402d61debe1e") };
    const first = true; c.done = true;
    if (first) { St.used[mk] = [...new Set([...(St.used[mk] || []), ...c.words])]; }
    const res = { coins: first ? 10 + R * 2 : R, xp: R * 3, items: [], msg: '' };
    if (s.opts.ch === 4 && first) {
      const name = St.name || A.names[0], Name = name.charAt(0).toUpperCase() + name.slice(1);
      res.msg = A.close.map(l => I18n.named(l,{Name})).join(' ');
      const k = 'keep_' + mk, list = St.keep[mk] = St.keep[mk] || []; list.push({ name: Name, wk: St.wk, what: A.what });
      const S = Game.S, have = (S.inv[k] || 0) + S.items.filter(it => it.k === k).length;
      if (!have) { S.inv[k] = 1; res.keep = k; }
      UI.toast(have ? I18n.s("u_4d07b4277f88", [STORY_KEEP[mk].n, Name]) : I18n.s("u_7e785438d6e1", [STORY_KEEP[mk].n]), 'i_star', 5, have ? null : { label: I18n.s("u_36441bffaeab"), fn: () => { UI.closeWin('study'); Game.place(k); } });
    } else res.msg = this.pick(M.voice.done);
    Game.save(); saveSoon(); UI.refresh('merchant'); UI.refresh('story');
    return res;
  },
  choose(w) { const St = this.week(); if (!St || St.ch[4].done || !St.names.includes(w)) return; St.name = w; Game.save(); UI.refresh('story'); },
  review(i) { const St = this.week(); if (!St || !St.ch[i] || !St.ch[i].done) return; this.reviewChapter = i; UI.openWin('story'); },
  open() { this.reviewChapter = null; if (this.week()) UI.openWin('story'); },
  // keepsake: hover shows the names you gave it
  tip(it) {
    const d = ITEMS[it.k]; if (!d || !d.keepsake) return null;
    const list = (this.S.keep[d.keepsake] || []); if (!list.length) return d.n;
    const last = list[list.length - 1];
    return `${d.n}「${last.name}」` + (list.length > 1 ? I18n.s("u_ad2a3645b224", [list.slice(0, -1).map(x => x.name).join('、')]) : '');
  },
  // once a day: the merchant calls you when a new chapter is waiting
  remind() {
    if (!Game.S || Game.focusing() || !this.pending()) return;
    const St = this.week(), d = Life.today(); if (St.toldDay === d) return;
    St.toldDay = d; Game.save();
    const M = MERCHANTS[St.mk], i = this.next();
    const line = i === 0 ? this.M().arcs[St.arc].open[0] : this.M().voice.bridge[St.ch[i].bridge % this.M().voice.bridge.length];
    UI.toast(`${M.n}：「${line}」`, 'i_shop', 6, { label: I18n.s("u_aa7bad4bc428"), fn: () => this.open() });
  },
};

/* ---------------- window ---------------- */
UI.WIN.story = { t: I18n.s("u_2473e90791ad"), i: 'i_shop', w: 520, at: ['c', 0], modal: true };
UI.w_story = function () {
  const St = Story.week(); if (!St) return [h('p', { class: 'hint', text: I18n.s("u_21ea2429189d") })];
  const mk = St.mk, M = MERCHANTS[mk], SM = Story.M(mk), A = SM.arcs[St.arc], i = Story.next(), all = St.ch.every(c => c.done);
  const review = Number.isInteger(Story.reviewChapter) && St.ch[Story.reviewChapter] && St.ch[Story.reviewChapter].done ? Story.reviewChapter : -1;
  const dots = h('div', { class: 'story-dots' }, ...St.ch.map((c, k) => h(c.done ? 'button' : 'span', { type: c.done ? 'button' : null, onclick: c.done ? () => Story.review(k) : null, 'aria-label': c.done ? I18n.s("u_ba659d61fbca", [k + 1]) : null, 'aria-pressed': c.done ? String(k === review) : null, class: 'sdot' + (c.done ? ' done' : k === i ? ' cur' : k < Story.unlocked() ? ' open' : ''), title: c.done ? I18n.s("u_d4419bac8c81", [k + 1]) : k < Story.unlocked() ? I18n.s("u_33a74bfb3721", [k + 1]) : I18n.s("u_c91a95a37bb3", [k + 1, [I18n.s("u_299dfdb99894"), I18n.s("u_4abb47e0a7a8"), I18n.s("u_e4faf74938da"), I18n.s("u_98815408c4ab"), I18n.s("u_a7939bee53d5")][k]]) }, String(k + 1))));
  let say, act = [];
  if (review >= 0) {
    const c = St.ch[review], sc = STORY_SCENES[c.sc];
    say = review === 0 ? [...A.open] : [SM.voice.bridge[c.bridge % SM.voice.bridge.length]];
    if (review === 4) say.push(A.ask); else say.push(...sc.lines[c.sv % sc.lines.length].map(l => Story.fill(l, mk)));
    say.push(SM.voice.done[c.bridge % SM.voice.done.length]);
    if (review === 4) {
      const name = St.name || A.names[0], Name = name.charAt(0).toUpperCase() + name.slice(1);
      say.push(...A.close.map(l => I18n.named(l,{Name})));
    }
    const completed = St.ch.map((c, k) => c.done ? k : -1).filter(k => k >= 0), at = completed.indexOf(review);
    act.push(h('span', { class: 'hint', text: I18n.s("u_3e52002896d6", [review + 1]) }));
    if (at > 0) act.push(h('button', { class: 'chip sm', onclick: () => Story.review(completed[at - 1]) }, I18n.s("u_393f2a5120ac")));
    if (at + 1 < completed.length) act.push(h('button', { class: 'chip sm', onclick: () => Story.review(completed[at + 1]) }, I18n.s("u_9443994bc3b1")));
    act.push(h('button', { class: 'chip', onclick: () => { Story.reviewChapter = null; UI.refresh('story'); } }, I18n.s("u_81f1a7284109")));
  } else if (all) {
    const last = (St.keep[mk] || []).slice(-1)[0];
    say = [I18n.s("u_543f418742e4", [last ? I18n.s("u_7cba81391377", [last.name]) : '']), I18n.s("u_41efaf8f1691")];
  } else if (i < 0) {
    const k = St.ch.findIndex(c => !c.done);
    say = [Story.pick(SM.voice.done), I18n.s("u_39070a330dfa", [[I18n.s("u_299dfdb99894"), I18n.s("u_4abb47e0a7a8"), I18n.s("u_e4faf74938da"), I18n.s("u_98815408c4ab"), I18n.s("u_a7939bee53d5")][k]])];
  } else {
    const c = St.ch[i], sc = STORY_SCENES[c.sc];
    say = [];
    if (i === 0) say.push(...A.open); else say.push(SM.voice.bridge[c.bridge % SM.voice.bridge.length]);
    if (i === 4) {
      say.push(A.ask);
      act.push(h('div', { class: 'story-names' }, ...St.names.map(w => h('button', { class: 'chip' + (St.name === w ? ' primary' : ''), onclick: () => Story.choose(w) }, h('b', { text: w }), h('span', { class: 'hint', text: ' ' + Story.zh(VOCAB[VIDX[w]]) })))));
    } else say.push(...sc.lines[c.sv % sc.lines.length].map(l => Story.fill(l, mk)));
    act.push(h('button', { class: 'chip big primary', disabled: i === 4 && !St.name, onclick: () => Story.start(i) }, ico('i_learn', 22), i === 4 ? (St.name ? I18n.s("u_c1d15b7beb2e", [St.name]) : I18n.s("u_524100328f46")) : I18n.s("u_b129081c0b3b")));
  }
  const head = h('div', { class: 'mstage' + (review >= 0 ? ' story-review' : '') }, merchantScene(mk), h('div', { class: 'msay story-say' }, h('div', { class: 'mname' }, h('b', { text: M.n }), h('span', { class: 'ptag', text: A.what })), ...say.map(l => h('p', { text: l }))));
  return [head, dots, h('div', { class: 'row center wrap story-act' }, ...act, h('button', { class: 'chip', onclick: () => { UI.closeWin('story'); Merchant.open(); } }, ico('i_shop', 18), I18n.s("u_61c7d5676af1"))),
    h('p', { class: 'hint', text: review >= 0 ? I18n.s("u_bff13b27eb6d") : I18n.s("u_d9ee5b370e93") })];
};

/* ---------------- hooks ---------------- */
(function () {
  // the sign: a little note instead of the sparkle while a chapter is waiting; a tap opens the story
  const draw = MerchantSign.prototype.draw;
  MerchantSign.prototype.draw = function (c) {
    draw.call(this, c);
    if (!Merchant.S.seen || !Story.pending()) return;
    const sp = this.spr(), y = Math.round(this.y - sp.height), b = Math.round(Math.sin(this.t * 3) * 1.5), bx = Math.round(this.x) + 2, by = y - 10 + b;
    c.fillStyle = '#2e2230'; c.fillRect(bx, by, 8, 9); c.fillStyle = '#fff6ec'; c.fillRect(bx + 1, by + 1, 6, 7);
    c.fillStyle = '#c9b8a8'; c.fillRect(bx + 2, by + 3, 4, 1); c.fillRect(bx + 2, by + 5, 3, 1); c.fillStyle = '#e8607a'; c.fillRect(bx + 5, by + 1, 2, 2);
  };
  const poke = MerchantSign.prototype.poke;
  MerchantSign.prototype.poke = function () { if (Merchant.S.seen && Story.pending()) { this.hop = 0.35; Story.open(); } else poke.call(this); };
  // the merchant window points to the story
  const wm = UI.w_merchant;
  UI.w_merchant = function () {
    const out = wm.call(this), St = Story.week(); if (!St) return out;
    const done = St.ch.filter(c => c.done).length, p = Story.pending();
    out.splice(1, 0, h('div', { class: 'story-bar' + (p ? ' new' : '') }, ico('i_book', 20), h('span', { class: 'grow', text: p ? I18n.s("u_bebc98812dcc") : done >= 5 ? I18n.s("u_b316099fb15c") : I18n.s("u_9492444108bd", [done]) }), h('button', { class: 'chip sm' + (p ? ' primary' : ''), onclick: () => { UI.closeWin('merchant'); Story.open(); } }, p ? I18n.s("u_26fe1e7fb290") : I18n.s("u_d57366ca4f4f"))));
    return out;
  };
  // keepsakes show their names on hover
  const tag = Pets.ownerTag.bind(Pets); Pets.ownerTag = function (it) { return Story.tip(it) || tag(it); };
  setInterval(() => { try { Story.remind(); } catch (e) { console.warn(e); } }, 20000);
})();
