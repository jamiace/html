/* ============================================================
   Avatar (customisable) and pets
   ============================================================ */
PAL['2'] = '#c68a6a'; PAL['3'] = '#9a6249'; PAL['4'] = '#6e4231'; PAL['5'] = '#e8b48e';
(function () { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  for (const k of '2345') { cx.clearRect(0, 0, 1, 1); cx.fillStyle = PAL[k]; cx.fillRect(0, 0, 1, 1); PAL_RGBA[k] = Array.from(cx.getImageData(0, 0, 1, 1).data); } })();

const AVATAR_OPTS = {
  hair: ['short', 'bob', 'bun', 'long'],
  hairColor: {
    cocoa: null, ink: { O: 'Y', P: 'y', Q: 'z' }, honey: { O: 'u', P: 'w', Q: 'x' }, rose: { O: 'q', P: 'r', Q: 's' },
    sky: { O: 'm', P: 'n', Q: 'o' }, lilac: { O: 'F', P: 'G', Q: 'H' }, ginger: { O: 'L', P: 'M', Q: 'N' }, snow: { O: 'z', P: 'A', Q: 'B' },
  },
  skin: { peach: null, tan: { C: '5', D: '2', E: '3' }, deep: { C: '3', D: '4', E: '4' } },
  shirt: {
    denim: null, rose: { R: 'r', S: 's', T: 't' }, mint: { R: 'j', S: 'k', T: 'l' }, butter: { R: 'v', S: 'w', T: 'x' },
    lilac: { R: 'G', S: 'H', T: 'B' }, oat: { R: 'h', S: 'g', T: 'f' }, coal: { R: 'Y', S: 'y', T: 'z' }, teal: { R: 'I', S: 'J', T: 'K' },
  },
  pants: { navy: null, cocoa: { U: 'a', V: 'b' }, denim: { U: 'm', V: 'n' }, oat: { U: 'h', V: 'g' }, coal: { U: 'Y', V: 'y' } },
};

