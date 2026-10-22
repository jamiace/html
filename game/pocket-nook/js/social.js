/* ============================================================
   Friends, visiting, helping and the leaderboard (web build + Firebase)
   Firestore layout (rules in firestore.rules):
     profiles/{uid}              { name, lvl, pets, code, at }            public card
     codes/{CODE}                { uid, at }                              friend code -> uid
     board/{uid}                 { name, lvl, coins, pets, focus, w: { <week>: minutes }, at }
     users/{uid}/friends/{fid}   { s: 'out' | 'in' | 'ok', name, at }      both sides keep a copy
     rooms/{uid}                 { v, name, data: JSON string, at }       room snapshot for friends
     rooms/{uid}/help/{id}       { from, name, kind, need, target, day, at }  applied by the owner
   Budget: the profile and leaderboard entry are written at most every 3 hours, the room
   snapshot at most every 10 minutes (sooner when the needs change, never under 2 minutes),
   help notes are read when you sign in and every 10 minutes. No realtime listeners.
   ============================================================ */
// batch 2 (friends, visiting, leaderboard) is still being built: everything below stays off until then
const SOCIAL_ON = false;
const SOCIAL = { maxFriends: 30, helpsPerDay: 5, ticketEvery: 10, boardMs: 3 * 3600e3, roomMs: 10 * 60e3, roomMinMs: 2 * 60e3, helpPollMs: 10 * 60e3, boardTop: 30, helperCoins: 5, helperXp: 5 };
const HELP_KINDS = { feed: { need: 'cat_hungry', v: '餵', n: '餵寵物', done: (n) => `餵了${n}` }, water: { need: 'plant_wilt', v: '澆水', n: '澆水', done: (n) => `幫${n}澆了水` }, dust: { need: 'dusty', v: '清掃', n: '清掃', done: (n) => `把${n}擦乾淨了` } };
const NEED_HELP = { cat_hungry: 'feed', plant_wilt: 'water', dusty: 'dust' };
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const Social = {
  uid: null, started: false, friends: [], profiles: {}, room: null, visitSt: null, loading: {}, err: '',
  get Z() { const S = Game.S; if (!S.social) S.social = { code: '', hd: '', hn: 0, total: 0, wk: { k: '', m: 0 }, guest: [], helped: {}, pubAt: 0, roomAt: 0, gb: false }; return S.social; },
  enabled() { return SOCIAL_ON && typeof Cloud !== 'undefined' && Cloud.mode === 'firebase' && !!Cloud.fb && !!Cloud.fb.store; },
  ready() { return this.enabled() && Cloud.active() && !!this.uid; },
  db() { return Cloud.fb.store; },
  myName() { return clipName((Game.S.avatar && Game.S.avatar.name) || '') || '小窩住民'; },
  petCount() { return Pets.list().length; },
  dev() { return !!(Game.S.flags && Game.S.flags.dev); },
  // ---------- focus minutes this week (kept in both builds) ----------
  addFocus(m) { const Z = this.Z, k = weekKey(); if (Z.wk.k !== k) Z.wk = { k, m: 0 }; Z.wk.m += m; },
  weekFocus() { const Z = this.Z; return Z.wk.k === weekKey() ? Z.wk.m : 0; },
  // ---------- lifecycle ----------
  onSynced() {
    if (!this.enabled()) return;
    const uid = Cloud.uid(); if (!uid) return;
    if (this.uid !== uid) { this.stop(); this.uid = uid; }
    if (this.started) return; this.started = true;
    this.boot().catch(e => { this.err = cloudErr(e); UI.refresh('friends'); });
    this.timer = setInterval(() => this.tick(), 60000);
  },
  stop() { clearInterval(this.timer); this.timer = null; this.started = false; this.uid = null; this.friends = []; this.profiles = {}; this.visitSt = null; },
  async boot() {
    const Z = this.Z;
    if (!Z.gb && !(Game.S.inv.guestbook > 0) && !Game.S.items.some(i => i.k === 'guestbook')) { Game.S.inv.guestbook = (Game.S.inv.guestbook || 0) + 1; Z.gb = true; UI.toast('收到一本留言本，好友來幫忙時會留下紀錄，放在收納箱', 'i_book', 4.5); Game.save(); }
    Z.gb = true;
    await this.ensureCode();
    await this.publish();
    await this.applyHelps();
    await this.snapshot(true);
    this.lastHelpPoll = Date.now();
  },
  tick() {
    if (!this.ready()) return;
    const now = Date.now();
    if (now - (this.lastHelpPoll || 0) > SOCIAL.helpPollMs) { this.lastHelpPoll = now; this.applyHelps().catch(() => { }); }
    this.snapshot(false).catch(() => { });
    this.publish().catch(() => { });
  },
  // ---------- friend code & public card ----------
  async ensureCode() {
    const Z = this.Z; if (Z.code && Z.codeUid === this.uid) return Z.code;
    for (let i = 0; i < 6; i++) {
      let c = ''; for (let j = 0; j < 6; j++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      try { await this.db().set('codes/' + c, { uid: this.uid, at: '__now__' }); Z.code = c; Z.codeUid = this.uid; Game.save(); return c; }
      catch (e) { if (!e || e.code !== 'permission-denied') throw e; }   // taken: try another
    }
    throw { code: 'code-taken' };
  },
  async publish(force) {
    const Z = this.Z; if (!this.ready() || (!force && Date.now() - (Z.pubAt || 0) < SOCIAL.boardMs)) return;
    const S = Game.S, name = this.myName();
    await this.db().set('profiles/' + this.uid, { name, lvl: S.lvl, pets: this.petCount(), code: Z.code || '', at: '__now__' });
    if (!this.dev()) {
      try { await this.db().set('board/' + this.uid, { name, lvl: S.lvl, coins: Math.max(0, Math.floor(S.coins)), pets: this.petCount(), focus: Math.floor(S.stats.focusMin || 0), w: { [weekKey()]: Math.floor(this.weekFocus()) }, at: '__now__' }); }
      catch (e) { /* rules refuse updates closer than 30 minutes apart; the next window will publish */ }
    }
    Z.pubAt = Date.now(); Game.save();
  },
  // ---------- room snapshot for friends ----------
  helpNeeds() { return Life.L.needs.filter(n => NEED_HELP[n.type] && (n.target != null || n.pet != null)).map(n => ({ id: n.id, type: n.type, target: n.target, pet: n.pet })); },
  snapData() {
    const S = Game.S;
    const items = S.items.map(i => { const o = { uid: i.uid, k: i.k, x: i.x, y: i.y }; for (const f of ['flip', 'on', 'p', 'dx', 'dy', 'closed', 'wilt', 'dust', 'broken', 'pet']) if (i[f] != null && i[f] !== false) o[f] = i[f]; if (i.bq) o.bq = i.bq; return o; });
    const pets = (Game.pets || []).map(a => { const d = a.data; return d ? { id: d.id, sp: d.sp, name: d.name, acc: d.acc || null, x: Math.round(a.x), y: Math.round(a.y), sleep: a.state === 'sleep', flip: !!a.flip, hunger: Math.round(d.hunger) } : null; }).filter(Boolean);
    return { wp: S.wp, fl: S.fl, view: S.view, items, pets, needs: this.helpNeeds(), lvl: S.lvl, ava: sanitizeAvatar(S.avatar) };
  },
  async snapshot(force) {
    const Z = this.Z; if (!this.ready()) return;
    const now = Date.now(), sig = JSON.stringify(this.helpNeeds().map(n => n.id));
    const due = force || now - (Z.roomAt || 0) > SOCIAL.roomMs || (sig !== this.lastNeedSig && now - (Z.roomAt || 0) > SOCIAL.roomMinMs);
    if (!due) return;
    await this.db().set('rooms/' + this.uid, { v: 1, name: this.myName(), data: JSON.stringify(this.snapData()), at: '__now__' });
    this.lastNeedSig = sig; Z.roomAt = now;
  },
  // ---------- friends ----------
  async loadFriends() {
    if (!this.ready()) return;
    this.loading.friends = true; UI.refresh('friends');
    try {
      this.friends = await this.db().list(`users/${this.uid}/friends`, SOCIAL.maxFriends * 2 + 10);
      const now = Date.now();
      await Promise.all(this.friends.filter(f => f.s === 'ok').map(async f => { const c = this.profiles[f.id]; if (c && now - c.got < SOCIAL.boardMs) return; try { const p = await this.db().get('profiles/' + f.id); if (p) this.profiles[f.id] = Object.assign(p, { got: now }); } catch (e) { } }));
      this.err = '';
    } catch (e) { this.err = cloudErr(e); }
    this.loading.friends = false; this.friendsAt = Date.now(); UI.refresh('friends');
  },
  okFriends() { return this.friends.filter(f => f.s === 'ok'); },
  friendName(id) { const p = this.profiles[id], f = this.friends.find(x => x.id === id); return (p && p.name) || (f && f.name) || '好友'; },
  async addFriend(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return UI.toast('好友代碼是 6 個英文字母或數字', 'i_people');
    if (code === this.Z.code) return UI.toast('這是你自己的代碼', 'i_people');
    if (this.friends.filter(f => f.s !== 'in').length >= SOCIAL.maxFriends) return UI.toast(`好友最多 ${SOCIAL.maxFriends} 人`, 'i_people');
    try {
      const c = await this.db().get('codes/' + code); if (!c || !c.uid) return UI.toast('找不到這個好友代碼', 'i_people');
      const fid = c.uid, have = this.friends.find(f => f.id === fid);
      if (have && have.s === 'ok') return UI.toast('你們已經是好友了', 'i_people');
      if (have && have.s === 'in') return this.accept(fid);
      if (have && have.s === 'out') return UI.toast('已經送出邀請，等對方接受', 'i_people');
      const prof = await this.db().get('profiles/' + fid), name = (prof && prof.name) || '小窩住民';
      await this.db().set(`users/${this.uid}/friends/${fid}`, { s: 'out', name, at: '__now__' });
      await this.db().set(`users/${fid}/friends/${this.uid}`, { s: 'in', name: this.myName(), at: '__now__' });
      UI.toast(`已送出好友邀請給${name}，對方接受後就能互相拜訪`, 'i_people', 3.5);
    } catch (e) { UI.toast('送出邀請失敗：' + cloudErr(e), 'i_people', 4); }
    await this.loadFriends();
  },
  async accept(fid) {
    if (this.okFriends().length >= SOCIAL.maxFriends) return UI.toast(`好友最多 ${SOCIAL.maxFriends} 人，先刪掉一位再接受`, 'i_people', 3.5);
    try {
      const f = this.friends.find(x => x.id === fid);
      await this.db().set(`users/${this.uid}/friends/${fid}`, { s: 'ok', name: (f && f.name) || '好友', at: '__now__' });
      await this.db().update(`users/${fid}/friends/${this.uid}`, { s: 'ok', name: this.myName(), at: '__now__' }).catch(() => { });
      UI.toast(`和${(f && f.name) || '好友'}成為好友了！`, 'i_people', 3);
    } catch (e) { UI.toast('接受失敗：' + cloudErr(e), 'i_people', 4); }
    await this.loadFriends();
  },
  async remove(fid, why) {
    const f = this.friends.find(x => x.id === fid), nm = (f && f.name) || '好友';
    if (why === 'remove' && !confirm(`確定要刪除好友「${nm}」嗎？`)) return;
    try { await this.db().del(`users/${this.uid}/friends/${fid}`); await this.db().del(`users/${fid}/friends/${this.uid}`).catch(() => { }); }
    catch (e) { UI.toast('操作失敗：' + cloudErr(e), 'i_people', 4); }
    await this.loadFriends();
  },
  // ---------- visiting ----------
  async visit(fid) {
    if (!this.ready()) return;
    this.visitSt = { fid, name: this.friendName(fid), loading: true }; UI.openWin('visit'); UI.refresh('visit');
    try {
      const r = await this.db().get('rooms/' + fid);
      if (!r) { this.visitSt = { fid, name: this.friendName(fid), empty: true }; }
      else { const d = JSON.parse(r.data); this.visitSt = { fid, name: r.name || this.friendName(fid), d, at: r.at }; }
    } catch (e) { this.visitSt = { fid, name: this.friendName(fid), err: cloudErr(e) }; }
    UI.refresh('visit');
  },
  // ---------- helping ----------
  today() { return Life.today(); },
  helpsToday() { const Z = this.Z; if (Z.hd !== this.today()) { Z.hd = this.today(); Z.hn = 0; Z.helped = {}; } return Z.hn; },
  canHelp(fid, need) {
    if (this.helpsToday() >= SOCIAL.helpsPerDay) return `今天已經幫忙 ${SOCIAL.helpsPerDay} 次了，明天再來吧`;
    if (this.Z.helped[fid + ':' + need.id]) return '這件事你今天已經幫過了';
    return '';
  },
  help(fid, need) {
    const why = this.canHelp(fid, need); if (why) return UI.toast(why, 'i_people', 3);
    const opts = { fid, need, fname: this.visitSt && this.visitSt.name, target: this.targetName(need) };
    if (this.helpsToday() === 0) return this.doHelp(opts);
    Learn.start('help', opts);   // from the second help of the day: 4 words, 3 right to pass
  },
  helpTitle(o) { const k = HELP_KINDS[NEED_HELP[o.need.type]]; return `幫${o.fname || '好友'}${k ? k.v : '忙'}`; },
  helpResult(o, R, n) {
    if (R >= 3) { this.doHelp(o); return { msg: `答對 ${R} 題，幫${o.fname || '好友'}${HELP_KINDS[NEED_HELP[o.need.type]].v}了！` }; }
    return { msg: `要答對 3 題才能幫忙，再試一次吧！` };
  },
  targetName(need) {
    const st = this.visitSt, d = st && st.d; if (!d) return '';
    if (need.pet != null) { const p = d.pets.find(x => x.id === need.pet); return p ? p.name : '寵物'; }
    const it = d.items.find(i => i.uid === need.target); return it && ITEMS[it.k] ? ITEMS[it.k].n : '家具';
  },
  async doHelp(o) {
    const kind = NEED_HELP[o.need.type]; if (!kind) return;
    try {
      await this.db().add(`rooms/${o.fid}/help`, { from: this.uid, name: this.myName(), kind, need: String(o.need.id), target: String(o.need.pet != null ? o.need.pet : o.need.target), day: this.today(), at: '__now__' });
    } catch (e) { return UI.toast('幫忙失敗：' + cloudErr(e), 'i_people', 4); }
    const Z = this.Z; this.helpsToday(); Z.hn++; Z.helped[o.fid + ':' + o.need.id] = 1; Z.total = (Z.total || 0) + 1;
    Game.reward(SOCIAL.helperCoins, SOCIAL.helperXp, 'raw');
    let msg = `${HELP_KINDS[kind].done(o.target || '')}！+${SOCIAL.helperCoins} 金幣、+${SOCIAL.helperXp} 經驗。${o.fname || '好友'}下次上線就會看到。`;
    if (Z.total % SOCIAL.ticketEvery === 0) { Rewards.W.tickets = (Rewards.W.tickets || 0) + 1; msg += ' 累積幫忙 10 次，得到一張抽獎券！'; }
    if (this.visitSt && this.visitSt.d) this.visitSt.d.needs = this.visitSt.d.needs.filter(n => n.id !== o.need.id);
    UI.toast(msg, 'i_people', 4.5); Life.track('help', 1); Game.save(); saveSoon(); UI.refresh('visit'); UI.refresh('friends');
  },
  // owner side: friends' help notes are applied when you come online
  async applyHelps() {
    if (!this.ready()) return;
    const rows = await this.db().list(`rooms/${this.uid}/help`, 60); if (!rows.length) return;
    rows.sort((a, b) => (a.at || 0) - (b.at || 0));
    const Z = this.Z, per = {}, lines = [];
    for (const r of rows) {
      const key = r.from + ':' + r.day; per[key] = (per[key] || 0) + 1;
      if (per[key] <= SOCIAL.helpsPerDay && HELP_KINDS[r.kind]) {
        const n = Life.L.needs.find(x => String(x.id) === r.need && NEED_HELP[x.type] === r.kind);
        let what = HELP_KINDS[r.kind].n;
        if (n) {
          if (r.kind === 'feed') { const p = Pets.get(n.pet); if (p) { p.hunger = Math.min(100, p.hunger + 45); Pets.addBond(p, 1); what = `餵了${p.name}`; } }
          else { what = HELP_KINDS[r.kind].done(Life.targetName(n)); Life.clearTargetFlags(n); }
          Life.drop(n);
        } else what = HELP_KINDS[r.kind].done('') + '（你已經處理好了）';
        Game.reward(1, 0, 'raw');
        Z.guest.unshift({ uid: r.from, name: clipName(r.name) || '好友', kind: r.kind, what, at: r.at || Date.now() }); Z.guest.length = Math.min(Z.guest.length, 50);
        lines.push(`${clipName(r.name) || '好友'}${what}`);
      }
      try { await this.db().del(`rooms/${this.uid}/help/${r.id}`); } catch (e) { }
    }
    if (lines.length) { UI.toast(lines.slice(0, 3).join('、') + (lines.length > 3 ? ` 等 ${lines.length} 件事` : '') + `！每件 +1 金幣`, 'i_people', 5); Game.save(); saveSoon(); UI.refresh('friends'); UI.refresh('tasks'); UI.badges(); }
    this.snapshot(true).catch(() => { });
  },
  // ---------- leaderboard ----------
  BOARDS: [['lvl', '等級', 'lvl'], ['coins', '金幣', 'coins'], ['week', '本週專注', null], ['focus', '總專注', 'focus']],
  boardCache() { try { return JSON.parse(localStorage.getItem('pocketnook.board') || 'null'); } catch (e) { return null; } },
  async loadBoard(force) {
    if (!this.ready()) return;
    const c = this.boardCache(), wk = weekKey();
    if (!force && c && c.uid === this.uid && c.wk === wk && Date.now() - c.at < SOCIAL.boardMs) { this.board = c; return; }
    this.loading.board = true; UI.refresh('friends');
    try {
      const out = { at: Date.now(), uid: this.uid, wk, rows: {} };
      for (const [id, , field] of this.BOARDS) out.rows[id] = (await this.db().top('board', field || `w.${wk}`, SOCIAL.boardTop)).map(r => ({ id: r.id, name: clipName(r.name) || '小窩住民', lvl: r.lvl || 1, coins: r.coins || 0, pets: r.pets || 0, focus: r.focus || 0, week: (r.w || {})[wk] || 0 }));
      this.board = out; try { localStorage.setItem('pocketnook.board', JSON.stringify(out)); } catch (e) { }
      this.err = '';
    } catch (e) { this.err = cloudErr(e); }
    this.loading.board = false; UI.refresh('friends');
  },
};

/* ---------------- guestbook item ---------------- */
SPR.def('guestbook', () => {
  const g = new Grid(16, 22);
  g.rect(7, 9, 2, 11, 'b'); g.vl(7, 9, 11, 'a'); g.rect(4, 19, 8, 2, 'b'); g.hl(4, 20, 8, 'a');
  g.rect(1, 4, 14, 6, 'b'); g.hl(1, 9, 14, 'a');
  g.rect(2, 2, 6, 6, 'w'); g.rect(8, 2, 6, 6, 'v'); g.vl(8, 2, 6, 'x');
  g.hl(3, 4, 4, 'z'); g.hl(3, 6, 3, 'z'); g.hl(9, 4, 4, 'z'); g.hl(9, 6, 3, 'z'); g.pts([[12, 1], [12, 2], [13, 0]], 'r');
  return g.outline();
});
ITEMS.guestbook = { id: 'guestbook', n: '留言本', cat: 'furniture', spr: 'guestbook', price: 0, lvl: 1, layer: 'floor', special: true, comfort: 1 };

/* ---------------- windows ---------------- */
Object.assign(UI.WIN, { friends: { t: '好友', i: 'i_people', w: 460, at: ['r', 0] }, visit: { t: '拜訪', i: 'i_people', w: 760, at: ['c', 0] } });
Object.assign(UI, {
  frTab: 'friends', boardTab: 'lvl',
  openFriends(tab) { this.frTab = tab || this.frTab; this.openWin('friends'); if (Social.ready()) { if (this.frTab === 'board') Social.loadBoard(); else if (!Social.friendsAt || Date.now() - Social.friendsAt > 60000) Social.loadFriends(); } },
  w_friends() {
    const Z = Social.Z, tab = this.frTab;
    const tabs = h('div', { class: 'tabs' }, ...[['friends', '好友'], ['board', '排行榜'], ['guest', '留言本']].map(([k, l]) => h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => this.openFriends(k) }, l)));
    if (!Social.enabled() || !Social.ready()) return [tabs, h('div', { class: 'empty' }, ico('i_people', 40), h('p', { text: Social.enabled() ? '登入雲端帳號並同步完成後，就能加好友、互相拜訪、看排行榜。' : '好友和排行榜需要網站版的雲端帳號（Firebase）。' }), Social.enabled() ? h('button', { class: 'chip primary', onclick: () => this.openWin('account') }, '登入') : null)];
    if (!Social.friendsAt && !Social.loading.friends) setTimeout(() => Social.loadFriends(), 0);
    if (tab === 'board' && !Social.board && !Social.loading.board) setTimeout(() => Social.loadBoard(), 0);
    const out = [tabs]; if (Social.err) out.push(h('p', { class: 'hint warn', text: Social.err }));
    if (tab === 'friends') {
      const left = SOCIAL.helpsPerDay - Social.helpsToday(), prog = (Z.total || 0) % SOCIAL.ticketEvery, tk = Rewards.W.tickets || 0;
      out.push(h('div', { class: 'frme' }, h('div', { class: 'grow' }, h('div', {}, h('b', { text: Social.myName() }), h('button', { class: 'chip sm', onclick: () => this.openWin('account') }, '改名字')), h('div', { class: 'hint', text: '把好友代碼給朋友，對方輸入後按接受就成為好友' })),
        h('div', { class: 'frcode num', text: Z.code || '……' }), h('button', { class: 'chip sm', disabled: !Z.code, onclick: () => { try { navigator.clipboard.writeText(Z.code); UI.toast('已複製好友代碼', 'i_people', 2); } catch (e) { } } }, '複製')));
      const inp = h('input', { id: 'fr-code', type: 'text', maxlength: '8', placeholder: '輸入好友代碼（6 碼）', autocomplete: 'off', onkeydown: e => { if (e.key === 'Enter') Social.addFriend(e.target.value); } });
      out.push(h('div', { class: 'row' }, h('div', { class: 'inset grow' }, inp), h('button', { class: 'chip primary', onclick: () => Social.addFriend(inp.value) }, ico('i_plus', 18), '加好友')));
      out.push(h('div', { class: 'frstat' }, h('span', { text: `今天還能幫忙 ${left} 次` + (Social.helpsToday() === 0 ? '（第 1 次免費，之後要複習 4 個單字）' : '（要先複習 4 個單字）') }),
        h('span', { text: `抽獎券進度 ${prog}/${SOCIAL.ticketEvery}` }), h('button', { class: 'chip sm' + (tk ? ' primary' : ''), disabled: !tk, onclick: () => Rewards.openTicket() }, ico('i_ticket', 16), `抽獎券 ×${tk}`)));
      const ins = Social.friends.filter(f => f.s === 'in'), outs = Social.friends.filter(f => f.s === 'out'), oks = Social.okFriends();
      if (ins.length) out.push(h('div', { class: 'sub', text: `好友邀請（${ins.length}）` }), ...ins.map(f => h('div', { class: 'frrow' }, h('span', { class: 'grow', text: f.name }), h('button', { class: 'chip sm primary', onclick: () => Social.accept(f.id) }, '接受'), h('button', { class: 'chip sm', onclick: () => Social.remove(f.id) }, '拒絕'))));
      out.push(h('div', { class: 'sub', text: `好友（${oks.length}/${SOCIAL.maxFriends}）` }));
      if (Social.loading.friends && !Social.friends.length) out.push(h('p', { class: 'hint', text: '讀取中…' }));
      else if (!oks.length) out.push(h('p', { class: 'hint', text: '還沒有好友。加好友之後可以去對方房間幫忙餵寵物、澆水、清掃。' }));
      out.push(h('div', { class: 'scroll frlist' }, ...oks.map(f => { const p = Social.profiles[f.id] || {}; return h('div', { class: 'frrow' }, h('span', { class: 'grow' }, h('b', { text: p.name || f.name }), h('span', { class: 'hint', text: p.lvl ? ` Lv ${p.lvl} · ${p.pets || 0} 隻寵物` : '' })), h('button', { class: 'chip sm primary', onclick: () => Social.visit(f.id) }, '拜訪'), h('button', { class: 'chip sm', 'aria-label': '刪除好友', onclick: () => Social.remove(f.id, 'remove') }, ico('i_trash', 14))); }),
        ...outs.map(f => h('div', { class: 'frrow' }, h('span', { class: 'grow' }, h('b', { text: f.name }), h('span', { class: 'hint', text: ' 等對方接受' })), h('button', { class: 'chip sm', onclick: () => Social.remove(f.id) }, '取消')))));
      out.push(h('div', { class: 'row' }, h('button', { class: 'chip sm', onclick: () => Social.loadFriends() }, ico('i_reset', 14), '重新整理')));
    } else if (tab === 'board') {
      const B = Social.board, bt = this.boardTab;
      out.push(h('div', { class: 'tabs wrap' }, ...Social.BOARDS.map(([id, l]) => h('button', { class: 'tab sm' + (bt === id ? ' on' : ''), onclick: () => { this.boardTab = id; this.refresh('friends'); } }, l))));
      if (!B) { out.push(h('p', { class: 'hint', text: Social.loading.board ? '讀取中…' : '還沒有資料' })); return out; }
      const rows = B.rows[bt] || [], fmt = (m) => m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : `${m} 分`;
      const val = (r) => bt === 'coins' ? r.coins.toLocaleString() + ' 金' : bt === 'week' ? fmt(r.week) : fmt(r.focus);
      out.push(h('p', { class: 'hint', text: `前 ${SOCIAL.boardTop} 名，每 3 小時更新一次（這份是 ${new Date(B.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })} 的）。用過開發者模式的存檔不列入。` }));
      out.push(h('div', { class: 'scroll' }, h('table', { class: 'board' }, h('thead', {}, h('tr', {}, h('th', { text: '#' }), h('th', { text: '名字' }), h('th', { text: '等級' }), h('th', { text: '寵物' }), h('th', { text: bt === 'coins' ? '金幣' : bt === 'week' ? '本週專注' : '專注時長' }))),
        h('tbody', {}, ...rows.map((r, i) => h('tr', { class: r.id === Social.uid ? 'me' : '' }, h('td', { class: 'num', text: String(i + 1) }), h('td', { text: r.name }), h('td', { class: 'num', text: 'Lv ' + r.lvl }), h('td', { class: 'num', text: String(r.pets) }), h('td', { class: 'num', text: bt === 'lvl' ? fmt(r.focus) : val(r) })))))));
      if (!rows.some(r => r.id === Social.uid)) out.push(h('p', { class: 'hint', text: '你目前不在前 30 名，繼續加油！' }));
    } else {
      const G = Z.guest || [];
      out.push(h('p', { class: 'hint', text: '好友來幫忙時會留下紀錄（最多 50 筆）。' }));
      if (!G.length) out.push(h('div', { class: 'empty' }, ico('i_book', 40), h('p', { text: '留言本還是空的。' })));
      out.push(h('div', { class: 'scroll frlist' }, ...G.map(g => h('div', { class: 'frrow' }, h('span', { class: 'hint', text: new Date(g.at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) }), h('span', { class: 'grow' }, h('b', { text: g.name }), ' ' + g.what),
        Social.okFriends().some(f => f.id === g.uid) ? h('button', { class: 'chip sm', onclick: () => Social.visit(g.uid) }, '回訪') : null))));
    }
    return out;
  },
  w_visit() {
    const V = Social.visitSt; if (!V) return [];
    const head = h('div', { class: 'row between' }, h('b', { text: `${V.name}的小窩` }), h('span', { class: 'hint', text: V.at ? '房間樣子更新於 ' + agoText(V.at) : '' }));
    if (V.loading) return [head, h('p', { class: 'hint center', text: '前往中…' })];
    if (V.err) return [head, h('p', { class: 'hint warn', text: '進不去：' + V.err })];
    if (V.empty) return [head, h('p', { class: 'hint', text: `${V.name}還沒有開放房間（對方要先登入新版遊戲一次）。` })];
    const d = V.d, SC = 3;
    const st = { wp: d.wp, fl: d.fl, view: d.view, gifts: [], items: d.items.map(i => Object.assign({}, i)) };
    const cv = Room.renderStatic(document.createElement('canvas'), st, Room.env ? Room.env.h : 12.5, Room.env ? Room.env.dark : 0);
    const c = cv.getContext('2d');
    for (const p of d.pets.slice().sort((a, b) => a.y - b.y)) { const [k, col] = p.sp.split(':'); const pc = petCanvas(k, col, p.sleep ? 'sleep' : 'sit', 0, p.flip, p.acc); c.drawImage(pc, p.x - Math.floor(pc.width / 2), p.y - canvasBottom(pc)); }
    if (d.ava) { const ac = avatarCanvas('front0', d.ava, null, 0, false); c.drawImage(ac, 196 - Math.floor(ac.width / 2), 160 - ac.height); }
    const big = h('canvas', { class: 'visit-cv' }); big.width = cv.width * SC; big.height = cv.height * SC; const bc = big.getContext('2d'); bc.imageSmoothingEnabled = false; bc.drawImage(cv, 0, 0, big.width, big.height);
    const marks = d.needs.map(n => {
      let x = 120, y = 120;
      if (n.pet != null) { const p = d.pets.find(q => q.id === n.pet); if (!p) return null; x = p.x; y = p.y - 22; }
      else { const it = d.items.find(i => i.uid === n.target); if (!it) return null; const ic = Room.itemCanvas(it); x = it.x + ic.width / 2; y = it.y - 6; }
      const kind = NEED_HELP[n.type], k = HELP_KINDS[kind], done = Social.Z.helped[V.fid + ':' + n.id] && Social.Z.hd === Life.today();
      return h('button', { class: 'vmark' + (done ? ' done' : ''), style: `left:${(x / RW * 100).toFixed(2)}%;top:${(Math.max(4, y) / RH * 100).toFixed(2)}%`, title: k.n, disabled: !!done, onclick: () => Social.help(V.fid, n) }, ico({ feed: 'it_cat_can', water: 'it_fertilizer', dust: 'it_spray' }[kind] || 'i_sparkle', 26), h('span', { text: done ? '已幫忙' : k.n }));
    }).filter(Boolean);
    const left = SOCIAL.helpsPerDay - Social.helpsToday();
    return [head, h('div', { class: 'visit-stage' }, big, ...marks),
      h('p', { class: 'hint', text: marks.length ? `點泡泡幫忙。今天還能幫 ${left} 次` + (Social.helpsToday() === 0 ? '，這次免費。' : '，要先複習 4 個單字（答對 3 題）。') + ' 不會用到你的金幣和道具。' : `${V.name}的房間現在一切都好，沒有需要幫忙的地方。` }),
      h('div', { class: 'row center' }, h('button', { class: 'chip', onclick: () => Social.visit(V.fid) }, ico('i_reset', 16), '重新整理'), h('button', { class: 'chip primary', onclick: () => this.closeWin('visit') }, '回家'))];
  },
});
