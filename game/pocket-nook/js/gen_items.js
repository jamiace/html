/* ============================================================
   Generated furniture & decor families
   Each family is a small parametric pixel painter; colourways reuse one sprite with a palette map.
   Items get `fam` (shop sub-filter) and the usual ITEMS fields documented in catalog.js.
   ============================================================ */
const GEN = { count: 0, fams: {} };
const FAM_NAMES = {
  plant: '盆栽', flower: '花瓶', lamp: '燈', neon: '霓虹燈', seat: '椅子', sofa: '沙發', table: '桌子', storage: '櫃子', bed: '床',
  rug: '地毯', art: '畫', shelf: '層架', mirror: '鏡子', clock: '時鐘', figure: '小擺飾', plush: '玩偶', tableware: '杯壺', desk: '書桌用品',
  toy: '玩具', fun: '互動家具', light: '燈串', window: '窗戶', textile: '織品', misc: '其他',
};
function gdef(id, props) {
  if (ITEMS[id]) return ITEMS[id];
  const d = ITEMS[id] = Object.assign({ id, lvl: 1, price: 40 }, props);
  if (d.lvl == null || props.lvl == null) d.lvl = Math.max(1, Math.min(16, Math.round((d.price || 40) / 32)));
  GEN.count++; (GEN.fams[d.fam] = GEN.fams[d.fam] || []).push(id);
  return d;
}
const G = (w, h, fn) => () => { const g = new Grid(w, h); fn(g); return g.outline(); };
const CW = { blue: '藍', pink: '粉', green: '綠', sun: '黃', lilac: '紫', teal: '青', clay: '磚紅', grey: '灰', navy: '海軍藍', mustard: '芥末', coral: '珊瑚', olive: '橄欖', ink: '墨黑', snow: '雪白', peach: '蜜桃', aqua: '水藍', berry: '莓果', sky: '天藍', rose2: '玫瑰' };
const cmap = (from, to) => to === from ? null : rampMap(from, to);
const WOOD = {
  oak: [null, '原木'],
  walnut: [{ e: 'd', d: 'c', c: 'b', b: 'a', a: '1' }, '胡桃木'],
  white: [{ a: 'A', b: 'B', c: 'g', d: 'f', e: 'Z' }, '白色'],
  black: [{ a: 'Y', b: 'U', c: 'y', d: 'V', e: 'z' }, '黑色'],
  pink: [{ a: 'q', b: 'r', c: 's', d: 't', e: 'f' }, '粉彩'],
  mint: [{ a: 'i', b: 'j', c: 'k', d: 'l', e: 'f' }, '薄荷'],
};
const merge = (...ms) => { const o = {}; for (const m of ms) if (m) Object.assign(o, m); return Object.keys(o).length ? o : null; };
const rnd = (seed) => rng(seed);