function makeHead(style, view, eyes) {
  const g = new Grid(18, 22);
  const cx = 9, cy = 8.5, rx = 6.4, ry = 6.0;
  const inSkull = (x, y) => { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; return dx * dx + dy * dy <= 1; };
  const inCap = (x, y) => { const dx = (x + .5 - cx) / (rx + 1.15), dy = (y + .5 - cy + 0.7) / (ry + 1.2); return dx * dx + dy * dy <= 1; };
  const fr = {
    short: [9, 9, 9, 9, 8, 7, 6, 6, 7, 6, 6, 7, 6, 7, 8, 9, 9, 9],
    bob: [12, 12, 12, 12, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 12, 12, 12],
    bun: [10, 10, 10, 9, 8, 6, 6, 5, 6, 6, 5, 6, 6, 6, 8, 9, 10, 10],
    long: [12, 12, 12, 12, 7, 6, 5, 6, 6, 7, 6, 6, 6, 6, 7, 12, 12, 12],
  }[style];
  for (let y = 0; y < 22; y++) for (let x = 0; x < 18; x++) {
    let hair = false;
    if (view === 'front') {
      hair = inCap(x, y) && y < fr[x];
      if (style === 'bob' && ((x >= 1 && x <= 4) || (x >= 13 && x <= 16)) && y >= 5 && y <= 14 && !(y === 14 && (x === 1 || x === 16))) hair = true;
      if (style === 'long' && ((x >= 1 && x <= 4) || (x >= 13 && x <= 16)) && y >= 5 && y <= 19 && !(y >= 18 && (x === 1 || x === 16 || x === 4 || x === 13))) hair = true;
    } else if (view === 'back') {
      hair = inCap(x, y) && (y <= 12 || style !== 'short');
      if (style === 'bob' && x >= 2 && x <= 15 && y >= 6 && y <= 14 && !(y === 14 && (x === 2 || x === 15))) hair = true;
      if (style === 'long' && x >= 2 && x <= 15 && y >= 6 && y <= 19 && !(y === 19 && (x <= 3 || x >= 14))) hair = true;
    } else { // side, facing right
      const sf = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 6, 6, 7, 8, 9, 9];
      const hb = y <= 7 ? 9 : y <= 9 ? 8 : y === 10 ? 7 : y === 11 ? 6 : 5;
      hair = inCap(x, y) && (y < sf[x] || x < hb);
      if (style === 'bob' && x >= 2 && x <= 9 && y >= 6 && y <= 14 && !(y === 14 && x === 2)) hair = true;
      if (style === 'long' && x >= 2 && x <= 8 && y >= 6 && y <= 19 && !(y >= 18 && x <= 3)) hair = true;
      if (style === 'short' && x === 14 && y === 7) hair = false;
    }
    if (style === 'bun') { const bx = view === 'side' ? 6 : 9, by = 1.6; const dx = (x + .5 - bx) / 3, dy = (y + .5 - by) / 2.4; if (dx * dx + dy * dy <= 1) hair = true; }
    if (hair) g.px(x, y, 'P');
    else if (inSkull(x, y)) g.px(x, y, view === 'back' ? 'C' : 'C');
  }
  // shading
  const src = g.clone();
  for (let y = 0; y < 22; y++) for (let x = 0; x < 18; x++) {
    const c = src.get(x, y);
    if (c === 'P') {
      const below = src.get(x, y + 1);
      if (below === 'C' || below === '.' && y > 8) g.px(x, y, 'O');
      else if (x >= 14 && view !== 'side') g.px(x, y, 'O');
      else if (view === 'side' && x <= 3) g.px(x, y, 'O');
      const hx = view === 'side' ? 8 : 6.5;
      if (((x - hx) ** 2) / 10 + ((y - 3.3) ** 2) / 1.3 <= 1) g.px(x, y, 'Q');
      if (style === 'bun' && ((x - (view === 'side' ? 5 : 8)) ** 2) / 2 + ((y - 0.8) ** 2) / 0.6 <= 1) g.px(x, y, 'Q');
    } else if (c === 'C') {
      if (src.get(x, y - 1) === 'P' && view !== 'back') g.px(x, y, 'D');
      if (src.get(x, y + 1) === '.' && x > 9) g.px(x, y, 'D');
    }
  }
  if (view === 'front') {
    if (eyes === 'closed') { g.pts([[5, 10], [6, 10], [11, 10], [12, 10]], 'E'); }
    else if (eyes === 'happy') { g.pts([[5, 10], [6, 9], [7, 10], [10, 10], [11, 9], [12, 10]], '0'); }
    else { g.pts([[6, 9], [6, 10], [11, 9], [11, 10]], '0'); g.pts([[5, 9], [10, 9]], 'D'); }
    g.pts([[4, 11], [13, 11]], 's'); g.px(9, 12, 'E');
  } else if (view === 'side') {
    if (eyes === 'closed') g.pts([[12, 10], [13, 10]], 'E');
    else if (eyes === 'happy') g.pts([[11, 10], [12, 9], [13, 10]], '0');
    else g.pts([[12, 9], [12, 10]], '0');
    g.px(14, 11, 's');
    if (g.get(9, 10) === 'C') { g.px(9, 10, 'D'); g.px(9, 9, 'D'); }
  }
  return g;
}

