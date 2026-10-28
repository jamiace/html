/* ============================================================
   Daily and weekly team tasks (web build with Firebase)
   - daily teams: 1-3 people, weekly teams: 1-5; separate teams, a player can be in
     one daily and one weekly team at the same time
   - everyone gets the same task for the day / week (same total, whatever the team size)
   - starting a team opens a 5-minute lobby: invite friends (any friend, even one who is
     already in another team) or press "match now"; when the 5 minutes are up and the team
     is still not full, the game opens it for matching automatically (strangers who match
     can join). A solo player with no contribution yet is moved into an open team instead.
   - when the team reaches the goal the member list is fixed, and every member on
     it gets the full reward, even with zero contribution; each claims on their own
   - leaving is allowed before the goal is reached; your contribution leaves with you, and
     you can start / match / be invited into another team (or back into the same one)
   - rewards can be claimed until 7 days after the period ends

   Firestore (rules in firestore.rules):
     teams/{id}                  { type 'd'|'w', period, task, goal, max, members[], names{}, prog{uid: n},
                                   open, full, mAt (auto-match time in ms, 0 = no countdown),
                                   doneAt (0 until done), roster[], by, at }
     teams/{id}/claims/{uid}     one per member, created once -> a reward can't be claimed twice
     tm/{uid}                    { d: { p, id, left }, w: { p, id, left } } which team you are in
     tinv/{uid}/list/{teamId}    invitations from friends
   Progress is written as "my total so far" (not +n), so a retried write never counts twice.
   Budget: own progress at most every 5 min (right away when it may finish the task),
   the team is read when the team tab is open (at most every 30 s, every 20 s while
   waiting for teammates) and every 10 min otherwise.
   ============================================================ */
const TEAM_TYPES = {
  d: { n: I18n.s("u_fd7b67c923cd"), max: 3, reward: { c: 80, x: 30 } },
  w: { n: I18n.s("u_a8a3dfb18c80"), max: 5, reward: { c: 400, x: 0, coupon: 1 } },
};
// goals: daily = base x 1.5, weekly = base x 1.2
const TEAM_TASKS = {
  focus: { n: I18n.s("u_52072ff89466"), unit: I18n.s("u_c26fddc50167"), ev: ['focusMin'], d: 90, w: 720, how: I18n.s("u_b03dee0ec5b9"), icon: 'i_tomato' },
  quiz: { n: I18n.s("u_fa9b8a79e93f"), unit: I18n.s("u_feb074cc340e"), ev: ['quizRight'], d: 45, w: 216, how: I18n.s("u_d5b04b63fc51"), icon: 'i_learn' },
  care: { n: I18n.s("u_766a8fdcb3bc"), unit: I18n.s("u_172fb7e67b9b"), ev: ['feed', 'play', 'groom', 'care', 'train'], d: 15, w: 72, how: I18n.s("u_92f6b6b2756f"), icon: 'i_paw' },
  // English challenge: spelling and listening questions answered right anywhere (daily words, practice, challenges, training)
  eng: { n: I18n.s("u_34e4e7ec218a"), unit: I18n.s("u_feb074cc340e"), ev: ['engRight'], d: 30, w: 150, how: I18n.s("u_96c3e5399580"), icon: 'i_speaker' },
};
const TEAM_ORDER = ['focus', 'quiz', 'care', 'eng'];
const TEAM_CFG = { flushMs: 5 * 60e3, pollMs: 10 * 60e3, viewMs: 30e3, lobbyMs: 5 * 60e3, lobbyPollMs: 20e3, claimDays: 7, histMax: 12, matchTry: 10 };
// one colour per seat (join order), used for the stacked progress bar and the member cards
const TEAM_COLORS = ['#ef7b6c', '#f2b84b', '#5fbf8f', '#5aa2e0', '#a77bd6'];

SPR.def('i_crown', icon(g => { g.pts([[2, 4], [8, 2], [14, 4]], 'w'); for (const [x, y] of [[2, 5], [3, 6], [5, 7], [6, 6], [7, 4], [8, 3], [9, 4], [10, 6], [11, 7], [13, 6], [14, 5]]) g.px(x, y, 'w'); g.rect(2, 7, 13, 5, 'w'); g.rect(4, 6, 2, 1, 'w'); g.rect(11, 6, 2, 1, 'w'); g.hl(2, 11, 13, 'v'); g.hl(3, 8, 11, 'x'); g.pts([[5, 9], [8, 9], [11, 9]], 'r'); g.pts([[2, 4], [8, 2], [14, 4]], 'x'); }));

const teamErr = (code) => Object.assign(new Error(code), { code });

