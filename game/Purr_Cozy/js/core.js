/* ============================================================
   Pixel core: palette, PNG layer composition and sprite registry
   Runtime artwork is loaded from assets/png by png-registry.js.
   ============================================================ */
const PAL = {
  '0': '#2e2230', '1': '#4a3540',
  // wood
  'a': '#5e3b2f', 'b': '#8b5a3c', 'c': '#b5794b', 'd': '#dba06a', 'e': '#f0c896',
  // cream
  'f': '#fff4e0', 'g': '#efdcc0', 'h': '#d4bc9c',
  // green
  'i': '#2f5a3d', 'j': '#4c8a4f', 'k': '#7fbf6a', 'l': '#b8e08a',
  // blue
  'm': '#2c3a63', 'n': '#4a6aa8', 'o': '#7ea6dc', 'p': '#bcd8f2',
  // pink / red
  'q': '#7a3045', 'r': '#c4566e', 's': '#ee8fa0', 't': '#f9c6cd',
  // orange / yellow
  'u': '#b86a2a', 'v': '#e8973d', 'w': '#f6c75a', 'x': '#fdeaa0',
  // lilac greys
  'y': '#4b4560', 'z': '#77708f', 'A': '#aaa3be', 'B': '#dcd6e8',
  // skin
  'C': '#f6cfae', 'D': '#e2a789', 'E': '#b97a62',
  // purple
  'F': '#4b3470', 'G': '#7a5aa8', 'H': '#b496dc',
  // teal
  'I': '#245a5c', 'J': '#3f8f8a', 'K': '#84cbbd',
  // terracotta
  'L': '#8f4230', 'M': '#c46a48', 'N': '#e59a72',
  // hair (recolourable)
  'O': '#3d2620', 'P': '#6b4030', 'Q': '#96603f',
  // shirt (recolourable)
  'R': '#3c5a8c', 'S': '#5f86c0', 'T': '#93b6e0',
  // pants
  'U': '#3a3550', 'V': '#575070',
  // glow
  'W': '#fff7c2', 'X': '#ffe07a',
  'Y': '#1a1420', 'Z': '#ffffff',
  // translucent glass / water
  ',': 'rgba(188,216,242,0.45)', ';': 'rgba(126,166,220,0.55)', ':': 'rgba(255,255,255,0.7)',
};
const PAL_RGBA = {};
(function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  for (const k in PAL) {
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = PAL[k]; cx.fillRect(0, 0, 1, 1);
    PAL_RGBA[k] = Array.from(cx.getImageData(0, 0, 1, 1).data);
  }
})();

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// reverse palette lookup for PNG sprites; unknown colours get their own private keys
const PAL_KEY = {}; let PAL_EXTRA = 0;
function palKeyFor(r, g, b, a) {
  if (a === 0) return '.';
  const exact = r + ',' + g + ',' + b + ',' + a; if (PAL_KEY[exact]) return PAL_KEY[exact];
  let best = null, bd = 1e9;
  for (const k in PAL_RGBA) { const c = PAL_RGBA[k]; const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2 + ((c[3] - a) * 1.5) ** 2; if (d < bd) { bd = d; best = k; } }
  if (best && bd <= (a < 255 ? 900 : 12)) return PAL_KEY[exact] = best;
  const k = String.fromCharCode(0xE000 + (PAL_EXTRA++));
  PAL[k] = `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`; PAL_RGBA[k] = [r, g, b, a];
  return PAL_KEY[exact] = k;
}
class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.a = []; for (let y = 0; y < h; y++) this.a.push(new Array(w).fill('.')); }
  static rows(rows) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const g = new Grid(w, h);
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== ' ') g.a[y][x] = r[x]; });
    return g;
  }
  static fromImage(img) {
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth || img.width; cv.height = img.naturalHeight || img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data, g = new Grid(cv.width, cv.height);
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const o = (y * cv.width + x) * 4; g.a[y][x] = palKeyFor(d[o], d[o + 1], d[o + 2], d[o + 3]); }
    return g;
  }
  get(x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.a[y][x] : '.'; }
  px(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[y][x] = c; return this; }
  pts(list, c) { for (const [x, y] of list) this.px(x, y, c); return this; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); return this; }
  hl(x, y, l, c) { return this.rect(x, y, l, 1, c); }
  vl(x, y, l, c) { return this.rect(x, y, 1, l, c); }
  // stamp rows: ' ' and '.' skip, '_' clears
  stamp(x, y, rows) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = r[i]; if (c === ' ' || c === '.') continue; this.px(x + i, y + j, c === '_' ? '.' : c); } });
    return this;
  }
  cut(x, y, w, h, r = 1) { // round corners of a rect
    const k = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    for (const [i, j] of k) this.px(x + i, y + j, '.');
    if (r > 1) { this.px(x + 1, y, '.'); this.px(x, y + 1, '.'); this.px(x + w - 2, y, '.'); this.px(x + w - 1, y + 1, '.');
      this.px(x + 1, y + h - 1, '.'); this.px(x, y + h - 2, '.'); this.px(x + w - 2, y + h - 1, '.'); this.px(x + w - 1, y + h - 2, '.'); }
    return this;
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.px(x, y, c);
    }
    return this;
  }
  replace(from, to, x = 0, y = 0, w = this.w, h = this.h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.get(i, j) === from) this.px(i, j, to);
    return this;
  }
  // sprinkle pixels of colour c on cells currently equal to `on`
  grain(x, y, w, h, c, on, density, seed) {
    const r = rng(seed);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.get(i, j) === on && r() < density) this.px(i, j, c);
    return this;
  }
  dither(x, y, w, h, c, on) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (((i + j) & 1) === 0 && (on == null || this.get(i, j) === on)) this.px(i, j, c);
    return this;
  }
  outline(c = '0', diag = false) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.a[y][x] !== '.') continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      if (diag) n.push([1, 1], [-1, 1], [1, -1], [-1, -1]);
      for (const [dx, dy] of n) { const v = this.get(x + dx, y + dy); if (v !== '.' && v !== c) { add.push([x, y]); break; } }
    }
    for (const [x, y] of add) this.a[y][x] = c;
    return this;
  }
  // grow canvas by p pixels each side (for outlines)
  pad(p = 1) {
    const g = new Grid(this.w + 2 * p, this.h + 2 * p);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.a[y + p][x + p] = this.a[y][x];
    return g;
  }
  clone() { const g = new Grid(this.w, this.h); g.a = this.a.map(r => r.slice()); return g; }
  flip() { const g = this.clone(); g.a = g.a.map(r => r.reverse()); return g; }
  recolor(map) { const g = this.clone(); if (!map) return g; g.a = g.a.map(r => r.map(c => map[c] || c)); return g; }
  paste(g, x, y) { for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const c = g.a[j][i]; if (c !== '.') this.px(x + i, y + j, c); } return this; }
  toCanvas() {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    const cx = cv.getContext('2d'); const im = cx.createImageData(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.a[y][x]; if (c === '.') continue; const col = PAL_RGBA[c];
      if (!col) { console.warn('bad colour', c); continue; }
      const o = (y * this.w + x) * 4; im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = col[3];
    }
    cx.putImageData(im, 0, 0);
    cv.alpha = im.data; // keep for hit testing
    return cv;
  }
}

