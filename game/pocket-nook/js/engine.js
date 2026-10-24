/* ============================================================
   Room engine: diorama, textures, sky, lighting, items, particles
   ============================================================ */
const RW = 240, RH = 180;
const R = { wx0: 30, wx1: 210, wy0: 12, wy1: 96, fy1: 170, fxf0: 6, fxf1: 234 };
function floorX(y) { const t = (y - 96) / 74; return [30 + (6 - 30) * t, 210 + (234 - 210) * t]; }
const HEX = {};
function rgb(h) { let c = HEX[h]; if (!c) { c = HEX[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; } return c; }
function hsh(a, b, c = 0) { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0); }

// ---------- wallpapers: (x,y) in back-wall space (0..180, 0..84) → hex ----------
const WALL = {
  cream_stripe(x, y) { const m = ((x % 14) + 14) % 14; if (m >= 9 && m <= 11) return (y % 6 === 0 && m === 10) ? '#f6d8a0' : '#f4dcc0'; if (m === 8 || m === 12) return '#f8e6cf'; return '#fcf1df'; },
  mint_dot(x, y) { const r = Math.floor(y / 9), o = (r % 2) * 5, dx = (((x + o) % 10) + 10) % 10, dy = y % 9; if ((dx === 4 || dx === 5) && (dy === 4 || dy === 5)) return (dx === 4 && dy === 4) ? '#ffffff' : '#eaf8f2'; return '#aedccd'; },
  lilac_check(x, y) { const a = (((x % 10) + 10) % 10) < 4, b = (y % 10) < 4; if (a && b) return '#c9b8e4'; if (a || b) return '#e0d6f0'; return '#f4f0fa'; },
  rose_floral(x, y) {
    const cx = ((x % 16) + 16) % 16, cy = (y + (Math.floor((x + 160) / 16) % 2) * 8) % 16;
    const f = ['.....', '..p..', '.pcp.', '..p..', '.l.l.'];
    if (cx >= 5 && cx < 10 && cy >= 5 && cy < 10) { const c = f[cy - 5][cx - 5]; if (c === 'p') return '#ee9aaa'; if (c === 'c') return '#fff3df'; if (c === 'l') return '#93bf82'; }
    return (cx + cy) % 7 === 0 && cy > 12 ? '#f5d3d7' : '#f9e2e4';
  },
  sage_panel(x, y) {
    if (y > 52) { const px = ((x % 30) + 30) % 30; if (y === 53) return '#ffffff'; if (y === 54) return '#dde5cf'; if (y === 55) return '#f3f6ea';
      if (px === 0 || px === 1) return '#dbe3cb'; if (y === 58 || y === 79) return '#d0dabd'; if (px === 3 || px === 27) return (y > 58 && y < 79) ? '#d6dfc5' : '#eef2e3'; return '#eef2e3'; }
    return (hsh(x, y) % 9 === 0) ? '#b8cfa3' : '#c0d6ac';
  },
  night_star(x, y) { const h = hsh(x + 500, y + 7); if (h % 211 === 0) return '#fff3b8'; if (h % 307 === 0) return '#a9bdf0'; if ((x + y) % 2 === 0 && h % 5 === 0) return '#343e74'; return '#2f3769'; },
  peach_heart(x, y) {
    const cx = ((x % 14) + 14) % 14, cy = (y + (Math.floor((x + 140) / 14) % 2) * 7) % 14;
    const f = ['.r.r.', 'rrrrr', '.rrr.', '..r..'];
    if (cx >= 4 && cx < 9 && cy >= 5 && cy < 9 && f[cy - 5][cx - 4] === 'r') return (cy === 5 && cx === 5) ? '#ffc9d0' : '#f39aa8';
    return '#f8cfb7';
  },
  sea_stripe(x, y) {
    const wv = Math.round(Math.sin((x + 400) * 0.35) * 1.2);
    if ((y + 6) % 24 === 12 + wv) return '#8fc1e3'; if ((y + 6) % 24 === 13 + wv) return '#cfe7f5';
    return Math.floor(y / 6) % 2 ? '#e3f1fa' : '#f6fbff';
  },
  shoji(x, y) {
    if (y > 56) { if (y === 57) return '#7a4f35'; const px = ((x % 30) + 30) % 30; if (px === 0) return '#8e5d3d'; return y % 4 === 0 ? '#ad7a52' : '#b98252'; }
    const gx = ((x % 15) + 15) % 15, gy = y % 11;
    if (gx === 0 || gy === 0) return '#a8774e';
    return (hsh(x, y, 5) % 11 === 0) ? '#efe5d0' : '#f8f1e0';
  },
  forest_fern(x, y) {
    const cx = ((x % 12) + 12) % 12, cy = (y + (Math.floor((x + 120) / 12) % 2) * 6) % 12;
    const leaf = ['..l..', '.lml.', 'l.m.l', '..m..'];
    if (cx >= 4 && cx < 9 && cy >= 4 && cy < 8) { const c = leaf[cy - 4][cx - 4]; if (c === 'l') return '#8aac80'; if (c === 'm') return '#7d9e74'; }
    return ((x + 300) % 24 < 12) ? '#6c8c66' : '#688862';
  },
  winter_knit(x, y) {
    const band = y % 26, xx = ((x % 8) + 8) % 8;
    if (band === 0 || band === 1) return '#c95b5b';
    if (band >= 3 && band <= 7) { const p = ['...r....', '..rrr...', '.rr.rr..', '..rrr...', '...r....']; if (p[band - 3][xx] === 'r') return '#d36b6b'; }
    if (band === 9) return xx % 2 ? '#7fa36f' : '#f4ece0';
    if (band >= 12 && (x + y) % 2 === 0 && hsh(x, y) % 37 === 0) return '#e8dccb';
    return '#f4ece0';
  },
  brick(x, y) {
    const row = Math.floor(y / 6), py = y % 6, off = (row % 2) * 7, bx = Math.floor((x + off + 140) / 14), px = ((x + off) % 14 + 14) % 14;
    if (py === 5 || px === 13) return '#d9c3ae';
    const h = hsh(bx, row) % 3; const base = h === 0 ? '#b5624a' : h === 1 ? '#a85a44' : '#bf6c52';
    if (py === 0) return h === 1 ? '#b8674f' : '#c97a5f';
    return base;
  },
  studio_dark(x, y) {
    if (y > 54) { const px = ((x % 12) + 12) % 12, py = (y - 55) % 12; if (px === 0 || py === 0) return '#1d2034'; return (px + py) % 4 === 0 ? '#2c3150' : '#272b46'; }
    if ((((x % 16) + 16) % 16) === 0 || y % 16 === 0) return '#2d3250';
    return '#262a40';
  },
  wood_wall(x, y) {
    const row = Math.floor(y / 7), py = y % 7, off = (row * 13) % 34;
    if (py === 6) return '#8e5d3d'; if (py === 0) return '#dcab78';
    if ((((x + off) % 34) + 34) % 34 === 0) return '#8e5d3d';
    const h = hsh(Math.floor((x + off) / 4), row, 3); if (h % 6 === 0 && py > 1) return '#b98252';
    return row % 2 ? '#cf9a65' : '#c9935f';
  },
};
// ---------- floors: perspective coords ----------
function plankRows(minH, maxH) { const rows = []; let y = 96; while (y < 171) { const t = (y - 96) / 74; const h = Math.round(minH + (maxH - minH) * t); rows.push([y, h]); y += h; } return rows; }
const ROWS_PLANK = plankRows(4, 8), ROWS_TILE = plankRows(7, 12), ROWS_MAT = plankRows(10, 16);
function rowAt(rows, y) { for (let i = rows.length - 1; i >= 0; i--) if (y >= rows[i][0]) return [i, y - rows[i][0], rows[i][1]]; return [0, 0, 1]; }
function woodFloor(cols) {
  return (u, y, s) => {
    const [ri, py, ph] = rowAt(ROWS_PLANK, y); const L = 44, off = (ri * 19) % L;
    const pi = Math.floor((u + off) / L), piPrev = Math.floor((u - 1 / s + off) / L);
    if (py === ph - 1) return cols.seam;
    if (pi !== piPrev) return cols.seam;
    if (py === 0) return cols.hl;
    const h = hsh(Math.floor((u + off) / 5), ri, pi);
    if (h % 7 === 0) return cols.grain;
    return (hsh(pi, ri) % 3 === 0) ? cols.alt : cols.base;
  };
}
const FLOOR = {
  wood_white: woodFloor({ base: '#efe6d8', alt: '#e7dccb', seam: '#bfae96', grain: '#ded0bc', hl: '#faf4ea' }),
  concrete(u, y, s) { const [ri, py, ph] = rowAt(ROWS_MAT, y); const T = 64, ti = Math.floor((u + 400) / T), tp = Math.floor((u - 1 / s + 400) / T); if (py === ph - 1 || ti !== tp) return '#8d8a8c'; const h = hsh(Math.floor(u * 1.2), y, 3); return h % 7 === 0 ? '#9e9b9c' : h % 11 === 0 ? '#b6b3b3' : '#a9a6a6'; },
  plaid_carpet(u, y) { const v = Math.floor((y - 96) * 1.6 + (y - 96) * (y - 96) * 0.012); const a = ((Math.floor(u) % 16) + 16) % 16 < 4, b = v % 16 < 4, thin = ((Math.floor(u) % 16) + 16) % 16 === 9 || v % 16 === 9; if (a && b) return '#7a3045'; if (a || b) return '#a8455a'; if (thin) return '#e5c36a'; return (Math.floor(u) + v) % 2 ? '#c4566e' : '#be5068'; },
  parquet(u, y, s) { const v = (y - 96) * 1.55 + (y - 96) * (y - 96) * 0.011; const cu = Math.floor((u + 400) / 12), cv = Math.floor(v / 12); const lu = ((u + 400) % 12 + 12) % 12, lv = ((v % 12) + 12) % 12; const horiz = (cu + cv) % 2 === 0; const k = horiz ? lv : lu; if (k < 0.9 || (horiz ? lu : lv) < 0.7 / s) return '#8b5a3c'; const strip = Math.floor(k / 3); return strip % 2 ? '#c48a54' : '#d39a62'; },
  blue_tile(u, y, s) { const [ri, py, ph] = rowAt(ROWS_TILE, y); const T = 16; const ti = Math.floor((u + 400) / T), tp = Math.floor((u - 1 / s + 400) / T); if (py === ph - 1 || ti !== tp) return '#d6dfe8'; const lu = ((u + 400) % T + T) % T, lv = py / ph; const cx = Math.abs(lu - T / 2) / (T / 2), cy = Math.abs(lv - 0.5) * 2; if (cx + cy < 0.55) return (ti + ri) % 2 ? '#4a6aa8' : '#7ea6dc'; if (cx + cy > 1.35) return '#7ea6dc'; return '#f6f9fc'; },
  wood_honey: woodFloor({ base: '#d89b5d', alt: '#d09257', seam: '#8f5d3e', grain: '#c4874e', hl: '#e6b075' }),
  wood_birch: woodFloor({ base: '#ecd5ab', alt: '#e4ca9d', seam: '#b49069', grain: '#dbbf91', hl: '#f6e4c2' }),
  wood_walnut: woodFloor({ base: '#8c5c3d', alt: '#825437', seam: '#4a2f25', grain: '#744a31', hl: '#a06b48' }),
  checker_rose(u, y, s) {
    const [ri, py, ph] = rowAt(ROWS_TILE, y); const T = 20; const ti = Math.floor((u + 400) / T), tp = Math.floor((u - 1 / s + 400) / T);
    if (py === ph - 1 || ti !== tp) return '#e2c4c4';
    const dark = (ti + ri) % 2 === 0; if (py === 0) return dark ? '#f6bcc6' : '#ffffff';
    return dark ? '#f0a8b6' : '#fbf0e8';
  },
  carpet_lilac(u, y) { const h = hsh(Math.floor(u * 1.3), y, 9); return h % 5 === 0 ? '#ab94cf' : h % 7 === 0 ? '#c8b6e4' : '#b9a4da'; },
  tatami(u, y, s) {
    const [ri, py, ph] = rowAt(ROWS_MAT, y); const T = 60, off = (ri % 2) * 30; const ti = Math.floor((u + off + 400) / T), tp = Math.floor((u - 1 / s + off + 400) / T), tp2 = Math.floor((u - 2 / s + off + 400) / T);
    if (py >= ph - 2) return py === ph - 1 ? '#3e5530' : '#557243';
    if (ti !== tp || ti !== tp2) return '#557243';
    if (py % 2 === 0) return '#bfca8e';
    return (hsh(Math.floor(u), ri) % 6 === 0) ? '#b2bd81' : '#ccd69c';
  },
};

