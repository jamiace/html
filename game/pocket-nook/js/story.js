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
    nouns: { box: '材料箱', jar: '罐子', machine: '烤箱', board: '黑板菜單', guest: '客人', note: '奶奶的明信片' },
    words: 'honey lemon cream cake milk egg sugar bread butter cookie candy chocolate apple banana strawberry juice tea coffee cup plate spoon bowl sweet bake oven menu pie salt ice dessert fruit orange jam pancake breakfast snack delicious fresh warm',
    voice: {
      bridge: ['欸欸，你來啦！', '剛好，我正想找你。', '今天也好香對吧？'],
      quiz: ['等烤箱的時候，考你幾個字？', '趁麵團在發，換我考你！', '奶油在融化，我們來複習一下～'],
      done: ['太好了！今天又搞定一件事。', '多虧有你，我請你吃剛出爐的！', '嘿嘿，越來越像樣了。'],
    },
    arcs: [
      { open: ['這週我要去參加小鎮的甜點節！', '第一次自己擺攤，有點緊張……你會來幫我吧？'], what: '新蛋糕', ask: '我做了一個白白、軟軟、圓圓的蛋糕，還沒有名字。你幫我選一個英文字當名字？', names: ['soft', 'cloud', 'sweet', 'snow', 'moon', 'happy'], close: ['「{Name}」！就叫這個。', '甜點節大家都排隊來買，謝謝你，這週真的多虧有你。'] },
      { open: ['我的好朋友下個月要結婚了，她請我做婚禮蛋糕！', '要做得漂亮又好吃……這週要麻煩你囉。'], what: '婚禮蛋糕', ask: '最後要在蛋糕上插一塊小牌子，寫一個英文字。你覺得寫哪個好？', names: ['love', 'sweet', 'forever', 'happy', 'kind', 'golden'], close: ['「{Name}」……她一定會哭的，好感動。', '這塊牌子我留一個複製品給你，當紀念。'] },
      { open: ['我在河邊找到一間小小的空店面，想開第二間店！', '這週要準備好多東西，你願意幫我嗎？'], what: '新店', ask: '招牌要寫一個英文字，簡單好記的。你幫我選？', names: ['sunny', 'warm', 'little', 'dream', 'lucky', 'honey'], close: ['「{Name}」，掛上去了！', '開幕第一天，第一個客人就說名字好可愛。謝謝你。'] },
    ],
  },
  moss: {
    nouns: { box: '種子箱', jar: '種子包', machine: '溫室的說明牌', board: '植物名牌', guest: '來買花的客人', note: '山上朋友的信' },
    words: 'seed leaf flower rain root grass tree garden soil water sun plant grow green rose lily forest stone bee butterfly insect wind pot bamboo mushroom branch fresh wild river hill spring summer autumn winter rainbow',
    voice: {
      bridge: ['孩子，你來了。', '今天的風很舒服呢。', '慢慢來，不急。'],
      quiz: ['澆水的時候，陪婆婆念幾個字吧。', '趁葉子在曬太陽，我們也來動動腦。', '來，婆婆考考你。'],
      done: ['好孩子，謝謝你。', '植物聽得到我們說話的，牠們也謝謝你。', '今天就到這裡，喝杯茶再走吧。'],
    },
    arcs: [
      { open: ['山上的朋友寄來一箱種子，說是很少見的花。', '可是我年紀大了，看不太清楚上面的字……'], what: '新芽', ask: '種子發芽了，是一株小小的苗。你幫它取個英文名字好嗎？', names: ['tiny', 'hope', 'spring', 'little', 'brave', 'green'], close: ['「{Name}」，好名字。', '這株小苗就交給你照顧，帶回去放在窗邊吧。'] },
      { open: ['這週小鎮要辦花市，婆婆想帶最漂亮的盆栽去。', '要準備的東西好多，幫婆婆一把好嗎？'], what: '盆栽', ask: '最得意的那盆，要掛一張名牌。你來取名字吧？', names: ['sunny', 'lucky', 'kind', 'warm', 'green', 'dream'], close: ['「{Name}」，大家都停下來看呢。', '婆婆分一小盆給你，謝謝你這週的幫忙。'] },
    ],
  },
  clock: {
    nouns: { box: '舊皮箱', jar: '小抽屜', machine: '老收音機', board: '價目卡', guest: '客人', note: '夾在舊書裡的信' },
    words: 'clock watch time hour minute second key box old gold silver letter picture map mirror candle bell coin ring story secret history past remember lamp chair door window paper glass ship train',
    voice: {
      bridge: ['嗯……你來得正好。', '每一件舊東西，都在等人讀懂它。', '請坐，我剛擦好這只錶。'],
      quiz: ['趁發條還在轉，我們來溫習幾個字。', '年輕人，讓我考考你。', '慢慢想，時間還很多。'],
      done: ['原來如此……謝謝你。', '又解開一個小謎題了。', '這件東西，總算有人讀懂了。'],
    },
    arcs: [
      { open: ['我收到一只很舊的懷錶，背面刻著英文。', '我想知道它以前的主人是誰……你願意陪我一起找嗎？'], what: '懷錶', ask: '懷錶修好了。我想替它刻一個新的字，你來決定？', names: ['memory', 'forever', 'silver', 'golden', 'brave', 'kind'], close: ['「{Name}」，刻好了。', '我做了一個小一點的複製品給你，願它替你記住時間。'] },
      { open: ['我在閣樓找到一只鎖住的木箱。', '鑰匙不見了，上面卻貼滿了英文標籤……'], what: '木箱', ask: '箱子打開了，裡面是一張老照片。我想替這張照片取個名字，你覺得呢？', names: ['memory', 'dream', 'happy', 'kind', 'golden', 'little'], close: ['「{Name}」……好名字。', '照片的複製品送你，放在房間裡吧。'] },
    ],
  },
  fluff: {
    nouns: { box: '寵物用品箱', jar: '零食罐', machine: '自動餵食器', board: '寵物名牌', guest: '飼主', note: '寵物旅館的留言' },
    words: 'dog cat puppy kitten ball bone collar bell name home bark tail fur bath brush toy bed blanket friend walk park street hungry tired happy cute bird fish rabbit mouse',
    voice: {
      bridge: ['嗨嗨～毛孩們好嗎？', '你來啦！我剛好在煩惱一件事。', '今天也毛茸茸的一天！'],
      quiz: ['等小狗睡著的時候，我們來複習～', '換我考你！答對有摸摸！', '來來，考你幾個字～'],
      done: ['好棒！我就知道你最可靠了！', '謝謝你～毛孩們也很開心！', '呼，今天也順利解決了！'],
    },
    arcs: [
      { open: ['昨天店門口來了一隻小狗，項圈上只有英文名牌……', '牠好像迷路了，我們一起幫牠找到家好嗎？'], what: '小狗', ask: '小狗的家找到了！主人說想讓我們替牠取一個小名，你來選？', names: ['lucky', 'happy', 'brave', 'little', 'sunny', 'cloud'], close: ['「{Name}」！牠搖尾巴了，牠喜歡！', '主人送了一個小玩偶當謝禮，這個給你。'] },
      { open: ['這週寵物旅館要辦一場小小的生日派對！', '要準備好多東西，你會來幫忙吧？'], what: '派對', ask: '最後要做一面小旗子，上面寫一個英文字。你想寫什麼？', names: ['happy', 'sweet', 'lucky', 'kind', 'dream', 'warm'], close: ['「{Name}」！大家都戴上派對帽了～', '這隻小玩偶是派對紀念品，送你！'] },
    ],
  },
  star: {
    nouns: { box: '星圖箱', jar: '星砂瓶', machine: '望遠鏡', board: '星座卡', guest: '來看星星的客人', note: '遠方天文台的信' },
    words: 'star moon sun sky night dream light dark cloud planet wish space earth bright shine gold silver north south east west map lucky magic morning evening tonight fly',
    voice: {
      bridge: ['星星說，你今天會來。', '晚安……啊，現在還是白天嗎？', '你來了，星星們都亮了一點。'],
      quiz: ['等雲散開的時候，來念幾個字吧。', '星星喜歡聽人念英文，試試看？', '來，替星星們複習一下。'],
      done: ['謝謝你，今晚的星空會更亮。', '星星都記住你了。', '好……今天的星圖完成了一角。'],
    },
    arcs: [
      { open: ['遠方的天文台寄來一封信，說北邊的天空出現了一顆新的星星。', '信上的字有點難……你願意陪我一起看嗎？'], what: '新的星星', ask: '我們找到它了。可以替它取一個英文名字……你想叫它什麼？', names: ['hope', 'dream', 'lucky', 'tiny', 'silver', 'wish'], close: ['「{Name}」……很適合它。', '我把它的光裝進小玻璃球裡，送給你。'] },
      { open: ['這週有流星雨！', '我想把每一顆流星都記在星圖上，你幫我好嗎？'], what: '星圖', ask: '星圖畫好了，要在角落寫一個英文字當標題。你來選？', names: ['wish', 'dream', 'bright', 'magic', 'night', 'hope'], close: ['「{Name}」，寫上去了。', '這顆小星星球是謝禮，晚上它會微微發光。'] },
    ],
  },
  yarn: {
    nouns: { box: '毛線箱', jar: '鈕扣盒', machine: '縫紉機', board: '作品標籤', guest: '訂做的客人', note: '外國寄來的編織圖' },
    words: 'wool scarf glove hat sock sweater button needle thread cloth color red blue pink white soft warm pattern ribbon bag pocket gift winter cotton shirt dress coat yellow purple',
    voice: {
      bridge: ['來來，坐這裡，有毛線球可以抱。', '你來啦，我剛好織到一半。', '今天的毛線顏色好漂亮吧？'],
      quiz: ['我織一排，你答一題，好不好？', '手在動的時候，腦袋也動一動～', '來，邊織邊複習。'],
      done: ['謝謝你，又多織了一段。', '呼，今天的進度很不錯！', '有你在，針都變得比較聽話了。'],
    },
    arcs: [
      { open: ['國外的朋友寄來一張編織圖，是一條很特別的圍巾。', '可是全部都是英文……你幫我看懂好嗎？'], what: '圍巾', ask: '圍巾織好了！我想在角落繡一個英文字，你來決定？', names: ['warm', 'soft', 'cozy', 'snow', 'winter', 'happy'], close: ['「{Name}」，繡好了。', '我用剩下的毛線織了一條小的給你，冬天記得戴。'] },
      { open: ['有位客人訂了一件毛衣，要送給遠方的家人。', '訂單寫的全是英文，這週要麻煩你了。'], what: '毛衣', ask: '毛衣完成了，要縫一塊小布標。上面寫什麼字好呢？', names: ['love', 'warm', 'home', 'kind', 'soft', 'sunny'], close: ['「{Name}」，縫好了。', '客人說家人收到一定很開心。這是用同一捲毛線做的小紀念，送你。'] },
    ],
  },
};

