/* ============================================================
   Supplies, need bubbles, pet bowl, achievement decor, icons
   ============================================================ */
function item12(fn) { return () => { const g = new Grid(12, 12); fn(g); return g.outline(); }; }

SPR.def('it_cat_can', item12(g => {
  g.rect(2, 3, 8, 7, 'n'); g.hl(2, 2, 8, 'B'); g.hl(3, 1, 6, 'A'); g.hl(2, 9, 8, 'm'); g.hl(3, 10, 6, 'z');
  g.rect(2, 4, 8, 4, 'p'); g.vl(3, 3, 6, 'o');
  g.pts([[4, 6], [5, 5], [6, 5], [7, 6], [6, 7], [5, 7], [8, 5], [8, 7]], 'v'); g.px(5, 6, 'v'); g.px(6, 6, 'w');
}));
SPR.def('it_cat_treat', item12(g => {
  g.ellipse(5, 6, 3.6, 2.7, 'v'); g.pts([[8, 6], [9, 5], [10, 4], [9, 7], [10, 8], [9, 6]], 'v'); g.pts([[10, 5], [10, 7]], 'u');
  g.hl(3, 5, 3, 'w'); g.px(3, 6, '0'); g.pts([[5, 8], [6, 8], [7, 7]], 'u'); g.px(6, 4, 'x');
}));
SPR.def('it_catnip', item12(g => {
  g.rect(3, 6, 6, 5, 'g'); g.hl(3, 6, 6, 'f'); g.vl(8, 7, 4, 'h'); g.hl(4, 8, 4, 'k');
  leaf(g, 6, 6, 4.5, -2.1, 1.5, ['i', 'j', 'k', 'l']); leaf(g, 6, 6, 4.5, -1.0, 1.5, ['i', 'j', 'k', 'l']); leaf(g, 6, 6, 3.5, -1.57, 1.3, ['i', 'j', 'k', 'l']);
}));
SPR.def('it_fertilizer', item12(g => {
  g.rect(4, 0, 4, 2, 'r'); g.rect(5, 2, 2, 1, 'f'); g.rect(3, 3, 6, 8, 'k'); g.vl(3, 3, 8, 'l'); g.vl(8, 4, 7, 'j'); g.hl(3, 10, 6, 'j');
  g.rect(4, 5, 4, 4, 'f'); g.pts([[5, 7], [6, 6], [6, 7], [5, 6]], 'j'); g.px(6, 5, 'k');
}));
SPR.def('it_spray', item12(g => {
  g.rect(3, 1, 5, 2, 'y'); g.px(2, 1, 'y'); g.px(1, 2, 'z'); g.vl(7, 3, 2, 'y'); g.px(8, 3, 'y');
  g.rect(4, 3, 3, 1, 'B'); g.rect(3, 4, 6, 7, 'p'); g.rect(3, 7, 6, 4, 'o'); g.vl(3, 4, 7, 'f'); g.hl(4, 5, 3, 'f');
  g.pts([[0, 0], [0, 4]], 'K');
}));
SPR.def('it_bulb', item12(g => {
  g.ellipse(6, 4.5, 3.8, 3.8, 'x'); g.ellipse(5, 3.5, 1.4, 1.4, 'W'); for (let y = 0; y < 9; y++) for (let x = 7; x < 11; x++) if (g.get(x, y) === 'x') g.px(x, y, 'w');
  g.rect(4, 8, 4, 1, 'w'); g.rect(4, 9, 4, 1, 'A'); g.rect(4, 10, 4, 1, 'z'); g.px(5, 11, 'y'); g.px(6, 11, 'y');
}));
SPR.def('it_coffee', item12(g => {
  g.rect(2, 2, 8, 2, 'f'); g.hl(3, 1, 6, 'g');
  for (let y = 4; y < 11; y++) { const inset = Math.floor((y - 4) / 3); g.hl(3 + inset, y, 6 - inset * 2, 'g'); }
  g.rect(3, 6, 6, 2, 'b'); g.hl(3, 6, 6, 'c'); g.vl(3, 4, 2, 'f');
}));
SPR.def('it_onigiri', item12(g => {
  for (let y = 1; y < 11; y++) { const hw = Math.min(5, (y + 1) * 0.55); g.hl(Math.round(6 - hw), y, Math.round(hw * 2), 'f'); }
  for (let y = 1; y < 11; y++) for (let x = 0; x < 12; x++) if (g.get(x, y) === 'f' && x > 6 && y > 4) g.px(x, y, 'g');
  g.rect(3, 7, 6, 4, 'Y'); g.hl(3, 7, 6, 'y'); g.px(4, 3, 'Z');
}));
// small icons for action needs
SPR.def('n_box', item12(g => { g.rect(1, 4, 10, 6, 'd'); g.hl(1, 4, 10, 'e'); g.rect(1, 2, 5, 2, 'e'); g.rect(6, 2, 5, 2, 'd'); g.vl(6, 2, 8, 'h'); g.hl(2, 7, 2, 'c'); }));
SPR.def('n_light', item12(g => { g.stamp(2, 1, ['..xxxx..', '.xxxxxx.', 'wxxxxxxw', '...yy...', '...yy...', '..yzzy..', '.yyyyyy.']); g.pts([[0, 3], [11, 3], [1, 0], [10, 0]], 'X'); }));
SPR.def('n_sun', item12(g => { g.ellipse(6, 6, 3, 3, 'w'); g.ellipse(5.5, 5.5, 1.5, 1.5, 'x'); for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; g.px(Math.round(6 + Math.cos(t) * 5 - 0.5), Math.round(6 + Math.sin(t) * 5 - 0.5), 'v'); } }));
SPR.def('n_heart', item12(g => { g.stamp(1, 2, ['.rr..rr.', 'rsrrrrrr', 'rtsrrrrq', 'rrrrrrrq', '.rrrrrq.', '..rrrq..', '...rq...']); g.pts([[9, 1], [10, 0], [10, 2]], 'w'); }));
SPR.def('n_seat', item12(g => { g.ellipse(6, 7, 5, 3, 'G'); g.ellipse(5.5, 6.3, 3.6, 1.8, 'H'); g.px(6, 7, 'F'); g.pts([[3, 2], [4, 1], [5, 2], [8, 3], [9, 2]], 'r'); }));

