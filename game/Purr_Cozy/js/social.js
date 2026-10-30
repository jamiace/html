/* ============================================================
   Friends, name cards, visiting, helping, guestbook and the leaderboard
   (web build with Firebase; the Claude build has none of this)

   Firestore layout (rules in firestore.rules):
     profiles/{uid}                 public name card: name, code, status, avatar, level, pets,
                                    focus this week / total, room preview (JSON string)
     codes/{CODE}                   { uid }  friend code -> account, created once, never changed
     board/{uid}                    leaderboard row: name, avatar, lv (level x 1e7 + xp), coins
                                    (earned in total), tm (focus minutes), w.{week}: minutes
     users/{uid}/friends/{fid}      { s: 'out' | 'in' | 'ok', name, at }; both sides keep a copy
     rooms/{uid}                    room snapshot for friends, with the needs friends can help with
     rooms/{uid}/help/{needKey}     one help note per need; created once, so only the first
                                    helper gets it; the owner applies and deletes it on next login

   Free-plan budget (Firestore Spark: 50k reads / 20k writes a day for the whole project):
     profile + leaderboard row: written at most every 3 h (and after a name / status change)
     room snapshot: at most every 10 min, sooner (but not under 2 min) when the needs change
     help notes: read when you sign in, then every 15 min while you have friends
     leaderboard: one tab = 30 reads, cached 3 h on this device; friends' cards cached 3 h
     no realtime listeners anywhere
   ============================================================ */
const SOCIAL_ON = true;
const SOCIAL = {
  maxFriends: 30, reqDays: 14, helpsPerDay: 5, ticketEvery: 10, boardTop: 30, familiar: 5,
  boardMs: 3 * 3600e3, roomMs: 10 * 60e3, roomMinMs: 2 * 60e3, helpPollMs: 15 * 60e3, cardMs: 3 * 3600e3, quizMs: 10 * 60e3,
  helperCoins: 5, helperXp: 5, ownerCoins: 1, feedHunger: 30, guestMax: 100, statusUnits: 20,
};
const HELP_KINDS = {
  feed: { need: 'cat_hungry', v: I18n.s("u_05a34a86e2cc"), n: I18n.s("u_aae214a3c03d"), icon: 'it_cat_can', done: (n) => I18n.s("u_a90aff489061", [n]) },
  water: { need: 'plant_wilt', v: I18n.s("u_0c2a9a7a92d5"), n: I18n.s("u_0c2a9a7a92d5"), icon: 'it_fertilizer', done: (n) => I18n.s("u_bbd916802a3f", [n]) },
  dust: { need: 'dusty', v: I18n.s("u_888dda3afd8c"), n: I18n.s("u_888dda3afd8c"), icon: 'it_spray', done: (n) => I18n.s("u_7dfa70fbe4f2", [n]) },
};
const NEED_HELP = { cat_hungry: 'feed', plant_wilt: 'water', dusty: 'dust' };
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const boardWeek = () => weekKey().replace(/-/g, '');   // field names without '-' so they can be ordered on