// ===================================================== PLANTS
const POTS = {
  terra: { n: '陶盆', r: ['L', 'M', 'N', 'g'] }, white: { n: '白瓷盆', r: RAMP.snow }, blue: { n: '藍釉盆', r: RAMP.sky }, black: { n: '黑盆', r: RAMP.ink },
  pink: { n: '粉盆', r: RAMP.rose2 }, basket: { n: '藤籃', r: ['b', 'c', 'd', 'e'], weave: true }, mustard: { n: '芥末盆', r: RAMP.mustard },
};
const GREEN = ['i', 'j', 'k', 'l'], SAGE = [RAMP.olive[0], RAMP.olive[1], RAMP.olive[2], RAMP.olive[3]], TEALG = ['I', 'J', 'K', 'l'];
function potIn(g, cx, top, w, h, P) {
  pot(g, cx, top, w, h, P.r);
  if (P.weave) for (let y = top + 3; y < top + h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y) === P.r[1] && (x + y) % 3 === 0) g.px(x, y, P.r[0]);
}
const PLANTS = {
  pothos: { n: '黃金葛', w: 20, h: 22, floor: false, price: 45, draw(g, P) {
    potIn(g, 10, 12, 10, 8, P);
    for (const [x, y, a] of [[6, 12, -2.4], [14, 12, -0.7], [10, 12, -1.57], [8, 12, -1.9], [12, 12, -1.2]]) leaf(g, x, y, 5, a, 1.8, GREEN);
    for (const side of [-1, 1]) for (let i = 0; i < 7; i++) { const x = 10 + side * (5 + (i % 2)), y = 13 + i * 1.3; g.px(Math.round(x), Math.round(y), 'j'); if (i % 2) { g.px(Math.round(x) + side, Math.round(y), 'k'); g.px(Math.round(x) + side, Math.round(y) + 1, 'i'); } }
  } },
  heartleaf: { n: '心葉蔓綠絨', w: 18, h: 20, price: 40, draw(g, P) {
    potIn(g, 9, 12, 10, 7, P);
    for (const [cx, cy] of [[5, 7], [12, 6], [8, 3], [9, 9], [14, 10], [4, 11]]) { g.stamp(cx - 2, cy - 2, ['jk.kj', 'jkkkl', '.jkk.', '..j..']); }
  } },
  aloe: { n: '蘆薈', w: 16, h: 18, price: 35, draw(g, P) {
    potIn(g, 8, 11, 10, 7, P);
    for (const [a, l] of [[-1.57, 9], [-1.15, 8], [-2.0, 8], [-0.75, 6], [-2.4, 6]]) leaf(g, 8, 11, l, a, 1.3, TEALG);
    for (let y = 2; y < 11; y++) for (let x = 0; x < 16; x++) if (g.get(x, y) === 'J' && (x * 7 + y) % 5 === 0) g.px(x, y, 'l');
  } },
  basil: { n: '羅勒', w: 16, h: 16, price: 30, draw(g, P) {
    potIn(g, 8, 9, 10, 7, P);
    for (const [cx, cy] of [[5, 6], [10, 5], [8, 3], [12, 8], [4, 9], [8, 7]]) { g.ellipse(cx, cy, 2.2, 1.6, 'k'); g.px(cx - 1, cy - 1, 'l'); g.px(cx + 1, cy, 'j'); }
  } },
  roundcactus: { n: '金琥仙人球', w: 14, h: 16, price: 30, draw(g, P) {
    potIn(g, 7, 9, 10, 7, P); g.ellipse(7, 6, 4.5, 4, 'j');
    for (let x = 3; x < 12; x += 2) for (let y = 2; y < 10; y++) if (g.get(x, y) === 'j') g.px(x, y, 'k');
    g.pts([[4, 4], [10, 4], [7, 2]], 'x'); g.stamp(5, 0, ['.s.', 'srs', '.s.']);
  } },
  tulip: { n: '鬱金香', w: 16, h: 22, price: 45, tint: true, draw(g, P) {
    potIn(g, 8, 15, 10, 7, P);
    for (const [x, top, c] of [[5, 5, 0], [8, 3, 1], [11, 6, 2]]) { g.vl(x, top + 3, 15 - top - 3, 'j'); g.stamp(x - 2, top, ['r.r.r', 'rsrsr', 'rrrrr', '.qrq.']); }
    leaf(g, 6, 15, 6, -2.0, 1.4, GREEN); leaf(g, 10, 15, 6, -1.1, 1.4, GREEN);
  } },
  lavender: { n: '薰衣草', w: 16, h: 22, price: 45, draw(g, P) {
    potIn(g, 8, 15, 10, 7, P);
    for (const [x, top, lean] of [[4, 4, -1], [6, 2, 0], [8, 1, 0], [10, 2, 0], [12, 4, 1], [7, 5, 0], [9, 5, 1]]) {
      for (let y = top; y < 15; y++) g.px(x + (y < top + 6 ? lean * Math.floor((top + 6 - y) / 3) : 0), y, y < top + 6 ? ((x + y) % 2 ? 'G' : 'H') : 'j');
    }
  } },
  orchid: { n: '蝴蝶蘭', w: 18, h: 24, price: 70, draw(g, P) {
    potIn(g, 9, 17, 10, 7, P); leaf(g, 9, 17, 6, -0.4, 1.8, GREEN); leaf(g, 9, 17, 6, -2.7, 1.8, GREEN);
    for (let y = 4; y < 17; y++) g.px(y < 8 ? 9 + (8 - y) : 9, y, 'i');
    for (const [x, y] of [[14, 3], [11, 6], [15, 7]]) g.stamp(x - 2, y - 2, ['.f.f.', 'fffff', '.fsf.', '..f..']);
  } },
  fiddle: { n: '琴葉榕', w: 22, h: 42, floor: true, price: 140, draw(g, P) {
    potIn(g, 11, 31, 14, 10, P); g.vl(11, 14, 17, 'b'); g.vl(12, 18, 13, 'a');
    for (const [x, y, a, l] of [[11, 16, -2.3, 8], [11, 14, -0.8, 8], [11, 10, -1.57, 9], [11, 20, -2.7, 7], [12, 21, -0.4, 7], [11, 26, -2.9, 6], [12, 26, -0.25, 6]]) leaf(g, x, y, l, a, 3.2, GREEN);
  } },
  palm: { n: '散尾葵', w: 28, h: 42, floor: true, price: 150, draw(g, P) {
    potIn(g, 14, 31, 14, 10, P);
    for (const [a, l] of [[-1.57, 20], [-1.25, 18], [-1.9, 18], [-0.9, 14], [-2.25, 14], [-0.55, 11], [-2.6, 11]]) {
      const x1 = 14 + Math.cos(a) * l, y1 = 31 + Math.sin(a) * l; line(g, 14, 31, x1, y1, 'i');
      for (let t = 0.3; t < 1; t += 0.12) { const x = 14 + Math.cos(a) * l * t, y = 31 + Math.sin(a) * l * t; for (const s of [-1, 1]) leaf(g, x, y, 4 * (1.1 - t), a + s * 0.9, 0.9, GREEN); }
    }
  } },
  olive: { n: '橄欖樹', w: 22, h: 42, floor: true, price: 150, draw(g, P) {
    potIn(g, 11, 31, 14, 10, P); line(g, 11, 31, 10, 14, 'b'); line(g, 10, 20, 14, 12, 'b'); line(g, 11, 24, 6, 14, 'b');
    const r = rnd(7); for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 8.5; const x = Math.round(11 + Math.cos(a) * d), y = Math.round(10 + Math.sin(a) * d * 0.75); g.px(x, y, SAGE[1 + (i % 3)]); g.px(x + 1, y, SAGE[1]); }
    for (const [x, y] of [[8, 8], [14, 11], [11, 6], [6, 12]]) g.px(x, y, 'F');
  } },
  bamboo: { n: '開運竹', w: 18, h: 40, floor: true, price: 120, draw(g, P) {
    potIn(g, 9, 29, 12, 10, P);
    for (const [x, top] of [[6, 6], [9, 2], [12, 8]]) { g.vl(x, top, 29 - top, 'k'); g.vl(x + 1, top, 29 - top, 'j'); for (let y = top + 4; y < 29; y += 6) g.hl(x, y, 2, 'i'); leaf(g, x + 1, top + 2, 5, -0.6, 1.2, GREEN); leaf(g, x, top + 5, 5, -2.5, 1.2, GREEN); }
  } },
  sunflower: { n: '向日葵', w: 20, h: 36, floor: true, price: 110, draw(g, P) {
    potIn(g, 10, 26, 13, 10, P);
    for (const [x, y] of [[6, 6], [13, 3], [10, 12]]) { g.vl(x, y + 3, 26 - y - 3, 'j'); g.ellipse(x, y, 3.6, 3.4, 'w'); g.ellipse(x, y, 2.2, 2.1, 'x'); g.ellipse(x, y, 1.5, 1.4, 'a'); g.px(x - 1, y - 1, 'b'); }
    leaf(g, 8, 20, 5, -2.4, 1.8, GREEN); leaf(g, 12, 18, 5, -0.6, 1.8, GREEN);
  } },
  saguaro: { n: '柱狀仙人掌', w: 18, h: 36, floor: true, price: 100, draw(g, P) {
    potIn(g, 9, 26, 13, 10, P); g.rect(7, 3, 5, 23, 'j'); g.vl(8, 3, 23, 'k'); g.vl(11, 4, 22, 'i'); g.cut(7, 3, 5, 23);
    g.rect(2, 10, 3, 8, 'j'); g.hl(2, 17, 5, 'j'); g.vl(3, 10, 8, 'k'); g.rect(14, 7, 3, 9, 'j'); g.hl(12, 15, 4, 'j'); g.vl(15, 7, 9, 'k');
    for (let y = 5; y < 25; y += 3) g.px(9, y, 'l'); g.stamp(8, 1, ['.s.', 'srs']);
  } },
  birdparadise: { n: '天堂鳥', w: 26, h: 40, floor: true, price: 160, draw(g, P) {
    potIn(g, 13, 29, 14, 10, P);
    for (const [a, l] of [[-1.57, 20], [-1.2, 17], [-1.95, 17], [-0.8, 13], [-2.35, 13]]) leaf(g, 13, 29, l, a, 3, GREEN);
    g.stamp(15, 6, ['..vvw', '.vvw.', 'uuuu.', '..m..']);
  } },
  moneytree: { n: '馬拉巴栗', w: 22, h: 38, floor: true, price: 130, draw(g, P) {
    potIn(g, 11, 28, 14, 10, P); for (let y = 12; y < 28; y++) { g.px(10 + (y % 4 < 2 ? 0 : 1), y, 'c'); g.px(12 - (y % 4 < 2 ? 0 : 1), y, 'b'); }
    for (const [x, y] of [[6, 8], [16, 7], [11, 4], [8, 12], [15, 12]]) for (let k = 0; k < 5; k++) leaf(g, x, y, 4, -Math.PI / 2 + (k - 2) * 0.7, 1.4, GREEN);
  } },
};
// ===================================================== FLOWERS IN VASES
const FLOWERS = {
  rose: { n: '玫瑰', head: ['.rr.', 'rsrr', 'rrrq', '.qq.'] }, daisy: { n: '雛菊', head: ['.f.', 'fwf', '.f.'] }, tulipY: { n: '黃鬱金香', head: ['w.w', 'wxw', 'vvv'] },
  lav: { n: '薰衣草', head: ['H', 'G', 'H', 'G'] }, sun: { n: '向日葵', head: ['.ww.', 'waaw', 'waaw', '.ww.'] }, gyp: { n: '滿天星', head: ['f.f', '.f.', 'f.f'] },
  sakura: { n: '櫻花枝', head: ['t.t', 'sts', '.t.'] }, euca: { n: '尤加利', head: ['K.', '.K', 'K.'] },
};
const VASES = {
  bud: { n: '細口瓶', draw(g, r) { g.rect(5, 12, 3, 2, r[2]); g.ellipse(6.5, 17, 3, 3.4, r[1]); g.px(5, 16, r[3]); g.px(5, 17, r[3]); g.hl(4, 20, 5, r[0]); } },
  jar: { n: '圓罐', draw(g, r) { g.rect(3, 12, 7, 1, r[2]); g.ellipse(6.5, 16.5, 4.5, 4, r[1]); g.px(4, 15, r[3]); g.px(4, 16, r[3]); g.hl(3, 20, 7, r[0]); } },
  bottle: { n: '玻璃瓶', draw(g, r) { g.rect(5, 11, 3, 3, ';'); g.rect(4, 14, 5, 7, ','); g.vl(4, 14, 7, ':'); g.hl(4, 20, 5, ';'); } },
};
// ===================================================== LAMPS
const LAMP_COL = { cream: null, pink: rampMap('cream', 'pink'), mint: rampMap('cream', 'green'), navy: rampMap('cream', 'navy'), sun: rampMap('cream', 'sun') };
const LAMP_COL_N = { cream: '奶油', pink: '粉紅', mint: '薄荷', navy: '海軍藍', sun: '暖黃' };
const ON_MAP = { g: 'X', h: 'w', f: 'W', b: 'w' };
function lampOn(name, base) { SPR.def(name + '_on', () => SPR.grid(name).recolor(ON_MAP)); }
const FLOOR_LAMPS = {
  drum: { n: '筒燈', w: 16, h: 44, lx: 8, ly: 6, draw(g) { g.rect(2, 1, 12, 10, 'g'); g.hl(2, 1, 12, 'f'); g.hl(2, 10, 12, 'h'); g.vl(2, 1, 10, 'f'); g.vl(13, 1, 10, 'h'); g.vl(7, 11, 28, 'z'); g.vl(8, 11, 28, 'y'); g.rect(4, 39, 8, 2, 'y'); g.hl(4, 39, 8, 'z'); } },
  globe: { n: '球燈', w: 14, h: 44, lx: 7, ly: 6, draw(g) { g.ellipse(7, 6, 5.5, 5.5, 'g'); g.ellipse(5.5, 4.5, 2.2, 2.2, 'f'); for (let y = 1; y < 12; y++) for (let x = 8; x < 13; x++) if (g.get(x, y) === 'g') g.px(x, y, 'h'); g.vl(6, 12, 27, 'b'); g.vl(7, 12, 27, 'a'); g.rect(3, 39, 8, 2, 'a'); g.hl(3, 39, 8, 'b'); } },
  arc: { n: '弧形燈', w: 28, h: 44, lx: 21, ly: 12, draw(g) { for (let t = 0; t <= 40; t++) { const a = Math.PI * t / 40; g.px(Math.round(5 + 15 * (1 - Math.cos(a)) / 2 + 2), Math.round(40 - Math.sin(a) * 34), 'z'); } g.vl(4, 22, 18, 'z'); g.vl(5, 22, 18, 'y'); line(g, 4, 22, 12, 7, 'z'); line(g, 12, 7, 20, 6, 'z'); g.rect(16, 7, 10, 3, 'g'); g.hl(15, 10, 12, 'h'); g.hl(17, 6, 8, 'f'); g.rect(1, 39, 8, 2, 'y'); g.hl(1, 39, 8, 'z'); } },
  tripod: { n: '三腳燈', w: 18, h: 44, lx: 9, ly: 6, draw(g) { for (let r = 0; r < 10; r++) { const hw = 3 + Math.floor(r * 0.5); g.hl(9 - hw, 1 + r, hw * 2, 'g'); g.px(9 - hw, 1 + r, 'f'); g.px(9 + hw - 1, 1 + r, 'h'); } g.hl(4, 10, 10, 'h'); line(g, 9, 11, 3, 41, 'b'); line(g, 9, 11, 15, 41, 'b'); line(g, 9, 11, 9, 41, 'a'); } },
};
const TABLE_LAMPS = {
  dome: { n: '圓頂檯燈', w: 14, h: 18, lx: 7, ly: 5, draw(g) { g.ellipse(7, 6, 6, 5, 'g'); for (let y = 6; y < 12; y++) g.hl(0, y, 14, '.'); g.hl(1, 6, 12, 'h'); g.px(4, 3, 'f'); g.px(5, 2, 'f'); g.vl(6, 7, 7, 'z'); g.vl(7, 7, 7, 'y'); g.rect(3, 14, 8, 3, 'y'); g.hl(3, 14, 8, 'z'); } },
  cyl: { n: '圓筒檯燈', w: 12, h: 18, lx: 6, ly: 4, draw(g) { g.rect(2, 1, 8, 7, 'g'); g.vl(2, 1, 7, 'f'); g.vl(9, 1, 7, 'h'); g.hl(2, 7, 8, 'h'); g.ellipse(6, 12.5, 3.5, 4, 'o'); g.px(4, 11, 'p'); g.hl(3, 16, 6, 'n'); } },
  bell: { n: '鈴鐺檯燈', w: 14, h: 18, lx: 7, ly: 5, draw(g) { for (let r = 0; r < 7; r++) { const hw = 2 + Math.floor(r * 0.7); g.hl(7 - hw, 1 + r, hw * 2, 'g'); g.px(7 - hw, 1 + r, 'f'); g.px(7 + hw - 1, 1 + r, 'h'); } g.hl(2, 7, 10, 'h'); g.vl(7, 8, 6, 'b'); g.ellipse(7, 15, 4, 2, 'c'); g.hl(4, 14, 4, 'd'); } },
  ball: { n: '小球燈', w: 12, h: 14, lx: 6, ly: 6, draw(g) { g.ellipse(6, 6, 5, 5, 'g'); g.ellipse(4.5, 4.5, 1.8, 1.8, 'f'); for (let y = 1; y < 12; y++) for (let x = 7; x < 12; x++) if (g.get(x, y) === 'g') g.px(x, y, 'h'); g.rect(3, 11, 6, 2, 'b'); g.hl(3, 11, 6, 'c'); } },
  tiffany: { n: '彩繪玻璃燈', w: 16, h: 18, lx: 8, ly: 5, fixed: true, draw(g) { for (let r = 0; r < 7; r++) { const hw = 2 + Math.floor(r * 0.9); for (let x = 8 - hw; x < 8 + hw; x++) g.px(x, 1 + r, ['r', 'w', 'j', 'n'][(Math.floor(x / 2) + r) % 4]); } g.hl(1, 8, 14, 'v'); g.vl(7, 9, 6, 'u'); g.vl(8, 9, 6, 'v'); g.ellipse(8, 16, 4.5, 1.6, 'u'); g.hl(5, 15, 6, 'v'); } },
};
const SCONCES = {
  brass: { n: '黃銅壁燈', w: 10, h: 16, lx: 5, ly: 5, draw(g) { g.ellipse(5, 5, 3.5, 4, 'g'); g.ellipse(4, 4, 1.4, 1.6, 'f'); g.rect(3, 9, 4, 1, 'v'); g.vl(5, 10, 3, 'u'); g.rect(2, 13, 6, 2, 'v'); g.hl(2, 13, 6, 'w'); } },
  candle: { n: '燭台壁燈', w: 12, h: 16, lx: 6, ly: 3, draw(g) { g.rect(5, 3, 2, 6, 'f'); g.px(5, 1, 'x'); g.px(6, 2, 'w'); g.hl(3, 9, 6, 'y'); g.vl(6, 10, 3, 'y'); g.rect(4, 13, 4, 2, 'z'); } },
  flower: { n: '花朵壁燈', w: 14, h: 14, lx: 7, ly: 6, draw(g) { for (const [x, y] of [[7, 3], [4, 6], [10, 6], [5, 9], [9, 9]]) g.ellipse(x, y, 2.4, 2.2, 'g'); g.ellipse(7, 6.5, 2, 2, 'h'); g.px(6, 2, 'f'); g.vl(7, 11, 2, 'j'); } },
  shell: { n: '貝殼壁燈', w: 14, h: 12, lx: 7, ly: 5, draw(g) { for (let r = 0; r < 8; r++) { const hw = 1 + Math.floor(r * 0.8); for (let x = 7 - hw; x < 7 + hw; x++) g.px(x, 2 + r, (x % 2) ? 'g' : 'f'); } g.hl(2, 10, 10, 'h'); } },
};
// neon signs: 1-px tube drawings
const NEON_SHAPES = {
  star: { n: '星星', rows: ['....a....', '...a.a...', 'aaa...aaa', '.a.....a.', '..a...a..', '.a..a..a.', 'a.a...a.a', 'aa.....aa'] },
  moon: { n: '月亮', rows: ['...aaa.', '..a....', '.a.....', 'a......', 'a......', 'a......', '.a.....', '..a....', '...aaa.'] },
  cloud: { n: '雲朵', rows: ['....aaa....', '..aa...a.a.', '.a.......aa', 'a.........a', 'a.........a', '.aaaaaaaaa.'] },
  bolt: { n: '閃電', rows: ['....aaa', '...a..a', '..a..a.', '.a..aaa', 'aaa..a.', '..a.a..', '..aa...', '..a....'] },
  smile: { n: '笑臉', rows: ['..aaaaa..', '.a.....a.', 'a..a.a..a', 'a.......a', 'a.a...a.a', 'a..aaa..a', '.a.....a.', '..aaaaa..'] },
  cat: { n: '貓咪', rows: ['a.......a', 'aa.....aa', 'a.aaaaa.a', 'a.......a', 'a.a...a.a', 'a...a...a', '.a.....a.', '..aaaaa..'] },
  flower: { n: '花朵', rows: ['...aaa...', '..a...a..', 'aaa...aaa', 'a..aaa..a', 'a..a.a..a', 'aaa.a.aaa', '....a....', '...aa....'] },
  planet: { n: '星球', rows: ['....aaa....', '...a...a...', 'aaaa...aaaa', 'a..a...a..a', '.aaaaaaaaa.', '...a...a...', '....aaa....'] },
  rainbow: { n: '彩虹', rows: ['...aaaaa...', '..a.....a..', '.a..aaa..a.', 'a..a...a..a', 'a.a.....a.a', 'a.a.....a.a'] },
  cup: { n: '咖啡杯', rows: ['..a.a.a..', '.a.a.a...', 'aaaaaaa..', 'a.....aa.', 'a.....a.a', 'a.....aa.', '.a...a...', 'aaaaaaa..'] },
  heart2: { n: '雙愛心', rows: ['.a.a.......', 'a.a.a.a.a..', 'a...aa.a.a.', '.a.a.a...a.', '..a...a.a..', '.......a...'] },
  wave: { n: '海浪', rows: ['.....aaa..', '...aa...a.', '..a...aa..', '.a...a....', 'a...a.....', 'aaaaaaaaaa'] },
};
const NEON_COL = { pink: ['r', 'pink', '粉紅'], cyan: ['K', 'cool', '青藍'], yellow: ['w', 'warm', '金黃'], violet: ['H', 'cool', '紫'] };
function neonSprite(rows, tube, on) {
  return () => {
    const W = rows[0].length + 6, H = rows.length + 6, g = new Grid(W, H);
    g.rect(1, 1, W - 2, H - 2, 'U'); g.hl(1, 1, W - 2, 'V');
    rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === 'a') g.px(i + 3, j + 3, on ? tube : 'z'); }));
    if (on) { const src = g.clone(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src.get(x, y) === tube) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (src.get(x + dx, y + dy) === 'U') g.px(x + dx, y + dy, 'y'); }
    return g.outline();
  };
}

