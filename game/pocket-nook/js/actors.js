/* ============================================================
   Actors: avatar, pet, visitors
   ============================================================ */
function canvasBottom(cv) {
  if (cv._bottom != null) return cv._bottom;
  for (let y = cv.height - 1; y >= 0; y--) for (let x = 0; x < cv.width; x++) if (cv.alpha[(y * cv.width + x) * 4 + 3]) { cv._bottom = y; return y; }
  cv._bottom = cv.height - 1; return cv._bottom;
}
function randFloor(margin = 8) {
  const y = 104 + Math.random() * 58; const [xa, xb] = floorX(y);
  return [xa + margin + Math.random() * (xb - xa - margin * 2), y];
}
function freeFloorSpot(w = 12, hgt = 10) {
  let best = null, bestScore = -1;
  for (let i = 0; i < 40; i++) {
    const [x, y] = randFloor(14); let score = 1000;
    for (const it of Room.state.items) {
      const d = ITEMS[it.k]; if (d.layer === 'wall' || d.layer === 'rug' || it.p != null) continue;
      const cv = Room.itemCanvas(it); const dx = Math.max(it.x - (x + w / 2), (x - w / 2) - (it.x + cv.width), 0), dy = Math.max((it.y + cv.height - 8) - y, (y - hgt) - (it.y + cv.height), 0);
      score = Math.min(score, Math.hypot(dx, dy));
    }
    if (score > bestScore) { bestScore = score; best = [x, y]; } if (score > 12) break;
  }
  return best || randFloor(14);
}
function freeWallSpot(w, hgt) {
  const boxes = Room.state.items.filter(i => ITEMS[i.k].layer === 'wall' || (i.p != null && Room.layerOf(i) === 'wall')).map(i => { const cv = Room.itemCanvas(i); return [i.x - 2, i.y - 2, i.x + cv.width + 2, i.y + cv.height + 2]; });
  let best = null, bestS = -1e9;
  for (let y = 18; y <= 90 - hgt; y += 4) for (let x = 34; x <= 206 - w; x += 4) {
    let ov = 0; for (const b of boxes) { const ox = Math.max(0, Math.min(x + w, b[2]) - Math.max(x, b[0])), oy = Math.max(0, Math.min(y + hgt, b[3]) - Math.max(y, b[1])); ov += ox * oy; }
    const sc = -ov * 10 - Math.abs(x + w / 2 - 120) * 0.2 - Math.abs(y - 34) * 0.3;
    if (sc > bestS) { bestS = sc; best = [x, y]; }
  }
  return best || [120 - w / 2, 30];
}
function itemsWith(prop) { return Room.state.items.filter(it => ITEMS[it.k][prop] && it.p == null); }
function itemSize(it) { const cv = Room.itemCanvas(it); return [cv.width, cv.height]; }

class Walker {
  constructor() { this.x = 120; this.y = 140; this.tx = null; this.ty = null; this.speed = 22; this.face = 'front'; this.flip = false; this.anim = 0; this.onArrive = null; this.walking = false; }
  walkTo(x, y, cb, allowHidden = false) {
    if (!allowHidden) {
      const pos = ActorVisibility.find(this, x, y);
      if (!pos) {
        this.walking = false; this.onArrive = null; this.tx = null; this.ty = null;
        this.state = this.pid != null ? 'sit' : 'idle'; this.timer = ActorVisibility.retrySeconds;
        this.target = null; this.napAt = null; this.actCb = null;
        if (this.pid != null) { this.speed = this.baseSpeed(); this.zoomN = 0; }
        return false;
      }
      [x, y] = pos;
    }
    this._hiddenFor = 0; this._visibilityClock = 0;
    const [xa, xb] = floorX(Math.max(100, Math.min(167, y)));
    this.tx = Math.max(xa + 6, Math.min(xb - 6, x)); this.ty = Math.max(101, Math.min(167, y)); this.onArrive = cb || null; this.walking = true;
  }
  step(dt) {
    if (!this.walking) return;
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
    if (d < 0.8) { this.x = this.tx; this.y = this.ty; this.walking = false; const cb = this.onArrive; this.onArrive = null; if (cb) cb(); return; }
    const v = Math.min(d, this.speed * dt); this.x += dx / d * v; this.y += dy / d * v * 0.85;
    if (Math.abs(dx) > Math.abs(dy) * 1.1) { this.face = 'side'; this.flip = dx < 0; } else this.face = dy > 0 ? 'front' : 'back';
    // pets only have a side view: they always face the way they walk, even on a mostly up/down path (no walking backwards)
    if (this.pid != null && Math.abs(dx) > 0.5) this.flip = dx < 0;
    this.anim += dt;
  }
}

