/* ============================================================
   0.92.52 Purr Cozy: 旅行商人的 T 型知識 (the travelling merchants' knowledge)
   Every merchant is an expert in one field (plants, time and maps, animals, the sky, food science, textiles).
   Each visit brings one theme week from that field; each of the five story chapters opens with:
     1. 你知道嗎？  a real piece of knowledge in the player's language, told by the merchant
     2. 商人的一句英文  one English line to look at and listen to (with translation; tap a word for its meaning) — never tested
     3. 今天的單字  the 4 English words the chapter uses, taught first (word, sound, meaning shown straight away)
     4. 小問答  2 questions about the knowledge, answered with one of those 4 words; a wrong answer costs nothing,
        the merchant just tells it again; a right one stamps the card in the notebook
     5. then the usual story quiz (5 questions) — chapters are still completed by that quiz only
   商人的筆記本: every card you read is kept, by merchant and theme, can be read again, and collecting cards earns rewards.
   Themes go in order per merchant (9 each, 270 cards); after all nine they start again.
   Content: js/lore-data.js (zh-TW, zh-CN). With the Japanese interface the story works as before until the Japanese
   text is ready.
   ============================================================ */
const LORE_MS = [[10, { c: 100, it: [['cat_treat', 1]] }], [30, { c: 250, it: [['premium_food', 1]] }], [60, { c: 500, it: [['premium_food', 2], ['catnip', 1]] }], [120, { c: 900, it: [['premium_food', 3], ['coffee', 2]] }], [200, { c: 1500, it: [['premium_food', 4], ['catnip', 2]] }], [270, { c: 2700, it: [['premium_food', 5], ['cat_treat', 5]] }]];
const lt = (id, a) => I18n.t('lore.' + id, a);