(function registerPlantsLamps() {
  // plants × pots
  const potPick = { pothos: ['terra', 'white', 'basket', 'pink'], heartleaf: ['white', 'blue', 'mustard', 'terra'], aloe: ['terra', 'white', 'black'], basil: ['terra', 'white', 'mustard'], roundcactus: ['terra', 'pink', 'blue', 'white'],
    tulip: ['white', 'blue', 'basket'], lavender: ['white', 'terra', 'basket'], orchid: ['white', 'black', 'blue'], fiddle: ['white', 'basket', 'black', 'terra'], palm: ['basket', 'white', 'terra', 'black'],
    olive: ['terra', 'white', 'black'], bamboo: ['white', 'blue', 'black'], sunflower: ['terra', 'basket', 'mustard'], saguaro: ['terra', 'white', 'pink'], birdparadise: ['white', 'black', 'basket'], moneytree: ['white', 'terra', 'blue'] };
  for (const k in PLANTS) {
    const p = PLANTS[k];
    for (const pk of potPick[k]) {
      const spr = `pl_${k}_${pk}`; SPR.def(spr, G(p.w, p.h, g => p.draw(g, POTS[pk])));
      gdef(spr, { n: `${p.n}（${POTS[pk].n}）`, cat: 'plant', fam: 'plant', spr, price: p.price + (pk === 'basket' ? 10 : 0), layer: p.floor ? 'floor' : 'decor', react: 'water' });
    }
  }
  // flowers × vases
  for (const fk in FLOWERS) for (const vk in VASES) {
    const F = FLOWERS[fk], V = VASES[vk], spr = `fv_${fk}_${vk}`;
    SPR.def(spr, G(13, 22, g => {
      const r = rnd(fk.length * 7 + vk.length), stems = [[3, 3], [6, 1], [9, 3], [5, 5], [8, 6]];
      for (const [x, y] of stems) { line(g, 6, 13, x + 1, y + 3, fk === 'euca' ? 'K' : 'j'); g.stamp(x, y, F.head); }
      V.draw(g, vk === 'jar' ? RAMP.sky : RAMP.snow);
    }));
    gdef(spr, { n: `${F.n}${V.n}`, cat: 'decor', fam: 'flower', spr, price: 35 + (vk === 'bottle' ? 5 : 0), layer: 'decor', react: 'rustle' });
  }
  // floor lamps × colours
  for (const k in FLOOR_LAMPS) {
    const L0 = FLOOR_LAMPS[k], spr = `lf_${k}`; SPR.def(spr, G(L0.w, L0.h, L0.draw)); lampOn(spr);
    for (const ck in LAMP_COL) gdef(`${spr}_${ck}`, { n: `${LAMP_COL_N[ck]}${L0.n}`, cat: 'furniture', fam: 'lamp', spr, onSpr: spr + '_on', map: LAMP_COL[ck], price: 110 + (k === 'arc' ? 40 : 0), layer: 'floor', light: L(L0.lx, L0.ly, 46), toggle: true });
  }
  for (const k in TABLE_LAMPS) {
    const L0 = TABLE_LAMPS[k], spr = `lt_${k}`; SPR.def(spr, G(L0.w, L0.h, L0.draw)); lampOn(spr);
    const cols = L0.fixed ? ['cream'] : Object.keys(LAMP_COL);
    for (const ck of cols) gdef(`${spr}_${ck}`, { n: L0.fixed ? L0.n : `${LAMP_COL_N[ck]}${L0.n}`, cat: 'decor', fam: 'lamp', spr, onSpr: L0.fixed ? null : spr + '_on', map: L0.fixed ? null : LAMP_COL[ck], price: L0.fixed ? 160 : 70, layer: 'decor', light: L(L0.lx, L0.ly, 32, 'warm', 0.9), toggle: true });
  }
  for (const k in SCONCES) {
    const L0 = SCONCES[k], spr = `ls_${k}`; SPR.def(spr, G(L0.w, L0.h, L0.draw)); lampOn(spr);
    gdef(spr, { n: L0.n, cat: 'wall', fam: 'lamp', spr, onSpr: spr + '_on', price: 80, layer: 'wall', light: L(L0.lx, L0.ly, 34, 'warm', 0.85), toggle: true });
    gdef(spr + '_pink', { n: '粉紅' + L0.n, cat: 'wall', fam: 'lamp', spr, onSpr: spr + '_on', map: LAMP_COL.pink, price: 80, layer: 'wall', light: L(L0.lx, L0.ly, 34, 'pink', 0.85), toggle: true });
  }
  // neon
  for (const sk in NEON_SHAPES) for (const ck in NEON_COL) {
    const S = NEON_SHAPES[sk], [tube, lc, cn] = NEON_COL[ck], spr = `neon_${sk}_${ck}`;
    SPR.def(spr, neonSprite(S.rows, tube, false)); SPR.def(spr + '_on', neonSprite(S.rows, tube, true));
    gdef(spr, { n: `${cn}霓虹${S.n}`, cat: 'wall', fam: 'neon', spr, onSpr: spr + '_on', price: 140, layer: 'wall', light: L(Math.floor((S.rows[0].length + 6) / 2), Math.floor((S.rows.length + 6) / 2), 30, lc, 0.85), toggle: true, on: true });
  }
  // fairy lights colourways of the existing string lights
  for (const [k, map, n] of [['pink', rampMap('sun', 'pink'), '粉紅'], ['mint', rampMap('sun', 'green'), '薄荷'], ['blue', rampMap('sun', 'sky'), '冰藍'], ['violet', rampMap('sun', 'lilac'), '紫色']])
    gdef('string_lights_' + k, { n: `${n}串燈`, cat: 'wall', fam: 'light', spr: 'string_lights', onSpr: 'string_lights_on', map, price: 110, layer: 'wall', light: L(32, 7, 50, k === 'pink' ? 'pink' : k === 'blue' ? 'cool' : 'warm', 0.8), toggle: true, twinkle: true });
  // lava lamps (animated)
  SPR.def('lava_lamp', G(8, 20, g => { g.rect(2, 0, 4, 2, 'y'); g.hl(2, 0, 4, 'z'); for (let y = 2; y < 14; y++) { const hw = y < 8 ? 1 + Math.floor((y - 2) / 3) : 3 - Math.floor((y - 8) / 4); g.hl(4 - hw, y, hw * 2, 'o'); g.px(4 - hw, y, 'p'); } for (let y = 14; y < 19; y++) { const hw = 2 + Math.floor((y - 14) / 2); g.hl(4 - hw, y, hw * 2, 'y'); g.px(4 - hw, y, 'z'); } }));
  const LAVA = { blue: ['藍', null, '#ee8fa0'], pink: ['粉', rampMap('blue', 'pink'), '#f6c75a'], green: ['綠', rampMap('blue', 'green'), '#b496dc'], sun: ['橘', rampMap('blue', 'sun'), '#ee8fa0'], lilac: ['紫', rampMap('blue', 'lilac'), '#8cc068'], aqua: ['水藍', rampMap('blue', 'aqua'), '#f6c75a'] };
  for (const k in LAVA) { const [n, map, blob] = LAVA[k]; gdef('lava_' + k, { n: `${n}色熔岩燈`, cat: 'decor', fam: 'lamp', spr: 'lava_lamp', map, price: 90, layer: 'decor', light: L(4, 8, 22, 'pink', 0.6), toggle: true, on: true, anim: lavaAnim(blob) }); }
})();
function lavaAnim(col) {
  return (c, x, y, it, t, cv) => {
    if (!it.on) return; c.fillStyle = col;
    for (let i = 0; i < 3; i++) { const p = (Math.sin(t * (0.5 + i * 0.17) + it.uid + i * 2) + 1) / 2, by = Math.round(y + 3 + p * 9), bx = x + 3 + (i % 2); c.fillRect(bx, by, 2, i === 1 ? 2 : 1); }
  };
}