class Avatar extends Walker {
  constructor(cfgFn) {
    super(); this.cfgFn = cfgFn; this.state = 'idle'; this.timer = 1.5; this.blink = 3; this.eyes = null; this.happy = 0; this.hop = 0; this.seat = null; this.bed = null; this.speed = 20;
  }
  get cfg() { return this.cfgFn(); }
  z() { if ((this.state === 'work' || this.state === 'sit') && this.seat && Room.uidMap[this.seat.uid]) return Room.base(this.seat) + 0.02; if (this.state === 'sleep' && this.bed && Room.uidMap[this.bed.uid]) return Room.base(this.bed) + 0.02; return this.y; }
  headPos() {
    if (this.state === 'sleep' && this.bed) { const [w] = itemSize(this.bed); const b = ITEMS[this.bed.k].bed; const px = this.bed.flip ? w - b.x : b.x; return [this.bed.x + px, this.bed.y + 2]; }
    if ((this.state === 'work' || this.state === 'sit') && this.seat) { const p = this.seatPos(); return [p[0], p[1] - 1]; }
    return [this.x, this.y - 29 - this.hopOff()];
  }
  hopOff() { return this.hop > 0 ? Math.round(Math.sin(this.hop / 0.45 * Math.PI) * 5) : 0; }
  seatPos() {
    const it = this.seat, [w, h] = itemSize(it), d = ITEMS[it.k];
    if (d.chair) return [it.x + w / 2, it.y - 15];
    const s = d.seat; const sx = it.flip ? w - s.x : s.x; return [it.x + sx, it.y + s.y - 22];
  }
  stand() {
    if (this.state === 'work' || this.state === 'sit') { const it = this.seat; if (it && Room.uidMap[it.uid]) { const [w, h] = itemSize(it); this.x = it.x + w / 2; this.y = it.y + h + 3; } }
    if (this.state === 'sleep') { const it = this.bed; if (it && Room.uidMap[it.uid]) { const [w, h] = itemSize(it); this.x = it.x + w / 2; this.y = it.y + h + 3; } }
    if (this.y > 167) this.y = 167;
    this.state = 'idle'; this.seat = null; this.bed = null; this.face = 'front';
  }
  goWork() {
    const desks = itemsWith('desk'); const chairs = itemsWith('chair');
    let chair = null;
    if (desks.length && chairs.length) { const dk = desks[0], [dw] = itemSize(dk); let best = 1e9; for (const ch of chairs) { const [cw] = itemSize(ch); const dd = Math.abs((ch.x + cw / 2) - (dk.x + dw / 2)) + Math.abs(ch.y - dk.y) * 0.5; if (dd < best) { best = dd; chair = ch; } } }
    else if (chairs.length) chair = chairs[0];
    this.state = 'goingWork';
    if (chair) { const [w, h] = itemSize(chair); this.walkTo(chair.x + w / 2, chair.y + h + 3, () => { if (Game.focusing() && Room.uidMap[chair.uid]) { this.state = 'work'; this.seat = chair; } else this.state = 'idle'; }, true); }
    else if (desks.length) { const dk = desks[0], [w, h] = itemSize(dk); this.walkTo(dk.x + 14, dk.y + h + 3, () => { this.state = Game.focusing() ? 'deskstand' : 'idle'; this.face = 'back'; }, true); }
    else { this.state = 'idle'; this.timer = 4; }
  }
  think() {
    if (Game.focusing()) { if (this.state !== 'work' && this.state !== 'goingWork' && this.state !== 'deskstand') { this.stand(); this.goWork(); } return; }
    if (this.state === 'work' || this.state === 'deskstand' || this.state === 'goingWork') { this.stand(); this.timer = 1; this.happy = 1.5; return; }
    if (this.state === 'sleep' || this.state === 'sit') { this.stand(); this.timer = 1 + Math.random() * 2; return; }
    const h = Room.env.h, night = h >= 23 || h < 6;
    const r = Math.random();
    const seats = itemsWith('seat').filter(it => ActorVisibility.furnSafe(this, it, 'sit')), beds = itemsWith('bed').filter(it => ActorVisibility.furnSafe(this, it, 'sleep')), wins = Room.state.items.filter(i => ITEMS[i.k].window);
    if (night && beds.length && r < 0.5) return this.goSleep(beds[0]);
    if (r < 0.42) { const [x, y] = randFloor(); this.state = 'walk'; this.walkTo(x, y, () => { this.state = 'idle'; this.timer = 1.5 + Math.random() * 3; }); return; }
    if (r < 0.58 && seats.length) { const s = seats[Math.floor(Math.random() * seats.length)]; const [w, h2] = itemSize(s); const sp = ITEMS[s.k].seat; const sx = s.flip ? w - sp.x : sp.x; this.state = 'walk'; this.walkTo(s.x + sx, s.y + h2 + 3, () => { if (!Room.uidMap[s.uid]) { this.state = 'idle'; return; } this.state = 'sit'; this.seat = s; this.timer = 8 + Math.random() * 10; }, true); return; }
    if (r < 0.68 && wins.length) { const w = wins[Math.floor(Math.random() * wins.length)]; this.state = 'walk'; this.walkTo(w.x + 20, 106, () => { this.state = 'idle'; this.face = 'back'; this.timer = 3 + Math.random() * 3; }); return; }
    if (r < 0.78 && Game.pets && Game.pets.length) { const p = Game.pets[Math.floor(Math.random() * Game.pets.length)]; this.state = 'walk'; this.walkTo(p.x + (p.x > 120 ? -14 : 14), p.y + 2, () => { this.state = 'idle'; this.face = 'side'; this.flip = p.x < this.x; this.timer = 2.5; Room.puff('p_heart', p.x - 2, p.y - 18, { vy: -8 }); }); return; }
    if (r < 0.84 && beds.length && Math.random() < 0.4) return this.goSleep(beds[0], 12 + Math.random() * 10);
    this.state = 'idle'; this.face = 'front'; this.timer = 2 + Math.random() * 3;
  }
  goSleep(bed, secs) {
    const [w, h] = itemSize(bed); this.state = 'walk';
    this.walkTo(bed.x + w / 2, bed.y + h + 3, () => { if (!Room.uidMap[bed.uid]) { this.state = 'idle'; return; } this.state = 'sleep'; this.bed = bed; this.timer = secs || 25 + Math.random() * 30; }, true);
  }
  poke() {
    if (this.state === 'show') { this.happy = 1; return; }
    if (this.state === 'sleep') { this.stand(); Game.bubble(this, '嗯…早安！', 2.2); this.happy = 1.4; this.timer = 3; return; }
    if (this.state === 'work') { Game.bubble(this, ['專心中！', '再一下下～', '加油加油', '快完成了！'][Math.floor(Math.random() * 4)], 2); this.happy = 1.2; Room.puff('p_spark', this.headPos()[0], this.headPos()[1], { vy: -6 }); return; }
    this.hop = 0.45; this.happy = 1.6; this.face = 'front';
    Room.puff('p_heart', this.x - 2, this.y - 34, { vy: -10 });
    Game.bubble(this, ['嗨！', '今天也要好好的', '喝口水吧', '來點音樂？', '心情不錯～', '要不要專注一下？'][Math.floor(Math.random() * 6)], 2.2);
  }
  update(dt) {
    this.step(dt);
    if (ActorVisibility.tick(this, dt)) return;
    if (this.hop > 0) this.hop -= dt;
    if (this.happy > 0) this.happy -= dt;
    this.blink -= dt; if (this.blink < -0.13) this.blink = 2.5 + Math.random() * 3;
    if (this.state === 'show') { if (!TrickShow.busy()) { this.state = 'idle'; this.show = null; this.timer = 1; } return; }
    if (!this.walking) {
      this.timer -= dt;
      if (Game.focusing() && this.state !== 'work' && this.state !== 'goingWork' && this.state !== 'deskstand') this.think();
      else if (!Game.focusing() && (this.state === 'work' || this.state === 'deskstand')) this.think();
      else if (this.timer <= 0 && this.state !== 'goingWork') this.think();
      if (this.state === 'sleep' && Math.random() < dt * 0.6) { const [hx, hy] = this.headPos(); Room.puff('p_z', hx + 4, hy - 4, { vx: 3, vy: -5, max: 2, alpha: 0.8 }); }
    }
  }
  eyeState() { if (this.state === 'sleep') return 'closed'; if (this.happy > 0) return 'happy'; return this.blink < 0 ? 'closed' : null; }
  draw(c) {
    const cfg = this.cfg, t = Room.t;
    if (this.state === 'sleep' && this.bed && Room.uidMap[this.bed.uid]) {
      const bed = this.bed, bc = Room.itemCanvas(bed), b = ITEMS[bed.k].bed, px = bed.flip ? bc.width - b.x : b.x;
      const head = sleepHeadCanvas(cfg); c.drawImage(head, Math.round(bed.x + px - 10), bed.y + b.y - 8 - AVA_TOP + (Math.sin(t * 1.5) > 0.6 ? 1 : 0));
      const by = b.blanketY || 18; c.drawImage(bc, 0, by, bc.width, bc.height - by, bed.x, bed.y + by, bc.width, bc.height - by);
      return;
    }
    if ((this.state === 'work' || this.state === 'sit') && this.seat && Room.uidMap[this.seat.uid]) {
      const [sx, sy] = this.seatPos(), it = this.seat, d = ITEMS[it.k];
      if (d.chair) {
        const fr = Math.floor(t * 4) % 2 ? 'type1' : 'type0';
        c.drawImage(avatarCanvas(fr, cfg, null, Math.floor(t * 1.2) % 2), Math.round(sx - 10), Math.round(sy) - AVA_TOP);
        c.drawImage(Room.itemCanvas(it), it.x, it.y);
        if (Math.random() < 0.01) Room.puff('p_note', sx + 6, sy + 2, { vx: 4, vy: -7, max: 1.6, alpha: 0.7 });
      } else {
        c.drawImage(avatarCanvas('sit0', cfg, this.eyeState(), Math.floor(t * 1.1) % 2), Math.round(sx - 10), Math.round(sy) - AVA_TOP);
      }
      return;
    }
    const x = Math.round(this.x), y = Math.round(this.y);
    c.fillStyle = 'rgba(46,34,48,0.22)'; c.fillRect(x - 5, y - 1, 10, 2); c.fillRect(x - 3, y + 1, 6, 1);
    let frame, flip = false, bob = 0;
    if (this.walking) {
      const f = Math.floor(this.anim * 8) % 4;
      if (this.face === 'side') { frame = 'side' + [1, 2, 3, 2][f]; flip = this.flip; frame = 'side' + f; }
      else frame = this.face + [1, 0, 2, 0][f];
    } else {
      const v = this.state === 'deskstand' ? 'back' : this.face;
      frame = v === 'side' ? 'side0' : v + '0'; flip = v === 'side' && this.flip;
      bob = Math.floor(t * (typeof Music !== 'undefined' && Music.playing ? 2.6 : 1.3)) % 2;
    }
    const cv = avatarCanvas(frame, cfg, this.eyeState(), bob, flip), top = y - canvasBottom(cv) - this.hopOff();
    c.drawImage(cv, x - 10, top);
    if (this.state === 'show' && !this.walking) TrickShow.drawOwner(c, this, cv, x, top);
  }
  hit(x, y) {
    if (this.state === 'sleep' && this.bed) { const [hx, hy] = this.headPos(); return Math.abs(x - hx) < 8 && y > hy - 2 && y < hy + 14; }
    if ((this.state === 'work' || this.state === 'sit') && this.seat) { const [sx, sy] = this.seatPos(); return Math.abs(x - sx) < 9 && y > sy && y < sy + 26; }
    return Math.abs(x - this.x) < 8 && y > this.y - 28 && y < this.y + 1;
  }
}

