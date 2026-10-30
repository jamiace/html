/* ============================================================
   How it feels to play (none of these numbers are shown in the game)
   - adaptive.js owns the 85% target and per-skill difficulty; legacy answer
     history remains available for compatibility. Explicit hard task rules remain.
   - lucky answers: each right answer has a 5% chance; in a quiz of 8 or more questions,
     all right so far and no lucky one yet, the last right answer is always lucky.
     One random reward: coins, a star for your team, a pet treat, experience, and for
     training or answers for a pet also bond
   - training a trick: after two misses in a row the next training uses words you know well
   - your team is nearly there (quiz-type tasks): the star jar glows; one tap gives exactly
     the questions still missing
   - a paper airplane: a friend's room needs help; it flies in through your window and one
     tap starts the help (the same rules as visiting: first help of the day free, then 4 words)
   ============================================================ */
const FEEL = { lo: 0.70, hi: 0.85, win: 30, minN: 12, luck: 0.05, pityQ: 8, planeEveryMs: 30 * 60e3, planeFirstMs: 3 * 60e3, planesPerDay: 3, planeLifeMs: 40 * 60e3 };

const Feel = {
  // ---------- answer rate ----------
  hist() { const L = Learn.L; if (!Array.isArray(L.acc)) L.acc = []; return L.acc; },
  rate() { const a = this.hist(); return a.length < FEEL.minN ? null : a.reduce((n, x) => n + x, 0) / a.length; },
  mode() { const r = this.rate(); return r == null ? 'mid' : r < FEEL.lo ? 'easy' : r > FEEL.hi ? 'hard' : 'mid'; },
  note(s, ok) {
    if (s.kind === 'chal' && s.task && s.task.tier === 'h') return;
    const a = this.hist(); a.push(ok ? 1 : 0); if (a.length > FEEL.win) a.splice(0, a.length - FEEL.win);
  },
  types(easy) {
    const sp = Learn.canSpeak();
    if (easy) return sp ? ['en2zh', 'zh2en', 'listen'] : ['en2zh', 'zh2en'];
    return sp ? ['en2zh', 'zh2en', 'spell', 'listen'] : ['en2zh', 'zh2en', 'spell'];
  },
  // words you know best (for the training safety net)
  easyWords(n) {
    const P = Learn.P, out = VOCAB.filter(v => P[v.w] && P[v.w][0] >= 2).sort((a, b) => P[b.w][0] - P[a.w][0] || P[b.w][3] - P[a.w][3]).slice(0, n * 4);
    const pickd = shuffle(out).slice(0, n).map(v => v.i);
    return pickd.length >= n ? pickd : [...pickd, ...Learn.pick(n).filter(i => !pickd.includes(i))].slice(0, n);
  },
  trainEasy(pid) { const p = Pets.get(pid); return !!(p && (p.trainFail || 0) >= 2); },
  // ---------- lucky answers ----------
  luck(s, q) {
    const base = s.redoFrom != null ? s.redoFrom : s.qs.length;
    const pity = base >= FEEL.pityQ && s.qi === base - 1 && !s.wrong.length && !s.luckyN;
    if (!pity && Math.random() >= FEEL.luck) return null;
    s.luckyN = (s.luckyN || 0) + 1;
    const team = this.luckTeam(q), pet = this.luckPet(s);
    const pool = ['coin', 'xp', 'treat']; if (team) pool.push('star'); if (pet) pool.push('bond');
    const k = pool[Math.floor(Math.random() * pool.length)];
    let r;
    if (k === 'coin') { const c = Game.reward(5 + Math.floor(Math.random() * 8), 0, 'raw'); r = { icon: 'i_coin', text: I18n.s("u_9b583063d081", [c]) }; }
    else if (k === 'xp') { const x = 8 + Math.floor(Math.random() * 8); Game.reward(0, x, 'raw'); r = { icon: 'i_star', text: I18n.s("u_f37fd1346438", [x]) }; }
    else if (k === 'treat') { Life.give('cat_treat', 1); r = { icon: SUPPLIES.cat_treat.spr, text: I18n.s("u_359bff718aef") }; }
    else if (k === 'star') { Team.onTrack(team.ev, 1); r = { icon: 'i_people', text: I18n.s("u_d797909c9336", [TEAM_TYPES[team.type].n]) }; }
    else { Pets.addBond(pet, 2); Pets.say(pet, pet.sp.startsWith('dog') ? I18n.s("u_28452697f131") : I18n.s("u_b5d7570da46d")); r = { icon: 'i_heart', text: I18n.s("u_ea83e69f4518", [pet.name]) }; }
    this.ding(); UI.hud(true); Game.save();
    return r;
  },
  // a team whose task this answer counts for
  luckTeam(q) {
    if (typeof Team === 'undefined' || !Team.ready || !Team.ready()) return null;
    const typed = q.type === 'spell' || q.type === 'listenspell' || q.type === 'listen';
    for (const type of ['d', 'w']) {
      const st = Team.inTeam(type), def = st && TEAM_TASKS[st.task]; if (!def) continue;
      const tm = Team.teams[st.id]; if (tm && tm.doneAt) continue;
      if (def.ev.includes('quizRight')) return { type, ev: 'quizRight' };
      if (def.ev.includes('engRight') && typed) return { type, ev: 'engRight' };
    }
    return null;
  },
  // answers given for a pet: training, or a supply for a pet
  luckPet(s) {
    if (s.kind === 'train') return Pets.get(s.opts.pid);
    if (s.kind === 'need' && SUPPLIES[s.opts.item] && SUPPLIES[s.opts.item].pet) {
      const nd = s.opts.needId && Life.L.needs.find(n => n.id === s.opts.needId);
      return (nd && nd.pet != null && Pets.get(nd.pet)) || Pets.sel() || null;
    }
    return null;
  },
  ding() {
    if (Game.S.settings.chime === false) return;
    try {
      if (!nookTouched()) return;   // browsers only allow sound after the first tap: before that, stay silent (no console warnings)
      const A = this.ac || (this.ac = new (window.AudioContext || window.webkitAudioContext)()); if (A.state === 'suspended') A.resume();
      [1318.5, 1760, 2093].forEach((f, i) => { const o = A.createOscillator(), g = A.createGain(), t0 = A.currentTime + i * 0.07; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.5); o.connect(g); g.connect(A.destination); o.start(t0); o.stop(t0 + 0.55); });
    } catch (e) { }
  },
  // ---------- the team is nearly there ----------
  near: {},
  nearLeft(type) {
    const s = StarJar.state(type); if (!s || s.done) return null;
    const def = TEAM_TASKS[s.task]; if (!def) return null;
    const left = s.goal - s.total; if (left <= 0 || left > Math.min(20, Math.max(5, Math.ceil(s.goal * 0.15)))) return null;
    return { type, left, task: s.task, quiz: def.ev.includes('quizRight') || def.ev.includes('engRight'), unit: def.unit };
  },
  teamTick() {
    for (const type of ['d', 'w']) {
      const n = this.near[type] = this.nearLeft(type); if (!n) continue;
      const key = type + ':' + Team.period(type), S = Game.S; S.nearSeen = S.nearSeen || {};
      if (S.nearSeen[type] === key || Game.focusing()) continue;
      S.nearSeen[type] = key; Game.save();
      const tn = TEAM_TYPES[type].n;
      if (n.quiz) UI.toast(I18n.s("u_19c27076aa44", [tn, n.left, n.unit]), 'i_people', 6, { label: I18n.s("u_3c5fbb63c843"), fn: () => this.finishTeam(type) });
      else UI.toast(I18n.s("u_99574b761251", [tn, n.left, n.unit]), 'i_people', 5, { label: I18n.s("u_d87059e4c8ca"), fn: () => UI.openTasks('team') });
    }
  },
  finishTeam(type) { const n = this.nearLeft(type); if (n && n.quiz) Learn.start('team', { type, n: Math.min(n.left, 12), task: n.task }); else UI.openTasks('team'); },
  teamWords(o) { const general=TEAM_TASKS[o.task].ev.includes('quizRight');return Adaptive.select(Adaptive.pool().filter(i=>general||Challenge.spellable(VOCAB[i])||Learn.canSpeak()),o.n,i=>({type:general?'en2zh':Challenge.spellable(VOCAB[i])?'spell':'listen'})); },
  teamQs(o, ids) {
    if (!TEAM_TASKS[o.task].ev.includes('engRight')) return Learn.makeQs(ids);
    // spelling and listening only, so every right answer counts for this task
    const sp = Learn.canSpeak();
    return ids.map((i, k) => { const v = VOCAB[i], type = Challenge.spellable(v) && (!sp || k % 2 === 0) ? 'spell' : 'listen'; return { i, type, opts: type === 'spell' ? null : Learn.options(v, 'z') }; });
  },
  // ---------- paper airplane: a friend needs a hand ----------
  plane: null, lastCheck: 0, checked: {},
  planesToday() { const S = Game.S, d = Life.today(); if (!S.planes || S.planes.d !== d) S.planes = { d, n: 0 }; return S.planes; },
  async planeTick() {
    const now = Date.now();
    if (this.plane && now > this.plane.until) this.plane = null;
    if (this.plane || this.busyPlane || typeof Social === 'undefined' || !Social.ready() || Game.focusing()) return;
    if (!this.started) this.started = now;
    if (now - this.started < FEEL.planeFirstMs || now - this.lastCheck < FEEL.planeEveryMs) return;
    if (this.planesToday().n >= FEEL.planesPerDay || Social.helpsToday() >= SOCIAL.helpsPerDay) return;
    const friends = Social.okFriends().filter(f => !(this.checked[f.id] > now - 2 * 3600e3)); if (!friends.length) return;
    this.lastCheck = now; this.busyPlane = true;
    try {
      const f = friends[Math.floor(Math.random() * friends.length)]; this.checked[f.id] = now;
      const r = await Social.db().get('rooms/' + f.id); if (!r || !r.data) return;
      const d = JSON.parse(r.data), needs = (d.needs || []).filter(n => NEED_HELP[n.type] && !Social.canHelp(f.id, n)); if (!needs.length) return;
      const need = needs[Math.floor(Math.random() * needs.length)], kind = HELP_KINDS[NEED_HELP[need.type]];
      let target = '';
      if (need.pet != null) { const p = (d.pets || []).find(x => x.id === need.pet); target = p ? p.name : I18n.s("u_5b825353b534"); }
      else { const it = (d.items || []).find(i => i.uid === need.target); target = it && ITEMS[it.k] ? ITEMS[it.k].n : I18n.s("u_62bd927cebc0"); }
      const fname = clipName(r.name) || Social.friendName(f.id);
      const text = need.type === 'cat_hungry' ? I18n.s("u_f37aadc1e5a5", [fname, target]) : need.type === 'plant_wilt' ? I18n.s("u_ae8da1c2d33f", [fname, target]) : I18n.s("u_1f9a6c097d4b", [fname, target]);
      this.launch({ fid: f.id, need, fname, target, text, kind, until: now + FEEL.planeLifeMs });
    } catch (e) { } finally { this.busyPlane = false; }
  },
  launch(o) {
    const win = Room.state.items.find(i => ITEMS[i.k] && ITEMS[i.k].window);
    const from = win ? (() => { const cv = Room.itemCanvas(win); return [win.x + cv.width / 2, win.y + cv.height / 2]; })() : [40, 60];
    const ty = 118 + Math.random() * 12, [xa, xb] = floorX(ty), tx = Math.max(xa + 12, Math.min(xb - 12, from[0] + (from[0] > 120 ? -20 : 20)));
    this.plane = Object.assign(o, { x: from[0], y: from[1], x0: from[0], y0: from[1], tx, ty, t: 0 });
    this.planesToday().n++; Game.save();
  },
  // flight: a gentle swoop from the window down to the floor, then it rests there rocking a little
  drawPlane(c, dt) {
    const P = this.plane; if (!P || Room.edit) return;
    P.t = Math.min(1, P.t + dt / 2.4); const k = P.t, e = 1 - Math.pow(1 - k, 2);
    P.x = P.x0 + (P.tx - P.x0) * e + Math.sin(k * Math.PI * 2) * 8 * (1 - k); P.y = P.y0 + (P.ty - P.y0) * e - Math.sin(k * Math.PI) * 10;
    const cv = SPR.get('paper_plane'), rock = k >= 1 ? Math.round(Math.sin(Room.t * 2) * 0.6) : 0, flip = P.tx < P.x0;
    if (k >= 1) { c.fillStyle = 'rgba(46,34,48,0.18)'; c.fillRect(Math.round(P.x) - 4, Math.round(P.y) + 1, 9, 1); }
    c.save(); if (flip) { c.translate(Math.round(P.x) * 2, 0); c.scale(-1, 1); }
    c.drawImage(cv, Math.round(P.x) - 5, Math.round(P.y) - 5 + rock); c.restore();
    if (k >= 1 && Math.random() < 0.01) Room.puff('p_spark', P.x, P.y - 6, { vy: -4, max: 0.5 });
  },
  hitPlane(x, y) { const P = this.plane; return !!(P && P.t >= 1 && !Room.edit && Math.abs(x - P.x) < 8 && y > P.y - 9 && y < P.y + 4); },
  openPlane() {
    const P = this.plane; if (!P) return; this.plane = null; this.hideTag();
    const why = Social.canHelp(P.fid, P.need); if (why) return UI.toast(why, 'i_people', 3);
    const opts = { fid: P.fid, need: P.need, fname: P.fname, target: P.target };
    if (Social.freeLeft()) return Social.doHelp(opts);
    Learn.start('help', opts);
  },
  // the note on the plane, above it
  posTag() {
    const P = this.plane; let el = this._tag;
    if (!P || P.t < 1 || Room.edit) return this.hideTag();
    if (!el) { el = this._tag = h('button', { class: 'pet-ask plane-tag', title: I18n.s("u_d9a065993836"), onclick: () => this.openPlane() }); UI.overlay.append(el); }
    if (el.dataset.t !== P.text) { el.dataset.t = P.text; el.replaceChildren(ico(P.kind.icon, 20), h('span', { text: P.text })); }
    el.hidden = false; const s = Game.scale, bob = Math.round(Math.sin(performance.now() / 260) * 2);
    el.style.transform = `translate(${Math.round(P.x * s)}px, ${Math.round((P.y - 9) * s) + bob}px) translate(-50%, -100%)`;
  },
  hideTag() { if (this._tag) this._tag.hidden = true; },
};

