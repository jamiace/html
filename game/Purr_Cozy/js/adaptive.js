/* Shared adaptive English practice. Probabilities are estimates, not measured word
   calibrations. Never change rewards, task membership, or a story's scripted text. */
const Adaptive = {
  target: .85,
  skills: ['meaning', 'listen', 'spell', 'listenspell'],
  clamp(x, a, b) { return Math.max(a, Math.min(b, x)); },
  skill(type) { return type === 'listenspell' ? type : type === 'spell' ? 'spell' : type === 'listen' ? 'listen' : 'meaning'; },
  state() {
    const L = Learn.L;
    if (!L.adaptive || L.adaptive.v !== 1) {
      // Existing word records provide a conservative starting point, not a placement test.
      let sum = 0, weight = 0;
      for (const [w, r] of Object.entries(Learn.P)) {
        const i = VIDX[w]; if (i == null || !r || r[3] < 1) continue;
        const k = Math.min(4, r[3]) / (1 + (r[4] || 0));
        sum += VOCAB[i].t * k; weight += k;
      }
      const tier = weight ? this.clamp(sum / weight, 1, 6) : Math.min(...Learn.levelsOn());
      const ability = .75 * tier + Math.log(this.target / (1 - this.target));
      L.adaptive = { v: 1, at: 0, skills: {}, words: {}, recent: [] };
      for (const k of this.skills) L.adaptive.skills[k] = { ability: ability - (k === 'meaning' || k === 'listen' ? .35 : 0), n: 0, history: [] };
    }
    return L.adaptive;
  },
  difficulty(v, type, q = {}) {
    const skill = this.skill(type), typed = skill === 'spell' || skill === 'listenspell';
    let d = .75 * v.t;
    if (typed) d += this.clamp((v.w.replace(/[^a-z]/ig, '').length - 5) * .075, -.15, .9);
    if (skill === 'listen' || skill === 'listenspell') d += .18;
    if (typed && !q.noHint && skill !== 'listenspell') d -= q.hint ? .28 : .12;
    return d;
  },
  probability(i, type = 'en2zh', q = {}) {
    const a = this.state(), v = VOCAB[i], k = this.skill(type), s = a.skills[k];
    const rec = a.words[v.w + '|' + k], old = Learn.rec(i);
    // Per-skill evidence outweighs the shared SRS record; wrong answers do not
    // make a word disappear, and passive previews are not treated as successes.
    const known = rec ? this.clamp((rec[0] - 2 * rec[1]) * .13, -.65, .9) : old ? this.clamp((old[0] || 0) * .07, 0, .35) : 0;
    const guess = k === 'meaning' || k === 'listen' ? .25 : 0;
    const logistic = 1 / (1 + Math.exp(-(s.ability + known - this.difficulty(v, type, q))));
    return this.clamp(guess + (1 - guess) * logistic, .02, .98);
  },
  rate(skill) {
    const h = this.state().skills[skill].history; if (!h.length) return null;
    let sum = 0, total = 0;
    h.forEach((x, i) => { const w = Math.pow(.92, h.length - 1 - i); sum += x * w; total += w; });
    return sum / total;
  },
  note(session, i, type, ok, q = {}) {
    if (i == null || !VOCAB[i]) return false;
    const k = this.skill(type), key = VOCAB[i].w + '|' + k;
    const seen = session.adaptiveSeen || (session.adaptiveSeen = new Set());
    const task = session.task, attempts = task ? (task.adaptiveAttempts || (task.adaptiveAttempts = {})) : null;
    if (seen.has(key) || attempts?.[key]) return false; // retries, including reopening a daily task
    seen.add(key); if (attempts) attempts[key] = true;
    const p = this.probability(i, type, q), a = this.state(), s = a.skills[k];
    const delta = .1 * ((ok ? 1 : 0) - p);
    s.ability = this.clamp(s.ability + delta, -2, 9);
    s.n++; s.history.push(ok ? 1 : 0); s.history = s.history.slice(-20);
    const at = a.at = Math.max(Date.now(), a.at + 1), r = a.words[key] || [0, 0, 0];
    r[ok ? 0 : 1]++; r[2] = at; a.words[key] = r;
    a.recent.push(i); a.recent = a.recent.slice(-40);
    const keys = Object.keys(a.words);
    if (keys.length > 1000) for (const key of keys.sort((x, y) => a.words[x][2] - a.words[y][2]).slice(0, keys.length - 1000)) delete a.words[key];
    return true;
  },
  select(ids, n, type = 'en2zh', opts = {}) {
    const a = this.state(), today = Learn.dayNum(), unique = [...new Set(ids)].filter(i => VOCAB[i]);
    const out = [], recent = new Set(a.recent.slice(-12));
    const targets = Object.fromEntries(this.skills.map(k => {
      const rate = this.rate(k);
      return [k, this.target + this.clamp((this.target - (rate ?? this.target)) * .12, -.02, .04)];
    }));
    // Small review/new quotas, then fit the remaining words to the learner.
    // Constraints are soft: prefer a suitable word over an excessively hard due word.
    const slots = opts.mix === false ? [] : ['due', 'fit', 'weak', 'fit', 'new', 'fit'];
    while (out.length < n && unique.length) {
      const category = slots.length ? slots[out.length % slots.length] : 'fit';
      let best = unique[0], bestScore = Infinity;
      for (const i of unique) {
        const q = typeof type === 'function' ? type(i, out.length) : { type, ...opts.q };
        const p = this.probability(i, q.type, q), r = Learn.rec(i), target = targets[this.skill(q.type)];
        const match = category === 'due' ? r && r[1] <= today : category === 'weak' ? r && r[4] > r[3] * .3 : category === 'new' ? !r : false;
        const score = Math.abs(p - target) - (match && p >= .65 ? .055 : 0) + (recent.has(i) ? .11 : 0) + Math.random() * .035;
        if (score < bestScore) { best = i; bestScore = score; }
      }
      out.push(best); unique.splice(unique.indexOf(best), 1);
    }
    return out;
  },
  pool() { const lv = new Set(Learn.levelsOn()); return VOCAB.filter(v => lv.has(v.t)).map(v => v.i); },
  pick(n, exclude, type = 'en2zh', opts = {}) { return this.select(this.pool().filter(i => !exclude?.has(i)), n, type, opts); },
  // Within a live quiz, move one eligible, unshown question forward. Scripted
  // scenes and repeats keep their original order and wording.
  prepare(s) {
    if (!s?.qs || s.ans || s.adaptiveAt === s.qi || s.qi >= s.qs.length) return;
    s.adaptiveAt = s.qi;
    if (s.kind === 'story' || (s.redoFrom != null && s.qi >= s.redoFrom)) return;
    const tail = s.qs.slice(s.qi), byId = new Map(tail.map(q => [q.i, q]));
    const [i] = this.select(tail.map(q => q.i), 1, i => byId.get(i), { mix: false });
    const at = s.qs.findIndex((q, k) => k >= s.qi && q.i === i);
    if (at > s.qi) [s.qs[s.qi], s.qs[at]] = [s.qs[at], s.qs[s.qi]];
  },
};
