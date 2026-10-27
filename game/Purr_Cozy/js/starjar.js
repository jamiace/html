/* ============================================================
   Team star jars: the team task's progress, as a jar of stars in the room
   - two jars: a small one for the daily team, a bigger one for the weekly team
   - the stars rise with the team's total (yours plus your teammates', from the reads the
     team code already does; nothing extra is read or written)
   - a star drops in each time you add to the task; a full jar gets its lid tied and
     sparkles until the reward is claimed; with no team the jar is empty
   - the first time you join a team of that kind the jar is given to you (in the storage box)
   - hover shows the exact numbers, a click opens the team tab
   ============================================================ */
(function () {
  const GL = ['#9fc3cf', '#cfe6ee', '#f4fbff'].map(palAdd), CK = ['#8a5a36', '#b98352', '#d9aa74'].map(palAdd);
  const jar = (W, H, neck) => () => {
    const g = new Grid(W, H), nx = Math.floor((W - neck) / 2);
    g.rect(nx, 0, neck, 2, CK[1]); g.hl(nx, 0, neck, CK[2]); g.hl(nx, 1, neck, CK[0]);
    g.rect(nx, 2, neck, 1, GL[1]);
    g.rect(0, 4, W, H - 5, GL[1]); g.hl(1, 3, W - 2, GL[1]); g.hl(1, H - 1, W - 2, GL[0]);
    for (let y = 4; y < H - 1; y++) { g.px(W - 1, y, GL[0]); g.px(1, y, GL[2]); }
    g.px(2, 4, GL[2]);
    return g.outline();
  };
  SPR.def('star_jar_d', jar(9, 13, 5));
  SPR.def('star_jar_w', jar(13, 19, 7));
  SPR.def('p_star', () => Grid.rows(['.X.', 'XWX', '.X.']));
})();
// inner area that fills with stars, in sprite pixels: x0..x1, y0 (top) .. y1 (bottom)
const JARS = { d: { k: 'star_jar_d', x0: 2, x1: 6, y0: 4, y1: 10 }, w: { k: 'star_jar_w', x0: 2, x1: 10, y0: 4, y1: 16 } };
Object.assign(ITEMS, {
  star_jar_d: { n: '每日星星罐', cat: 'decor', spr: 'star_jar_d', price: 0, lvl: 1, layer: 'decor', giftOnly: true, jar: 'd', act: 'starJar', desc: '每日團隊任務的進度會變成罐子裡的星星。' },
  star_jar_w: { n: '每週星星罐', cat: 'decor', spr: 'star_jar_w', price: 0, lvl: 1, layer: 'decor', giftOnly: true, jar: 'w', act: 'starJar', desc: '每週團隊任務的進度會變成罐子裡的星星。' },
});
for (const k of ['star_jar_d', 'star_jar_w']) ITEMS[k].id = k;

