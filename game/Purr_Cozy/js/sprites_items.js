/* ============================================================
   Furniture, wall pieces, decor — hand-painted pixel art
   ============================================================ */

// ---------- helpers ----------
function leaf(g, x0, y0, len, ang, maxW, ramp, opts = {}) {
  // lens-shaped leaf from (x0,y0) along angle; ramp = [dark, mid, light, highlight]
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R = Math.ceil(len + maxW + 2);
  for (let y = Math.floor(y0 - R); y <= y0 + R; y++) for (let x = Math.floor(x0 - R); x <= x0 + R; x++) {
    const dx = x + 0.5 - x0, dy = y + 0.5 - y0;
    const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
    if (u < 0 || u > len) continue;
    const t = u / len;
    const w = maxW * Math.pow(Math.sin(Math.PI * Math.min(1, t * (opts.tip || 1))), 0.75) * (opts.round ? 1 : 1);
    if (Math.abs(v) > w) continue;
    if (opts.holes && t > 0.25 && t < 0.85 && Math.abs(v) > w * 0.35 && Math.abs(v) < w * 0.8 && Math.floor(u) % 4 === 1) continue;
    let c;
    if (Math.abs(v) < 0.55 && t < 0.92) c = ramp[0];
    else if (v < -w * 0.35) c = (t > 0.2 && t < 0.6 && v < -w * 0.6) ? ramp[3] : ramp[2];
    else c = ramp[1];
    if (Math.abs(v) > w - 0.9 && v > 0) c = ramp[0];
    g.px(x, y, c);
  }
}
function woodgrain(g, x, y, w, h, c, on, seed, dens = 0.05, vert = false) {
  const r = rng(seed);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    if (g.get(i, j) !== on || r() > dens) continue;
    const L = 2 + Math.floor(r() * 4);
    for (let k = 0; k < L; k++) { const xx = vert ? i : i + k, yy = vert ? j + k : j; if (g.get(xx, yy) === on) g.px(xx, yy, c); }
  }
}
function line(g, x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) { g.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function pot(g, cx, top, w, h, ramp = ['L', 'M', 'N', 'g']) {
  // terracotta pot: rim + tapered body
  const x = Math.round(cx - w / 2);
  g.rect(x, top, w, 3, ramp[1]); g.hl(x, top, w, ramp[2]); g.hl(x, top + 2, w, ramp[0]);
  for (let j = 0; j < h - 3; j++) {
    const inset = Math.round(j * 1.6 / (h - 3) + 1);
    g.hl(x + inset, top + 3 + j, w - inset * 2, ramp[1]);
    g.px(x + inset, top + 3 + j, ramp[2]);
    g.px(x + w - inset - 1, top + 3 + j, ramp[0]);
    g.px(x + w - inset - 2, top + 3 + j, ramp[0]);
  }
}
const BOOKS = [['m', 'n', 'o'], ['q', 'r', 's'], ['i', 'j', 'k'], ['u', 'v', 'w'], ['F', 'G', 'H'], ['I', 'J', 'K'], ['L', 'M', 'N'], ['y', 'z', 'A']];
function books(g, x0, x1, yb, seed, maxH = 10) {
  const r = rng(seed); let x = x0;
  while (x < x1 - 1) {
    const w = 2 + Math.floor(r() * 2), h = maxH - 3 + Math.floor(r() * 4);
    if (x + w > x1) break;
    const c = BOOKS[Math.floor(r() * BOOKS.length)], top = yb - h + 1;
    if (r() < 0.12 && x > x0) { x += 2; continue; }
    g.rect(x, top, w, h, c[1]); g.vl(x, top, h, c[2]);
    if (w > 2) g.vl(x + w - 1, top, h, c[0]);
    g.hl(x, top + 2, w, r() < 0.5 ? 'x' : 'f'); g.hl(x, top, w, c[2]);
    x += w;
  }
}

// ================= FLOOR FURNITURE =================
SPR.def('desk', () => {
  const g = new Grid(42, 26);
  g.rect(1, 1, 40, 5, 'd'); g.hl(1, 1, 40, 'e'); woodgrain(g, 2, 2, 38, 3, 'c', 'd', 11, 0.06); g.hl(3, 2, 7, 'e');
  g.rect(1, 6, 40, 2, 'c'); g.hl(1, 7, 40, 'b'); g.px(1, 1, '.'); g.px(40, 1, '.');
  g.hl(5, 8, 22, 'a');
  g.rect(3, 8, 3, 17, 'b'); g.vl(3, 8, 17, 'c'); g.vl(5, 9, 16, 'a');
  g.rect(27, 8, 13, 17, 'c'); g.vl(27, 8, 17, 'd'); g.vl(39, 8, 17, 'b');
  g.hl(27, 13, 13, 'b'); g.hl(28, 14, 11, 'd'); g.hl(27, 19, 13, 'b'); g.hl(28, 20, 11, 'd'); g.hl(27, 24, 13, 'a');
  for (const y of [10, 16, 22]) { g.hl(32, y, 3, 'a'); g.px(33, y - 1, 'e'); }
  return g.outline();
});
SPR.def('desk_white', () => SPR.grid('desk').recolor({ a: 'z', b: 'A', c: 'B', d: 'f', e: 'Z' }));

SPR.def('chair', () => {
  const g = new Grid(16, 25);
  g.rect(2, 1, 12, 12, 'c'); g.cut(2, 1, 12, 12, 2); g.hl(4, 1, 8, 'e'); g.hl(3, 2, 10, 'd');
  g.rect(4, 4, 8, 7, 'n'); g.hl(4, 4, 8, 'o'); g.vl(4, 4, 7, 'o'); g.hl(5, 10, 7, 'm'); g.vl(11, 5, 6, 'm'); g.px(5, 5, 'p');
  g.rect(1, 13, 14, 2, 'd'); g.hl(1, 13, 14, 'e'); g.rect(1, 15, 14, 1, 'b');
  g.vl(2, 16, 8, 'b'); g.vl(13, 16, 8, 'b'); g.vl(3, 16, 8, 'c');
  g.vl(5, 16, 5, 'a'); g.vl(10, 16, 5, 'a');
  return g.outline();
});

SPR.def('bed', () => {
  const g = new Grid(48, 35);
  // headboard with posts
  g.rect(3, 2, 42, 12, 'c'); g.hl(3, 2, 42, 'd'); g.hl(3, 3, 42, 'd');
  g.rect(1, 1, 4, 14, 'b'); g.vl(1, 1, 14, 'c'); g.hl(1, 1, 4, 'd'); g.cut(1, 1, 4, 14, 1);
  g.rect(43, 1, 4, 14, 'b'); g.vl(43, 1, 14, 'c'); g.hl(43, 1, 4, 'd'); g.cut(43, 1, 4, 14, 1);
  g.rect(7, 5, 34, 6, 'b'); g.rect(8, 6, 32, 4, 'd'); woodgrain(g, 8, 6, 32, 4, 'c', 'd', 3, 0.07); g.hl(9, 6, 6, 'e');
  // mattress + sheet
  g.rect(2, 12, 44, 17, 'f'); g.vl(45, 12, 17, 'g');
  // pillows
  for (const px of [6, 26]) {
    g.rect(px, 11, 16, 7, 'h'); g.rect(px + 1, 12, 14, 5, 'f'); g.hl(px + 1, 16, 14, 'g'); g.hl(px + 2, 12, 6, 'Z');
    g.px(px, 11, '.'); g.px(px + 15, 11, '.'); g.px(px, 17, '.'); g.px(px + 15, 17, '.');
  }
  // blanket
  g.rect(1, 18, 46, 11, 'n'); g.hl(1, 18, 46, 'f'); g.hl(1, 19, 46, 'p'); g.hl(1, 20, 46, 'o');
  for (let y = 22; y < 27; y += 3) for (let x = 3 + (y % 2) * 3; x < 46; x += 6) { g.px(x, y, 'o'); g.px(x + 1, y, 'o'); }
  g.hl(1, 27, 46, 'm'); g.hl(1, 28, 46, 'm'); g.vl(1, 20, 9, 'o');
  // frame front
  g.rect(2, 29, 44, 3, 'b'); g.hl(2, 29, 44, 'c'); g.hl(2, 31, 44, 'a');
  g.rect(3, 32, 3, 2, 'a'); g.rect(42, 32, 3, 2, 'a');
  return g.outline();
});

SPR.def('bookshelf', () => {
  const g = new Grid(28, 47);
  g.rect(1, 1, 26, 44, 'b'); g.hl(1, 1, 26, 'd'); g.hl(1, 2, 26, 'c');
  g.vl(1, 3, 42, 'c'); g.vl(26, 3, 42, 'a');
  g.rect(3, 4, 22, 37, 'a');
  for (const y of [15, 28]) { g.hl(3, y, 22, 'd'); g.hl(3, y + 1, 22, 'c'); }
  g.rect(3, 41, 22, 3, 'c'); g.hl(3, 41, 22, 'd');
  for (const y of [4, 17, 30]) g.hl(3, y, 22, '1');
  books(g, 3, 25, 14, 5, 10);
  books(g, 3, 18, 27, 9, 10);
  // little potted plant in middle shelf
  pot(g, 21, 23, 5, 5); leaf(g, 21, 23, 5, -2.1, 1.6, ['i', 'j', 'k', 'l']); leaf(g, 21, 23, 5, -1.1, 1.6, ['i', 'j', 'k', 'l']);
  books(g, 3, 13, 40, 21, 10);
  // box on bottom shelf
  g.rect(14, 35, 10, 6, 'h'); g.hl(14, 35, 10, 'f'); g.vl(23, 35, 6, 'b'); g.hl(17, 37, 4, 'b');
  g.rect(1, 44, 26, 1, 'a'); g.rect(2, 45, 3, 1, 'a'); g.rect(23, 45, 3, 1, 'a');
  return g.outline();
});

SPR.def('wardrobe', () => {
  const g = new Grid(36, 54);
  g.rect(1, 1, 34, 4, 'd'); g.hl(1, 1, 34, 'e'); g.hl(1, 4, 34, 'b');
  g.rect(2, 5, 32, 43, 'c'); g.vl(2, 5, 43, 'd'); g.vl(33, 5, 43, 'b');
  g.vl(17, 5, 43, 'a'); g.vl(18, 5, 43, 'd');
  for (const x of [5, 21]) {
    g.rect(x, 8, 10, 16, 'b'); g.rect(x + 1, 9, 8, 14, 'd'); woodgrain(g, x + 1, 9, 8, 14, 'c', 'd', x, 0.05, true);
    g.rect(x, 27, 10, 17, 'b'); g.rect(x + 1, 28, 8, 15, 'd'); woodgrain(g, x + 1, 28, 8, 15, 'c', 'd', x + 7, 0.05, true);
  }
  g.rect(15, 23, 1, 4, 'u'); g.px(15, 23, 'w'); g.rect(20, 23, 1, 4, 'u'); g.px(20, 23, 'w');
  g.rect(1, 48, 34, 3, 'b'); g.hl(1, 48, 34, 'c'); g.rect(3, 51, 3, 2, 'a'); g.rect(30, 51, 3, 2, 'a');
  return g.outline();
});

SPR.def('lamp_floor', () => {
  const g = new Grid(16, 44);
  for (let r = 0; r < 11; r++) {
    const hw = 4 + Math.floor(r * 0.45), x = 8 - hw;
    g.hl(x, 1 + r, hw * 2, 'g'); g.px(x, 1 + r, 'f'); g.px(x + 1, 1 + r, 'f'); g.px(x + hw * 2 - 1, 1 + r, 'h');
    if (r % 3 === 1) g.px(x + hw, 1 + r, 'h');
  }
  g.hl(3, 11, 10, 'h');
  g.vl(7, 12, 27, 'z'); g.vl(8, 12, 27, 'y');
  g.rect(4, 39, 8, 2, 'y'); g.hl(4, 39, 8, 'z'); g.hl(5, 41, 6, 'y');
  return g.outline();
});
SPR.def('lamp_floor_on', () => SPR.grid('lamp_floor').recolor({ g: 'X', f: 'W', h: 'w' }));

// ---- plants ----
SPR.def('plant_monstera', () => {
  const g = new Grid(30, 40); const G1 = ['i', 'j', 'k', 'l'];
  line(g, 15, 27, 9, 14, 'i'); line(g, 15, 27, 21, 12, 'i'); line(g, 15, 27, 15, 8, 'i'); line(g, 15, 27, 6, 22, 'i'); line(g, 15, 27, 24, 21, 'i');
  leaf(g, 15, 13, 11, -1.62, 5.2, G1, { holes: true });
  leaf(g, 12, 18, 11, -2.55, 5, G1, { holes: true });
  leaf(g, 18, 17, 11, -0.55, 5, G1, { holes: true });
  leaf(g, 13, 24, 9, 2.9, 4, G1, { holes: true });
  leaf(g, 17, 24, 9, 0.2, 4, G1, { holes: true });
  pot(g, 15, 27, 14, 11);
  return g.outline();
});
SPR.def('plant_snake', () => {
  const g = new Grid(16, 32);
  const blades = [[5, -1.75, 15], [8, -1.57, 19], [11, -1.4, 16], [7, -1.95, 11], [10, -1.2, 12]];
  for (const [x, a, l] of blades) leaf(g, x, 22, l, a, 2.2, ['i', 'j', 'k', 'w']);
  for (let y = 4; y < 22; y++) for (let x = 0; x < 16; x++) if (g.get(x, y) === 'j' && (y + x * 3) % 5 === 0) g.px(x, y, 'i');
  pot(g, 8, 21, 12, 10, ['y', 'z', 'A', 'B']);
  return g.outline();
});
SPR.def('plant_fern', () => {
  const g = new Grid(22, 22);
  const G1 = ['i', 'j', 'k', 'l'];
  for (const [a, l] of [[-0.3, 9], [-0.9, 9], [-1.57, 9], [-2.2, 9], [-2.85, 9], [-0.05, 7], [-3.1, 7]]) leaf(g, 11, 13, l, a, 2.1, G1);
  pot(g, 11, 13, 10, 8, ['u', 'v', 'w', 'x']);
  return g.outline();
});
SPR.def('plant_succulent', () => {
  const g = new Grid(12, 13);
  const G1 = ['I', 'J', 'K', 'p'];
  for (const a of [-0.5, -1.57, -2.6, -1.0, -2.1]) leaf(g, 6, 6, 4.5, a, 1.6, G1);
  pot(g, 6, 6, 8, 6, ['F', 'G', 'H', 'B']);
  return g.outline();
});
SPR.def('cactus', () => {
  const g = Grid.rows([
    '....jj....',
    '...jkkj...',
    '...jklj...',
    'jj.jkkj...',
    'kj.jklj.jj',
    'kjjjkkj.kj',
    'jkkkklj.kj',
    '.jjjkkjjkj',
    '...jklkkj.',
    '...jkkjj..',
    '...jkkj...',
  ]);
  const h = new Grid(12, 17); h.paste(g, 1, 1);
  h.pts([[5, 2], [8, 5], [2, 6], [9, 8], [6, 9]], 'f');
  h.px(5, 1, 's'); h.px(6, 1, 's'); h.px(5, 0, 't');
  pot(h, 6, 11, 8, 5);
  return h.outline();
});
SPR.def('plant_hanging', () => {
  const g = new Grid(22, 32);
  line(g, 11, 0, 5, 10, 'h'); line(g, 11, 0, 17, 10, 'h'); line(g, 11, 0, 11, 10, 'g');
  g.rect(4, 10, 14, 6, 'f'); g.hl(4, 10, 14, 'Z'); g.rect(5, 15, 12, 2, 'g'); g.vl(17, 10, 6, 'h');
  g.hl(6, 12, 10, 'K'); g.hl(6, 13, 10, 'J');
  const G1 = ['i', 'j', 'k', 'l'];
  leaf(g, 8, 10, 5, -2.4, 2, G1); leaf(g, 13, 10, 5, -0.7, 2, G1); leaf(g, 11, 10, 4, -1.6, 2, G1);
  // trailing vines
  for (const [x0, len, s] of [[5, 13, 1], [9, 16, 2], [15, 12, 3], [17, 9, 4]]) {
    const r = rng(s);
    for (let i = 0; i < len; i++) {
      const x = x0 + Math.round(Math.sin(i * 0.5 + s) * 1.2), y = 16 + i;
      g.px(x, y, 'i');
      if (i % 3 === 1) { g.px(x - 1, y, r() < 0.5 ? 'k' : 'j'); g.px(x - 2, y, 'j'); g.px(x - 1, y - 1, 'l'); }
      if (i % 3 === 2) { g.px(x + 1, y, 'k'); g.px(x + 2, y, 'j'); g.px(x + 1, y - 1, 'l'); }
    }
  }
  return g.outline();
});

SPR.def('sofa', () => {
  const g = new Grid(54, 30);
  g.rect(5, 1, 44, 13, 'n'); g.cut(5, 1, 44, 13, 2); g.hl(7, 1, 40, 'o'); g.hl(6, 2, 42, 'o'); g.hl(6, 3, 42, 'p');
  for (const x of [14, 22, 30, 38]) { g.px(x, 7, 'm'); g.px(x, 8, 'o'); }
  g.hl(5, 12, 44, 'm');
  for (const x of [1, 45]) {
    g.rect(x, 8, 8, 17, 'n'); g.cut(x, 8, 8, 17, 2); g.hl(x + 1, 8, 6, 'p'); g.hl(x, 9, 8, 'o'); g.hl(x, 10, 8, 'o');
    g.vl(x + 7, 11, 13, 'm'); g.hl(x, 11, 8, 'm');
  }
  g.rect(9, 13, 36, 5, 'o'); g.hl(9, 13, 36, 'p'); g.vl(27, 13, 5, 'n'); g.vl(26, 14, 3, 'p');
  g.rect(9, 18, 36, 5, 'n'); g.hl(9, 18, 36, 'm');
  g.rect(2, 23, 50, 2, 'm');
  g.rect(4, 25, 2, 3, 'a'); g.rect(48, 25, 2, 3, 'a');
  // throw pillow
  g.stamp(10, 7, ['.ssssss.', 'sttsssss', 'stsssssr', 'sssssssr', 'ssssrrrr', '.rrrrrr.']);
  return g.outline();
});

SPR.def('rug_round', () => {
  const g = new Grid(58, 22);
  g.ellipse(29, 11, 28, 10.5, 'm'); g.ellipse(29, 11, 26.5, 9.2, 'n'); g.ellipse(29, 11, 22, 7.5, 'o');
  g.ellipse(29, 11, 18, 6, 'n'); g.ellipse(29, 11, 14, 4.6, 'p'); g.ellipse(29, 11, 9, 3, 'o'); g.ellipse(29, 11, 4.5, 1.5, 'f');
  g.dither(0, 0, 58, 22, 'o', 'n');
  g.replace('o', 'n', 0, 0, 58, 22); // keep stitch texture subtle
  g.ellipse(29, 11, 22, 7.5, 'o'); g.ellipse(29, 11, 18, 6, 'n'); g.ellipse(29, 11, 14, 4.6, 'p'); g.ellipse(29, 11, 9, 3, 'o'); g.ellipse(29, 11, 4.5, 1.5, 'f');
  for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; g.px(Math.round(29 + Math.cos(t) * 20), Math.round(11 + Math.sin(t) * 6.8), 'f'); }
  return g;
});
SPR.def('rug_rect', () => {
  const g = new Grid(62, 24);
  g.rect(3, 1, 56, 22, 'q'); g.rect(4, 2, 54, 20, 'r'); g.rect(6, 4, 50, 16, 'g'); g.rect(7, 5, 48, 14, 's');
  for (let i = 0; i < 6; i++) {
    const cx = 11 + i * 8;
    for (let d = 0; d < 5; d++) { g.px(cx - d, 12 - (4 - d), 'r'); g.px(cx + d, 12 - (4 - d), 'r'); g.px(cx - d, 12 + (4 - d), 'r'); g.px(cx + d, 12 + (4 - d), 'r'); }
    g.px(cx, 12, 'g'); g.pts([[cx - 1, 12], [cx + 1, 12], [cx, 11], [cx, 13]], 't');
  }
  g.hl(7, 5, 48, 't');
  for (let y = 2; y < 22; y += 2) { g.hl(0, y, 3, 'g'); g.hl(59, y, 3, 'g'); }
  return g;
});
SPR.def('rug_runner', () => {
  const g = new Grid(30, 16);
  g.rect(1, 1, 28, 14, 'J'); g.rect(2, 2, 26, 12, 'K'); g.rect(4, 4, 22, 8, 'J');
  for (let x = 5; x < 26; x += 4) g.stamp(x, 6, ['.f.', 'fpf', '.f.']);
  return g.outline('I');
});