// ===================================================== SEATING (fabric = blue ramp m n o p, wood = a–e, metal = y z A B)
const CHAIRS = {
  side: { n: '靠背椅', w: 16, h: 26, seatY: 13, draw(g) { g.rect(3, 1, 10, 2, 'd'); g.hl(3, 1, 10, 'e'); for (const x of [4, 7, 10]) g.vl(x, 3, 9, 'c'); g.vl(3, 1, 24, 'c'); g.vl(12, 1, 24, 'b'); g.rect(2, 12, 12, 3, 'n'); g.hl(2, 12, 12, 'o'); g.hl(2, 14, 12, 'm'); g.vl(4, 15, 10, 'b'); g.vl(11, 15, 10, 'b'); g.hl(4, 20, 8, 'c'); } },
  cafe: { n: '咖啡廳椅', w: 16, h: 26, seatY: 13, draw(g) { for (let x = 3; x < 13; x++) g.px(x, 2 + Math.round(Math.abs(x - 7.5) * 0.3), 'y'); g.vl(3, 2, 10, 'y'); g.vl(12, 2, 10, 'y'); for (const x of [6, 9]) g.vl(x, 3, 8, 'z'); g.ellipse(8, 13, 6, 1.6, 'o'); g.hl(3, 12, 10, 'p'); g.hl(3, 14, 10, 'n'); line(g, 4, 15, 2, 25, 'y'); line(g, 11, 15, 13, 25, 'y'); line(g, 6, 15, 5, 24, 'z'); line(g, 9, 15, 10, 24, 'z'); } },
  shell: { n: '造型椅', w: 18, h: 26, seatY: 14, draw(g) { g.ellipse(9, 9, 7, 7, 'o'); for (let y = 0; y < 9; y++) g.hl(5, y, 8, y < 4 ? '.' : g.get(9, y)); g.ellipse(9, 4, 6.5, 4, 'o'); g.ellipse(9, 13, 7.5, 3, 'n'); g.ellipse(9, 12, 6, 1.8, 'p'); g.vl(2, 6, 7, 'p'); line(g, 6, 16, 3, 25, 'c'); line(g, 12, 16, 15, 25, 'c'); line(g, 7, 16, 7, 24, 'b'); line(g, 11, 16, 11, 24, 'b'); g.hl(5, 20, 8, 'z'); } },
  stool: { n: '圓凳', w: 14, h: 18, seatY: 6, draw(g) { g.ellipse(7, 3, 6, 2.2, 'n'); g.ellipse(7, 2.5, 5, 1.4, 'o'); g.px(4, 2, 'p'); g.hl(1, 5, 12, 'd'); g.hl(2, 6, 10, 'c'); line(g, 3, 6, 1, 17, 'c'); line(g, 10, 6, 12, 17, 'b'); line(g, 7, 6, 7, 16, 'b'); g.hl(3, 12, 8, 'b'); } },
  bar: { n: '吧檯椅', w: 14, h: 30, seatY: 6, draw(g) { g.ellipse(7, 3, 6, 2.2, 'n'); g.ellipse(7, 2.5, 5, 1.4, 'o'); g.hl(1, 5, 12, 'y'); line(g, 3, 6, 1, 29, 'y'); line(g, 10, 6, 12, 29, 'y'); g.vl(7, 6, 23, 'z'); g.hl(2, 20, 10, 'z'); g.hl(3, 21, 8, 'y'); } },
  rocking: { n: '搖椅', w: 22, h: 26, seatY: 14, draw(g) { g.rect(4, 1, 12, 2, 'd'); for (const x of [5, 8, 11, 14]) g.vl(x, 3, 10, 'c'); g.vl(4, 1, 15, 'c'); g.vl(15, 1, 15, 'b'); g.rect(3, 12, 15, 3, 'n'); g.hl(3, 12, 15, 'o'); g.hl(3, 14, 15, 'm'); g.vl(5, 15, 7, 'b'); g.vl(16, 15, 7, 'b'); for (let x = 1; x < 21; x++) g.px(x, 22 + Math.round(((x - 10.5) / 10) ** 2 * 3), 'c'); g.vl(2, 9, 4, 'c'); g.hl(2, 9, 3, 'd'); g.vl(18, 9, 4, 'b'); g.hl(17, 9, 3, 'd'); } },
  folding: { n: '折疊椅', w: 16, h: 26, seatY: 12, draw(g) { g.rect(3, 2, 10, 6, 'o'); g.hl(3, 2, 10, 'p'); g.hl(3, 7, 10, 'n'); g.vl(3, 2, 22, 'z'); g.vl(12, 2, 22, 'z'); g.rect(2, 11, 12, 2, 'o'); g.hl(2, 12, 12, 'n'); line(g, 3, 13, 12, 24, 'y'); line(g, 12, 13, 3, 24, 'y'); } },
};
const ARMCHAIRS = {
  club: { n: '扶手沙發椅', w: 26, h: 24, seat: { x: 13, y: 18 }, draw(g) { g.rect(4, 1, 18, 11, 'n'); g.hl(4, 1, 18, 'o'); g.cut(4, 1, 18, 11); g.rect(1, 8, 6, 11, 'n'); g.rect(19, 8, 6, 11, 'm'); g.hl(1, 8, 6, 'p'); g.hl(19, 8, 6, 'o'); g.rect(6, 11, 14, 6, 'o'); g.hl(6, 11, 14, 'p'); g.hl(6, 16, 14, 'n'); g.rect(1, 18, 24, 2, 'm'); g.vl(3, 20, 3, 'b'); g.vl(22, 20, 3, 'b'); } },
  wing: { n: '高背椅', w: 24, h: 30, seat: { x: 12, y: 23 }, draw(g) { g.rect(4, 1, 16, 16, 'n'); g.cut(4, 1, 16, 16, 2); g.hl(5, 1, 14, 'o'); g.rect(1, 6, 5, 18, 'n'); g.rect(18, 6, 5, 18, 'm'); g.vl(1, 6, 18, 'o'); g.rect(5, 16, 14, 6, 'o'); g.hl(5, 16, 14, 'p'); for (let x = 7; x < 18; x += 3) g.px(x, 8, 'm'); g.rect(1, 23, 22, 2, 'm'); g.vl(3, 25, 4, 'a'); g.vl(20, 25, 4, 'a'); } },
  pouf: { n: '圓墩', w: 18, h: 13, seat: { x: 9, y: 10 }, petSpot: { x: 9, y: 2 }, draw(g) { g.ellipse(9, 6.5, 8, 5.5, 'n'); g.ellipse(9, 4, 7, 2.5, 'o'); g.ellipse(7, 3.2, 3, 1, 'p'); for (let x = 2; x < 17; x += 3) for (let y = 6; y < 12; y++) if (g.get(x, y) === 'n') g.px(x, y, 'm'); } },
};
const SOFAS = {
  love: { n: '雙人沙發', w: 44, h: 22, seat: { x: 22, y: 19 }, draw(g) { g.rect(4, 1, 36, 10, 'n'); g.hl(4, 1, 36, 'o'); g.cut(4, 1, 36, 10); g.rect(1, 7, 6, 12, 'n'); g.rect(37, 7, 6, 12, 'm'); g.hl(1, 7, 6, 'p'); g.hl(37, 7, 6, 'o'); g.rect(6, 10, 15, 6, 'o'); g.rect(22, 10, 15, 6, 'o'); g.hl(6, 10, 31, 'p'); g.vl(21, 10, 6, 'n'); g.rect(1, 16, 42, 3, 'm'); g.vl(3, 19, 2, 'a'); g.vl(40, 19, 2, 'a'); } },
  chester: { n: '雀斯特菲沙發', w: 52, h: 22, seat: { x: 26, y: 19 }, draw(g) { g.rect(2, 2, 48, 9, 'n'); g.hl(2, 2, 48, 'o'); for (let x = 5; x < 48; x += 4) for (let y = 4; y < 10; y += 3) g.px(x + (y % 2), y, 'm'); g.ellipse(4, 11, 3.5, 5, 'n'); g.ellipse(48, 11, 3.5, 5, 'm'); g.rect(5, 10, 42, 6, 'o'); g.hl(5, 10, 42, 'p'); g.vl(19, 10, 6, 'n'); g.vl(33, 10, 6, 'n'); g.rect(1, 16, 50, 3, 'm'); g.vl(4, 19, 2, 'a'); g.vl(47, 19, 2, 'a'); } },
};
// ===================================================== TABLES & STORAGE (wood a–e)
const TABLES = {
  round_side: { n: '圓邊几', w: 18, h: 20, surf: { x0: 2, x1: 15, y: 2 }, draw(g) { g.ellipse(9, 2.5, 8, 2, 'd'); g.hl(2, 2, 14, 'e'); g.hl(1, 4, 16, 'b'); g.vl(8, 5, 13, 'c'); g.vl(9, 5, 13, 'b'); g.ellipse(9, 18, 5, 1.4, 'b'); } },
  square_side: { n: '方邊桌', w: 18, h: 20, surf: { x0: 2, x1: 15, y: 1 }, draw(g) { g.rect(1, 1, 16, 3, 'd'); g.hl(1, 1, 16, 'e'); g.hl(1, 3, 16, 'b'); g.vl(2, 4, 15, 'c'); g.vl(15, 4, 15, 'b'); g.hl(2, 12, 14, 'c'); g.hl(3, 13, 12, 'b'); } },
  pedestal: { n: '花台', w: 14, h: 26, surf: { x0: 2, x1: 11, y: 1 }, draw(g) { g.rect(1, 1, 12, 3, 'd'); g.hl(1, 1, 12, 'e'); g.rect(4, 4, 6, 19, 'c'); g.vl(4, 4, 19, 'd'); g.vl(9, 4, 19, 'b'); g.rect(2, 23, 10, 2, 'b'); g.hl(2, 23, 10, 'c'); } },
  coffee: { n: '茶几', w: 38, h: 16, surf: { x0: 3, x1: 34, y: 2 }, draw(g) { g.rect(1, 1, 36, 4, 'd'); g.hl(1, 1, 36, 'e'); woodgrain(g, 2, 2, 34, 2, 'c', 'd', 5); g.hl(1, 4, 36, 'b'); g.vl(3, 5, 10, 'c'); g.vl(34, 5, 10, 'b'); g.rect(4, 10, 30, 2, 'c'); g.hl(4, 10, 30, 'd'); } },
  oval: { n: '橢圓茶几', w: 34, h: 15, surf: { x0: 5, x1: 28, y: 2 }, draw(g) { g.ellipse(17, 3, 16, 2.6, 'd'); g.hl(4, 2, 26, 'e'); g.hl(2, 5, 30, 'b'); for (const x of [6, 27]) { line(g, x, 6, x - (x < 17 ? 2 : -2), 14, 'b'); } line(g, 12, 6, 11, 13, 'c'); line(g, 22, 6, 23, 13, 'c'); } },
  writing: { n: '寫字桌', w: 40, h: 26, surf: { x0: 3, x1: 36, y: 3 }, desk: true, draw(g) { g.rect(1, 1, 38, 4, 'd'); g.hl(1, 1, 38, 'e'); g.hl(1, 4, 38, 'b'); g.rect(26, 5, 12, 8, 'c'); g.hl(27, 8, 10, 'b'); g.hl(30, 7, 4, 'a'); g.hl(30, 11, 4, 'a'); g.vl(2, 5, 20, 'c'); g.vl(37, 13, 12, 'b'); g.vl(26, 13, 12, 'b'); g.vl(3, 5, 20, 'b'); } },
  standing: { n: '升降桌', w: 40, h: 28, surf: { x0: 3, x1: 36, y: 3 }, desk: true, draw(g) { g.rect(1, 1, 38, 4, 'd'); g.hl(1, 1, 38, 'e'); g.hl(1, 4, 38, 'b'); g.rect(6, 5, 3, 20, 'y'); g.vl(6, 5, 20, 'z'); g.rect(31, 5, 3, 20, 'y'); g.vl(31, 5, 20, 'z'); g.hl(3, 25, 9, 'y'); g.hl(28, 25, 9, 'y'); g.rect(33, 6, 2, 2, 'K'); } },
};
const STORAGE = {
  dresser: { n: '五斗櫃', w: 30, h: 26, surf: { x0: 2, x1: 27, y: 1 }, draw(g) { g.rect(1, 1, 28, 3, 'd'); g.hl(1, 1, 28, 'e'); g.rect(2, 4, 26, 19, 'c'); g.vl(2, 4, 19, 'd'); g.vl(27, 4, 19, 'b'); for (let y = 8; y < 23; y += 5) g.hl(2, y, 26, 'b'); for (let y = 6; y < 23; y += 5) { g.px(10, y, 'a'); g.px(19, y, 'a'); } g.vl(3, 23, 2, 'b'); g.vl(26, 23, 2, 'b'); } },
  tall: { n: '高櫃', w: 22, h: 44, surf: { x0: 2, x1: 19, y: 1 }, draw(g) { g.rect(1, 1, 20, 3, 'd'); g.hl(1, 1, 20, 'e'); g.rect(2, 4, 18, 38, 'c'); g.vl(2, 4, 38, 'd'); g.vl(19, 4, 38, 'b'); g.vl(10, 4, 24, 'b'); g.hl(2, 28, 18, 'b'); g.hl(2, 35, 18, 'b'); g.pts([[8, 16], [12, 16]], 'a'); g.hl(9, 31, 4, 'a'); g.hl(9, 38, 4, 'a'); } },
  tv_stand: { n: '電視櫃', w: 46, h: 16, surf: { x0: 2, x1: 43, y: 1 }, draw(g) { g.rect(1, 1, 44, 3, 'd'); g.hl(1, 1, 44, 'e'); g.rect(2, 4, 42, 9, 'c'); g.vl(16, 4, 9, 'b'); g.vl(30, 4, 9, 'b'); g.rect(17, 5, 13, 7, 'a'); books(g, 18, 29, 11, 3, 6); g.px(9, 8, 'a'); g.px(37, 8, 'a'); g.vl(3, 13, 2, 'b'); g.vl(42, 13, 2, 'b'); } },
  cube: { n: '格子櫃', w: 30, h: 30, surf: { x0: 2, x1: 27, y: 1 }, draw(g) { g.rect(1, 1, 28, 28, 'd'); g.hl(1, 1, 28, 'e'); for (const [x, y] of [[3, 3], [16, 3], [3, 16], [16, 16]]) g.rect(x, y, 11, 11, 'b'); books(g, 4, 13, 13, 9, 9); g.ellipse(21.5, 24, 4, 3.4, 'o'); g.hl(18, 22, 8, 'p'); g.rect(17, 5, 9, 8, 'c'); g.px(21, 8, 'a'); } },
  ladder: { n: '梯形書架', w: 26, h: 42, surf: { x0: 3, x1: 14, y: 2 }, draw(g) { line(g, 2, 41, 12, 1, 'c'); line(g, 23, 41, 15, 1, 'b'); for (const [y, x0, x1] of [[3, 11, 16], [13, 8, 19], [23, 5, 21], [33, 3, 23]]) { g.hl(x0, y, x1 - x0, 'd'); g.hl(x0, y + 1, x1 - x0, 'b'); } books(g, 9, 18, 12, 4, 8); books(g, 6, 14, 22, 5, 8); g.ellipse(18, 21, 2.5, 2, 'j'); g.ellipse(9, 31, 3, 2, 'o'); g.hl(15, 30, 6, 'r'); } },
  sideboard: { n: '餐邊櫃', w: 42, h: 22, surf: { x0: 2, x1: 39, y: 1 }, draw(g) { g.rect(1, 1, 40, 3, 'd'); g.hl(1, 1, 40, 'e'); g.rect(2, 4, 38, 13, 'c'); for (const x of [2, 15, 28]) { g.rect(x + 1, 5, 11, 11, 'd'); g.vl(x + 1, 5, 11, 'e'); for (let y = 6; y < 16; y += 2) g.hl(x + 2, y, 9, 'c'); } g.vl(4, 17, 4, 'b'); g.vl(37, 17, 4, 'b'); } },
};
const BEDS = {
  single: { n: '單人床', w: 50, h: 26, bed: { x: 12, y: 9 }, draw(g) { g.rect(1, 1, 8, 22, 'c'); g.hl(1, 1, 8, 'd'); g.cut(1, 1, 8, 22); g.rect(8, 10, 41, 10, 'n'); g.hl(8, 10, 41, 'o'); g.hl(8, 19, 41, 'm'); g.rect(9, 6, 9, 5, 'f'); g.hl(9, 6, 9, 'Z'); g.hl(9, 10, 9, 'g'); g.rect(19, 9, 30, 10, 'o'); g.hl(19, 9, 30, 'p'); for (let x = 22; x < 49; x += 5) g.vl(x, 10, 9, 'n'); g.rect(46, 8, 3, 14, 'c'); g.rect(2, 20, 47, 3, 'b'); g.vl(3, 23, 2, 'a'); g.vl(46, 23, 2, 'a'); } },
  canopy: { n: '公主床', w: 52, h: 44, bed: { x: 12, y: 27 }, draw(g) { g.vl(1, 1, 41, 'c'); g.vl(50, 1, 41, 'b'); g.hl(1, 1, 50, 'd'); for (let x = 2; x < 50; x++) { const d = 4 + Math.round(Math.sin(x * 0.4) * 1.5); for (let y = 2; y < d; y++) g.px(x, y, 't'); } for (let y = 3; y < 30; y++) { g.px(3, y, 's'); g.px(4, y, 't'); g.px(48, y, 's'); g.px(47, y, 't'); } g.rect(8, 28, 41, 10, 'n'); g.hl(8, 28, 41, 'o'); g.rect(9, 24, 9, 5, 'f'); g.hl(9, 24, 9, 'Z'); g.rect(19, 27, 30, 10, 'o'); g.hl(19, 27, 30, 'p'); g.rect(2, 38, 48, 3, 'b'); } },
  bunk: { n: '雙層床', w: 50, h: 46, bed: { x: 12, y: 31 }, draw(g) { g.vl(1, 1, 44, 'c'); g.vl(48, 1, 44, 'b'); for (const top of [6, 30]) { g.rect(3, top, 44, 7, 'n'); g.hl(3, top, 44, 'o'); g.rect(4, top - 3, 8, 4, 'f'); g.hl(4, top - 3, 8, 'Z'); g.rect(13, top - 1, 34, 7, 'o'); g.hl(13, top - 1, 34, 'p'); g.rect(1, top + 7, 48, 2, 'b'); } for (let y = 10; y < 30; y += 4) g.hl(42, y, 5, 'c'); g.vl(42, 9, 21, 'b'); g.vl(46, 9, 21, 'b'); } },
};
// ===================================================== RUGS
const RUG_SHAPES = {
  round: { n: '圓形', w: 46, h: 18, inside: (x, y, w, h) => ((x + 0.5 - w / 2) / (w / 2 - 0.5)) ** 2 + ((y + 0.5 - h / 2) / (h / 2 - 0.5)) ** 2 <= 1 },
  rect: { n: '方形', w: 54, h: 18, inside: (x, y, w, h) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1 },
  runner: { n: '長條', w: 40, h: 10, inside: (x, y, w, h) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1 },
  half: { n: '半圓', w: 40, h: 14, inside: (x, y, w, h) => y >= 1 && ((x + 0.5 - w / 2) / (w / 2 - 0.5)) ** 2 + ((y + 0.5 - h) / (h - 1)) ** 2 <= 1 },
  cloud: { n: '雲朵', w: 46, h: 18, inside: (x, y, w, h) => { const c = [[12, 10, 10, 7], [23, 8, 11, 8], [34, 10, 10, 7], [23, 12, 20, 6]]; return c.some(([cx, cy, rx, ry]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1); } },
  oval: { n: '橢圓', w: 56, h: 16, inside: (x, y, w, h) => ((x + 0.5 - w / 2) / (w / 2 - 0.5)) ** 2 + ((y + 0.5 - h / 2) / (h / 2 - 0.5)) ** 2 <= 1 },
};
const RUG_PATTERNS = {
  border: { n: '鑲邊', f: (x, y, e) => e <= 1 ? 'm' : e === 2 ? 'p' : ((x + y) % 7 === 0 ? 'n' : 'o') },
  stripe: { n: '條紋', f: (x, y, e) => e <= 1 ? 'm' : (Math.floor(x / 4) % 2 ? 'o' : 'p') },
  diamond: { n: '菱紋', f: (x, y, e) => { if (e <= 1) return 'm'; const u = Math.abs(((x % 12) + 12) % 12 - 6) + Math.abs(((y % 8) + 8) % 8 - 4) * 1.5; return u < 3 ? 'n' : u < 4 ? 'p' : 'o'; } },
  checker: { n: '格紋', f: (x, y, e) => e <= 1 ? 'm' : ((Math.floor(x / 5) + Math.floor(y / 3)) % 2 ? 'o' : 'p') },
  rings: { n: '同心圓', f: (x, y, e) => e <= 1 ? 'm' : (Math.floor(e / 2) % 2 ? 'o' : 'p') },
  fringe: { n: '流蘇', f: (x, y, e, w) => (x <= 1 || x >= w - 2) ? (y % 2 ? 'f' : '.') : e <= 1 ? 'm' : ((x + y * 2) % 9 < 2 ? 'n' : 'o') },
};
function rugSprite(sk, pk) {
  return () => {
    const S = RUG_SHAPES[sk], P = RUG_PATTERNS[pk], g = new Grid(S.w, S.h);
    const ins = (x, y) => S.inside(x, y, S.w, S.h);
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
      if (!ins(x, y) && !(pk === 'fringe' && (x <= 1 || x >= S.w - 2) && ins(Math.min(S.w - 3, Math.max(2, x)), y))) continue;
      let e = 9; for (let d = 1; d <= 4; d++) if (!ins(x - d, y) || !ins(x + d, y) || !ins(x, y - Math.ceil(d / 2)) || !ins(x, y + Math.ceil(d / 2))) { e = d; break; }
      const c = P.f(x, y, e, S.w); if (c !== '.') g.px(x, y, c);
    }
    return g.outline();
  };
}