const Social = {
  uid: null, started: false, friends: [], cards: {}, board: null, visitSt: null, cardSt: null, loading: {}, err: '',
  get Z() {
    const S = Game.S; if (!S.social) S.social = {};
    const Z = S.social; for (const [k, v] of Object.entries({ code: '', hd: '', hn: 0, total: 0, wk: { k: '', m: 0 }, guest: [], marks: [], helped: {}, pubAt: 0, roomAt: 0, gb: false, status: '', gid: 1 })) if (!(k in Z)) Z[k] = JSON.parse(JSON.stringify(v));
    return Z;
  },
  enabled() { return SOCIAL_ON && typeof Cloud !== 'undefined' && Cloud.mode === 'firebase' && !!Cloud.fb && !!Cloud.fb.store; },
  ready() { return this.enabled() && Cloud.active() && !!this.uid; },
  db() { return Cloud.fb.store; },
  myName() { return playerName(); },
  // developer-mode saves are treated like every other save (leaderboard, matching, teams)
  dev() { return !!(Game.S.flags && Game.S.flags.dev); },
  // developer saves join the leaderboard only when the switch in the developer panel is on (off by default)
  devListed() { return this.dev() && !!Game.S.flags.devBoard; },
  today() { return Life.today(); },
  // ---------- focus minutes (counted in every build, minute by minute, so a session across Monday 06:00 is split) ----------
  addFocus(m) { const Z = this.Z, k = weekKey(); if (Z.wk.k !== k) Z.wk = { k, m: 0 }; Z.wk.m += m; },
  weekFocus() { const Z = this.Z; return Z.wk.k === weekKey() ? Z.wk.m : 0; },
  totalFocus() { return Math.floor(Game.S.stats.focusMin || 0); },
  earned() { return Math.floor((Game.S.life && Game.S.life.stats.coins) || 0); },
  // ---------- lifecycle ----------
  onSynced() {
    if (!this.enabled()) return;
    const uid = Cloud.uid(); if (!uid) return;
    if (this.uid !== uid) { this.stop(); this.uid = uid; }
    if (this.started) return; this.started = true;
    this.boot().catch(e => { this.err = cloudErr(e); UI.refresh('friends'); });
    this.timer = setInterval(() => this.tick(), 60000);
  },
  stop() { clearInterval(this.timer); clearTimeout(this.publishTimer); this.publishTimer=null; this.timer = null; this.started = false; this.uid = null; this.friends = []; this.friendsAt = 0; this.cards = {}; this.board = null; this.visitSt = null; },
  async boot() {
    const Z = this.Z;
    if (!Z.gb) { if (!(Game.S.inv.guestbook > 0) && !Game.S.items.some(i => i.k === 'guestbook')) { Game.S.inv.guestbook = (Game.S.inv.guestbook || 0) + 1; UI.toast(I18n.s("u_4bf00cc5e114"), 'i_book', 5); } Z.gb = true; Game.save(); }
    await this.ensureCode();
    await this.publish(true);
    await this.loadFriends(true);
    await this.applyHelps();
    await this.snapshot(true);
    this.lastHelpPoll = Date.now();
    if (typeof Team !== 'undefined') { Team.tick(); Team.loadInvites(true); }
  },
  tick() {
    if (!this.ready()) return;
    const now = Date.now();
    if (this.okFriends().length && now - (this.lastHelpPoll || 0) > SOCIAL.helpPollMs) { this.lastHelpPoll = now; this.applyHelps().catch(() => { }); }
    this.snapshot(false).catch(() => { });
    this.publish(false).catch(() => { });
    if (typeof Team !== 'undefined') Team.tick();
  },
  // ---------- friend code & name card ----------
  async ensureCode() {
    const Z = this.Z; if (Z.code && Z.codeUid === this.uid) return Z.code;
    for (let i = 0; i < 8; i++) {
      let c = ''; for (let j = 0; j < 6; j++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      try { await this.db().set('codes/' + c, { uid: this.uid, at: '__now__' }); Z.code = c; Z.codeUid = this.uid; Game.save(); return c; }
      catch (e) { if (!e || e.code !== 'permission-denied') throw e; }   // taken by someone else: try another
    }
    throw Object.assign(new Error('code-taken'), { code: 'code-taken' });
  },
  petsPublic() { return Pets.list().filter(p => p.home).slice(0, 10).map(p => ({ id: p.id, sp: p.sp, name: p.name, acc: p.acc || null, lv: p.lv })); },
  roomPreview() { const S = Game.S; return { wp: S.wp, fl: S.fl, view: S.view, items: S.items.map(i => { const o = { uid: i.uid, k: i.k, x: i.x, y: i.y }; for (const f of ['flip', 'on', 'p', 'dx', 'dy', 'closed']) if (i[f] != null && i[f] !== false) o[f] = i[f]; return o; }) }; },
  card() {
    const S = Game.S, Z = this.Z;
    return { name: this.myName(), code: Z.code || '', status: clipStatus(Z.status), ava: sanitizeAvatar(S.avatar), lvl: S.lvl, pets: this.petsPublic(), wk: boardWeek(), wm: Math.floor(this.weekFocus()), tm: this.totalFocus(), room: JSON.stringify(this.roomPreview()), dev: this.dev(), at: '__now__' };
  },
  async publish(force) {
    const Z = this.Z; if (!this.ready()) return;
    const now = Date.now(); if (!force && now - (Z.pubAt || 0) < SOCIAL.boardMs) return;
    if(this.publishBusy){this.publishAgain=this.publishAgain||force;return false;}
    if (force && now - (this.lastForce || 0) < 60000 && Z.pubAt) { clearTimeout(this.publishTimer); const uid=this.uid; this.publishTimer=setTimeout(()=>{this.publishTimer=null;if(this.uid===uid&&this.ready())this.publish(true).catch(e=>{this.err=cloudErr(e)});},60050-(now-this.lastForce)); return false; } this.lastForce = now; this.publishBusy=true; try {
    const S = Game.S, c = this.card();
    await this.db().set('profiles/' + this.uid, c);
    // leaderboard row; a developer save is listed only with the developer switch on (its old row is removed otherwise)
    if (this.dev() && !this.devListed()) { if (!Z.boardGone) { await this.db().del('board/' + this.uid).catch(() => { }); Z.boardGone = true; } }
    else { await this.db().set('board/' + this.uid, { name: c.name, ava: c.ava, lvl: S.lvl, lv: S.lvl * 1e7 + Math.max(0, Math.floor(S.xp)), coins: this.earned(), tm: c.tm, w: { [c.wk]: c.wm }, at: '__now__' }); Z.boardGone = false; }
    Z.pubAt = now; this.cards[this.uid]=Object.assign({},c,{id:this.uid,got:now,roomD:JSON.parse(c.room||'null')});if(this.cardSt?.uid===this.uid){this.cardSt.c=this.cards[this.uid];UI.refresh('card');}Game.save();return true;
    } finally {this.publishBusy=false;if(this.publishAgain){this.publishAgain=false;this.publish(true).catch(e=>{this.err=cloudErr(e)});}}
  },
  // name card of anyone (cached on this device for 3 h)
  async getCard(uid, force) {
    if(uid===this.uid)return Object.assign({},this.card(),{id:uid,got:Date.now(),roomD:this.roomPreview()});
    const c = this.cards[uid]; if (!force && c && Date.now() - c.got < SOCIAL.cardMs) return c;
    const p = await this.db().get('profiles/' + uid); if (!p) return null;
    p.id = uid; p.got = Date.now(); try { p.roomD = JSON.parse(p.room || 'null'); } catch (e) { p.roomD = null; }
    this.cards[uid] = p; return p;
  },
  // ---------- room snapshot for friends ----------
  needKey(n) { return `${n.id}-${n.t || 0}`; },
  helpNeeds() { return Life.L.needs.filter(n => NEED_HELP[n.type] && (n.target != null || n.pet != null)).map(n => ({ k: this.needKey(n), type: n.type, target: n.target, pet: n.pet })); },
  snapData() {
    const S = Game.S, R = this.roomPreview();
    for (const o of R.items) { const i = Room.uidMap[o.uid]; if (i) for (const f of ['wilt', 'dust', 'broken', 'pet']) if (i[f] != null && i[f] !== false) o[f] = i[f]; }
    const pets = (Game.pets || []).map(a => { const d = a.data; if (!d) return null; const fam = Object.keys(d.fam || {}).filter(u => d.fam[u] >= SOCIAL.familiar);
      return { id: d.id, sp: d.sp, name: d.name, acc: d.acc || null, x: Math.round(a.x), y: Math.round(a.y), sleep: a.state === 'sleep', flip: !!a.flip, fam }; }).filter(Boolean);
    return Object.assign(R, { pets, needs: this.helpNeeds(), lvl: S.lvl, ava: sanitizeAvatar(S.avatar) });
  },
  async snapshot(force) {
    const Z = this.Z; if (!this.ready()) return;
    const now = Date.now(), sig = this.helpNeeds().map(n => n.k).join(',');
    const due = force || now - (Z.roomAt || 0) > SOCIAL.roomMs || (sig !== this.lastNeedSig && now - (Z.roomAt || 0) > SOCIAL.roomMinMs);
    if (!due) return;
    await this.db().set('rooms/' + this.uid, { name: this.myName(), data: JSON.stringify(this.snapData()), at: '__now__' });
    this.lastNeedSig = sig; Z.roomAt = now;
  },
  // ---------- friends ----------
  async loadFriends(force) {
    if (!this.ready()) return;
    if (!force && this.friendsAt && Date.now() - this.friendsAt < 60000) return;
    this.loading.friends = true; UI.refresh('friends');
    try {
      const rows = await this.db().list(`users/${this.uid}/friends`, SOCIAL.maxFriends * 3);
      // requests nobody answered within 14 days disappear
      const old = Date.now() - SOCIAL.reqDays * 86400000;
      for (const f of rows.filter(f => f.s !== 'ok' && f.at && f.at < old)) { this.db().del(`users/${this.uid}/friends/${f.id}`).catch(() => { }); this.db().del(`users/${f.id}/friends/${this.uid}`).catch(() => { }); }
      this.friends = rows.filter(f => !(f.s !== 'ok' && f.at && f.at < old));
      await Promise.all(this.okFriends().map(f => this.getCard(f.id).catch(() => null)));
      this.err = '';
    } catch (e) { this.err = cloudErr(e); }
    this.loading.friends = false; this.friendsAt = Date.now(); UI.refresh('friends'); UI.refresh('card');
  },
  okFriends() { return this.friends.filter(f => f.s === 'ok'); },
  rel(uid) { if (uid === this.uid) return 'me'; const f = this.friends.find(x => x.id === uid); return f ? f.s : 'none'; },
  friendName(id) { const p = this.cards[id], f = this.friends.find(x => x.id === id); return (p && p.name) || (f && f.name) || I18n.s("u_b9b1480dd6ec"); },
  normCode(code) { return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); },
  // look a code up and show that person's card first
  async findCode(code) {
    code = this.normCode(code);
    if (code.length !== 6) return UI.toast(I18n.s("u_29af9adafb41"), 'i_people');
    if (code === this.Z.code) return UI.toast(I18n.s("u_808292783e72"), 'i_people');
    try { const c = await this.db().get('codes/' + code); if (!c || !c.uid) return UI.toast(I18n.s("u_be990c72b54e"), 'i_people'); UI.openCard(c.uid); }
    catch (e) { UI.toast(I18n.s("u_11b9d3bc6575") + cloudErr(e), 'i_people', 4); }
  },
  async request(fid) {
    if (!this.ready() || fid === this.uid) return;
    await this.loadFriends(true);
    const have = this.friends.find(f => f.id === fid);
    if (have && have.s === 'ok') return UI.toast(I18n.s("u_a3217efced9f"), 'i_people');
    if (have && have.s === 'in') return this.accept(fid);
    if (have && have.s === 'out') return UI.toast(I18n.s("u_d0dc6433da3b"), 'i_people');
    if (this.okFriends().length >= SOCIAL.maxFriends) return UI.toast(I18n.s("u_7f3597416f99", [SOCIAL.maxFriends]), 'i_people');
    try {
      const card = await this.getCard(fid).catch(() => null), name = (card && card.name) || I18n.s("u_1b5a5abc14d1");
      await this.db().batch([['set', `users/${this.uid}/friends/${fid}`, { s: 'out', name, at: '__now__' }], ['set', `users/${fid}/friends/${this.uid}`, { s: 'in', name: this.myName(), at: '__now__' }]]);
      UI.toast(I18n.s("u_dc874a1f8ee7", [name]), 'i_people', 3.5);
    } catch (e) { UI.toast(I18n.s("u_0e683bc6e034") + cloudErr(e), 'i_people', 4); }
    await this.loadFriends(true);
  },
  async accept(fid) {
    await this.loadFriends(true);
    const f = this.friends.find(x => x.id === fid); if (!f || f.s !== 'in') return UI.toast(I18n.s("u_5ec5544b34b4"), 'i_people');
    if (this.okFriends().length >= SOCIAL.maxFriends) return UI.toast(I18n.s("u_11df78f6edab", [SOCIAL.maxFriends]), 'i_people', 3.5);
    try {
      await this.db().batch([['update', `users/${this.uid}/friends/${fid}`, { s: 'ok', at: '__now__' }], ['update', `users/${fid}/friends/${this.uid}`, { s: 'ok', name: this.myName(), at: '__now__' }]]);
      UI.toast(I18n.s("u_e8956d5a0fe4", [f.name || I18n.s("u_b9b1480dd6ec")]), 'i_people', 3);
    } catch (e) { UI.toast(I18n.s("u_5ef346ecbdb2") + cloudErr(e), 'i_people', 4); }
    await this.loadFriends(true);
  },
  async remove(fid, ask) {
    const f = this.friends.find(x => x.id === fid), nm = (f && f.name) || I18n.s("u_b9b1480dd6ec");
    if (ask && !confirm(I18n.s("u_32f098c06b8b", [nm]))) return;
    try { await this.db().batch([['del', `users/${this.uid}/friends/${fid}`], ['del', `users/${fid}/friends/${this.uid}`]]); }
    catch (e) { UI.toast(I18n.s("u_4d3c529d8981") + cloudErr(e), 'i_people', 4); }
    await this.loadFriends(true);
  },
  // ---------- visiting ----------
  async visit(fid) {
    if (!this.ready()) return;
    if (this.rel(fid) !== 'ok') return UI.toast(I18n.s("u_e25bceb35013"), 'i_people');
    this.visitSt = { fid, name: this.friendName(fid), loading: true }; UI.openWin('visit');
    for (const g of this.Z.guest) if (g.uid === fid) g.back = true;   // counts as a return visit
    try {
      const r = await this.db().get('rooms/' + fid);
      if (!r) this.visitSt = { fid, name: this.friendName(fid), empty: true };
      else this.visitSt = { fid, name: r.name || this.friendName(fid), d: JSON.parse(r.data), at: r.at };
    } catch (e) { this.visitSt = { fid, name: this.friendName(fid), err: cloudErr(e) }; }
    Game.save(); UI.refresh('visit'); UI.refresh('friends');
  },
  // ---------- helping ----------
  helpsToday() { const Z = this.Z; if (Z.hd !== this.today()) { Z.hd = this.today(); Z.hn = 0; Z.helped = {}; } return Z.hn; },
  freeLeft() { return this.helpsToday() === 0; },
  canHelp(fid, need) {
    if (this.rel(fid) !== 'ok') return I18n.s("u_a876d92701cd");
    if (this.helpsToday() >= SOCIAL.helpsPerDay) return I18n.s("u_7edef0c4bd73", [SOCIAL.helpsPerDay]);
    if (this.Z.helped[fid + ':' + need.k]) return I18n.s("u_54c56237109b");
    return '';
  },
  help(fid, need) {
    const why = this.canHelp(fid, need); if (why) return UI.toast(why, 'i_people', 3);
    const opts = { fid, need, fname: this.visitSt && this.visitSt.name, target: this.targetName(need) };
    if (this.freeLeft()) return this.doHelp(opts);
    Learn.start('help', opts);   // from the second success of the day: 4 words, 3 right to pass
  },
  helpTitle(o) { const k = HELP_KINDS[NEED_HELP[o.need.type]]; return I18n.s("u_deb791c0e1d5", [o.fname || I18n.s("u_b9b1480dd6ec"), k ? k.v : I18n.s("u_963e4f4abf64")]); },
  // called by the quiz: a pass is good for this one need, for 10 minutes
  helpResult(o, R) {
    if (R >= 3) { o.pass = Date.now(); this.doHelp(o); return { msg: I18n.s("u_1c65b1aab20e", [R, o.fname || I18n.s("u_b9b1480dd6ec"), HELP_KINDS[NEED_HELP[o.need.type]].v]) }; }
    return { msg: I18n.s("u_71247d071c02") };
  },
  targetName(need) {
    const d = this.visitSt && this.visitSt.d; if (!d) return '';
    if (need.pet != null) { const p = d.pets.find(x => x.id === need.pet); return p ? p.name : I18n.s("u_5b825353b534"); }
    const it = d.items.find(i => i.uid === need.target); return it && ITEMS[it.k] ? ITEMS[it.k].n : I18n.s("u_62bd927cebc0");
  },
  async doHelp(o) {
    const kind = NEED_HELP[o.need.type]; if (!kind) return;
    const why = this.canHelp(o.fid, o.need); if (why) return UI.toast(why, 'i_people', 3);
    if (!this.freeLeft() && !(o.pass && Date.now() - o.pass < SOCIAL.quizMs)) return UI.toast(I18n.s("u_0b20427aeffe"), 'i_people', 3);
    const free = this.freeLeft();
    try {
      // the note's id is the need itself: if a friend got there first, this write is refused
      await this.db().set(`rooms/${o.fid}/help/${o.need.k}`, { from: this.uid, name: this.myName(), kind, need: o.need.k, target: String(o.need.pet != null ? o.need.pet : o.need.target), tname: o.target || '', day: this.today(), at: '__now__' });
    } catch (e) {
      if (e && e.code === 'permission-denied') { this.dropNeed(o); UI.toast(I18n.s("u_2796830b8886"), 'i_people', 3.5); return; }
      return UI.toast(I18n.s("u_18b662187f47") + cloudErr(e), 'i_people', 4);
    }
    o.pass = 0;
    const Z = this.Z; this.helpsToday(); Z.hn++; Z.helped[o.fid + ':' + o.need.k] = 1; Z.total = (Z.total || 0) + 1;
    Game.reward(SOCIAL.helperCoins, SOCIAL.helperXp, 'raw');
    let msg = I18n.s("u_62360bb7e739", [HELP_KINDS[kind].done(o.target || ''), SOCIAL.helperCoins, SOCIAL.helperXp, o.fname || I18n.s("u_b9b1480dd6ec")]) + (free ? I18n.s("u_e2225a7a3926") : '');
    if (Z.total % SOCIAL.ticketEvery === 0) { Rewards.W.tickets = (Rewards.W.tickets || 0) + 1; msg += I18n.s("u_9971f946ac08", [SOCIAL.ticketEvery]); }
    this.dropNeed(o);
    UI.toast(msg, 'i_people', 5); Life.track('help', 1); Game.save(); saveSoon(); UI.refresh('visit'); UI.refresh('friends');
  },
  dropNeed(o) { if (this.visitSt && this.visitSt.d && this.visitSt.fid === o.fid) this.visitSt.d.needs = this.visitSt.d.needs.filter(n => n.k !== o.need.k); UI.refresh('visit'); },
  // ---------- owner side: friends' help notes are applied when you come online ----------
  async applyHelps() {
    if (!this.ready()) return;
    const rows = await this.db().list(`rooms/${this.uid}/help`, 60); if (!rows.length) return;
    rows.sort((a, b) => (a.at || 0) - (b.at || 0));
    const Z = this.Z, per = {}, lines = [];
    for (const r of rows) {
      const key = r.from + ':' + r.day; per[key] = (per[key] || 0) + 1;
      if (per[key] <= SOCIAL.helpsPerDay + 1 && HELP_KINDS[r.kind] && !Z.guest.some(g => g.nk === r.id && g.uid === r.from)) {
        const n = Life.L.needs.find(x => this.needKey(x) === r.need && NEED_HELP[x.type] === r.kind);
        const nm = clipName(r.name) || I18n.s("u_b9b1480dd6ec"); let what, res = 'ok', mark = null;
        if (n) {
          if (r.kind === 'feed') {
            const p = Pets.get(n.pet);
            if (p) { p.hunger = Math.min(100, p.hunger + SOCIAL.feedHunger); Pets.addBond(p, 1); p.fam = p.fam || {}; p.fam[r.from] = (p.fam[r.from] || 0) + 1; what = I18n.s("u_a90aff489061", [p.name]); mark = { pet: p.id }; Pets.checkNeeds(p); }
            else { what = I18n.s("u_23bebfc75f52"); res = 'gone'; }
          } else {
            const it = Room.uidMap[n.target];
            if (it) { what = HELP_KINDS[r.kind].done(Life.targetName(n)); Life.clearTargetFlags(n); mark = { target: it.uid }; }
            else { what = I18n.s("u_cc5d2cbc5641", [HELP_KINDS[r.kind].n]); res = 'gone'; }
          }
          Life.drop(n);
          if (res === 'ok') Game.reward(SOCIAL.ownerCoins, 0, 'raw');
        } else { what = I18n.s("u_17dbf2ae378a", [HELP_KINDS[r.kind].v]); res = 'done'; }
        const g = { id: Z.gid++, nk: r.id, uid: r.from, name: nm, kind: r.kind, what, res, at: r.at || Date.now(), read: false, back: false };
        Z.guest.unshift(g); if (Z.guest.length > SOCIAL.guestMax) Z.guest.length = SOCIAL.guestMax;
        if (mark && res === 'ok') Z.marks.push(Object.assign({ g: g.id, text: `${nm}${what}` }, mark));
        lines.push(`${nm}${what}`);
      }
      try { await this.db().del(`rooms/${this.uid}/help/${r.id}`); } catch (e) { }
    }
    if (lines.length) { UI.toast(lines.slice(0, 3).join('、') + (lines.length > 3 ? I18n.s("u_d756414e5675", [lines.length]) : '') + I18n.s("u_3ff09eeecb8d"), 'i_people', 6); Game.save(); saveSoon(); UI.refresh('friends'); UI.refresh('tasks'); UI.refresh('pet'); UI.badges(); }
    this.snapshot(true).catch(() => { });
  },
  // ---------- little hearts left where friends helped ----------
  _hits: [],
  markPos(m) {
    if (m.pet != null) { const a = Pets.actor(Pets.get(m.pet)); return a ? [a.x + (a.flip ? -8 : 6), a.y - 22] : null; }
    const it = Room.uidMap[m.target]; if (!it) return null; const cv = Room.itemCanvas(it); return [it.x + cv.width - 4, it.y - 4];
  },
  drawMarks(c) {
    this._hits = []; const Z = Game.S.social; if (!Z || !Z.marks || !Z.marks.length) return;
    const groups = {};
    for (const m of Z.marks) { const k = m.pet != null ? 'p' + m.pet : 'i' + m.target; (groups[k] = groups[k] || []).push(m); }
    for (const k in groups) {
      const list = groups[k], pos = this.markPos(list[0]); if (!pos) continue;
      const bob = Math.round(Math.sin(Room.t * 3 + list.length) * 1), x = Math.round(pos[0]), y = Math.round(pos[1]) + bob;
      c.fillStyle = '#fff4e0'; c.fillRect(x - 1, y - 1, 9 + (list.length > 1 ? 5 : 0), 9); c.fillStyle = '#2e2230'; c.fillRect(x - 2, y, 1, 7); c.fillRect(x + 8 + (list.length > 1 ? 5 : 0), y, 1, 7); c.fillRect(x - 1, y - 2, 9 + (list.length > 1 ? 5 : 0), 1); c.fillRect(x - 1, y + 8, 9 + (list.length > 1 ? 5 : 0), 1);
      c.drawImage(SPR.get('p_heart'), x + 1, y + 1);
      if (list.length > 1) { c.fillStyle = '#c4566e'; c.font = '7px monospace'; c.fillText(String(Math.min(9, list.length)), x + 8, y + 7); }
      this._hits.push({ x: x - 2, y: y - 2, w: 12 + (list.length > 1 ? 5 : 0), h: 12, list });
    }
  },
  hitMark(x, y) { for (const h of this._hits) if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h; return null; },
  readMark(h) {
    const Z = this.Z, ids = new Set(h.list.map(m => m.g));
    UI.toast(h.list.map(m => m.text).join('、'), 'i_heart', 4.5);
    Z.marks = Z.marks.filter(m => !ids.has(m.g)); for (const g of Z.guest) if (ids.has(g.id)) g.read = true;
    Game.save(); UI.refresh('friends');
  },
  unread() { const Z = Game.S.social; return Z && Z.guest ? Z.guest.filter(g => !g.read).length : 0; },
  // ---------- leaderboard ----------
  BOARDS: [['lvl', I18n.s("u_31b0f533e8db"), 'lv'], ['coins', I18n.s("u_ca5f4cb3273e"), 'coins'], ['week', I18n.s("u_034867da73c1"), null], ['focus', I18n.s("u_1996714b07c9"), 'tm']],
  boardCache() { try { return JSON.parse(localStorage.getItem('pocketnook.board.v2') || 'null'); } catch (e) { return null; } },
  async loadBoard(tab, force) {
    if (!this.ready()) return;
    const wk = boardWeek(), c = this.boardCache() || {}, key = tab + ':' + (tab === 'week' ? wk : ''), hit = c.uid === this.uid && c.rows && c.rows[key];
    if (!force && hit && Date.now() - hit.at < SOCIAL.boardMs) { this.board = c; return; }
    this.loading.board = tab; UI.refresh('friends');
    try {
      const def = this.BOARDS.find(b => b[0] === tab), field = def[2] || `w.${wk}`;
      const rows = (await this.db().top('board', field, SOCIAL.boardTop)).map(r => ({ id: r.id, name: clipName(r.name) || I18n.s("u_1b5a5abc14d1"), ava: r.ava || null, lvl: r.lvl || 1, lv: r.lv || 0, coins: r.coins || 0, tm: r.tm || 0, week: (r.w || {})[wk] || 0, at: r.at || 0 }));
      const val = (r) => tab === 'lvl' ? r.lv : tab === 'coins' ? r.coins : tab === 'week' ? r.week : r.tm;
      // ties: same value -> who got there first (older update) -> account id
      rows.sort((a, b) => val(b) - val(a) || (a.at || 0) - (b.at || 0) || (a.id < b.id ? -1 : 1));
      const out = c.uid === this.uid ? c : { uid: this.uid, rows: {} }; out.rows = out.rows || {};
      out.rows[key] = { at: Date.now(), list: rows.filter(r => val(r) > 0 || tab === 'lvl') };
      this.board = out; try { localStorage.setItem('pocketnook.board.v2', JSON.stringify(out)); } catch (e) { }
      this.err = '';
    } catch (e) { this.err = cloudErr(e); }
    this.loading.board = false; UI.refresh('friends');
  },
};
function clipStatus(s) { let out = '', w = 0; for (const g of graphemes(cleanName(s))) { const c = WIDE_RE.test(g) ? 2 : 1; if (w + c > SOCIAL.statusUnits) break; out += g; w += c; } return out.trim(); }