SPR.def('nightstand', () => {
  const g = new Grid(20, 22);
  g.rect(1, 1, 18, 4, 'd'); g.hl(1, 1, 18, 'e'); g.hl(1, 4, 18, 'b');
  g.rect(2, 5, 16, 12, 'c'); g.vl(2, 5, 12, 'd'); g.vl(17, 5, 12, 'b');
  g.hl(2, 10, 16, 'b'); g.hl(3, 11, 14, 'd');
  g.hl(8, 7, 4, 'a'); g.hl(8, 13, 4, 'a'); g.px(9, 6, 'e'); g.px(9, 12, 'e');
  g.hl(2, 16, 16, 'a');
  g.vl(3, 17, 3, 'b'); g.vl(16, 17, 3, 'b');
  return g.outline();
});

SPR.def('beanbag', () => {
  const g = new Grid(26, 19);
  g.ellipse(13, 11, 12, 7.2, 'r'); g.ellipse(12, 10, 9, 5.5, 's'); g.ellipse(10, 8, 5, 3, 't');
  g.ellipse(14, 9, 4, 2, 's');
  for (let x = 0; x < 26; x++) for (let y = 14; y < 19; y++) if (g.get(x, y) !== '.') g.px(x, y, 'q');
  for (let x = 0; x < 26; x++) if (g.get(x, 13) === 'r') g.px(x, 13, 'q');
  return g.outline();
});