const Lore = {
  view: null, book: { mk: null, open: null },
  on() { return typeof LORE_DATA !== 'undefined' && I18n.lang !== 'ja'; },
  D() { return LORE_DATA[I18n.lang === 'zh-CN' ? 'zh-CN' : 'zh-TW']; },
  get S() { const S = Game.S; if (!S.lore) S.lore = { next: {}, cur: null, read: {}, ms: {} }; const L = S.lore; for (const k of ['next', 'read', 'ms']) if (!L[k]) L[k] = {}; return L; },
  id(mk, th, i) { return `${mk}.${th}.${i}`; },
  // this week's theme: chosen the first time the week's story is opened, then the next one next visit
  week() {
    if (!this.on() || typeof Story === 'undefined') return null;
    const St = Story.week(); if (!St) return null;
    const L = this.S, mk = St.mk, n = this.D()[mk].length;
    if (!L.cur || L.cur.wk !== St.wk || L.cur.mk !== mk) { const th = (L.next[mk] || 0) % n; L.cur = { wk: St.wk, mk, th }; L.next[mk] = th + 1; Game.save(); }
    return { mk, th: L.cur.th, W: this.D()[mk][L.cur.th] };
  },
  chapter(i) { const w = this.week(); return w ? w.W.ch[i] : null; },
  read(mk, th, i) { return this.S.read[this.id(mk, th, i)] || 0; },
  count() { return Object.keys(this.S.read).length; },
  stamps() { return Object.values(this.S.read).filter(v => v >= 2).length; },
  // links such as 「（和夜星連動）」 inside a card become a small tag
  split(text) { const links = []; const t = text.replace(/（和(.+?)連動[^）]*）/g, (_, m) => { links.push(m); return ''; }).replace(/\s+$/, ''); return { t, links }; },
  // ---------- one chapter ----------
  start(i, readOnly) { const w = this.week(); if (!w) return; this.view = { mk: w.mk, th: w.th, i, step: 'card', qi: 0, ans: null, right: 0, readOnly: !!readOnly }; UI.refresh('story'); },
  // a card from the notebook (any merchant, any theme already read)
  openCard(mk, th, i) { this.view = { mk, th, i, step: 'card', qi: 0, ans: null, right: 0, readOnly: true, book: true }; UI.closeWin('lorebook'); UI.openWin('story'); },
  C() { const v = this.view; return v && this.D()[v.mk][v.th].ch[v.i]; },
  mark(v, lvl) { const k = this.id(v.mk, v.th, v.i), L = this.S, was = L.read[k] || 0; if (lvl > was) { L.read[k] = lvl; Game.save(); } return was; },
  // reading a card always counts, also a chapter finished before 0.92.52 or a card opened from the notebook
  toWords() { const v = this.view; v.step = 'words'; const was = this.mark(v, 1); if (!was) Game.reward(0, 5, 'raw'); this.teach(); UI.refresh('story'); },
  // the four words become "seen" words of the game (so later quizzes treat them as taught)
  teach() { const c = this.C(), day = Learn.dayNum(); for (const [w] of c.w) { const i = VIDX[w]; if (i == null) continue; const r = Learn.recMake(i, [0, day, 0, 0, 0]); r[2] = (r[2] || 0) + 1; } Game.save(); },
  toQuiz() { const v = this.view; v.step = 'quiz'; v.qi = 0; v.ans = null; v.right = 0; v.opts = this.C().q.map(() => shuffle(this.C().w.map(x => x[0]))); UI.refresh('story'); },
  answer(word) {
    const v = this.view, c = this.C(); if (!v || v.ans) return;
    const ok = word === c.q[v.qi][1]; v.ans = { word, ok }; if (ok) v.right++;
    Learn.speak(c.q[v.qi][1]); UI.refresh('story');
  },
  nextQ() {
    const v = this.view; if (!v || !v.ans) return; v.qi++; v.ans = null;
    if (v.qi >= this.C().q.length) {
      v.step = 'done';
      if (v.right >= this.C().q.length) { const was = this.mark(v, 2); if (was < 2) { Game.reward(5, 5, 'quiz'); v.newStamp = true; } }
      this.checkMs();
    }
    UI.refresh('story');
  },
  close() { this.view = null; UI.refresh('story'); },
  // ---------- notebook rewards ----------
  msReady() { const n = this.count(); return LORE_MS.filter(([k]) => n >= k && !this.S.ms[k]); },
  checkMs() { if (this.msReady().length) UI.toast(lt('msToast'), 'i_book', 5, () => this.openBook()); UI.refresh('lorebook'); },
  claimMs(k) { const m = LORE_MS.find(x => x[0] === k); if (!m || this.S.ms[k] || this.count() < k) return; this.S.ms[k] = 1; Game.reward(m[1].c, 0, 'raw'); for (const [it, n] of m[1].it) Life.give(it, n); UI.toast(lt('msGot', [k]), 'i_star', 4); Game.save(); UI.refresh('lorebook'); },
  openBook(mk) { this.book.mk = mk || this.book.mk || (typeof Merchant !== 'undefined' ? Merchant.id() : 'moss'); UI.openWin('lorebook'); },
};

