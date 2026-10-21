/* ============================================================
   Theme furniture: seaside, forest cabin, sakura washitsu,
   snowy attic, starry studio — plus music player icons
   ============================================================ */

// ---------------- seaside ----------------
SPR.def('lifebuoy', () => {
  const g = new Grid(20, 20);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
    const dx = x + 0.5 - 10, dy = y + 0.5 - 10, d = Math.hypot(dx, dy); if (d > 8.6 || d < 4.1) continue;
    const a = Math.atan2(dy, dx), seg = Math.floor((a + Math.PI) / (Math.PI / 2) + 0.5) % 2;
    let c = seg ? 'r' : 'f';
    if (dx + dy > 5) c = seg ? 'q' : 'g'; else if (dx + dy < -7 && d > 6.2) c = seg ? 's' : 'Z';
    g.px(x, y, c);
  }
  for (const t of [0.785, 2.356, 3.927, 5.498]) g.px(Math.round(10 + Math.cos(t) * 8.6 - 0.5), Math.round(10 + Math.sin(t) * 8.6 - 0.5), 'h');
  return g.outline();
});
SPR.def('surfboard', () => {
  const g = new Grid(14, 40);
  g.ellipse(7, 20, 5.6, 18.6, 'p');
  for (let y = 0; y < 40; y++) for (let x = 0; x < 14; x++) { if (g.get(x, y) !== 'p') continue; if (x >= 9) g.px(x, y, 'o'); else if (x <= 3) g.px(x, y, 'f'); }
  for (let x = 0; x < 14; x++) { if (g.get(x, 13) !== '.') g.px(x, 13, 'v'); if (g.get(x, 14) !== '.') g.px(x, 14, 'w'); if (g.get(x, 15) !== '.') g.px(x, 15, 'v'); if (g.get(x, 18) !== '.') g.px(x, 18, 'r'); }
  g.vl(7, 4, 32, 'B');
  return g.outline();
});
SPR.def('shell', () => {
  const g = new Grid(12, 10);
  g.ellipse(6, 6.5, 4.8, 5.4, 's'); for (let y = 7; y < 10; y++) g.hl(0, y, 12, '.');
  for (const [x1, y1] of [[2, 3], [4, 2], [6, 1], [8, 2], [10, 3]]) line(g, 6, 7, x1, y1 + 1, 'r');
  g.rect(4, 7, 4, 2, 's'); g.hl(4, 8, 4, 'r'); g.px(4, 3, 't'); g.px(3, 4, 't');
  return g.outline();
});
SPR.def('rattan_chair', () => {
  const g = new Grid(26, 31);
  g.ellipse(13, 11.5, 11, 10.6, 'c');
  for (let y = 0; y < 31; y++) for (let x = 0; x < 26; x++) if (g.get(x, y) === 'c') { if ((x * 2 + y) % 4 === 0) g.px(x, y, 'd'); else if ((x - y * 2 + 60) % 5 === 0) g.px(x, y, 'b'); }
  g.ellipse(13, 13.5, 7.4, 7, 'g'); g.ellipse(12, 12.5, 5.4, 4.8, 'f'); g.px(10, 10, 'Z');
  g.rect(3, 20, 20, 3, 'c'); g.hl(3, 20, 20, 'd'); g.hl(3, 22, 20, 'b'); g.grain(3, 21, 20, 1, 'd', 'c', 0.4, 5);
  g.vl(5, 23, 7, 'b'); g.vl(20, 23, 7, 'b'); g.vl(8, 23, 5, 'a'); g.vl(17, 23, 5, 'a');
  return g.outline();
});
SPR.def('boat_painting', () => {
  const g = new Grid(26, 21);
  g.rect(1, 1, 24, 19, 'f'); g.vl(24, 1, 19, 'g'); g.hl(1, 19, 24, 'g');
  g.rect(3, 3, 20, 15, 'p'); g.rect(3, 12, 20, 6, 'o'); g.hl(3, 12, 20, 'n');
  for (let x = 4; x < 22; x += 4) { g.px(x, 14, 'p'); g.px(x + 2, 16, 'n'); }
  g.ellipse(18, 6, 2.2, 2.2, 'x');
  g.vl(10, 4, 8, 'a'); for (let i = 0; i < 6; i++) g.hl(11, 5 + i, Math.min(i + 1, 5), 'f'); g.px(10, 3, 'r');
  g.hl(6, 11, 10, 'r'); g.hl(7, 12, 8, 'q'); g.hl(8, 13, 6, 'q');
  return g.outline();
});