// scenes: what happens, which questions it asks (t: question type, n: how many scene words)
const STORY_SCENES = {
  label: { n: 2, lines: [['{box}被雨淋濕了，有兩個{jar}上的標籤只剩一半。', '我不敢亂猜，你幫我把字拼完整好嗎？'], ['{jar}上的英文標籤被磨掉了幾個字母……', '你看得出來原本是什麼字嗎？']], ctx: '{jar}上的標籤：' },
  machine: { n: 2, lines: [['{machine}上寫的全是英文。', '我念給你聽，你告訴我是什麼意思？'], ['這個{machine}好難懂……', '上面的字你聽聽看？']], ctx: '{machine}上的字（聽聽看）' },
  board: { n: 2, lines: [['我要把{board}寫好，可是英文字常常拼錯。', '你告訴我是哪個字，我照著抄。'], ['{board}還空著兩格。', '幫我挑對的英文字好嗎？']], ctx: '{board}上要寫「{z}」' },
  list: { n: 3, lines: [['送貨單到了，上面列了好幾樣東西。', '我們一起對一下，看有沒有少？'], ['我在整理清單，有幾個字一時想不起來是什麼……', '幫我看看？']], ctx: '清單第 {i} 項' },
  guest: { n: 2, lines: [['剛剛有位外國{guest}來，講話好快……', '他說的那個字是什麼意思？'], ['{guest}留下一張紙條就走了。', '你看得懂嗎？']], ctx: '{guest}說的字' },
  letter: { n: 2, lines: [['{note}來了！', '可是有兩個字被弄糊了，你猜猜看？'], ['我收到{note}，最後幾個字被水沾濕了……', '幫我想想原本寫的是什麼？']], ctx: '{note}：「{sent}」', sents: ["Don't forget the ____.", 'Please bring some ____ next time.', 'I found a little ____ today.', 'The ____ is waiting for you.', 'I think of you and the ____.'] },
  find: { n: 2, lines: [['我把東西收進{box}，結果忘了放哪一格……', '每一格都貼著英文，你幫我找找？'], ['{box}的格子上都貼了英文。', '我要拿兩樣東西，是哪一格？']], ctx: '要找「{z}」，是哪一格？' },
};
const STORY_SCENE_IDS = Object.keys(STORY_SCENES);
const STORY_KEEP = {
  cocoa: { n: '可可的小蛋糕', thing: '甜點' }, moss: { n: '婆婆的小盆苗', thing: '盆苗' }, clock: { n: '老鐘先生的懷錶', thing: '懷錶' },
  fluff: { n: '毛球小姐的小狗玩偶', thing: '玩偶' }, star: { n: '夜星的星星球', thing: '星星球' }, yarn: { n: '阿線的小圍巾', thing: '圍巾' },
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
  for (const k in STORY_KEEP) ITEMS['keep_' + k] = { id: 'keep_' + k, n: STORY_KEEP[k].n, cat: 'decor', spr: 'keep_' + k, price: 0, lvl: 1, layer: 'decor', giftOnly: true, keepsake: k, desc: '旅行商人的故事紀念品。' };
})();