SPR.def('cushion', () => {
  const g = new Grid(22, 11);
  g.ellipse(11, 5.5, 10, 4.5, 'G'); g.ellipse(10, 4.5, 7.5, 2.8, 'H'); g.ellipse(9, 3.6, 3, 1.2, 'B');
  for (let x = 0; x < 22; x++) if (g.get(x, 8) !== '.') g.px(x, 8, 'F');
  g.px(11, 5, 'F'); g.px(11, 4, 'G');
  return g.outline();
});

SPR.def('cat_tree', () => {
  const g = new Grid(26, 48);
  g.rect(10, 12, 6, 30, 'g'); for (let y = 12; y < 42; y += 2) g.hl(10, y, 6, 'h'); g.vl(10, 12, 30, 'f');
  g.rect(17, 30, 4, 12, 'g'); for (let y = 30; y < 42; y += 2) g.hl(17, y, 4, 'h');
  g.rect(14, 27, 11, 3, 'z'); g.hl(14, 27, 11, 'A'); g.hl(14, 29, 11, 'y');
  g.rect(1, 41, 24, 5, 'z'); g.hl(1, 41, 24, 'A'); g.hl(2, 42, 22, 'B'); g.hl(1, 45, 24, 'y');
  g.ellipse(13, 10, 10, 4.2, 'z'); g.ellipse(13, 9, 8, 2.6, 'y'); g.ellipse(13, 8.6, 6.5, 1.8, 'G');
  for (let x = 0; x < 26; x++) if (g.get(x, 12) === 'z' || g.get(x, 13) === 'z') { g.px(x, 13, 'y'); }
  g.hl(5, 7, 4, 'A'); g.hl(17, 7, 4, 'A');
  g.vl(23, 30, 7, 'f'); g.ellipse(23, 38, 1.8, 1.8, 's'); g.px(22, 37, 't');
  return g.outline();
});