const Team = {
  teams: {}, loading: {}, busy: {}, invites: [], invAt: 0, err: '', sent: {}, invOpen: false,
  get T() { const S = Game.S; if (!S.team) S.team = {}; const T = S.team; if (!T.claims) T.claims = {}; if (!T.hist) T.hist = []; return T; },
  ready() { return typeof Social !== 'undefined' && Social.ready(); },
  db() { return Social.db(); },
  uid() { return Social.uid; },
  // ---------- schedule: same task for everybody ----------
  period(type) { return type === 'd' ? Life.today() : weekKey(); },
  index(type) { return type === 'd' ? Learn.dayNum() : Merchant.weekIndex(); },
  // the same for everybody on the same day / week: a fixed shuffle by date, never the same task twice in a row
  // every task once in each run of 4 periods, in a shuffled order
  task(type, i = this.index(type)) {
    const n = TEAM_ORDER.length, salt = type === 'w' ? 7 : 3;
    const perm = (b) => TEAM_ORDER.map((_, k) => k).sort((x, y) => hsh(b, x, salt) - hsh(b, y, salt) || x - y);
    const b = Math.floor(i / n), p = ((i % n) + n) % n, P = perm(b);
    if (P[0] === perm(b - 1)[n - 1]) P.push(P.shift());
    return TEAM_ORDER[P[p]];
  },
  goal(type, task) { return TEAM_TASKS[task || this.task(type)][type]; },
  end(type) {
    if (type === 'w') return weekEnd().getTime();
    const d = gameDate(); d.setHours(0, 0, 0, 0); return d.getTime() + 86400000 + DAY_START_HOUR * 3600e3 - (window.NOOK_DAY_SHIFT || 0) * 86400000;
  },
  key(type, p) { return type + ':' + p; },
  mine(type) { const st = this.T[type]; return st && st.p === this.period(type) ? st : null; },
  inTeam(type) { const st = this.mine(type); return st && st.id ? st : null; },
  // lobby -> countdown running; due -> countdown over, matching about to open; match -> open for matching;
  // friends -> matching turned off; full; done
  phase(tm) {
    if (!tm) return 'none';
    if (tm.doneAt) return 'done';
    if ((tm.members || []).length >= tm.max) return 'full';
    if (tm.open) return 'match';
    if (tm.mAt && Date.now() < tm.mAt) return 'lobby';
    if (tm.mAt) return 'due';
    return 'friends';
  },
  // my contribution, counting what is not uploaded yet
  contrib(tm, m) { const p = (tm.prog || {})[m] || 0, st = m === this.uid() ? this.inTeam(tm.type) : null; return st && st.id === tm.id ? Math.max(p, Math.floor(st.mine || 0)) : p; },
  total(tm) { return Object.values(tm.prog || {}).reduce((a, b) => a + (b || 0), 0); },
  shown(tm) { return (tm.doneAt ? tm.roster : tm.members) || []; },
  // ---------- counting what you do (only after joining, only for this period) ----------
  onTrack(ev, n) {
    for (const type of ['d', 'w']) {
      const st = this.inTeam(type); if (!st) continue;
      const def = TEAM_TASKS[st.task]; if (!def || !def.ev.includes(ev)) continue;
      st.mine = (st.mine || 0) + n; st.dirty = true;
      const tm = this.teams[st.id]; if (tm && !tm.doneAt && this.total(tm) - ((tm.prog || {})[this.uid()] || 0) + st.mine >= tm.goal) st.urgent = true;
    }
  },
  // ---------- background ----------
  tick() {
    if (!this.ready()) return;
    this.rollover();
    const now = Date.now();
    for (const type of ['d', 'w']) {
      const st = this.inTeam(type); if (!st) continue;
      if (st.dirty && (st.urgent || now - (st.sentAt || 0) > TEAM_CFG.flushMs)) this.flush(type).catch(() => { });
      else if (now - (st.readAt || 0) > TEAM_CFG.pollMs) this.load(type).catch(() => { });
    }
  },
  // every second: the lobby countdown, auto matching, and a closer look while waiting for teammates
  second() {
    if (!this.ready()) return;
    const now = Date.now();
    for (const type of ['d', 'w']) {
      const st = this.inTeam(type), tm = st && this.teams[st.id]; if (!tm) continue;
      const ph = this.phase(tm);
      if (ph === 'due' && !this.busy[type] && now - (st.autoErr || 0) > 30e3) this.autoMatch(type, false);
      const waiting = ph === 'lobby' || ph === 'match' || ph === 'due';
      if (waiting && UI.teamOpen(type) && now - (st.readAt || 0) > TEAM_CFG.lobbyPollMs && !this.loading['r' + type]) { this.loading['r' + type] = true; this.load(type).catch(() => { }).finally(() => { this.loading['r' + type] = false; }); }
    }
    UI.tickTeam();
  },
  // a new day / week: keep the old team for claiming
  rollover() {
    const T = this.T;
    for (const type of ['d', 'w']) {
      const st = T[type]; if (!st || st.p === this.period(type)) continue;
      if (st.id && !T.claims[this.key(type, st.p)]) { T.hist.unshift({ type, p: st.p, id: st.id, end: st.end || 0, task: st.task }); T.hist.length = Math.min(T.hist.length, TEAM_CFG.histMax); }
      T[type] = null;
    }
    const now = Date.now(); T.hist = T.hist.filter(h => !T.claims[this.key(h.type, h.p)] && (!h.end || now < h.end + TEAM_CFG.claimDays * 86400000));
  },
  async load(type, id) {
    const st = id ? null : this.inTeam(type); id = id || (st && st.id); if (!id) return null;
    const tm = await this.db().get('teams/' + id); if (tm) { tm.id = id; this.teams[id] = tm; this.wantCards(this.shown(tm)); }
    if (st) {
      st.readAt = Date.now(); if (tm && tm.doneAt) st.done = true;
      // removed from the team on another device
      if (tm && !(tm.members || []).includes(this.uid()) && !(tm.roster || []).includes(this.uid())) { st.id = ''; st.left = true; st.mine = 0; Game.save(); }
    }
    UI.refresh('tasks'); UI.badges(); return tm;
  },
  // name cards (avatars) of teammates, also strangers from matching; cached 3 h by Social
  wantCards(list) {
    for (const m of list || []) {
      if (m === this.uid() || Social.cards[m] || this.loading['c' + m]) continue;
      this.loading['c' + m] = true; Social.getCard(m).then(c => { if (c) UI.refresh('tasks'); }).catch(() => { }).finally(() => { setTimeout(() => { delete this.loading['c' + m]; }, 600e3); });
    }
  },
  async flush(type) {
    const st = this.inTeam(type); if (!st || !st.dirty) return;
    const uid = this.uid(), n = Math.floor(st.mine || 0);
    try { await this.db().update('teams/' + st.id, { ['prog.' + uid]: n, at: '__now__' }); }
    catch (e) {
      // refused: most likely this account left or switched team on another device; read the team again so this device finds out
      if (e && e.code === 'permission-denied') { st.urgent = false; st.sentAt = Date.now(); if (await Cloud.checkSession(0)) await this.load(type).catch(() => { }); }
      throw e;
    }
    st.dirty = false; st.urgent = false; st.sentAt = Date.now(); Game.save();
    const tm = await this.load(type);
    if (tm && !tm.doneAt && this.total(tm) >= tm.goal) await this.complete(type).catch(() => { });
  },
  // the first member who sees the goal reached fixes the member list
  async complete(type) {
    const st = this.inTeam(type); if (!st) return;
    const path = 'teams/' + st.id;
    await this.db().tx(async (t) => {
      const tm = await t.get(path); if (!tm || tm.doneAt || this.total(tm) < tm.goal) return;
      t.update(path, { doneAt: '__now__', roster: tm.members, open: false, full: true, at: '__now__' });
    });
    await this.load(type);
    UI.toast(I18n.s("u_6029b37ebdce", [TEAM_TYPES[type].n]), 'i_people', 4.5, { label: I18n.s("u_92edf81e0715"), fn: () => UI.openTasks('team') });
  },
  // ---------- starting / joining ----------
  newTeam(type, match) {
    const task = this.task(type), uid = this.uid();
    return { type, period: this.period(type), task, goal: this.goal(type, task), max: TEAM_TYPES[type].max, members: [uid], names: { [uid]: Social.myName() }, prog: { [uid]: 0 },
      open: !!match, full: TEAM_TYPES[type].max <= 1, mAt: match ? 0 : Date.now() + TEAM_CFG.lobbyMs, doneAt: 0, roster: [], by: uid, at: '__now__' };
  },
  mark(type, id, task) { this.T[type] = { p: this.period(type), id, task, mine: 0, end: this.end(type), joinedAt: Date.now() }; this.invOpen = false; Game.save(); saveSoon(); },
  // open teams of this period that still have room, the fullest first
  async candidates(type) {
    const uid = this.uid();
    const rows = await this.db().query('teams', [['type', '==', type], ['period', '==', this.period(type)], ['open', '==', true], ['full', '==', false]], TEAM_CFG.matchTry);
    return rows.filter(c => !c.doneAt && !(c.members || []).includes(uid) && (c.members || []).length < (c.max || 1)).sort((a, b) => (b.members || []).length - (a.members || []).length);
  },
  async start(type, match) {
    if (!this.ready() || this.busy[type]) return;
    if (this.inTeam(type)) return UI.toast(I18n.s("u_034ad97c2334"), 'i_people');
    this.busy[type] = true; UI.refresh('tasks');
    try {
      if (match) {
        for (const c of await this.candidates(type)) if (await this.join(type, c.id, false, true)) { UI.toast(I18n.s("u_d68864217f1b", [(c.members || []).length + 1]), 'i_people', 3.5); return; }
      }
      const id = this.db().newId('teams'), tm = this.newTeam(type, match), uid = this.uid();
      await this.db().tx(async (t) => {
        const mem = await t.get('tm/' + uid), cur = mem && mem[type];
        if (cur && cur.p === tm.period && cur.id) throw teamErr('already');
        t.set('teams/' + id, tm); t.set('tm/' + uid, Object.assign({}, mem || {}, { [type]: { p: tm.period, id }, at: '__now__' }));
      });
      this.mark(type, id, tm.task); await this.load(type);
      UI.toast(match ? I18n.s("u_52b1a5769629") : I18n.s("u_219ea6b87736"), 'i_people', 4);
    } catch (e) { UI.toast(e && e.code === 'already' ? I18n.s("u_00249180907b") : I18n.s("u_254ef5647b25") + cloudErr(e), 'i_people', 4); }
    finally { this.busy[type] = false; UI.refresh('tasks'); }
  },
  leaveData(tm, uid) {
    const members = (tm.members || []).filter(m => m !== uid), names = Object.assign({}, tm.names), prog = Object.assign({}, tm.prog); delete names[uid]; delete prog[uid];
    return { members, names, prog, full: false, open: members.length ? !!tm.open : false, at: '__now__' };
  },
  // join a team (matching or an invitation); if you are in another team you move out of it in the same step.
  // returns true when it worked
  async join(type, id, invite, quiet) {
    const uid = this.uid(), period = this.period(type), cur = this.inTeam(type), fromId = cur ? cur.id : '';
    if (fromId === id) return true;
    try {
      let task = null;
      await this.db().tx(async (t) => {
        const tm = await t.get('teams/' + id), mem = await t.get('tm/' + uid), from = fromId ? await t.get('teams/' + fromId) : null, c = mem && mem[type];
        if (c && c.p === period && c.id && c.id !== fromId) throw teamErr('already');
        if (!tm || tm.type !== type || tm.period !== period) throw teamErr('gone');
        if (tm.doneAt) throw teamErr('done');
        if ((tm.members || []).includes(uid)) throw teamErr('member');
        if ((tm.members || []).length >= tm.max) throw teamErr('full');
        if (!tm.open && !invite) throw teamErr('closed');
        if (from && (from.members || []).includes(uid)) { if (from.doneAt) throw teamErr('fromDone'); t.update('teams/' + fromId, this.leaveData(from, uid)); }
        const members = [...tm.members, uid];
        task = tm.task;
        t.update('teams/' + id, { members, names: Object.assign({}, tm.names, { [uid]: Social.myName() }), prog: Object.assign({}, tm.prog, { [uid]: 0 }), full: members.length >= tm.max, at: '__now__' });
        t.set('tm/' + uid, Object.assign({}, mem || {}, { [type]: { p: period, id }, at: '__now__' }));
      });
      if (fromId) delete this.teams[fromId];
      this.mark(type, id, task); await this.load(type); return true;
    } catch (e) {
      if (!quiet) UI.toast({ already: I18n.s("u_00249180907b"), gone: I18n.s("u_8a62443d08fc"), done: I18n.s("u_8ac03649bf71"), full: I18n.s("u_d31afcf6aa0c"), closed: I18n.s("u_84905a944c7b"), member: I18n.s("u_c5cdfd49c32b"), fromDone: I18n.s("u_55ce0d5953db") }[e && e.code] || I18n.s("u_cccecceb603c") + cloudErr(e), 'i_people', 3.5);
      return false;
    }
  },
  async leave(type, opts = {}) {
    const st = this.inTeam(type); if (!st) return false;
    if (!opts.noAsk && !confirm(I18n.s("u_71d702343410"))) return false;
    const uid = this.uid(), path = 'teams/' + st.id;
    try {
      await this.db().tx(async (t) => {
        const tm = await t.get(path), mem = await t.get('tm/' + uid);
        if (tm && tm.doneAt) throw teamErr('done');
        if (tm && (tm.members || []).includes(uid)) t.update(path, this.leaveData(tm, uid));
        t.set('tm/' + uid, Object.assign({}, mem || {}, { [type]: { p: st.p, id: '', left: true }, at: '__now__' }));
      });
      delete this.teams[st.id]; st.left = true; st.id = ''; st.mine = 0; st.dirty = false; st.urgent = false; Game.save(); saveSoon();
      UI.toast(I18n.s("u_09272255d07a"), 'i_people', 3.5);
      UI.refresh('tasks'); return true;
    } catch (e) { UI.toast(e && e.code === 'done' ? I18n.s("u_ac7a8f48a676") : I18n.s("u_0ae08299a97f") + cloudErr(e), 'i_people', 3.5); UI.refresh('tasks'); return false; }
  },
  // matching on / off (also ends the lobby countdown)
  async setOpen(type, open) {
    const st = this.inTeam(type); if (!st || this.busy[type]) return;
    if (open) return this.autoMatch(type, true);
    this.busy[type] = true; UI.refresh('tasks');
    try { await this.db().update('teams/' + st.id, { open: false, mAt: 0, at: '__now__' }); await this.load(type); UI.toast(I18n.s("u_146424d5936c"), 'i_people', 3); }
    catch (e) { UI.toast(I18n.s("u_691a1fc64e58") + cloudErr(e), 'i_people', 3.5); }
    finally { this.busy[type] = false; UI.refresh('tasks'); }
  },
  // countdown over (or "match now"): a solo player with no contribution yet hops into an open team;
  // otherwise the team opens for matching so other players can join
  async autoMatch(type, manual) {
    const st = this.inTeam(type); if (!st || this.busy[type]) return;
    this.busy[type] = true; UI.refresh('tasks');
    try {
      const tm = await this.load(type); if (!tm || tm.doneAt || (tm.members || []).length >= tm.max || !this.inTeam(type)) return;
      if (!manual && (tm.open || !tm.mAt || Date.now() < tm.mAt)) return;   // a teammate already did it, or turned matching off
      const uid = this.uid(), solo = tm.members.length === 1 && !((tm.prog || {})[uid] > 0) && !(st.mine > 0);
      if (solo) {
        for (const c of (await this.candidates(type)).filter(c => c.id !== st.id)) if (await this.join(type, c.id, false, true)) { UI.toast(I18n.s("u_ad29cb54cee2", [(c.members || []).length + 1]), 'i_people', 3.5); return; }
      }
      await this.db().update('teams/' + st.id, { open: true, mAt: 0, at: '__now__' }); await this.load(type);
      UI.toast(manual ? I18n.s("u_3c4b9b0415ef") : I18n.s("u_8584a1f4607f"), 'i_people', 3.5);
    } catch (e) { st.autoErr = Date.now(); if (manual) UI.toast(I18n.s("u_d20ad1c3f31e") + cloudErr(e), 'i_people', 3.5); }
    finally { this.busy[type] = false; UI.refresh('tasks'); }
  },
  // ---------- invitations: any friend can invite you, even when you are already in a team ----------
  async invite(type, fid) {
    const st = this.inTeam(type), tm = st && this.teams[st.id]; if (!tm) return;
    const nm = Social.friendName(fid), k = st.id + ':' + fid;
    if (tm.doneAt) return UI.toast(I18n.s("u_06ffc25471ba"), 'i_people');
    if ((tm.members || []).includes(fid)) return UI.toast(I18n.s("u_e482651b0bf3", [nm]), 'i_people');
    if ((tm.members || []).length >= tm.max) return UI.toast(I18n.s("u_113016eb230b"), 'i_people');
    if (this.sent[k]) return UI.toast(I18n.s("u_72f6de3b2251", [nm]), 'i_people');
    this.sent[k] = Date.now(); UI.refresh('tasks');
    try {
      let note = '';
      const mem = await this.db().get('tm/' + fid).catch(() => null), cur = mem && mem[type];
      if (cur && cur.p === tm.period && cur.id) {
        const other = await this.db().get('teams/' + cur.id).catch(() => null);
        if (other && other.doneAt) { delete this.sent[k]; UI.refresh('tasks'); return UI.toast(I18n.s("u_e85afe078b7d", [nm]), 'i_people', 3.5); }
        if (other) note = I18n.s("u_8a12c1b8ff20");
      }
      await this.db().set(`tinv/${fid}/list/${st.id}`, { from: this.uid(), name: Social.myName(), type, period: tm.period, task: tm.task, at: '__now__' });
      UI.toast(I18n.s("u_f3ecca6bb33d", [nm, note]), 'i_people', 4);
    } catch (e) { delete this.sent[k]; UI.toast(I18n.s("u_d3b3c1389b6c") + cloudErr(e), 'i_people', 3.5); }
    UI.refresh('tasks');
  },
  async loadInvites(force) {
    if (!this.ready() || (!force && Date.now() - this.invAt < TEAM_CFG.viewMs)) return;
    this.invAt = Date.now();
    try {
      const rows = await this.db().list(`tinv/${this.uid()}/list`, 30), me = this.uid();
      const stale = (r) => r.period !== this.period(r.type) || (this.inTeam(r.type) && this.inTeam(r.type).id === r.id);
      this.invites = rows.filter(r => !stale(r) && r.from !== me);
      for (const r of rows.filter(stale)) this.db().del(`tinv/${me}/list/${r.id}`).catch(() => { });
    } catch (e) { this.err = cloudErr(e); }
    UI.refresh('tasks'); UI.badges();
  },
  async acceptInvite(inv) {
    const cur = this.inTeam(inv.type);
    if (cur && cur.id === inv.id) return this.declineInvite(inv);
    if (cur) {
      const tm = this.teams[cur.id];
      if (tm && tm.doneAt) return UI.toast(I18n.s("u_3a301fd782dd"), 'i_people', 3.5);
      if (!confirm(I18n.s("u_1f331e58bd9d", [inv.name]))) return;
    }
    if (await this.join(inv.type, inv.id, true)) UI.toast(I18n.s("u_823a68eeb386", [inv.name]), 'i_people', 3);
    this.db().del(`tinv/${this.uid()}/list/${inv.id}`).catch(() => { }); this.invites = this.invites.filter(x => x !== inv); UI.refresh('tasks'); UI.badges();
  },
  async declineInvite(inv) { this.db().del(`tinv/${this.uid()}/list/${inv.id}`).catch(() => { }); this.invites = this.invites.filter(x => x !== inv); UI.refresh('tasks'); UI.badges(); },
  // ---------- rewards ----------
  canClaim(tm, type, p) { const uid = this.uid(); return !!tm && !!tm.doneAt && (tm.roster || []).includes(uid) && !this.T.claims[this.key(type, p)]; },
  claimableN() {
    let n = 0; for (const type of ['d', 'w']) { const st = this.inTeam(type); if (st && this.canClaim(this.teams[st.id], type, st.p)) n++; }
    for (const h of this.T.hist) if (this.canClaim(this.teams[h.id], h.type, h.p)) n++;
    return n;
  },
  async claim(type, p, id) {
    const T = this.T, k = this.key(type, p); if (T.claims[k]) return;
    const tm = this.teams[id] || await this.load(type, id); if (!this.canClaim(tm, type, p)) return UI.toast(I18n.s("u_c792faad0197"), 'i_people', 3);
    const end = p === this.period(type) ? this.end(type) : ((T.hist.find(h => h.id === id) || {}).end || this.end(type));
    if (p !== this.period(type) && Date.now() > end + TEAM_CFG.claimDays * 86400000) return UI.toast(I18n.s("u_516b8748b726"), 'i_people', 3);
    try { await this.db().set(`teams/${id}/claims/${this.uid()}`, { at: '__now__' }); }
    catch (e) {
      if (e && e.code === 'permission-denied') { T.claims[k] = true; Game.save(); UI.refresh('tasks'); return UI.toast(I18n.s("u_430e25858e10"), 'i_people', 3); }
      return UI.toast(I18n.s("u_4a29c3401d2c") + cloudErr(e), 'i_people', 3.5);
    }
    T.claims[k] = true; T.hist = T.hist.filter(h => this.key(h.type, h.p) !== k);
    const R = TEAM_TYPES[type].reward; Game.reward(R.c, R.x, 'raw');   // raw: every member gets exactly the same, no comfort bonus
    let msg = I18n.s("u_7de32986abb6", [TEAM_TYPES[type].n, R.c]) + (R.x ? I18n.s("u_cd0c52b40907", [R.x]) : '');
    if (R.coupon) { const c = Rewards.addCoupon(Rewards.rollCoupon()); msg += I18n.s("u_b2d92eb5c67c", [Rewards.couponName(c)]); }
    UI.toast(msg, 'i_people', 4); UI.hud(true); UI.badges(); Game.save(); saveSoon(); UI.refresh('tasks');
  },
};
setInterval(() => { try { Team.second(); } catch (e) { console.warn('[team]', e); } }, 1000);

