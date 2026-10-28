/* ============================================================
   Generated wallpapers and floors: pattern × palette
   Each entry becomes WALL[id] / FLOOR[id] plus a catalog entry in WALLPAPERS / FLOORS.
   ============================================================ */
const WP_PAL = {
  cream: { n: I18n.s("u_ed3cdb192a56"), bg: '#fcf1df', b2: '#f4e4cc', fg: '#e8c79a', f2: '#c99a63', hl: '#ffffff' },
  mint: { n: I18n.s("u_ae506736a67b"), bg: '#e6f5ee', b2: '#d3ece1', fg: '#9fd3bf', f2: '#5fa88d', hl: '#ffffff' },
  rose: { n: I18n.s("u_a6664df1efc8"), bg: '#fbe6e8', b2: '#f5d3d7', fg: '#ee9aaa', f2: '#c96478', hl: '#ffffff' },
  lilac: { n: I18n.s("u_68e9b02c08eb"), bg: '#f1ebf8', b2: '#e2d7f1', fg: '#bba6dc', f2: '#8c73b8', hl: '#ffffff' },
  sky: { n: I18n.s("u_6c8c7a77cdfd"), bg: '#e8f2fb', b2: '#d6e7f6', fg: '#9ac2e6', f2: '#5d8fc4', hl: '#ffffff' },
  lemon: { n: I18n.s("u_5e3cd6bef7d2"), bg: '#fdf5d6', b2: '#f8eab6', fg: '#f3cf6a', f2: '#d3a33a', hl: '#ffffff' },
  sage: { n: I18n.s("u_50cbb376ac47"), bg: '#eef2e3', b2: '#dde6cc', fg: '#b5c99d', f2: '#7d9a68', hl: '#fbfdf5' },
  peach: { n: I18n.s("u_9d50afb813da"), bg: '#fde9dc', b2: '#f9d8c4', fg: '#f3ad8c', f2: '#d77d5d', hl: '#fff7f0' },
  slate: { n: I18n.s("u_d63b1dab8d45"), bg: '#e6e9ef', b2: '#d4d9e2', fg: '#9aa4b8', f2: '#646f88', hl: '#f7f8fb' },
  clay: { n: I18n.s("u_0752623ccdcc"), bg: '#f3dfd2', b2: '#e8c9b6', fg: '#c97b5a', f2: '#9b5038', hl: '#fbefe6' },
  ocean: { n: I18n.s("u_2a4ad9fe7285"), bg: '#dff1f1', b2: '#c9e6e6', fg: '#7cc4c4', f2: '#3f8f8f', hl: '#f4fbfb' },
  coal: { n: I18n.s("u_a5c947c99dbe"), bg: '#2c2f3a', b2: '#353946', fg: '#4a5064', f2: '#7b84a0', hl: '#a9b3cf', dark: true },
  midnight: { n: I18n.s("u_e4a7a35c0c00"), bg: '#1f2b4d', b2: '#26355c', fg: '#3d5087', f2: '#8fa3d8', hl: '#dfe7ff', dark: true },
  forest: { n: I18n.s("u_3bfbf21e2f00"), bg: '#2f4a3b', b2: '#375646', fg: '#527a5f', f2: '#8cb38f', hl: '#d6ecd2', dark: true },
  berry: { n: I18n.s("u_70324b659e7e"), bg: '#4a2236', b2: '#57293f', fg: '#8a4262', f2: '#d58aa8', hl: '#ffd9e6', dark: true },
};
const md = (v, m) => ((v % m) + m) % m;
// tiny motif stamp: rows of chars, '.' = background; returns the key or null
function motif(x, y, cw, ch, rows, stagger) {
  const col = Math.floor(x / cw), cy = md(y + (stagger && col % 2 ? Math.floor(ch / 2) : 0), ch), cx = md(x, cw);
  const ox = Math.floor((cw - rows[0].length) / 2), oy = Math.floor((ch - rows.length) / 2);
  const r = rows[cy - oy]; if (!r) return null; const c = r[cx - ox]; return c && c !== '.' ? c : null;
}
const WP_PATTERNS = {
  stripe: { n: I18n.s("u_15c63db8b1f5"), pals: ['cream', 'mint', 'rose', 'sky', 'lemon', 'coal'], f: (x, y, P) => { const m = md(x, 16); return m < 7 ? P.bg : m === 7 || m === 15 ? P.hl : P.b2; } },
  pin: { n: I18n.s("u_55e1a40be487"), pals: ['cream', 'slate', 'sage', 'midnight', 'lilac'], f: (x, y, P) => md(x, 8) === 0 ? P.fg : P.bg },
  candy: { n: I18n.s("u_3fc2b1b24d48"), pals: ['rose', 'mint', 'sky', 'lemon', 'lilac'], f: (x, y, P) => { const m = md(x, 12); return m < 4 ? P.fg : m < 5 ? P.hl : P.bg; } },
  dots: { n: I18n.s("u_9e09aaee7e60"), pals: ['cream', 'rose', 'sky', 'mint', 'coal', 'berry'], f: (x, y, P) => { const k = motif(x, y, 8, 8, ['.a.', 'aaa', '.a.'], true); return k ? P.fg : P.bg; } },
  bigdot: { n: I18n.s("u_8199e9130705"), pals: ['lemon', 'peach', 'lilac', 'ocean', 'midnight'], f: (x, y, P) => { const k = motif(x, y, 16, 14, ['..aaa..', '.abbaa.', 'aabaaaa', 'aaaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..'], true); return k === 'b' ? P.hl : k ? P.fg : P.bg; } },
  gingham: { n: I18n.s("u_721068b0086b"), pals: ['rose', 'sky', 'mint', 'lemon', 'clay', 'coal'], f: (x, y, P) => { const a = md(x, 10) < 5, b = md(y, 10) < 5; return a && b ? P.fg : a || b ? P.b2 : P.bg; } },
  plaid: { n: I18n.s("u_5458463eb941"), pals: ['clay', 'forest', 'midnight', 'berry', 'sage'], f: (x, y, P) => { const a = md(x, 18), b = md(y, 18); if (a < 4 && b < 4) return P.f2; if (a < 4 || b < 4) return P.fg; if (a === 9 || b === 9) return P.hl; return (x + y) % 2 ? P.bg : P.b2; } },
  floral: { n: I18n.s("u_3f5825f5d23d"), pals: ['rose', 'cream', 'sky', 'lilac', 'sage', 'berry'], f: (x, y, P) => { const k = motif(x, y, 14, 14, ['..a..', '.aba.', '..a..', '.c.c.'], true); return k === 'a' ? P.fg : k === 'b' ? P.hl : k === 'c' ? '#93bf82' : P.bg; } },
  bloom: { n: I18n.s("u_9f0b3fc6b9f6"), pals: ['peach', 'rose', 'lemon', 'midnight', 'forest'], f: (x, y, P) => { const k = motif(x, y, 22, 20, ['...aa.aa...', '..aaaaaaa..', '.aaabbbaaa.', '..aabcbaa..', '.aaabbbaaa.', '..aaaaaaa..', '...aa.aa...', '.....d.....', '....dd.....', '...d.d.....'], true); return k === 'a' ? P.fg : k === 'b' ? P.f2 : k === 'c' ? P.hl : k === 'd' ? '#7faa6e' : P.bg; } },
  hearts: { n: I18n.s("u_d7b799b82a17"), pals: ['rose', 'peach', 'lilac', 'cream', 'berry'], f: (x, y, P) => { const k = motif(x, y, 12, 11, ['.a.a.', 'aaaaa', '.aaa.', '..a..'], true); return k ? P.fg : P.bg; } },
  stars: { n: I18n.s("u_6a9fec7faf97"), pals: ['midnight', 'coal', 'sky', 'lemon', 'lilac'], f: (x, y, P) => { const k = motif(x, y, 14, 13, ['..a..', '.aaa.', 'aaaaa', '.a.a.'], true); return k ? (P.dark ? '#f6d98a' : P.f2) : (hsh(x + 900, y) % 97 === 0 ? P.hl : P.bg); } },
  moon: { n: I18n.s("u_c551fc408d6b"), pals: ['midnight', 'coal', 'berry', 'sky'], f: (x, y, P) => { const k = motif(x, y, 24, 22, ['..aaa...', '.aa.....', 'aa......', 'aa......', 'aa......', '.aa.....', '..aaa...'], true); if (k) return '#f3d98b'; const h = hsh(x + 3, y + 400); return h % 61 === 0 ? P.hl : h % 89 === 0 ? P.f2 : P.bg; } },
  leaves: { n: I18n.s("u_3d9a6572c18c"), pals: ['sage', 'mint', 'forest', 'cream', 'ocean'], f: (x, y, P) => { const k = motif(x, y, 12, 12, ['..a..', '.aba.', 'a.b.a', '..b..'], true); return k === 'a' ? P.fg : k === 'b' ? P.f2 : P.bg; } },
  argyle: { n: I18n.s("u_e5813a5561b5"), pals: ['clay', 'lilac', 'midnight', 'sage', 'slate'], f: (x, y, P) => { const u = md(x, 20) - 10, v = md(y, 24) - 12; const d = Math.abs(u) / 10 + Math.abs(v) / 12; if (Math.abs(md(x + y, 20) - 10) < 0.6 || Math.abs(md(x - y + 2000, 20) - 10) < 0.6) return P.hl; return d < 1 ? P.fg : P.bg; } },
  chevron: { n: I18n.s("u_6d5f11f8cfee"), pals: ['sky', 'lemon', 'coal', 'mint', 'peach'], f: (x, y, P) => { const v = md(y + Math.abs(md(x, 16) - 8), 12); return v < 3 ? P.fg : v < 4 ? P.hl : P.bg; } },
  waves: { n: I18n.s("u_cd78c1e988bf"), pals: ['ocean', 'sky', 'midnight', 'mint'], f: (x, y, P) => { const v = md(y + Math.round(Math.sin(x * 0.4) * 2), 10); return v === 0 ? P.f2 : v === 1 ? P.fg : P.bg; } },
  scallop: { n: I18n.s("u_ab20ac613186"), pals: ['ocean', 'rose', 'lemon', 'lilac', 'coal'], f: (x, y, P) => { const row = Math.floor(y / 6), u = md(x + (row % 2) * 6, 12) - 6, v = md(y, 6); const r = Math.sqrt(u * u + (v + 1) * (v + 1)); return Math.abs(r - 6) < 0.8 ? P.fg : r < 5 ? P.bg : P.b2; } },
  subway: { n: I18n.s("u_9e5c82e179ff"), pals: ['cream', 'mint', 'sky', 'coal', 'sage'], f: (x, y, P) => { const row = Math.floor(y / 5), off = (row % 2) * 7; if (md(y, 5) === 4 || md(x + off, 14) === 13) return P.fg; return md(y, 5) === 0 ? P.hl : P.bg; } },
  wainscot: { n: I18n.s("u_32391cbb6ef5"), pals: ['sage', 'sky', 'rose', 'cream', 'midnight', 'clay'], f: (x, y, P) => { if (y > 50) { if (y === 51) return '#ffffff'; if (y === 52) return P.f2; const px = md(x, 24); if (px === 0) return P.f2; if (px === 3 || px === 21 || y === 56 || y === 76) return P.b2; return P.fg; } return hsh(x, y, 4) % 11 === 0 ? P.b2 : P.bg; } },
  vplank: { n: I18n.s("u_d87ccbae20cf"), pals: ['cream', 'sage', 'sky', 'coal', 'clay'], f: (x, y, P) => { const px = md(x, 9); if (px === 0) return P.f2; if (px === 1) return P.hl; return hsh(Math.floor(x / 9), Math.floor(y / 3)) % 7 === 0 ? P.b2 : P.bg; } },
  damask: { n: I18n.s("u_a52908204170"), pals: ['berry', 'midnight', 'cream', 'forest', 'clay'], f: (x, y, P) => { const k = motif(x, y, 18, 22, ['....a....', '...aaa...', '..a.a.a..', '.aa.a.aa.', 'a..aaa..a', '.aa.a.aa.', '..a.a.a..', '...aaa...', '....a....', '....a....'], true); return k ? P.fg : P.bg; } },
  clouds: { n: I18n.s("u_08be445b6edd"), pals: ['sky', 'lilac', 'peach', 'midnight'], f: (x, y, P) => { const k = motif(x, y, 26, 20, ['....aaa......', '..aaaaaaa.aa.', '.aaaaaaaaaaaa', 'aaaaaaaaaaaaa', '.bbbbbbbbbbb.'], true); return k === 'a' ? P.hl : k === 'b' ? P.b2 : P.bg; } },
  confetti: { n: I18n.s("u_9b6b9ba0d398"), pals: ['cream', 'coal', 'sky', 'mint'], f: (x, y, P) => { const h = hsh(Math.floor((x + 900) / 2), Math.floor(y / 2), 7); const c = ['#ee9aaa', '#f3cf6a', '#9fd3bf', '#9ac2e6', '#bba6dc']; return h % 17 === 0 ? c[h % 5] : P.bg; } },
  lattice: { n: I18n.s("u_148c0e6a4c06"), pals: ['sage', 'cream', 'clay', 'forest'], f: (x, y, P) => { const a = md(x + y, 12), b = md(x - y + 1200, 12); return a === 0 || b === 0 ? P.f2 : a === 1 || b === 1 ? P.fg : P.bg; } },
  tri: { n: I18n.s("u_b6770ab8b2d2"), pals: ['peach', 'ocean', 'lemon', 'coal', 'lilac'], f: (x, y, P) => { const cx = md(x, 12), cy = md(y, 12), up = (Math.floor(x / 12) + Math.floor(y / 12)) % 2; return (up ? cy > Math.abs(cx - 6) * 2 - 2 : cy < 12 - Math.abs(cx - 6) * 2) && cy > 2 && cy < 10 ? P.fg : P.bg; } },
  bamboo: { n: I18n.s("u_1fd6998d36c7"), pals: ['sage', 'lemon', 'forest', 'cream'], f: (x, y, P) => { const px = md(x, 14); if (px === 6 || px === 7) return md(y, 18) === 0 ? P.f2 : P.fg; if (px === 8 && md(y + 3, 18) < 4) return '#93bf82'; return P.bg; } },
  cross: { n: I18n.s("u_2dc76a4e6cb4"), pals: ['cream', 'rose', 'sky', 'sage'], f: (x, y, P) => { const k = motif(x, y, 10, 10, ['a.a', '.a.', 'a.a'], false); return k ? P.fg : P.bg; } },
  rain: { n: I18n.s("u_9f44f2cb1b21"), pals: ['sky', 'slate', 'midnight', 'mint'], f: (x, y, P) => { const k = motif(x, y, 10, 14, ['.a.', 'aaa', 'aaa', '.a.'], true); return k ? P.fg : P.bg; } },
  cherry: { n: I18n.s("u_5af63ddf5d02"), pals: ['cream', 'mint', 'sky', 'lemon'], f: (x, y, P) => { const k = motif(x, y, 16, 16, ['....g..', '...g.g.', '..g...g', 'rr...rr', 'rh...rh', 'rr...rr'], true); return k === 'r' ? '#d94f62' : k === 'h' ? '#ffd0d6' : k === 'g' ? '#6f9a5c' : P.bg; } },
  kitty: { n: I18n.s("u_636e25f526b7"), pals: ['peach', 'sky', 'lilac', 'mint', 'cream'], f: (x, y, P) => { const k = motif(x, y, 16, 14, ['a...a', 'aa.aa', 'aaaaa', 'abaab', 'aaaaa', '.aaa.'], true); return k === 'a' ? P.fg : k === 'b' ? P.f2 : P.bg; } },
  stone: { n: I18n.s("u_164dc2a415ce"), pals: ['slate', 'cream', 'clay', 'coal'], f: (x, y, P) => { const row = Math.floor(y / 8), off = (row * 7) % 16, bx = Math.floor((x + off + 1600) / 16); if (md(y, 8) === 7 || md(x + off, 16) === 15) return P.f2; const h = hsh(bx, row) % 3; return h === 0 ? P.fg : h === 1 ? P.b2 : P.bg; } },
};
const FL_WOOD = {
  oak: { n: I18n.s("u_4aaf55814976"), base: '#c79a62', alt: '#bd905a', seam: '#7f5839', grain: '#b2844f', hl: '#d8ad77' },
  ash: { n: I18n.s("u_35706963b32d"), base: '#d9cbb5', alt: '#d0c1aa', seam: '#9e8f79', grain: '#c8b89f', hl: '#e8dcc8' },
  cherry: { n: I18n.s("u_f587c78f730b"), base: '#b0603f', alt: '#a65838', seam: '#6a3423', grain: '#9b5233', hl: '#c27352' },
  ebony: { n: I18n.s("u_db6f995df960"), base: '#4b3a35', alt: '#45352f', seam: '#241a18', grain: '#3c2e2a', hl: '#5d4943' },
  greywash: { n: I18n.s("u_81f5dc29b3bf"), base: '#b7aea6', alt: '#aea59d', seam: '#7b726b', grain: '#a59b93', hl: '#c9c1ba' },
  pinkwash: { n: I18n.s("u_8a40478c697c"), base: '#e8c8c0', alt: '#e0beb6', seam: '#b08d86', grain: '#d7b3ab', hl: '#f3d8d1' },
  bamboo: { n: I18n.s("u_0ede0734dd4a"), base: '#e0c27a', alt: '#d7b86f', seam: '#9c7d3d', grain: '#cead63', hl: '#ecd291' },
  teak: { n: I18n.s("u_07b7e5964f3a"), base: '#a8703d', alt: '#9e6836', seam: '#5e3b20', grain: '#915f31', hl: '#ba8352' },
  mintwash: { n: I18n.s("u_65188d7aa5ac"), base: '#cfe0d2', alt: '#c5d7c8', seam: '#8fa594', grain: '#bccfbf', hl: '#dfece1' },
  maple: { n: I18n.s("u_485c8f400073"), base: '#e5c18e', alt: '#dcb784', seam: '#a5814f', grain: '#d2ad78', hl: '#f0d1a3' },
  smoke: { n: I18n.s("u_3d87d24fc5f2"), base: '#7d6553', alt: '#755e4d', seam: '#3f3129', grain: '#6c5646', hl: '#8f7664' },
  honeyd: { n: I18n.s("u_646c070d8f38"), base: '#c4823f', alt: '#ba7a39', seam: '#7b4c24', grain: '#ae7234', hl: '#d39553' },
};
const ROWS_WIDE = plankRows(6, 12);
function woodFloorRows(cols, rows, L) {
  return (u, y, s) => {
    const [ri, py, ph] = rowAt(rows, y); const off = (ri * 23) % L;
    const pi = Math.floor((u + off + 4000) / L), piPrev = Math.floor((u - 1 / s + off + 4000) / L);
    if (py === ph - 1 || pi !== piPrev) return cols.seam;
    if (py === 0) return cols.hl;
    const h = hsh(Math.floor((u + off) / 5), ri, pi); if (h % 7 === 0) return cols.grain;
    return (hsh(pi, ri) % 3 === 0) ? cols.alt : cols.base;
  };
}
function persV(y) { return (y - 96) * 1.55 + (y - 96) * (y - 96) * 0.011; }
const ROWS_NARROW = plankRows(3, 6);
function shortPlanks(cols) { return woodFloorRows(cols, ROWS_NARROW, 20); }
function basket(cols) {
  return (u, y, s) => {
    const v = persV(y), U = u + 4000, cu = Math.floor(U / 14), cv = Math.floor(v / 14), lu = md(U, 14), lv = md(v, 14);
    const horiz = (cu + cv) % 2 === 0, k = horiz ? lv : lu;
    if (k < 0.9 || (horiz ? lu : lv) < 0.7 / s) return cols.seam;
    return Math.floor(k / 3.5) % 2 ? cols.alt : cols.base;
  };
}
function checkerFloor(a, b, grout) {
  return (u, y, s) => { const [ri, py, ph] = rowAt(ROWS_TILE, y), T = 20, ti = Math.floor((u + 4000) / T), tp = Math.floor((u - 1 / s + 4000) / T); if (py === ph - 1 || ti !== tp) return grout; const d = (ti + ri) % 2 === 0; return py === 0 ? (d ? a.hl : b.hl) : d ? a.c : b.c; };
}
function motifTile(pal, kind) {
  return (u, y, s) => {
    const [ri, py, ph] = rowAt(ROWS_TILE, y), T = 18, ti = Math.floor((u + 4000) / T), tp = Math.floor((u - 1 / s + 4000) / T);
    if (py === ph - 1 || ti !== tp) return pal.grout;
    const lu = md(u + 4000, T) / T, lv = py / ph, cx = Math.abs(lu - 0.5) * 2, cy = Math.abs(lv - 0.5) * 2;
    if (kind === 'star') { if (cx + cy < 0.5) return (ti + ri) % 2 ? pal.a : pal.b; if (cx > 0.85 && cy > 0.85) return pal.a; }
    if (kind === 'ring') { const r = Math.hypot(cx, cy); if (Math.abs(r - 0.6) < 0.16) return pal.a; if (r < 0.2) return pal.b; }
    if (kind === 'quarter') { const r = Math.hypot(lu, lv); if (r < 0.55) return pal.a; if (Math.hypot(1 - lu, 1 - lv) < 0.55) return pal.b; }
    if (kind === 'cross') { if (cx < 0.18 || cy < 0.18) return pal.a; if (cx + cy > 1.6) return pal.b; }
    return pal.bg;
  };
}
const TILE_PALS = {
  blue: { n: I18n.s("u_be8438cc7087"), bg: '#f6f9fc', a: '#4a6aa8', b: '#7ea6dc', grout: '#d6dfe8' },
  terracotta: { n: I18n.s("u_c6a504815497"), bg: '#f3e2cf', a: '#c46a48', b: '#e59a72', grout: '#d8c1a8' },
  green: { n: I18n.s("u_8fabc966781d"), bg: '#f1f6ee', a: '#3f8f6a', b: '#86c3a0', grout: '#cfdccb' },
  mono: { n: I18n.s("u_47d88357c5ea"), bg: '#f4f4f2', a: '#2e2e34', b: '#8a8a90', grout: '#c9c9c9' },
  rose: { n: I18n.s("u_a6664df1efc8"), bg: '#fdf1f1', a: '#c4566e', b: '#ee9aaa', grout: '#e8d1d3' },
};
function speckle(base, dots, density = 9) { return (u, y) => { const h = hsh(Math.floor(u * 1.6 + 4000), y, 13); if (h % density === 0) return dots[h % dots.length]; return h % 23 === 0 ? base[1] : base[0]; }; }
function marble(base, vein) { return (u, y, s) => { const [ri, py, ph] = rowAt(ROWS_MAT, y), T = 40, ti = Math.floor((u + 4000) / T), tp = Math.floor((u - 1 / s + 4000) / T); if (py === ph - 1 || ti !== tp) return vein[1]; const w = Math.sin(u * 0.09 + y * 0.6 + ti * 2) + Math.sin(u * 0.031 - y * 0.25 + ri); return Math.abs(w) < 0.08 ? vein[0] : Math.abs(w) < 0.16 ? vein[1] : base[(hsh(Math.floor(u), y) % 9 === 0) ? 1 : 0]; }; }
function flagstone(c) { return (u, y, s) => { const [ri, py, ph] = rowAt(ROWS_MAT, y), off = (ri * 17) % 30, T = 30 + (ri % 3) * 6, ti = Math.floor((u + off + 4000) / T), tp = Math.floor((u - 1 / s + off + 4000) / T); if (py >= ph - 1 || ti !== tp) return c.grout; const h = hsh(ti, ri) % 3; return h === 0 ? c.a : h === 1 ? c.b : c.c; }; }
function fluffy(c1, c2, c3) { return (u, y) => { const h = hsh(Math.floor(u * 1.3 + 4000), y, 9); return h % 5 === 0 ? c2 : h % 7 === 0 ? c3 : c1; }; }
function stripeCarpet(a, b, edge) { return (u, y) => { const v = Math.floor(persV(y)); const m = md(v, 16); return m < 2 ? edge : m < 8 ? a : b; }; }
function plaidCarpet(c) { return (u, y) => { const v = Math.floor(persV(y)); const A = md(Math.floor(u), 16) < 4, B = md(v, 16) < 4, thin = md(Math.floor(u), 16) === 9 || md(v, 16) === 9; if (A && B) return c[0]; if (A || B) return c[1]; if (thin) return c[3]; return (Math.floor(u) + v) % 2 ? c[2] : c[4]; }; }