(function registerFurniture() {
  const fabricCols = ['blue', 'pink', 'green', 'sun', 'lilac', 'grey', 'navy', 'mustard', 'coral', 'olive', 'berry', 'snow'];
  const pick = (arr, n, seed) => { const r = rnd(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  let seed = 1;
  for (const k in CHAIRS) {
    const C = CHAIRS[k], spr = `ch_${k}`; SPR.def(spr, G(C.w, C.h, C.draw));
    for (const ck of ['blue', ...pick(fabricCols.slice(1), 4, seed++)]) for (const wk of k === 'cafe' || k === 'bar' || k === 'folding' ? ['oak'] : ['oak', 'walnut']) {
      const desk = k === 'side' || k === 'cafe' || k === 'shell';
      gdef(`${spr}_${ck}_${wk}`, { n: `${CW[ck]}${wk === 'walnut' ? '胡桃木' : ''}${C.n}`, cat: 'furniture', fam: 'seat', spr, map: merge(cmap('blue', ck), WOOD[wk][0]), price: 50 + (k === 'rocking' ? 50 : 0), layer: 'floor', chair: desk || undefined, seat: desk ? undefined : { x: Math.floor(C.w / 2), y: C.seatY + 9 } });
    }
  }
  for (const k in ARMCHAIRS) { const C = ARMCHAIRS[k], spr = `ac_${k}`; SPR.def(spr, G(C.w, C.h, C.draw)); for (const ck of ['blue', ...pick(fabricCols.slice(1), 6, seed++)]) gdef(`${spr}_${ck}`, { n: `${CW[ck]}${C.n}`, cat: 'furniture', fam: 'sofa', spr, map: cmap('blue', ck), price: k === 'pouf' ? 60 : 160, layer: 'floor', seat: C.seat, petSpot: C.petSpot || { x: C.seat.x, y: C.seat.y - 10 } }); }
  for (const k in SOFAS) { const C = SOFAS[k], spr = `sf_${k}`; SPR.def(spr, G(C.w, C.h, C.draw)); for (const ck of ['blue', ...pick(fabricCols.slice(1), 6, seed++)]) gdef(`${spr}_${ck}`, { n: `${CW[ck]}${C.n}`, cat: 'furniture', fam: 'sofa', spr, map: cmap('blue', ck), price: 240 + (k === 'chester' ? 60 : 0), layer: 'floor', seat: C.seat, petSpot: { x: C.seat.x + 10, y: 9 } }); }
  for (const k in TABLES) { const T = TABLES[k], spr = `tb_${k}`; SPR.def(spr, G(T.w, T.h, T.draw)); for (const wk in WOOD) { if ((k === 'standing') && wk !== 'oak' && wk !== 'white' && wk !== 'black') continue; gdef(`${spr}_${wk}`, { n: `${WOOD[wk][1]}${T.n}`, cat: 'furniture', fam: T.desk ? 'table' : 'table', spr, map: WOOD[wk][0], price: T.desk ? 150 : 70, layer: 'floor', surface: T.surf, desk: T.desk || undefined }); } }
  for (const k in STORAGE) { const T = STORAGE[k], spr = `st_${k}`; SPR.def(spr, G(T.w, T.h, T.draw)); for (const wk in WOOD) gdef(`${spr}_${wk}`, { n: `${WOOD[wk][1]}${T.n}`, cat: 'furniture', fam: 'storage', spr, map: WOOD[wk][0], price: 140, layer: 'floor', surface: T.surf }); }
  for (const k in BEDS) { const B = BEDS[k], spr = `bd_${k}`; SPR.def(spr, G(B.w, B.h, B.draw)); for (const ck of ['blue', ...pick(fabricCols.slice(1), 5, seed++)]) gdef(`${spr}_${ck}`, { n: `${CW[ck]}${B.n}`, cat: 'furniture', fam: 'bed', spr, map: cmap('blue', ck), price: k === 'single' ? 140 : 260, layer: 'floor', bed: B.bed, petSpot: { x: B.w - 14, y: B.bed.y - 1 } }); }
  const rugCols = ['blue', 'pink', 'green', 'sun', 'lilac', 'grey', 'navy', 'mustard', 'coral', 'olive', 'berry', 'snow', 'clay', 'teal'];
  for (const sk in RUG_SHAPES) for (const pk in RUG_PATTERNS) {
    if (pk === 'fringe' && (sk === 'round' || sk === 'cloud' || sk === 'half' || sk === 'oval')) continue;
    if (pk === 'rings' && (sk === 'rect' || sk === 'runner')) continue;
    const spr = `rg_${sk}_${pk}`; SPR.def(spr, rugSprite(sk, pk));
    for (const ck of pick(rugCols, 3, seed++)) { const S = RUG_SHAPES[sk]; gdef(`${spr}_${ck}`, { n: `${CW[ck]}${RUG_PATTERNS[pk].n}${S.n}地毯`, cat: 'rug', fam: 'rug', spr, map: cmap('blue', ck), price: 50 + Math.round(S.w * S.h / 40), layer: 'rug', petSpot: S.h >= 14 ? { x: Math.floor(S.w / 2), y: Math.floor(S.h / 2) + 2 } : undefined }); }
  }
})();

// ===================================================== WALL ART
const FRAMES = { wood: { n: '木框', c: ['d', 'c', 'b'] }, gold: { n: '金框', c: ['w', 'v', 'u'] }, white: { n: '白框', c: ['Z', 'B', 'A'] }, black: { n: '黑框', c: ['z', 'y', 'Y'] } };
const ART = {
  sunset: { n: '夕陽海', w: 26, h: 20, draw(g, x, y, w, h) { for (let j = 0; j < h; j++) g.hl(x, y + j, w, j < h * 0.25 ? 'G' : j < h * 0.45 ? 's' : j < h * 0.6 ? 'v' : 'n'); g.ellipse(x + w * 0.6, y + h * 0.58, 3, 3, 'x'); for (let j = Math.ceil(h * 0.6); j < h; j++) g.hl(x, y + j, w, j % 2 ? 'n' : 'o'); for (let i = 0; i < w; i += 3) g.px(x + i, y + Math.ceil(h * 0.62) + (i % 2), 'x'); } },
  mountain: { n: '雪山', w: 26, h: 20, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'p'); for (let i = 0; i < w; i++) { const t1 = Math.round(h * 0.35 + Math.abs(i - w * 0.35) * 0.8), t2 = Math.round(h * 0.5 + Math.abs(i - w * 0.72) * 0.6); for (let j = Math.max(0, t1); j < h; j++) g.px(x + i, y + j, j < t1 + 2 ? 'Z' : 'z'); for (let j = Math.max(0, t2); j < h; j++) g.px(x + i, y + j, j < t2 + 1 ? 'f' : 'A'); } g.rect(x, y + h - 4, w, 4, 'j'); g.hl(x, y + h - 4, w, 'k'); } },
  blobs: { n: '抽象色塊', w: 20, h: 24, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'f'); g.ellipse(x + w * 0.35, y + h * 0.35, 5, 5, 's'); g.ellipse(x + w * 0.65, y + h * 0.6, 6, 5, 'w'); g.ellipse(x + w * 0.3, y + h * 0.75, 3, 3, 'K'); g.rect(x + w * 0.55, y + 3, 4, 6, 'n'); } },
  geo: { n: '幾何構成', w: 20, h: 24, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'g'); for (let j = 0; j < h / 2; j++) g.hl(x + w / 2 - j / 1.2, y + 3 + j, j * 1.6, 'M'); g.rect(x + 2, y + h - 9, w - 4, 6, 'n'); g.ellipse(x + w - 5, y + 5, 3, 3, 'w'); } },
  still: { n: '花瓶靜物', w: 20, h: 24, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'h'); g.rect(x, y + h - 6, w, 6, 'c'); g.ellipse(x + w / 2, y + h - 9, 3.5, 4, 'o'); for (const [dx, dy, c] of [[-4, 6, 'r'], [0, 4, 'w'], [4, 7, 's'], [-2, 9, 'F'], [3, 10, 'r']]) g.ellipse(x + w / 2 + dx, y + dy, 2, 2, c); } },
  catmoon: { n: '月下貓', w: 20, h: 24, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'm'); for (let i = 0; i < 12; i++) g.px(x + (i * 7) % w, y + (i * 5) % (h - 8), 'p'); g.ellipse(x + w * 0.62, y + 7, 4, 4, 'x'); g.ellipse(x + w * 0.7, y + 6, 3, 3, 'm'); g.stamp(x + 3, y + h - 9, ['Y...Y', 'YY.YY', 'YYYYY', 'YYYYY', '.YYYY', '.YYYYYY', '..YYYYY.Y']); g.rect(x, y + h - 2, w, 2, 'Y'); } },
  leaf: { n: '植物標本', w: 16, h: 24, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'f'); leaf(g, x + w / 2, y + h - 2, h - 5, -Math.PI / 2, 4, GREEN); } },
  city: { n: '城市夜景', w: 30, h: 18, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'F'); for (let i = 0; i < w; i += 4) { const bh = 5 + (hsh(i, 3) % 9); g.rect(x + i, y + h - bh, 3, bh, 'y'); for (let j = h - bh + 1; j < h - 1; j += 2) if (hsh(i, j) % 2) g.px(x + i + 1, y + j, 'x'); } g.ellipse(x + 5, y + 4, 2, 2, 'W'); } },
  rainbow: { n: '彩虹', w: 26, h: 18, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'p'); const cx = x + w / 2, cy = y + h - 2; ['r', 'v', 'w', 'k', 'o', 'G'].forEach((c, i) => { for (let a = 0; a <= 60; a++) { const t = Math.PI * a / 60, R = 11 - i; g.px(Math.round(cx + Math.cos(t) * R), Math.round(cy - Math.sin(t) * R * 0.8), c); } }); g.ellipse(x + 4, y + h - 3, 4, 2, 'Z'); g.ellipse(x + w - 4, y + h - 3, 4, 2, 'Z'); } },
  lemon: { n: '檸檬', w: 20, h: 20, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'K'); g.ellipse(x + w / 2, y + h / 2 + 1, 6, 4.5, 'w'); g.ellipse(x + w / 2 - 2, y + h / 2, 2, 1.4, 'x'); g.px(x + w / 2 + 6, y + h / 2 + 1, 'v'); leaf(g, x + w / 2, y + h / 2 - 4, 5, -0.6, 1.5, GREEN); } },
  whale: { n: '鯨魚', w: 28, h: 18, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'p'); for (let i = 0; i < w; i++) for (let j = Math.round(h * 0.65 + Math.sin(i * 0.5)); j < h; j++) g.px(x + i, y + j, j % 3 ? 'o' : 'n'); g.ellipse(x + w * 0.45, y + h * 0.5, 7, 3.2, 'm'); g.stamp(x + w * 0.45 + 6, y + h * 0.5 - 3, ['m.m', '.mm']); g.px(x + w * 0.45 - 4, y + h * 0.5 - 1, 'Z'); g.hl(x + w * 0.45 - 5, y + h * 0.5 + 2, 8, 'p'); } },
  sakura: { n: '櫻花枝', w: 16, h: 26, draw(g, x, y, w, h) { g.rect(x, y, w, h, 'f'); line(g, x + 2, y + h - 2, x + w - 3, y + 3, 'a'); line(g, x + 7, y + h * 0.55, x + 2, y + 6, 'a'); for (const [dx, dy] of [[w - 4, 3], [w - 6, 7], [3, 6], [5, 10], [w - 7, 12], [8, 15]]) g.stamp(x + dx - 1, y + dy - 1, ['.t.', 'tst', '.t.']); } },
};
function artSprite(ak, fk, poster) {
  const A = ART[ak], F = FRAMES[fk];
  return G(A.w + (poster ? 2 : 4), A.h + (poster ? 2 : 4), g => {
    const W = A.w + (poster ? 2 : 4), H = A.h + (poster ? 2 : 4);
    if (poster) { g.rect(0, 0, W, H, 'f'); A.draw(g, 1, 1, A.w, A.h); g.pts([[0, 0], [1, 0], [W - 1, 0], [W - 2, 0]], 'B'); }
    else { g.rect(0, 0, W, H, F.c[1]); g.hl(0, 0, W, F.c[0]); g.vl(0, 0, H, F.c[0]); g.hl(0, H - 1, W, F.c[2]); g.vl(W - 1, 0, H, F.c[2]); A.draw(g, 2, 2, A.w, A.h); }
  });
}
// ===================================================== FIGURINES & PLUSH (a main, b shade, c accent, 0 eyes)
const ANIMALS = {
  cat: ['a.....a', 'aa...aa', 'aaaaaaa', 'a0aaa0a', 'aaacaaa', '.aaaaa.', '.abbba.', 'aabbbaa', 'aaaaaaa'],
  bunny: ['.a...a.', '.ac.ca.', '.ac.ca.', '.aaaaa.', 'aa0a0aa', 'aaacaaa', '.aaaaa.', 'aabbbaa', 'aaaaaaa'],
  bear: ['aa...aa', 'aaaaaaa', 'aaaaaaa', 'a0aaa0a', 'aabcbaa', '.aaaaa.', 'aabbbaa', 'aabbbaa', '.aa.aa.'],
  duck: ['..aaa..', '.aaaaa.', '.a0aacc', '.aaaacc', '..aaa..', '.aaaaaa', 'aabbbaa', 'aaaaaaa', '.aaaaa.'],
  frog: ['.cc.cc.', 'c0cac0c', 'aaaaaaa', 'aaaaaaa', 'abaaaba', '.aaaaa.', 'aabbbaa', 'aa...aa'],
  owl: ['a.....a', 'aaaaaaa', 'acacaca', 'c0cac0c', 'aaacaaa', 'abbbbba', 'abbbbba', '.abbba.', '..c.c..'],
  penguin: ['..aaa..', '.aaaaa.', 'aabbbaa', 'ab0b0ba', 'abbcbba', 'aabbbaa', 'aabbbaa', '.abbba.', '.cc.cc.'],
  whale: ['........a', '.aaaaa.aa', 'aaaaaaaaa', 'a0aaaaaaa', 'abbbbbaa.', '.abbbba..'],
  dino: ['....aaa.', '...aa0a.', '...aaaaa', 'c.aaa...', 'caaaaa..', '.aaaaaa.', '.abbbaa.', '.aa..aa.'],
  fox: ['a.....a', 'ac...ca', 'aaaaaaa', 'b0aaa0b', 'bbbcbbb', '.bbbbb.', '.aaaaa.', 'aabbbaa', 'aaaaaaa'],
  panda: ['c.....c', 'caaaaac', 'aaaaaaa', 'c0aaa0c', 'aaacaaa', '.aaaaa.', 'ccaaacc', 'ccaaacc', '.cc.cc.'],
  chick: ['...c...', '..aaa..', '.aaaaa.', '.a0a0a.', '.aacaa.', 'aaaaaaa', 'aabbbaa', '.aaaaa.', '..c.c..'],
};
const ANIMAL_N = { cat: '貓', bunny: '兔子', bear: '熊', duck: '鴨子', frog: '青蛙', owl: '貓頭鷹', penguin: '企鵝', whale: '鯨魚', dino: '恐龍', fox: '狐狸', panda: '熊貓', chick: '小雞' };
function animalSprite(rows, ramp, accent, plush) {
  return () => {
    const H = rows.length + (plush ? 2 : 3), W = Math.max(...rows.map(r => r.length)) + 2, g = new Grid(W, H);
    rows.forEach((r, j) => [...r].forEach((ch, i) => { const c = ch === 'a' ? ramp[2] : ch === 'b' ? ramp[3] : ch === 'c' ? accent : ch === '0' ? 'Y' : null; if (c) g.px(i + 1, j, c); }));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g.get(x, y) === ramp[2] && (g.get(x + 1, y) === '.' || x === W - 2)) g.px(x, y, ramp[1]);
    if (plush) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g.get(x, y) === 'Y' && g.get(x, y + 1) !== '.') { g.px(x - 1 >= 0 && g.get(x - 1, y + 1) !== '.' ? x - 1 : x, y + 1, 's'); break; } }
    else { g.hl(0, H - 2, W, 'c'); g.hl(0, H - 1, W, 'b'); g.hl(0, H - 2, 1, 'd'); }
    return g.outline();
  };
}
// ===================================================== SMALL DECOR
const SMALL = {
  boba: { n: '珍珠奶茶', w: 8, h: 14, fam: 'tableware', price: 20, draw(g) { g.vl(5, 0, 4, 'r'); g.rect(1, 3, 6, 1, 'f'); for (let y = 4; y < 13; y++) { const i = y > 9 ? 1 : 0; g.hl(1 + i, y, 6 - i * 2, y > 9 ? 'a' : 'g'); } g.pts([[2, 11], [4, 12], [5, 10]], 'Y'); g.vl(1, 4, 6, 'f'); } },
  latte: { n: '外帶咖啡', w: 8, h: 12, fam: 'tableware', price: 20, draw(g) { g.rect(1, 0, 6, 2, 'z'); g.hl(0, 2, 8, 'y'); for (let y = 3; y < 11; y++) g.hl(1 + (y > 7 ? 1 : 0), y, 6 - (y > 7 ? 2 : 0), 'f'); g.rect(1, 5, 6, 3, 'c'); g.px(2, 6, 'd'); } },
  teacups: { n: '下午茶杯組', w: 18, h: 10, fam: 'tableware', price: 35, steam: true, draw(g) { g.ellipse(9, 8, 8.5, 1.5, 'f'); for (const x of [3, 11]) { g.rect(x, 3, 5, 4, 'f'); g.hl(x, 3, 5, 's'); g.px(x + 5, 4, 'f'); g.px(x + 5, 5, 'f'); g.px(x + 1, 5, 's'); } } },
  cake_slice: { n: '草莓蛋糕', w: 12, h: 10, fam: 'tableware', price: 25, draw(g) { g.ellipse(6, 8, 6, 1.5, 'f'); g.rect(2, 3, 8, 5, 'g'); g.hl(2, 3, 8, 'Z'); g.hl(2, 5, 8, 's'); g.ellipse(6, 2, 1.6, 1.5, 'r'); g.px(6, 0, 'j'); } },
  donut: { n: '甜甜圈', w: 12, h: 8, fam: 'tableware', price: 15, draw(g) { g.ellipse(6, 4, 5.5, 3.5, 'c'); g.ellipse(6, 3.4, 5, 2.6, 's'); g.ellipse(6, 3.5, 1.5, 1, '.'); g.pts([[3, 2], [8, 2], [5, 5], [9, 4]], 'w'); g.pts([[4, 4], [7, 1]], 'o'); } },
  fruit_bowl: { n: '水果盤', w: 16, h: 10, fam: 'tableware', price: 30, draw(g) { g.ellipse(8, 7, 7.5, 2.5, 'o'); g.hl(1, 6, 14, 'p'); g.ellipse(5, 4, 2.4, 2.2, 'r'); g.ellipse(9, 3, 2.4, 2.2, 'w'); g.ellipse(12, 4.5, 2, 1.8, 'k'); g.px(4, 3, 's'); g.px(9, 1, 'j'); } },
  cookie_jar: { n: '餅乾罐', w: 10, h: 14, fam: 'tableware', price: 25, draw(g) { g.rect(2, 0, 6, 2, 'r'); g.hl(2, 0, 6, 's'); g.rect(1, 2, 8, 11, ','); g.vl(1, 2, 11, ':'); for (const [x, y] of [[3, 6], [6, 8], [3, 10], [6, 11], [4, 4]]) { g.px(x, y, 'd'); g.px(x + 1, y, 'c'); } } },
  pencil_cup: { n: '筆筒', w: 8, h: 14, fam: 'desk', price: 15, draw(g) { for (const [x, c, t] of [[2, 'w', 2], [4, 'n', 0], [5, 'r', 3]]) { g.vl(x, t, 6, c); g.px(x, t, 'f'); } g.rect(1, 6, 6, 7, 'o'); g.vl(1, 6, 7, 'p'); g.hl(1, 12, 6, 'n'); } },
  notebook: { n: '筆記本堆', w: 14, h: 8, fam: 'desk', price: 15, draw(g) { g.rect(1, 5, 12, 2, 'n'); g.hl(1, 5, 12, 'o'); g.rect(2, 3, 11, 2, 'r'); g.hl(2, 3, 11, 's'); g.rect(1, 1, 11, 2, 'k'); g.hl(1, 1, 11, 'l'); g.vl(12, 1, 2, 'f'); } },
  camera: { n: '底片相機', w: 14, h: 10, fam: 'desk', price: 60, draw(g) { g.rect(1, 2, 12, 7, 'y'); g.hl(1, 2, 12, 'z'); g.rect(2, 1, 3, 1, 'y'); g.ellipse(7, 5.5, 2.6, 2.6, 'Y'); g.ellipse(7, 5.5, 1.5, 1.5, 'n'); g.px(6, 4, 'p'); g.rect(10, 3, 2, 1, 'B'); g.hl(1, 6, 3, 'c'); } },
  console: { n: '掌上遊戲機', w: 10, h: 14, fam: 'toy', price: 70, draw(g) { g.rect(1, 0, 8, 13, 'B'); g.vl(1, 0, 13, 'Z'); g.rect(2, 1, 6, 5, 'k'); g.rect(3, 2, 4, 3, 'l'); g.pts([[3, 8], [2, 9], [3, 9], [4, 9], [3, 10]], 'y'); g.pts([[6, 9], [7, 8]], 'r'); } },
  radio: { n: '復古收音機', w: 18, h: 12, fam: 'desk', price: 80, music: true, react: 'notes', draw(g) { g.rect(1, 2, 16, 9, 'c'); g.hl(1, 2, 16, 'd'); g.rect(2, 4, 8, 6, 'b'); for (let y = 5; y < 10; y += 2) g.hl(3, y, 6, 'a'); g.ellipse(13, 6, 2, 2, 'g'); g.px(13, 6, 'a'); g.rect(11, 9, 5, 1, 'g'); line(g, 4, 2, 9, 0, 'y'); } },
  typewriter: { n: '打字機', w: 20, h: 12, fam: 'desk', price: 120, draw(g) { g.rect(3, 0, 14, 2, 'f'); g.rect(1, 2, 18, 3, 'j'); g.hl(1, 2, 18, 'k'); g.rect(2, 5, 16, 6, 'j'); for (let y = 6; y < 10; y += 2) for (let x = 3; x < 17; x += 2) g.px(x, y, 'f'); g.hl(2, 10, 16, 'i'); } },
  rubik: { n: '魔術方塊', w: 8, h: 8, fam: 'toy', price: 15, draw(g) { const c = ['r', 'w', 'n', 'k', 'v', 'f']; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) g.rect(1 + i * 2, 1 + j * 2, 2, 2, c[(i + j * 2) % 6]); } },
  blocks: { n: '積木', w: 14, h: 10, fam: 'toy', price: 20, draw(g) { g.rect(1, 5, 4, 4, 'r'); g.rect(5, 5, 4, 4, 'n'); g.rect(9, 5, 4, 4, 'w'); g.rect(3, 1, 4, 4, 'k'); g.rect(7, 1, 4, 4, 'G'); g.px(2, 6, 's'); g.px(6, 6, 'o'); g.px(10, 6, 'x'); g.px(4, 2, 'l'); g.px(8, 2, 'H'); } },
  robot: { n: '機器人玩具', w: 10, h: 14, fam: 'toy', price: 45, draw(g) { g.vl(5, 0, 2, 'z'); g.px(5, 0, 'r'); g.rect(2, 2, 7, 5, 'A'); g.hl(2, 2, 7, 'B'); g.pts([[3, 4], [7, 4]], 'K'); g.hl(4, 6, 3, 'y'); g.rect(1, 7, 9, 5, 'z'); g.rect(4, 8, 3, 2, 'r'); g.rect(2, 12, 2, 2, 'y'); g.rect(7, 12, 2, 2, 'y'); } },
  rocket: { n: '火箭模型', w: 8, h: 16, fam: 'toy', price: 40, draw(g) { g.px(4, 0, 'r'); g.rect(3, 1, 3, 2, 'r'); g.rect(2, 3, 5, 9, 'Z'); g.vl(2, 3, 9, 'B'); g.ellipse(4.5, 6, 1.2, 1.2, 'n'); g.pts([[1, 10], [1, 11], [7, 10], [7, 11]], 'r'); g.rect(3, 12, 3, 1, 'y'); g.pts([[3, 13], [5, 14], [4, 13]], 'v'); } },
  snowglobe: { n: '雪花水晶球', w: 12, h: 14, fam: 'figure', price: 50, react: 'bubbles', draw(g) { g.ellipse(6, 5.5, 5, 5, ','); g.ellipse(4, 3.5, 1.4, 1.4, ':'); g.stamp(4, 4, ['..j..', '.jkj.', 'jjkjj', '..b..']); g.pts([[3, 2], [8, 3], [6, 1], [9, 6]], 'Z'); g.rect(2, 10, 8, 3, 'c'); g.hl(2, 10, 8, 'd'); } },
  hourglass: { n: '沙漏', w: 10, h: 16, fam: 'figure', price: 35, draw(g) { g.rect(1, 0, 8, 2, 'c'); g.rect(1, 14, 8, 2, 'c'); for (let y = 2; y < 14; y++) { const hw = Math.max(1, Math.round(Math.abs(y - 8) * 0.6)); g.hl(5 - hw, y, hw * 2, ','); } for (let y = 10; y < 14; y++) { const hw = Math.max(1, Math.round(Math.abs(y - 8) * 0.6) - 1); g.hl(5 - hw, y, hw * 2, 'w'); } g.px(4, 8, 'w'); g.vl(1, 2, 12, 'b'); g.vl(8, 2, 12, 'b'); } },
  terrarium: { n: '玻璃生態瓶', w: 14, h: 14, fam: 'plant', price: 55, react: 'water', draw(g) { g.ellipse(7, 7, 6, 6, ','); g.ellipse(5, 4, 1.5, 1.5, ':'); g.rect(2, 9, 10, 3, 'c'); g.hl(2, 9, 10, 'd'); g.ellipse(5, 8, 2, 1.5, 'k'); g.stamp(8, 4, ['.j.', 'jkj', '.j.', '.i.']); g.px(10, 9, 'z'); } },
  crystal: { n: '水晶簇', w: 12, h: 12, fam: 'figure', price: 45, draw(g) { for (const [x, top, w] of [[2, 5, 2], [5, 1, 3], [8, 3, 2]]) { for (let y = top; y < 11; y++) g.hl(x, y, w, y === top ? 'B' : 'H'); g.vl(x, top + 1, 10 - top, 'G'); } g.hl(1, 10, 10, 'z'); g.px(6, 2, 'Z'); } },
  perfume: { n: '香水瓶', w: 8, h: 12, fam: 'figure', price: 30, draw(g) { g.rect(3, 0, 2, 2, 'v'); g.rect(1, 3, 6, 8, 't'); g.vl(1, 3, 8, 'Z'); g.hl(1, 10, 6, 's'); g.hl(2, 2, 4, 'w'); } },
  musicbox: { n: '音樂盒', w: 14, h: 12, fam: 'figure', price: 65, react: 'notes', music: true, draw(g) { g.rect(1, 1, 12, 3, 's'); g.hl(1, 1, 12, 't'); g.rect(1, 4, 12, 7, 'r'); g.hl(1, 4, 12, 'q'); g.rect(5, 6, 4, 3, 'w'); g.px(6, 7, 'x'); g.vl(13, 5, 3, 'w'); } },
  candle_jar: { n: '玻璃杯蠟燭', w: 8, h: 10, fam: 'figure', price: 25, light: L(4, 2, 20, 'warm', 0.7), toggle: true, flicker: true, draw(g) { g.rect(1, 3, 6, 6, ','); g.rect(2, 5, 4, 4, 'f'); g.vl(1, 3, 6, ':'); g.px(4, 4, 'Y'); } },
  diffuser: { n: '香氛水氧機', w: 10, h: 10, fam: 'figure', price: 70, steam: true, light: L(5, 4, 18, 'pink', 0.55), toggle: true, draw(g) { g.ellipse(5, 6, 4.5, 3.5, 'f'); g.ellipse(5, 4, 3.5, 2, 'Z'); g.hl(2, 8, 6, 'g'); g.px(5, 3, 'A'); } },
  books_tall: { n: '精裝書', w: 14, h: 14, fam: 'desk', price: 30, draw(g) { books(g, 1, 13, 13, 77, 13); } },
  globe_lamp: { n: '星空投影燈', w: 12, h: 14, fam: 'lamp', price: 90, light: L(6, 5, 36, 'cool', 0.7), toggle: true, twinkle: true, draw(g) { g.ellipse(6, 5, 5, 5, 'n'); for (const [x, y] of [[4, 3], [7, 2], [8, 6], [3, 6], [6, 8]]) g.px(x, y, 'x'); g.ellipse(4.5, 3.5, 1, 1, 'p'); g.rect(3, 10, 6, 3, 'y'); g.hl(3, 10, 6, 'z'); } },
  cushion_heart: { n: '愛心抱枕', w: 14, h: 12, fam: 'textile', price: 35, petSpot: { x: 7, y: 3 }, layer: 'floor', draw(g) { g.stamp(0, 0, ['..ss..ss..', '.sttsssss.', 'ssttsssssr', 'sssssssssr', '.sssssssr.', '..sssssr..', '...sssr...', '....sr....']); } },
  floor_pillow: { n: '大地墊', w: 24, h: 10, fam: 'textile', price: 45, petSpot: { x: 12, y: 3 }, layer: 'floor', draw(g) { g.ellipse(12, 5, 11.5, 4.5, 'n'); g.ellipse(12, 4, 10, 3, 'o'); for (let x = 3; x < 22; x += 4) g.px(x, 5, 'm'); g.ellipse(9, 3, 4, 1, 'p'); } },
  basket_laundry: { n: '洗衣籃', w: 18, h: 16, fam: 'storage', price: 40, layer: 'floor', petSpot: { x: 9, y: 4 }, draw(g) { g.rect(1, 3, 16, 12, 'd'); for (let y = 4; y < 15; y++) for (let x = 1; x < 17; x++) if ((x + y) % 3 === 0) g.px(x, y, 'c'); g.hl(1, 3, 16, 'e'); g.ellipse(7, 3, 4, 2, 'o'); g.ellipse(12, 2, 3, 1.5, 's'); } },
  coat_rack: { n: '衣帽架', w: 16, h: 44, fam: 'storage', price: 90, layer: 'floor', draw(g) { g.vl(7, 2, 38, 'c'); g.vl(8, 2, 38, 'b'); g.ellipse(7.5, 1.5, 1.5, 1.5, 'd'); for (const [x, y] of [[4, 5], [11, 5], [3, 9], [12, 9]]) line(g, 7.5, y + 2, x, y, 'c'); line(g, 7, 40, 2, 43, 'b'); line(g, 8, 40, 13, 43, 'b'); g.rect(1, 8, 6, 10, 'r'); g.hl(1, 8, 6, 's'); g.ellipse(12, 8, 3, 2, 'w'); g.hl(9, 9, 6, 'v'); } },
  umbrella: { n: '雨傘桶', w: 12, h: 26, fam: 'storage', price: 45, layer: 'floor', draw(g) { line(g, 4, 1, 4, 14, 'r'); line(g, 7, 3, 8, 14, 'n'); g.pts([[3, 0], [8, 2], [9, 3]], 'a'); g.rect(1, 13, 10, 12, 'z'); g.vl(1, 13, 12, 'A'); g.hl(1, 13, 10, 'B'); g.hl(1, 24, 10, 'y'); } },
  floor_mirror: { n: '全身鏡', w: 16, h: 44, fam: 'mirror', price: 120, layer: 'floor', draw(g) { g.rect(2, 1, 12, 39, 'c'); g.cut(2, 1, 12, 39, 2); g.rect(4, 3, 8, 35, ','); for (let i = 0; i < 6; i++) g.px(5 + i, 12 - i, ':'); for (let i = 0; i < 4; i++) g.px(6 + i, 20 - i, ':'); line(g, 3, 39, 1, 43, 'b'); line(g, 12, 39, 14, 43, 'b'); } },
};
// ===================================================== INTERACTIVE
const FUN = {
  gacha: { n: '扭蛋機', w: 18, h: 32, price: 220, layer: 'floor', act: 'gacha', draw(g) { g.ellipse(9, 8, 8, 7.5, ','); g.ellipse(6, 5, 2, 2, ':'); for (const [x, y, c] of [[5, 10, 'r'], [9, 11, 'w'], [12, 9, 'n'], [7, 7, 'k'], [11, 6, 'G'], [8, 13, 's']]) g.ellipse(x, y, 1.8, 1.8, c); g.rect(2, 15, 14, 15, 'r'); g.hl(2, 15, 14, 's'); g.vl(2, 15, 15, 's'); g.vl(15, 15, 15, 'q'); g.ellipse(9, 20, 2.5, 2.5, 'z'); g.hl(7, 20, 5, 'y'); g.rect(6, 24, 6, 4, 'Y'); g.rect(3, 30, 12, 2, 'q'); } },
  aquarium: { n: '大魚缸', w: 40, h: 34, price: 320, layer: 'floor', act: 'feedfish', surface: { x0: 3, x1: 36, y: 1 }, draw(g) { g.rect(1, 1, 38, 20, ','); g.rect(1, 1, 38, 2, 'y'); g.hl(1, 3, 38, ';'); g.rect(1, 17, 38, 4, 'h'); g.grain(1, 17, 38, 4, 'g', 'h', 0.3, 8); for (const x of [6, 9, 30]) leaf(g, x, 18, 9, -1.57 + (x % 3 - 1) * 0.2, 1.5, GREEN); g.ellipse(22, 17, 3, 2, 'z'); g.vl(1, 1, 20, ':'); g.rect(1, 21, 38, 12, 'c'); g.hl(1, 21, 38, 'd'); g.vl(20, 22, 11, 'b'); g.px(17, 27, 'a'); g.px(23, 27, 'a'); } },
  coffee_machine: { n: '咖啡機', w: 14, h: 16, price: 150, layer: 'decor', act: 'brew', steam: true, draw(g) { g.rect(1, 0, 12, 4, 'y'); g.hl(1, 0, 12, 'z'); g.rect(1, 4, 3, 10, 'y'); g.rect(10, 4, 3, 10, 'y'); g.rect(4, 4, 6, 2, 'Y'); g.vl(6, 6, 2, 'Y'); g.rect(4, 9, 5, 4, 'f'); g.px(9, 10, 'f'); g.hl(4, 9, 5, 'a'); g.rect(1, 14, 12, 2, 'z'); g.px(11, 2, 'r'); } },
  fridge: { n: '復古小冰箱', w: 22, h: 32, price: 240, layer: 'floor', act: 'fridge', surface: { x0: 2, x1: 19, y: 1 }, draw(g) { g.rect(1, 1, 20, 30, 'K'); g.cut(1, 1, 20, 30, 2); g.vl(1, 2, 28, 'l'); g.hl(2, 11, 18, 'J'); g.rect(16, 4, 2, 5, 'B'); g.rect(16, 14, 2, 8, 'B'); g.hl(4, 26, 14, 'J'); g.px(5, 3, 'Z'); } },
  piano: { n: '直立鋼琴', w: 40, h: 34, price: 380, layer: 'floor', act: 'piano', surface: { x0: 3, x1: 36, y: 1 }, draw(g) { g.rect(1, 1, 38, 18, 'a'); g.hl(1, 1, 38, 'b'); woodgrain(g, 2, 3, 36, 15, 'b', 'a', 4); g.rect(3, 6, 34, 6, '1'); g.rect(0, 19, 40, 5, 'Z'); for (let x = 2; x < 39; x += 3) g.vl(x, 19, 5, 'B'); for (let x = 3; x < 38; x += 3) if (x % 9 !== 0) g.rect(x, 19, 2, 3, 'Y'); g.rect(1, 24, 38, 8, 'a'); g.vl(3, 24, 9, 'b'); g.vl(36, 24, 9, 'b'); g.hl(12, 31, 16, 'w'); } },
  arcade: { n: '街機台', w: 22, h: 44, price: 360, layer: 'floor', act: 'arcade', light: L(11, 12, 34, 'cool', 0.8), toggle: true, on: true, draw(g) { g.rect(1, 1, 20, 42, 'F'); g.rect(1, 1, 20, 5, 'G'); g.hl(3, 3, 16, 'x'); g.rect(3, 8, 16, 12, 'Y'); g.rect(4, 9, 14, 10, 'm'); g.pts([[6, 12], [9, 15], [13, 11], [15, 16]], 'K'); g.rect(8, 13, 3, 3, 'w'); g.rect(1, 21, 20, 6, 'G'); g.pts([[5, 23], [5, 22]], 'Y'); g.pts([[12, 23], [15, 23], [18, 23]], 'r'); g.rect(4, 30, 14, 10, 'F'); g.rect(8, 33, 6, 3, 'Y'); g.vl(1, 6, 37, 'H'); } },
  disco: { n: '迪斯可球', w: 14, h: 20, price: 160, layer: 'wall', light: L(7, 13, 44, 'pink', 0.7), toggle: true, on: true, anim: 'disco', draw(g) { g.vl(7, 0, 6, 'z'); g.ellipse(7, 12, 6, 6, 'A'); for (let y = 6; y < 19; y++) for (let x = 1; x < 14; x++) if (g.get(x, y) === 'A' && (x + y) % 2) g.px(x, y, (x * y) % 5 ? 'B' : 'Z'); } },
  chime: { n: '風鈴', w: 12, h: 22, price: 70, layer: 'wall', react: 'notes', anim: 'sway', draw(g) { g.vl(6, 0, 3, 'z'); g.ellipse(6, 5, 4, 3, ','); for (let y = 3; y < 9; y++) g.hl(1, y, 10, y < 5 ? '.' : g.get(6, y)); g.ellipse(6, 5, 4, 2.4, ','); g.hl(2, 7, 8, 'n'); g.vl(6, 8, 6, 'z'); g.rect(4, 14, 4, 7, 'f'); g.pts([[5, 16], [6, 18]], 'r'); } },
  cuckoo: { n: '布穀鳥鐘', w: 20, h: 30, price: 180, layer: 'wall', act: 'cuckoo', clock: { cx: 10, cy: 13 }, draw(g) { for (let r = 0; r < 6; r++) g.hl(10 - r - 4, r, (r + 4) * 2, 'a'); g.rect(2, 6, 16, 16, 'c'); g.hl(2, 6, 16, 'd'); g.ellipse(10, 13, 5, 5, 'f'); g.rect(8, 2, 4, 3, 'Y'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.px(Math.round(10 + Math.sin(a) * 4), Math.round(13 - Math.cos(a) * 4), 'h'); } g.vl(7, 22, 6, 'y'); g.vl(12, 22, 4, 'y'); g.ellipse(7, 28, 1.5, 1.5, 'v'); g.ellipse(12, 26, 1.5, 1.5, 'v'); leaf(g, 4, 9, 4, -2.2, 1, GREEN); leaf(g, 16, 9, 4, -0.9, 1, GREEN); } },
  fountain: { n: '桌上流水', w: 16, h: 14, price: 90, layer: 'decor', anim: 'fountain', react: 'bubbles', draw(g) { g.ellipse(8, 11, 7.5, 2.5, 'z'); g.ellipse(8, 10.5, 6.5, 1.6, 'o'); g.rect(6, 4, 4, 6, 'A'); g.hl(6, 4, 4, 'B'); g.ellipse(8, 3.5, 3, 1.2, 'z'); g.px(4, 9, 'j'); g.px(12, 9, 'k'); } },
  word_shelf: { n: '單字書牆', w: 34, h: 44, price: 260, layer: 'floor', act: 'word', surface: { x0: 2, x1: 31, y: 1 }, draw(g) { g.rect(1, 1, 32, 42, 'c'); g.hl(1, 1, 32, 'd'); for (const y of [12, 22, 32]) { g.hl(2, y, 30, 'b'); g.hl(2, y + 1, 30, 'd'); } for (const [y, s] of [[11, 2], [21, 5], [31, 8], [41, 11]]) books(g, 3, 31, y, s, 9); g.vl(1, 1, 42, 'd'); g.vl(32, 1, 42, 'b'); } },
};