const StarJar = {
  // 0..1 and the numbers, or null when you are not in a team of that kind
  state(type) {
    if (typeof Team === 'undefined' || !Team.ready || !Team.ready()) return null;
    const st = Team.inTeam(type); if (!st) return null;
    const tm = Team.teams[st.id]; const goal = tm ? tm.goal : Team.goal(type, st.task);
    let total = tm ? Team.shown(tm).reduce((n, m) => n + Team.contrib(tm, m), 0) : Math.floor(st.mine || 0);
    if (tm && !Team.shown(tm).includes(Team.uid())) total += Math.floor(st.mine || 0);
    const done = !!(tm && tm.doneAt) || total >= goal;
    return { total: Math.min(total, goal), goal, k: done ? 1 : Math.min(1, total / Math.max(1, goal)), done, claim: done && Team.claimableN && Team.claimableN() > 0, task: tm ? tm.task : st.task };
  },
  draw(c, x, y, it, t, cv) {
    if (Room.uidMap[it.uid] !== it) return;   // a friend's room preview: their progress is not known here
    const d = ITEMS[it.k], J = JARS[d.jar], s = this.state(d.jar); if (!s) return;
    const rows = J.y1 - J.y0 + 1, n = s.k > 0 ? Math.max(1, Math.round(s.k * rows)) : 0;
    for (let r = 0; r < n; r++) {
      const yy = J.y1 - r;
      for (let xx = J.x0; xx <= J.x1; xx++) {
        // little stars: bright points on a warm gold pile, a few of them twinkling
        const hv = hsh(xx, yy, it.uid), star = hv % 4 === 0, tw = star && Math.floor(t * 1.2 + (hv % 11)) % 6 === 0;
        c.fillStyle = tw ? '#ffffff' : star ? '#fff1a8' : hv % 3 === 0 ? '#f2b23c' : '#ffd45a';
        c.fillRect(x + (it.flip ? cv.width - 1 - xx : xx), y + yy, 1, 1);
      }
    }
    if (s.done) {   // lid tied with a ribbon; sparkles while the reward waits
      const nx = Math.floor(cv.width / 2); c.fillStyle = '#e86a7a'; c.fillRect(x + nx - 2, y + 2, 5, 1); c.fillRect(x + nx + 2, y + 3, 1, 2);
      if (s.claim && Math.random() < 0.04) Room.puff('p_star', x + Math.random() * cv.width, y + 2 + Math.random() * 6, { vy: -6, max: 0.8 });
    }
  },
  placed(type) { return Room.state.items.filter(i => ITEMS[i.k] && ITEMS[i.k].jar === type); },
  // a star falls into the jar
  drop(type) {
    for (const it of this.placed(type)) {
      const cv = Room.itemCanvas(it), cx = it.x + cv.width / 2 - 1;
      Room.puff('p_star', cx, it.y - 10, { vy: 14, grav: 30, max: 0.55 });
    }
  },
  give(type) {
    const k = JARS[type].k, S = Game.S; if (!S.jarGiven) S.jarGiven = {};
    if (S.jarGiven[type]) return; S.jarGiven[type] = true;
    if (!this.placed(type).length && !(S.inv[k] > 0)) { S.inv[k] = (S.inv[k] || 0) + 1; UI.toast(`收到「${ITEMS[k].n}」！到收納箱把它擺出來（桌上、架子上或地上都可以），團隊進度會變成星星`, 'i_star', 5, { label: '收納箱', fn: () => { UI.stoTab = 'items'; UI.openWin('storage'); } }); UI.refresh('storage'); }
    Game.save();
  },
  tip(it) {
    const d = ITEMS[it.k]; if (!d || !d.jar) return null;
    const s = this.state(d.jar), n = TEAM_TYPES[d.jar].n;
    if (!s) return `${d.n}：還沒有加入${n}團隊`;
    const def = TEAM_TASKS[s.task];
    return `${n}團隊「${def ? def.n : ''}」${s.total}/${s.goal}${def ? ' ' + def.unit : ''}` + (s.done ? (s.claim ? '・完成！可以領獎勵' : '・完成') : '');
  },
};
ITEMS.star_jar_d.anim = ITEMS.star_jar_w.anim = (c, x, y, it, t, cv) => StarJar.draw(c, x, y, it, t, cv);
Fun.starJar = () => UI.openTasks('team');
(function () {
  const tag = Pets.ownerTag.bind(Pets); Pets.ownerTag = function (it) { return StarJar.tip(it) || tag(it); };
  const on = Team.onTrack.bind(Team);
  Team.onTrack = function (ev, n) {
    for (const type of ['d', 'w']) { const st = this.inTeam(type), def = st && TEAM_TASKS[st.task]; if (def && def.ev.includes(ev)) StarJar.drop(type); }
    return on(ev, n);
  };
  const mark = Team.mark.bind(Team); Team.mark = function (type, id, task) { const r = mark(type, id, task); StarJar.give(type); return r; };
  // already in a team from before this update: the jar is given on the next check
  setInterval(() => { try { if (Game.S && Team.ready && Team.ready()) for (const type of ['d', 'w']) if (Team.inTeam(type)) StarJar.give(type); } catch (e) { } }, 15000);
})();