const TRIM = {
  shoji: { top: ['#8e5d3d', '#7a4f35', '#5e3b2f'], base: ['#8e5d3d', '#7a4f35', '#5e3b2f'] },
  wood_wall: { top: ['#a06b48', '#8e5d3d', '#5e3b2f'], base: ['#8e5d3d', '#7a4f35', '#5e3b2f'] },
  forest_fern: { top: ['#c4874e', '#a06b48', '#7a4f35'], base: ['#a06b48', '#8e5d3d', '#5e3b2f'] },
  brick: { top: ['#f1e4d3', '#d9c3ae', '#bfa58c'], base: ['#8e5d3d', '#7a4f35', '#5e3b2f'] },
  studio_dark: { top: ['#3a3f5e', '#2d3250', '#1d2034'], base: ['#3a3f5e', '#2d3250', '#16192a'] },
  night_star: { top: ['#3c4580', '#2c3366', '#1f2550'], base: ['#3c4580', '#2c3366', '#1f2550'] },
};
const Room = {
  cv: null, ctx: null, bg: null, light: null, lctx: null, t: 0, particles: [], items: [], uidMap: {}, actors: [],
  state: null, edit: false, sel: null, drag: null, hover: null, onChange: null,
  init(canvas) {
    this.cv = canvas; canvas.width = RW; canvas.height = RH;
    this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.bg = document.createElement('canvas'); this.bg.width = RW; this.bg.height = RH;
    this.light = document.createElement('canvas'); this.light.width = RW; this.light.height = RH; this.lctx = this.light.getContext('2d');
    this.sky = document.createElement('canvas'); this.sky.width = 40; this.sky.height = 40;
  },
  // ---------------- background ----------------
  buildBg(wp, fl, canvas) {
    const c = (canvas || this.bg).getContext('2d'); const im = c.createImageData(RW, RH); const d = im.data;
    const W = WALL[wp] || WALL.cream_stripe, F = FLOOR[fl] || FLOOR.wood_honey;
    const put = (x, y, col, k = 1) => { const o = (y * RW + x) * 4; d[o] = Math.min(255, col[0] * k); d[o + 1] = Math.min(255, col[1] * k); d[o + 2] = Math.min(255, col[2] * k); d[o + 3] = 255; };
    const TR = TRIM[wp] || { top: ['#fff6e6', '#efdcc0', '#dcc6a6'], base: ['#fff6e6', '#f1e2c9', '#cbb393'] };
    const trim = (v) => TR.top[Math.min(2, v)];
    const baseC = (v) => v < 79 ? TR.base[0] : v < 82 ? TR.base[1] : TR.base[2];
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      // back wall
      if (x >= R.wx0 && x < R.wx1 && y >= R.wy0 && y < R.wy1) {
        const wy = y - R.wy0; let col;
        if (wy < 3) col = rgb(trim(wy));
        else if (wy >= 78) col = rgb(baseC(wy));
        else col = rgb(W(x - R.wx0, wy));
        let k = 1; if (wy >= 3 && wy < 6) k = 0.93; if (x === R.wx0 || x === R.wx1 - 1) k *= 0.88;
        put(x, y, col, k); continue;
      }
      // side walls
      const left = x >= R.fxf0 && x < R.wx0, right = x >= R.wx1 && x < R.fxf1;
      if ((left || right) && y >= R.wy0) {
        const depth = left ? (R.wx0 - x) : (x - R.wx1 + 1);
        const bottom = 96 + depth * 74 / 24;
        if (y < bottom) {
          const H = bottom - R.wy0, v = (y - R.wy0) / H * 84;
          let col;
          if (v < 3) col = rgb(trim(Math.floor(v)));
          else if (v >= 78) col = rgb(baseC(v));
          else col = rgb(W(left ? -depth * 3 : 180 + depth * 3, Math.floor(v)));
          put(x, y, col, left ? 0.84 : 0.9); continue;
        }
      }
      // floor
      if (y >= 96 && y < R.fy1) {
        const [xa, xb] = floorX(y + 0.5);
        if (x >= Math.floor(xa) && x < Math.ceil(xb)) {
          const s = (xb - xa) / 180, u = (x + 0.5 - 120) / s;
          let col = rgb(F(u, y, s)); let k = 1;
          if (y < 99) k = 0.86 + (y - 96) * 0.04;
          if (x - xa < 2.5 || xb - x < 2.5) k *= 0.9;
          put(x, y, col, k); continue;
        }
      }
    }
    c.putImageData(im, 0, 0);
    // diorama shell: cut wall tops, outer edges, floor slab
    c.fillStyle = '#e9dccb'; c.fillRect(2, 8, 236, 4); c.fillStyle = '#f7efe4'; c.fillRect(2, 8, 236, 1); c.fillStyle = '#c8b3a2'; c.fillRect(6, 11, 228, 1);
    c.fillStyle = '#e9dccb'; c.fillRect(2, 8, 4, 162); c.fillRect(234, 8, 4, 162);
    c.fillStyle = '#d3c1b0'; c.fillRect(5, 12, 1, 158); c.fillRect(234, 12, 1, 158);
    c.fillStyle = '#f7efe4'; c.fillRect(2, 8, 1, 162); c.fillRect(237, 8, 1, 162);
    c.fillStyle = '#b5794b'; c.fillRect(2, 170, 236, 2); c.fillStyle = '#8b5a3c'; c.fillRect(2, 172, 236, 5); c.fillStyle = '#5e3b2f'; c.fillRect(2, 176, 236, 2);
    c.fillStyle = '#dba06a'; c.fillRect(2, 170, 236, 1);
    for (let x = 10; x < 236; x += 20) { c.fillStyle = '#7d5036'; c.fillRect(x, 173, 1, 3); }
    // outline
    c.fillStyle = '#2e2230'; c.fillRect(1, 7, 238, 1); c.fillRect(1, 7, 1, 172); c.fillRect(238, 7, 1, 172); c.fillRect(1, 178, 238, 1);
    this.bgKey = wp + '|' + fl;
  },
  // ---------------- sky in windows ----------------
  env: { h: 12, dark: 0, rain: false },
  computeEnv(settings) {
    const now = new Date(); let h = now.getHours() + now.getMinutes() / 60;
    if (window.NOOK_DEV_HOUR != null) h = window.NOOK_DEV_HOUR; else if (settings.timeMode === 'day') h = 12; else if (settings.timeMode === 'dusk') h = 18.2; else if (settings.timeMode === 'night') h = 22.5;
    const dk = [[0, .6], [5, .6], [6.4, .28], [7.6, 0], [17, 0], [18.4, .26], [19.6, .52], [21, .6], [24, .6]];
    let dark = 0; for (let i = 0; i < dk.length - 1; i++) if (h >= dk[i][0] && h <= dk[i + 1][0]) { const t = (h - dk[i][0]) / (dk[i + 1][0] - dk[i][0]); dark = dk[i][1] + (dk[i + 1][1] - dk[i][1]) * t; break; }
    if (settings.rain && dark < 0.18) dark = Math.max(dark, 0.14);
    this.env = { h, dark, rain: !!settings.rain };
  },
  skyCols(h) {
    const K = [[0, '#141a3a', '#2a2c5c'], [5, '#141a3a', '#2a2c5c'], [6.2, '#4a5598', '#f2a07a'], [7.5, '#7ec3f0', '#d3ecf8'], [12, '#69b2ec', '#c7e6f6'], [16.8, '#7cbfeb', '#d6ecf5'],
      [18.2, '#5b4f9a', '#f59a6c'], [19.6, '#1e2452', '#4a3f7c'], [24, '#141a3a', '#2a2c5c']];
    for (let i = 0; i < K.length - 1; i++) if (h >= K[i][0] && h <= K[i + 1][0]) {
      const t = (h - K[i][0]) / (K[i + 1][0] - K[i][0]); const m = (a, b) => rgb(a).map((v, j) => v + (rgb(b)[j] - v) * t);
      return [m(K[i][1], K[i + 1][1]), m(K[i][2], K[i + 1][2])];
    }
    return [rgb('#69b2ec'), rgb('#c7e6f6')];
  },
  drawWindowScene(c, X, Y, w, h, view) {
    const env = this.env, H = env.h, t = this.t; view = view || (this.state && this.state.view) || 'city';
    const [top, bot] = this.skyCols(H);
    const B = [[0, 2], [3, 1]];
    for (let y = 0; y < h; y++) {
      const f = y / (h - 1), bands = 6, q = f * bands, i0 = Math.floor(q), fr = q - i0;
      for (let x = 0; x < w; x++) {
        const use = fr * 4 > B[y % 2][x % 2] ? i0 + 1 : i0;
        const tt = Math.min(1, use / bands);
        let col = top.map((v, j) => Math.round(v + (bot[j] - v) * tt));
        if (env.rain) col = col.map(v => Math.round(v * 0.72 + 70 * 0.28));
        c.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; c.fillRect(X + x, Y + y, 1, 1);
      }
    }
    const night = H < 6 || H > 19.3;
    if (night) {
      for (let i = 0; i < 14; i++) { const sx = hsh(i, 3) % w, sy = hsh(i, 7) % Math.floor(h * 0.6); const tw = Math.sin(t * 2 + i * 1.7) > 0.3; c.fillStyle = tw ? '#fff6c9' : '#9aa6d6'; c.fillRect(X + sx, Y + sy, 1, 1); }
      if (!env.rain) { const mx = X + Math.floor(w * 0.68), my = Y + 4; c.fillStyle = '#fff1b0'; for (const [dx, dy, ww] of [[1, 0, 3], [0, 1, 5], [0, 2, 5], [0, 3, 5], [1, 4, 3]]) c.fillRect(mx + dx, my + dy, ww, 1); c.fillStyle = top.length ? `rgb(${top.map(Math.round).join(',')})` : '#141a3a'; for (const [dx, dy, ww] of [[3, 0, 2], [3, 1, 3], [3, 2, 3], [3, 3, 2]]) c.fillRect(mx + dx, my + dy, ww, 1); }
    } else if (H > 5.8 && H < 19.4 && !env.rain) {
      const p = (H - 6) / 13, sx = X + Math.round(2 + p * (w - 6)), sy = Y + Math.round(h * 0.55 - Math.sin(Math.PI * p) * h * 0.45);
      c.fillStyle = H > 17.5 || H < 7 ? '#ffd28a' : '#fff6cf';
      for (const [dx, dy, ww] of [[1, 0, 2], [0, 1, 4], [0, 2, 4], [1, 3, 2]]) c.fillRect(sx + dx, sy + dy, ww, 1);
      // clouds
      for (let i = 0; i < 2; i++) {
        const cx = X + ((Math.floor(t * 1.2 + i * 23) % (w + 14)) - 10), cy = Y + 5 + i * 6;
        c.fillStyle = H > 17.5 ? '#f7c9b6' : '#ffffff';
        for (const [dx, dy, ww] of [[2, 0, 3], [1, 1, 7], [0, 2, 10]]) c.fillRect(cx + dx, cy + dy, ww, 1);
        c.fillStyle = H > 17.5 ? '#d9a3a0' : '#dbe9f3'; c.fillRect(cx + 1, cy + 3, 8, 1);
      }
    }
    const dusk = !night && (H > 17.5 || H < 7);
    if (view === 'sea') return this.sceneSea(c, X, Y, w, h, night, dusk);
    if (view === 'forest') return this.sceneForest(c, X, Y, w, h, night, dusk);
    if (view === 'sakura') return this.sceneSakura(c, X, Y, w, h, night, dusk);
    if (view === 'snow') return this.sceneSnow(c, X, Y, w, h, night, dusk);
    // town silhouette
    const hills = night ? '#232348' : env.h > 17.5 || env.h < 7 ? '#6b5a8a' : '#8fb8a0';
    const bld = night ? '#1b1b38' : env.h > 17.5 || env.h < 7 ? '#55487a' : '#9ab3c7';
    const tree = night ? '#1d2e3a' : '#5e9a6a';
    for (let x = 0; x < w; x++) { const hy = Math.round(h - 7 - Math.sin(x * 0.35) * 1.5 - Math.sin(x * 0.11) * 2); c.fillStyle = hills; c.fillRect(X + x, Y + hy, 1, h - hy); }
    let bx = 0; let i = 0;
    while (bx < w) {
      const bw = 3 + hsh(i, 11) % 4, bh = 4 + hsh(i, 5) % 7; c.fillStyle = bld; c.fillRect(X + bx, Y + h - bh, Math.min(bw, w - bx), bh);
      if (night) for (let wy = h - bh + 1; wy < h - 1; wy += 2) for (let wx = bx + 1; wx < Math.min(bx + bw - 1, w); wx += 2) if (hsh(wx, wy, i) % 3 === 0) { c.fillStyle = '#ffd77a'; c.fillRect(X + wx, Y + wy, 1, 1); }
      bx += bw + (hsh(i, 2) % 3 === 0 ? 2 : 0); i++;
    }
    c.fillStyle = tree; c.fillRect(X + 2, Y + h - 6, 4, 6); c.fillRect(X + 1, Y + h - 5, 6, 3); c.fillRect(X + w - 6, Y + h - 5, 4, 5); c.fillRect(X + w - 7, Y + h - 4, 6, 2);
    this.rainOver(c, X, Y, w, h);
  },
  rainOver(c, X, Y, w, h) { if (!this.env.rain) return; const t = this.t; c.fillStyle = 'rgba(210,225,255,0.75)'; for (let i = 0; i < 16; i++) { const rx = (hsh(i, 1) % w), ry = Math.floor((t * 40 + hsh(i, 2) % 100) % (h + 6)) - 3; c.fillRect(X + rx, Y + ry, 1, 2); } },
  sceneSea(c, X, Y, w, h, night, dusk) {
    const t = this.t, hz = Math.round(h * 0.58);
    const sea = night ? ['#1f2756', '#161c44', '#34447e'] : dusk ? ['#6c5f9f', '#4f477f', '#f3b49e'] : ['#4189c6', '#2f70ae', '#a6d6f2'];
    c.fillStyle = night ? '#2a2f5c' : dusk ? '#7b6aa0' : '#6aa3c9'; c.fillRect(X + 1, Y + hz - 2, 6, 2); c.fillRect(X + 2, Y + hz - 3, 3, 1);
    c.fillStyle = night ? '#141a3a' : dusk ? '#3c3260' : '#2f6a4f'; c.fillRect(X + 4, Y + hz - 6, 1, 4); c.fillRect(X + 2, Y + hz - 7, 5, 1); c.fillRect(X + 3, Y + hz - 8, 1, 1); c.fillRect(X + 5, Y + hz - 8, 1, 1);
    for (let y = hz; y < h; y++) { c.fillStyle = y < hz + 4 ? sea[0] : sea[1]; c.fillRect(X, Y + y, w, 1); }
    for (let y = hz + 1; y < h - 3; y += 2) for (let x = 0; x < w; x++) if ((x + Math.floor(t * 5) + y * 5) % 11 < 2) { c.fillStyle = sea[2]; c.fillRect(X + x, Y + y, 1, 1); }
    const glint = night ? Math.floor(w * 0.68) + 2 : null;
    if (glint != null && !this.env.rain) for (let y = hz + 1; y < h - 3; y++) if ((y + Math.floor(t * 3)) % 3) { c.fillStyle = '#e9dca0'; c.fillRect(X + glint + ((y * 7) % 3) - 1, Y + y, 2, 1); }
    c.fillStyle = night ? '#4a4566' : dusk ? '#c99e8a' : '#f2dcae'; c.fillRect(X, Y + h - 3, w, 3); c.fillStyle = night ? '#5a5478' : dusk ? '#e0b79e' : '#fbe9c4'; c.fillRect(X, Y + h - 3, w, 1);
    if (!night && !this.env.rain) { const gx = X + ((Math.floor(t * 4) % (w + 20)) - 10), gy = Y + 9 + Math.round(Math.sin(t * 2) * 1.5); c.fillStyle = '#ffffff'; const fl = Math.floor(t * 6) % 2; c.fillRect(gx, gy + fl, 1, 1); c.fillRect(gx + 1, gy + 1 - fl, 1, 1); c.fillRect(gx + 2, gy, 1, 1); c.fillRect(gx + 3, gy + 1 - fl, 1, 1); c.fillRect(gx + 4, gy + fl, 1, 1); }
    this.rainOver(c, X, Y, w, h);
  },
  sceneForest(c, X, Y, w, h, night, dusk) {
    const t = this.t;
    const far = night ? '#1f2748' : dusk ? '#6a5b8f' : '#8dbd9a', mid = night ? '#17203a' : dusk ? '#4c4373' : '#5d9a6c', near = night ? '#0f1726' : dusk ? '#33305a' : '#3b7450';
    for (let x = 0; x < w; x++) { const hy = Math.round(h * 0.55 - Math.sin(x * 0.25) * 2 - Math.sin(x * 0.07 + 1) * 3); c.fillStyle = far; c.fillRect(X + x, Y + hy, 1, h - hy); }
    const tree = (cx, base, ht, col) => { for (let i = 0; i < ht; i++) { const hw = Math.floor((i / ht) * (ht * 0.38)) ; c.fillStyle = col; c.fillRect(X + cx - hw, Y + base - ht + i, hw * 2 + 1, 1); } c.fillRect(X + cx, Y + base, 1, 2); };
    for (let i = 0; i < 7; i++) tree(2 + i * 4 + (i % 2), h - 6, 9 + (hsh(i, 4) % 4), mid);
    for (let i = 0; i < 5; i++) tree(1 + i * 6 + (i % 2) * 2, h, 12 + (hsh(i, 8) % 5), near);
    if (night) for (let i = 0; i < 7; i++) { const fx = (hsh(i, 2) % w + Math.sin(t * 0.7 + i) * 3), fy = h * 0.45 + (hsh(i, 6) % (h * 0.45)) + Math.cos(t * 0.9 + i * 2) * 2; if (Math.sin(t * 3 + i * 1.9) > -0.2) { c.fillStyle = '#e8f59a'; c.fillRect(X + Math.round(fx), Y + Math.round(fy), 1, 1); } }
    this.rainOver(c, X, Y, w, h);
  },
  sceneSakura(c, X, Y, w, h, night, dusk) {
    const t = this.t;
    const hill = night ? '#2c2a55' : dusk ? '#9c7ea6' : '#cdbbdc', blo = night ? ['#7a5a86', '#9a7099', '#b48ab0'] : dusk ? ['#d98aa0', '#eaa5b8', '#f6c4cf'] : ['#ee8fa8', '#f5b6c8', '#fbd8e1'], trunk = night ? '#2a1e2e' : '#6b4030';
    for (let x = 0; x < w; x++) { const hy = Math.round(h * 0.7 - Math.sin(x * 0.2) * 2); c.fillStyle = hill; c.fillRect(X + x, Y + hy, 1, h - hy); }
    c.fillStyle = trunk; c.fillRect(X + 3, Y + h - 12, 2, 12); c.fillRect(X + 4, Y + h - 15, 1, 3); c.fillRect(X + 5, Y + h - 14, 5, 1); c.fillRect(X + 9, Y + h - 16, 1, 2);
    const cl = [[3, h - 18, 5, 3.5], [10, h - 18, 5, 3.2], [6, h - 22, 4, 3], [15, h - 15, 3.5, 2.5], [1, h - 13, 3, 2.4]];
    for (const [cx, cy, rx, ry] of cl) for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) { if ((x / rx) ** 2 + (y / ry) ** 2 > 1) continue; const hh = hsh(cx + x, cy + y); c.fillStyle = blo[y < -ry * 0.3 ? 2 : hh % 3 === 0 ? 0 : 1]; c.fillRect(X + cx + x, Y + cy + y, 1, 1); }
    for (let i = 0; i < 8; i++) { const px = ((hsh(i, 3) % w) + t * (4 + i % 3)) % (w + 4) - 2, py = ((hsh(i, 9) % h) + t * (5 + i % 4)) % h; c.fillStyle = blo[2]; c.fillRect(X + Math.round(px + Math.sin(t * 2 + i) * 1.5), Y + Math.round(py), 1, 1); }
    this.rainOver(c, X, Y, w, h);
  },
  sceneSnow(c, X, Y, w, h, night, dusk) {
    const t = this.t;
    if (!night) { c.fillStyle = 'rgba(225,232,242,0.35)'; c.fillRect(X, Y, w, h); }
    const snow = night ? '#8f9cc2' : dusk ? '#e6cfe0' : '#f5f9ff', shade = night ? '#6c789f' : dusk ? '#c3aac8' : '#d6e2f0', pine = night ? '#1f2c44' : '#3f6a5a';
    for (let x = 0; x < w; x++) { const hy = Math.round(h * 0.62 - Math.sin(x * 0.22) * 2.5); c.fillStyle = shade; c.fillRect(X + x, Y + hy, 1, h - hy); c.fillStyle = snow; c.fillRect(X + x, Y + hy, 1, 2); }
    for (let x = 0; x < w; x++) { const hy = Math.round(h * 0.82 - Math.sin(x * 0.3 + 2) * 1.5); c.fillStyle = snow; c.fillRect(X + x, Y + hy, 1, h - hy); }
    const tree = (cx, base, ht) => { for (let i = 0; i < ht; i++) { const hw = Math.floor((i / ht) * (ht * 0.36)); c.fillStyle = (i % 3 === 0) ? snow : pine; c.fillRect(X + cx - hw, Y + base - ht + i, hw * 2 + 1, 1); } };
    tree(4, h - 4, 11); tree(9, h - 6, 8); tree(w - 6, h - 3, 12); tree(w - 11, h - 6, 7);
    if (night) { c.fillStyle = '#ffd77a'; c.fillRect(X + 15, Y + h - 7, 4, 3); c.fillStyle = '#4a3a3a'; c.fillRect(X + 14, Y + h - 9, 6, 2); c.fillRect(X + 16, Y + h - 6, 1, 2); }
    if (!this.env.weather || this.env.weather === 'snow') for (let i = 0; i < 18; i++) { const sx = ((hsh(i, 5) % w) + Math.sin(t * 1.3 + i) * 2) , sy = ((hsh(i, 1) % h) + t * (4 + (i % 3) * 2)) % h; c.fillStyle = '#ffffff'; c.fillRect(X + Math.round(sx), Y + Math.round(sy), 1, 1); }
    this.rainOver(c, X, Y, w, h);
  },
  // ---------------- items ----------------
  def(it) { return ITEMS[it.k]; },
  itemCanvas(it) {
    const d = ITEMS[it.k]; const on = d.onSpr && it.on && !it.broken;
    if (d.bowl) { const lv = Pets.bowlLevel(it); if (lv) return SPR.get('pet_bowl_' + lv, null, it.flip); }
    if (it.wilt) return SPR.get(on ? d.onSpr : d.spr, Object.assign({}, d.map || {}, WILT_MAP), it.flip, d.id + ':wilt');
    return SPR.get(on ? d.onSpr : d.spr, d.map, it.flip, d.id + (on ? ':on' : ''));
  },
  surfaceOf(it) {
    const d = ITEMS[it.k]; if (!d.surface) return null; const cv = this.itemCanvas(it); let { x0, x1, y } = d.surface;
    if (it.flip) { const a = cv.width - 1 - x1, b = cv.width - 1 - x0; x0 = a; x1 = b; }
    return { x0: it.x + x0, x1: it.x + x1, y: it.y + y, it };
  },
  base(it) {
    const cv = this.itemCanvas(it); const d = ITEMS[it.k];
    if (it.p != null) { const p = this.uidMap[it.p]; if (p) return this.base(p) + 0.05 + (it.y + cv.height) * 0.0001; }
    if (d.layer === 'wall') return it.y + cv.height;
    return it.y + cv.height;
  },
  layerOf(it) {
    const d = ITEMS[it.k]; if (it.p != null) { const p = this.uidMap[it.p]; if (p) return this.layerOf(p); }
    return d.layer === 'decor' ? 'floor' : d.layer;
  },
  indexItems() { this.uidMap = {}; for (const it of this.state.items) this.uidMap[it.uid] = it; },
  clampItem(it) {
    const d = ITEMS[it.k], cv = this.itemCanvas(it), w = cv.width, h = cv.height;
    if (it.p != null && this.uidMap[it.p]) return;
    if (d.layer === 'wall') { it.x = Math.max(R.wx0, Math.min(R.wx1 - w, it.x)); it.y = Math.max(R.wy0 + 2, Math.min(R.wy1 - 3 - h, it.y)); return; }
    if (d.layer === 'rug') { const cy = it.y + h / 2; it.y = Math.max(98 - h * 0.3, Math.min(167 - h, it.y)); const [xa, xb] = floorX(it.y + h / 2); it.x = Math.max(Math.ceil(xa) + 1, Math.min(Math.floor(xb) - w - 1, it.x)); return; }
    let yb = it.y + h; yb = Math.max(99, Math.min(168, yb)); it.y = yb - h;
    const [xa, xb] = floorX(yb); it.x = Math.max(Math.ceil(xa), Math.min(Math.floor(xb) - w, it.x));
  },
  findSurface(it) {
    const cv = this.itemCanvas(it), cx = it.x + cv.width / 2, by = it.y + cv.height - 1; let best = null, bd = 99;
    for (const o of this.state.items) {
      if (o === it || o.p != null) continue; const s = this.surfaceOf(o); if (!s) continue;
      if (cx < s.x0 || cx > s.x1) continue; const dd = Math.abs(by - s.y); if (dd < 8 && dd < bd) { bd = dd; best = s; }
    }
    return best;
  },
  settleDecor(it) {
    const d = ITEMS[it.k]; if (d.layer !== 'decor') { delete it.p; this.clampItem(it); return; }
    const s = this.findSurface(it); const cv = this.itemCanvas(it);
    if (s) { it.p = s.it.uid; it.y = s.y - cv.height + 1; it.x = Math.max(s.x0 - 1, Math.min(s.x1 + 1 - cv.width + 1, it.x)); it.dx = it.x - s.it.x; it.dy = it.y - s.it.y; }
    else { delete it.p; delete it.dx; delete it.dy; this.clampItem(it); }
  },
  syncChildren() { for (const it of this.state.items) if (it.p != null) { const p = this.uidMap[it.p]; if (!p) { delete it.p; continue; } it.x = p.x + it.dx; it.y = p.y + it.dy; } },
  // ---------------- particles ----------------
  puff(spr, x, y, opts = {}) {
    this.particles.push(Object.assign({ spr, x, y, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 6, life: 0, max: 1.4, grav: 0, wob: 0 }, opts));
  },
  // ---------------- lights ----------------
  collectLights() {
    const out = [];
    for (const it of this.state.items) {
      const d = ITEMS[it.k]; if (!d.light || it.broken) continue; const on = d.toggle ? !!it.on : true; if (!on) continue;
      const cv = this.itemCanvas(it); let lx = d.light.x; if (it.flip) lx = cv.width - 1 - lx;
      let k = d.light.k; if (d.flicker) k *= 0.85 + Math.sin(this.t * 13 + it.uid) * 0.08 + Math.sin(this.t * 7.3) * 0.07;
      if (d.twinkle) k *= 0.9 + Math.sin(this.t * 3 + it.uid) * 0.1;
      out.push({ x: it.x + lx, y: it.y + d.light.y, r: d.light.r, col: d.light.col, k });
    }
    return out;
  },
  drawLighting(c) {
    const env = this.env, L = this.lctx, lights = this.collectLights();
    const dark = env.dark;
    if (dark > 0.01) {
      L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, RW, RH);
      L.fillStyle = `rgba(20,14,46,${dark})`; L.fillRect(0, 0, RW, RH);
      L.globalCompositeOperation = 'destination-out';
      for (const l of lights) { const g = L.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r); g.addColorStop(0, `rgba(0,0,0,${Math.min(1, 0.95 * l.k)})`); g.addColorStop(0.55, `rgba(0,0,0,${0.55 * l.k})`); g.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = g; L.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
      c.save(); c.globalCompositeOperation = 'source-atop'; c.drawImage(this.light, 0, 0); c.restore();
    }
    c.save();
    try {
      c.globalCompositeOperation = 'lighter';
    const COL = { warm: '255,190,110', cool: '120,170,255', pink: '255,110,170' };
    for (const l of lights) {
      const a = (0.1 + dark * 0.32) * l.k; const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
      g.addColorStop(0, `rgba(${COL[l.col]},${a})`); g.addColorStop(1, `rgba(${COL[l.col]},0)`); c.fillStyle = g; c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    // daylight through windows
    if (env.h > 6.5 && env.h < 18.6 && !env.rain) {
      const strength = Math.min(1, Math.min(env.h - 6.5, 18.6 - env.h) / 1.5) * 0.09;
      for (const it of this.state.items) {
        const d = ITEMS[it.k]; if (!d.window || it.closed) continue;
        const gx0 = it.x + d.window.x, gx1 = gx0 + d.window.w, sh = (env.h - 12) * -2.2;
        c.fillStyle = `rgba(255,236,190,${strength})`; c.beginPath(); c.moveTo(gx0 + 2, 100); c.lineTo(gx1 - 2, 100); c.lineTo(gx1 + sh + 4, 132); c.lineTo(gx0 + sh - 4, 132); c.closePath(); c.fill();
      }
    }
    } finally { c.restore(); }
  },
  // ---------------- frame ----------------
  drawDepth(z, actor = false) { return z + (actor ? 2 : 0); },
  drawList() {
    const list = [];
    for (const it of this.state.items) {
      const lay = this.layerOf(it); list.push({ kind: 'item', it, lay, z: this.base(it) });
    }
    for (const a of this.actors) list.push({ kind: 'actor', a, lay: 'floor', z: a.z() });
    if (this.state.gifts) for (const g of this.state.gifts) list.push({ kind: 'gift', g, lay: 'floor', z: g.y });
    const order = { wall: 0, rug: 1, floor: 2 };
    list.sort((a, b) => (order[a.lay] - order[b.lay]) || (this.drawDepth(a.z, a.kind === 'actor') - this.drawDepth(b.z, b.kind === 'actor')) || (Number(a.kind === 'actor') - Number(b.kind === 'actor')) || (a.z - b.z));
    return list;
  },
  drawItem(c, it) {
    const d = ITEMS[it.k], cv = this.itemCanvas(it);
    let ox = 0, oy = 0; if (it.shake > 0) { ox = Math.round(Math.sin(it.shake * 40) * 1); it.shake -= 1 / 60; }
    const x = it.x + ox, y = it.y + oy;
    if (d.window && d.window.custom) {
      const win = d.window; c.save(); c.beginPath(); if (win.arch) { const xx=x+win.x, yy=y+win.y, mid=xx+win.w/2; c.moveTo(xx,yy+win.w/2); c.quadraticCurveTo(xx,yy,mid,yy); c.quadraticCurveTo(xx+win.w,yy,xx+win.w,yy+win.w/2); c.lineTo(xx+win.w,yy+win.h); c.lineTo(xx,yy+win.h); c.closePath(); } else c.rect(x + win.x, y + win.y, win.w, win.h); c.clip();
      this.drawWindowScene(c, x + win.x, y + win.y, win.w, win.h);
      if (it.closed) { c.fillStyle = '#d7c7b7'; c.fillRect(x + win.x, y + win.y, win.w, win.h); for (let yy = 2; yy < win.h; yy += 4) { c.fillStyle = '#b59c88'; c.fillRect(x + win.x, y + win.y + yy, win.w, 1); } }
      c.restore(); c.drawImage(cv, x, y); return;
    }
    if (d.window && d.window.round) {
      c.save(); c.beginPath(); c.arc(x + 20, y + 20, 15.2, 0, Math.PI * 2); c.clip();
      this.drawWindowScene(c, x + d.window.x, y + d.window.y, d.window.w, d.window.h);
      if (it.closed) c.drawImage(SPR.get('shoji_closed'), x, y);
      c.restore(); c.drawImage(cv, x, y); return;
    }
    if (d.window) {
      this.drawWindowScene(c, x + d.window.x, y + d.window.y, d.window.w, d.window.h);
      c.drawImage(cv, x, y);
      const cm = { pink: null, blue: rampMap('pink', 'blue'), green: rampMap('pink', 'green') }[d.curtains];
      const cur = SPR.get(it.closed ? 'curtains_closed' : 'curtains', cm, false, 'cur' + d.curtains);
      c.drawImage(cur, x - 2, y - 1); return;
    }
    if (d.layer !== 'wall' && d.layer !== 'rug' && it.p == null) {
      c.fillStyle = 'rgba(46,34,48,0.18)'; const w = cv.width; c.fillRect(x + 2, y + cv.height - 2, w - 4, 2); c.fillRect(x + 4, y + cv.height, w - 8, 1);
    }
    c.drawImage(cv, x, y);
    if (it.dust) Life.drawDust(c, it, x, y, cv);
    if (it.broken && Math.random() < 0.01) this.puff('p_spark', x + cv.width / 2, y + 4, { vy: -4, max: 0.4 });
    if (d.anim) d.anim(c, x, y, it, this.t, cv);
    if (d.clock) { const n = new Date(); const co = d.clock === true ? { cx: 8, cy: 8 } : d.clock; const cx = x + (it.flip ? cv.width - 1 - co.cx : co.cx), cy = y + co.cy; const hA = ((n.getHours() % 12) + n.getMinutes() / 60) / 12 * Math.PI * 2, mA = n.getMinutes() / 60 * Math.PI * 2;
      c.fillStyle = '#2e2230'; for (let i = 0; i <= 3; i++) c.fillRect(Math.round(cx + Math.sin(mA) * i), Math.round(cy - Math.cos(mA) * i), 1, 1);
      c.fillStyle = '#c4566e'; for (let i = 0; i <= 2; i++) c.fillRect(Math.round(cx + Math.sin(hA) * i), Math.round(cy - Math.cos(hA) * i), 1, 1); }
    if (d.calendar) drawDigits(c, String(new Date().getDate()), x + 8, y + 11, '#7a3045');
    if (d.screen) { const blink = Math.floor(this.t * 2) % 2; c.fillStyle = blink ? '#b8e08a' : '#7ea6dc'; const sx = it.flip ? cv.width - 1 - (d.spr === 'monitor' ? 15 : 10) : (d.spr === 'monitor' ? 15 : 10); c.fillRect(x + sx, y + (d.spr === 'monitor' ? 9 : 6), 1, 1); }
    if (d.tv && it.on) { const sx = it.flip ? 5 : 5; for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) { const h = hsh(i, j, Math.floor(this.t * 8)); if (h % 3 === 0) { c.fillStyle = h % 2 ? 'rgba(200,220,255,0.55)' : 'rgba(126,166,220,0.5)'; c.fillRect(x + sx - 1 + i, y + 7 + j, 1, 1); } } }
    if (d.fish) { const p = (Math.sin(this.t * 0.9 + it.uid) + 1) / 2; const fx = x + 4 + Math.round(p * 6), fy = y + 7 + Math.round(Math.sin(this.t * 1.7) * 1); const dir = Math.cos(this.t * 0.9 + it.uid) > 0; c.fillStyle = '#e8973d'; c.fillRect(fx, fy, 3, 2); c.fillStyle = '#f6c75a'; c.fillRect(dir ? fx + 2 : fx, fy, 1, 1); c.fillStyle = '#c4566e'; c.fillRect(dir ? fx - 1 : fx + 3, fy, 1, 2); }
    if (d.spin) { const a = Math.floor(this.t * 6) % 4; const pts = [[4, 4], [9, 3], [14, 4], [9, 5]]; c.fillStyle = '#77708f'; const p = pts[a]; c.fillRect(x + (it.flip ? cv.width - 1 - p[0] : p[0]), y + p[1], 1, 1); }
    if (d.steam && Math.random() < 0.025) this.puff('p_steam', x + cv.width / 2 - 1, y - 2, { vx: (Math.random() - 0.5) * 2, vy: -5, max: 1.6, alpha: 0.6 });
    if (d.flicker && it.on) { c.fillStyle = Math.sin(this.t * 17 + it.uid) > 0 ? '#fff7c2' : '#ffe07a'; c.fillRect(x + 3, y + 1 + (Math.sin(this.t * 9) > 0.6 ? 1 : 0), 1, 1); }
    if (d.fire) {
      if (it.on) {
        for (let fx = 15; fx < 31; fx++) {
          const ht = 3 + Math.abs(Math.sin(this.t * 5 + fx * 0.9)) * 6 + Math.sin(this.t * 11 + fx * 2.1) * 1.5 - Math.abs(fx - 23) * 0.35;
          for (let j = 0; j < ht; j++) { const f = j / ht; c.fillStyle = f < 0.35 ? '#e8973d' : f < 0.75 ? '#f6c75a' : '#fff7c2'; c.fillRect(x + fx, y + 31 - j, 1, 1); }
        }
        if (Math.random() < 0.06) this.puff('p_spark', x + 18 + Math.random() * 10, y + 20, { vy: -10, vx: (Math.random() - 0.5) * 4, max: 0.7 });
      } else { c.fillStyle = '#c4566e'; for (const fx of [17, 21, 26, 29]) c.fillRect(x + fx, y + 31, 1, 1); }
    }
    if (d.glow && it.on) { for (let gx = 7; gx < 16; gx += 2) { const k = Math.sin(this.t * 6 + gx) > 0; c.fillStyle = k ? '#ffe07a' : '#e8973d'; c.fillRect(x + (it.flip ? cv.width - 1 - gx : gx), y + 12, 1, 4); } }