function makeBody(view, frame) {
  const g = new Grid(18, 13);
  const sh = 'S', shD = 'R', shL = 'T';
  if (view === 'front' || view === 'back' || view === 'sitback' || view === 'sitfront') {
    const isBack = view === 'back' || view === 'sitback';
    g.hl(6, 0, 6, sh); g.hl(5, 1, 8, sh); g.rect(4, 2, 10, 5, sh);
    if (!isBack) { g.vl(5, 1, 3, shL); g.vl(4, 2, 3, shL); g.hl(7, 2, 4, shL); g.px(8, 1, 'C'); g.px(9, 1, 'C'); }
    else { g.vl(5, 1, 2, shL); }
    g.vl(13, 2, 5, shD); g.hl(4, 6, 10, shD);
    if (view === 'front' || view === 'back') {
      // arms (swing by frame)
      const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      const L = 2 + sw, Rr = 2 - sw;
      g.vl(3, L, 3, sh); g.vl(3, L + 3, 1, 'C'); g.px(3, L + 4, 'C'); g.px(3, L, shL);
      g.vl(14, Rr, 3, shD); g.vl(14, Rr + 3, 1, 'C'); g.px(14, Rr + 4, 'D');
      g.rect(4, 7, 10, 2, 'V'); g.vl(13, 7, 2, 'U'); g.px(8, 8, 'U'); g.px(9, 8, 'U');
      const lUp = frame === 1, rUp = frame === 2;
      g.rect(5, 9, 3, lUp ? 1 : 2, 'V'); g.px(7, 9, 'U');
      g.rect(10, 9, 3, rUp ? 1 : 2, 'V'); g.px(12, 9, 'U');
      g.hl(5, lUp ? 10 : 11, 3, '1'); g.hl(10, rUp ? 10 : 11, 3, '1');
      if (!isBack) { g.px(5, lUp ? 10 : 11, 'y'); g.px(10, rUp ? 10 : 11, 'y'); }
    } else if (view === 'sitback') {
      const t = frame === 1 ? 1 : 0;
      g.vl(3, 2, 3, sh); g.px(3, 2, shL); g.vl(14, 2, 3, shD);
      g.px(4, 5 - t, sh); g.px(13, 5 - (1 - t), shD);
      g.rect(4, 7, 10, 2, 'V');
    } else { // sitfront
      g.vl(3, 2, 3, sh); g.px(3, 2, shL); g.vl(14, 2, 3, shD);
      g.px(5, 6, 'C'); g.px(12, 6, 'C'); g.px(4, 5, sh); g.px(13, 5, shD);
      g.rect(3, 7, 12, 2, 'V'); g.hl(3, 7, 12, 'V'); g.vl(14, 7, 2, 'U'); g.px(8, 8, 'U'); g.px(9, 8, 'U');
      g.rect(4, 9, 3, 2, 'U'); g.rect(11, 9, 3, 2, 'U'); g.hl(4, 11, 3, '1'); g.hl(11, 11, 3, '1');
    }
  } else { // side, facing right
    g.hl(7, 0, 4, sh); g.rect(6, 1, 6, 6, sh); g.vl(6, 1, 5, shL); g.vl(11, 2, 5, shD); g.hl(6, 6, 6, shD);
    g.rect(6, 7, 6, 2, 'V'); g.vl(11, 7, 2, 'U');
    const pose = [
      { arm: [8, 2, 0], legs: [[7, 9, 2, 2], [9, 9, 2, 2]], shoes: [[7, 11, 3], [9, 11, 3]] },
      { arm: [10, 2, 1], legs: [[10, 9, 2, 2], [6, 9, 2, 1]], shoes: [[10, 11, 3], [5, 10, 3]] },
      { arm: [8, 2, 0], legs: [[8, 9, 2, 2], [8, 9, 2, 2]], shoes: [[8, 11, 3], [8, 11, 3]] },
      { arm: [6, 2, -1], legs: [[6, 9, 2, 2], [10, 9, 2, 1]], shoes: [[5, 11, 3], [10, 10, 3]] },
    ][frame || 0];
    const [ax, ay, dir] = pose.arm;
    if (dir === 0) { g.vl(8, 2, 4, shD); g.vl(9, 2, 4, sh); g.px(8, 6, 'C'); g.px(9, 6, 'C'); }
    else if (dir > 0) { g.pts([[9, 2], [9, 3], [10, 4], [11, 5]], shD); g.pts([[8, 2], [10, 3], [11, 4]], sh); g.px(12, 5, 'C'); g.px(12, 6, 'C'); }
    else { g.pts([[8, 2], [8, 3], [7, 4], [6, 5]], shD); g.pts([[9, 2], [9, 3], [8, 4]], sh); g.px(5, 5, 'C'); g.px(5, 6, 'C'); }
    for (const [x, y, w, h] of pose.legs) { g.rect(x, y, w, h, 'V'); g.px(x + w - 1, y, 'U'); }
    for (const [x, y, w] of pose.shoes) { g.hl(x, y, w, '1'); }
  }
  return g;
}