// ---------- animation hooks (called by Room.drawItem after the sprite) ----------
const FUN_ANIM = {
  disco(c, x, y, it, t, cv) { if (!it.on) return; const cols = ['#ffe07a', '#ee8fa0', '#84cbbd', '#b496dc']; for (let i = 0; i < 5; i++) { const a = t * 1.3 + i * 1.256 + it.uid, r = 10 + (i % 3) * 7; c.fillStyle = cols[i % 4]; c.globalAlpha = 0.55 + Math.sin(t * 5 + i) * 0.3; c.fillRect(Math.round(x + 7 + Math.cos(a) * r), Math.round(y + 12 + Math.sin(a) * r * 0.6 + 6), 1, 1); } c.globalAlpha = 1; },
  sway(c, x, y, it, t) { const k = Math.round(Math.sin(t * 1.6 + it.uid) * 1); if (k) { c.fillStyle = '#fff4e0'; c.fillRect(x + 4 + k, y + 21, 4, 1); } },
  fountain(c, x, y, it, t) { c.fillStyle = '#bcd8f2'; for (let i = 0; i < 3; i++) { const p = (t * 1.5 + i / 3) % 1; c.fillRect(Math.round(x + 8 + (i - 1) * 3 * p), Math.round(y + 3 + p * p * 7 - p * 3), 1, 1); } },
  aquarium(c, x, y, it, t, cv) {
    const fish = [['#e8973d', 0.7, 6], ['#ee8fa0', 0.5, 10], ['#f6c75a', 0.9, 13]];
    fish.forEach(([col, sp, fy], i) => { const p = (Math.sin(t * sp + it.uid + i * 2) + 1) / 2, fx = Math.round(x + 4 + p * 30), dir = Math.cos(t * sp + it.uid + i * 2) > 0; c.fillStyle = col; c.fillRect(fx, y + fy, 3, 2); c.fillRect(dir ? fx - 1 : fx + 3, y + fy, 1, 2); c.fillStyle = '#2e2230'; c.fillRect(dir ? fx + 2 : fx, y + fy, 1, 1); });
    if (Math.random() < 0.04) Room.puff('p_bubble', x + 6 + Math.random() * 28, y + 15, { vy: -5, wob: 4, max: 1.4, alpha: 0.7 });
  },
};

