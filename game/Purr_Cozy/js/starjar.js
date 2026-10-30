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
  ;
  ;
  ;
})();
// inner area that fills with stars, in sprite pixels: x0..x1, y0 (top) .. y1 (bottom)
const JARS = { d: { k: 'star_jar_d', x0: 2, x1: 6, y0: 4, y1: 10 }, w: { k: 'star_jar_w', x0: 2, x1: 10, y0: 4, y1: 16 } };
Object.assign(ITEMS, {
  star_jar_d: { n: I18n.s("u_a0422fbf91cb"), cat: 'decor', spr: 'star_jar_d', price: 0, lvl: 1, layer: 'decor', giftOnly: true, jar: 'd', act: 'starJar', desc: I18n.s("u_50258ad37ea0") },
  star_jar_w: { n: I18n.s("u_dd8c84a00f0d"), cat: 'decor', spr: 'star_jar_w', price: 0, lvl: 1, layer: 'decor', giftOnly: true, jar: 'w', act: 'starJar', desc: I18n.s("u_a96245ed136a") },
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
  draw(c,x,y,it,t,cv){if(Room.uidMap[it.uid]!==it)return;const type=ITEMS[it.k].jar,J=JARS[type],state=this.state(type);if(!state)return;const rows=J.y1-J.y0+1,n=state.k>0?Math.max(1,Math.round(state.k*rows)):0,phase=Math.floor(t*1.2)%2;let im=PNGArt.image(`assets/png/jars/${type}_${n}_${state.done?1:0}_${phase}.png`);if(it.flip)im=PNGArt.flip(im);c.drawImage(im,x,y);if(state.claim&&Math.random()<.04)Room.puff('p_star',x+Math.random()*cv.width,y+2+Math.random()*6,{vy:-6,max:.8});},

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
    if (!this.placed(type).length && !(S.inv[k] > 0)) { S.inv[k] = (S.inv[k] || 0) + 1; UI.toast(I18n.s("u_9d8515690170", [ITEMS[k].n]), 'i_star', 5, { label: I18n.s("u_888f1eb65671"), fn: () => { UI.stoTab = 'items'; UI.openWin('storage'); } }); UI.refresh('storage'); }
    Game.save();
  },
  tip(it) {
    const d = ITEMS[it.k]; if (!d || !d.jar) return null;
    const s = this.state(d.jar), n = TEAM_TYPES[d.jar].n;
    if (!s) return I18n.s("u_7917d4fd0ed3", [d.n, n]);
    const def = TEAM_TASKS[s.task];
    return I18n.s("u_f3e4c6544fb0", [n, def ? def.n : '', s.total, s.goal, def ? ' ' + def.unit : '']) + (s.done ? (s.claim ? I18n.s("u_f81df4588f8f") : I18n.s("u_7bc73c5f0bd3")) : '');
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