class Pet extends Walker {
  constructor(pid) { super(); this.pid = pid; const d = Pets.get(pid); this.set(d ? d.sp : 'cat:ginger'); this.state = 'sit'; this.timer = 1 + Math.random() * 2; this.speed = 24; this.x = 150; this.y = 150; this.on = null; this.jump = null; this.happy = 0; this.trick = null; }
  get data() { return Pets.get(this.pid); }
  // every walk starts on the floor: a walk begun while still on furniture would end with the pet snapped back onto it
  walkTo(x, y, cb, allowHidden) {
    if (this.on && !this.jump) { const st = this.state; this.leaveSpot(() => { if (this.state === 'sit' && st !== 'sit') this.state = st; super.walkTo(x, y, cb, allowHidden); }); return true; }
    return super.walkTo(x, y, cb, allowHidden);
  }
  baseSpeed() { const d = this.data; return d && Pets.stage(d) === 0 ? 28 : 24; }
  set(kc) { const [k, c] = kc.split(':'); this.kind = k; this.color = c; }
  others() { return (Game.pets || []).filter(a => a !== this); }
  goNap() { this.leaveSpot(() => { const sp = this.freeSpots(); const s = sp[Math.floor(Math.random() * sp.length)]; if (s) this.goSpot(s, 'sleep', 40 + Math.random() * 30); else this.floorNap(40); }); }
  // a spot is taken while another pet lies on it or is on its way there
  freeSpots() { const taken = new Set(); for (const a of this.others()) { if (a.on) taken.add(a.on.uid); if (a.target) taken.add(a.target); } return this.spots().filter(s => !taken.has(s.it.uid) && ActorVisibility.spotSafe(this, s, 'sit') && ActorVisibility.spotSafe(this, s, 'sleep')); }
  // no free bed or cushion: curl up on an empty patch of floor away from the others
  floorNap(secs) {
    const sleepers = this.others().filter(a => a.state === 'sleep' || a.napAt).map(a => a.napAt || [a.x, a.y]);
    const clear = (x, y) => sleepers.every(([px, py]) => Math.abs(px - x) > 18 || Math.abs(py - y) > 10);
    const near = PetAI.napNear(this) || [this.x, this.y];
    const pos = ActorVisibility.find(this, near[0], near[1], { pose: 'sleep', clear });
    if (!pos) { this.state = 'sit'; this.timer = 3; return; }
    this.napAt = pos; this.state = 'walk';
    this.walkTo(pos[0], pos[1], () => { this.napAt = null; if (this.others().some(a => a.state === 'sleep' && !a.on && Math.abs(a.x - this.x) <= 18 && Math.abs(a.y - this.y) <= 10)) return this.floorNap(secs); this.state = 'sleep'; this.timer = secs || 20 + Math.random() * 20; PetAI.sleepSpin(this); }, true);
  }
  doTrick(id) { return TrickShow.start(this, id); }
  z() { if (this.on && Room.uidMap[this.on.uid]) return Room.base(this.on) + 0.03; return this.y + 0.01; }
  spots() {
    const out = [];
    for (const it of Room.state.items) {
      const d = ITEMS[it.k]; if (it.p != null) continue; let sp = d.petSpot; if (!sp && d.bed) sp = { x: 36, y: 21 }; if (!sp) continue;
      const [w, h] = itemSize(it); const sx = it.flip ? w - sp.x : sp.x; const wy = it.y + sp.y, base = it.y + h;
      out.push({ it, x: it.x + sx, y: wy, base, high: base - wy > 6 });
    }
    return out;
  }
  leaveSpot(cb) {
    this.target = null; this.napAt = null;
    if (this.on) { const it = this.on, [w, h] = itemSize(it); const fy = Math.min(167, it.y + h + 3); const fx = this.x; this.on = null; this.onOff = null; if (this.y < fy - 6) this.startJump(fx, fy, () => { cb && cb(); }); else cb && cb(); }
    else cb && cb();
  }
  startJump(x, y, cb, hgt = 10) { this.jump = { x0: this.x, y0: this.y, x1: x, y1: y, t: 0, cb, hgt }; this.state = this.state === 'trick' ? 'trick' : 'jump'; if (x !== this.x) this.flip = x < this.x; }
  bowl() { const d = this.data; return (d && (Pets.bowlFor(d) || Pets.bowlShown(d))) || Pets.bowls()[0]; }
  eat() {
    const bowl = this.bowl(); this.zoomN = 0; this.speed = this.baseSpeed();
    this.leaveSpot(() => {
      if (bowl) {
        const [w, h] = itemSize(bowl);
        const eaters = this.others().filter(a => a.state === 'eat' || a.eatBowl === bowl).length;
        const side = (eaters % 2 ? -1 : 1) * (this.x < bowl.x + w / 2 ? -1 : 1), off = 11 + Math.floor(eaters / 2) * 10;
        this.state = 'walk'; this.walkTo(bowl.x + w / 2 + side * off, bowl.y + h - 1 + Math.floor(eaters / 2) * 3, () => { this.state = 'eat'; this.flip = side > 0; this.timer = 4; this.eatBowl = bowl; }, true);
      } else { this.state = 'eat'; this.timer = 3; this.eatBowl = null; }
    });
  }
  eatAt(b) {
    const [w, h] = itemSize(b), side = this.x < b.x + w / 2 ? -1 : 1;
    this.state = 'walk'; this.eatBowl = b;
    this.walkTo(b.x + w / 2 + side * 11, b.y + h - 1, () => {
      if (!Room.uidMap[b.uid]) { this.eatBowl = null; this.state = 'sit'; this.timer = 2; return; }
      this.state = 'eat'; this.flip = side > 0; this.timer = 4; const ate = Pets.eatFromBowl(this.data, b, 40);
      if (ate > 0 && Math.random() < 0.5) Game.bubble(this, this.kind === 'dog' ? '汪！好吃' : '喵～好吃', 1.6);
    }, true);
  }
  zoom(n = 6) { this.leaveSpot(() => { this.zoomN = n; this.speed = 70; this.state = 'zoom'; this.timer = 0; }); }
  think() {
    const r = Math.random(), A = Game.avatar, d = this.data;
    const go = (fn) => this.leaveSpot(fn);
    const L = Game.S.life;
    if (d && d.hunger < 50 && !d.sick) { const b = Pets.bowlFor(d); if (b && !this.others().some(a => a.eatBowl === b && a.state === 'eat')) return go(() => this.eatAt(b)); }
    if (L && L.needs.some(n => n.type === 'cat_hungry' && n.pet === this.pid) && r < 0.5) {
      const b = this.bowl(); if (b) { const [w, h] = itemSize(b); return go(() => { this.state = 'walk'; this.walkTo(b.x + w / 2 + 12, b.y + h - 1, () => { this.state = 'sit'; this.flip = true; this.timer = 4 + Math.random() * 3; Game.bubble(this, this.kind === 'dog' ? '汪…餓餓' : '喵…肚子餓', 2); }); }); }
    }
    if (d && (d.energy < 22 || (d.trait === 'sleepy' && r < 0.25) || d.sick) && Math.random() < 0.8) { const sp = this.freeSpots(); if (sp.length) { const s = sp[Math.floor(Math.random() * sp.length)]; return go(() => this.goSpot(s, 'sleep', 30 + Math.random() * 30)); } return go(() => this.floorNap(30 + Math.random() * 30)); }
    // furniture used in its own way: boxes, soft spots, posts, rugs, plants; dogs at your feet while you focus
    if (PetPlay.think(this, go)) return;
    if (A && A.state === 'work' && r < 0.45) {
      const sp = this.freeSpots(); const near = sp.sort((a, b) => Math.abs(a.x - A.x) - Math.abs(b.x - A.x))[0];
      if (near) return go(() => this.goSpot(near, 'sleep'));
    }
    // free time: relationships with the other pets, then this pet's own habits
    { const rr = Math.random(); if (rr < REL_CHANCE && PetAI.relate(this, go)) return; if (rr < REL_CHANCE + HABIT_CHANCE && PetAI.habit(this, go)) return; }
    const os = this.others();
    if (os.length && r < 0.14) { const o = os[Math.floor(Math.random() * os.length)]; if (!o.on && o.state !== 'sleep') return go(() => { this.state = 'walk'; this.walkTo(o.x + (o.x > this.x ? -13 : 13), o.y + 1, () => { this.state = 'sit'; this.flip = o.x < this.x; this.timer = 2.5 + Math.random() * 2; if (PetAI.snub(o, this)) return; Room.puff('p_heart', (this.x + o.x) / 2 - 2, this.y - 16, { vy: -8 }); if (Math.random() < 0.5) Game.bubble(this, this.kind === 'dog' ? '汪？' : '喵？', 1.4); }); }); }
    const roam = d && (d.trait === 'curious' || d.trait === 'playful') ? 0.45 : 0.35;
    if (r < roam) return go(() => { const [x, y] = randFloor(10); this.state = 'walk'; this.walkTo(x, y, () => { this.state = 'sit'; this.timer = 2 + Math.random() * 4; }); });
    if (r < roam + 0.25) { const sp = this.freeSpots(); if (sp.length) { const s = sp[Math.floor(Math.random() * sp.length)]; return go(() => this.goSpot(s, Math.random() < 0.6 ? 'sleep' : 'sit')); } }
    if (r < roam + 0.4 && A && A.state !== 'sleep' && A.state !== 'work') return go(() => { this.state = 'walk'; this.walkTo(A.x + (Math.random() < 0.5 ? -16 : 16), A.y + 3, () => { this.state = 'sit'; this.flip = A.x < this.x; this.timer = 3 + Math.random() * 3; }); });
    this.state = this.on ? this.state : 'sit'; this.timer = 2 + Math.random() * 4;
  }
  goSpot(s, mode, secs) {
    this.state = 'walk'; this.target = s.it.uid;
    const fy = Math.min(167, s.base + 3);
    this.walkTo(s.x, s.high ? fy : s.y + 2, () => {
      this.target = null;
      if (!Room.uidMap[s.it.uid]) { this.state = 'sit'; this.timer = 2; return; }
      if (!ActorVisibility.spotSafe(this, s, mode)) {
        const sp = this.freeSpots().filter(q => q.it.uid !== s.it.uid);
        if (sp.length) return this.goSpot(sp[0], mode, secs);
        if (mode === 'sleep') return this.floorNap(secs);
        this.state = 'sit'; this.timer = 1; return;
      }
      if (this.others().some(a => a.on === s.it)) { if (mode === 'sleep') { const sp = this.freeSpots(); if (sp.length) return this.goSpot(sp[Math.floor(Math.random() * sp.length)], mode, secs); return this.floorNap(secs); } this.state = 'sit'; this.timer = 1.5; return; }
      const done = () => { this.on = s.it; this.onOff = [this.x - s.it.x, this.y - s.it.y]; this.state = mode; this.timer = secs || (mode === 'sleep' ? 14 + Math.random() * 20 : 4 + Math.random() * 4);
        // on something soft it kneads it a little before curling up
        if (mode === 'sleep' && PetPlay.isSoft(s.it) && Math.random() < 0.7) { const t = this.timer; PetAI.act(this, 'knead', 1.8 + Math.random(), () => { if (this.on === s.it) { this.state = 'sleep'; this.timer = t; PetAI.sleepSpin(this); } }); return; }
        if (mode === 'sleep') PetAI.sleepSpin(this); };
      if (s.high) this.startJump(s.x, s.y + 1, done); else { this.y = s.y + 2; done(); }
    }, true);
  }
  poke() {
    if (this.state === 'eat' || this.state === 'zoom' || this.state === 'trick') return;
    if (this.state === 'hand') { if (typeof Pets !== 'undefined') Pets.pet(this.pid); this.happy = 1.5; Room.puff('p_heart', this.x - 2, this.y - 18, { vy: -9 }); return; }
    if (typeof Pets !== 'undefined') Pets.pet(this.pid);
    this.leaveSpot(() => { }); this.happy = 1.5;
    if (this.state !== 'jump') { this.state = 'sit'; this.timer = 3; }
    for (let i = 0; i < 2; i++) Room.puff('p_heart', this.x - 4 + i * 5, this.y - 18, { vy: -9 - i * 3, vx: (i - 0.5) * 6 });
    const d = this.data, nm = d ? d.name : '';
    Game.bubble(this, this.kind === 'dog' ? ['汪！', '汪汪～', '摸摸頭！', nm + '在這裡！'][Math.floor(Math.random() * 4)] : ['喵～', '喵嗚', '呼嚕呼嚕…', nm + '喵～'][Math.floor(Math.random() * 4)], 1.8);
  }
  headPos() { return [this.x + (this.flip ? -4 : 4), this.y - 16]; }
  update(dt) {
    if (this.happy > 0) this.happy -= dt;
    if (this.jump) {
      const j = this.jump; j.t += dt / 0.42; const k = Math.min(1, j.t);
      this.x = j.x0 + (j.x1 - j.x0) * k; this.y = j.y0 + (j.y1 - j.y0) * k - Math.sin(k * Math.PI) * (j.hgt || 10);
      if (k >= 1) { this.jump = null; this.y = j.y1; if (this.state !== 'trick' && this.state !== 'hand') { this.state = 'sit'; this.timer = 2; } j.cb && j.cb(); }
      return;
    }
    PetAI.tick(this, dt);
    if (this.on && !Room.uidMap[this.on.uid]) { this.on = null; const [x, y] = randFloor(); this.x = x; this.y = y; }
    if (this.on && !this.walking && this.onOff) { this.x = this.on.x + this.onOff[0]; this.y = this.on.y + this.onOff[1]; }
    if (this.on && (this.state === 'sleep' || this.state === 'sit' || this.state === 'inbox')) PetPlay.noteSpot(this, dt);
    // being cared for or played with by hand, or sitting in a box
    if (this.hp && this.state !== 'hand') this.hp = null;   // a hand scene that something else interrupted
    if (this.state === 'hand') { PetPlay.petUpdate(this, dt); return; }
    if (this.state === 'inbox') { PetPlay.boxUpdate(this, dt); return; }
    this.step(dt);
    if (ActorVisibility.tick(this, dt)) return;
    if (this.state === 'eat' && !this.walking) {
      this.timer -= dt; if (Math.random() < dt * 5) Room.puff('p_dot', this.x + (this.flip ? -8 : 8), this.y - 6, { vy: -4, vx: (Math.random() - 0.5) * 6, grav: 20, max: 0.5 });
      if (this.timer <= 0) { this.eatBowl = null; this.state = 'sit'; this.happy = 2; this.timer = 3; Room.puff('p_heart', this.x - 2, this.y - 18, { vy: -9 }); Game.bubble(this, this.kind === 'dog' ? '汪！好吃！' : '喵～吃飽了', 2); PetAI.afterEat(this); }
      return;
    }
    if (this.state === 'act') { if (!this.walking) PetAI.update(this, dt); PetAI.react(this, dt); return; }
    if (this.state === 'zoom') {
      if (!this.walking) { if (this.zoomN-- > 0) { const [x, y] = randFloor(12); this.walkTo(x, y); Room.puff('p_spark', this.x, this.y - 8, { vy: -6, max: 0.6 }); } else { this.speed = this.baseSpeed(); this.state = 'sit'; this.happy = 2.5; this.timer = 4; Room.puff('p_heart', this.x - 2, this.y - 18, { vy: -9 }); } }
      return;
    }
    if (this.state === 'trick') { TrickShow.update(this, dt); return; }
    if (this.state !== 'sleep') PetAI.react(this, dt);
    if (!this.walking) { this.timer -= dt; if (this.timer <= 0) this.think(); }
    if (this.state === 'sleep' && !(this.preSleep > 0) && Math.random() < dt * 0.4) Room.puff('p_z', this.x + (this.flip ? -8 : 6), this.y - 14, { vx: 3, vy: -4, max: 1.8, alpha: 0.7 });
  }
  draw(c) {
    if (this.state === 'trick' && TrickShow.drawPet(c, this)) return;
    if ((this.state === 'hand' || this.state === 'inbox') && PetPlay.drawPet(c, this)) return;
    const t = Room.t; let pose = 'sit', f = Math.floor(t * 1.4) % 2; let flip = this.flip, hop = 0;
    if (this.walking) { pose = 'walk'; f = Math.floor(this.anim * 9) % 4; }
    else if (this.state === 'jump') { pose = 'walk'; f = 1; }
    else if (this.state === 'sleep' && this.preSleep > 0) { pose = 'walk'; f = Math.floor(this.preSleep * 10) % 4; flip = Math.floor(this.preSleep * 4) % 2 === 0; }
    else if (this.state === 'sleep') { pose = 'sleep'; f = Math.floor(t * 0.8) % 2; }
    else if (this.state === 'act') { const q = PetAI.pose(this, t); pose = q.pose; f = q.f; if (q.flip != null) flip = q.flip; }
    else if (this.state === 'eat') { pose = 'sit'; f = Math.floor(t * 6) % 2; }
    const d = this.data;
    const cv = petCanvas(this.kind, this.color, pose, f, flip, d && d.acc);
    const x = Math.round(this.x), y = Math.round(this.y);
    if (!this.on && !this.jump) { c.fillStyle = 'rgba(46,34,48,0.2)'; c.fillRect(x - 6, y - 1, 12, 2); }
    c.drawImage(cv, x - Math.floor(cv.width / 2), y - canvasBottom(cv) - hop);
    if (d && d.sick && Math.floor(t * 2) % 2) { c.fillStyle = '#84cbbd'; c.fillRect(x + (flip ? -9 : 7), y - 17, 2, 2); c.fillRect(x + (flip ? -11 : 9), y - 20, 1, 1); }
  }
  hit(x, y) { return Math.abs(x - this.x) < 10 && y > this.y - 16 && y < this.y + 1; }
}