;

/* ---------------- hooks ---------------- */
(function () {
  // the star jar glows while the team is nearly there; a tap then gives exactly what is missing
  const draw = StarJar.draw.bind(StarJar);
  StarJar.draw = function (c, x, y, it, t, cv) {
    draw(c, x, y, it, t, cv);
    const n = Feel.near[ITEMS[it.k].jar];
    if (n && Room.uidMap[it.uid] === it) {
      const a = 0.18 + 0.14 * Math.sin(t * 3); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,214,90,${a.toFixed(2)})`; c.fillRect(x + 1, y + 3, cv.width - 2, cv.height - 4); c.restore();
      if (Math.random() < 0.05) Room.puff('p_star', x + Math.random() * cv.width, y + Math.random() * 4, { vy: -6, max: 0.7 });
      if (Math.floor(t * 1.2) % 4 === 0) it.shake = Math.max(it.shake || 0, 0.04);
    }
  };
  const tip = StarJar.tip.bind(StarJar);
  StarJar.tip = function (it) { const d = ITEMS[it.k], n = d && d.jar && Feel.near[d.jar]; const base = tip(it); return n ? I18n.s("u_a3cf9c7438bb", [base, n.left, n.unit, n.quiz ? I18n.s("u_24b37baf29a9") : '']) : base; };
  Fun.starJar = (it) => { const n = Feel.near[ITEMS[it.k].jar]; if (n && n.quiz) Feel.finishTeam(n.type); else UI.openTasks('team'); };
  // paper plane drawn over the room, its note follows it
  const render = Room.render.bind(Room); let last = performance.now();
  Room.render = function (dt) { render(dt); const now = performance.now(); Feel.drawPlane(this.ctx, Math.min(0.1, (now - last) / 1000)); last = now; };
  const tick = UI.tickOverlay.bind(UI); UI.tickOverlay = function (dt) { tick(dt); Feel.posTag(); };
  setInterval(() => { try { Feel.teamTick(); } catch (e) { console.warn(e); } }, 15000);
  setInterval(() => { Feel.planeTick(); }, 60000);
})();