SPR.def('cabinet_low', () => {
  const g = new Grid(42, 20);
  g.rect(1, 1, 40, 4, 'd'); g.hl(1, 1, 40, 'e'); g.hl(1, 4, 40, 'b');
  g.rect(2, 5, 38, 11, 'c'); g.vl(2, 5, 11, 'd'); g.vl(39, 5, 11, 'b');
  g.vl(15, 5, 11, 'b'); g.vl(27, 5, 11, 'b');
  for (const x of [4, 17, 29]) { g.rect(x, 7, 9, 7, 'b'); g.rect(x + 1, 8, 7, 5, 'd'); }
  g.px(12, 10, 'u'); g.px(18, 10, 'u'); g.px(30, 10, 'u');
  g.hl(2, 15, 38, 'a'); g.vl(4, 16, 3, 'a'); g.vl(37, 16, 3, 'a');
  return g.outline();
});

SPR.def('guitar', () => {
  const g = new Grid(16, 36);
  g.rect(6, 1, 5, 5, 'b'); g.hl(6, 1, 5, 'c'); g.pts([[5, 2], [5, 4], [11, 2], [11, 4]], 'A');
  g.rect(7, 6, 3, 12, 'a'); for (let y = 8; y < 18; y += 3) g.hl(7, y, 3, 'd');
  g.ellipse(8.5, 21, 4.6, 4.2, 'v'); g.ellipse(8.5, 28, 6.2, 5.6, 'v');
  for (let y = 16; y < 34; y++) for (let x = 0; x < 16; x++) { if (g.get(x, y) === 'v' && x >= 11) g.px(x, y, 'u'); if (g.get(x, y) === 'v' && x <= 4) g.px(x, y, 'w'); }
  g.ellipse(8.5, 23, 1.7, 1.7, '0'); g.hl(6, 29, 5, 'a'); g.vl(8, 6, 23, 'e');
  g.px(8, 23, '0');
  g.hl(3, 33, 11, 'y'); g.px(3, 34, 'y'); g.px(13, 34, 'y');
  return g.outline();
});

