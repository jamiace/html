/* ============================================================
   Pet trick shows: the pet really performs, the owner joins in
   - the owner walks over and takes part (offers a hand, does a finger-gun "bang",
     holds up the fire ring, cheers); while the focus timer runs the owner stays at the
     desk and the pet performs alone (the fire ring then stands on its own stand)
   - everything is drawn in the room at the room's pixel scale; the pet sprite is
     rotated / squashed with nearest-neighbour sampling so it stays pixel art
   ============================================================ */
const TRICK_SHOW = {
  sit: { dur: 2.0, owner: 'near', line: (p) => p.kind === 'dog' ? '汪！坐好了' : '喵，坐好了' },
  paw: { dur: 2.8, owner: 'paw', line: () => '握手！' },
  spin: { dur: 2.4, owner: 'near', line: () => '轉圈圈～' },
  backflip: { dur: 2.3, owner: 'near', line: () => '看我的！' },
  bang: { dur: 4.0, owner: 'gun', line: null },
  jordan: { dur: 3.2, owner: 'behind', move: 66, line: () => '起跳！' },
  firering: { dur: 4.0, owner: 'ring', move: 66, line: null },
  moonlean: { dur: 3.8, owner: 'far', line: () => '♪～' },
};
const ease = { out: (k) => 1 - (1 - k) * (1 - k), inOut: (k) => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2 };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));


// standing on the hind legs, seen from the side (used for the 45-degree lean); built from the walk frame's head
// first row with any pixel (the top of what is actually drawn)
function canvasTop(cv) {
  if (cv._top != null) return cv._top;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (cv.alpha[(y * cv.width + x) * 4 + 3]) return (cv._top = y);
  return (cv._top = 0);
}
const STAND_CACHE = {};
function petStandCanvas(kind, color, flip) {
  const key = kind + '|' + color + '|' + (flip ? 1 : 0); if (STAND_CACHE[key]) return STAND_CACHE[key];
  let out = petStandGrid(kind).outline(); const map = PET_COLORS[kind][color]; if (map) out = out.recolor(map); if (flip) out = out.flip();
  return STAND_CACHE[key] = out.toCanvas();
}
// the standing pose before the outline (also the source the baked lean frames were made from)
function petStandGrid(kind) {
  const w = SPR.grid(kind + '_walk0'), W = w.w, g = new Grid(16, 24), light = kind === 'dog' ? 'f' : 'x';
  let top = 0; while (top < w.h && w.a[top].every((c, x) => x < W - 11 || c === '.')) top++;
  g.ellipse(8, 14.5, 4.2, 6, 'v');
  for (let y = 10; y < 20; y++) for (let x = 9; x < 13; x++) if (g.get(x, y) === 'v') g.px(x, y, light);
  if (kind === 'cat') { g.pts([[4, 11], [5, 11], [4, 13], [5, 13], [4, 15], [5, 15]], 'u'); for (const [x, y] of [[3, 19], [2, 18], [1, 17], [1, 16], [1, 15], [2, 14], [2, 13]]) { g.px(x, y, 'v'); g.px(x + 1, y, 'v'); } }
  else for (const [x, y] of [[3, 16], [2, 15], [1, 14], [1, 13]]) { g.px(x, y, 'v'); g.px(x + 1, y, 'v'); }
  g.rect(5, 19, 3, 4, 'v'); g.rect(9, 19, 3, 4, 'v'); g.hl(5, 22, 3, light); g.hl(9, 22, 3, light); g.vl(8, 20, 3, 'u');
  for (let y = top; y < top + 10; y++) for (let x = W - 11; x < W; x++) { const c = w.get(x, y); if (c !== '.' && c !== '0') g.px(x - (W - 11) + 3, y - top, c); }
  g.rect(11, 12, 3, 2, 'v'); g.px(13, 12, light); g.px(13, 13, light);
  return g;
}