/* ---------------- team tab in the tasks window ---------------- */
Object.assign(UI, {
  teamType: 'd',
  teamOpen(type) { const w = this.wins.tasks; return !!w && !w.el.hidden && this.tasksTab === 'team' && (!type || this.teamType === type); },
  // live countdown without re-rendering the whole window
  tickTeam() {
    const el = this.el && this.el.tmClock; if (!el || !el.isConnected || !this.teamOpen()) return;
    const st = Team.inTeam(this.teamType), tm = st && Team.teams[st.id];
    if (!tm || Team.phase(tm) !== 'lobby') { this.el.tmClock = null; this.refresh('tasks'); return; }
    const left = Math.max(0, (tm.mAt - Date.now()) / 1000); el.textContent = fmt(left);
    if (this.el.tmCd) this.el.tmCd.style.width = Math.max(0, Math.min(100, left / (TEAM_CFG.lobbyMs / 1000) * 100)).toFixed(1) + '%';
  },
  teamAva(m, size) { if (m === Team.uid()) return this.avaPic(Game.S.avatar, size); const c = Social.cards[m]; return c ? this.avaPic(c.ava, size) : h('span', { class: 'tmava-ph', style: `width:${size}px;height:${size}px` }, ico('i_people', Math.round(size * 0.6))); },
  // stacked bar: one coloured segment per member, all adding up to the team total
  teamBar(tm, list, def) {
    const vals = list.map(m => Team.contrib(tm, m)), sum = vals.reduce((a, b) => a + b, 0), scale = Math.max(tm.goal, sum);
    const segs = list.map((m, i) => vals[i] > 0 ? h('i', { class: 'tmseg', style: `width:${(vals[i] / scale * 100).toFixed(2)}%;--c:${TEAM_COLORS[i % 5]}`, title: `${(tm.names || {})[m] || I18n.s("u_ddaa9505f101")}：${vals[i]} ${def.unit}` }) : null);
    const pct = Math.min(100, Math.floor(sum / tm.goal * 100));
    return h('div', { class: 'tmprog2' },
      h('div', { class: 'tmbar' + (tm.doneAt ? ' done' : '') }, h('div', { class: 'tmbar-in' }, ...segs), h('span', { class: 'tmbar-pct num', text: pct + '%' })),
      h('div', { class: 'tmbar-meta' }, h('b', { class: 'num', text: `${Math.min(sum, tm.goal)} / ${tm.goal}` }), h('span', { class: 'hint', text: def.unit }), h('span', { class: 'grow' }),
        h('span', { class: 'hint', text: sum >= tm.goal ? I18n.s("u_afd9a461dae6") : I18n.s("u_cd0dce4fd89f", [tm.goal - sum, def.unit]) })));
  },
  teamSeats(tm, list, def, canInvite) {
    const vals = list.map(m => Team.contrib(tm, m)), sum = vals.reduce((a, b) => a + b, 0), best = Math.max(0, ...vals), uid = Team.uid();
    const seats = list.map((m, i) => {
      const v = vals[i], share = sum ? Math.round(v / sum * 100) : 0, col = TEAM_COLORS[i % 5];
      return h('button', { class: 'tmseat' + (m === uid ? ' me' : ''), style: `--c:${col}`, title: I18n.s("u_6b6387b457a6"), onclick: () => this.openCard(m) },
        h('span', { class: 'tmava' }, this.teamAva(m, 40), v > 0 && v === best ? h('span', { class: 'tmcrown', title: I18n.s("u_cffd41f6daf0") }, ico('i_crown', 20)) : null),
        h('b', { class: 'tmname', text: m === uid ? I18n.s("u_a0c7716669b5") : clipName((tm.names || {})[m]) || I18n.s("u_ddaa9505f101") }),
        h('span', { class: 'tmval' }, h('b', { class: 'num', text: String(v) }), h('small', { text: def.unit })),
        h('span', { class: 'tmshare' }, h('i', { style: `width:${share}%` })),
        h('small', { class: 'hint num', text: share + '%' }));
    });
    for (let i = list.length; i < tm.max; i++) seats.push(canInvite ? h('button', { class: 'tmseat vacant', style: `--c:${TEAM_COLORS[i % 5]}`, onclick: () => { Team.invOpen = true; this.refresh('tasks'); } }, h('span', { class: 'tmava' }, ico('i_plus', 22)), h('b', { class: 'tmname', text: I18n.s("u_dc4641eaff7d") }), h('small', { class: 'hint', text: I18n.s("u_cf7d9d72d709") }))
      : h('div', { class: 'tmseat vacant off', style: `--c:${TEAM_COLORS[i % 5]}` }, h('span', { class: 'tmava' }), h('b', { class: 'tmname', text: I18n.s("u_dc4641eaff7d") })));
    return h('div', { class: 'tmseats n' + tm.max }, ...seats);
  },
  teamInvitePanel(type, tm) {
    const friends = Social.okFriends();
    const head = h('div', { class: 'row between' }, h('span', { class: 'sub', text: I18n.s("u_0f23e8e5484a", [tm.max - tm.members.length]) }), h('button', { class: 'chip sm', onclick: () => { Team.invOpen = false; this.refresh('tasks'); } }, I18n.s("u_afd4b783536b")));
    if (!friends.length) return h('div', { class: 'tminv' }, head, h('p', { class: 'hint', text: I18n.s("u_33e0328d8003") }), h('button', { class: 'chip sm', onclick: () => this.openFriends('friends') }, ico('i_people', 16), I18n.s("u_634cee5e5e0e")));
    return h('div', { class: 'tminv' }, head, h('div', { class: 'tminv-list' }, ...friends.map(f => {
      const inTeam = tm.members.includes(f.id), sent = Team.sent[tm.id + ':' + f.id], p = Social.cards[f.id] || {};
      return h('div', { class: 'frrow' }, this.avaPic(p.ava, 28), h('span', { class: 'grow', text: Social.friendName(f.id) }),
        inTeam ? h('span', { class: 'ptag', text: I18n.s("u_4d0e7ef6e8ff") }) : sent ? h('span', { class: 'ptag', text: I18n.s("u_68e5b18fa592") }) : h('button', { class: 'chip sm primary', onclick: () => Team.invite(type, f.id) }, I18n.s("u_888d186ddebb")));
    })), h('p', { class: 'hint', text: I18n.s("u_8d3bb2bfb197") }));
  },
  teamPhase(type, st, tm) {
    const ph = Team.phase(tm), busy = !!Team.busy[type], room = tm.max - tm.members.length;
    const inviteBtn = h('button', { class: 'chip', disabled: busy, onclick: () => { Team.invOpen = !Team.invOpen; this.refresh('tasks'); } }, ico('i_people', 18), I18n.s("u_cf7d9d72d709"));
    if (ph === 'lobby') {
      const left = Math.max(0, (tm.mAt - Date.now()) / 1000);
      this.el.tmClock = h('b', { class: 'tmclock num', text: fmt(left) });
      this.el.tmCd = h('i', { style: `width:${(left / (TEAM_CFG.lobbyMs / 1000) * 100).toFixed(1)}%` });
      return h('div', { class: 'tmphase lobby' },
        h('div', { class: 'tmph-row' }, h('div', { class: 'grow' }, h('b', { class: 'tmph-t', text: I18n.s("u_8edeadb32b2e") }), h('p', { class: 'hint', text: I18n.s("u_d0edc123e82c", [room]) })), this.el.tmClock),
        h('div', { class: 'tmcd' }, this.el.tmCd),
        h('div', { class: 'row wrap' }, inviteBtn, h('button', { class: 'chip primary', disabled: busy, onclick: () => Team.autoMatch(type, true) }, ico('i_sparkle', 18), busy ? I18n.s("u_e017de404036") : I18n.s("u_451868e0ce6b")),
          h('span', { class: 'grow' }), h('button', { class: 'chip sm', disabled: busy, title: I18n.s("u_6677f573e53b"), onclick: () => Team.setOpen(type, false) }, I18n.s("u_366ef51bc69a"))));
    }
    if (ph === 'due') return h('div', { class: 'tmphase match' }, h('div', { class: 'tmph-row' }, h('div', { class: 'grow' }, h('b', { class: 'tmph-t' }, I18n.s("u_a314e8f8bc68"), h('span', { class: 'dots' })), h('p', { class: 'hint', text: I18n.s("u_e5933db957a5") })), ico('i_sparkle', 32, 'ico tmspin')), h('div', { class: 'row wrap' }, inviteBtn));
    if (ph === 'match') return h('div', { class: 'tmphase match' },
      h('div', { class: 'tmph-row' }, h('div', { class: 'grow' }, h('b', { class: 'tmph-t' }, I18n.s("u_c8fdc8e18e74"), h('span', { class: 'dots' })), h('p', { class: 'hint', text: I18n.s("u_ec33347f90f9", [room]) })), ico('i_sparkle', 32, 'ico tmspin')),
      h('div', { class: 'row wrap' }, inviteBtn, h('span', { class: 'grow' }), h('button', { class: 'chip sm', disabled: busy, onclick: () => Team.setOpen(type, false) }, I18n.s("u_e95b7ed676bb"))));
    if (ph === 'friends') return h('div', { class: 'tmphase friends' },
      h('div', { class: 'tmph-row' }, h('div', { class: 'grow' }, h('b', { class: 'tmph-t', text: I18n.s("u_f026ebff0d99") }), h('p', { class: 'hint', text: I18n.s("u_547ebe07021e", [room]) }))),
      h('div', { class: 'row wrap' }, inviteBtn, h('button', { class: 'chip primary', disabled: busy, onclick: () => Team.autoMatch(type, true) }, ico('i_sparkle', 18), busy ? I18n.s("u_e017de404036") : I18n.s("u_0fd075792b55"))));
    if (ph === 'full') return h('div', { class: 'tmphase full' }, h('div', { class: 'tmph-row' }, ico('i_people', 32), h('div', { class: 'grow' }, h('b', { class: 'tmph-t', text: I18n.s("u_921c8ed596bb") }), h('p', { class: 'hint', text: I18n.s("u_ecb28d8d3e3b") }))));
    const can = Team.canClaim(tm, type, st.p), got = Team.T.claims[Team.key(type, st.p)];
    return h('div', { class: 'tmphase done' }, h('div', { class: 'tmph-row' }, ico('i_star', 32), h('div', { class: 'grow' }, h('b', { class: 'tmph-t', text: I18n.s("u_1bf6ac1b49eb") }), h('p', { class: 'hint', text: I18n.s("u_f25880c68245") })),
      can ? h('button', { class: 'chip primary', onclick: () => Team.claim(type, st.p, st.id) }, ico('i_gift', 18), I18n.s("u_ffdcd522f85e")) : h('span', { class: 'ptag', text: got ? I18n.s("u_792019f09d2e") : I18n.s("u_3feee0c96435") })));
  },
  w_team() {
    const out = [];
    if (!Team.ready()) return [h('div', { class: 'empty' }, ico('i_people', 40), h('p', { text: Social.enabled() ? I18n.s("u_8e0a02e2269e") : I18n.s("u_18f63d3a0dbe") }), Social.enabled() ? h('button', { class: 'chip primary', onclick: () => this.openWin('account') }, I18n.s("u_92fc480bee59")) : null)];
    Team.rollover(); Team.loadInvites();
    const type = this.teamType, st = Team.mine(type), cur = Team.inTeam(type), tm = cur ? Team.teams[cur.id] : null;
    this.el.tmClock = null;
    if (cur && (!tm || Date.now() - (cur.readAt || 0) > TEAM_CFG.viewMs) && !Team.loading['r' + type]) { Team.loading['r' + type] = true; Team.load(type).catch(() => { }).finally(() => { Team.loading['r' + type] = false; }); }
    const invN = (t) => Team.invites.filter(i => i.type === t).length;
    out.push(h('div', { class: 'tabs' }, ...['d', 'w'].map(t => h('button', { class: 'tab sm' + (type === t ? ' on' : ''), onclick: () => { this.teamType = t; Team.invOpen = false; this.refresh('tasks'); } }, I18n.s("u_86301b319df2", [TEAM_TYPES[t].n, TEAM_TYPES[t].max]) + (invN(t) ? I18n.s("u_53073eae3f7f", [invN(t)]) : '')))));
    const task = tm ? tm.task : Team.task(type), def = TEAM_TASKS[task], goal = tm ? tm.goal : Team.goal(type, task), R = TEAM_TYPES[type].reward;
    const endD = new Date(Team.end(type)), fmtD = (d) => `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    out.push(h('div', { class: 'tmcard' }, h('div', { class: 'tmcard-ic' }, ico(def.icon, 36)),
      h('div', { class: 'grow' }, h('b', { class: 'tmcard-t', text: `${def.n} ${goal} ${def.unit}` }), h('div', { class: 'hint', text: I18n.s("u_e7f7369dca19", [def.how, fmtD(endD)]) }),
        h('div', { class: 'tmrw' }, h('span', { class: 'hint', text: I18n.s("u_dd84a15812da") }), h('span', { class: 'rwc' }, ico('i_coin', 16), h('b', { class: 'num', text: String(R.c) })), R.x ? h('span', { class: 'rwc' }, ico('i_star', 16), h('b', { class: 'num', text: String(R.x) })) : null, R.coupon ? h('span', { class: 'rwc', title: I18n.s("u_495d7531d276") }, ico('i_ticket', 16), h('b', { class: 'num', text: '1' })) : null)),
    ));
    if (Team.err) out.push(h('p', { class: 'hint warn', text: Team.err }));
    // invitations (also while you are in a team: accepting moves you over)
    const invs = Team.invites.filter(i => i.type === type && (!cur || i.id !== cur.id));
    if (invs.length) {
      const curDone = tm && tm.doneAt;
      out.push(h('div', { class: 'tminvites' }, h('div', { class: 'sub', text: I18n.s("u_6ad331f5fcf6", [invs.length]) }), ...invs.map(i => h('div', { class: 'frrow tminvrow' }, this.teamAva(i.from, 28),
        h('button', { class: 'frname grow', onclick: () => this.openCard(i.from) }, h('b', { text: i.name }), h('span', { class: 'hint', text: I18n.s("u_93ae7e0c55ad", [TEAM_TYPES[i.type].n]) })),
        curDone ? h('span', { class: 'hint', text: I18n.s("u_146721ab3093") }) : h('button', { class: 'chip sm primary', onclick: () => Team.acceptInvite(i) }, cur ? I18n.s("u_a44a716f9980") : I18n.s("u_451755e3831f")),
        h('button', { class: 'chip sm', onclick: () => Team.declineInvite(i) }, I18n.s("u_77af2f337c1d"))))));
      this.wantInviteCards(invs);
    }
    if (!cur) {
      const busy = !!Team.busy[type], max = TEAM_TYPES[type].max;
      out.push(h('div', { class: 'tmstart' },
        h('div', { class: 'tmseats n' + max + ' ghost' }, ...Array.from({ length: max }, (_, i) => h('div', { class: 'tmseat vacant off', style: `--c:${TEAM_COLORS[i]}` }, h('span', { class: 'tmava' }, i === 0 ? this.avaPic(Game.S.avatar, 40) : ico('i_plus', 18)), h('b', { class: 'tmname', text: i === 0 ? I18n.s("u_a0c7716669b5") : I18n.s("u_dc4641eaff7d") })))),
        st && st.left ? h('p', { class: 'hint center', text: I18n.s("u_38402d0500b7") }) : null,
        h('div', { class: 'row wrap center' },
          h('button', { class: 'chip big primary', disabled: busy, onclick: () => Team.start(type, false) }, ico('i_play', 20), busy ? I18n.s("u_d166e71ff3ae") : I18n.s("u_c7315709337d")),
          h('button', { class: 'chip big', disabled: busy, title: I18n.s("u_6f3329f914b8"), onclick: () => Team.start(type, true) }, ico('i_sparkle', 20), I18n.s("u_7a10c527fca5"))),
        h('ol', { class: 'tmsteps' },
          h('li', {}, h('b', { text: I18n.s("u_11ac0ce6885c") }), I18n.s("u_4ddd44dcc9ce")),
          h('li', {}, h('b', { text: I18n.s("u_7571713dd281") }), I18n.s("u_50df4d3d19c2")),
          h('li', {}, h('b', { text: I18n.s("u_b95c994b709d") }), I18n.s("u_d6663c4116c2")))));
    } else if (!tm) out.push(h('p', { class: 'hint center', text: I18n.s("u_8cff045a51dc") }));
    else {
      const list = Team.shown(tm), done = !!tm.doneAt, canInvite = !done && tm.members.length < tm.max;
      out.push(this.teamPhase(type, cur, tm));
      if (canInvite && Team.invOpen) out.push(this.teamInvitePanel(type, tm));
      out.push(this.teamBar(tm, list, def));
      out.push(h('div', { class: 'sub', text: I18n.s("u_d068f255d9e9", [list.length, tm.max]) + (done ? I18n.s("u_2daaa9687a32") : '') }));
      out.push(this.teamSeats(tm, list, def, canInvite));
      if (!done) {
        out.push(h('div', { class: 'row wrap' },
          cur.dirty ? h('button', { class: 'chip sm', onclick: () => Team.flush(type).catch(e => UI.toast(I18n.s("u_0b84157bdf45") + cloudErr(e), 'i_people')) }, ico('i_cloud', 14), I18n.s("u_cbe9e0dc28f6")) : null,
          h('span', { class: 'grow' }), h('button', { class: 'chip sm', onclick: () => Team.leave(type) }, I18n.s("u_3564a58774ac"))));
        out.push(h('p', { class: 'hint', text: I18n.s("u_2bca834868e1") }));
      }
    }
    // earlier periods with rewards still waiting
    const old = Team.T.hist.filter(hh => hh.type === type);
    for (const hh of old) if (!Team.teams[hh.id] && !Team.loading['h' + hh.id]) { Team.loading['h' + hh.id] = true; Team.load(hh.type, hh.id).catch(() => { }); }
    const ready = old.filter(hh => Team.canClaim(Team.teams[hh.id], hh.type, hh.p));
    if (ready.length) out.push(h('div', { class: 'sub', text: I18n.s("u_c5ef6a4e1b3e") }), ...ready.map(hh => h('div', { class: 'frrow' }, h('span', { class: 'grow', text: `${hh.p.replace(/^w/, '')} ${TEAM_TASKS[hh.task] ? TEAM_TASKS[hh.task].n : ''}` }), h('button', { class: 'chip sm primary', onclick: () => Team.claim(hh.type, hh.p, hh.id) }, I18n.s("u_92edf81e0715")))));
    return out;
  },
  wantInviteCards(invs) { Team.wantCards(invs.map(i => i.from)); },
});
