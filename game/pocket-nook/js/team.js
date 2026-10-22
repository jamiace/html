/* ============================================================
   Daily and weekly team tasks (web build with Firebase)
   - daily teams: 1-3 people, weekly teams: 1-5; separate teams, a player can be in
     one daily and one weekly team at the same time
   - everyone gets the same task for the day / week (same total, whatever the team size)
   - start alone, invite friends who are not in a team yet, or let the game match
     you with other players (also strangers) who turned matching on
   - when the team reaches the goal the member list is fixed, and every member on
     it gets the full reward, even with zero contribution; each claims on their own
   - after joining, a player stays in that team for the period (leaving is allowed
     before the goal is reached, but then no other team that period)
   - rewards can be claimed until 7 days after the period ends

   Firestore (rules in firestore.rules):
     teams/{id}                  { type 'd'|'w', period, task, goal, max, members[], names{}, prog{uid: n},
                                   open, full, doneAt (0 until done), roster[], by, at }
     teams/{id}/claims/{uid}     one per member, created once -> a reward can't be claimed twice
     tm/{uid}                    { d: { p, id, left }, w: { p, id, left } } which team you are in
     tinv/{uid}/list/{teamId}    invitations from friends
   Progress is written as "my total so far" (not +n), so a retried write never counts twice.
   Budget: own progress at most every 5 min (right away when it may finish the task),
   the team is read when the team tab is open (at most every 30 s) and every 10 min otherwise.
   ============================================================ */
const TEAM_TYPES = {
  d: { n: '每日', max: 3, reward: { c: 80, x: 30 } },
  w: { n: '每週', max: 5, reward: { c: 400, x: 0, coupon: 1 } },
};
// goals: daily = base x 1.5, weekly = base x 1.2
const TEAM_TASKS = {
  focus: { n: '全隊專注', unit: '分鐘', ev: ['focusMin'], d: 90, w: 720, how: '番茄鐘專注的分鐘數' },
  quiz: { n: '全隊答對題目', unit: '題', ev: ['quizRight'], d: 45, w: 216, how: '任何單字測驗答對的題數' },
  care: { n: '全隊照顧寵物', unit: '次', ev: ['feed', 'play', 'groom', 'care', 'train'], d: 15, w: 72, how: '餵食、玩耍、梳毛洗澡、吃藥、訓練的次數' },
};
const TEAM_ORDER = ['focus', 'quiz', 'care'];
const TEAM_CFG = { flushMs: 5 * 60e3, pollMs: 10 * 60e3, viewMs: 30e3, claimDays: 7, histMax: 12, matchTry: 10 };