const Story = {
  get S() { const S = Game.S; if (!S.story) S.story = { used: {}, keep: {} }; if (!S.story.used) S.story.used = {}; if (!S.story.keep) S.story.keep = {}; return S.story; },
  M(mk) { return STORY_M[mk || Merchant.id()]; },
  pick(a) { return a[Math.floor(Math.random() * a.length)]; },
  fill(s, mk, extra = {}) { const n = this.M(mk).nouns; return s.replace(/\{(\w+)\}/g, (m, k) => extra[k] != null ? extra[k] : n[k] != null ? n[k] : m); },
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
      const words = pool.splice(0, n); const sv = Math.floor(Math.random() * STORY_SCENES[sc].lines.length);
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
    if (i === 4 && St.name && VIDX[St.name] != null) { const v = VOCAB[VIDX[St.name]]; qs.push({ i: v.i, type: Challenge.spellable(v) ? 'spell' : 'zh2en', opts: Challenge.spellable(v) ? null : Learn.options(v, 'w'), ctx: `把名字寫在${STORY_KEEP[mk].thing}的卡片上（${this.zh(v)}）` }); }
    // the rest from your own review words
    const have = new Set(qs.map(q => q.i)), own = Learn.pick(10).filter(x => !have.has(x)).slice(0, 5 - qs.length);
    const ownQs = Learn.makeQs(own); if (ownQs[0]) ownQs[0].ctx = this.pick(M.voice.quiz);
    return { qs: [...qs, ...ownQs], ids: [...qs, ...ownQs].map(q => q.i) };
  },
  // a smudged label: about half the letters left (always the first one)
  mask(w) { const keep = new Set([0]); const n = Math.max(1, Math.round(w.length * 0.45)); const idx = shuffle([...Array(w.length).keys()].slice(1)).slice(0, n - 1); idx.forEach(k => keep.add(k)); return [...w].map((ch, k) => keep.has(k) ? ch : '_').join(' '); },
  start(i) { const St = this.week(); if (!St || !St.ch[i] || i >= this.unlocked()) return; if (St.ch[i].done) return this.review(i); if (i === 4 && !this.S.name) return; this.cur = i; UI.closeWin('story'); Learn.start('story', { ch: i }); },
  title(o) { const St = this.week(); return `${MERCHANTS[St.mk].n}的故事 · 第 ${o.ch + 1} 章`; },
  finish(s, R) {
    const St = this.week(), c = St.ch[s.opts.ch], mk = St.mk, M = this.M(mk), A = M.arcs[St.arc];
    if (c.done) return { coins: 0, xp: 0, items: [], msg: '這一章已經完成，可以回顧故事。' };
    const first = true; c.done = true;
    if (first) { St.used[mk] = [...new Set([...(St.used[mk] || []), ...c.words])]; }
    const res = { coins: first ? 10 + R * 2 : R, xp: R * 3, items: [], msg: '' };
    if (s.opts.ch === 4 && first) {
      const name = St.name || A.names[0], Name = name.charAt(0).toUpperCase() + name.slice(1);
      res.msg = A.close.map(l => l.replace('{Name}', Name)).join(' ');
      const k = 'keep_' + mk, list = St.keep[mk] = St.keep[mk] || []; list.push({ name: Name, wk: St.wk, what: A.what });
      const S = Game.S, have = (S.inv[k] || 0) + S.items.filter(it => it.k === k).length;
      if (!have) { S.inv[k] = 1; res.keep = k; }
      UI.toast(have ? `${STORY_KEEP[mk].n}多了一個名字：「${Name}」` : `收到「${STORY_KEEP[mk].n}」！在收納箱裡，擺出來看看`, 'i_star', 5, have ? null : { label: '擺出來', fn: () => { UI.closeWin('study'); Game.place(k); } });
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
    return `${d.n}「${last.name}」` + (list.length > 1 ? `・之前的名字：${list.slice(0, -1).map(x => x.name).join('、')}` : '');
  },
  // once a day: the merchant calls you when a new chapter is waiting
  remind() {
    if (!Game.S || Game.focusing() || !this.pending()) return;
    const St = this.week(), d = Life.today(); if (St.toldDay === d) return;
    St.toldDay = d; Game.save();
    const M = MERCHANTS[St.mk], i = this.next();
    const line = i === 0 ? this.M().arcs[St.arc].open[0] : this.M().voice.bridge[St.ch[i].bridge % this.M().voice.bridge.length];
    UI.toast(`${M.n}：「${line}」`, 'i_shop', 6, { label: '去看看', fn: () => this.open() });
  },
};