// compose avatar frame → Grid 18x26 (head + body), outlined
const AVATAR_FRAMES = {
  front0: ['front', 'front', 0], front1: ['front', 'front', 1], front2: ['front', 'front', 2],
  back0: ['back', 'back', 0], back1: ['back', 'back', 1], back2: ['back', 'back', 2],
  side0: ['side', 'side', 0], side1: ['side', 'side', 1], side2: ['side', 'side', 2], side3: ['side', 'side', 3],
  type0: ['back', 'sitback', 0], type1: ['back', 'sitback', 1],
  sit0: ['front', 'sitfront', 0],
};
// every avatar part is a named sprite so it can be replaced by a PNG of the same name
const HAIR_STYLES = ['short', 'bob', 'bun', 'long'];
for (const st of HAIR_STYLES) {
  for (const v of ['front', 'side']) for (const e of ['open', 'closed', 'happy']) SPR.def(`head_${st}_${v}_${e}`, () => makeHead(st, v, e));
  SPR.def(`head_${st}_back_open`, () => makeHead(st, 'back', 'open'));
}
const BODY_FRAMES = [['front', 0], ['front', 1], ['front', 2], ['back', 0], ['back', 1], ['back', 2], ['side', 0], ['side', 1], ['side', 2], ['side', 3], ['sitback', 0], ['sitback', 1], ['sitfront', 0]];
for (const [v, f] of BODY_FRAMES) SPR.def(`body_${v}_${f}`, () => makeBody(v, f));
function avatarGrid(frame, style, eyes, bob) {
  const [hv, bv, bf] = AVATAR_FRAMES[frame];
  const g = new Grid(20, 30);
  const ev = hv === 'back' ? 'open' : (eyes || 'open');
  const body = SPR.grid(`body_${bv}_${bf}`), head = SPR.grid(`head_${style}_${hv}_${ev}`);
  const isBack = hv === 'back';
  // long hair goes behind body in front view? keep it in front for chibi readability, behind in side view
  g.paste(body, 1, 15);
  g.paste(head, 1, 1 + (bob || 0));
  if (isBack && (bv === 'back' || bv === 'sitback')) { /* hair already covers */ }
  return g.outline();
}
const AVA_CACHE = {};
function avatarCanvas(frame, cfg, eyes, bob, flip) {
  const key = [frame, cfg.hair, cfg.hairColor, cfg.skin, cfg.shirt, cfg.pants, eyes || 'o', bob || 0, flip ? 1 : 0].join('|');
  let c = AVA_CACHE[key];
  if (!c) {
    let g = avatarGrid(frame, cfg.hair, eyes, bob);
    const map = Object.assign({}, AVATAR_OPTS.hairColor[cfg.hairColor] || {}, AVATAR_OPTS.skin[cfg.skin] || {}, AVATAR_OPTS.shirt[cfg.shirt] || {}, AVATAR_OPTS.pants[cfg.pants] || {});
    g = g.recolor(map); if (flip) g = g.flip();
    c = AVA_CACHE[key] = g.toCanvas();
  }
  return c;
}
// sleeping head on pillow (front view, closed eyes)
function sleepHeadCanvas(cfg) {
  const key = 'sleep|' + cfg.hair + cfg.hairColor + cfg.skin;
  let c = AVA_CACHE[key];
  if (!c) {
    const h = SPR.grid(`head_${cfg.hair === 'long' ? 'bob' : cfg.hair}_front_closed`);
    const g = new Grid(20, 18); g.paste(h, 1, 1); g.outline();
    const map = Object.assign({}, AVATAR_OPTS.hairColor[cfg.hairColor] || {}, AVATAR_OPTS.skin[cfg.skin] || {});
    c = AVA_CACHE[key] = g.recolor(map).toCanvas();
  }
  return c;
}

// ================= PETS =================
const PET_COLORS = {
  cat: { ginger: null, grey: { u: 'y', v: 'z', w: 'A', x: 'B' }, ink: { u: 'Y', v: 'y', w: 'z', x: 'A', Y: 'w' }, snow: { u: 'h', v: 'g', w: 'f', x: 'Z' }, cocoa: { u: 'a', v: 'b', w: 'c', x: 'd' } },
  dog: { shiba: null, sesame: { v: 'b', u: 'a' }, cream: { v: 'g', u: 'h', w: 'f' }, coal: { v: 'y', u: 'Y', w: 'g' } },
};
function petBase(kind) { return kind === 'dog' ? { body: 'v', dark: 'u', light: 'f', belly: 'f' } : { body: 'v', dark: 'u', light: 'w', belly: 'x' }; }