/* ---------------- drawing the chapter inside the story window ---------------- */
Object.assign(UI, {
  loreLine(c) {
    // every word can be tapped for its meaning (taught words first, then the game's dictionary)
    const box = h('div', { class: 'lore-en' }), tip = h('div', { class: 'lore-tip hint' });
    const taught = Object.fromEntries(c.w.map(([w, m]) => [w.toLowerCase(), m]));
    const parts = c.en.split(/(\s+)/);
    const en = h('p', { class: 'lore-en-line', lang: 'en' }, ...parts.map(p => {
      if (/^\s+$/.test(p)) return p;
      const bare = p.replace(/^[^A-Za-z']+|[^A-Za-z'-]+$/g, ''), key = bare.toLowerCase(), base = key.replace(/'s$/, '');
      const mean = taught[key] || taught[base] || (VIDX[key] != null ? Learn.qz(VOCAB[VIDX[key]]) : VIDX[base] != null ? Learn.qz(VOCAB[VIDX[base]]) : null);
      const hot = taught[key] || taught[base];
      return h('button', { class: 'lore-word' + (hot ? ' hot' : ''), type: 'button', onclick: () => { Learn.speak(bare); tip.textContent = mean ? `${bare}：${mean}` : bare; } }, p);
    }));
    box.append(h('div', { class: 'lore-en-head' }, h('b', { text: lt('lineHead') }), h('button', { class: 'xbtn', 'aria-label': lt('listen'), onclick: () => Learn.speak(c.en.replace(/["“”]/g, '')) }, ico('i_speaker', 18))), en, h('p', { class: 'lore-enz', text: c.enz }), tip);
    return box;
  },
  loreView() {
    const v = Lore.view, D = Lore.D(), W = D[v.mk][v.th], c = W.ch[v.i], M = MERCHANTS[v.mk], { t: cardText, links } = Lore.split(c.card);
    const head = h('div', { class: 'lore-head' }, h('span', { class: 'lore-emoji', text: c.e }), h('div', { class: 'grow' }, h('div', { class: 'hint', text: lt('chapterOf', [W.title, v.i + 1]) }), h('b', { class: 'lore-title', text: c.t })),
      h('span', { class: 'lore-steps' }, ...['card', 'words', 'quiz', 'done'].map(s => h('i', { class: s === v.step ? 'on' : ['card', 'words', 'quiz', 'done'].indexOf(s) < ['card', 'words', 'quiz', 'done'].indexOf(v.step) ? 'past' : '' }))));
    const out = [head];
    if (v.step === 'card') {
      out.push(h('div', { class: 'lore-card' }, h('div', { class: 'lore-kicker', text: lt('didYouKnow', [M.n]) }), h('p', { class: 'lore-text', text: cardText }),
        links.length ? h('div', { class: 'lore-links' }, ...links.map(n => h('span', { class: 'ptag', text: lt('link', [n]) }))) : null));
      out.push(this.loreLine(c));
      out.push(h('div', { class: 'row center wrap story-act' }, h('button', { class: 'chip big primary', onclick: () => Lore.toWords() }, ico('i_book', 20), lt('toWords')), v.book ? h('button', { class: 'chip', onclick: () => { Lore.close(); UI.closeWin('story'); Lore.openBook(v.mk); } }, lt('backBook')) : null));
    } else if (v.step === 'words') {
      out.push(h('p', { class: 'hint center', text: lt('wordsNote', [M.n]) }));
      out.push(h('div', { class: 'lore-words' }, ...c.w.map(([w, m]) => h('button', { class: 'lore-wcard', type: 'button', onclick: () => Learn.speak(w) }, h('b', { lang: 'en', text: w }), h('span', { text: m }), ico('i_speaker', 16)))));
      out.push(h('div', { class: 'row center wrap story-act' }, h('button', { class: 'chip', onclick: () => { v.step = 'card'; UI.refresh('story'); } }, lt('back')), h('button', { class: 'chip big primary', onclick: () => Lore.toQuiz() }, ico('i_learn', 20), lt('toQuiz', [c.q.length]))));
      setTimeout(() => { if (Lore.view === v && v.step === 'words' && !v.spoke) { v.spoke = true; Learn.speak(c.w[0][0]); } }, 300);
    } else if (v.step === 'quiz') {
      const [p, a] = c.q[v.qi], A = v.ans;
      out.push(h('div', { class: 'lore-q' }, h('div', { class: 'hint', text: lt('qOf', [v.qi + 1, c.q.length]) }), h('p', { class: 'lore-qtext' }, h('b', { text: M.n + '：' }), '「' + p + '」')));
      out.push(h('div', { class: 'qopts lore-opts' }, ...v.opts[v.qi].map((w, k) => {
        let cls = 'qopt'; if (A) { if (w === a) cls += ' right'; else if (A.word === w) cls += ' wrong'; }
        return h('button', { class: cls, disabled: !!A, onclick: () => Lore.answer(w) }, h('em', { class: 'num', text: String(k + 1) }), h('span', { lang: 'en', text: w }));
      })));
      if (A) {
        const mean = (c.w.find(x => x[0] === a) || [])[1] || '';
        out.push(h('div', { class: 'qfb ' + (A.ok ? 'ok' : 'no') }, h('div', { class: 'qfb-t' }, h('div', { class: 'qfb-l1' }, h('b', { text: A.ok ? lt('right') : lt('wrong', [M.n]) })), h('div', { class: 'qfb-l2', text: `${p} → ${a}（${mean}）` })),
          h('button', { class: 'chip sm primary', onclick: () => Lore.nextQ() }, v.qi + 1 >= c.q.length ? lt('finish') : lt('next'))));
      } else out.push(h('p', { class: 'hint center', text: lt('noRisk') }));
    } else {
      const all = v.right >= c.q.length, next = W.ch[v.i + 1], stamped = Lore.read(v.mk, v.th, v.i) >= 2;
      out.push(h('div', { class: 'lore-done' }, h('div', { class: 'lore-stamp' + (all ? ' on' : ''), text: all ? c.e : '📖' }),
        h('b', { text: all ? lt('stamped') : stamped ? lt('keptStamp') : lt('kept') }), !all && !stamped ? h('p', { class: 'hint', text: lt('tryStamp') }) : null, h('p', { class: 'hint', text: lt('bookCount', [Lore.count(), Lore.stamps()]) }),
        next && !v.readOnly ? h('p', { class: 'lore-tease', text: lt('tomorrow', [M.n, next.t]) }) : null,
        !next && !v.readOnly ? h('p', { class: 'lore-tease', text: lt('weekMore', [W.more]) }) : null));
      const acts = [];
      if (!all && !stamped) acts.push(h('button', { class: 'chip', onclick: () => Lore.toQuiz() }, ico('i_reset', 18), lt('retryQuiz')));
      if (v.readOnly) acts.push(h('button', { class: 'chip big primary', onclick: () => { Lore.close(); if (v.book) { UI.closeWin('story'); Lore.openBook(v.mk); } } }, v.book ? lt('backBook') : lt('backStory')));
      else acts.push(h('button', { class: 'chip big primary', onclick: () => { const i = v.i; Lore.view = null; Story.start(i); } }, ico('i_learn', 20), lt('toHelp')));
      out.push(h('div', { class: 'row center wrap story-act' }, ...acts));
    }
    return out;
  },
});

/* ---------------- the notebook ---------------- */
Object.assign(UI.WIN, { lorebook: { t: I18n.t('lore.book'), i: 'i_book', w: 560, at: ['c', 0], resize: { minW: 380, minH: 420, h: 700 } } });
UI.w_lorebook = function () {
  if (!Lore.on()) return [h('p', { class: 'hint', text: lt('jaSoon') })];
  const D = Lore.D(), mk = Lore.book.mk || MERCHANT_ORDER[0], L = Lore.S, total = MERCHANT_ORDER.reduce((s, m) => s + D[m].length * 5, 0);
  const tabs = h('div', { class: 'tabs wrap' }, ...MERCHANT_ORDER.map(m => { const n = D[m].reduce((s, W, th) => s + W.ch.filter((_, i) => Lore.read(m, th, i)).length, 0); return h('button', { class: 'tab sm' + (m === mk ? ' on' : ''), onclick: () => { Lore.book.mk = m; UI.refresh('lorebook'); } }, MERCHANTS[m].n + (n ? `（${n}）` : '')); }));
  const head = h('div', { class: 'lore-bookhead' }, h('div', { class: 'grow' }, h('b', { text: lt('bookTotal', [Lore.count(), total]) }), h('div', { class: 'hint', text: lt('bookStamps', [Lore.stamps()]) })),
    h('div', { class: 'lore-ms' }, ...LORE_MS.map(([k, rw]) => { const got = L.ms[k], ready = !got && Lore.count() >= k; return h('button', { class: 'chip sm' + (ready ? ' primary' : got ? ' done' : ''), disabled: !ready, title: lt('msTip', [k, rw.c]), onclick: () => Lore.claimMs(k) }, got ? '✓ ' + k : ready ? lt('msClaim', [k]) : String(k)); })));
  const M = MERCHANTS[mk], nextTh = (L.next[mk] || 0) % D[mk].length, curTh = L.cur && L.cur.mk === mk ? L.cur.th : -1;
  const list = h('div', { class: 'scroll lore-themes' });
  list.append(h('p', { class: 'hint', text: lt('field_' + mk, [M.n]) }));
  D[mk].forEach((W, th) => {
    const got = W.ch.map((_, i) => Lore.read(mk, th, i)), any = got.some(Boolean);
    const teaser = th === nextTh && th !== curTh;
    const row = h('div', { class: 'lore-theme' + (any ? '' : ' locked') },
      h('div', { class: 'lore-theme-t' }, h('b', { text: any || th === curTh || teaser ? W.title : lt('unknown') }), h('span', { class: 'hint', text: th === curTh ? lt('thisWeek') : teaser ? lt('nextVisit', [M.n]) : any ? `${got.filter(Boolean).length}/5` : '' })),
      h('div', { class: 'lore-slots' }, ...W.ch.map((c, i) => got[i] ? h('button', { class: 'lore-slot' + (got[i] >= 2 ? ' stamp' : ''), title: c.t, onclick: () => Lore.openCard(mk, th, i) }, h('span', { text: c.e }), h('small', { text: c.t })) : h('span', { class: 'lore-slot empty', text: '？' }))),
      any && got.every(Boolean) && W.more ? h('p', { class: 'lore-more hint', text: lt('moreHead') + W.more }) : null);
    list.append(row);
  });
  return [tabs, head, list];
};

/* ---------------- hooks: the story window and the merchant stall ---------------- */
(function () {
  if (typeof Story === 'undefined' || !UI.w_story) return;
  const ws = UI.w_story;
  UI.w_story = function () {
    if (Lore.on() && Lore.view) return this.loreView();
    const out = ws.call(this); if (!Lore.on()) return out;
    const w = Lore.week(); if (!w) return out;
    const St = Story.week(), i = Story.next(), review = Number.isInteger(Story.reviewChapter) && St.ch[Story.reviewChapter] && St.ch[Story.reviewChapter].done ? Story.reviewChapter : -1;
    const act = out.find(n => n && n.classList && n.classList.contains('story-act'));
    // a theme banner under the merchant
    const banner = h('div', { class: 'lore-banner' }, h('span', { text: w.W.ch[Math.max(0, i)]?.e || '📖' }), h('div', { class: 'grow' }, h('b', { text: lt('themeOf', [MERCHANTS[w.mk].n, w.W.title]) }), h('div', { class: 'hint', text: lt('themeHint', [w.W.ch.filter((_, k) => Lore.read(w.mk, w.th, k)).length]) })), h('button', { class: 'chip sm', onclick: () => Lore.openBook(w.mk) }, ico('i_book', 16), lt('book')));
    out.splice(1, 0, banner);
    if (act) {
      if (review >= 0) act.prepend(h('button', { class: 'chip sm primary', onclick: () => Lore.start(review, true) }, ico('i_book', 16), lt('rereadCard')));
      else if (i >= 0) {
        // the knowledge comes first: the old "幫忙（5 題）" button now opens the card (and the quiz follows it)
        const help = [...act.querySelectorAll('button.big')].pop();
        const readIt = Lore.read(w.mk, w.th, i) > 0, St4 = i === 4 && !St.name;
        const go = h('button', { class: 'chip big primary', disabled: St4, onclick: () => Lore.start(i) }, h('span', { text: w.W.ch[i].e + ' ' }), lt('listenTo', [MERCHANTS[w.mk].n]));
        if (help) { help.replaceWith(go); if (readIt && !St4) act.insertBefore(h('button', { class: 'chip', onclick: () => Story.start(i) }, ico('i_learn', 18), lt('straightHelp')), go.nextSibling); }
      } else if (St.ch.every(c => c.done)) {
        const unread = w.W.ch.filter((_, k) => !Lore.read(w.mk, w.th, k)).length, say = out[0] && out[0].querySelector('.story-say');
        const tag = out[0] && out[0].querySelector('.mname .ptag'); if (tag) tag.textContent = w.W.title;
        if (say) { say.querySelectorAll('p').forEach(p => p.remove()); say.append(h('p', { text: lt('weekDoneSay', [w.W.title]) }), h('p', { text: unread ? lt('weekUnread', [unread]) : lt('weekAllRead') })); }
        const nextT = Lore.D()[w.mk][(Lore.S.next[w.mk] || 0) % Lore.D()[w.mk].length].title;
        out.splice(2, 0, h('div', { class: 'lore-week' }, h('b', { text: lt('weekLearned') }), h('div', { class: 'lore-week-cards' }, ...w.W.ch.map((c, k) => h('button', { class: 'lore-slot' + (Lore.read(w.mk, w.th, k) >= 2 ? ' stamp' : Lore.read(w.mk, w.th, k) ? '' : ' unread'), onclick: () => Lore.start(k, true) }, h('span', { text: c.e }), h('small', { text: Lore.read(w.mk, w.th, k) ? c.t : lt('unreadCard') })))),
          w.W.more ? h('p', { class: 'lore-more hint', text: lt('moreHead') + w.W.more }) : null, h('p', { class: 'lore-tease', text: lt('nextTheme', [MERCHANTS[w.mk].n, nextT]) })));
      }
    }
    return out;
  };
  // closing the window leaves the card (it can be opened again from the same chapter)
  const close = UI.closeWin.bind(UI); UI.closeWin = function (id) { if (id === 'story' && Lore.view) Lore.view = null; return close(...arguments); };
  // the stall: a way into the notebook
  const wm = UI.w_merchant;
  UI.w_merchant = function () {
    const out = wm.call(this); if (!Lore.on()) return out;
    const w = Lore.week(); if (!w) return out;
    out.splice(2, 0, h('div', { class: 'story-bar lore-bar' }, h('span', { text: '📖' }), h('span', { class: 'grow', text: lt('stallBar', [MERCHANTS[w.mk].n, w.W.title, Lore.count()]) }), h('button', { class: 'chip sm', onclick: () => { UI.closeWin('merchant'); Lore.openBook(w.mk); } }, lt('book'))));
    return out;
  };
})();

/* ---------------- developer panel ---------------- */
(function () {
  if (typeof Dev === 'undefined' || !UI.w_dev) return;
  const w = UI.w_dev.bind(UI);
  UI.w_dev = function () {
    const out = w(); if (Dev.tab !== 'learn' || !Lore.on()) return out;
    const body = out.find(n => n && n.classList && n.classList.contains('devbody')); if (!body) return out;
    const A = (label, fn) => h('button', { class: 'chip sm', onclick: () => Dev.act(label, fn) }, label);
    const lw = Lore.week(), row = (title, ...btns) => h('div', { class: 'devrow' }, h('span', { class: 'devl', text: title }), h('div', { class: 'devbtns' }, ...btns));
    body.append(h('div', { class: 'sub', text: lt('devHead') }),
      row(lw ? lt('devNow', [MERCHANTS[lw.mk].n, lw.th + 1, lw.W.title, Lore.count()]) : '—',
        h('button', { class: 'chip sm', onclick: () => { UI.closeWin('dev'); Lore.openBook(); } }, lt('book')),
        A(lt('devNextTheme'), () => { const L = Lore.S; if (!L.cur) return; const n = Lore.D()[L.cur.mk].length; L.cur.th = (L.cur.th + 1) % n; L.next[L.cur.mk] = L.cur.th + 1; }),
        A(lt('devReadWeek'), () => { const x = Lore.week(); if (x) x.W.ch.forEach((_, i) => { Lore.S.read[Lore.id(x.mk, x.th, i)] = 2; }); }),
        A(lt('devReadAll'), () => { const D = Lore.D(); for (const m of MERCHANT_ORDER) D[m].forEach((W, th) => W.ch.forEach((_, i) => { Lore.S.read[Lore.id(m, th, i)] = 2; })); }),
        A(lt('devReset'), () => { delete Game.S.lore; })));
    return out;
  };
})();

/* ---------------- look ---------------- */
(function () {
  const css = `
.lore-head{display:flex;gap:10px;align-items:center;margin-bottom:8px}.lore-emoji{font-size:34px;line-height:1}.lore-title{font-size:18px}
.lore-steps{display:flex;gap:4px}.lore-steps i{width:9px;height:9px;border-radius:50%;background:var(--line)}.lore-steps i.past{background:var(--mint)}.lore-steps i.on{background:var(--honey);box-shadow:0 0 0 2px color-mix(in srgb,var(--honey) 40%,transparent)}
.lore-card{background:var(--paper-2);border:2px solid var(--line);border-radius:14px;padding:12px 14px;color:var(--ink)}
.lore-kicker{font-size:13px;font-weight:800;color:var(--honey);margin-bottom:4px}.lore-text{margin:0;line-height:1.75;font-size:15px}
.lore-links{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.lore-en{margin-top:10px;border-left:4px solid var(--honey);padding:6px 10px;background:color-mix(in srgb,var(--hl) 60%,transparent);border-radius:0 10px 10px 0}
.lore-en-head{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ink-2)}
.lore-en-line{margin:4px 0 2px;font-size:17px;line-height:1.7}.lore-word{all:unset;cursor:pointer;border-bottom:1px dashed transparent;padding:0 1px}.lore-word:hover{border-bottom-color:var(--ink-2)}
.lore-word.hot{color:var(--rose);font-weight:800;border-bottom-color:var(--rose)}.lore-enz{margin:0;color:var(--ink-2);font-size:14px}.lore-tip{min-height:18px;margin-top:2px}
.lore-words{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:8px 0}
.lore-wcard{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 8px;border-radius:12px;border:2px solid var(--line);background:var(--chip);color:var(--ink);font:inherit;cursor:pointer}
.lore-wcard b{font-size:20px}.lore-wcard span{color:var(--ink-2);font-size:14px}.lore-wcard:hover{border-color:var(--honey)}
.lore-q{margin:4px 0 8px}.lore-qtext{font-size:16px;line-height:1.6;margin:4px 0}
.lore-done{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:8px 0}
.lore-stamp{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;font-size:38px;border:3px dashed var(--line);color:var(--ink-2)}
.lore-stamp.on{border:3px solid #d9566f;background:color-mix(in srgb,#d9566f 12%,transparent);transform:rotate(-8deg);animation:loreStamp .45s cubic-bezier(.2,1.6,.4,1)}
.lore-tease{margin:6px 0 0;padding:8px 12px;border-radius:10px;background:var(--chip);color:var(--ink);font-size:14px}
.lore-banner{display:flex;gap:10px;align-items:center;padding:8px 10px;margin:6px 0;border-radius:12px;background:var(--chip);color:var(--ink)}.lore-banner>span{font-size:26px}
.lore-week{padding:10px;border-radius:12px;background:var(--paper-2);color:var(--ink);margin:6px 0}.lore-week-cards{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.lore-slot{display:flex;flex-direction:column;align-items:center;width:88px;padding:6px 4px;border-radius:10px;border:2px solid var(--line);background:var(--chip);color:var(--ink);font:inherit;cursor:pointer}
.lore-slot span{font-size:22px}.lore-slot small{font-size:11px;line-height:1.3;text-align:center;color:var(--ink-2)}.lore-slot.stamp{border-color:#d9566f}.lore-slot.unread{border-style:dashed;border-color:var(--honey)}.lore-slot.unread small{color:var(--honey);font-weight:800}.lore-slot.empty{justify-content:center;color:var(--ink-2);cursor:default;min-height:58px;font-size:18px;opacity:.6}
.lore-bookhead{display:flex;gap:10px;align-items:center;margin:6px 0;flex-wrap:wrap}.lore-bookhead>.grow{flex:1 1 200px;min-width:180px}.lore-ms{display:flex;gap:4px;flex-wrap:wrap}.lore-ms .done{opacity:.6}
.lore-themes{display:flex;flex-direction:column;gap:8px}.lore-theme{padding:8px 10px;border-radius:12px;background:var(--paper-2);color:var(--ink)}.lore-theme.locked{opacity:.8}
.lore-theme-t{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}.lore-slots{display:flex;gap:6px;flex-wrap:wrap}.lore-more{margin:6px 0 0}
.lore-bar{margin-top:6px}
@keyframes loreStamp{from{transform:scale(2) rotate(-20deg);opacity:0}to{transform:rotate(-8deg);opacity:1}}
@media (prefers-reduced-motion:reduce){.lore-stamp.on{animation:none}}
`;
  const st = document.createElement('style'); st.id = 'lore-css'; st.textContent = css; document.head.append(st);
})();
