/* ============================================================
   UI pixel art: icons + 9-slice frames
   ============================================================ */
function icon(fn, w = 16, h = 16) { return () => { const g = new Grid(w, h); fn(g); return g.outline(); }; }

SPR.def('i_tomato', icon(g => {
  g.ellipse(8, 9.5, 6.2, 5.3, 'r');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g.get(x, y) === 'r' && ((x - 4) ** 2 + (y - 6) ** 2) > 70) g.px(x, y, 'q');
  g.ellipse(5.5, 8, 1.8, 1.5, 's'); g.px(5, 7, 't');
  g.pts([[8, 2], [8, 3], [7, 4], [9, 4], [6, 4], [10, 4], [5, 5], [11, 5], [8, 5]], 'j'); g.pts([[8, 3], [7, 4]], 'k');
}));
SPR.def('i_list', icon(g => {
  g.rect(3, 3, 10, 12, 'c'); g.rect(4, 4, 8, 10, 'f'); g.rect(6, 2, 4, 2, 'z'); g.hl(6, 2, 4, 'A');
  for (const [y, done] of [[6, 1], [9, 1], [12, 0]]) {
    g.rect(5, y, 2, 2, done ? 'k' : 'h'); g.hl(8, y, 3, 'h'); g.hl(8, y + 1, 2, 'g');
    if (done) g.px(5, y, 'j');
  }
}));
SPR.def('i_note', icon(g => {
  g.rect(2, 2, 12, 12, 'w'); g.hl(2, 2, 12, 'x'); g.hl(2, 3, 12, 'x');
  for (let i = 0; i < 4; i++) for (let j = 0; j <= i; j++) g.px(13 - j, 10 + i, '.');
  g.pts([[10, 13], [11, 12], [12, 11], [13, 10], [11, 13], [12, 12], [13, 11], [12, 13], [13, 12]], 'v');
  g.pts([[10, 13], [11, 12], [12, 11], [13, 10]], 'u');
  g.hl(4, 6, 7, 'v'); g.hl(4, 8, 8, 'v'); g.hl(4, 10, 5, 'v'); g.pts([[7, 1], [8, 1]], 'r'); g.px(7, 2, 'r'); g.px(8, 2, 's');
}));
SPR.def('i_shop', icon(g => {
  g.rect(3, 6, 10, 8, 's'); g.hl(3, 6, 10, 't'); g.vl(12, 7, 7, 'r'); g.hl(3, 13, 10, 'r');
  g.pts([[5, 6], [5, 5], [5, 4], [6, 3], [7, 2], [8, 2], [9, 3], [10, 4], [10, 5], [10, 6]], 'q');
  g.pts([[7, 9], [9, 9], [6, 9], [10, 9], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [7, 11], [8, 11], [9, 11], [8, 12], [8, 9]], 'f');
  g.px(8, 9, 's');
}));
SPR.def('i_box', icon(g => {
  g.rect(2, 7, 12, 7, 'd'); g.vl(13, 7, 7, 'c'); g.hl(2, 13, 12, 'c');
  g.pts([[3, 4], [4, 4], [5, 4], [6, 4], [7, 4]], 'e'); g.rect(2, 5, 6, 2, 'e'); g.rect(8, 5, 6, 2, 'd'); g.hl(9, 4, 4, 'd');
  g.vl(8, 5, 9, 'h'); g.vl(7, 5, 9, 'g'); g.hl(4, 10, 2, 'c');
}));
SPR.def('i_brush', icon(g => {
  line(g, 13, 2, 8, 7, 'b'); line(g, 12, 2, 7, 7, 'c'); line(g, 13, 3, 9, 7, 'a');
  g.pts([[6, 8], [7, 8], [7, 9], [8, 8], [6, 9]], 'A'); g.px(8, 9, 'z');
  g.pts([[5, 9], [4, 10], [5, 10], [3, 11], [4, 11], [5, 11], [2, 12], [3, 12], [4, 12], [2, 13], [3, 13], [6, 10]], 's');
  g.pts([[5, 9], [4, 10], [3, 11], [2, 12]], 'r'); g.px(2, 13, 'q');
}));
SPR.def('i_shirt', icon(g => {
  g.stamp(1, 3, ['...oo....oo...', '.oooo.pp.oooo.', 'ooooooooooooo.', 'ooo.ooooo.ooo.', '....ooooo.....', '....ooooo.....', '....ooooo.....', '....ooooo.....', '....ooooo.....', '....nnnnn.....']);
  g.replace('o', 'o'); g.vl(9, 7, 6, 'n'); g.vl(5, 7, 6, 'p'); g.pts([[7, 4], [8, 4]], 'f');
}));
SPR.def('i_paw', icon(g => {
  g.ellipse(8, 11.5, 3.6, 2.8, 's'); g.ellipse(7.5, 11, 1.8, 1.2, 't');
  for (const [x, y] of [[3, 7.5], [6.2, 4.6], [9.8, 4.6], [13, 7.5]]) { g.ellipse(x, y, 1.4, 1.7, 's'); }
  g.pts([[3, 7], [6, 4], [10, 4], [13, 7]], 't');
}));
SPR.def('i_people', icon(g => {
  g.ellipse(5.5, 5.5, 2.6, 2.6, 'o'); g.rect(2, 9, 7, 5, 'n'); g.cut(2, 9, 7, 5, 1); g.px(4, 4, 'p');
  g.ellipse(11, 6.5, 2.4, 2.4, 's'); g.rect(8, 10, 7, 4, 'r'); g.cut(8, 10, 7, 4, 1); g.px(10, 5, 't');
}));
SPR.def('i_gear', icon(g => {
  g.ellipse(8, 8, 5, 5, 'A'); for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; g.rect(Math.round(8 + Math.cos(t) * 5.6 - 1), Math.round(8 + Math.sin(t) * 5.6 - 1), 2, 2, 'A'); }
  g.ellipse(8, 8, 2, 2, '.'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g.get(x, y) === 'A' && x + y > 17) g.px(x, y, 'z');
}));
SPR.def('i_mini', icon(g => {
  g.rect(2, 3, 12, 10, 'f'); g.hl(2, 3, 12, 'z'); g.hl(2, 4, 12, 'A'); g.rect(8, 8, 5, 4, 'o'); g.hl(8, 8, 5, 'p');
  line(g, 4, 6, 7, 9, 'n'); g.pts([[6, 9], [7, 8], [5, 9]], 'n');
}));
SPR.def('i_expand', icon(g => {
  g.rect(2, 3, 12, 10, 'f'); g.hl(2, 3, 12, 'z'); g.hl(2, 4, 12, 'A');
  line(g, 5, 10, 10, 6, 'n'); g.pts([[8, 6], [9, 6], [10, 7], [10, 8]], 'n');
}));
SPR.def('i_coin', icon(g => {
  g.ellipse(7, 8, 5.8, 6, 'u'); g.ellipse(6.6, 7.6, 4.8, 5, 'w'); g.ellipse(6.2, 7.2, 3, 3.2, 'x');
  g.pts([[6, 5], [6, 6], [6, 7], [6, 8], [6, 9], [7, 5], [7, 9]], 'v'); g.px(5, 5, 'Z');
}, 14, 16));
SPR.def('i_star', icon(g => {
  g.stamp(1, 1, ['......w.......', '.....wxw......', '.....wxw......', 'wwwwwxxwwwww..', '.wxxxxxwwwu...', '..wwxwwwwu....', '...wwwwwvu....', '...wwwvwwu....', '..wwwu.vvwu...', '..wvu...uvu...', '..u.......u...']);
}));
SPR.def('i_heart', icon(g => {
  g.stamp(1, 2, ['..rr...rr..', '.rsrr.rrrr.', 'rsttrrrrrrq', 'rssrrrrrrrq', 'rrrrrrrrrrq', '.rrrrrrrrq.', '..rrrrrrq..', '...rrrrq...', '....rrq....', '.....q.....']);
}, 13, 14));
SPR.def('i_check', icon(g => { g.pts([[2, 8], [3, 9], [4, 10], [5, 11], [6, 10], [7, 9], [8, 8], [9, 7], [10, 6], [11, 5], [12, 4]], 'j'); g.pts([[3, 8], [4, 9], [5, 10], [6, 9], [7, 8], [8, 7], [9, 6], [10, 5], [11, 4], [12, 3]], 'k'); }, 15, 14));
SPR.def('i_trash', icon(g => { g.rect(4, 5, 8, 9, 'A'); g.hl(3, 4, 10, 'z'); g.hl(6, 3, 4, 'z'); g.vl(6, 7, 5, 'z'); g.vl(9, 7, 5, 'z'); g.vl(11, 5, 9, 'z'); g.vl(4, 5, 9, 'B'); }));
SPR.def('i_flip', icon(g => {
  g.vl(8, 2, 12, 'A');
  g.stamp(1, 4, ['...o..', '..oo..', '.ooooo', '.ooooo', '..oo..', '...o..']); g.stamp(10, 4, ['..s...', '..ss..', 'sssss.', 'sssss.', '..ss..', '..s...']);
}));
SPR.def('i_plus', icon(g => { g.rect(6, 2, 3, 11, 'k'); g.rect(2, 6, 11, 3, 'k'); g.vl(6, 2, 11, 'l'); g.hl(2, 6, 11, 'l'); }, 15, 15));
SPR.def('i_play', icon(g => { for (let i = 0; i < 6; i++) g.vl(4 + i, 2 + i, 12 - i * 2, 'k'); g.vl(4, 2, 12, 'l'); }, 14, 16));
SPR.def('i_pause', icon(g => { g.rect(3, 3, 3, 10, 'w'); g.rect(9, 3, 3, 10, 'w'); g.vl(3, 3, 10, 'x'); g.vl(9, 3, 10, 'x'); }, 15, 16));
SPR.def('i_reset', icon(g => {
  for (let a = 0; a < 40; a++) { const t = 0.5 + a / 40 * Math.PI * 1.6; g.px(Math.round(8 + Math.cos(t) * 5), Math.round(8 + Math.sin(t) * 5), 'o'); g.px(Math.round(8 + Math.cos(t) * 4), Math.round(8 + Math.sin(t) * 4), 'n'); }
  g.stamp(10, 1, ['oo...', 'ooo..', 'oooo.', 'ooo..']);
}));
SPR.def('i_sun', icon(g => {
  g.ellipse(8, 8, 3.6, 3.6, 'w'); g.ellipse(7.5, 7.5, 2, 2, 'x');
  for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; g.px(Math.round(8 + Math.cos(t) * 6), Math.round(8 + Math.sin(t) * 6), 'v'); }
}));
SPR.def('i_moon', icon(g => { g.ellipse(8, 8, 5.5, 5.5, 'w'); g.ellipse(10.5, 6.5, 4.3, 4.3, '.'); g.pts([[4, 7], [4, 9], [5, 11]], 'x'); g.pts([[12, 12], [13, 3]], 'x'); }));
SPR.def('i_rain', icon(g => {
  g.ellipse(6, 7, 3.5, 2.8, 'B'); g.ellipse(10, 6, 3.6, 3.3, 'B'); g.rect(3, 7, 11, 3, 'B'); g.hl(3, 9, 11, 'A'); g.px(8, 4, 'Z');
  g.pts([[4, 12], [3, 13], [8, 12], [7, 13], [12, 12], [11, 13]], 'o');
}));
SPR.def('i_chat', icon(g => {
  g.rect(2, 3, 12, 8, 'f'); g.cut(2, 3, 12, 8, 1); g.hl(2, 10, 12, 'g'); g.pts([[4, 11], [4, 12], [5, 11]], 'f');
  g.pts([[5, 7], [8, 7], [11, 7]], 'z');
}));
SPR.def('i_close', icon(g => { for (let i = 0; i < 8; i++) { g.px(3 + i, 3 + i, 'y'); g.px(4 + i, 3 + i, 'y'); g.px(10 - i, 3 + i, 'y'); g.px(11 - i, 3 + i, 'y'); } }, 15, 14));
SPR.def('i_wall', icon(g => {
  g.rect(2, 2, 12, 12, 't'); for (let x = 2; x < 14; x += 3) g.vl(x, 2, 12, 's'); g.pts([[4, 5], [10, 9], [7, 12]], 'f'); g.hl(2, 13, 12, 'h'); g.hl(2, 12, 12, 'f');
}));
SPR.def('i_floor', icon(g => {
  g.rect(2, 4, 12, 10, 'd'); for (const y of [6, 9, 12]) g.hl(2, y, 12, 'c'); g.px(6, 5, 'b'); g.px(10, 7, 'b'); g.px(5, 8, 'b'); g.px(11, 10, 'b'); g.px(7, 13, 'b'); g.hl(2, 4, 12, 'e');
}));
SPR.def('i_lamp', icon(g => { g.stamp(4, 2, ['..xxxx..', '.xxxxxx.', 'wxxxxxxw', '...yy...', '...yy...', '...yy...', '...yy...', '..yzzy..', '.yyyyyy.']); }));
SPR.def('i_sparkle', icon(g => { g.pts([[8, 2], [8, 3], [8, 4], [8, 12], [8, 13], [8, 11], [2, 8], [3, 8], [4, 8], [12, 8], [13, 8], [11, 8], [7, 7], [9, 7], [7, 9], [9, 9], [8, 6], [8, 10], [6, 8], [10, 8]], 'w'); g.px(8, 8, 'Z'); g.pts([[8, 5], [8, 9], [7, 8], [9, 8], [5, 8], [8, 7]], 'x'); }));
SPR.def('i_book', icon(g => { g.rect(2, 4, 6, 9, 'G'); g.rect(8, 4, 6, 9, 'G'); g.rect(3, 4, 5, 8, 'f'); g.rect(8, 4, 5, 8, 'f'); g.vl(8, 4, 9, 'F'); g.hl(4, 6, 3, 'h'); g.hl(9, 6, 3, 'h'); g.hl(4, 8, 3, 'h'); g.hl(9, 8, 3, 'h'); }));
SPR.def('i_bell', icon(g => { g.ellipse(8, 7.5, 4, 4.5, 'w'); g.rect(4, 8, 8, 4, 'w'); g.hl(3, 12, 10, 'v'); g.px(8, 13, 'u'); g.px(8, 2, 'u'); g.vl(6, 5, 4, 'x'); }));