// ================= WALL ITEMS =================
SPR.def('window', () => {
  const g = new Grid(40, 44);
  g.rect(3, 4, 34, 35, 'f'); g.rect(6, 7, 28, 28, '.');
  g.vl(19, 7, 28, 'f'); g.vl(20, 7, 28, 'f'); g.hl(6, 20, 28, 'f');
  g.vl(36, 4, 35, 'g'); g.hl(3, 38, 34, 'g'); g.vl(5, 7, 28, 'h'); g.hl(6, 6, 28, 'h'); g.vl(21, 7, 28, 'g'); g.hl(6, 21, 28, 'g');
  g.rect(1, 38, 38, 3, 'f'); g.hl(1, 40, 38, 'h'); g.hl(2, 41, 36, 'a');
  // glass shine
  g.pts([[9, 9], [8, 10], [10, 9], [9, 10], [8, 11], [24, 23], [23, 24], [25, 23], [24, 24]], ':');
  return g.outline();
});
SPR.def('curtains', () => {
  const g = new Grid(44, 42);
  g.hl(1, 1, 42, 'a'); g.hl(1, 2, 42, 'b'); g.rect(0, 0, 2, 4, 'b'); g.rect(42, 0, 2, 4, 'b');
  for (const side of [0, 1]) {
    for (let y = 3; y < 40; y++) {
      const tie = y > 22 && y < 26;
      let w = y < 23 ? 9 - Math.floor((y - 3) / 5) : (y < 26 ? 4 : 5 + Math.floor((y - 26) / 3));
      w = Math.max(3, w);
      for (let i = 0; i < w; i++) {
        const x = side ? 42 - i : 1 + i;
        let c = (i % 3 === 1) ? 's' : (i % 3 === 2 ? 'r' : 't');
        if (i === w - 1) c = 'q';
        g.px(x, y, c);
      }
      if (tie) { const x0 = side ? 42 - 5 : 1; g.hl(x0, y, 5, y === 24 ? 'w' : 'u'); }
    }
  }
  return g.outline();
});
SPR.def('curtains_closed', () => {
  const g = new Grid(44, 42);
  g.hl(1, 1, 42, 'a'); g.hl(1, 2, 42, 'b'); g.rect(0, 0, 2, 4, 'b'); g.rect(42, 0, 2, 4, 'b');
  for (let y = 3; y < 40; y++) for (let x = 2; x < 42; x++) {
    const i = (x < 22 ? x : 43 - x) % 4;
    g.px(x, y, i === 0 ? 'q' : i === 1 ? 's' : i === 2 ? 't' : 'r');
  }
  g.vl(21, 3, 37, 'q'); g.vl(22, 3, 37, 'q');
  return g.outline();
});

SPR.def('clock', () => {
  const g = new Grid(17, 17);
  g.ellipse(8.5, 8.5, 7.5, 7.5, 'b'); g.ellipse(8.5, 8.5, 6.6, 6.6, 'c'); g.ellipse(8.5, 8.5, 5.6, 5.6, 'f');
  g.pts([[8, 4], [12, 8], [8, 12], [4, 8]], 'h'); g.pts([[5, 5], [6, 5]], 'Z');
  g.pts([[3, 4], [4, 3]], 'd');
  return g.outline();
});

