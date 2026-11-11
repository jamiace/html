/* ============================================================
   0.92.51 Purr Cozy: 先教再考 (teach first, then test)
   A quiz used to be able to ask about a word the player had never been shown (the word picker mixes in new words,
   and several quizzes start without review cards). Now:
   - before any quiz that skips the review cards (pet training, helping a friend, team, the merchant's story, the
     level-up exam, daily challenges), the words in it that the player has never seen are shown first as word
     cards (English, sound, meaning) — then the same questions follow;
   - English answer options (看中選英) are taken from words the player has already seen whenever there are enough;
   - Meow Typo practice spells words the player has already met.
   The English level placement (grade) and the weekly level contest stay real tests on purpose.
   ============================================================ */
(function () {
  if (typeof Learn === 'undefined' || typeof VOCAB === 'undefined') return;
  const TESTS = new Set(['grade', 'contest', 'levelgate']);   // 0.93.6: the level-up check no longer shows its words first
  const seen = i => !!(VOCAB[i] && Learn.P[VOCAB[i].w]);
  Learn.seen = seen;
  const start = Learn.start.bind(Learn);
  Learn.start = function (kind, opts) {
    const before = this.sess, r = start(kind, opts), s = this.sess;
    if (s && s !== before && s.step === 'quiz' && Array.isArray(s.qs) && !TESTS.has(s.kind)) {
      const fresh = [...new Set(s.qs.map(q => q.i))].filter(i => !seen(i));
      if (fresh.length) {
        // show the new words first; the questions themselves stay exactly as they were
        s.keepQs = s.qs; s.words = fresh; s.ri = 0; s.flip = false; s.step = 'review'; s.teach = true;
        UI.refresh('study');
      }
    }
    return r;
  };
  const toQuiz = Learn.toQuiz.bind(Learn);
  Learn.toQuiz = function () {
    const s = this.sess;
    if (s && s.keepQs) { s.step = 'quiz'; s.qs = s.keepQs; delete s.keepQs; s.qi = 0; s.ans = null; s.teach = false; Adaptive.prepare(s); return; }
    return toQuiz();
  };
  // English options come from words the player knows (there are always enough after the first days)
  const options = Learn.options.bind(Learn);
  Learn.options = function (v, field) {
    if (field !== 'w') return options(v, field);
    const P = Learn.P, known = VOCAB.filter(o => o === v || P[o.w]);
    if (known.length < 40) return options(v, field);
    return optionsFrom(v, field, known);
  };
  // same rules as Learn.options (same part of speech and level first, no two options that read the same), on a smaller list
  function optionsFrom(v, field, list) {
    const pos = v.ps[0], text = o => Learn.norm(o.w), ok = o => o !== v && !Learn.clash(v, o, field);
    let c = list.filter(o => o.t === v.t && o.ps.includes(pos) && ok(o));
    if (c.length < 6) c = list.filter(o => o.ps.includes(pos) && ok(o));
    if (c.length < 3) c = list.filter(ok);
    if (c.length < 3) return options(v, field);
    const pick = [], got = new Set([text(v)]);
    for (const o of shuffle(c.slice())) { const t = text(o); if (got.has(t) || pick.some(p => Learn.clash(p, o, field))) continue; got.add(t); pick.push(o); if (pick.length === 3) break; }
    if (pick.length < 3) return options(v, field);
    return shuffle([v, ...pick]).map(x => x.i);
  }
  // the word card says this is a new word before the quiz
  const study = UI.w_study.bind(UI);
  UI.w_study = function () {
    // a new word is shown with its meaning straight away (normal review cards hide it until tapped)
    const s0 = Learn.sess; if (s0 && s0.teach && s0.step === 'review' && s0.teachShown !== s0.ri) { s0.flip = true; s0.teachShown = s0.ri; }
    const out = study(), s = Learn.sess;
    if (s && s.teach && s.step === 'review' && out[0] && out[0].classList && out[0].classList.contains('shead')) {
      const note = h('p', { class: 'hint center teach-note', text: I18n.t('teach.note', [s.words.length]) });
      out.splice(1, 0, note);
    }
    return out;
  };
})();
