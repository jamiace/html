/* ============================================================
   Room engine: diorama, textures, sky, lighting, items, particles
   ============================================================ */
const RW = 240, RH = 180;
const R = { wx0: 30, wx1: 210, wy0: 12, wy1: 96, fy1: 170, fxf0: 6, fxf1: 234 };
function floorX(y) { const t = (y - 96) / 74; return [30 + (6 - 30) * t, 210 + (234 - 210) * t]; }
const HEX = {};
function rgb(h) { let c = HEX[h]; if (!c) { c = HEX[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; } return c; }
function hsh(a, b, c = 0) { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0); }

// These are the same view_*.png sprites used for the exported window previews.
// Only the three redrawn views use this renderer; forest/sakura keep their original code.
const WindowScenery={load(){},draw(){return false}};
for(const id of ['city','sea','snow'])WindowScenery.load(id);

// ---------- wallpapers: (x,y) in back-wall space (0..180, 0..84) → hex ----------
const WALL=Object.fromEntries(Object.keys(PurrAssets.catalog.catalog.WALLPAPERS).map(id=>[id,{png:id}]));
// ---------- floors: perspective coords ----------
const FLOOR=Object.fromEntries(Object.keys(PurrAssets.catalog.catalog.FLOORS).map(id=>[id,{png:id}]));

const TRIM={};
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
  buildBg(wp, fl, canvas) {throw Error("PNG renderer not installed")},
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
  skyCols(h) {throw Error("PNG renderer not installed")},
  drawWindowScene(c, X, Y, w, h, view) {throw Error("PNG renderer not installed")},
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
  drawItem(c, it) {throw Error("PNG renderer not installed")},
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
      if(it.fallen&&typeof CozyRefine!=='undefined'){const b=CozyRefine.spill(it);if(x>=b.x-2&&x<b.x+b.w+2&&y>=b.y-2&&y<b.y+b.h+2)return e;}
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
