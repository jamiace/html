/* ============================================================
   Avatar (customisable) and pets
   ============================================================ */
PAL['2'] = '#c68a6a'; PAL['3'] = '#9a6249'; PAL['4'] = '#6e4231'; PAL['5'] = '#e8b48e';
(function () { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  for (const k of '2345') { cx.clearRect(0, 0, 1, 1); cx.fillStyle = PAL[k]; cx.fillRect(0, 0, 1, 1); PAL_RGBA[k] = Array.from(cx.getImageData(0, 0, 1, 1).data); } })();

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
function petCanvas(kind, color, pose, f, flip, acc) {
  const ak = acc ? (acc.neck || '') + '+' + (acc.head || '') : '';
  const key = [kind, color, pose, f, flip ? 1 : 0, ak].join('|');
  let c = PET_CACHE[key];
  if (!c) {
    let g = SPR.grid(`${kind}_${pose}${f}`);
    const map = PET_COLORS[kind][color]; if (map) g = g.recolor(map);
    if (ak !== '+' && ak && typeof applyPetAcc === 'function') g = applyPetAcc(g, kind, pose, acc);
    if (flip) g = g.flip();
    c = PET_CACHE[key] = g.toCanvas();
  }
  return c;
}

for (const p of ['walk0', 'walk1', 'walk2', 'walk3', 'sit0', 'sit1', 'sleep0', 'sleep1']) {
  SPR.def('cat_' + p, () => makeCat(p.replace(/\d/, ''), +p.slice(-1)));
  SPR.def('dog_' + p, () => makeDog(p.replace(/\d/, ''), +p.slice(-1)));
}