const Team = {
  teams: {}, loading: {}, invites: [], invAt: 0, err: '',
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
  // ---------- counting what you do (only after joining, only for this period) ----------
  onTrack(ev, n) {
    for (const type of ['d', 'w']) {
      const st = this.mine(type); if (!st || !st.id || st.left) continue;
      const def = TEAM_TASKS[st.task]; if (!def || !def.ev.includes(ev)) continue;
      st.mine = (st.mine || 0) + n; st.dirty = true;
      const tm = this.teams[st.id]; if (tm && !tm.doneAt && this.total(tm) - ((tm.prog || {})[this.uid()] || 0) + st.mine >= tm.goal) st.urgent = true;
    }
  },
  total(tm) { return Object.values(tm.prog || {}).reduce((a, b) => a + (b || 0), 0); },
  // ---------- background ----------
  tick() {
    if (!this.ready()) return;
    this.rollover();
    const now = Date.now();
    for (const type of ['d', 'w']) {
      const st = this.mine(type); if (!st || !st.id || st.left) continue;
      if (st.dirty && (st.urgent || now - (st.sentAt || 0) > TEAM_CFG.flushMs)) this.flush(type).catch(() => { });
      else if (now - (st.readAt || 0) > TEAM_CFG.pollMs) this.load(type).catch(() => { });
    }
  },
  // a new day / week: keep the old team for claiming
  rollover() {
    const T = this.T;
    for (const type of ['d', 'w']) {
      const st = T[type]; if (!st || st.p === this.period(type)) continue;
      if (st.id && !st.left && !T.claims[this.key(type, st.p)]) { T.hist.unshift({ type, p: st.p, id: st.id, end: st.end || 0, task: st.task }); T.hist.length = Math.min(T.hist.length, TEAM_CFG.histMax); }
      T[type] = null;
    }
    const now = Date.now(); T.hist = T.hist.filter(h => !T.claims[this.key(h.type, h.p)] && (!h.end || now < h.end + TEAM_CFG.claimDays * 86400000));
  },
  async load(type, id) {
    const st = id ? null : this.mine(type); id = id || (st && st.id); if (!id) return null;
    const tm = await this.db().get('teams/' + id); if (tm) { tm.id = id; this.teams[id] = tm; }
    if (st) { st.readAt = Date.now(); if (tm && tm.doneAt) st.done = true; }
    UI.refresh('tasks'); UI.badges(); return tm;
  },
  async flush(type) {
    const st = this.mine(type); if (!st || !st.id || !st.dirty) return;
    const uid = this.uid(), n = Math.floor(st.mine || 0);
    await this.db().update('teams/' + st.id, { ['prog.' + uid]: n, at: '__now__' });
    st.dirty = false; st.urgent = false; st.sentAt = Date.now(); Game.save();
    const tm = await this.load(type);
    if (tm && !tm.doneAt && this.total(tm) >= tm.goal) await this.complete(type).catch(() => { });
  },
  // the first member who sees the goal reached fixes the member list
  async complete(type) {
    const st = this.mine(type); if (!st || !st.id) return;
    const path = 'teams/' + st.id, uid = this.uid();
    await this.db().tx(async (t) => {
      const tm = await t.get(path); if (!tm || tm.doneAt || this.total(tm) < tm.goal) return;
      t.update(path, { doneAt: '__now__', roster: tm.members, open: false, full: true, at: '__now__' });
    });
    await this.load(type);
    UI.toast(`${TEAM_TYPES[type].n}團隊任務達成！到「任務」→「團隊」領獎勵`, 'i_people', 4.5, { label: '領取', fn: () => UI.openTasks('team') });
  },
  // ---------- starting / joining ----------
  newTeam(type, open) {
    const task = this.task(type), uid = this.uid();
    return { type, period: this.period(type), task, goal: this.goal(type, task), max: TEAM_TYPES[type].max, members: [uid], names: { [uid]: Social.myName() }, prog: { [uid]: 0 }, open: !!open && !Social.dev(), full: TEAM_TYPES[type].max <= 1, doneAt: 0, roster: [], by: uid, at: '__now__' };
  },
  mark(type, id, task) { this.T[type] = { p: this.period(type), id, task, mine: 0, end: this.end(type), joinedAt: Date.now() }; Game.save(); saveSoon(); },
  async start(type, match) {
    if (!this.ready()) return;
    const cur = this.mine(type); if (cur) return UI.toast(cur.left ? '你這一期已經離開過隊伍，下一期再參加吧' : '這一期已經有隊伍了', 'i_people');
    this.loading[type] = true; UI.refresh('tasks');
    try {
      if (match && Social.dev()) { UI.toast('用過開發者模式的存檔不能和其他玩家配對，先自己開始；可以邀請好友加入', 'i_people', 4); match = false; }
      if (match) {
        // join an open team that still has room; full or finished teams are skipped
        const cands = await this.db().query('teams', [['type', '==', type], ['period', '==', this.period(type)], ['open', '==', true], ['full', '==', false]], TEAM_CFG.matchTry);
        cands.sort((a, b) => (b.members || []).length - (a.members || []).length);   // fill teams that are almost full first
        for (const c of cands) { if ((c.members || []).includes(this.uid())) continue; if (await this.join(type, c.id, false, true)) { UI.toast(`配對成功，加入了${(c.members || []).length + 1} 人的隊伍！`, 'i_people', 3.5); return; } }
      }
      const id = this.db().newId('teams'), tm = this.newTeam(type, match), uid = this.uid();
      await this.db().tx(async (t) => {
        const mem = await t.get('tm/' + uid); const cur = mem && mem[type];
        if (cur && cur.p === tm.period) throw Object.assign(new Error('already'), { code: 'already' });
        t.set('teams/' + id, tm); t.set('tm/' + uid, Object.assign({}, mem || {}, { [type]: { p: tm.period, id }, at: '__now__' }));
      });
      this.mark(type, id, tm.task); await this.load(type);
      UI.toast(match ? '還沒有可以加入的隊伍，已經幫你開了一隊，其他玩家配對時會加入（你也可以先自己做）' : '團隊任務開始了！一個人也能完成', 'i_people', 4);
    } catch (e) { UI.toast(e && e.code === 'already' ? '這一期你已經加入過隊伍了' : '開始失敗：' + cloudErr(e), 'i_people', 4); }
    finally { this.loading[type] = false; UI.refresh('tasks'); }
  },
  // join a team (from matching or an invitation); returns true when it worked
  async join(type, id, invite, quiet) {
    const uid = this.uid(), path = 'teams/' + id, period = this.period(type);
    try {
      let task = null;
      await this.db().tx(async (t) => {
        const tm = await t.get(path), mem = await t.get('tm/' + uid), cur = mem && mem[type];
        if (cur && cur.p === period) throw Object.assign(new Error('already'), { code: 'already' });
        if (!tm || tm.type !== type || tm.period !== period) throw Object.assign(new Error('gone'), { code: 'gone' });
        if (tm.doneAt) throw Object.assign(new Error('done'), { code: 'done' });
        if ((tm.members || []).length >= tm.max) throw Object.assign(new Error('full'), { code: 'full' });
        if (!tm.open && !invite) throw Object.assign(new Error('closed'), { code: 'closed' });
        const members = [...tm.members, uid];
        task = tm.task;
        t.update(path, { members, names: Object.assign({}, tm.names, { [uid]: Social.myName() }), prog: Object.assign({}, tm.prog, { [uid]: 0 }), full: members.length >= tm.max, at: '__now__' });
        t.set('tm/' + uid, Object.assign({}, mem || {}, { [type]: { p: period, id }, at: '__now__' }));
      });
      this.mark(type, id, task); await this.load(type); return true;
    } catch (e) {
      if (!quiet) UI.toast({ already: '這一期你已經加入過隊伍了', gone: '這個隊伍已經不在了', done: '這個隊伍已經完成任務了', full: '這個隊伍已經滿了', closed: '這個隊伍沒有開放加入' }[e && e.code] || '加入失敗：' + cloudErr(e), 'i_people', 3.5);
      return false;
    }
  },
  async leave(type) {
    const st = this.mine(type); if (!st || !st.id) return;
    if (!confirm('離開之後，這一期就不能再加入別的隊伍了。確定要離開嗎？')) return;
    const uid = this.uid(), path = 'teams/' + st.id;
    try {
      await this.db().tx(async (t) => {
        const tm = await t.get(path), mem = await t.get('tm/' + uid); if (!tm) return;
        if (tm.doneAt) throw Object.assign(new Error('done'), { code: 'done' });
        const members = tm.members.filter(m => m !== uid), names = Object.assign({}, tm.names), prog = Object.assign({}, tm.prog); delete names[uid]; delete prog[uid];
        t.update(path, { members, names, prog, full: false, open: members.length ? tm.open : false, at: '__now__' });
        t.set('tm/' + uid, Object.assign({}, mem || {}, { [type]: { p: st.p, id: '', left: true }, at: '__now__' }));
      });
      st.left = true; st.id = ''; Game.save(); UI.toast('已經離開隊伍', 'i_people', 2.5);
    } catch (e) { UI.toast(e && e.code === 'done' ? '隊伍已經達成任務，名單固定了，不用離開也能領獎' : '離開失敗：' + cloudErr(e), 'i_people', 3.5); }
    UI.refresh('tasks');
  },
  async setOpen(type, open) {
    const st = this.mine(type); if (!st || !st.id) return;
    if (open && Social.dev()) return UI.toast('用過開發者模式的存檔不能開放陌生人配對', 'i_people', 3.5);
    try { await this.db().update('teams/' + st.id, { open: !!open, at: '__now__' }); await this.load(type); UI.toast(open ? '開放配對了，其他玩家可以加入你的隊伍' : '已停止配對（隊伍和進度都保留）', 'i_people', 3); }
    catch (e) { UI.toast('設定失敗：' + cloudErr(e), 'i_people', 3.5); }
  },
  // ---------- invitations ----------
  async invite(type, fid) {
    const st = this.mine(type), tm = st && this.teams[st.id]; if (!tm) return;
    if ((tm.members || []).length >= tm.max) return UI.toast('隊伍已經滿了', 'i_people');
    try {
      const mem = await this.db().get('tm/' + fid).catch(() => null), cur = mem && mem[type];
      if (cur && cur.p === tm.period) return UI.toast(`${Social.friendName(fid)}這一期已經有隊伍了`, 'i_people', 3);
      await this.db().set(`tinv/${fid}/list/${st.id}`, { from: this.uid(), name: Social.myName(), type, period: tm.period, task: tm.task, at: '__now__' });
      UI.toast(`已邀請${Social.friendName(fid)}，對方打開「任務」→「團隊」就能接受`, 'i_people', 3.5);
    } catch (e) { UI.toast('邀請失敗：' + cloudErr(e), 'i_people', 3.5); }
  },
  async loadInvites(force) {
    if (!this.ready() || (!force && Date.now() - this.invAt < TEAM_CFG.viewMs)) return;
    this.invAt = Date.now();
    try {
      const rows = await this.db().list(`tinv/${this.uid()}/list`, 30);
      this.invites = rows.filter(r => r.period === this.period(r.type));
      for (const r of rows.filter(r => r.period !== this.period(r.type))) this.db().del(`tinv/${this.uid()}/list/${r.id}`).catch(() => { });
    } catch (e) { this.err = cloudErr(e); }
    UI.refresh('tasks');
  },
  async acceptInvite(inv) {
    if (await this.join(inv.type, inv.id, true)) UI.toast(`加入了${inv.name}的隊伍！`, 'i_people', 3);
    this.db().del(`tinv/${this.uid()}/list/${inv.id}`).catch(() => { }); this.invites = this.invites.filter(x => x !== inv); UI.refresh('tasks');
  },
  async declineInvite(inv) { this.db().del(`tinv/${this.uid()}/list/${inv.id}`).catch(() => { }); this.invites = this.invites.filter(x => x !== inv); UI.refresh('tasks'); },
  // ---------- rewards ----------
  canClaim(tm, type, p) { const uid = this.uid(); return !!tm && !!tm.doneAt && (tm.roster || []).includes(uid) && !this.T.claims[this.key(type, p)]; },
  claimableN() {
    let n = 0; for (const type of ['d', 'w']) { const st = this.mine(type); if (st && st.id && this.canClaim(this.teams[st.id], type, st.p)) n++; }
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

/* ---------------- team tab in the tasks window ---------------- */
Object.assign(UI, {
  teamType: 'd',
  w_team() {
    const out = [];
    if (!Team.ready()) return [h('div', { class: 'empty' }, ico('i_people', 40), h('p', { text: Social.enabled() ? '團隊任務需要登入雲端帳號。' : '團隊任務需要網站版的雲端帳號（Firebase）。' }), Social.enabled() ? h('button', { class: 'chip primary', onclick: () => this.openWin('account') }, '登入') : null)];
    Team.rollover(); Team.loadInvites();
    const type = this.teamType, st = Team.mine(type), tm = st && st.id ? Team.teams[st.id] : null;
    if (st && st.id && (!tm || Date.now() - (st.readAt || 0) > TEAM_CFG.viewMs) && !Team.loading['r' + type]) { Team.loading['r' + type] = true; Team.load(type).finally(() => { Team.loading['r' + type] = false; }); }
    out.push(h('div', { class: 'tabs' }, ...['d', 'w'].map(t => h('button', { class: 'tab sm' + (type === t ? ' on' : ''), onclick: () => { this.teamType = t; this.refresh('tasks'); } }, `${TEAM_TYPES[t].n}（${TEAM_TYPES[t].max} 人）`))));
    const task = tm ? tm.task : Team.task(type), def = TEAM_TASKS[task], goal = tm ? tm.goal : Team.goal(type, task), R = TEAM_TYPES[type].reward;
    const endD = new Date(Team.end(type)), fmt = (d) => `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    out.push(h('div', { class: 'tmhead' }, h('b', { text: `${def.n} ${goal} ${def.unit}` }), h('span', { class: 'hint', text: `${def.how}。截止 ${fmt(endD)}` }),
      h('span', { class: 'hint', text: `獎勵（每位成員）：${R.c} 金幣` + (R.x ? `、${R.x} 經驗` : '') + (R.coupon ? '、1 張折價券' : '') }),
      h('span', { class: 'tmnote', text: '全隊達標，全員同獎：沒有貢獻的隊友也能領完整獎勵。' })));
    if (Team.err) out.push(h('p', { class: 'hint warn', text: Team.err }));
    const invs = Team.invites.filter(i => i.type === type);
    if (!st || !st.id) {
      if (st && st.left) out.push(h('p', { class: 'hint', text: '你這一期已經離開過隊伍，下一期再參加吧。' }));
      else {
        out.push(h('div', { class: 'row wrap center' },
          h('button', { class: 'chip primary', disabled: !!Team.loading[type], onclick: () => Team.start(type, false) }, ico('i_play', 18), '自己開始'),
          h('button', { class: 'chip', disabled: !!Team.loading[type] || Social.dev(), title: Social.dev() ? '用過開發者模式的存檔不能配對' : '', onclick: () => Team.start(type, true) }, ico('i_people', 18), '自動配對')),
          h('p', { class: 'hint', text: '一個人就能開始，不用等滿隊。自動配對會加入其他玩家開放的隊伍（可能是不認識的人），沒有的話就幫你開一隊等人加入。加入後這一期就不能換隊。' }));
        if (invs.length) out.push(h('div', { class: 'sub', text: `好友邀請（${invs.length}）` }), ...invs.map(i => h('div', { class: 'frrow' }, h('button', { class: 'frname grow', onclick: () => this.openCard(i.from) }, h('b', { text: i.name }), h('span', { class: 'hint', text: ` 邀請你加入${TEAM_TYPES[i.type].n}隊伍` })), h('button', { class: 'chip sm primary', onclick: () => Team.acceptInvite(i) }, '加入'), h('button', { class: 'chip sm', onclick: () => Team.declineInvite(i) }, '不要'))));
      }
    } else if (!tm) out.push(h('p', { class: 'hint', text: '讀取隊伍中…' }));
    else {
      const uid = Team.uid(), total = Team.total(tm) - ((tm.prog || {})[uid] || 0) + Math.max((tm.prog || {})[uid] || 0, st.mine || 0), done = !!tm.doneAt;
      out.push(h('div', { class: 'tmprog' }, h('div', { class: 'pbar team' }, h('i', { style: `width:${Math.min(100, Math.round(total / tm.goal * 100))}%` })), h('b', { class: 'num', text: `${Math.min(total, tm.goal)} / ${tm.goal} ${def.unit}` })));
      const list = done ? tm.roster : tm.members;
      out.push(h('div', { class: 'sub', text: `隊員（${list.length}/${tm.max}）` + (done ? ' · 名單已固定' : '') }));
      out.push(h('div', { class: 'frlist' }, ...list.map(m => h('div', { class: 'frrow' }, Social.cards[m] ? this.avaPic(Social.cards[m].ava, 28) : null,
        h('button', { class: 'frname grow', onclick: () => this.openCard(m) }, h('b', { text: (tm.names || {})[m] || '隊友' }), m === uid ? h('span', { class: 'hint', text: '（你）' }) : null),
        h('span', { class: 'hint num', text: `貢獻 ${m === uid ? Math.max((tm.prog || {})[m] || 0, st.mine || 0) : (tm.prog || {})[m] || 0}` })))));
      if (done) {
        const can = Team.canClaim(tm, type, st.p);
        out.push(h('div', { class: 'row center' }, can ? h('button', { class: 'chip primary', onclick: () => Team.claim(type, st.p, st.id) }, ico('i_gift', 18), '領取獎勵') : h('span', { class: 'ptag', text: Team.T.claims[Team.key(type, st.p)] ? '已領取' : '你不在完成時的名單上' })));
      } else {
        const room = tm.members.length < tm.max, friends = Social.okFriends().filter(f => !tm.members.includes(f.id));
        out.push(h('div', { class: 'row wrap' },
          h('button', { class: 'chip sm' + (tm.open ? ' on' : ''), disabled: Social.dev() && !tm.open, onclick: () => Team.setOpen(type, !tm.open) }, tm.open ? '開放配對：開' : '開放配對：關'),
          st.dirty ? h('button', { class: 'chip sm', onclick: () => Team.flush(type).catch(e => UI.toast('上傳失敗：' + cloudErr(e), 'i_people')) }, ico('i_cloud', 14), '上傳我的進度') : null,
          h('span', { class: 'grow' }), h('button', { class: 'chip sm', onclick: () => Team.leave(type) }, '離開隊伍')));
        if (room && friends.length) out.push(h('div', { class: 'row wrap' }, h('span', { class: 'hint', text: '邀請好友：' }), ...friends.slice(0, 12).map(f => h('button', { class: 'chip sm', onclick: () => Team.invite(type, f.id) }, Social.friendName(f.id)))));
        out.push(h('p', { class: 'hint', text: `加入後做的事才會算進隊伍。你的進度最多每 5 分鐘上傳一次，快達標時馬上上傳。${tm.open ? '隊伍開放中，其他玩家配對時可能加入。' : ''}` }));
      }
    }
    // earlier periods with rewards still waiting
    const old = Team.T.hist.filter(hh => hh.type === type);
    for (const hh of old) if (!Team.teams[hh.id] && !Team.loading['h' + hh.id]) { Team.loading['h' + hh.id] = true; Team.load(hh.type, hh.id).catch(() => { }); }
    const ready = old.filter(hh => Team.canClaim(Team.teams[hh.id], hh.type, hh.p));
    if (ready.length) out.push(h('div', { class: 'sub', text: '之前的團隊獎勵（結束後 7 天內可以領）' }), ...ready.map(hh => h('div', { class: 'frrow' }, h('span', { class: 'grow', text: `${hh.p.replace(/^w/, '')} ${TEAM_TASKS[hh.task] ? TEAM_TASKS[hh.task].n : ''}` }), h('button', { class: 'chip sm primary', onclick: () => Team.claim(hh.type, hh.p, hh.id) }, '領取'))));
    return out;
  },
});
