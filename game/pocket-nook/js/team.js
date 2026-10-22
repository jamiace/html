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
  d: { n: '每日', max: 3, reward: { c: 80, x: 30 } },
  w: { n: '每週', max: 5, reward: { c: 400, x: 0, coupon: 1 } },
};
// goals: daily = base x 1.5, weekly = base x 1.2
const TEAM_TASKS = {
  focus: { n: '全隊專注', unit: '分鐘', ev: ['focusMin'], d: 90, w: 720, how: '番茄鐘專注的分鐘數', icon: 'i_tomato' },
  quiz: { n: '全隊答對題目', unit: '題', ev: ['quizRight'], d: 45, w: 216, how: '任何單字測驗答對的題數', icon: 'i_learn' },
  care: { n: '全隊照顧寵物', unit: '次', ev: ['feed', 'play', 'groom', 'care', 'train'], d: 15, w: 72, how: '餵食、玩耍、梳毛洗澡、吃藥、訓練的次數', icon: 'i_paw' },
};
const TEAM_ORDER = ['focus', 'quiz', 'care'];
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
  task(type) { const i = this.index(type) + (type === 'w' ? 1 : 0); return TEAM_ORDER[((i % 3) + 3) % 3]; },
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
    await this.db().update('teams/' + st.id, { ['prog.' + uid]: n, at: '__now__' });
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
    UI.toast(`${TEAM_TYPES[type].n}團隊任務達成！到「任務」→「團隊」領獎勵`, 'i_people', 4.5, { label: '領取', fn: () => UI.openTasks('team') });
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
    if (this.inTeam(type)) return UI.toast('這一期已經在隊伍裡了', 'i_people');
    this.busy[type] = true; UI.refresh('tasks');
    try {
      if (match) {
        for (const c of await this.candidates(type)) if (await this.join(type, c.id, false, true)) { UI.toast(`配對成功，加入了 ${(c.members || []).length + 1} 人的隊伍！`, 'i_people', 3.5); return; }
      }
      const id = this.db().newId('teams'), tm = this.newTeam(type, match), uid = this.uid();
      await this.db().tx(async (t) => {
        const mem = await t.get('tm/' + uid), cur = mem && mem[type];
        if (cur && cur.p === tm.period && cur.id) throw teamErr('already');
        t.set('teams/' + id, tm); t.set('tm/' + uid, Object.assign({}, mem || {}, { [type]: { p: tm.period, id }, at: '__now__' }));
      });
      this.mark(type, id, tm.task); await this.load(type);
      UI.toast(match ? '還沒有可以加入的隊伍，已經幫你開了一隊並開始配對（你也可以先自己做）' : '隊伍建立了！5 分鐘內可以邀請好友，沒滿隊會自動配對', 'i_people', 4);
    } catch (e) { UI.toast(e && e.code === 'already' ? '這一期你已經在別的隊伍裡了（可能是在另一台裝置加入的）' : '開始失敗：' + cloudErr(e), 'i_people', 4); }
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
      if (!quiet) UI.toast({ already: '這一期你已經在別的隊伍裡了（可能是在另一台裝置加入的）', gone: '這個隊伍已經不在了', done: '這個隊伍已經完成任務了', full: '這個隊伍已經滿了', closed: '這個隊伍沒有開放加入', member: '你已經在這個隊伍裡了', fromDone: '你目前的隊伍已經完成任務，這一期不能換隊了' }[e && e.code] || '加入失敗：' + cloudErr(e), 'i_people', 3.5);
      return false;
    }
  },
  async leave(type, opts = {}) {
    const st = this.inTeam(type); if (!st) return false;
    if (!opts.noAsk && !confirm('確定要離開隊伍嗎？\n\n你在這隊的貢獻會跟著你離開。離開後可以再開新隊、配對別隊，或被好友邀請回來。')) return false;
    const uid = this.uid(), path = 'teams/' + st.id;
    try {
      await this.db().tx(async (t) => {
        const tm = await t.get(path), mem = await t.get('tm/' + uid);
        if (tm && tm.doneAt) throw teamErr('done');
        if (tm && (tm.members || []).includes(uid)) t.update(path, this.leaveData(tm, uid));
        t.set('tm/' + uid, Object.assign({}, mem || {}, { [type]: { p: st.p, id: '', left: true }, at: '__now__' }));
      });
      delete this.teams[st.id]; st.left = true; st.id = ''; st.mine = 0; st.dirty = false; st.urgent = false; Game.save(); saveSoon();
      UI.toast('已經離開隊伍。想再組隊時，重新開始、配對或接受好友邀請都可以', 'i_people', 3.5);
      UI.refresh('tasks'); return true;
    } catch (e) { UI.toast(e && e.code === 'done' ? '隊伍已經達成任務，名單固定了，不用離開也能領獎' : '離開失敗：' + cloudErr(e), 'i_people', 3.5); UI.refresh('tasks'); return false; }
  },
  // matching on / off (also ends the lobby countdown)
  async setOpen(type, open) {
    const st = this.inTeam(type); if (!st || this.busy[type]) return;
    if (open) return this.autoMatch(type, true);
    this.busy[type] = true; UI.refresh('tasks');
    try { await this.db().update('teams/' + st.id, { open: false, mAt: 0, at: '__now__' }); await this.load(type); UI.toast('已停止配對，只和好友組隊（隊伍和進度都保留）', 'i_people', 3); }
    catch (e) { UI.toast('設定失敗：' + cloudErr(e), 'i_people', 3.5); }
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
        for (const c of (await this.candidates(type)).filter(c => c.id !== st.id)) if (await this.join(type, c.id, false, true)) { UI.toast(`配對成功！加入了 ${(c.members || []).length + 1} 人的隊伍`, 'i_people', 3.5); return; }
      }
      await this.db().update('teams/' + st.id, { open: true, mAt: 0, at: '__now__' }); await this.load(type);
      UI.toast(manual ? '開始配對了！其他玩家配對時會加入你的隊伍' : '5 分鐘到了還沒滿隊，已經自動開始配對', 'i_people', 3.5);
    } catch (e) { st.autoErr = Date.now(); if (manual) UI.toast('配對失敗：' + cloudErr(e), 'i_people', 3.5); }
    finally { this.busy[type] = false; UI.refresh('tasks'); }
  },
  // ---------- invitations: any friend can invite you, even when you are already in a team ----------
  async invite(type, fid) {
    const st = this.inTeam(type), tm = st && this.teams[st.id]; if (!tm) return;
    const nm = Social.friendName(fid), k = st.id + ':' + fid;
    if (tm.doneAt) return UI.toast('隊伍已經完成任務了', 'i_people');
    if ((tm.members || []).includes(fid)) return UI.toast(`${nm}已經在隊伍裡了`, 'i_people');
    if ((tm.members || []).length >= tm.max) return UI.toast('隊伍已經滿了', 'i_people');
    if (this.sent[k]) return UI.toast(`已經邀請過${nm}了，等對方接受`, 'i_people');
    this.sent[k] = Date.now(); UI.refresh('tasks');
    try {
      let note = '';
      const mem = await this.db().get('tm/' + fid).catch(() => null), cur = mem && mem[type];
      if (cur && cur.p === tm.period && cur.id) {
        const other = await this.db().get('teams/' + cur.id).catch(() => null);
        if (other && other.doneAt) { delete this.sent[k]; UI.refresh('tasks'); return UI.toast(`${nm}這一期的隊伍已經完成任務了，下一期再一起吧`, 'i_people', 3.5); }
        if (other) note = '（對方目前在別的隊伍，接受後會換過來）';
      }
      await this.db().set(`tinv/${fid}/list/${st.id}`, { from: this.uid(), name: Social.myName(), type, period: tm.period, task: tm.task, at: '__now__' });
      UI.toast(`已邀請${nm}${note}，對方打開「任務」→「團隊」就能接受`, 'i_people', 4);
    } catch (e) { delete this.sent[k]; UI.toast('邀請失敗：' + cloudErr(e), 'i_people', 3.5); }
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
      if (tm && tm.doneAt) return UI.toast('你這一期的隊伍已經完成任務，不能換隊了，下一期再一起吧', 'i_people', 3.5);
      if (!confirm(`要離開目前的隊伍，換到${inv.name}的隊伍嗎？\n\n你在目前隊伍的貢獻會跟著你離開，不會帶到新隊伍。`)) return;
    }
    if (await this.join(inv.type, inv.id, true)) UI.toast(`加入了${inv.name}的隊伍！`, 'i_people', 3);
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
    const tm = this.teams[id] || await this.load(type, id); if (!this.canClaim(tm, type, p)) return UI.toast('還沒有達成，或你不在完成時的名單上', 'i_people', 3);
    const end = p === this.period(type) ? this.end(type) : ((T.hist.find(h => h.id === id) || {}).end || this.end(type));
    if (p !== this.period(type) && Date.now() > end + TEAM_CFG.claimDays * 86400000) return UI.toast('已經超過領獎期限（結束後 7 天）', 'i_people', 3);
    try { await this.db().set(`teams/${id}/claims/${this.uid()}`, { at: '__now__' }); }
    catch (e) {
      if (e && e.code === 'permission-denied') { T.claims[k] = true; Game.save(); UI.refresh('tasks'); return UI.toast('這份獎勵已經在別的裝置領過了', 'i_people', 3); }
      return UI.toast('領取失敗：' + cloudErr(e), 'i_people', 3.5);
    }
    T.claims[k] = true; T.hist = T.hist.filter(h => this.key(h.type, h.p) !== k);
    const R = TEAM_TYPES[type].reward; Game.reward(R.c, R.x, 'raw');   // raw: every member gets exactly the same, no comfort bonus
    let msg = `領到${TEAM_TYPES[type].n}團隊獎勵：${R.c} 金幣` + (R.x ? `、${R.x} 經驗` : '');
    if (R.coupon) { const c = Rewards.addCoupon(Rewards.rollCoupon()); msg += `、一張${Rewards.couponName(c)}券`; }
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
    const segs = list.map((m, i) => vals[i] > 0 ? h('i', { class: 'tmseg', style: `width:${(vals[i] / scale * 100).toFixed(2)}%;--c:${TEAM_COLORS[i % 5]}`, title: `${(tm.names || {})[m] || '隊友'}：${vals[i]} ${def.unit}` }) : null);
    const pct = Math.min(100, Math.floor(sum / tm.goal * 100));
    return h('div', { class: 'tmprog2' },
      h('div', { class: 'tmbar' + (tm.doneAt ? ' done' : '') }, h('div', { class: 'tmbar-in' }, ...segs), h('span', { class: 'tmbar-pct num', text: pct + '%' })),
      h('div', { class: 'tmbar-meta' }, h('b', { class: 'num', text: `${Math.min(sum, tm.goal)} / ${tm.goal}` }), h('span', { class: 'hint', text: def.unit }), h('span', { class: 'grow' }),
        h('span', { class: 'hint', text: sum >= tm.goal ? '達標！' : `還差 ${tm.goal - sum} ${def.unit}` })));
  },
  teamSeats(tm, list, def, canInvite) {
    const vals = list.map(m => Team.contrib(tm, m)), sum = vals.reduce((a, b) => a + b, 0), best = Math.max(0, ...vals), uid = Team.uid();
    const seats = list.map((m, i) => {
      const v = vals[i], share = sum ? Math.round(v / sum * 100) : 0, col = TEAM_COLORS[i % 5];
      return h('button', { class: 'tmseat' + (m === uid ? ' me' : ''), style: `--c:${col}`, title: '看名片', onclick: () => this.openCard(m) },
        h('span', { class: 'tmava' }, this.teamAva(m, 40), v > 0 && v === best ? h('span', { class: 'tmcrown', title: '目前貢獻最多' }, ico('i_crown', 20)) : null),
        h('b', { class: 'tmname', text: m === uid ? '你' : clipName((tm.names || {})[m]) || '隊友' }),
        h('span', { class: 'tmval' }, h('b', { class: 'num', text: String(v) }), h('small', { text: def.unit })),
        h('span', { class: 'tmshare' }, h('i', { style: `width:${share}%` })),
        h('small', { class: 'hint num', text: share + '%' }));
    });
    for (let i = list.length; i < tm.max; i++) seats.push(canInvite ? h('button', { class: 'tmseat vacant', style: `--c:${TEAM_COLORS[i % 5]}`, onclick: () => { Team.invOpen = true; this.refresh('tasks'); } }, h('span', { class: 'tmava' }, ico('i_plus', 22)), h('b', { class: 'tmname', text: '空位' }), h('small', { class: 'hint', text: '邀請好友' }))
      : h('div', { class: 'tmseat vacant off', style: `--c:${TEAM_COLORS[i % 5]}` }, h('span', { class: 'tmava' }), h('b', { class: 'tmname', text: '空位' })));
    return h('div', { class: 'tmseats n' + tm.max }, ...seats);
  },
  teamInvitePanel(type, tm) {
    const friends = Social.okFriends();
    const head = h('div', { class: 'row between' }, h('span', { class: 'sub', text: `邀請好友（還有 ${tm.max - tm.members.length} 個空位）` }), h('button', { class: 'chip sm', onclick: () => { Team.invOpen = false; this.refresh('tasks'); } }, '收起'));
    if (!friends.length) return h('div', { class: 'tminv' }, head, h('p', { class: 'hint', text: '還沒有好友。到「好友」視窗交換好友代碼，就能邀請對方一起組隊。' }), h('button', { class: 'chip sm', onclick: () => this.openFriends('friends') }, ico('i_people', 16), '打開好友'));
    return h('div', { class: 'tminv' }, head, h('div', { class: 'tminv-list' }, ...friends.map(f => {
      const inTeam = tm.members.includes(f.id), sent = Team.sent[tm.id + ':' + f.id], p = Social.cards[f.id] || {};
      return h('div', { class: 'frrow' }, this.avaPic(p.ava, 28), h('span', { class: 'grow', text: Social.friendName(f.id) }),
        inTeam ? h('span', { class: 'ptag', text: '已在隊上' }) : sent ? h('span', { class: 'ptag', text: '已邀請' }) : h('button', { class: 'chip sm primary', onclick: () => Team.invite(type, f.id) }, '邀請'));
    })), h('p', { class: 'hint', text: '任何好友都能邀請，對方就算已經在別的隊伍也可以換過來。' }));
  },
  teamPhase(type, st, tm) {
    const ph = Team.phase(tm), busy = !!Team.busy[type], room = tm.max - tm.members.length;
    const inviteBtn = h('button', { class: 'chip', disabled: busy, onclick: () => { Team.invOpen = !Team.invOpen; this.refresh('tasks'); } }, ico('i_people', 18), '邀請好友');
    if (ph === 'lobby') {
      const left = Math.max(0, (tm.mAt - Date.now()) / 1000);
      this.el.tmClock = h('b', { class: 'tmclock num', text: fmt(left) });
      this.el.tmCd = h('i', { style: `width:${(left / (TEAM_CFG.lobbyMs / 1000) * 100).toFixed(1)}%` });
      return h('div', { class: 'tmphase lobby' },
        h('div', { class: 'tmph-row' }, h('div', { class: 'grow' }, h('b', { class: 'tmph-t', text: '組隊中' }), h('p', { class: 'hint', text: `還差 ${room} 人。倒數結束還沒滿隊，會自動幫你配對其他玩家。` })), this.el.tmClock),
        h('div', { class: 'tmcd' }, this.el.tmCd),
        h('div', { class: 'row wrap' }, inviteBtn, h('button', { class: 'chip primary', disabled: busy, onclick: () => Team.autoMatch(type, true) }, ico('i_sparkle', 18), busy ? '配對中…' : '立即配對'),
          h('span', { class: 'grow' }), h('button', { class: 'chip sm', disabled: busy, title: '取消倒數，只和好友組隊', onclick: () => Team.setOpen(type, false) }, '不要自動配對')));
    }
    if (ph === 'due') return h('div', { class: 'tmphase match' }, h('div', { class: 'tmph-row' }, h('div', { class: 'grow' }, h('b', { class: 'tmph-t' }, '自動配對中', h('span', { class: 'dots' })), h('p', { class: 'hint', text: '5 分鐘到了，正在幫你找隊友…' })), ico('i_sparkle', 32, 'ico tmspin')), h('div', { class: 'row wrap' }, inviteBtn));
    if (ph === 'match') return h('div', { class: 'tmphase match' },
      h('div', { class: 'tmph-row' }, h('div', { class: 'grow' }, h('b', { class: 'tmph-t' }, '配對中', h('span', { class: 'dots' })), h('p', { class: 'hint', text: `其他玩家配對時會加入你的隊伍，還有 ${room} 個空位。不用等，先開始做也會算進隊伍。` })), ico('i_sparkle', 32, 'ico tmspin')),
      h('div', { class: 'row wrap' }, inviteBtn, h('span', { class: 'grow' }), h('button', { class: 'chip sm', disabled: busy, onclick: () => Team.setOpen(type, false) }, '停止配對')));
    if (ph === 'friends') return h('div', { class: 'tmphase friends' },
      h('div', { class: 'tmph-row' }, h('div', { class: 'grow' }, h('b', { class: 'tmph-t', text: '好友隊伍' }), h('p', { class: 'hint', text: `只有收到邀請的好友能加入，還有 ${room} 個空位。` }))),
      h('div', { class: 'row wrap' }, inviteBtn, h('button', { class: 'chip primary', disabled: busy, onclick: () => Team.autoMatch(type, true) }, ico('i_sparkle', 18), busy ? '配對中…' : '開始配對')));
    if (ph === 'full') return h('div', { class: 'tmphase full' }, h('div', { class: 'tmph-row' }, ico('i_people', 32), h('div', { class: 'grow' }, h('b', { class: 'tmph-t', text: '隊伍滿員！' }), h('p', { class: 'hint', text: '大家一起衝刺吧，達標後名單上每個人都能領完整獎勵。' }))));
    const can = Team.canClaim(tm, type, st.p), got = Team.T.claims[Team.key(type, st.p)];
    return h('div', { class: 'tmphase done' }, h('div', { class: 'tmph-row' }, ico('i_star', 32), h('div', { class: 'grow' }, h('b', { class: 'tmph-t', text: '任務達成！' }), h('p', { class: 'hint', text: '名單已經固定，每位隊員都能領完整獎勵。' })),
      can ? h('button', { class: 'chip primary', onclick: () => Team.claim(type, st.p, st.id) }, ico('i_gift', 18), '領取獎勵') : h('span', { class: 'ptag', text: got ? '已領取' : '你不在完成時的名單上' })));
  },
  w_team() {
    const out = [];
    if (!Team.ready()) return [h('div', { class: 'empty' }, ico('i_people', 40), h('p', { text: Social.enabled() ? '團隊任務需要登入雲端帳號。' : '團隊任務需要網站版的雲端帳號（Firebase）。' }), Social.enabled() ? h('button', { class: 'chip primary', onclick: () => this.openWin('account') }, '登入') : null)];
    Team.rollover(); Team.loadInvites();
    const type = this.teamType, st = Team.mine(type), cur = Team.inTeam(type), tm = cur ? Team.teams[cur.id] : null;
    this.el.tmClock = null;
    if (cur && (!tm || Date.now() - (cur.readAt || 0) > TEAM_CFG.viewMs) && !Team.loading['r' + type]) { Team.loading['r' + type] = true; Team.load(type).catch(() => { }).finally(() => { Team.loading['r' + type] = false; }); }
    const invN = (t) => Team.invites.filter(i => i.type === t).length;
    out.push(h('div', { class: 'tabs' }, ...['d', 'w'].map(t => h('button', { class: 'tab sm' + (type === t ? ' on' : ''), onclick: () => { this.teamType = t; Team.invOpen = false; this.refresh('tasks'); } }, `${TEAM_TYPES[t].n}（${TEAM_TYPES[t].max} 人）` + (invN(t) ? ` · 邀請 ${invN(t)}` : '')))));
    const task = tm ? tm.task : Team.task(type), def = TEAM_TASKS[task], goal = tm ? tm.goal : Team.goal(type, task), R = TEAM_TYPES[type].reward;
    const endD = new Date(Team.end(type)), fmtD = (d) => `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    out.push(h('div', { class: 'tmcard' }, h('div', { class: 'tmcard-ic' }, ico(def.icon, 36)),
      h('div', { class: 'grow' }, h('b', { class: 'tmcard-t', text: `${def.n} ${goal} ${def.unit}` }), h('div', { class: 'hint', text: `${def.how} · 截止 ${fmtD(endD)}` }),
        h('div', { class: 'tmrw' }, h('span', { class: 'hint', text: '每人獎勵' }), h('span', { class: 'rwc' }, ico('i_coin', 16), h('b', { class: 'num', text: String(R.c) })), R.x ? h('span', { class: 'rwc' }, ico('i_star', 16), h('b', { class: 'num', text: String(R.x) })) : null, R.coupon ? h('span', { class: 'rwc', title: '折價券' }, ico('i_ticket', 16), h('b', { class: 'num', text: '1' })) : null)),
    ));
    if (Team.err) out.push(h('p', { class: 'hint warn', text: Team.err }));
    // invitations (also while you are in a team: accepting moves you over)
    const invs = Team.invites.filter(i => i.type === type && (!cur || i.id !== cur.id));
    if (invs.length) {
      const curDone = tm && tm.doneAt;
      out.push(h('div', { class: 'tminvites' }, h('div', { class: 'sub', text: `隊伍邀請（${invs.length}）` }), ...invs.map(i => h('div', { class: 'frrow tminvrow' }, this.teamAva(i.from, 28),
        h('button', { class: 'frname grow', onclick: () => this.openCard(i.from) }, h('b', { text: i.name }), h('span', { class: 'hint', text: `邀請你加入${TEAM_TYPES[i.type].n}隊伍` })),
        curDone ? h('span', { class: 'hint', text: '你已完成這一期' }) : h('button', { class: 'chip sm primary', onclick: () => Team.acceptInvite(i) }, cur ? '換到這隊' : '加入'),
        h('button', { class: 'chip sm', onclick: () => Team.declineInvite(i) }, '不要')))));
      this.wantInviteCards(invs);
    }
    if (!cur) {
      const busy = !!Team.busy[type], max = TEAM_TYPES[type].max;
      out.push(h('div', { class: 'tmstart' },
        h('div', { class: 'tmseats n' + max + ' ghost' }, ...Array.from({ length: max }, (_, i) => h('div', { class: 'tmseat vacant off', style: `--c:${TEAM_COLORS[i]}` }, h('span', { class: 'tmava' }, i === 0 ? this.avaPic(Game.S.avatar, 40) : ico('i_plus', 18)), h('b', { class: 'tmname', text: i === 0 ? '你' : '空位' })))),
        st && st.left ? h('p', { class: 'hint center', text: '你離開了上一支隊伍，可以重新組隊、配對，或接受好友的邀請。' }) : null,
        h('div', { class: 'row wrap center' },
          h('button', { class: 'chip big primary', disabled: busy, onclick: () => Team.start(type, false) }, ico('i_play', 20), busy ? '處理中…' : '開始團隊任務'),
          h('button', { class: 'chip big', disabled: busy, title: '直接加入其他玩家開放的隊伍', onclick: () => Team.start(type, true) }, ico('i_sparkle', 20), '快速配對')),
        h('ol', { class: 'tmsteps' },
          h('li', {}, h('b', { text: '開始後 5 分鐘' }), '：邀請好友組隊，或按「立即配對」。'),
          h('li', {}, h('b', { text: '5 分鐘到了' }), '：還沒滿隊會自動配對其他玩家（可以取消）。'),
          h('li', {}, h('b', { text: '一個人也能做' }), '：開始後做的事就會算進隊伍，達標全員同獎。'))));
    } else if (!tm) out.push(h('p', { class: 'hint center', text: '讀取隊伍中…' }));
    else {
      const list = Team.shown(tm), done = !!tm.doneAt, canInvite = !done && tm.members.length < tm.max;
      out.push(this.teamPhase(type, cur, tm));
      if (canInvite && Team.invOpen) out.push(this.teamInvitePanel(type, tm));
      out.push(this.teamBar(tm, list, def));
      out.push(h('div', { class: 'sub', text: `隊員貢獻（${list.length}/${tm.max}）` + (done ? ' · 名單已固定' : '') }));
      out.push(this.teamSeats(tm, list, def, canInvite));
      if (!done) {
        out.push(h('div', { class: 'row wrap' },
          cur.dirty ? h('button', { class: 'chip sm', onclick: () => Team.flush(type).catch(e => UI.toast('上傳失敗：' + cloudErr(e), 'i_people')) }, ico('i_cloud', 14), '上傳我的進度') : null,
          h('span', { class: 'grow' }), h('button', { class: 'chip sm', onclick: () => Team.leave(type) }, '離開隊伍')));
        out.push(h('p', { class: 'hint', text: '加入後做的事才會算進隊伍。你的進度最多每 5 分鐘上傳一次，快達標時馬上上傳。離開後可以再加入其他隊伍，或被好友邀請回來。' }));
      }
    }
    // earlier periods with rewards still waiting
    const old = Team.T.hist.filter(hh => hh.type === type);
    for (const hh of old) if (!Team.teams[hh.id] && !Team.loading['h' + hh.id]) { Team.loading['h' + hh.id] = true; Team.load(hh.type, hh.id).catch(() => { }); }
    const ready = old.filter(hh => Team.canClaim(Team.teams[hh.id], hh.type, hh.p));
    if (ready.length) out.push(h('div', { class: 'sub', text: '之前的團隊獎勵（結束後 7 天內可以領）' }), ...ready.map(hh => h('div', { class: 'frrow' }, h('span', { class: 'grow', text: `${hh.p.replace(/^w/, '')} ${TEAM_TASKS[hh.task] ? TEAM_TASKS[hh.task].n : ''}` }), h('button', { class: 'chip sm primary', onclick: () => Team.claim(hh.type, hh.p, hh.id) }, '領取'))));
    return out;
  },
  wantInviteCards(invs) { Team.wantCards(invs.map(i => i.from)); },
});