// colour ramps used for recolouring variants
const RAMP = {
  blue: ['m', 'n', 'o', 'p'], pink: ['q', 'r', 's', 't'], green: ['i', 'j', 'k', 'l'],
  sun: ['u', 'v', 'w', 'x'], lilac: ['F', 'G', 'H', 'B'], teal: ['I', 'J', 'K', 'p'],
  clay: ['L', 'M', 'N', 'g'], grey: ['y', 'z', 'A', 'B'], cream: ['b', 'h', 'g', 'f'],
};
function rampMap(from, to) { const m = {}; RAMP[from].forEach((c, i) => { m[c] = RAMP[to][i]; }); return m; }

const SPR = {
  defs: {}, cache: {},
  def(name, fn) { this.defs[name] = fn; },
  grid(name) {
    const d = this.defs[name]; if (!d) throw new Error('no sprite ' + name);
    if (!d._g) d._g = typeof d === 'function' ? d() : d;
    return d._g;
  },
  // key = name|variantKey|flip
  override(name, grid) {
    this.defs[name] = grid; grid._g = grid;
    for (const k in this.cache) if (k.startsWith(name + '|')) delete this.cache[k];
  },
  get(name, map, flip, mapKey) {
    const k = name + '|' + (mapKey || (map ? JSON.stringify(map) : '')) + '|' + (flip ? 1 : 0);
    let c = this.cache[k];
    if (!c) { let g = this.grid(name); if (map) g = g.recolor(map); if (flip) g = g.flip(); c = this.cache[k] = g.toCanvas(); }
    return c;
  },
};
function hitAlpha(cv, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return false;
  return cv.alpha[(y * cv.width + x) * 4 + 3] > 0;
}
// in-game "today" (developer mode can shift days forward)
// the game day starts at 06:00 device time and the game week on Monday 06:00
const DAY_START_HOUR = 6;
function gameDate(offsetDays = 0) { return new Date(Date.now() - DAY_START_HOUR * 3600e3 + ((window.NOOK_DAY_SHIFT || 0) + offsetDays) * 86400000); }
// week id = the game date of that week's Monday, e.g. 'w2026-10-19'
function weekKey(offsetWeeks = 0) { const d = gameDate(offsetWeeks * 7); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return 'w' + dayKey(d); }
// real time when the current game week started / ends
function weekStart() { const d = gameDate(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return new Date(d.getTime() + DAY_START_HOUR * 3600e3 - (window.NOOK_DAY_SHIFT || 0) * 86400000); }
function weekEnd() { return new Date(weekStart().getTime() + 7 * 86400000); }
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
// ask the cloud layer to write soon (rewards, purchases, quiz results); routine saves are batched
function saveSoon() { if (typeof Cloud !== 'undefined' && Cloud.soon) Cloud.soon(); }
// extra palette entries (private-use characters so they never clash with the hand-picked keys)
const PAL_EXTRA_KEYS = {};
let _palNext = 0xE200;
function palAdd(hex) {
  hex = hex.toLowerCase(); if (PAL_EXTRA_KEYS[hex]) return PAL_EXTRA_KEYS[hex];
  for (const k in PAL) if (PAL[k].toLowerCase && PAL[k].toLowerCase() === hex) return (PAL_EXTRA_KEYS[hex] = k);
  const k = String.fromCharCode(_palNext++); PAL[k] = hex;
  const n = parseInt(hex.slice(1), 16); PAL_RGBA[k] = [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  return (PAL_EXTRA_KEYS[hex] = k);
}
// a four-step ramp (dark → light) usable with rampMap(from, name)
function rampAdd(name, hexes) { RAMP[name] = hexes.map(h => h[0] === '#' ? palAdd(h) : h); return RAMP[name]; }
rampAdd('navy', ['#1f2b4d', '#2f3f6e', '#4a5f96', '#7d90c4']);
rampAdd('mustard', ['#8a6418', '#b8892a', '#dcae45', '#f0d07a']);
rampAdd('coral', ['#9c3b34', '#d4594d', '#ee8071', '#f8b1a5']);
rampAdd('olive', ['#4a5229', '#6b7638', '#8f9b4f', '#b9c47d']);
rampAdd('ink', ['#1a1420', '#2e2a36', '#45404f', '#625c6e']);
rampAdd('snow', ['#b7b3ad', '#d4d0ca', '#ece9e4', '#ffffff']);
rampAdd('peach', ['#b8664a', '#e08c6c', '#f4b394', '#fbd8c4']);
rampAdd('aqua', ['#1f6f78', '#2f9aa3', '#5cc4c4', '#a2e3df']);
rampAdd('berry', ['#5a1f3b', '#8a3459', '#b85582', '#e08fb2']);
rampAdd('choco', ['#3d261d', '#5e3b2f', '#7d5240', '#a3735a']);
rampAdd('sky', ['#3c6fa6', '#5c95cf', '#8bbbe8', '#c3dcf5']);
rampAdd('rose2', ['#7a2e3f', '#a8455a', '#d36f86', '#f2a7b7']);

// has the player touched the page yet? (sound may only start after that)
let NOOK_TOUCHED = false;
function nookTouched() { try { if (navigator.userActivation && navigator.userActivation.hasBeenActive) return true; } catch (e) { } return NOOK_TOUCHED; }
for (const ev of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(ev, () => { NOOK_TOUCHED = true; }, { capture: true, once: true, passive: true });