(function registerDecor() {
  let seed = 100;
  for (const ak in ART) {
    for (const fk of Object.keys(FRAMES)) { const spr = `art_${ak}_${fk}`; SPR.def(spr, artSprite(ak, fk, false)); gdef(spr, { n: `${ART[ak].n}（${FRAMES[fk].n}）`, cat: 'wall', fam: 'art', spr, price: 70 + (fk === 'gold' ? 30 : 0), layer: 'wall' }); }
    const spr = `poster_${ak}`; SPR.def(spr, artSprite(ak, 'wood', true)); gdef(spr, { n: `${ART[ak].n}海報`, cat: 'wall', fam: 'art', spr, price: 35, layer: 'wall' });
  }
  const MIRRORS = { round: [16, 16], arch: [14, 22], rect: [12, 20], sun: [20, 20] };
  for (const mk in MIRRORS) for (const fk of ['wood', 'gold']) {
    const [w, h] = MIRRORS[mk], F = FRAMES[fk], spr = `mr_${mk}_${fk}`;
    SPR.def(spr, G(w, h, g => {
      const inside = (x, y, m) => mk === 'round' || mk === 'sun' ? ((x + 0.5 - w / 2) / (w / 2 - m)) ** 2 + ((y + 0.5 - h / 2) / (h / 2 - m)) ** 2 <= 1 : mk === 'arch' ? (y > w / 2 ? x >= m && x < w - m && y < h - m : ((x + 0.5 - w / 2) / (w / 2 - m)) ** 2 + ((y + 0.5 - w / 2) / (w / 2 - m)) ** 2 <= 1) : x >= m && y >= m && x < w - m && y < h - m;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (mk === 'sun' && !inside(x, y, 3) && inside(x, y, 0) && Math.floor(Math.atan2(y - h / 2, x - w / 2) * 4) % 2) { g.px(x, y, F.c[0]); continue; } if (inside(x, y, mk === 'sun' ? 3.5 : 1)) g.px(x, y, inside(x, y, mk === 'sun' ? 5 : 2.5) ? ',' : F.c[1]); }
      for (let i = 0; i < 5; i++) if (g.get(Math.floor(w / 2) - 2 + i, Math.floor(h / 2) - i) === ',') g.px(Math.floor(w / 2) - 2 + i, Math.floor(h / 2) - i, ':');
    }));
    gdef(spr, { n: `${{ round: '圓鏡', arch: '拱形鏡', rect: '方鏡', sun: '太陽鏡' }[mk]}（${F.n}）`, cat: 'wall', fam: 'mirror', spr, price: 80, layer: 'wall' });
  }
  for (const [ck, fc, n] of [['wood', ['d', 'c', 'b'], '木頭'], ['white', ['Z', 'B', 'A'], '白色'], ['black', ['z', 'y', 'Y'], '黑色'], ['pink', ['t', 's', 'r'], '粉紅'], ['mint', ['l', 'k', 'j'], '薄荷']]) {
    const spr = `clk_${ck}`; SPR.def(spr, G(17, 17, g => { g.ellipse(8.5, 8.5, 8, 8, fc[1]); g.ellipse(8.5, 8.5, 6.4, 6.4, 'f'); g.ellipse(7, 6.5, 2, 1.5, 'Z'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.px(Math.round(8.5 + Math.sin(a) * 5.4 - 0.5), Math.round(8.5 - Math.cos(a) * 5.4 - 0.5), i % 3 ? 'h' : 'a'); } g.hl(3, 15, 11, fc[2]); }));
    gdef(spr, { n: `${n}掛鐘`, cat: 'wall', fam: 'clock', spr, price: 50, layer: 'wall', clock: { cx: 8, cy: 8 }, react: 'time' });
  }
  for (const [sk, n, draw] of [['plank', '木板層架', (g) => { g.rect(0, 2, 30, 3, 'd'); g.hl(0, 2, 30, 'e'); g.hl(0, 4, 30, 'b'); }], ['bracket', '鐵架層板', (g) => { g.rect(0, 2, 30, 3, 'd'); g.hl(0, 2, 30, 'e'); for (const x of [3, 25]) { g.vl(x, 5, 6, 'y'); line(g, x, 10, x + (x < 15 ? 4 : -4), 5, 'y'); } }], ['double', '雙層架', (g) => { for (const y of [2, 13]) { g.rect(0, y, 30, 3, 'd'); g.hl(0, y, 30, 'e'); g.hl(0, y + 2, 30, 'b'); } g.vl(1, 5, 8, 'c'); g.vl(28, 5, 8, 'c'); books(g, 3, 14, 12, 3, 7); }]]) {
    const spr = `ws_${sk}`, H = sk === 'double' ? 17 : sk === 'bracket' ? 12 : 6; SPR.def(spr, G(30, H, draw));
    for (const wk of ['oak', 'walnut', 'white', 'black']) gdef(`${spr}_${wk}`, { n: `${WOOD[wk][1]}${n}`, cat: 'wall', fam: 'shelf', spr, map: WOOD[wk][0], price: 60, layer: 'wall', surface: { x0: 1, x1: 28, y: 2 } });
  }
  // figurines (ceramic) and plush
  const FIG_COL = [['snow', '白瓷', 'r'], ['sky', '藍釉', 'w'], ['rose2', '粉釉', 'w'], ['mustard', '金', 'r']];
  for (const ak in ANIMALS) {
    for (const [rk, rn, acc] of FIG_COL.slice(0, ak === 'panda' ? 1 : 3)) { const spr = `fig_${ak}_${rk}`; SPR.def(spr, animalSprite(ANIMALS[ak], RAMP[rk], ak === 'panda' ? 'Y' : acc, false)); gdef(spr, { n: `${rn}${ANIMAL_N[ak]}擺飾`, cat: 'decor', fam: 'figure', spr, price: 35, layer: 'decor', react: 'hearts' }); }
    const PL = { cat: [['peach', '橘'], ['grey', '灰'], ['snow', '白']], bunny: [['snow', '白'], ['rose2', '粉'], ['choco', '可可']], bear: [['choco', '棕'], ['peach', '蜜桃'], ['snow', '白']], duck: [['sun', '黃']], frog: [['green', '綠']], owl: [['clay', '咖啡']], penguin: [['ink', '黑']], whale: [['sky', '藍'], ['aqua', '水藍']], dino: [['green', '綠'], ['lilac', '紫'], ['rose2', '粉']], fox: [['peach', '橘']], panda: [['snow', '']], chick: [['sun', '黃']] }[ak];
    for (const [rk, n] of PL) { const spr = `plush_${ak}_${rk}`; SPR.def(spr, animalSprite(ANIMALS[ak], RAMP[rk], ak === 'panda' ? 'Y' : ak === 'penguin' ? 'w' : ak === 'duck' || ak === 'chick' ? 'v' : 's', true)); gdef(spr, { n: `${n}${ANIMAL_N[ak]}玩偶`, cat: 'decor', fam: 'plush', spr, price: 45, layer: 'decor', react: 'hearts' }); }
  }
  for (const k in SMALL) { const S = SMALL[k], spr = `sm_${k}`; SPR.def(spr, G(S.w, S.h, S.draw)); const props = Object.assign({}, S); delete props.draw; delete props.w; delete props.h; delete props.n; delete props.fam; gdef(spr, Object.assign({ n: S.n, cat: S.layer === 'floor' ? 'furniture' : 'decor', fam: S.fam, spr, layer: 'decor' }, props)); }
  for (const k in FUN) { const F = FUN[k], spr = `fun_${k}`; SPR.def(spr, G(F.w, F.h, F.draw)); const props = Object.assign({}, F); delete props.draw; delete props.w; delete props.h; delete props.n; if (typeof props.anim === 'string') props.anim = FUN_ANIM[props.anim]; gdef(spr, Object.assign({ n: F.n, cat: F.layer === 'wall' ? 'wall' : F.layer === 'decor' ? 'decor' : 'furniture', fam: 'fun', spr, fun: true }, props)); }
  ITEMS.fun_aquarium.anim = FUN_ANIM.aquarium; ITEMS.fun_word_shelf.react = 'word';
  for (const id in ITEMS) if (ITEMS[id].cat === 'plant' && ITEMS[id].react === 'rustle') ITEMS[id].react = 'water';

  // ---------- automatic colourways of the original furniture ----------
  const RAMPS_CHECK = ['blue', 'pink', 'green', 'sun', 'lilac', 'teal', 'clay'];
  const woodKeys = new Set(['a', 'b', 'c', 'd', 'e']);
  const base = Object.keys(ITEMS).filter(id => { const d = ITEMS[id]; return !d.fam && !d.map && !d.special && !d.giftOnly && !d.window && !d.bowl; });
  for (const id of base) {
    const d = ITEMS[id]; let g; try { g = SPR.grid(d.spr); } catch (e) { continue; }
    const cnt = {}; let tot = 0; for (const row of g.a) for (const c of row) if (c !== '.' && c !== '0') { cnt[c] = (cnt[c] || 0) + 1; tot++; }
    if (!tot) continue;
    let best = null, bestN = 0; for (const rk of RAMPS_CHECK) { const n = RAMP[rk].reduce((s, c) => s + (cnt[c] || 0), 0); if (n > bestN) { bestN = n; best = rk; } }
    const woodN = [...woodKeys].reduce((s, c) => s + (cnt[c] || 0), 0);
    d.fam = d.fam || ({ furniture: d.seat || d.chair ? 'seat' : d.bed ? 'bed' : d.surface ? 'storage' : d.light ? 'lamp' : 'misc', decor: d.light ? 'lamp' : 'desk', plant: 'plant', wall: 'art', rug: 'rug' }[d.cat] || 'misc');
    const extra = { onSpr: d.onSpr };
    const noTint = best === 'green' || d.cat === 'plant' || d.screen || d.tv || d.fire || ['globe', 'xmas_tree', 'snowman'].includes(id);
    if (best && !noTint && bestN / tot >= 0.22) {
      const targets = ['pink', 'green', 'sun', 'lilac', 'navy', 'mustard', 'coral', 'grey', 'berry', 'aqua'].filter(t => t !== best && !(best === 'blue' && t === 'navy' && false));
      for (const t of targets.slice(0, d.cat === 'rug' ? 6 : 5)) gdef(`${id}__${t}`, Object.assign({}, d, { id: `${id}__${t}`, n: `${d.n}・${CW[t]}`, map: rampMap(best, t), fam: d.fam, price: d.price + 10 }, extra));
    } else if (woodN / tot >= 0.35) {
      for (const wk of ['walnut', 'white', 'black', 'pink']) gdef(`${id}__${wk}`, Object.assign({}, d, { id: `${id}__${wk}`, n: `${d.n}・${WOOD[wk][1]}`, map: WOOD[wk][0], fam: d.fam, price: d.price + 10 }, extra));
    }
  }
})();

