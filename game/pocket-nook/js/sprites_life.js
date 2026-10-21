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