const TrickShow = {
  cur: null,
  busy() {
    const S = this.cur;
    if (S && (!Game.pets.includes(S.a) || S.a.state !== 'trick')) this.cancel();
    return !!this.cur;
  },
  start(a, tid) {
    if (this.cur) { UI.toast('正在表演中，看完再點下一個吧', 'i_paw', 2.4); return false; }
    const def = TRICK_SHOW[tid]; if (!def || !a) return false;
    a.leaveSpot(() => this.setup(a, tid, def));
    return true;
  },
  setup(a, tid, def) {
    const A = Game.avatar, owner = !!A && !Game.focusing() && A.state !== 'goingWork';
    let bx = a.x, by = Math.max(110, Math.min(160, a.y));
    // pick a direction with enough floor for tricks that travel, then a start spot that fits
    const need = (def.move || 0) + 30, [xa, xb] = floorX(by);
    let dir = bx < (xa + xb) / 2 ? 1 : -1;
    if (dir > 0 && bx + need > xb - 8) bx = Math.max(xa + 14, xb - 8 - need);
    if (dir < 0 && bx - need < xa + 8) bx = Math.min(xb - 14, xa + 8 + need);
    if (!def.move && def.owner !== 'gun') dir = bx + 30 > xb - 8 ? -1 : bx - 30 < xa + 8 ? 1 : dir;
    const S = this.cur = { a, tid, def, dir, bx, by, t: 0, phase: 'pos', owner, wait: 0, fx: [] };
    // where the owner stands
    const off = { near: 24, far: 38, paw: 14, gun: 34, behind: -22, ring: (def.move || 66) / 2 + 9 }[def.owner] || 24;
    S.ox = bx + dir * off; S.oy = def.owner === 'ring' ? by - 8 : def.owner === 'behind' ? by - 2 : by + 1;
    const [oxa, oxb] = floorX(S.oy); S.ox = Math.max(oxa + 8, Math.min(oxb - 8, S.ox));
    S.ring = def.owner === 'ring' ? { x: bx + dir * ((def.move || 66) / 2), y: by - 13 } : null;
    a.state = 'trick'; a.trick = tid; a.tt = 0; a.walking = false;
    let arrived = 0; const go = () => { if (++arrived >= (owner ? 2 : 1) && this.cur === S && S.phase === 'pos') { S.phase = 'act'; S.t = 0; this.cue(S); } };
    if (Math.abs(a.x - bx) > 1 || Math.abs(a.y - by) > 1) a.walkTo(bx, by, go, true); else go();
    if (owner) {
      if (['sleep', 'sit', 'work', 'deskstand'].includes(A.state)) A.stand();
      A.state = 'show'; A.show = { pose: 'idle' }; S.aspeed = A.speed; A.speed = 38; A.walkTo(S.ox, S.oy, go, true);
    }
  },
  // the show begins: lines, facing
  cue(S) {
    const a = S.a, A = Game.avatar, def = S.def;
    if (S.def.move) a.flip = S.dir < 0; else a.flip = S.owner ? A.x < a.x : S.dir < 0;
    if (S.owner) { A.face = 'side'; A.flip = def.owner === 'behind' ? S.dir < 0 : a.x < A.x; }
    if (def.line) Game.bubble(a, def.line(a), 1.6);
    if (S.owner && S.tid === 'firering') Game.bubble(A, '跳過來！', 1.6);
    if (S.owner && S.tid === 'paw') Game.bubble(A, '握手～', 1.4);
    if (S.tid === 'firering' && !S.owner) Game.bubble(a, '看好囉！', 1.6);
  },
  cancel() { const S = this.cur; if (!S) return; this.cur = null; if (S.a && S.a.state === 'trick') { S.a.walking = false; S.a.onArrive = null; S.a.state = 'sit'; S.a.trick = null; S.a.timer = 2; } const A = Game.avatar; if (A && A.state === 'show') { A.walking = false; A.onArrive = null; A.state = 'idle'; A.show = null; A.timer = 1; } if (A && S.aspeed) A.speed = S.aspeed; },
  finish(S) {
    const a = S.a, A = Game.avatar; this.cur = null;
    a.state = 'sit'; a.trick = null; a.timer = 3; a.happy = 2.2; a.rot = 0;
    for (let i = 0; i < 3; i++) Room.puff('p_heart', a.x - 6 + i * 5, a.y - 18, { vy: -9 - i * 2, vx: (i - 1) * 5 });
    if (A && A.state === 'show') { A.state = 'idle'; A.show = null; A.happy = 2; A.face = 'front'; A.timer = 2.5; } if (A && S.aspeed) A.speed = S.aspeed;
  },
  // ---------- per frame ----------
  update(a, dt) {
    const S = this.cur; if (!S || S.a !== a) { a.state = 'sit'; a.trick = null; return; }
    if (!Game.pets.includes(a)) return this.cancel();
    if (S.phase === 'pos') { S.wait += dt; if (S.wait > 3.5) { a.walking = false; if (S.owner) Game.avatar.walking = false; a.x = S.bx; a.y = S.by; S.phase = 'act'; S.t = 0; this.cue(S); } return; }
    if (S.owner && (Game.focusing() || !Game.avatar || Game.avatar.state !== 'show')) {
      const owner = Game.avatar;
      if (owner && owner.state === 'show') { owner.walking = false; owner.onArrive = null; owner.state = 'idle'; owner.show = null; owner.timer = 0; }
      if (owner && S.aspeed) owner.speed = S.aspeed;
      S.aspeed = null; S.owner = false;
    }
    S.t += dt; const t = S.t, A = S.owner ? Game.avatar : null, f = S.dir;
    const once = (key, at, fn) => { if (t >= at && !S[key]) { S[key] = 1; fn(); } };
    switch (S.tid) {
      case 'sit': once('h1', 1.3, () => Room.puff('p_spark', a.x + (a.flip ? -6 : 6), a.y - 14, { vy: -6 })); break;
      case 'paw': once('h1', 1.0, () => Room.puff('p_heart', (a.x + (A ? A.x : a.x)) / 2 - 2, a.y - 16, { vy: -8 })); break;
      case 'spin': if (Math.random() < dt * 8) Room.puff('p_dot', a.x - 6 + Math.random() * 12, a.y - 1, { vy: -3, vx: (Math.random() - .5) * 10, grav: 10, max: .5 }); break;
      case 'backflip': once('h1', .4, () => Room.puff('p_dot', a.x, a.y - 1, { vy: -4, max: .4 })); once('h2', 1.25, () => { for (let i = 0; i < 4; i++) Room.puff('p_dot', a.x - 6 + i * 4, a.y - 1, { vy: -3, vx: (i - 1.5) * 8, grav: 12, max: .5 }); Room.puff('p_spark', a.x, a.y - 22, { vy: -6 }); }); break;
      case 'bang':
        once('b1', .2, () => { if (A) A.show.pose = 'gun'; });
        once('b2', .85, () => { if (A) { Game.bubble(A, '砰！', 1.3); S.flash = .14; } else Game.bubble(a, '砰？', 1.2); });
        once('b3', 1.0, () => Game.bubble(a, '嗚啊…', 1.2));
        once('b4', 1.95, () => { for (let i = 0; i < 3; i++) Room.puff('p_dot', a.x - 4 + i * 4, a.y - 1, { vy: -3, vx: (i - 1) * 6, grav: 10, max: .4 }); });
        once('b5', 2.0, () => { if (A) A.show.pose = 'idle'; });
        once('b6', 3.15, () => { Game.bubble(a, a.kind === 'dog' ? '汪！騙你的～' : '喵！騙你的～', 1.4); if (A) A.show.pose = 'clap'; });
        if (S.flash > 0) S.flash -= dt;
        break;
      case 'jordan': {
        const hop = [[0, .42], [.46, .88], [.98, 2.18]];
        hop.forEach(([s0], i) => once('j' + i, s0, () => Room.puff('p_dot', a.x, a.y - 1, { vy: -3, vx: -f * 6, grav: 10, max: .4 })));
        once('jl', 2.18, () => { for (let i = 0; i < 5; i++) Room.puff('p_dot', a.x - 8 + i * 4, a.y - 1, { vy: -4, vx: (i - 2) * 8, grav: 14, max: .6 }); if (A) A.show.pose = 'cheer'; });
        if (t > 1.2 && t < 2.0 && Math.random() < dt * 14) Room.puff('p_spark', a.x - f * 6, a.y + a.lift - 8, { vy: 0, vx: -f * 4, max: .35 });
        break;
      }
      case 'firering':
        if (A) A.show.pose = t < 3.3 ? 'hold' : 'idle';
        if (S.ring && t < 3.4 && Math.random() < dt * 6) Room.puff('p_spark', S.ring.x - 3 + Math.random() * 6, S.ring.y - 12, { vy: -8, max: .5 });
        once('f1', 1.75, () => { for (let i = 0; i < 4; i++) Room.puff('p_dot', a.x - 6 + i * 4, a.y - 1, { vy: -3, vx: (i - 1.5) * 8, grav: 12, max: .5 }); if (A) Game.bubble(A, '好棒！', 1.4); });
        break;
      case 'moonlean':
        if (t > 1.0 && t < 2.8 && Math.random() < dt * 3) Room.puff('p_note', a.x - 6 + Math.random() * 12, a.y - 24, { vy: -8, max: 1.2 });
        once('m1', 3.0, () => { if (A) A.show.pose = 'cheer'; });
        break;
    }
    if (A && ['sit', 'spin', 'backflip'].includes(S.tid)) A.show.pose = t < .8 ? 'cue' : t > S.def.dur - 1 ? 'cheer' : 'idle';
    if (A && S.tid === 'paw') A.show.pose = 'hand';
    if (A && S.tid === 'jordan' && t < 2.18) A.show.pose = 'idle';
    // travelling tricks move the pet's real position
    if (S.def.move) a.x = S.bx + f * this.travel(S, t) * S.def.move;
    if (t >= S.def.dur) this.finish(S);
  },
  // 0..1 along the path for travelling tricks
  travel(S, t) {
    if (S.tid === 'jordan') { if (t < .42) return .2 * ease.out(t / .42); if (t < .46) return .2; if (t < .88) return .2 + .22 * ease.out((t - .46) / .42); if (t < .98) return .42; return .42 + .58 * clamp01((t - .98) / 1.2); }
    if (S.tid === 'firering') { if (t < .85) return -.08 * Math.sin(seg(t, 0, .85) * Math.PI); return clamp01((t - .85) / .9); }
    return 0;
  },
  // pose of the pet at time t: sprite pose/frame, lift (negative = up), rotation, scale, extras
  petPose(S, a, t) {
    const f = S.dir, P = { pose: 'sit', fr: Math.floor(t * 2) % 2, flip: a.flip, lift: 0, rot: 0, sx: 1, sy: 1, pivot: 'center', dx: 0 };
    switch (S.tid) {
      case 'sit': if (t < .3) { P.pose = 'walk'; P.fr = 0; } else { P.sy = 1 - .15 * Math.max(0, 1 - (t - .3) / .25); P.lift = t > 1.2 && t < 1.6 ? -Math.round(Math.sin(seg(t, 1.2, 1.6) * Math.PI) * 3) : 0; } break;
      case 'paw': P.pose = 'sit'; P.paw = t > .5 && t < 2.2 ? (t < .8 ? seg(t, .5, .8) : 1) : 0; P.shake = t > .9 && t < 2.0 ? Math.round(Math.sin(t * 22)) : 0; break;
      case 'spin': { const k = seg(t, .2, 2.0), ang = ease.inOut(k) * Math.PI * 4, cs = Math.cos(ang); P.pose = 'walk'; P.fr = Math.floor(t * 10) % 4; P.sx = Math.max(.25, Math.abs(cs)); P.flip = (cs < 0) !== (a.flip); P.lift = -Math.round(Math.abs(Math.sin(ang)) * 2); P.dx = Math.round(Math.sin(ang) * 3); break; }
      case 'backflip': {
        if (t < .4) { P.pose = 'sit'; P.sy = 1 - .2 * seg(t, 0, .35); P.sx = 1 + .1 * seg(t, 0, .35); }
        else if (t < 1.25) { const k = seg(t, .4, 1.25); P.pose = 'walk'; P.fr = 1; P.lift = -Math.sin(k * Math.PI) * 28; P.rot = -f * ease.inOut(k) * Math.PI * 2; }
        else { P.pose = 'sit'; const k = seg(t, 1.25, 1.45); P.sy = 1 - .2 * (1 - k); P.sx = 1 + .12 * (1 - k); if (t > 1.6) P.proud = 1; }
        break;
      }
      case 'bang': {
        if (t < .95) { P.pose = 'sit'; }
        else if (t < 1.5) { P.pose = 'sit'; P.dx = -f * Math.round(seg(t, .95, 1.05) * 2); P.rot = Math.sin((t - .95) * 26) * .18 * (1 - seg(t, .95, 1.5) * .5); }
        else if (t < 1.95) { P.pose = 'walk'; P.fr = 1; P.dx = -f * 2; P.pivot = 'feet'; P.rot = -f * ease.inOut(seg(t, 1.5, 1.95)) * Math.PI / 2; }
        else if (t < 3.15) { P.pose = 'lie'; P.fr = 0; P.flip = !a.flip; P.rot = Math.PI; P.pivot = 'body'; P.lift = 0; P.dead = 1; if (t > 2.6 && t < 2.75) P.dx = Math.round(Math.sin(t * 60)); }
        else { const k = seg(t, 3.15, 3.5); P.pose = 'sit'; P.lift = -Math.round(Math.sin(k * Math.PI) * 8); }
        break;
      }
      case 'jordan': {
        const legs = [[0, .42, 6], [.46, .88, 9]];
        let air = false; for (const [s0, s1, h] of legs) if (t >= s0 && t < s1) { P.lift = -Math.sin(seg(t, s0, s1) * Math.PI) * h; air = true; }
        if (t >= .98 && t < 2.18) {
          const k = seg(t, .98, 2.18), hang = 1 - Math.pow(2 * k - 1, 4); P.lift = -hang * 24; air = true;
          P.sx = 1.12; P.sy = .92; P.rot = -f * (.35 - k * .6);
          if (k > .3 && k < .7) P.star = 1;
        }
        if (t >= 2.18 && t < 2.4) { const k = seg(t, 2.18, 2.4); P.sy = .78 + .22 * k; P.sx = 1.18 - .18 * k; }
        P.pose = air ? 'walk' : t > 2.4 ? 'sit' : 'walk'; P.fr = air ? 1 : Math.floor(t * 10) % 4;
        break;
      }
      case 'firering': {
        if (t < .85) { P.pose = 'walk'; P.fr = Math.floor(t * 8) % 4; P.sy = 1 - .08 * Math.sin(t * 20); }
        else if (t < 1.75) { const k = seg(t, .85, 1.75); P.pose = 'walk'; P.fr = 1; P.lift = -Math.sin(k * Math.PI) * 15; P.sx = 1.15; P.sy = .9; P.rot = -f * (.25 - k * .5); }
        else if (t < 1.95) { P.pose = 'sit'; P.sy = .82 + .18 * seg(t, 1.75, 1.95); }
        else { P.pose = 'sit'; P.flip = !a.flip; P.proud = 1; }
        break;
      }
      case 'moonlean': {
        P.pose = t > .25 && t < 3.0 ? 'stand' : 'sit'; P.fr = 0; P.pivot = 'feet'; P.hat = clamp01((t - .2) / .3);
        // up on the hind legs, the whole body leans 45 degrees forward from the feet: baked frames (sprites_lean.js), no rotation while playing
        if (t > .9 && t < 2.9) { const k = t < 1.4 ? ease.inOut(seg(t, .9, 1.4)) : t > 2.4 ? 1 - ease.inOut(seg(t, 2.4, 2.9)) : 1; P.leanN = Math.round(k * 6); P.rot = P.leanN ? (P.flip ? -1 : 1) * k * Math.PI / 4 : 0; P.spot = 1; }
        if (t > 3.0) { P.hatTip = Math.sin(seg(t, 3.0, 3.5) * Math.PI); P.lift = -Math.round(Math.sin(seg(t, 3.0, 3.4) * Math.PI) * 3); }
        break;
      }
    }
    return P;
  },
  // ---------- drawing ----------
  drawPet(c, a) {
    const S = this.cur; if (!S || S.a !== a) return false;
    const t = S.phase === 'act' ? S.t : 0, d = a.data;
    const P = S.phase === 'act' ? this.petPose(S, a, t) : { pose: a.walking ? 'walk' : 'sit', fr: a.walking ? Math.floor(a.anim * 9) % 4 : 0, flip: a.flip, lift: 0, rot: 0, sx: 1, sy: 1, pivot: 'center', dx: 0 };
    a.lift = P.lift;
    const fr = P.pose === 'walk' ? (P.fr || 0) % 4 : (P.fr || 0) % 2, cv = P.pose === 'stand' ? petStandCanvas(a.kind, a.color, P.flip) : petCanvas(a.kind, a.color, P.pose, fr, P.flip, d && d.acc);
    const x = Math.round(a.x) + (P.dx || 0) + (P.shake || 0) * 0, y = Math.round(a.y), bot = canvasBottom(cv);
    // spotlight for the dance
    if (P.spot) { c.save(); c.globalAlpha = .28; c.fillStyle = '#fff7c2'; c.beginPath(); c.moveTo(x - 4, 0); c.lineTo(x + 4, 0); c.lineTo(x + 16, y); c.lineTo(x - 16, y); c.closePath(); c.fill(); c.globalAlpha = .35; c.beginPath(); c.ellipse(x, y, 16, 4, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    // ring: back half first so the pet passes through it
    if (S.ring && S.phase === 'act' && t < 3.6) this.drawRing(c, S, t, 'back');
    // shadow shrinks while airborne
    const air = Math.min(1, -P.lift / 30); c.fillStyle = `rgba(46,34,48,${(.2 * (1 - air * .6)).toFixed(2)})`; const sw = Math.round(12 * (1 - air * .5)); c.fillRect(x - sw / 2, y - 1, sw, 2);
    const L = P.leanN ? petLeanCanvas(a.kind, a.color, P.flip, P.leanN) : null;
    if (L) {   // the ready-made lean image (assets/sprites/*_lean*.png), hat included
      c.drawImage(L.cv, x - L.ax, y + P.lift - L.ay);
      if (d && d.sick && Math.floor(Room.t * 2) % 2) { c.fillStyle = '#84cbbd'; c.fillRect(x + (P.flip ? -9 : 7), y - 17, 2, 2); }
      return true;
    }
    c.save();
    // 'body' turns around the middle of the drawn pet (not of the whole canvas), so a pet lying on its back stays on the floor
    const top = canvasTop(cv), cyBody = y - (bot - top) / 2 + P.lift;
    const cx = x, cyFeet = y + P.lift, cyMid = y - bot / 2 + P.lift;
    const py = P.pivot === 'feet' || P.pivot === 'toes' ? cyFeet : P.pivot === 'body' ? cyBody : cyMid, toe = P.pivot === 'toes' ? (P.flip ? -1 : 1) * (Math.floor(cv.width / 2) - 4) : 0;
    c.translate(cx + toe, Math.round(py)); if (P.rot) c.rotate(P.rot); if (P.skew) c.transform(1, 0, P.skew, 1, 0, 0); if (P.sx !== 1 || P.sy !== 1) c.scale(P.sx, P.sy);
    const ox = -Math.floor(cv.width / 2) - toe, oy = P.pivot === 'feet' || P.pivot === 'toes' ? -bot : P.pivot === 'body' ? -Math.round((bot + top) / 2) : -Math.round(bot / 2);
    c.drawImage(cv, ox, oy);
    // extras that move with the pet
    if (P.paw) { const col = this.bodyColor(cv), fx = P.flip ? ox + 3 : ox + cv.width - 6, fy = oy + bot - 6 - Math.round(P.paw * 4) + (P.shake || 0); c.fillStyle = '#2e2230'; c.fillRect(fx - 1, fy - 1, 4, 5); c.fillStyle = col; c.fillRect(fx, fy, 2, 3); }
    if (P.hat) { const ht = this.headTop(cv, P.flip), hx = ox + ht[0], hy = oy + ht[1] - 1 - Math.round((1 - P.hat) * 6) - Math.round((P.hatTip || 0) * 3); this.drawHat(c, hx, hy, P.flip); }
    if (P.dead) { const ht = this.headTop(cv, P.flip); c.fillStyle = '#ee8fa0'; c.fillRect(ox + ht[0] + (P.flip ? 2 : -3), oy + ht[1] + 3, 2, 2); }
    c.restore();
    if (P.star) Room.puff('p_spark', x + (Math.random() - .5) * 10, y + P.lift - 6, { vy: 2, max: .3 });
    if (P.proud && Math.random() < .03) Room.puff('p_spark', x + (P.flip ? -6 : 6), y - 18, { vy: -5, max: .6 });
    if (S.ring && S.phase === 'act' && t < 3.6) this.drawRing(c, S, t, 'front');
    if (d && d.sick && Math.floor(Room.t * 2) % 2) { c.fillStyle = '#84cbbd'; c.fillRect(x + (P.flip ? -9 : 7), y - 17, 2, 2); }
    return true;
  },
  bodyColor(cv) { const w = cv.width, al = cv.alpha; if (!al) return '#e8973d'; const o = (Math.floor(cv.height * .55) * w + Math.floor(w / 2)) * 4; return `rgb(${al[o]},${al[o + 1]},${al[o + 2]})`; },
  // top of the head: first opaque row, front half of the sprite
  headTop(cv, flip) {
    const key = flip ? 'ht1' : 'ht0'; if (cv[key]) return cv[key]; const w = cv.width, al = cv.alpha;
    for (let y = 0; y < cv.height; y++) { let xs = []; for (let x = 0; x < w; x++) if (al[(y * w + x) * 4 + 3] && (flip ? x < w * .6 : x > w * .4)) xs.push(x); if (xs.length >= 3) return cv[key] = [Math.round((xs[0] + xs[xs.length - 1]) / 2), y + 1]; }
    return cv[key] = [Math.floor(w / 2), 2];
  },
  drawHat(c, x, y, flip) {
    c.fillStyle = '#2e2230'; c.fillRect(x - 5, y - 1, 11, 2); c.fillRect(x - 3, y - 6, 7, 5);
    c.fillStyle = '#3b3346'; c.fillRect(x - 4, y - 1, 9, 1); c.fillRect(x - 2, y - 5, 5, 4);
    c.fillStyle = '#fff4e0'; c.fillRect(x - 2, y - 2, 5, 1);
    c.fillStyle = '#5a5070'; c.fillRect(flip ? x + 1 : x - 2, y - 5, 1, 2);
  },
  // the flaming hoop, seen from the side: a thin upright ellipse
  drawRing(c, S, t, half) {
    const R = S.ring, A = S.owner ? Game.avatar : null, fade = t > 3.3 ? 1 - seg(t, 3.3, 3.6) : 1;
    let cx = R.x, cy = R.y; if (A && !A.walking) { cx = Math.round(A.x + (A.flip ? -9 : 9)); cy = S.by - 13; R.x = cx; }
    const rx = 6, ry = 11; c.save(); c.globalAlpha = fade;
    if (half === 'back') {
      if (!A || A.walking) { c.fillStyle = '#5e3b2f'; c.fillRect(cx, cy + ry, 1, S.by - (cy + ry)); c.fillRect(cx - 4, S.by - 1, 9, 2); }
      const g = c.createRadialGradient(cx, cy, 2, cx, cy, 22); g.addColorStop(0, 'rgba(255,200,90,0.35)'); g.addColorStop(1, 'rgba(255,200,90,0)'); c.fillStyle = g; c.fillRect(cx - 22, cy - 22, 44, 44);
    }
    for (let i = 0; i < 64; i++) {
      const ang = i / 64 * Math.PI * 2, front = Math.cos(ang) * S.dir * -1 > 0;
      if ((half === 'front') !== front) continue;
      const px = Math.round(cx + Math.cos(ang) * rx), py = Math.round(cy + Math.sin(ang) * ry);
      c.fillStyle = '#4b4560'; c.fillRect(px, py, 1, 1); c.fillStyle = '#77708f'; c.fillRect(px - Math.sign(Math.cos(ang)), py, 1, 1);
      const fl = Math.sin(Room.t * 18 + i * 1.7) * .5 + .5, out = 1 + Math.round(fl * 2);
      const ox = Math.round(Math.cos(ang) * out), oy = Math.round(Math.sin(ang) * out) - (fl > .6 ? 1 : 0);
      c.fillStyle = fl > .7 ? '#fff7c2' : fl > .4 ? '#ffe07a' : '#e8973d'; c.fillRect(px + ox, py + oy, 1, 1); c.fillStyle = '#e8973d'; c.fillRect(px + Math.round(ox / 2), py + Math.round(oy / 2), 1, 1);
      if (fl > .55) { c.fillStyle = '#c4566e'; c.fillRect(px + ox, py + oy - 1, 1, 1); }
    }
    c.restore();
  },
  // owner's arm(s) on top of the side-view sprite
  drawOwner(c, A, cv, x, top) {
    const sh = A.show || { pose: 'idle' }, S = this.cur, t = S && S.phase === 'act' ? S.t : 0, dir = A.flip ? -1 : 1;
    if (sh.pose === 'hand' || sh.pose === 'cheer') return;   // these are real avatar frames (avatar.js)
    // sleeve and skin colours read from the front-facing sprite's own arm (upper arm, forearm, hand)
    const ref = avatarCanvas('front0', A.cfg, null, 0), ral = ref.alpha, rw = ref.width, at = (px, py) => { const o = (py * rw + px) * 4; return ral && ral[o + 3] ? `rgb(${ral[o]},${ral[o + 1]},${ral[o + 2]})` : null; };
    const T0 = 15 + AVA_TOP, sleeve = at(4, T0 + 2) || '#f5909f', fore = at(4, T0 + 3) || sleeve, skin = at(4, T0 + 5) || at(4, T0 + 6) || '#f6cfae';
    const sy = top + 24;
    const line = (x0, y0, x1, y1, col, wdt) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) { const px = Math.round(x0 + (x1 - x0) * i / n), py = Math.round(y0 + (y1 - y0) * i / n); c.fillStyle = typeof col === 'function' ? col(i / n) : col; c.fillRect(px - (wdt >> 1), py - (wdt >> 1), wdt, wdt); } };
    const arm = (ang, len, hand, d = dir) => {
      const ax = x + d * 2, ex = Math.round(ax + Math.cos(ang) * len * d), ey = Math.round(sy + Math.sin(ang) * len);
      line(ax, sy, ex, ey, '#2e2230', 3); line(ax, sy, ex, ey, (k) => k < .55 ? sleeve : fore, 1);
      if (hand === 'gun') {   // finger gun: index finger forward, thumb up
        c.fillStyle = '#2e2230'; c.fillRect(Math.min(ex, ex + d * 3) , ey - 1, 4, 3); c.fillRect(ex - 1, ey - 3, 3, 3);
        c.fillStyle = skin; c.fillRect(ex, ey, 1, 1); c.fillRect(ex + d, ey, 1, 1); c.fillRect(ex + d * 2, ey, 1, 1); c.fillRect(ex, ey - 2, 1, 2);
        return [ex + d * 3, ey];
      }
      c.fillStyle = '#2e2230'; c.fillRect(ex - 1, ey - 1, 3, 3); c.fillStyle = skin; c.fillRect(ex, ey, 1, 1);
      if (hand === 'open') { c.fillStyle = '#2e2230'; c.fillRect(ex - 1 + d, ey - 2, 3, 4); c.fillStyle = skin; c.fillRect(ex + d, ey - 1, 1, 2); c.fillRect(ex, ey, 1, 1); }
      return [ex, ey];
    };
    const up = -Math.PI / 2;
    switch (sh.pose) {
      case 'gun': { const fire = S && S.flash > 0, ang = fire ? -.45 : -.05; const tip = arm(ang, 7, 'gun'); if (fire) { c.fillStyle = '#fff7c2'; c.fillRect(tip[0] - 1 + dir, tip[1] - 2, 3, 5); c.fillRect(tip[0] - 2 + dir, tip[1] - 1, 5, 3); c.fillStyle = '#ffe07a'; c.fillRect(tip[0] + dir * 3, tip[1] - 3, 1, 1); c.fillRect(tip[0] + dir * 3, tip[1] + 3, 1, 1); c.fillRect(tip[0] + dir * 4, tip[1], 1, 1); } break; }
      case 'hand': arm(.35 + Math.sin(t * 22) * (t > .9 && t < 2 ? .12 : 0), 7, 'open'); break;
      case 'hold': arm(-.8, 8); break;
      case 'cue': arm(.6 + Math.sin(t * 6) * .15, 6, 'open'); break;
      case 'clap': { const k = Math.floor(Room.t * 6) % 2; arm(-.2 - k * .2, 5, 'open'); break; }
      case 'cheer': { const k = Math.floor(Room.t * 5) % 2; arm(up + .5 - k * .2, 7, 'open', -dir); arm(up + .5 - k * .2, 7, 'open'); break; }
    }
  },
};