/* ---------------- guestbook item ---------------- */
;
ITEMS.guestbook = { id: 'guestbook', n: I18n.s("u_93a9e22cb641"), cat: 'furniture', spr: 'guestbook', price: 0, lvl: 1, layer: 'floor', special: true, comfort: 1 };

/* ---------------- windows ---------------- */
Object.assign(UI.WIN, {
  friends: { t: I18n.s("u_b9b1480dd6ec"), i: 'i_people', w: 480, at: ['r', 0], resize: { minW: 380, minH: 360, h: 620 } },
  visit: { t: I18n.s("u_a55baf30c49a"), i: 'i_people', w: 620, at: ['c', 0] },
  card: { t: I18n.s("u_9e3899a169a0"), i: 'i_people', w: 420, at: ['c', 1] },
});
function fmtMins(m) { m = Math.floor(m || 0); return m >= 60 ? I18n.s("u_60dddd8c2d43", [Math.floor(m / 60), m % 60]) : I18n.s("u_90b42904a41d", [m]); }
function roomCanvas(d, scale, opts = {}) {
  const st = { wp: d.wp, fl: d.fl, view: d.view, gifts: [], items: (d.items || []).filter(i => ITEMS[i.k]).map(i => Object.assign({}, i)) };
  const cv = Room.renderStatic(document.createElement('canvas'), st, Room.env ? Room.env.h : 12.5, Room.env ? Room.env.dark : 0), c = cv.getContext('2d');
  for (const p of (opts.pets || []).slice().sort((a, b) => a.y - b.y)) { const [k, col] = p.sp.split(':'); const pc = petCanvas(k, col, p.sleep ? 'sleep' : 'sit', 0, p.flip, p.acc); c.drawImage(pc, Math.round(p.x) - Math.floor(pc.width / 2), Math.round(p.y) - canvasBottom(pc)); }
  if (opts.ava) { const ac = avatarCanvas('front0', opts.ava, null, 0, false); c.drawImage(ac, 196 - Math.floor(ac.width / 2), 160 - ac.height); }
  const big = h('canvas', { class: opts.cls || 'visit-cv' }); big.width = cv.width * scale; big.height = cv.height * scale; const bc = big.getContext('2d'); bc.imageSmoothingEnabled = false; bc.drawImage(cv, 0, 0, big.width, big.height);
  return big;
}
Object.assign(UI, {
  frTab: 'friends', boardTab: 'lvl',
  openFriends(tab) {
    this.frTab = tab || this.frTab; this.openWin('friends');
    if (Social.ready()) { if (this.frTab === 'board') Social.loadBoard(this.boardTab); else Social.loadFriends(); }
  },
  async openCard(uid) {
    Social.cardSt = { uid, loading: true }; this.openWin('card');
    try { const c = await Social.getCard(uid); Social.cardSt = c ? { uid, c } : { uid, none: true }; }
    catch (e) { Social.cardSt = { uid, err: cloudErr(e) }; }
    this.refresh('card');
  },
  avaPic(ava, size = 40) { try { return sprPreview(avatarCanvas('front0', sanitizeAvatar(ava || {}), null, 0, false), size, Math.max(1, Math.floor(size / 36))); } catch (e) { return h('span'); } },
  w_card() {
    const C = Social.cardSt; if (!C) return [];
    if (C.loading) return [h('p', { class: 'hint center', text: I18n.s("u_15cc20383a44") })];
    if (C.err) return [h('p', { class: 'hint warn', text: I18n.s("u_cf89fa393c5b") + C.err })];
    if (C.none) return [h('p', { class: 'hint', text: I18n.s("u_cb14ff5bc652") })];
    const c = C.c, rel = Social.rel(C.uid);
    const btns = h('div', { class: 'row center wrap' });
    if (rel === 'me') btns.append(h('button', { class: 'chip sm', onclick: () => this.openWin('account') }, I18n.s("u_5c8105d35eec")));
    else if (rel === 'ok') btns.append(h('span', { class: 'ptag', text: I18n.s("u_188a1fcd9d6a") }), h('button', { class: 'chip primary', onclick: () => { this.closeWin('card'); Social.visit(C.uid); } }, ico('i_people', 18), I18n.s("u_a55baf30c49a")));
    else if (rel === 'out') btns.append(h('span', { class: 'ptag', text: I18n.s("u_ad4e37fb0617") }));
    else if (rel === 'in') btns.append(h('button', { class: 'chip primary', onclick: () => Social.accept(C.uid) }, I18n.s("u_1cbf70bee587")));
    else btns.append(h('button', { class: 'chip primary', onclick: () => Social.request(C.uid) }, ico('i_plus', 18), I18n.s("u_998e1842fabe")));
    const pets = h('div', { class: 'cardpets' }, ...(c.pets || []).map(p => { const [k, col] = String(p.sp || 'cat:ginger').split(':'); return h('div', { class: 'cardpet', title: p.name }, sprPreview(petCanvas(k, PETS[p.sp] ? col : 'ginger', 'sit', 0, false, p.acc), 40, 2), h('span', { text: p.name })); }));
    const room = c.roomD ? roomCanvas(c.roomD, 1, { cls: 'card-room' }) : null;
    const wk = c.wk === boardWeek() ? c.wm : 0;
    return [h('div', { class: 'cardtop' }, this.avaPic(c.ava, 72), h('div', { class: 'grow' },
        h('div', { class: 'cardname' }, h('b', { text: clipName(c.name) || I18n.s("u_1b5a5abc14d1") }), h('span', { class: 'ptag', text: 'Lv ' + (c.lvl || 1) })),
        c.status ? h('p', { class: 'cardstatus', 'data-i18n-skip':true, text: c.status }) : null,
        h('p', { class: 'hint', text: I18n.s("u_342d82b4a734", [c.code || '—']) }),
        h('p', { class: 'hint', text: I18n.s("u_2d697fcc0d8f", [fmtMins(wk), fmtMins(c.tm)]) }))),
      room, (c.pets || []).length ? h('div', { class: 'sub', text: I18n.s("u_406e3dc6ef01", [c.pets.length]) }) : null, pets, btns,
      rel !== 'ok' && rel !== 'me' ? h('p', { class: 'hint', text: I18n.s("u_50422446ec83") }) : null];
  },
  w_friends() {
    const Z = Social.Z, tab = this.frTab, un = Social.unread();
    const tabs = h('div', { class: 'tabs' }, ...[['friends', I18n.s("u_b9b1480dd6ec")], ['board', I18n.s("u_1ee95aa94712")], ['guest', un ? I18n.s("u_6e270720127f", [un]) : I18n.s("u_93a9e22cb641")]].map(([k, l]) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => this.openFriends(k) }, l)));
    if (!Social.enabled() || !Social.ready()) return [tabs, h('div', { class: 'empty' }, ico('i_people', 40), h('p', { text: Social.enabled() ? I18n.s("u_57907ed4a0c9") : I18n.s("u_6ac4924e76f5") }), Social.enabled() ? h('button', { class: 'chip primary', onclick: () => this.openWin('account') }, I18n.s("u_92fc480bee59")) : null)];
    const out = [tabs]; if (Social.err) out.push(h('p', { class: 'hint warn', text: Social.err }));
    if (tab === 'friends') {
      const left = SOCIAL.helpsPerDay - Social.helpsToday(), prog = (Z.total || 0) % SOCIAL.ticketEvery, tk = Rewards.W.tickets || 0;
      out.push(h('div', { class: 'frme' }, this.avaPic(Game.S.avatar, 44), h('div', { class: 'grow' }, h('div', {}, h('b', { text: Social.myName() }), ' ', h('button', { class: 'chip sm', onclick: () => this.openCard(Social.uid) }, I18n.s("u_487e926379fe"))), h('div', { class: 'hint', text: I18n.s("u_0acfeb766c07") })),
        h('div', { class: 'frcode num', text: Z.code || '……' }), h('button', { class: 'chip sm', disabled: !Z.code, onclick: () => { try { navigator.clipboard.writeText(Z.code); UI.toast(I18n.s("u_460208770622"), 'i_people', 2); } catch (e) { } } }, I18n.s("u_bb6dad578c81"))));
      const inp = h('input', { id: 'fr-code', type: 'text', maxlength: '8', placeholder: I18n.s("u_363ea9fb40d8"), autocomplete: 'off', onkeydown: e => { if (e.key === 'Enter') Social.findCode(e.target.value); } });
      out.push(h('div', { class: 'row' }, h('div', { class: 'inset grow' }, inp), h('button', { class: 'chip primary', onclick: () => Social.findCode(inp.value) }, ico('i_people', 18), I18n.s("u_e62523053be4"))));
      out.push(h('div', { class: 'frstat' }, h('span', { text: left > 0 ? I18n.s("u_a095d319dbe2", [left]) + (Social.freeLeft() ? I18n.s("u_a34f6b297d85") : I18n.s("u_b9d1c27942f0")) : I18n.s("u_499fc6da0e95") }),
        h('span', { text: I18n.s("u_c9dded4054db", [prog, SOCIAL.ticketEvery]) }), h('button', { class: 'chip sm' + (tk ? ' primary' : ''), disabled: !tk, onclick: () => Rewards.openTicket() }, ico('i_ticket', 16), I18n.s("u_ac41e21b1978", [tk]))));
      const ins = Social.friends.filter(f => f.s === 'in'), outs = Social.friends.filter(f => f.s === 'out'), oks = Social.okFriends();
      if (ins.length) out.push(h('div', { class: 'sub', text: I18n.s("u_ac1327a689e1", [ins.length]) }), ...ins.map(f => h('div', { class: 'frrow' }, h('button', { class: 'frname grow', onclick: () => this.openCard(f.id) }, h('b', { text: f.name })), h('button', { class: 'chip sm primary', onclick: () => Social.accept(f.id) }, I18n.s("u_329fcec61856")), h('button', { class: 'chip sm', onclick: () => Social.remove(f.id) }, I18n.s("u_0f7e826a2f9f")))));
      out.push(h('div', { class: 'sub', text: I18n.s("u_771e8cc0f81e", [oks.length, SOCIAL.maxFriends]) }));
      if (Social.loading.friends && !Social.friends.length) out.push(h('p', { class: 'hint', text: I18n.s("u_f92612d11856") }));
      else if (!oks.length) out.push(h('p', { class: 'hint', text: I18n.s("u_8f448ea6e65f") }));
      out.push(h('div', { class: 'scroll frlist' }, ...oks.map(f => { const p = Social.cards[f.id] || {};
        return h('div', { class: 'frrow' }, this.avaPic(p.ava, 32), h('button', { class: 'frname grow', onclick: () => this.openCard(f.id) }, h('b', { text: p.name || f.name }), h('span', { class: 'hint', text: p.lvl ? I18n.s("u_936dd9cc315f", [p.lvl, (p.pets || []).length]) : '' }), p.status ? h('span', { class: 'hint frst', 'data-i18n-skip':true, text: p.status }) : null),
          h('button', { class: 'chip sm primary', onclick: () => Social.visit(f.id) }, I18n.s("u_a55baf30c49a")), h('button', { class: 'chip sm', 'aria-label': I18n.s("u_cfdd3c6dcb89"), onclick: () => Social.remove(f.id, true) }, ico('i_trash', 14))); }),
        ...outs.map(f => h('div', { class: 'frrow' }, h('button', { class: 'frname grow', onclick: () => this.openCard(f.id) }, h('b', { text: f.name }), h('span', { class: 'hint', text: I18n.s("u_38410dba2678") })), h('button', { class: 'chip sm', onclick: () => Social.remove(f.id) }, I18n.s("u_2cd0f3be8738"))))));
      out.push(h('div', { class: 'row' }, h('button', { class: 'chip sm', onclick: () => Social.loadFriends(true) }, ico('i_reset', 14), I18n.s("u_5f451c71b46a"))));
    } else if (tab === 'board') {
      const bt = this.boardTab, wk = boardWeek(), B = Social.board && Social.board.rows && Social.board.rows[bt + ':' + (bt === 'week' ? wk : '')];
      out.push(h('div', { class: 'tabs wrap' }, ...Social.BOARDS.map(([id, l]) => h('button', { class: 'tab sm' + (bt === id ? ' on' : ''), onclick: () => { this.boardTab = id; Social.loadBoard(id); this.refresh('friends'); } }, l))));
      if (bt === 'week') { const fmtD = (d) => `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`; out.push(h('p', { class: 'hint', text: I18n.s("u_e729c87e867d", [fmtD(weekStart()), fmtD(weekEnd())]) })); }
      if (!B) { out.push(h('p', { class: 'hint', text: Social.loading.board ? I18n.s("u_f92612d11856") : I18n.s("u_1cd284b0ca02") })); if (!Social.loading.board) setTimeout(() => Social.loadBoard(bt), 0); return out; }
      const val = (r) => bt === 'lvl' ? `Lv ${r.lvl}` : bt === 'coins' ? r.coins.toLocaleString() + I18n.s("u_35074813fa04") : bt === 'week' ? fmtMins(r.week) : fmtMins(r.tm);
      out.push(h('p', { class: 'hint', text: I18n.s("u_ed8e3424d562", [SOCIAL.boardTop, bt === 'coins' ? I18n.s("u_cc6d0acb7553") : '', new Date(B.at).toLocaleTimeString(I18n.lang, { hour: '2-digit', minute: '2-digit', hour12: false })]) }));
      out.push(h('div', { class: 'scroll' }, h('ol', { class: 'board' }, ...B.list.map((r, i) => h('li', { class: r.id === Social.uid ? 'me' : '' },
        h('button', { class: 'brow', onclick: () => this.openCard(r.id) }, h('span', { class: 'brank num', text: String(i + 1) }), this.avaPic(r.ava, 32), h('span', { class: 'bname grow', text: r.name }), h('span', { class: 'bval num', text: val(r) })))))));
      if (!B.list.some(r => r.id === Social.uid)) out.push(h('p', { class: 'hint', text: I18n.s("u_36c2aff9765f") }));
      out.push(h('div', { class: 'row' }, h('button', { class: 'chip sm', disabled: Date.now() - B.at < 60000, onclick: () => Social.loadBoard(bt, true) }, ico('i_reset', 14), I18n.s("u_358a13c304aa"))));
    } else {
      const G = Z.guest || [];
      out.push(h('p', { class: 'hint', text: I18n.s("u_c7cffaac75ba", [SOCIAL.guestMax]) }));
      if (!G.length) out.push(h('div', { class: 'empty' }, ico('i_book', 40), h('p', { text: I18n.s("u_a84aec8ac1d1") })));
      out.push(h('div', { class: 'scroll frlist' }, ...G.map(g => h('div', { class: 'frrow' + (g.read ? '' : ' unread') },
        h('span', { class: 'hint', text: new Date(g.at).toLocaleString(I18n.lang, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) }),
        h('button', { class: 'frname grow', onclick: () => { g.read = true; Game.save(); this.openCard(g.uid); } }, h('b', { text: g.name }), ' ' + g.what),
        g.back ? h('span', { class: 'hint', text: I18n.s("u_f8a14296898d") }) : null,
        Social.rel(g.uid) === 'ok' ? h('button', { class: 'chip sm', onclick: () => { g.read = true; Social.visit(g.uid); } }, I18n.s("u_4026c80c02d8")) : null))));
      if (G.some(g => !g.read)) out.push(h('div', { class: 'row' }, h('button', { class: 'chip sm', onclick: () => { for (const g of G) g.read = true; Z.marks = []; Game.save(); this.refresh('friends'); } }, I18n.s("u_e7f8161ac2c9"))));
    }
    return out;
  },
  w_visit() {
    const V = Social.visitSt; if (!V) return [];
    const head = h('div', { class: 'row between' }, h('button', { class: 'frname', onclick: () => this.openCard(V.fid) }, h('b', { text: I18n.s("u_c837a218f56d", [V.name]) })), h('span', { class: 'hint', text: V.at ? I18n.s("u_a1dfe092005d") + agoText(V.at) : '' }));
    if (V.loading) return [head, h('p', { class: 'hint center', text: I18n.s("u_cca8465c76fd") })];
    if (V.err) return [head, h('p', { class: 'hint warn', text: I18n.s("u_1e5d9d1f7560") + V.err })];
    if (V.empty) return [head, h('p', { class: 'hint', text: I18n.s("u_84b978979757", [V.name]) })];
    const d = V.d;
    // pets that know you (5+ times cared for) come over to the front
    const known = [];
    const pets = d.pets.map(p => { if ((p.fam || []).includes(Social.uid) && !p.sleep) { known.push(p.name); return Object.assign({}, p, { x: 120 + (known.length - 1) * 22 - 10, y: 166, flip: false }); } return p; });
    const big = roomCanvas(d, 3, { pets, ava: d.ava });
    const marks = d.needs.map(n => {
      let x = 120, y = 120;
      const pp = n.pet != null ? pets.find(q => q.id === n.pet) : null;
      if (n.pet != null) { if (!pp) return null; x = pp.x; y = pp.y - 22; }
      else { const it = d.items.find(i => i.uid === n.target); if (!it || !ITEMS[it.k]) return null; const ic = Room.itemCanvas(it); x = it.x + ic.width / 2; y = it.y - 6; }
      const kind = NEED_HELP[n.type], k = HELP_KINDS[kind], done = Social.Z.helped[V.fid + ':' + n.k] && Social.Z.hd === Life.today();
      return h('button', { class: 'vmark' + (done ? ' done' : ''), style: `left:${(x / RW * 100).toFixed(2)}%;top:${(Math.max(4, y) / RH * 100).toFixed(2)}%`, title: k.n, disabled: !!done, onclick: () => Social.help(V.fid, n) }, ico(k.icon, 26), h('span', { text: done ? I18n.s("u_e3a22a658423") : k.n }));
    }).filter(Boolean);
    const hearts = known.map((nm, i) => h('div', { class: 'vheart', style: `left:${((110 + i * 22) / RW * 100).toFixed(2)}%;top:${(150 / RH * 100).toFixed(2)}%` }, ico('i_heart', 20)));
    const left = SOCIAL.helpsPerDay - Social.helpsToday();
    return [head, h('div', { class: 'visit-stage' }, big, ...marks, ...hearts),
      known.length ? h('p', { class: 'hint', text: I18n.s("u_c1e28c62b516", [known.join('、')]) }) : null,
      h('p', { class: 'hint', text: marks.length ? (left > 0 ? I18n.s("u_0e90e1fdf975", [left]) + (Social.freeLeft() ? I18n.s("u_1658c00adaa7") : I18n.s("u_ce676438883b")) : I18n.s("u_0a0691f17c7b")) + I18n.s("u_809c6c48ce98") : I18n.s("u_dad93047bdc7", [V.name]) }),
      h('div', { class: 'row center' }, h('button', { class: 'chip', onclick: () => Social.visit(V.fid) }, ico('i_reset', 16), I18n.s("u_5f451c71b46a")), h('button', { class: 'chip primary', onclick: () => this.closeWin('visit') }, I18n.s("u_9a6ce4cf2cab")))];
  },
});