// ---------------- forest cabin ----------------
SPR.def('fireplace', () => {
  const g = new Grid(46, 43);
  g.rect(3, 5, 40, 34, 'A');
  for (let y = 5; y < 39; y++) {
    const row = Math.floor((y - 5) / 5), off = (row * 5) % 9;
    for (let x = 3; x < 43; x++) {
      if ((y - 5) % 5 === 4) { g.px(x, y, 'z'); continue; }
      if ((x + off) % 9 === 0) { g.px(x, y, 'z'); continue; }
      if ((y - 5) % 5 === 0 || (x + off) % 9 === 1) g.px(x, y, 'B');
      else if (hsh(x, y, 4) % 9 === 0) g.px(x, y, 'z');
    }
  }
  g.rect(1, 1, 44, 4, 'c'); g.hl(1, 1, 44, 'e'); g.hl(1, 2, 44, 'd'); g.hl(1, 4, 44, 'a');
  for (let y = 15; y < 37; y++) {
    const inset = y < 19 ? Math.round((19 - y) * 1.6) : 0;
    for (let x = 11 + inset; x < 35 - inset; x++) g.px(x, y, (x === 11 + inset || x === 34 - inset || y === 15) ? 'y' : 'Y');
  }
  g.rect(14, 32, 18, 3, 'b'); g.hl(14, 32, 18, 'c'); g.ellipse(14, 33.5, 1.6, 1.6, 'd'); g.ellipse(31, 33.5, 1.6, 1.6, 'd');
  g.rect(5, 37, 36, 4, 'z'); g.hl(5, 37, 36, 'B'); g.hl(5, 40, 36, 'y');
  return g.outline();
});
SPR.def('mushroom_lamp', () => {
  const g = new Grid(14, 16);
  g.ellipse(7, 6, 5.6, 4.6, 'r'); for (let y = 6; y < 12; y++) g.hl(0, y, 14, '.');
  g.hl(3, 6, 8, 'g'); g.pts([[4, 3], [8, 2], [9, 4], [5, 5], [11, 5]], 'f'); g.pts([[3, 3], [4, 2]], 's');
  g.rect(6, 7, 3, 6, 'f'); g.vl(8, 7, 6, 'g'); g.hl(5, 13, 5, 'g');
  for (let x = 0; x < 14; x++) if (g.get(x, 5) === 'r' && x > 8) g.px(x, 5, 'q');
  return g.outline();
});
SPR.def('mushroom_lamp_on', () => SPR.grid('mushroom_lamp').recolor({ r: 's', q: 'r', f: 'W', g: 'X' }));
SPR.def('log_stack', () => {
  const g = new Grid(24, 15);
  const log = (cx, cy) => { g.ellipse(cx, cy, 3.6, 3.4, 'b'); g.ellipse(cx, cy, 2.6, 2.4, 'd'); g.ellipse(cx, cy, 1.4, 1.3, 'c'); g.px(Math.floor(cx), Math.floor(cy), 'b'); };
  log(5, 10.5); log(12, 10.5); log(19, 10.5); log(8.5, 4.6); log(15.5, 4.6);
  return g.outline();
});
SPR.def('wreath', () => {
  const g = new Grid(20, 21);
  for (let y = 0; y < 21; y++) for (let x = 0; x < 20; x++) {
    const d = Math.hypot(x + 0.5 - 10, y + 0.5 - 10); if (d > 8 || d < 4.2) continue;
    const h = hsh(x, y, 2) % 5; g.px(x, y, h === 0 ? 'k' : h === 1 ? 'i' : (x + y < 18 ? 'k' : 'j'));
  }
  for (const [x, y] of [[4, 6], [15, 7], [6, 14], [12, 3], [14, 13]]) { g.px(x, y, 'r'); g.px(x + 1, y, 'q'); }
  g.stamp(6, 15, ['rr..rr', 'rsrrsr', '.rrrr.', '.r..r.', 'r....r']);
  return g.outline();
});