SPR.def('shelf_wall', () => {
  const g = new Grid(34, 11);
  g.rect(1, 1, 32, 3, 'd'); g.hl(1, 1, 32, 'e'); g.hl(1, 3, 32, 'b');
  for (const x of [5, 26]) g.stamp(x, 4, ['aaa', 'aa.', 'a..', 'a..', 'a..']);
  return g.outline();
});

SPR.def('painting', () => {
  const g = new Grid(26, 21);
  g.rect(1, 1, 24, 19, 'c'); g.hl(1, 1, 24, 'd'); g.vl(1, 1, 19, 'd'); g.hl(1, 19, 24, 'b'); g.vl(24, 1, 19, 'b');
  g.rect(3, 3, 20, 15, 'p'); g.rect(3, 3, 20, 4, 'o'); g.hl(3, 7, 20, 'p');
  g.ellipse(17, 7, 2.6, 2.6, 'x'); g.px(16, 6, 'Z');
  for (let x = 3; x < 23; x++) { const h1 = Math.round(10 - Math.abs(x - 9) * 0.7); for (let y = Math.max(3, h1); y < 18; y++) g.px(x, y, x < 9 ? 'H' : 'G'); }
  for (let x = 3; x < 23; x++) { const h2 = Math.round(12 - Math.abs(x - 17) * 0.55); for (let y = Math.max(3, h2); y < 18; y++) g.px(x, y, x < 17 ? 'B' : 'H'); }
  g.rect(3, 14, 20, 4, 'k'); g.hl(3, 14, 20, 'l'); g.grain(3, 15, 20, 3, 'j', 'k', 0.3, 4);
  g.pts([[10, 7], [11, 6], [12, 7]], 'f');
  return g.outline();
});

SPR.def('poster', () => {
  const g = new Grid(19, 25);
  g.rect(1, 1, 17, 23, 'F'); g.rect(2, 2, 15, 21, 'm');
  for (let y = 2; y < 23; y++) if (y > 15) g.hl(2, y, 15, 'F');
  g.ellipse(9.5, 9, 4.5, 4.5, 'x'); g.ellipse(11.5, 7.8, 3.6, 3.6, 'm'); g.px(6, 9, 'W'); g.px(7, 11, 'w');
  g.pts([[4, 4], [14, 13], [15, 4], [4, 15], [13, 3]], 'W'); g.pts([[5, 13], [12, 15]], 'p');
  g.hl(4, 18, 11, 'H'); g.hl(4, 20, 7, 'G');
  g.stamp(0, 0, ['xx', 'x']); g.stamp(17, 0, ['xx', '.x']);
  return g.outline();
});

SPR.def('corkboard', () => {
  const g = new Grid(30, 23);
  g.rect(1, 1, 28, 21, 'b'); g.hl(1, 1, 28, 'c'); g.rect(3, 3, 24, 17, 'd'); g.grain(3, 3, 24, 17, 'c', 'd', 0.25, 8); g.grain(3, 3, 24, 17, 'e', 'd', 0.08, 9);
  g.rect(5, 5, 7, 7, 'x'); g.hl(6, 7, 5, 'w'); g.hl(6, 9, 4, 'w'); g.px(8, 5, 'r');
  g.rect(14, 4, 8, 6, 't'); g.hl(15, 6, 6, 's'); g.px(18, 4, 'n');
  g.rect(13, 12, 6, 7, 'f'); g.rect(14, 13, 4, 3, 'o'); g.hl(14, 17, 4, 'h'); g.px(16, 12, 'j');
  g.rect(21, 11, 5, 6, 'l'); g.hl(22, 13, 3, 'k'); g.px(23, 11, 'r');
  g.rect(5, 14, 6, 5, 'p'); g.hl(6, 16, 4, 'o');
  return g.outline();
});

SPR.def('calendar', () => {
  const g = new Grid(17, 21);
  g.rect(1, 3, 15, 17, 'f'); g.rect(1, 3, 15, 5, 'r'); g.hl(1, 3, 15, 's'); g.vl(15, 8, 12, 'g'); g.hl(1, 19, 15, 'h');
  g.pts([[4, 1], [4, 2], [12, 1], [12, 2]], 'A'); g.pts([[4, 3], [12, 3]], 'z');
  return g.outline();
});

SPR.def('string_lights', () => {
  const g = new Grid(64, 14);
  const cols = [['w', 'X'], ['s', 't'], ['o', 'p'], ['k', 'l'], ['H', 'B']];
  let prev = null;
  for (let x = 1; x < 63; x++) {
    const y = Math.round(2 + 5 * Math.sin(Math.PI * (x - 1) / 62));
    g.px(x, y, 'y'); if (prev !== null && Math.abs(prev - y) > 1) g.px(x, y - 1, 'y'); prev = y;
    if ((x - 4) % 7 === 0) { const c = cols[((x - 4) / 7) % cols.length]; g.rect(x - 1, y + 1, 3, 3, c[0]); g.px(x, y + 1, 'y'); g.px(x - 1, y + 3, '.'); g.px(x + 1, y + 3, '.'); g.px(x, y + 4, c[0]); g.px(x - 1, y + 2, c[1]); }
  }
  return g.outline();
});
SPR.def('string_lights_on', () => SPR.grid('string_lights').recolor({ w: 'W', s: 't', o: 'p', k: 'l', H: 'B', X: 'Z', t: 'Z', p: 'Z', l: 'Z' }));

SPR.def('moon_lamp', () => {
  const g = new Grid(17, 17);
  g.ellipse(8.5, 8.5, 7, 7, 'w'); g.ellipse(11, 7, 5.6, 5.6, '.');
  for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) if (g.get(x, y) === 'w' && x + y < 12) g.px(x, y, 'x');
  g.pts([[4, 9], [5, 12]], 'v');
  return g.outline();
});
SPR.def('moon_lamp_on', () => SPR.grid('moon_lamp').recolor({ w: 'X', x: 'W', v: 'w' }));