(function registerSurfaces() {
  let i = 0;
  const lvlOf = (n) => 1 + (n % 12), priceOf = (tier, n) => 60 + tier * 30 + (n % 4) * 10;
  // wallpapers
  for (const pid in WP_PATTERNS) {
    const P = WP_PATTERNS[pid];
    P.pals.forEach((pk, j) => {
      const id = `wp_${pid}_${pk}`, pal = WP_PAL[pk]; if (WALL[id]) return;
      WALL[id] = (x, y) => P.f(x, y, pal);
      WALLPAPERS[id] = { n: `${pal.n}${P.n}`, price: priceOf(pal.dark ? 3 : 1 + (j % 3), i), lvl: lvlOf(i + j), gen: pid, pal: pk };
      if (pal.dark) TRIM[id] = { top: [pal.f2, pal.fg, pal.b2], base: [pal.fg, pal.b2, pal.bg] };
      i++;
    });
  }
  // floors
  const add = (id, n, fn, tier) => { if (FLOOR[id]) return; FLOOR[id] = fn; FLOORS[id] = { n, price: priceOf(tier, i), lvl: lvlOf(i), gen: true }; i++; };
  for (const k in FL_WOOD) { const c = FL_WOOD[k]; add(`fl_${k}`, I18n.s("u_1df75fd516fc", [c.n]), woodFloor(c), 1); add(`fl_${k}_wide`, I18n.s("u_2d91d86765a5", [c.n]), woodFloorRows(c, ROWS_WIDE, 60), 2); }
  for (const k of ['oak', 'walnut_h', 'ash', 'cherry', 'greywash', 'maple', 'teak', 'smoke']) { const c = FL_WOOD[k] || { base: '#8c5c3d', alt: '#825437', seam: '#4a2f25', grain: '#744a31', hl: '#a06b48', n: I18n.s("u_4aaf3de0965c") }; add(`fl_${k}_short`, I18n.s("u_3308a5a24918", [c.n]), shortPlanks(c), 3); }
  for (const k of ['oak', 'ash', 'ebony', 'bamboo', 'pinkwash', 'mintwash']) { const c = FL_WOOD[k]; add(`fl_${k}_basket`, I18n.s("u_9551be2f1be9", [c.n]), basket(c), 3); }
  const CH = [[I18n.s("u_47d88357c5ea"), { c: '#2f2f36', hl: '#45454e' }, { c: '#f3f1ec', hl: '#ffffff' }, '#bdbab4'], [I18n.s("u_ae506736a67b"), { c: '#8fd0b8', hl: '#a8ddc9' }, { c: '#f6fbf8', hl: '#ffffff' }, '#cde3d9'], [I18n.s("u_6c8c7a77cdfd"), { c: '#8fb8e3', hl: '#a6c8ec' }, { c: '#f6f9fd', hl: '#ffffff' }, '#cfdbea'],
    [I18n.s("u_5e3cd6bef7d2"), { c: '#f1cf6c', hl: '#f6dc8e' }, { c: '#fffaf0', hl: '#ffffff' }, '#e6dcc0'], [I18n.s("u_dd4d3f244e67"), { c: '#a891d4', hl: '#bba8de' }, { c: '#f7f4fc', hl: '#ffffff' }, '#d9d0ea'], [I18n.s("u_bafe359f5ed0"), { c: '#8b5a3c', hl: '#9e6b4b' }, { c: '#efdcc0', hl: '#f6e8d2' }, '#b79c7f'],
    [I18n.s("u_9d50afb813da"), { c: '#f3ad8c', hl: '#f6c0a5' }, { c: '#fff6f0', hl: '#ffffff' }, '#ead3c6'], [I18n.s("u_44467431f287"), { c: '#3f8f8f', hl: '#55a3a3' }, { c: '#e9f6f6', hl: '#ffffff' }, '#b9d6d6'], [I18n.s("u_70324b659e7e"), { c: '#8a4262', hl: '#9e5677' }, { c: '#f6e6ee', hl: '#ffffff' }, '#cfb3c1'], [I18n.s("u_3bfbf21e2f00"), { c: '#4c7a5a', hl: '#5f8e6c' }, { c: '#eef4ec', hl: '#ffffff' }, '#bfd0bf']];
  for (const [n, a, b, g] of CH) add(`fl_check_${n}`, I18n.s("u_ef781a1074a8", [n]), checkerFloor(a, b, g), 2);
  const KINDS = { star: I18n.s("u_3c131b4f6a66"), ring: I18n.s("u_1c9e017c8809"), quarter: I18n.s("u_3cbd320aedb0"), cross: I18n.s("u_593c0a51fced") };
  for (const pk in TILE_PALS) for (const kk in KINDS) add(`fl_tile_${pk}_${kk}`, I18n.s("u_92e496356d5e", [TILE_PALS[pk].n, KINDS[kk]]), motifTile(TILE_PALS[pk], kk), 3);
  const TZ = [[I18n.s("u_7458865fe53b"), ['#efe8dc', '#e6ddd0'], ['#c46a48', '#4a6aa8', '#7fbf6a', '#3b2a37']], [I18n.s("u_bfd9489948d9"), ['#b9b6b3', '#aeaba8'], ['#ffffff', '#3b3b40', '#e8973d']], [I18n.s("u_d00069a5d3b5"), ['#f4d9d6', '#ecccc8'], ['#c4566e', '#ffffff', '#7fbf6a']], [I18n.s("u_59650f41f74b"), ['#33323a', '#2b2a31'], ['#f6c75a', '#ffffff', '#ee8fa0']], [I18n.s("u_ae506736a67b"), ['#d7ebe1', '#cbe2d6'], ['#3f8f6a', '#ffffff', '#e8973d']], [I18n.s("u_676ad8a9f62e"), ['#e8d5b5', '#dfcaa8'], ['#8b5a3c', '#ffffff', '#4a6aa8']]];
  for (const [n, base, dots] of TZ) add(`fl_terrazzo_${n}`, I18n.s("u_482453704ff6", [n]), speckle(base, dots, 7), 3);
  const MB = [[I18n.s("u_3366645622a7"), ['#f3f1ee', '#ecebe7'], ['#b9b5b0', '#d6d3ce']], [I18n.s("u_59650f41f74b"), ['#2d2c31', '#35343a'], ['#a7a3a0', '#55535a']], [I18n.s("u_d00069a5d3b5"), ['#f6e3e1', '#efd8d5'], ['#c79a9a', '#e2c0bf']], [I18n.s("u_a45a872a1d38"), ['#2f4f43', '#36584b'], ['#9ac0ae', '#5c8170']]];
  for (const [n, base, vein] of MB) add(`fl_marble_${n}`, I18n.s("u_b9a5ee0dddd3", [n]), marble(base, vein), 4);
  const FS = [[I18n.s("u_bfd9489948d9"), { a: '#a9a7a4', b: '#9b9996', c: '#b7b5b1', grout: '#6e6c69' }], [I18n.s("u_c035e6bdf498"), { a: '#c9a986', b: '#bd9c78', c: '#d4b693', grout: '#8a6e52' }], [I18n.s("u_dc06463a46eb"), { a: '#8ea3a3', b: '#819696', c: '#9cb0b0', grout: '#5a6b6b' }], [I18n.s("u_4a821e8f836c"), { a: '#b5624a', b: '#a85a44', c: '#bf6c52', grout: '#d9c3ae' }]];
  for (const [n, c] of FS) add(`fl_stone_${n}`, I18n.s("u_67cdff1744d3", [n]), flagstone(c), 3);
  const FL = [[I18n.s("u_ed3cdb192a56"), '#f4e7cf', '#eadbbf', '#fbf2e2'], [I18n.s("u_a6664df1efc8"), '#efb3bd', '#e5a3ae', '#f6c8cf'], [I18n.s("u_6c8c7a77cdfd"), '#a9c9ea', '#9bbde0', '#c0d8f1'], [I18n.s("u_ae506736a67b"), '#a8dac6', '#99cfba', '#bfe5d5'], [I18n.s("u_5e3cd6bef7d2"), '#f3d886', '#ebce77', '#f8e4a6'], [I18n.s("u_bfd9489948d9"), '#b4b2b8', '#a8a6ad', '#c6c4ca'],
    [I18n.s("u_bf17a47e246c"), '#43424c', '#3a3942', '#525160'], [I18n.s("u_bafe359f5ed0"), '#9b6b4e', '#906246', '#ab7b5c'], [I18n.s("u_dc3bc25414a7"), '#9aa56a', '#8f9a60', '#abb57c'], [I18n.s("u_b9ddacdd9518"), '#8a3a4e', '#7e3346', '#9b4b5f'], [I18n.s("u_9ff5c0ff5189"), '#3d4f7c', '#354572', '#4c5f8e'], [I18n.s("u_9d50afb813da"), '#f2b99b', '#eaac8d', '#f7cbb3']];
  for (const [n, a, b, c] of FL) add(`fl_fluffy_${n}`, I18n.s("u_ad9dce002618", [n]), fluffy(a, b, c), 2);
  const SC = [[I18n.s("u_9e7970805c97"), '#3d4f7c', '#f3efe6', '#c4566e'], [I18n.s("u_1a3eb0b7e2f6"), '#f3d886', '#fffaf0', '#d3a33a'], [I18n.s("u_f1b578df1440"), '#8fd0b8', '#f6fbf8', '#3f8f6a'], [I18n.s("u_361521094b12"), '#efb3bd', '#fdf1f1', '#c4566e'], [I18n.s("u_c4d29020a913"), '#b5794b', '#efdcc0', '#5e3b2f']];
  for (const [n, a, b, e] of SC) add(`fl_stripe_${n}`, I18n.s("u_6045f2c503e3", [n]), stripeCarpet(a, b, e), 2);
  const PC = [[I18n.s("u_ce3457ba31f6"), ['#2f4a3b', '#527a5f', '#6f9a7b', '#e5c36a', '#699476']], [I18n.s("u_a73e4a4da3d6"), ['#1f2b4d', '#3d5087', '#5d73b0', '#f3efe6', '#5870ac']], [I18n.s("u_144cdb61f7b5"), ['#7f5839', '#b5794b', '#d8ad77', '#2e2230', '#d3a670']], [I18n.s("u_821b3112931a"), ['#4a5064', '#7b84a0', '#a9b3cf', '#c4566e', '#a4aecb']]];
  for (const [n, c] of PC) add(`fl_plaid_${n}`, I18n.s("u_6045f2c503e3", [n]), plaidCarpet(c), 3);
  add('fl_cork', I18n.s("u_e03d1c37a1ad"), speckle(['#c9a073', '#bf966a'], ['#a87e55', '#dcb68a', '#8f6a46'], 4), 2);
  add('fl_concrete_light', I18n.s("u_1d7ba2e46926"), (u, y, s) => { const [ri, py, ph] = rowAt(ROWS_MAT, y), T = 64, ti = Math.floor((u + 4000) / T), tp = Math.floor((u - 1 / s + 4000) / T); if (py === ph - 1 || ti !== tp) return '#b3b0ae'; const h = hsh(Math.floor(u * 1.2), y, 3); return h % 7 === 0 ? '#c9c6c3' : h % 11 === 0 ? '#dad7d4' : '#d0cdca'; }, 3);
  add('fl_tatami_gold', I18n.s("u_eb322d2e4cef"), (u, y, s) => { const [ri, py, ph] = rowAt(ROWS_MAT, y), T = 60, off = (ri % 2) * 30, ti = Math.floor((u + off + 4000) / T), tp = Math.floor((u - 1 / s + off + 4000) / T); if (py >= ph - 2) return py === ph - 1 ? '#6a3f2a' : '#8a5636'; if (ti !== tp) return '#8a5636'; return py % 2 === 0 ? '#d8c27e' : '#e3cf8f'; }, 4);
  add('fl_grass', I18n.s("u_a1c59cbb8d04"), fluffy('#7fb56a', '#6fa65b', '#93c47c'), 3);
  add('fl_sand', I18n.s("u_f88bebebe7ca"), speckle(['#ecd8b0', '#e4cfa5'], ['#d7bf92', '#f6e8c9', '#c9b086'], 6), 3);
  add('fl_rubber', I18n.s("u_c772d4ea8738"), (u, y, s) => { const [ri, py, ph] = rowAt(ROWS_TILE, y), T = 22, ti = Math.floor((u + 4000) / T), tp = Math.floor((u - 1 / s + 4000) / T); const c = ['#ee9aaa', '#9fd3bf', '#9ac2e6', '#f3cf6a']; if (ti !== tp || py === ph - 1) return '#7b6f80'; return c[(ti + ri * 3) % 4]; }, 2);
})();