// ===================================================== INTERACTIONS (once-a-day rewards are kept in S.life.fun)
const Fun = {
  day() { const L = Game.S.life, d = Life.today(); if (!L.fun || L.fun.day !== d) L.fun = { day: d, used: {}, water: 0, best: (L.fun && L.fun.best) || 0 }; return L.fun; },
  once(key) { const F = this.day(); if (F.used[key]) return false; F.used[key] = 1; return true; },
  water(it, d, cx) {
    const F = this.day();
    for (let i = 0; i < 3; i++) Room.puff(i ? 'p_leaf' : 'p_bubble', cx + (Math.random() - 0.5) * 8, it.y + 4, { vx: (Math.random() - 0.5) * 10, vy: -6, grav: 10, wob: 6, max: 1.3 });
    if (this.once('w' + it.uid) && F.water < 10) { F.water++; Game.reward(2, 1, 'raw'); Game.bubbleAt(cx, it.y, `澆水 +2 金幣（今天 ${F.water}/10）`); Game.save(); }
    else Game.bubbleAt(cx, it.y, '今天澆過水了');
  },
  word(it, d, cx) {
    const seen = Object.keys(Game.S.vocab || {}), w = seen.length && Math.random() < 0.7 ? seen[Math.floor(Math.random() * seen.length)] : VOCAB[Math.floor(Math.random() * VOCAB.length)].w;
    const v = VOCAB[VIDX[w]]; if (!v) return; Learn.speak(v.w);
    Game.bubbleAt(cx, it.y, `${v.w}  ${v.z.split('；')[0]}`, 3.5);
    if (this.once('word')) { Game.reward(3, 3, 'raw'); }
  },
  gacha(it, d, cx) {
    const S = Game.S, cost = 20;
    if (S.coins < cost) return Game.bubbleAt(cx, it.y, `扭一次要 ${cost} 金幣`);
    const pool = Object.values(ITEMS).filter(x => !x.special && !x.giftOnly && !x.fun && (x.layer === 'decor' || x.layer === 'wall') && x.price <= 120 && x.lvl <= S.lvl + 3);
    const got = pool[Math.floor(Math.random() * pool.length)]; if (!got) return;
    S.coins -= cost; S.inv[got.id] = (S.inv[got.id] || 0) + 1; Life.track('buy', 1, { kind: 'gacha', id: got.id });
    for (let i = 0; i < 4; i++) Room.puff('p_spark', cx - 4 + i * 3, it.y + 18, { vy: -8 - i, max: 0.9 });
    UI.toast(`扭到了「${got.n}」！放在收納箱`, 'i_box', 3.5, { label: '馬上擺放', fn: () => Game.place(got.id) }); UI.hud(true); UI.refresh('storage'); Game.save(); saveSoon();
  },
  feedfish(it, d, cx) {
    for (let i = 0; i < 4; i++) Room.puff('p_dot', cx - 10 + Math.random() * 20, it.y + 3, { vy: 3, grav: 4, max: 1.4 });
    if (this.once('fish' + it.uid)) { Game.reward(4, 3, 'raw'); Game.bubbleAt(cx, it.y, '魚兒吃飽了 +4 金幣'); Game.save(); } else Game.bubbleAt(cx, it.y, '魚兒今天吃過了');
  },
  brew(it, d, cx) {
    for (let i = 0; i < 3; i++) Room.puff('p_steam', cx - 1, it.y - 2, { vy: -6 - i * 2, max: 1.4, alpha: 0.7 });
    if (this.once('brew')) { Life.give('coffee', 1); UI.toast('泡了一杯咖啡，放進道具', 'it_coffee', 3); Game.save(); } else Game.bubbleAt(cx, it.y, '今天的咖啡已經泡好了');
  },
  fridge(it, d, cx) {
    if (this.once('fridge')) { const k = Math.random() < 0.5 ? 'onigiri' : 'fish_snack'; Life.give(k, 1); UI.toast(`冰箱裡有${SUPPLIES[k].n}，拿了一個`, SUPPLIES[k].spr, 3); Game.save(); } else Game.bubbleAt(cx, it.y, '冰箱空空的，明天再看看');
  },
  piano(it, d, cx) {
    for (let i = 0; i < 4; i++) Room.puff('p_note', cx - 8 + i * 5, it.y - 2, { vx: (i - 1.5) * 5, vy: -10 - i, wob: 10, max: 2 });
    const tunes = ['Do Re Mi ♪', '小星星 ♪', '月光 ♪', '給愛麗絲 ♪', '生日快樂 ♪']; Game.bubbleAt(cx, it.y, tunes[Math.floor(Math.random() * tunes.length)]);
    if (Game.avatar) Game.avatar.happy = 1.5; if (this.once('piano')) Game.reward(3, 3, 'raw');
  },
  arcade(it, d, cx) {
    const F = this.day(), sc = 100 * (1 + Math.floor(Math.random() * 99));
    let msg = `得分 ${sc}！`; if (sc > (F.best || 0)) { F.best = sc; msg += ' 新紀錄'; if (this.once('arcade')) { Game.reward(5, 5, 'raw'); msg += ' +5 金幣'; } }
    Game.bubbleAt(cx, it.y, msg); Room.puff('p_spark', cx, it.y + 10, { vy: -8 }); Game.save();
  },
  cuckoo(it, d, cx) { const n = new Date(); Game.bubbleAt(cx, it.y, `咕咕！現在 ${n.getHours()} 點 ${String(n.getMinutes()).padStart(2, '0')} 分`); },
};