SPR.def('mirror', () => {
  const g = new Grid(20, 28);
  g.ellipse(10, 14, 9, 13, 'c'); g.ellipse(10, 14, 8, 12, 'd'); g.ellipse(10, 14, 6.6, 10.6, 'o'); g.ellipse(9.5, 13, 5.4, 9.2, 'p');
  line(g, 6, 12, 10, 6, 'Z'); line(g, 7, 15, 12, 8, 'Z'); line(g, 11, 20, 13, 17, 'f');
  g.px(10, 1, 'e');
  return g.outline();
});

SPR.def('garland', () => {
  const g = new Grid(48, 14);
  const cols = ['r', 'w', 'J', 'G', 'v', 'o'];
  let prev = null;
  for (let x = 1; x < 47; x++) { const y = Math.round(2 + 3.5 * Math.sin(Math.PI * (x - 1) / 46)); g.px(x, y, 'h'); prev = y; }
  for (let i = 0; i < 7; i++) {
    const x = 3 + i * 6.3, y = Math.round(3 + 3.5 * Math.sin(Math.PI * (x - 1) / 46));
    const c = cols[i % cols.length];
    for (let r = 0; r < 7; r++) { const hw = Math.max(0, 2.5 - r * 0.42); g.hl(Math.round(x - hw), y + r, Math.round(hw * 2) + 1, c); }
  }
  return g.outline();
});

SPR.def('neon_heart', () => {
  const g = Grid.rows([
    '..sss...sss..',
    '.st..s.s..ts.',
    's.....s.....s',
    's...........s',
    '.s.........s.',
    '..s.......s..',
    '...s.....s...',
    '....s...s....',
    '.....s.s.....',
    '......s......',
  ]);
  const h = new Grid(17, 14); h.paste(g, 2, 2);
  return h.outline('q');
});