SPR.def('p_think', () => {
  const g = new Grid(20, 19);
  g.rect(1, 1, 18, 14, 'f'); g.cut(1, 1, 18, 14, 2); g.hl(3, 1, 14, 'Z'); g.hl(2, 14, 16, 'g');
  g.pts([[4, 15], [5, 15], [3, 16], [4, 16]], 'f'); g.px(2, 17, 'f');
  return g.outline();
});

SPR.def('pet_bowl', () => {
  const g = new Grid(18, 10);
  g.ellipse(9, 4.5, 7.5, 3.4, 'r'); g.ellipse(9, 3.6, 6, 2, 'q'); g.ellipse(9, 3.8, 5, 1.5, 'Y');
  for (let x = 0; x < 18; x++) for (let y = 5; y < 10; y++) if (g.get(x, y) === 'r' && y >= 6) g.px(x, y, 'q');
  g.hl(5, 7, 8, 'q'); g.pts([[4, 4], [5, 5]], 's'); g.pts([[12, 5], [13, 5]], 'f');
  return g.outline();
});
SPR.def('pet_bowl_full', () => {
  const g = SPR.grid('pet_bowl').clone();
  for (let x = 0; x < 18; x++) for (let y = 0; y < 6; y++) if (g.get(x, y) === 'Y') g.px(x, y, ((x + y) % 3) ? 'u' : 'v');
  g.pts([[7, 2], [9, 2], [11, 2], [8, 1], [10, 1]], 'u'); g.px(9, 1, 'v');
  return g;
});
SPR.def('pet_bowl_half', () => {
  const g = SPR.grid('pet_bowl').clone();
  for (let x = 0; x < 18; x++) for (let y = 0; y < 6; y++) if (g.get(x, y) === 'Y' && y >= 4) g.px(x, y, ((x + y) % 3) ? 'u' : 'v');
  g.pts([[7, 3], [10, 3]], 'u');
  return g;
});
SPR.def('pet_bowl_low', () => {
  const g = SPR.grid('pet_bowl').clone();
  g.pts([[6, 4], [8, 5], [11, 4], [12, 5]], 'u'); g.px(9, 4, 'v');
  return g;
});
SPR.def('trophy', () => {
  const g = new Grid(16, 18);
  g.rect(4, 1, 8, 2, 'w'); g.ellipse(8, 3.5, 4.4, 4.4, 'w'); for (let y = 0; y < 4; y++) g.hl(0, y, 16, '.');
  g.rect(4, 1, 8, 4, 'w'); g.hl(4, 1, 8, 'x');
  for (let x = 0; x < 16; x++) for (let y = 0; y < 18; y++) if (g.get(x, y) === 'w' && x >= 10) g.px(x, y, 'v');
  g.pts([[3, 2], [2, 3], [2, 4], [3, 5], [12, 2], [13, 3], [13, 4], [12, 5]], 'u');
  g.vl(5, 2, 4, 'x'); g.rect(7, 8, 2, 3, 'u'); g.rect(5, 11, 6, 2, 'w'); g.hl(5, 11, 6, 'x');
  g.rect(3, 13, 10, 4, 'b'); g.hl(3, 13, 10, 'c'); g.rect(6, 14, 4, 2, 'x');
  g.px(8, 4, 'Z');
  return g.outline();
});
SPR.def('diploma', () => {
  const g = new Grid(26, 20);
  g.rect(1, 1, 24, 18, 'b'); g.hl(1, 1, 24, 'c'); g.rect(3, 3, 20, 14, 'f'); g.hl(3, 16, 20, 'g');
  g.hl(7, 5, 12, 'G'); g.hl(5, 8, 16, 'h'); g.hl(5, 10, 14, 'h'); g.hl(5, 12, 10, 'h');
  g.ellipse(18, 13.5, 2.6, 2.6, 'r'); g.px(17, 13, 's'); g.pts([[17, 16], [19, 16], [16, 17], [20, 17]], 'q');
  return g.outline();
});
// UI icons
SPR.def('i_learn', icon(g => {
  g.rect(2, 3, 12, 10, 'n'); g.rect(3, 3, 5, 9, 'f'); g.rect(8, 3, 5, 9, 'f'); g.vl(8, 3, 10, 'm'); g.hl(2, 12, 12, 'm');
  g.stamp(3, 5, ['.ss..', 's..s.', 'ssss.', 's..s.']); g.hl(9, 6, 3, 'h'); g.hl(9, 8, 3, 'h'); g.hl(9, 10, 2, 'h');
}));
SPR.def('i_task', icon(g => {
  g.rect(3, 2, 10, 12, 'g'); g.rect(4, 3, 8, 10, 'f'); g.hl(3, 2, 10, 'c'); g.hl(3, 13, 10, 'c'); g.px(2, 2, 'b'); g.px(13, 2, 'b'); g.px(2, 13, 'b'); g.px(13, 13, 'b');
  g.pts([[5, 6], [6, 7], [7, 5], [8, 4]], 'j'); g.hl(9, 6, 2, 'h'); g.hl(5, 9, 6, 'h'); g.hl(5, 11, 5, 'h');
  g.stamp(10, 8, ['.w.', 'wxw', '.w.']);
}));
SPR.def('i_speaker', icon(g => { g.rect(2, 6, 3, 4, 'z'); for (let i = 0; i < 4; i++) g.vl(5 + i, 6 - i, 4 + i * 2, 'A'); g.pts([[11, 5], [12, 6], [12, 7], [12, 8], [12, 9], [11, 10]], 'n'); g.pts([[13, 3], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [13, 12]], 'o'); }));
SPR.def('i_bag', icon(g => { g.rect(2, 6, 12, 8, 'c'); g.hl(2, 6, 12, 'd'); g.rect(6, 4, 4, 2, 'b'); g.rect(5, 8, 6, 3, 'b'); g.rect(7, 9, 2, 1, 'w'); g.hl(2, 13, 12, 'b'); g.pts([[5, 3], [10, 3], [6, 2], [9, 2], [7, 2], [8, 2]], 'a'); }));
SPR.def('i_fire', icon(g => { g.stamp(3, 1, ['....r.....', '...rr.....', '...rvr....', '..rvvr.r..', '..rvwvrr..', '.rvwwvvr..', '.rvwxwvvr.', 'rvwxxxwvr.', 'rvwxxxwvr.', 'rvvwxwvvr.', '.rvvvvvr..', '..rrrrr...']); }));
SPR.def('i_cloud', icon(g => {
  g.ellipse(5.5, 9, 3.6, 3, 'p'); g.ellipse(9, 7, 4.2, 4, 'p'); g.ellipse(12, 9.5, 2.8, 2.5, 'p'); g.rect(3, 9, 11, 3, 'p');
  g.ellipse(8.4, 6.2, 2.4, 2, 'f'); g.ellipse(5, 8.6, 1.6, 1.2, 'f'); g.px(4, 9, 'f');
  for (let x = 2; x < 15; x++) for (let y = 10; y < 13; y++) if (g.get(x, y) === 'p') g.px(x, y, 'o');
  g.hl(4, 12, 9, 'n');
}));
SPR.def('i_key', icon(g => {
  g.ellipse(5, 6, 3.4, 3.4, 'w'); g.ellipse(5, 6, 1.2, 1.2, '.'); g.pts([[3, 4], [4, 3]], 'x');
  g.rect(7, 7, 7, 2, 'w'); g.hl(8, 8, 6, 'v'); g.rect(11, 9, 1, 2, 'v'); g.rect(13, 9, 1, 3, 'v'); g.px(4, 8, 'v'); g.px(6, 8, 'v');
}));
SPR.def('i_mail', icon(g => {
  g.rect(1, 4, 14, 9, 'f'); g.hl(1, 12, 14, 'h'); g.vl(14, 4, 9, 'g');
  for (let i = 0; i < 7; i++) { g.px(1 + i, 4 + Math.floor(i * 0.75), 'r'); g.px(14 - i, 4 + Math.floor(i * 0.75), 'r'); }
  g.pts([[2, 11], [3, 10], [13, 11], [12, 10]], 'h');
}));
SPR.def('i_back', icon(g => { g.stamp(2, 3, ['....ww......', '...wxw......', '..wxxwwwwww.', '.wxxxxxxxxxw', '..wxxwwwwww.', '...wxw......', '....ww......']); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g.get(x, y) === 'w' && y > 6) g.px(x, y, 'v'); }));
SPR.def('i_dev', icon(g => {
  g.rect(1, 3, 14, 10, 'y'); g.rect(2, 4, 12, 8, 'm'); g.hl(1, 3, 14, 'z');
  g.pts([[4, 6], [5, 7], [4, 8]], 'l'); g.hl(7, 8, 3, 'x'); g.px(12, 5, 'r'); g.px(11, 5, 'w'); g.px(10, 5, 'k');
  g.rect(6, 13, 4, 1, 'z'); g.hl(4, 14, 8, 'y');
}));
SPR.def('it_fish', item12(g => {
  g.ellipse(5.5, 6, 4, 2.4, 'A'); g.pts([[9, 6], [10, 5], [11, 4], [10, 7], [11, 8], [10, 6]], 'z'); g.hl(3, 5, 4, 'B'); g.px(3, 6, '0'); g.pts([[5, 8], [6, 8], [7, 7]], 'z'); g.px(6, 4, 'f');
}));
SPR.def('it_premium', item12(g => {
  g.ellipse(6, 8, 5.5, 2.6, 'f'); g.ellipse(6, 7.2, 4.6, 1.6, 'g'); g.hl(2, 10, 8, 'h');
  g.ellipse(4.5, 5.5, 1.8, 1.4, 'N'); g.ellipse(7.5, 5.2, 1.9, 1.5, 'M'); g.px(6, 4, 'l'); g.px(5, 3, 'k'); g.px(8, 4, 'N'); g.pts([[3, 7], [9, 7]], 'x');
}));
SPR.def('it_shampoo', item12(g => {
  g.rect(5, 0, 2, 2, 'r'); g.rect(4, 2, 4, 1, 's'); g.rect(3, 3, 6, 8, 'H'); g.vl(3, 3, 8, 'B'); g.vl(8, 4, 7, 'G'); g.hl(3, 10, 6, 'G');
  g.rect(4, 6, 4, 3, 'f'); g.px(5, 7, 'K'); g.px(6, 7, 'K'); g.pts([[10, 1], [11, 3], [10, 5]], 'p'); g.px(1, 2, 'p');
}));
SPR.def('it_medicine', item12(g => {
  g.rect(2, 2, 8, 8, 'f'); g.hl(2, 2, 8, 'Z'); g.vl(9, 3, 7, 'g'); g.hl(2, 9, 8, 'h');
  g.rect(5, 3, 2, 6, 'r'); g.rect(3, 5, 6, 2, 'r'); g.px(5, 3, 's'); g.px(3, 5, 's');
}));
SPR.def('t_brush', item12(g => {
  g.rect(1, 3, 10, 3, 'c'); g.hl(1, 3, 10, 'd'); g.hl(1, 5, 10, 'b');
  for (let x = 1; x < 11; x += 1) g.vl(x, 6, x % 2 ? 3 : 4, x % 2 ? 'A' : 'B');
  g.rect(9, 1, 2, 2, 'b');
}));
SPR.def('t_wand', item12(g => {
  for (let i = 0; i < 8; i++) g.px(1 + i, 11 - i, i < 3 ? 'b' : 'c');
  g.ellipse(9.5, 2.5, 2.2, 2.2, 's'); g.pts([[11, 0], [11, 1], [8, 0], [10, 0]], 't'); g.px(9, 2, 'r'); g.pts([[7, 3], [8, 4]], 'G'); g.px(11, 4, 'H');
}));
SPR.def('t_yarn', item12(g => {
  g.ellipse(5.5, 6, 4.2, 4.2, 'G'); for (let k = -4; k <= 4; k += 2) for (let t = 0; t < 9; t++) { const x = Math.round(5.5 + t - 4), y = Math.round(6 + k + (t - 4) * 0.45); if (g.get(x, y) === 'G') g.px(x, y, 'H'); }
  g.px(4, 3, 'f'); g.pts([[9, 9], [10, 10], [11, 10]], 'G');
}));
SPR.def('t_ball', item12(g => {
  g.ellipse(6, 6, 4.6, 4.6, 'r'); for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (g.get(x, y) === 'r' && Math.abs(x - y) <= 1) g.px(x, y, 'f');
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (g.get(x, y) === 'r' && x + y > 14) g.px(x, y, 'q');
  g.px(4, 3, 't');
}));
SPR.def('n_star', item12(g => { g.stamp(1, 1, ['....w.....', '....w.....', '...wxw....', 'wwwxxxwww.', '.wxxxxxw..', '..wxxxw...', '..wx.xw...', '.ww...ww..']); g.px(4, 4, 'Z'); }));