function makeCat(pose, f) {
  const g = new Grid(22, 16);
  const B = 'v', D = 'u', L = 'w', BL = 'x';
  if (pose === 'walk') {
    const lift = [[0, 1, 0, 1], [1, 0, 1, 0], [0, 0, 0, 0], [0, 1, 0, 1]][f % 4];
    const sway = [0, 1, 0, -1][f % 4];
    // tail
    const tp = [[4, 9], [3, 8], [2, 7], [2, 6], [2, 5], [3, 4 + (sway > 0 ? 1 : 0)], [4, 4]];
    for (const [x, y] of tp) { g.px(x, y, B); g.px(x + 1, y, B); }
    g.px(4, 3 + (sway < 0 ? 1 : 0), D);
    // body
    g.ellipse(10, 9.5, 6.2, 3.3, B);
    for (let x = 6; x < 15; x++) { if (g.get(x, 12) === B) g.px(x, 12, BL); }
    for (const x of [8, 10, 12]) { g.px(x, 7, D); g.px(x, 8, D); }
    g.hl(7, 7, 6, L);
    // legs
    const legs = [[5, 12], [8, 12], [12, 12], [15, 12]];
    legs.forEach(([x, y], i) => { const up = lift[i]; g.rect(x, y, 2, 2 - up, i % 2 ? D : B); g.px(x, y + 2 - up, BL); g.px(x + 1, y + 2 - up, BL); });
    // head
    g.ellipse(16.5, 7, 3.9, 3.4, B);
    g.pts([[13, 3], [13, 4], [14, 4], [19, 3], [19, 4], [18, 4]], B); g.px(14, 3, B); g.px(18, 3, B);
    g.px(14, 4, 's'); g.px(18, 4, 's');
    g.hl(14, 5, 4, L);
    g.pts([[15, 7], [15, 8], [18, 7], [18, 8]], 'Y');
    g.pts([[16, 9], [17, 9], [18, 9], [19, 9]], BL); g.px(17, 9, 's');
  } else if (pose === 'sit') {
    const t = f % 2;
    g.ellipse(9, 10, 5, 4.6, B);
    g.ellipse(9.5, 11, 3, 3.4, BL);
    for (const y of [7, 9]) { g.px(5, y, D); g.px(6, y, D); }
    // tail wrapping
    for (let x = 4; x <= 13; x++) g.px(x, 14, B);
    g.px(13 + t, 13, B); g.px(14 + t, 12 - t, B); g.px(14, 13, B);
    // front paws
    g.rect(9, 12, 2, 2, B); g.rect(11, 12, 2, 2, B); g.pts([[9, 14], [10, 14], [11, 14], [12, 14]], BL);
    // head
    g.ellipse(11, 5.5, 4.2, 3.6, B);
    g.pts([[7, 1], [7, 2], [8, 2], [7, 3], [14, 1], [14, 2], [13, 2], [14, 3], [8, 3], [13, 3]], B);
    g.px(8, 2, 's'); g.px(13, 2, 's');
    g.hl(8, 3, 6, L);
    g.pts([[9, 5], [9, 6], [12, 5], [12, 6]], 'Y');
    g.pts([[10, 7], [11, 7]], BL); g.px(10, 7, 's'); g.pts([[9, 8], [12, 8]], BL);
  } else { // sleep loaf
    const br = f % 2 ? 0.35 : 0;
    g.ellipse(9.5, 11, 7.2, 3.4 + br, B);
    for (let x = 4; x < 16; x++) if (g.get(x, 13) === B) g.px(x, 13, BL);
    for (const x of [6, 8, 10]) { g.px(x, 8, D); g.px(x, 9, D); }
    g.ellipse(15.5, 10, 3.6, 3, B);
    g.pts([[13, 6], [13, 7], [14, 7], [18, 6], [18, 7], [17, 7]], B); g.px(14, 7, 's'); g.px(17, 7, 's');
    g.pts([[14, 10], [15, 10], [17, 10], [18, 10]], 'Y');
    g.pts([[16, 11], [17, 11]], BL);
    for (let x = 3; x <= 13; x++) g.px(x, 14, B); g.px(2, 13, B); g.px(3, 13, D);
  }
  return g.outline();
}
function makeDog(pose, f) {
  const g = new Grid(24, 18);
  const B = 'v', D = 'u', C = 'f', N = 'Y';
  if (pose === 'walk') {
    const lift = [[0, 1, 0, 1], [1, 0, 1, 0], [0, 0, 0, 0], [0, 1, 0, 1]][f % 4];
    // curled tail
    g.ellipse(5, 6.5, 2.4, 2.2, B); g.px(5, 6, C); g.px(5, 7, D); g.px(4, 6, C);
    g.ellipse(11, 10, 6.6, 3.4, B);
    g.hl(7, 7, 8, D);
    for (let x = 6; x < 17; x++) { if (g.get(x, 12) === B) g.px(x, 12, C); if (g.get(x, 13) === B) g.px(x, 13, C); }
    const legs = [[6, 12], [9, 12], [14, 12], [17, 12]];
    legs.forEach(([x, y], i) => { const up = lift[i]; g.rect(x, y, 2, 3 - up, i % 2 ? D : B); g.px(x, y + 3 - up, C); g.px(x + 1, y + 3 - up, C); });
    g.ellipse(18.5, 7, 3.9, 3.5, B);
    g.pts([[15, 2], [15, 3], [16, 3], [16, 4], [15, 4], [20, 2], [20, 3], [19, 3], [19, 4], [20, 4]], B); g.px(16, 3, 's'); g.px(19, 3, 's');
    g.ellipse(20, 9, 2.6, 1.8, C); g.px(22, 8, N); g.px(22, 9, N);
    g.pts([[17, 6], [17, 7], [20, 6], [20, 7]], 'Y');
    g.pts([[16, 9], [16, 8]], C);
  } else if (pose === 'sit') {
    const t = f % 2;
    g.ellipse(6 + t, 9 - t, 2.2, 2.1, B); g.px(6 + t, 9 - t, C);
    g.ellipse(10, 11, 5.2, 5, B);
    g.ellipse(11.5, 12, 3, 3.8, C);
    g.rect(10, 13, 2, 3, B); g.rect(13, 13, 2, 3, B); g.pts([[10, 16], [11, 16], [13, 16], [14, 16]], C);
    g.rect(6, 15, 4, 1, D);
    g.ellipse(12.5, 6, 4.3, 3.8, B);
    g.pts([[9, 1], [9, 2], [10, 2], [9, 3], [10, 3], [16, 1], [16, 2], [15, 2], [16, 3], [15, 3]], B); g.px(10, 2, 's'); g.px(15, 2, 's');
    g.ellipse(12.5, 8.2, 2.6, 1.7, C); g.px(12, 7, N); g.px(13, 7, N);
    g.pts([[10, 5], [10, 6], [15, 5], [15, 6]], 'Y');
    g.pts([[9, 7], [16, 7]], C);
  } else {
    const br = f % 2 ? 0.35 : 0;
    g.ellipse(10.5, 12, 8, 3.6 + br, B);
    g.hl(5, 9, 9, D);
    for (let x = 4; x < 18; x++) if (g.get(x, 14) === B) g.px(x, 14, C);
    g.ellipse(4, 12, 2.2, 2, B); g.px(4, 12, C);
    g.ellipse(17.5, 11, 3.8, 3.1, B);
    g.pts([[15, 7], [15, 8], [16, 8], [20, 7], [20, 8], [19, 8]], B); g.px(16, 8, 's'); g.px(19, 8, 's');
    g.ellipse(19, 12.6, 2.3, 1.3, C); g.px(21, 12, N);
    g.pts([[16, 11], [17, 11], [19, 11], [20, 11]], 'Y');
  }
  return g.outline();
}
const PET_CACHE = {};
function petCanvas(kind, color, pose, f, flip) {
  const key = [kind, color, pose, f, flip ? 1 : 0].join('|');
  let c = PET_CACHE[key];
  if (!c) {
    let g = SPR.grid(`${kind}_${pose}${f}`);
    const map = PET_COLORS[kind][color]; if (map) g = g.recolor(map); if (flip) g = g.flip();
    c = PET_CACHE[key] = g.toCanvas();
  }
  return c;
}

for (const p of ['walk0', 'walk1', 'walk2', 'walk3', 'sit0', 'sit1', 'sleep0', 'sleep1']) {
  SPR.def('cat_' + p, () => makeCat(p.replace(/\d/, ''), +p.slice(-1)));
  SPR.def('dog_' + p, () => makeDog(p.replace(/\d/, ''), +p.slice(-1)));
}