/* ---------------- window ---------------- */
UI.WIN.story = { t: '旅行商人的故事', i: 'i_shop', w: 520, at: ['c', 0], modal: true };
UI.w_story = function () {
  const St = Story.week(); if (!St) return [h('p', { class: 'hint', text: '這週沒有故事。' })];
  const mk = St.mk, M = MERCHANTS[mk], SM = Story.M(mk), A = SM.arcs[St.arc], i = Story.next(), all = St.ch.every(c => c.done);
  const review = Number.isInteger(Story.reviewChapter) && St.ch[Story.reviewChapter] && St.ch[Story.reviewChapter].done ? Story.reviewChapter : -1;
  const dots = h('div', { class: 'story-dots' }, ...St.ch.map((c, k) => h(c.done ? 'button' : 'span', { type: c.done ? 'button' : null, onclick: c.done ? () => Story.review(k) : null, 'aria-label': c.done ? `回顧第 ${k + 1} 章` : null, 'aria-pressed': c.done ? String(k === review) : null, class: 'sdot' + (c.done ? ' done' : k === i ? ' cur' : k < Story.unlocked() ? ' open' : ''), title: c.done ? `第 ${k + 1} 章：完成` : k < Story.unlocked() ? `第 ${k + 1} 章` : `第 ${k + 1} 章：${['週一', '週二', '週三', '週四', '週五'][k]}開放` }, String(k + 1))));
  let say, act = [];
  if (review >= 0) {
    const c = St.ch[review], sc = STORY_SCENES[c.sc];
    say = review === 0 ? [...A.open] : [SM.voice.bridge[c.bridge % SM.voice.bridge.length]];
    if (review === 4) say.push(A.ask); else say.push(...sc.lines[c.sv % sc.lines.length].map(l => Story.fill(l, mk)));
    say.push(SM.voice.done[c.bridge % SM.voice.done.length]);
    if (review === 4) {
      const name = St.name || A.names[0], Name = name.charAt(0).toUpperCase() + name.slice(1);
      say.push(...A.close.map(l => l.replace('{Name}', Name)));
    }
    const completed = St.ch.map((c, k) => c.done ? k : -1).filter(k => k >= 0), at = completed.indexOf(review);
    act.push(h('span', { class: 'hint', text: `故事回顧 · 第 ${review + 1} 章` }));
    if (at > 0) act.push(h('button', { class: 'chip sm', onclick: () => Story.review(completed[at - 1]) }, '上一章'));
    if (at + 1 < completed.length) act.push(h('button', { class: 'chip sm', onclick: () => Story.review(completed[at + 1]) }, '下一章'));
    act.push(h('button', { class: 'chip', onclick: () => { Story.reviewChapter = null; UI.refresh('story'); } }, '返回本週故事'));
  } else if (all) {
    const last = (St.keep[mk] || []).slice(-1)[0];
    say = [`這週的故事結束了。${last ? `「${last.name}」，謝謝你取的名字。` : ''}`, '下次再來的時候，我再說新的故事給你聽。'];
  } else if (i < 0) {
    const k = St.ch.findIndex(c => !c.done);
    say = [Story.pick(SM.voice.done), `下一章${['週一', '週二', '週三', '週四', '週五'][k]}早上開放，到時候再來找我喔。`];
  } else {
    const c = St.ch[i], sc = STORY_SCENES[c.sc];
    say = [];
    if (i === 0) say.push(...A.open); else say.push(SM.voice.bridge[c.bridge % SM.voice.bridge.length]);
    if (i === 4) {
      say.push(A.ask);
      act.push(h('div', { class: 'story-names' }, ...St.names.map(w => h('button', { class: 'chip' + (St.name === w ? ' primary' : ''), onclick: () => Story.choose(w) }, h('b', { text: w }), h('span', { class: 'hint', text: ' ' + Story.zh(VOCAB[VIDX[w]]) })))));
    } else say.push(...sc.lines[c.sv % sc.lines.length].map(l => Story.fill(l, mk)));
    act.push(h('button', { class: 'chip big primary', disabled: i === 4 && !St.name, onclick: () => Story.start(i) }, ico('i_learn', 22), i === 4 ? (St.name ? `就叫「${St.name}」，寫上去！` : '先選一個名字') : '幫忙（5 題）'));
  }
  const head = h('div', { class: 'mstage' + (review >= 0 ? ' story-review' : '') }, merchantScene(mk), h('div', { class: 'msay story-say' }, h('div', { class: 'mname' }, h('b', { text: M.n }), h('span', { class: 'ptag', text: A.what })), ...say.map(l => h('p', { text: l }))));
  return [head, dots, h('div', { class: 'row center wrap story-act' }, ...act, h('button', { class: 'chip', onclick: () => { UI.closeWin('story'); Merchant.open(); } }, ico('i_shop', 18), '逛逛攤子')),
    h('p', { class: 'hint', text: review >= 0 ? '回顧不會重新答題、發放獎勵或變更故事進度與命名。' : '每天早上 6 點開放一章，漏掉的可以之後補。點選已完成的章節即可回顧故事。' })];
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
    out.splice(1, 0, h('div', { class: 'story-bar' + (p ? ' new' : '') }, ico('i_book', 20), h('span', { class: 'grow', text: p ? '有一章新的故事在等你' : done >= 5 ? '這週的故事看完了' : `這週的故事：${done}/5 章` }), h('button', { class: 'chip sm' + (p ? ' primary' : ''), onclick: () => { UI.closeWin('merchant'); Story.open(); } }, p ? '聽聽看' : '打開')));
    return out;
  };
  // keepsakes show their names on hover
  const tag = Pets.ownerTag.bind(Pets); Pets.ownerTag = function (it) { return Story.tip(it) || tag(it); };
  setInterval(() => { try { Story.remind(); } catch (e) { console.warn(e); } }, 20000);
})();