// 各家具的音符計時只存在記憶體，不寫進存檔
if (!this._musicNoteTimes) {
  this._musicNoteTimes = new WeakMap();
}

if (d.music && typeof Music !== 'undefined' && Music.playing) {
  const interval = 1.2; // 每件家具，每隔 1.2 秒產生一個
  const duration = 2.0; // 每個音符存在 2 秒

  let nextTime = this._musicNoteTimes.get(it);

  // 不同家具稍微錯開，避免全部同時冒音符
  if (nextTime === undefined) {
    nextTime = this.t + ((it.uid || 0) % 7) / 7 * interval;
    this._musicNoteTimes.set(it, nextTime);
  }

  if (this.t >= nextTime) {
    this.puff('p_note', x + cv.width / 2 - 2, y - 2, {
      vx: 0,
      vy: -7,
      wob: 2,
      max: duration,
      alpha: 0.75
    });

    // 不補發錯過的音符，避免恢復畫面時突然噴出一堆
    this._musicNoteTimes.set(it, this.t + interval);
  }
} else if (d.music) {
  this._musicNoteTimes.delete(it);
}


    if (d.flicker && !it.on) { c.fillStyle = '#efdcc0'; c.fillRect(x + 2, y + 1, 3, 3); c.fillStyle = '#2e2230'; c.fillRect(x + 3, y + 3, 1, 1); }
  },
  drawGift(c, g) {
    const cv = SPR.get('gift_box'); let y = g.y - cv.height; if (g.drop > 0) { y -= g.drop; g.drop = Math.max(0, g.drop - 2.4); }
    const bob = Math.round(Math.sin(this.t * 3 + g.uid) * 1);
    c.fillStyle = 'rgba(46,34,48,0.2)'; c.fillRect(g.x + 2, g.y - 1, cv.width - 4, 2);
    c.drawImage(cv, g.x, y + (g.drop > 0 ? 0 : bob));
    if (Math.random() < 0.04) this.puff('p_spark', g.x + Math.random() * cv.width, y + Math.random() * 6, { vy: -4, max: 0.8 });
  },
  render(dt) {
    this.t += dt; const c = this.ctx;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, RW, RH);
    c.drawImage(this.bg, 0, 0);
    this.syncChildren();
    const list = this.drawList();
    for (const e of list) {
      if (e.kind === 'item') this.drawItem(c, e.it);
      else if (e.kind === 'actor') e.a.draw(c, this);
      else this.drawGift(c, e.g);
    }
    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life += dt; if (p.life > p.max) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt + (p.wob ? Math.sin(p.life * 6) * p.wob * dt : 0); p.y += p.vy * dt; p.vy += p.grav * dt;
      const cv = SPR.get(p.spr); c.globalAlpha = Math.max(0, Math.min(1, (p.alpha || 1) * (1 - Math.max(0, p.life - p.max * 0.6) / (p.max * 0.4))));
      c.drawImage(cv, Math.round(p.x), Math.round(p.y)); c.globalAlpha = 1;
    }
    this.drawLighting(c);
    if (!this.edit && this.state === Game.S && Game.S.life) { Life.drawBubbles(c); if (typeof Social !== 'undefined') Social.drawMarks(c); }
    // edit overlays
    if (this.edit) {
      const tgt = this.sel || this.hover; if (tgt) this.outline(c, tgt, this.sel ? '#ffffff' : 'rgba(255,255,255,0.6)');
      if (this.drag && this.drag.snap) { const s = this.drag.snap; c.fillStyle = 'rgba(184,224,138,0.9)'; c.fillRect(s.x0, s.y + 1, s.x1 - s.x0 + 1, 1); }
    }
  },
  outline(c, it, col) {
    const cv = this.itemCanvas(it); const key = '__ol'; let o = cv[key];
    if (!o) { o = document.createElement('canvas'); o.width = cv.width + 2; o.height = cv.height + 2; const x = o.getContext('2d');
      for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) x.drawImage(cv, dx, dy); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height);
      x.globalCompositeOperation = 'destination-out'; x.drawImage(cv, 1, 1); cv[key] = o; }
    c.save(); c.globalAlpha = col.startsWith('rgba') ? 0.6 : 1; c.drawImage(o, it.x - 1, it.y - 1); c.restore();
  },
  renderStatic(canvas, st, h = 12.5, dark = 0) {
    const keep = { state: this.state, uidMap: this.uidMap, actors: this.actors, ctx: this.ctx, bg: this.bg, env: this.env, particles: this.particles, edit: this.edit, t: this.t, sel: this.sel, hover: this.hover };
    try {
      this.state = st; this.indexItems(); this.actors = []; this.particles = []; this.edit = false; this.sel = null; this.hover = null; this.env = { h, dark, rain: false };
      const bg = document.createElement('canvas'); bg.width = RW; bg.height = RH; this.bg = bg; this.buildBg(st.wp, st.fl, bg);
      canvas.width = RW; canvas.height = RH; this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
      this.render(0);
    } finally { Object.assign(this, keep); }
    return canvas;
  },
  // ---------------- hit testing ----------------
  hit(x, y, opts = {}) {
    const list = this.drawList();
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e.kind === 'actor') { if (opts.itemsOnly) continue; if (e.a.hit(x, y)) return e; continue; }
      if (e.kind === 'gift') { if (opts.itemsOnly) continue; const cv = SPR.get('gift_box'); if (x >= e.g.x && x < e.g.x + cv.width && y >= e.g.y - cv.height - 2 && y < e.g.y) return e; continue; }
      const it = e.it, cv = this.itemCanvas(it), d = ITEMS[it.k];
      if (d.window) { if (x >= it.x && x < it.x + cv.width && y >= it.y && y < it.y + cv.height) return e; continue; }
      if (hitAlpha(cv, x - it.x, y - it.y)) return e;
    }
    return null;
  },
};

// tiny 3x5 digit font for calendar etc.
const DIG = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'] };
function drawDigits(c, s, cx, y, col) {
  const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); c.fillStyle = col;
  for (const ch of s) { const g = DIG[ch]; if (g) g.forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === '1') c.fillRect(x + i, y + j, 1, 1); }); x += 4; }
}