class Visitor extends Avatar {
  constructor(peer) { super(() => this.pcfg); this.peer = peer.peer; this.pcfg = defaultAvatar(); this.applyPresence(peer.presence); const [x, y] = randFloor(); this.x = x; this.y = y; this.speed = 16; }
  applyPresence(p) {
    p = p || {}; const a = p.ava || {};
    const pick = (v, list, d) => (typeof v === 'string' && (Array.isArray(list) ? list.includes(v) : v in list)) ? v : d;
    this.pcfg = sanitizeAvatar(a);
    this.nick = typeof p.nick === 'string' ? p.nick.slice(0, 16) : '';
    this.st = p.st === 'focus' || p.st === 'break' ? p.st : 'idle'; this.end = typeof p.end === 'number' ? p.end : 0;
    if (p.say && typeof p.say.t === 'string' && typeof p.say.ts === 'number' && p.say.ts !== this.lastSay) { this.lastSay = p.say.ts; if (Date.now() - p.say.ts < 15000) Game.bubble(this, p.say.t.slice(0, 60), 4); }
  }
  think() { const r = Math.random(); if (r < 0.5) { const [x, y] = randFloor(); this.state = 'walk'; this.walkTo(x, y, () => { this.state = 'idle'; this.timer = 3 + Math.random() * 5; }); } else { this.state = 'idle'; this.face = 'front'; this.timer = 3 + Math.random() * 4; } }
  update(dt) { this.step(dt); if (ActorVisibility.tick(this, dt)) return; if (this.hop > 0) this.hop -= dt; if (this.happy > 0) this.happy -= dt; this.blink -= dt; if (this.blink < -0.13) this.blink = 2.5 + Math.random() * 3; if (!this.walking) { this.timer -= dt; if (this.timer <= 0) this.think(); } }
  poke() { this.hop = 0.45; this.happy = 1.4; Room.puff('p_heart', this.x - 2, this.y - 34, { vy: -10 }); }
}