// ---------------- sakura washitsu ----------------
SPR.def('chabudai', () => {
  const g = new Grid(42, 15);
  g.ellipse(21, 6.6, 19.5, 4.4, 'b'); g.ellipse(21, 5, 19.5, 4.2, 'c'); g.ellipse(21, 4.5, 18, 3.3, 'd');
  g.pts([[10, 3], [11, 3], [12, 3], [13, 2], [14, 2]], 'e');
  g.rect(8, 10, 2, 4, 'a'); g.rect(32, 10, 2, 4, 'a'); g.rect(15, 10, 2, 3, 'a'); g.rect(25, 10, 2, 3, 'a');
  return g.outline();
});
SPR.def('zabuton', () => {
  const g = new Grid(20, 9);
  g.rect(1, 2, 18, 5, 'n'); g.hl(1, 2, 18, 'o'); g.hl(1, 6, 18, 'm'); g.cut(1, 2, 18, 5, 1);
  g.pts([[0, 2], [19, 2], [0, 6], [19, 6]], 'w'); g.px(9, 4, 'm'); g.px(10, 4, 'm'); g.px(9, 3, 'p');
  return g.outline();
});
SPR.def('paper_lantern', () => {
  const g = new Grid(16, 28);
  g.rect(2, 1, 12, 2, 'b'); g.hl(2, 1, 12, 'c');
  g.rect(3, 3, 10, 17, 'a'); g.rect(4, 4, 8, 15, 'g'); g.vl(8, 4, 15, 'h'); g.hl(4, 11, 8, 'h'); g.hl(4, 7, 8, 'h'); g.hl(4, 15, 8, 'h');
  g.vl(4, 4, 15, 'f');
  g.rect(3, 20, 10, 1, 'a'); g.vl(3, 21, 5, 'a'); g.vl(12, 21, 5, 'a'); g.hl(2, 25, 12, 'b');
  return g.outline();
});
SPR.def('paper_lantern_on', () => SPR.grid('paper_lantern').recolor({ g: 'X', f: 'W', h: 'w' }));
SPR.def('bonsai', () => {
  const g = new Grid(20, 17);
  g.rect(3, 12, 14, 3, 'I'); g.hl(3, 12, 14, 'J'); g.hl(4, 15, 12, 'I'); g.px(4, 16, 'I'); g.px(15, 16, 'I');
  line(g, 10, 12, 8, 9, 'b'); line(g, 8, 9, 10, 6, 'b'); line(g, 10, 6, 7, 4, 'b'); line(g, 9, 8, 13, 7, 'a'); line(g, 11, 12, 12, 10, 'a');
  const cloud = (cx, cy, rx, ry) => { g.ellipse(cx, cy, rx, ry, 'j'); g.ellipse(cx - 0.6, cy - 0.7, rx * 0.7, ry * 0.55, 'k'); for (let x = 0; x < 20; x++) if (g.get(x, Math.ceil(cy + ry - 1)) === 'j') g.px(x, Math.ceil(cy + ry - 1), 'i'); };
  cloud(6, 4, 4, 2.4); cloud(14, 6.5, 4, 2.2); cloud(10, 2.4, 3, 1.8);
  return g.outline();
});
SPR.def('scroll', () => {
  const g = new Grid(14, 35);
  g.pts([[7, 0], [6, 1], [8, 1]], 'a');
  g.hl(1, 2, 12, 'a'); g.px(1, 2, 'b'); g.px(12, 2, 'b');
  g.rect(2, 3, 10, 28, 'g'); g.rect(3, 4, 8, 25, 'f');
  line(g, 3, 10, 10, 17, 'b'); line(g, 6, 13, 9, 11, 'b');
  for (const [x, y] of [[4, 10], [7, 13], [9, 11], [10, 16], [5, 12], [8, 15]]) { g.px(x, y, 's'); g.px(x + 1, y, 't'); g.px(x, y + 1, 's'); }
  g.pts([[9, 24], [10, 24], [9, 25], [10, 25]], 'r');
  g.hl(1, 31, 12, 'a'); g.px(0, 31, 'b'); g.px(13, 31, 'b');
  return g.outline();
});
SPR.def('futon', () => {
  const g = new Grid(50, 24);
  g.rect(1, 3, 48, 17, 'f'); g.hl(1, 19, 48, 'g'); g.hl(1, 20, 48, 'h');
  g.rect(5, 2, 14, 6, 'p'); g.hl(5, 2, 14, 'Z'); g.hl(5, 7, 14, 'o'); g.cut(5, 2, 14, 6, 1);
  g.rect(1, 8, 48, 12, 's'); g.hl(1, 8, 48, 'f'); g.hl(1, 9, 48, 't');
  for (const [x, y] of [[6, 12], [16, 15], [27, 12], [38, 15], [44, 11], [21, 18], [11, 18], [33, 18]]) { g.pts([[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]], 't'); g.px(x, y, 'w'); }
  g.hl(1, 19, 48, 'r'); g.hl(2, 21, 46, 'g');
  return g.outline();
});
SPR.def('window_round', () => {
  const g = new Grid(40, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    const d = Math.hypot(x + 0.5 - 20, y + 0.5 - 20);
    if (d <= 18.5 && d > 15.2) g.px(x, y, (x + y < 36) ? 'c' : 'b');
    if (d <= 15.2 && d > 14.3) g.px(x, y, 'a');
  }
  for (let i = 6; i < 34; i++) { if (Math.hypot(i + 0.5 - 20, 0) < 15) { g.px(i, 20, 'a'); g.px(20, i, 'a'); } }
  for (let i = 9; i < 31; i++) { g.px(i, 12, Math.hypot(i + 0.5 - 20, 12.5 - 20) < 14.3 ? 'a' : g.get(i, 12)); g.px(i, 28, Math.hypot(i + 0.5 - 20, 28.5 - 20) < 14.3 ? 'a' : g.get(i, 28)); }
  for (let i = 9; i < 31; i++) { if (Math.hypot(12.5 - 20, i + 0.5 - 20) < 14.3) g.px(12, i, 'a'); if (Math.hypot(28.5 - 20, i + 0.5 - 20) < 14.3) g.px(28, i, 'a'); }
  return g.outline();
});
SPR.def('shoji_closed', () => {
  const g = new Grid(40, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { const d = Math.hypot(x + 0.5 - 20, y + 0.5 - 20); if (d <= 14.6) g.px(x, y, (x % 6 === 2 || y % 7 === 3) ? 'h' : 'f'); }
  return g;
});

// ---------------- snowy attic ----------------
SPR.def('xmas_tree', () => {
  const g = new Grid(30, 46);
  for (const [ay, by, hw] of [[3, 13, 6], [9, 21, 9], [15, 29, 12], [22, 36, 13.5]]) {
    for (let y = ay; y <= by; y++) {
      const w = (y - ay) / (by - ay) * hw;
      for (let x = Math.round(15 - w); x <= Math.round(15 + w - 1); x++) { const rel = (x - (15 - w)) / (2 * w + 0.01); g.px(x, y, rel < 0.3 ? 'k' : rel > 0.72 ? 'i' : 'j'); }
      if (y === by) for (let x = Math.round(15 - w); x <= Math.round(15 + w - 1); x++) if ((x + y) % 3 === 0) g.px(x, y, 'i');
    }
  }
  const orn = [[13, 10, 'r'], [17, 14, 'w'], [11, 18, 'o'], [19, 20, 'r'], [9, 24, 'w'], [15, 23, 'H'], [21, 26, 'o'], [7, 31, 'r'], [13, 30, 'w'], [18, 33, 'H'], [23, 32, 'w'], [11, 35, 'o'], [16, 27, 'r']];
  for (const [x, y, c] of orn) g.px(x, y, c);
  g.stamp(13, 0, ['.w.', 'wxw', '.w.']); g.px(14, 3, 'w');
  g.rect(13, 37, 4, 2, 'b');
  g.rect(9, 39, 12, 6, 'r'); g.hl(9, 39, 12, 'f'); g.hl(9, 40, 12, 'g'); g.vl(20, 41, 4, 'q'); g.hl(10, 44, 10, 'q');
  return g.outline();
});
SPR.def('xmas_tree_on', () => SPR.grid('xmas_tree').recolor({ w: 'W', o: 'p', H: 'B', r: 's' }));
SPR.def('heater', () => {
  const g = new Grid(22, 26);
  line(g, 6, 3, 9, 1, 'y'); line(g, 15, 3, 12, 1, 'y'); g.hl(9, 1, 4, 'y');
  g.ellipse(11, 5.4, 7.6, 2.6, 'u'); g.ellipse(10, 4.8, 5, 1.4, 'v');
  g.rect(3, 6, 16, 14, 'v'); g.vl(3, 6, 14, 'w'); g.vl(4, 6, 14, 'w'); g.vl(17, 6, 14, 'u'); g.vl(18, 6, 14, 'u');
  g.rect(6, 10, 10, 7, 'Y'); g.hl(6, 10, 10, 'y'); for (let x = 7; x < 16; x += 2) g.vl(x, 11, 6, 'y');
  g.rect(2, 20, 18, 2, 'y'); g.hl(2, 20, 18, 'z'); g.rect(3, 22, 3, 2, 'y'); g.rect(16, 22, 3, 2, 'y'); g.px(16, 8, 'r');
  return g.outline();
});
SPR.def('snowman', () => {
  const g = new Grid(13, 17);
  g.ellipse(6.5, 12, 4.8, 3.8, 'f'); g.ellipse(6.5, 6.4, 3.4, 3.1, 'f');
  for (let y = 0; y < 17; y++) for (let x = 0; x < 13; x++) if (g.get(x, y) === 'f' && x >= 8 && (y > 9 || x >= 9)) g.px(x, y, 'B');
  g.rect(4, 1, 5, 3, 'Y'); g.hl(3, 3, 7, 'Y'); g.hl(4, 2, 5, 'r');
  g.px(5, 6, '0'); g.px(7, 6, '0'); g.px(7, 7, 'v'); g.px(8, 7, 'v');
  g.hl(3, 9, 7, 'r'); g.px(8, 10, 'r'); g.px(8, 11, 'q'); g.px(6, 12, '0'); g.px(6, 14, '0');
  return g.outline();
});
SPR.def('yarn_basket', () => {
  const g = new Grid(20, 15);
  g.ellipse(6.5, 6, 3, 2.8, 's'); g.ellipse(12, 5.4, 3.2, 3, 'o'); g.ellipse(15.5, 7, 2.2, 2.1, 'k');
  line(g, 5, 4, 8, 7, 'r'); line(g, 10, 3, 14, 7, 'n'); line(g, 11, 0, 17, 5, 'A'); line(g, 13, 0, 18, 4, 'B');
  g.rect(2, 8, 16, 6, 'c'); g.hl(1, 7, 18, 'd'); g.hl(1, 8, 18, 'b');
  for (let y = 9; y < 14; y++) for (let x = 2; x < 18; x++) if ((x + y * 2) % 4 === 0) g.px(x, y, 'd'); else if ((x - y) % 5 === 0) g.px(x, y, 'b');
  g.hl(2, 13, 16, 'b');
  return g.outline();
});
SPR.def('stocking', () => {
  const g = new Grid(13, 17);
  g.pts([[6, 0], [5, 1], [7, 1]], 'a');
  g.rect(3, 2, 7, 3, 'f'); g.hl(3, 4, 7, 'g');
  g.rect(4, 5, 5, 6, 'r'); g.vl(8, 5, 6, 'q');
  g.rect(4, 10, 7, 4, 'r'); g.px(11, 11, 'r'); g.px(11, 12, 'r'); g.hl(5, 13, 6, 'q'); g.pts([[4, 11], [4, 12], [5, 12]], 'f'); g.pts([[10, 10], [11, 10]], 'f');
  g.px(6, 7, 'f'); g.px(6, 8, 'k');
  return g.outline();
});

// ---------------- starry studio ----------------
SPR.def('gaming_chair', () => {
  const g = new Grid(22, 33);
  g.rect(4, 1, 14, 16, 'y'); g.cut(4, 1, 14, 16, 2);
  g.vl(5, 3, 13, 'r'); g.vl(16, 3, 13, 'r'); g.vl(6, 3, 12, 'q'); g.hl(6, 1, 10, 'z'); g.rect(8, 3, 6, 3, 'z'); g.hl(8, 3, 6, 'A');
  g.hl(5, 16, 12, 'Y');
  g.rect(2, 16, 18, 3, 'y'); g.hl(2, 16, 18, 'z'); g.vl(2, 12, 5, 'Y'); g.vl(19, 12, 5, 'Y');
  g.rect(10, 19, 2, 6, 'A'); g.vl(11, 19, 6, 'z');
  g.hl(4, 25, 14, 'Y'); g.pts([[3, 26], [4, 26], [17, 26], [18, 26], [10, 26], [11, 26]], 'y');
  return g.outline();
});
SPR.def('dual_monitor', () => {
  const g = new Grid(40, 20);
  for (const ox of [1, 21]) {
    g.rect(ox, 1, 18, 12, 'y'); g.rect(ox + 1, 2, 16, 9, ox === 1 ? 'F' : 'm');
    if (ox === 1) { g.rect(ox + 2, 3, 6, 5, 'G'); g.hl(ox + 2, 3, 6, 'H'); g.hl(ox + 9, 3, 6, 'K'); g.hl(ox + 9, 5, 5, 's'); g.hl(ox + 9, 7, 6, 'o'); g.hl(ox + 2, 9, 12, 'H'); }
    else { for (let i = 0; i < 4; i++) g.hl(ox + 2, 3 + i * 2, 4 + (i * 5) % 9, i % 2 ? 'k' : 'o'); g.hl(ox + 10, 3, 5, 's'); }
    g.rect(ox + 8, 13, 2, 3, 'z'); g.hl(ox + 5, 16, 8, 'y'); g.hl(ox + 5, 15, 8, 'z');
  }
  return g.outline();
});
SPR.def('neon_note', () => {
  const g = new Grid(18, 22);
  const P = (pts) => { for (const [x, y] of pts) { g.px(x, y, 'J'); } };
  for (let y = 2; y < 15; y++) { g.px(6, y, 'J'); g.px(13, y - 1, 'J'); }
  line(g, 6, 2, 13, 1, 'J'); line(g, 6, 3, 13, 2, 'J'); line(g, 6, 5, 13, 4, 'J');
  g.ellipse(4.5, 15.5, 2.6, 2, 'J'); g.ellipse(11.5, 14.5, 2.6, 2, 'J'); g.ellipse(4.3, 15.3, 1.3, 0.9, 'I'); g.ellipse(11.3, 14.3, 1.3, 0.9, 'I');
  P([]);
  const o = g.pad(0); o.outline('y');
  return o;
});
SPR.def('neon_note_on', () => SPR.grid('neon_note').recolor({ J: 'K', I: 'Z' }));
SPR.def('vinyl_shelf', () => {
  const g = new Grid(36, 17);
  g.rect(1, 1, 34, 14, 'a'); g.rect(2, 2, 32, 11, '1'); g.hl(1, 1, 34, 'b'); g.hl(1, 14, 34, 'b');
  let x = 3; const r = rng(7);
  while (x < 21) { const c = BOOKS[Math.floor(r() * BOOKS.length)]; g.vl(x, 3, 10, c[1]); g.px(x, 3, c[2]); x += 1 + (r() < 0.4 ? 1 : 0); }
  g.rect(22, 3, 10, 10, 'w'); g.ellipse(27, 8, 3.6, 3.6, 'Y'); g.ellipse(27, 8, 1.2, 1.2, 'r'); g.hl(22, 3, 10, 'x'); g.px(24, 5, 'x');
  return g.outline();
});
SPR.def('speaker', () => {
  const g = new Grid(15, 25);
  g.rect(1, 1, 13, 22, 'y'); g.vl(1, 1, 22, 'z'); g.hl(1, 1, 13, 'z'); g.vl(13, 1, 22, 'Y');
  g.ellipse(7.5, 5.5, 2.4, 2.4, 'A'); g.ellipse(7.5, 5.5, 1.5, 1.5, 'Y');
  g.ellipse(7.5, 14.5, 5, 5, 'A'); g.ellipse(7.5, 14.5, 4, 4, 'Y'); g.ellipse(7.5, 14.5, 1.6, 1.6, 'z'); g.px(6, 13, 'A');
  g.rect(2, 23, 3, 1, 'Y'); g.rect(10, 23, 3, 1, 'Y');
  return g.outline();
});

// ---------------- music & theme icons ----------------
SPR.def('i_music', icon(g => {
  g.vl(5, 3, 9, 'G'); g.vl(12, 2, 9, 'G'); line(g, 5, 3, 12, 2, 'G'); line(g, 5, 4, 12, 3, 'G'); line(g, 5, 5, 12, 4, 'G');
  g.ellipse(3.6, 12, 2.3, 1.8, 'G'); g.ellipse(10.6, 11, 2.3, 1.8, 'G'); g.px(3, 11, 'H'); g.px(10, 10, 'H'); g.px(5, 6, 'H');
}));
SPR.def('i_prev', icon(g => { g.rect(2, 4, 2, 8, 'n'); for (let i = 0; i < 9; i++) g.vl(5 + i, Math.round(7.6 - i / 2), Math.max(1, i + 1 - (i > 7 ? 1 : 0)), 'o'); g.vl(5, 7, 2, 'p'); }));
SPR.def('i_next', () => SPR.grid('i_prev').flip());
SPR.def('i_shuffle', icon(g => { line(g, 2, 4, 6, 4, 'o'); line(g, 6, 4, 10, 11, 'o'); line(g, 10, 11, 13, 11, 'o'); line(g, 2, 11, 6, 11, 'n'); line(g, 6, 11, 10, 4, 'n'); line(g, 10, 4, 13, 4, 'n'); g.pts([[12, 2], [13, 3], [12, 5], [12, 9], [13, 10], [12, 12]], 'n'); g.pts([[11, 3], [11, 5], [11, 10], [11, 12]], 'n'); }));
SPR.def('i_repeat', icon(g => { g.hl(4, 3, 9, 'k'); g.vl(12, 3, 5, 'k'); g.hl(3, 12, 9, 'k'); g.vl(3, 8, 5, 'k'); g.pts([[5, 2], [5, 4], [6, 1], [6, 5], [10, 11], [10, 13], [9, 10], [9, 14]], 'j'); }));
SPR.def('i_repeat1', icon(g => { g.hl(4, 3, 9, 'k'); g.vl(12, 3, 5, 'k'); g.hl(3, 12, 9, 'k'); g.vl(3, 8, 5, 'k'); g.pts([[5, 2], [5, 4], [6, 1], [6, 5], [10, 11], [10, 13], [9, 10], [9, 14]], 'j'); g.vl(8, 6, 4, 'w'); g.px(7, 6, 'w'); }));
SPR.def('i_vol', icon(g => { g.rect(2, 6, 3, 4, 'z'); for (let i = 0; i < 4; i++) g.vl(5 + i, 6 - i, 4 + i * 2, 'A'); g.pts([[11, 5], [12, 6], [12, 7], [12, 8], [12, 9], [11, 10]], 'o'); g.pts([[13, 3], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [13, 12]], 'n'); }));
SPR.def('i_folder', icon(g => { g.rect(2, 4, 5, 2, 'v'); g.rect(2, 5, 12, 9, 'w'); g.hl(2, 6, 12, 'x'); g.hl(2, 13, 12, 'v'); g.vl(13, 6, 8, 'v'); }));
SPR.def('i_video', icon(g => { g.rect(1, 3, 14, 10, 'y'); g.rect(2, 4, 12, 8, 'm'); g.vl(6, 5, 6, 'f'); g.vl(7, 6, 4, 'f'); g.vl(8, 6, 4, 'f'); g.vl(9, 7, 2, 'f'); g.hl(5, 14, 6, 'z'); }));
SPR.def('i_theme', icon(g => { for (let i = 0; i < 7; i++) g.hl(7 - i, 2 + i, 2 + i * 2, 'r'); g.hl(1, 8, 14, 'q'); g.rect(3, 9, 10, 5, 'f'); g.rect(7, 10, 3, 4, 'c'); g.rect(4, 10, 2, 2, 'p'); g.hl(3, 13, 10, 'g'); }));
SPR.def('i_view', icon(g => { g.rect(2, 2, 12, 12, 'p'); g.ellipse(10, 5, 1.6, 1.6, 'x'); for (let x = 2; x < 14; x++) { const hy = Math.round(9 - Math.sin(x * 0.6) * 1.5); g.vl(x, hy, 14 - hy, 'k'); } g.vl(7, 2, 12, 'f'); g.hl(2, 8, 12, 'f'); }));
