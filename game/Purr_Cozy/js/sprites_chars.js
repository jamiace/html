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
  // knead / beg / shake are variations of sitting; lie is a variation of the sleeping loaf
  const want = pose; if (['groom', 'look', 'knead', 'beg', 'shake', 'yawn', 'stare'].includes(pose)) pose = 'sit'; else if (pose === 'lie') pose = 'sleep';
  if (pose === 'stretch') {
    // bowing stretch: front paws reaching forward, rear up, tail high
    const t = f % 2;
    for (let i = 0; i <= 10; i++) { const x = 5 + i, cy = 7.2 + i * 0.32; for (let y = Math.round(cy - 2.6); y <= Math.round(cy + 2.2); y++) g.px(x, y, B); }
    for (let x = 6; x < 15; x++) { const yb = Math.round(7.2 + (x - 5) * 0.32 + 2.2); if (g.get(x, yb) === B) g.px(x, yb, BL); }
    for (const x of [7, 9, 11]) { g.px(x, 6 + Math.round((x - 5) * 0.32), D); }
    g.rect(5, 9, 2, 5, B); g.rect(7, 10, 1, 4, D); g.pts([[5, 14], [6, 14], [7, 14]], BL);
    g.hl(13, 13, 7, B); g.hl(13, 14, 7, B); g.pts([[19, 14], [20, 14], [19, 13]], BL);
    const tail = [[4, 6], [3, 5], [3, 4], [3, 3], [4, 2 - t], [5, 1 - t]]; for (const [x, y] of tail) { g.px(x, y, B); g.px(x + 1, y, B); }
    g.ellipse(17, 10, 3.6, 3, B);
    g.pts([[14, 6], [14, 7], [15, 7], [19, 6], [19, 7], [18, 7]], B); g.px(15, 7, 's'); g.px(18, 7, 's');
    g.pts([[15, 10], [16, 10], [18, 10], [19, 10]], 'Y'); g.pts([[17, 12], [18, 12]], BL); g.px(17, 12, 's');
  } else if (pose === 'walk') {
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
    // front paws (kneading lifts one at a time, begging holds both up)
    const up = want === 'knead' ? (f % 2 ? 'R' : 'L') : want === 'beg' ? 'both' : '';
    if (up !== 'L' && up !== 'both') { g.rect(9, 12, 2, 2, B); g.pts([[9, 14], [10, 14]], BL); }
    if (up !== 'R' && up !== 'both') { g.rect(11, 12, 2, 2, B); g.pts([[11, 14], [12, 14]], BL); }
    if (up === 'L') { g.rect(9, 11, 2, 2, B); g.pts([[9, 13], [10, 13]], BL); }
    if (up === 'R') { g.rect(11, 11, 2, 2, B); g.pts([[11, 13], [12, 13]], BL); }
    if (up === 'both') { const yy = 9 - (f % 2); g.rect(9, yy, 2, 2, B); g.rect(11, yy, 2, 2, B); g.pts([[9, yy], [10, yy], [11, yy], [12, yy]], BL); }
    // head
    g.ellipse(11, 5.5, 4.2, 3.6, B);
    g.pts([[7, 1], [7, 2], [8, 2], [7, 3], [14, 1], [14, 2], [13, 2], [14, 3], [8, 3], [13, 3]], B);
    g.px(8, 2, 's'); g.px(13, 2, 's');
    g.hl(8, 3, 6, L);
    g.pts([[9, 5], [9, 6], [12, 5], [12, 6]], 'Y');
    g.pts([[10, 7], [11, 7]], BL); g.px(10, 7, 's'); g.pts([[9, 8], [12, 8]], BL);
  } else if (pose === 'belly') {
    // rolling on its back: belly up, four paws in the air, head upside down on the right
    const w = f % 2;
    g.ellipse(9.5, 11, 6.8, 3.2, B); g.ellipse(9.5, 10, 5, 1.7, BL);
    for (const [x, d] of [[4, 0], [7, 1], [12, 1], [15, 0]]) { const top = 3 + ((d + w) % 2); g.rect(x, top + 1, 1, 9 - top, B); g.pts([[x, top], [x + 1, top]], BL); g.px(x + 1, top + 1, B); }
    for (const [x, y] of [[3, 12], [2, 11], [1, 10], [1, 9], [2, 8]]) g.px(x, y, B);
    g.ellipse(16.5, 11, 3.6, 3, B);
    g.pts([[14, 13], [14, 14], [15, 14], [19, 13], [19, 14], [18, 14]], B); g.px(15, 13, 's'); g.px(18, 13, 's');
    g.pts([[15, 11], [18, 11]], 'Y'); g.pts([[15, 10], [18, 10]], 'Y');
    g.pts([[16, 9], [17, 9]], BL); g.px(16, 9, 's');
  } else if (pose === 'scratch') {
    // up on the hind legs, front paws stretched against a post on the right
    const w = f % 2;
    g.ellipse(9.5, 9.5, 3.4, 5, B); g.ellipse(10.5, 10, 1.6, 3.4, BL);
    g.rect(7, 13, 2, 2, B); g.rect(10, 13, 2, 2, B); g.pts([[7, 15], [8, 15], [10, 15], [11, 15]], BL);
    for (const [x, y] of [[6, 12], [5, 11], [4, 10], [4, 9], [5, 8]]) g.px(x, y, B); g.px(5, 8, D);
    g.ellipse(11.5, 4, 3.4, 3, B);
    g.pts([[9, 0], [9, 1], [10, 1], [14, 0], [14, 1], [13, 1]], B); g.px(9, 1, 's'); g.px(14, 1, 's');
    g.pts([[11, 3], [13, 3]], 'Y'); g.px(14, 5, 's'); g.hl(10, 6, 4, BL);
    g.rect(12, 6 + w, 4 + w, 1, B); g.px(16 + w, 6 + w, BL);
    g.rect(12, 8 - w, 5 - w, 1, B); g.px(17 - w, 8 - w, BL);
    for (const y of [8, 10]) g.px(7, y, D);
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
  if (want === 'look') { g.pts([[9, 6], [12, 6]], B); g.pts([[9, 4], [12, 4]], 'Y'); g.px(10, 7, BL); g.px(11, 7, 's'); }
  if (want === 'groom') {
    g.rect(11, 12, 2, 2, BL); g.pts([[11, 14], [12, 14]], B);
    g.rect(12, 8 + (f % 2), 2, 2, B); g.pts([[12, 10 + (f % 2)], [13, 10 + (f % 2)]], BL);
    g.pts([[9, 5], [12, 5]], B); g.pts([[9, 6], [12, 6]], D); if (f % 2) g.px(11, 8, 's');
  }
  if (want === 'lie') { g.pts([[14, 10], [18, 10]], B); g.pts([[15, 9], [15, 10], [17, 9], [17, 10]], 'Y'); if (f % 2) { g.px(2, 13, '.'); g.px(2, 12, B); } }
  // waking up: eyes shut, mouth wide open (wider on the second frame)
  if (want === 'yawn') { g.pts([[9, 5], [12, 5]], B); g.pts([[9, 6], [12, 6]], D); g.pts([[10, 7], [11, 7], [10, 8], [11, 8]], 'Y'); if (f % 2) { g.pts([[10, 9], [11, 9]], 'Y'); g.px(10, 8, 's'); g.px(11, 8, 's'); } }
  // looking straight at you: a bright glint in each eye; the second frame is a blink
  if (want === 'stare') { if (f % 2) { g.pts([[9, 5], [12, 5]], B); g.pts([[9, 6], [12, 6]], D); } else g.pts([[9, 5], [12, 5]], 'W'); }
  // kneading: eyes shut with a little blush
  if (want === 'knead') { g.pts([[9, 5], [12, 5]], B); g.px(8, 7, 's'); g.px(13, 7, 's'); }
  // shaking off water: fur sticks out all round, eyes squeezed shut
  if (want === 'shake') { petTufts(g, B, [[9, 10, 5.9, 5.4], [11, 5.5, 4.9, 4.3]], f); g.pts([[9, 5], [12, 5]], B); }
  return g.outline();
}
// fur tufts sticking out of the outline (shaking off water)
function petTufts(g, B, blobs, f) {
  for (const [cx, cy, rx, ry] of blobs) for (let a = (f % 2) * 0.27; a < Math.PI * 2; a += 0.55) {
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    if (y >= 0 && y < g.h - 1 && g.get(x, y) === '.') g.px(x, y, B);
  }
}
function makeDog(pose, f) {
  const g = new Grid(24, 18);
  const B = 'v', D = 'u', C = 'f', N = 'Y';
  const want = pose; if (['groom', 'look', 'knead', 'beg', 'shake', 'yawn', 'stare'].includes(pose)) pose = 'sit'; else if (pose === 'lie') pose = 'sleep';
  if (pose === 'stretch') {
    // play bow
    const t = f % 2;
    for (let i = 0; i <= 11; i++) { const x = 5 + i, cy = 8 + i * 0.3; for (let y = Math.round(cy - 2.8); y <= Math.round(cy + 2.4); y++) g.px(x, y, B); }
    for (let x = 6; x < 16; x++) { const yb = Math.round(8 + (x - 5) * 0.3 + 2.4); if (g.get(x, yb) === B) g.px(x, yb, C); }
    g.hl(6, 5, 7, D);
    g.rect(5, 10, 2, 6, B); g.rect(7, 11, 2, 5, D); g.pts([[5, 16], [6, 16], [7, 16], [8, 16]], C);
    g.hl(14, 14, 8, B); g.hl(14, 15, 8, B); g.pts([[20, 15], [21, 15], [21, 14]], C);
    g.ellipse(4, 4 - t, 2.4, 2.2, B); g.px(4, 4 - t, C); g.px(3, 4 - t, C);
    g.ellipse(18.5, 11, 3.8, 3.4, B);
    g.pts([[15, 6], [15, 7], [16, 7], [16, 8], [15, 8], [21, 6], [21, 7], [20, 7], [20, 8], [21, 8]], B); g.px(16, 7, 's'); g.px(20, 7, 's');
    g.ellipse(20, 13, 2.6, 1.7, C); g.px(22, 12, N); g.px(22, 13, N);
    g.pts([[17, 10], [17, 11], [20, 10], [20, 11]], 'Y'); if (t) g.px(19, 15, 's');
  } else if (pose === 'walk') {
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
    const up = want === 'knead' ? (f % 2 ? 'R' : 'L') : want === 'beg' ? 'both' : '';
    if (up !== 'L' && up !== 'both') { g.rect(10, 13, 2, 3, B); g.pts([[10, 16], [11, 16]], C); }
    if (up !== 'R' && up !== 'both') { g.rect(13, 13, 2, 3, B); g.pts([[13, 16], [14, 16]], C); }
    if (up === 'L') { g.rect(10, 12, 2, 3, B); g.pts([[10, 15], [11, 15]], C); }
    if (up === 'R') { g.rect(13, 12, 2, 3, B); g.pts([[13, 15], [14, 15]], C); }
    if (up === 'both') { const yy = 9 - (f % 2); g.rect(10, yy, 2, 3, B); g.rect(13, yy, 2, 3, B); g.pts([[10, yy], [11, yy], [13, yy], [14, yy]], C); }
    g.rect(6, 15, 4, 1, D);
    g.ellipse(12.5, 6, 4.3, 3.8, B);
    g.pts([[9, 1], [9, 2], [10, 2], [9, 3], [10, 3], [16, 1], [16, 2], [15, 2], [16, 3], [15, 3]], B); g.px(10, 2, 's'); g.px(15, 2, 's');
    g.ellipse(12.5, 8.2, 2.6, 1.7, C); g.px(12, 7, N); g.px(13, 7, N);
    g.pts([[10, 5], [10, 6], [15, 5], [15, 6]], 'Y');
    g.pts([[9, 7], [16, 7]], C);
  } else if (pose === 'belly') {
    const w = f % 2;
    g.ellipse(10.5, 12, 7.4, 3.4, B); g.ellipse(10.5, 11, 5.4, 1.8, C);
    for (const [x, d] of [[4, 0], [8, 1], [13, 1], [17, 0]]) { const top = 3 + ((d + w) % 2); g.rect(x, top, 2, 10 - top, B); g.pts([[x, top], [x + 1, top]], C); }
    g.ellipse(3.5, 11, 1.9, 1.9, B); g.px(3, 11, C);
    g.ellipse(18.5, 12.3, 3.9, 3.2, B);
    g.pts([[16, 15], [16, 16], [17, 16], [21, 15], [21, 16], [20, 16]], D);
    g.pts([[17, 13], [20, 13]], 'Y'); g.pts([[17, 12], [20, 12]], 'Y');
    g.ellipse(18.6, 9.9, 2.3, 1.4, C); g.pts([[18, 8], [19, 8]], N); g.px(17, 11, 's');
  } else if (pose === 'scratch') {
    const w = f % 2;
    g.ellipse(10, 10.5, 3.8, 5.4, B); g.ellipse(11.3, 11, 1.9, 3.6, C);
    g.rect(7, 15, 2, 2, B); g.rect(11, 15, 2, 2, B); g.pts([[7, 17], [8, 17], [11, 17], [12, 17]], C);
    g.ellipse(6, 9, 1.8, 1.8, B); g.px(6, 9, C);
    g.ellipse(12, 4.5, 3.9, 3.4, B);
    g.pts([[9, 0], [9, 1], [9, 2], [10, 1], [10, 2], [15, 0], [15, 1], [15, 2], [14, 1], [14, 2]], B); g.px(10, 1, 's'); g.px(14, 1, 's');
    g.pts([[11, 4], [14, 4]], 'Y'); g.ellipse(14.5, 6.3, 2.2, 1.4, C); g.px(16, 6, N);
    g.rect(13, 8 + w, 4 + w, 2, B); g.pts([[16 + w, 8 + w], [16 + w, 9 + w]], C);
    g.rect(13, 11 - w, 4, 2, B); g.pts([[16, 11 - w], [16, 12 - w]], C);
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
  if (want === 'look') { g.pts([[10, 6], [15, 6]], B); g.pts([[10, 4], [15, 4]], 'Y'); }
  if (want === 'groom') { g.pts([[10, 5], [15, 5]], B); g.pts([[10, 6], [11, 6], [14, 6], [15, 6]], D); g.px(12, 9, 's'); g.px(12, 10, 's'); if (f % 2) g.px(13, 10, 's'); }
  if (want === 'lie') { g.pts([[16, 11], [20, 11]], B); g.pts([[17, 10], [17, 11], [19, 10], [19, 11]], 'Y'); if (f % 2) { g.ellipse(4, 11, 2.2, 2, B); g.px(4, 11, C); } }
  if (want === 'knead') { g.pts([[10, 5], [15, 5]], B); g.px(9, 8, 's'); g.px(16, 8, 's'); }
  if (want === 'yawn') { g.pts([[10, 5], [15, 5]], B); g.pts([[10, 6], [11, 6], [14, 6], [15, 6]], D); g.pts([[12, 9], [13, 9]], 'Y'); g.pts([[12, 10], [13, 10]], f % 2 ? 's' : 'Y'); if (f % 2) g.pts([[11, 9], [14, 9]], 'Y'); }
  if (want === 'stare') { if (f % 2) { g.pts([[10, 5], [15, 5]], B); g.pts([[10, 6], [15, 6]], D); } else g.pts([[10, 5], [15, 5]], 'W'); }
  if (want === 'shake') { petTufts(g, B, [[10, 11, 6.1, 5.8], [12.5, 6, 5, 4.6]], f); g.pts([[10, 5], [15, 5]], B); if (f % 2) g.pts([[8, 1], [17, 1]], B); }
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

for (const p of ['walk0', 'walk1', 'walk2', 'walk3', 'sit0', 'sit1', 'sleep0', 'sleep1', 'look0', 'groom0', 'groom1', 'lie0', 'lie1', 'stretch0', 'stretch1', 'knead0', 'knead1', 'beg0', 'beg1', 'shake0', 'shake1', 'belly0', 'belly1', 'scratch0', 'scratch1', 'yawn0', 'yawn1', 'stare0', 'stare1']) {
  SPR.def('cat_' + p, () => makeCat(p.replace(/\d/, ''), +p.slice(-1)));
  SPR.def('dog_' + p, () => makeDog(p.replace(/\d/, ''), +p.slice(-1)));
}