// ================= DECOR (desk/shelf/floor small) =================
SPR.def('laptop', () => {
  const g = new Grid(18, 13);
  g.rect(3, 1, 12, 8, 'y'); g.rect(4, 2, 10, 6, 'm');
  g.hl(5, 3, 5, 'o'); g.hl(5, 5, 7, 'K'); g.hl(5, 6, 4, 'o'); g.px(12, 3, 's');
  g.rect(2, 9, 14, 2, 'A'); g.hl(2, 9, 14, 'B'); g.hl(1, 11, 16, 'z');
  g.pts([[4, 10], [6, 10], [8, 10], [10, 10], [12, 10]], 'z');
  return g.outline();
});
SPR.def('desk_lamp', () => {
  const g = new Grid(14, 17);
  g.rect(2, 13, 7, 2, 'J'); g.hl(2, 13, 7, 'K'); g.hl(3, 15, 5, 'I');
  line(g, 5, 13, 3, 7, 'z'); line(g, 3, 7, 8, 3, 'z'); g.px(3, 7, 'A');
  g.stamp(7, 1, ['.JJJ.', 'JKKJJ', 'JKJJJI', '.IIII.', '..XX..']);
  return g.outline();
});
SPR.def('mug', () => {
  const g = Grid.rows([
    '.ffffff..',
    'fbaaaabf.',
    'fffffff.f',
    'frrrrrfff',
    'fffffgf.f',
    'fffffgff.',
    '.ggggg...',
  ]);
  const h = new Grid(11, 9); h.paste(g, 1, 1); return h.outline();
});
SPR.def('books_stack', () => {
  const g = new Grid(15, 10);
  g.rect(2, 6, 11, 3, 'n'); g.hl(2, 6, 11, 'o'); g.vl(12, 6, 3, 'f'); g.vl(11, 7, 2, 'g');
  g.rect(1, 3, 12, 3, 'r'); g.hl(1, 3, 12, 's'); g.vl(12, 3, 3, 'f'); g.vl(11, 4, 2, 'g');
  g.rect(3, 1, 9, 2, 'j'); g.hl(3, 1, 9, 'k'); g.vl(11, 1, 2, 'f');
  return g.outline();
});
SPR.def('record_player', () => {
  const g = new Grid(22, 13);
  g.rect(1, 5, 20, 7, 'c'); g.hl(1, 5, 20, 'd'); g.hl(1, 11, 20, 'a'); g.vl(20, 6, 5, 'b');
  g.ellipse(9, 4, 7, 2.6, 'Y'); g.ellipse(9, 4, 5, 1.6, 'y'); g.ellipse(9, 4, 1.6, 0.9, 'r');
  g.vl(17, 1, 4, 'A'); g.hl(14, 1, 4, 'A'); g.px(14, 2, 'B');
  g.pts([[4, 8], [6, 8]], 'u'); g.px(17, 8, 'k');
  return g.outline();
});
SPR.def('candle', () => {
  const g = Grid.rows(['..X..', '.XWX.', '.XWX.', '..0..', 'fffff', 'fffgf', 'fffgf', 'fffgf', 'hhhhh']);
  const h = new Grid(7, 11); h.paste(g, 1, 1);
  const o = h.clone(); o.outline();
  for (const [x, y] of [[3, 1], [2, 2], [4, 2], [2, 3], [4, 3], [1, 2], [5, 2], [3, 0]]) if (o.get(x, y) === '0') o.px(x, y, '.');
  return o;
});
SPR.def('fishbowl', () => {
  const g = new Grid(16, 15);
  g.ellipse(8, 8, 7, 6.2, ','); g.rect(4, 1, 8, 2, '.');
  g.ellipse(8, 9.5, 6.4, 4.2, ';'); for (let x = 0; x < 16; x++) for (let y = 0; y < 6; y++) if (g.get(x, y) === ';') g.px(x, y, ',');
  g.hl(5, 2, 6, 'p'); g.hl(4, 3, 8, ',');
  g.hl(4, 12, 8, 'd'); g.hl(5, 13, 6, 'c'); g.px(6, 11, 'k'); g.px(6, 10, 'j'); g.px(10, 11, 'l');
  g.pts([[3, 6], [3, 7]], ':');
  const o = g.clone(); o.outline('y');
  return o;
});
SPR.def('photo_frame', () => {
  const g = new Grid(11, 12);
  g.rect(1, 1, 9, 10, 'G'); g.rect(2, 2, 7, 7, 'p'); g.rect(2, 6, 7, 3, 'k');
  g.ellipse(5.5, 5, 1.6, 1.6, 'C'); g.pts([[4, 3], [5, 3], [6, 3]], 'P'); g.hl(4, 7, 3, 'S');
  g.hl(1, 10, 9, 'F');
  return g.outline();
});
SPR.def('globe', () => {
  const g = new Grid(13, 17);
  g.ellipse(6.5, 6.5, 5.2, 5.2, 'n'); g.grain(1, 1, 11, 11, 'j', 'n', 0.3, 12); g.ellipse(5, 5, 2, 2, 'o');
  g.px(4, 4, 'p');
  for (let a = 0; a < 20; a++) { const t = Math.PI * (0.15 + a / 19 * 1.1); g.px(Math.round(6.5 + Math.cos(t) * 6.2), Math.round(6.5 - Math.sin(t) * 6.2) + 1, 'u'); }
  g.vl(6, 12, 2, 'u'); g.rect(3, 14, 7, 2, 'b'); g.hl(3, 14, 7, 'c');
  return g.outline();
});
SPR.def('alarm_clock', () => {
  const g = new Grid(12, 12);
  g.ellipse(6, 6.5, 4.6, 4.6, 'r'); g.ellipse(6, 6.5, 3.4, 3.4, 'f');
  g.pts([[2, 2], [3, 1], [9, 1], [10, 2]], 'w'); g.pts([[6, 4], [6, 5], [6, 6], [7, 6]], '0');
  g.pts([[3, 10], [9, 10]], 'a');
  return g.outline();
});
SPR.def('plush_bear', () => {
  const g = Grid.rows([
    '.cc....cc.',
    'cdbccccbdc',
    '.cddddddc.',
    '.cd0dd0dc.',
    '.cddeeddc.',
    '..cde0dc..',
    '.ccddddcc.',
    'cddcrrcddc',
    'cdddrrdddc',
    '.cddddddc.',
    '.ee.cc.ee.',
  ]);
  const h = new Grid(12, 13); h.paste(g, 1, 1); h.px(3, 5, 's'); h.px(8, 5, 's'); return h.outline();
});
SPR.def('monitor', () => {
  const g = new Grid(24, 19);
  g.rect(1, 1, 22, 13, 'y'); g.rect(2, 2, 20, 10, 'F');
  g.rect(3, 3, 8, 6, 'G'); g.hl(3, 3, 8, 'H'); g.rect(12, 3, 9, 2, 'K'); g.hl(12, 6, 7, 'o'); g.hl(12, 8, 5, 's'); g.hl(3, 10, 12, 'H');
  g.px(21, 12, 'k');
  g.rect(10, 14, 4, 2, 'z'); g.rect(7, 16, 10, 2, 'y'); g.hl(7, 16, 10, 'z');
  return g.outline();
});
SPR.def('headphones', () => {
  const g = Grid.rows([
    '...zzzzz...',
    '..z.....z..',
    '.z.......z.',
    '.z.......z.',
    'rr.......rr',
    'rss.....ssr',
    'rss.....ssr',
    '.r.......r.',
  ]);
  const h = new Grid(13, 10); h.paste(g, 1, 1); return h.outline();
});
SPR.def('teapot', () => {
  const g = Grid.rows([
    '....JK.....',
    '..JJJJJJ...',
    '.JKKKKKJJ..',
    'JKKpKKKKJJJ',
    'JKKKKKKKJ.J',
    'JJKKKKKJJ.J',
    '.JJJJJJJ.J.',
    '..IIIIII...',
  ]);
  const h = new Grid(14, 10); h.paste(g, 1, 1); h.px(1, 4, 'J'); h.px(0, 3, 'J'); return h.outline();
});
SPR.def('tv_retro', () => {
  const g = new Grid(24, 22);
  line(g, 8, 4, 4, 0, 'A'); line(g, 14, 4, 19, 0, 'A');
  g.rect(1, 4, 22, 15, 'c'); g.hl(1, 4, 22, 'd'); g.vl(22, 5, 14, 'b'); g.hl(1, 18, 22, 'a');
  g.rect(3, 6, 14, 11, 'y'); g.rect(4, 7, 12, 9, 'm'); g.cut(4, 7, 12, 9, 1);
  g.rect(18, 7, 3, 2, 'y'); g.rect(18, 10, 3, 2, 'y'); g.hl(18, 13, 3, 'a'); g.hl(18, 15, 3, 'a');
  g.rect(3, 19, 3, 2, 'a'); g.rect(18, 19, 3, 2, 'a');
  return g.outline();
});
SPR.def('rubber_duck', () => {
  const g = Grid.rows([
    '..www...',
    '.wwwww..',
    '.ww0wwvv',
    '.wwwwvv.',
    'w.wwww..',
    'wwwwwwww',
    'wwwwwwwu',
    '.uuuuuu.',
  ]);
  const h = new Grid(10, 10); h.paste(g, 1, 1); h.px(3, 2, 'x'); return h.outline();
});
SPR.def('cake', () => {
  const g = Grid.rows([
    '....r.....',
    '...fsf....',
    '.ffffffff.',
    'ffttttttff',
    'fsssssssst',
    'tfftffftft',
    'ssssssssss',
    'tttttttttt',
    '.hhhhhhhh.',
  ]);
  const h = new Grid(12, 11); h.paste(g, 1, 1); return h.outline();
});
SPR.def('gift_box', () => {
  const g = Grid.rows([
    '..ww..ww...',
    '...wwww....',
    '.rrrwwrrrr.',
    'rsssswsssrr',
    'rrrrrwrrrrr',
    '.qrrrwrrrq.',
    '.qrrrwrrrq.',
    '.qrrrwrrrq.',
    '.qqqqwqqqq.',
  ]);
  const h = new Grid(13, 11); h.paste(g, 1, 1); return h.outline();
});