// small particle sprites (unoutlined, drawn in-room)
SPR.def('p_heart', () => Grid.rows(['.r.r.', 'rsrrr', 'rrrrr', '.rrr.', '..r..']));
SPR.def('p_note', () => Grid.rows(['..00', '.0.0', '.0..', '00..', '00..']));
SPR.def('p_z', () => Grid.rows(['0000', '..0.', '.0..', '0000']));
SPR.def('p_spark', () => Grid.rows(['.X.', 'XWX', '.X.']));
SPR.def('p_bubble', () => Grid.rows(['.p.', 'p:p', '.p.']));
SPR.def('p_leaf', () => Grid.rows(['.k', 'kj', 'j.']));
SPR.def('p_steam', () => Grid.rows(['f.', '.f', 'f.']));
SPR.def('p_coin', () => Grid.rows(['.ww.', 'wxwu', 'wwwu', '.uu.']));
SPR.def('p_dot', () => Grid.rows(['f']));

// ---- 9-slice frames (returned as dataURLs at a given scale) ----
function framePanel() {
  // 11x11 source: outline, wood ring, light inner ring
  const g = new Grid(11, 11);
  g.rect(0, 0, 11, 11, '0'); g.rect(1, 1, 9, 9, 'c'); g.hl(1, 1, 9, 'd'); g.vl(1, 1, 9, 'd'); g.hl(1, 9, 9, 'b'); g.vl(9, 1, 9, 'b');
  g.rect(2, 2, 7, 7, 'a'); g.rect(3, 3, 5, 5, '.');
  g.px(0, 0, '.'); g.px(10, 0, '.'); g.px(0, 10, '.'); g.px(10, 10, '.'); g.px(1, 1, '0'); g.px(9, 1, '0'); g.px(1, 9, '0'); g.px(9, 9, '0');
  return g;
}
function frameButton(state) {
  const g = new Grid(9, 10);
  g.rect(0, 0, 9, 10, '0'); g.px(0, 0, '.'); g.px(8, 0, '.'); g.px(0, 9, '.'); g.px(8, 9, '.');
  if (state === 'down') { g.rect(1, 1, 7, 8, 'g'); g.hl(1, 1, 7, 'h'); g.rect(2, 3, 5, 5, '.'); g.hl(1, 8, 7, 'g'); }
  else { g.rect(1, 1, 7, 8, 'f'); g.hl(1, 7, 7, 'h'); g.hl(1, 8, 7, 'h'); g.rect(2, 2, 5, 4, '.'); }
  return g;
}
function frameTab(on) {
  const g = new Grid(9, 9);
  g.rect(0, 0, 9, 9, '0'); g.px(0, 0, '.'); g.px(8, 0, '.'); g.px(0, 8, '.'); g.px(8, 8, '.');
  g.rect(1, 1, 7, 7, on ? 'w' : 'g'); g.hl(1, 1, 7, on ? 'x' : 'f'); g.hl(1, 7, 7, on ? 'v' : 'h'); g.rect(2, 2, 5, 4, '.');
  return g;
}
function gridDataURL(g, scale) {
  const c = g.toCanvas(); const big = document.createElement('canvas'); big.width = c.width * scale; big.height = c.height * scale;
  const x = big.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, big.width, big.height); return big.toDataURL();
}
function spriteDataURL(name, scale) { return gridDataURL(SPR.grid(name), scale); }
