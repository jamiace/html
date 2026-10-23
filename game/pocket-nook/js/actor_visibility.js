/* Autonomous actors may pass behind furniture, but rest in visible places.
   Uses the same sprite alpha and floor z order as Room.drawList(). */
const ActorVisibility = {
  maxOcclusion: 0.40,
  hiddenSeconds: 3,   // well under the 10 s limit; short enough to look like the pet simply moves on
  checkInterval: 0.25,
  randomCandidates: 30,
  gridStep: 4,
  retrySeconds: 2,
  pixels: new WeakMap(),

  clamp(x, y) {
    y = Math.max(101, Math.min(167, y));
    const [left, right] = floorX(y);
    return [Math.max(left + 6, Math.min(right - 6, x)), y];
  },
  sprite(a, pose) {
    if (a.pid != null) {
      if (!pose) pose = a.state === 'sleep' ? 'sleep' : a.state === 'act' ? PetAI.pose(a, Room.t).pose : 'sit';
      const d = a.data;
      const cv = petCanvas(a.kind, a.color, pose, 0, a.flip, d && d.acc);
      return { cv, left: -Math.floor(cv.width / 2), top: -canvasBottom(cv) };
    }
    const face = a.face === 'side' ? 'side0' : (a.face || 'front') + '0';
    const cv = avatarCanvas(face, a.cfg, null, 0, a.face === 'side' && a.flip);
    return { cv, left: -10, top: -canvasBottom(cv) };
  },
  opaquePixels(cv) {
    let result = this.pixels.get(cv);
    if (result) return result;
    const points = []; let total = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const alpha = cv.alpha[(y * cv.width + x) * 4 + 3] / 255;
      if (alpha) { points.push([x, y, alpha]); total += alpha; }
    }
    result = { points, total }; this.pixels.set(cv, result); return result;
  },
  // share of the actor's pixels that furniture in front of it covers; `own` is the item it sits, lies or stands on (never counted)
  occlusionAt(cv, left, top, z, own) {
    const mask = this.opaquePixels(cv); if (!mask.total) return 0;
    const blockers = [];
    for (const it of Room.state.items) {
      // Match Room.drawList(): furniture up to 2px in front still draws before actors.
      if (Room.layerOf(it) !== 'floor' || Room.drawDepth(Room.base(it)) <= Room.drawDepth(z, true)) continue;
      if (own && (it === own || it.p === own.uid)) continue;
      const icv = Room.itemCanvas(it);
      if (it.x >= left + cv.width || it.x + icv.width <= left || it.y >= top + cv.height || it.y + icv.height <= top) continue;
      blockers.push({ it, cv: icv });
    }
    if (!blockers.length) return 0;
    let covered = 0;
    for (const [px, py, alpha] of mask.points) {
      let remaining = 1;
      for (const { it, cv: icv } of blockers) {
        const ix = Math.floor(left + px + 0.5 - it.x), iy = Math.floor(top + py + 0.5 - it.y);
        if (ix >= 0 && iy >= 0 && ix < icv.width && iy < icv.height) remaining *= 1 - icv.alpha[(iy * icv.width + ix) * 4 + 3] / 255;
      }
      // overlapping objects cover each actor pixel only once; translucent sprites combine by opacity, holes stay visible
      covered += alpha * (1 - remaining);
    }
    return covered / mask.total;
  },
  occlusion(a, x, y, pose, depth, own) {
    const s = this.sprite(a, pose);
    const z = depth == null ? y + (a.pid != null ? 0.01 : 0) : depth;
    return this.occlusionAt(s.cv, Math.round(x) + s.left, Math.round(y) + s.top, z, own);
  },
  // where and how the actor is drawn right now, including on furniture (pet on a cat tree, owner on a sofa or in bed)
  current(a) {
    if (a.pid != null) {
      const pose = a.state === 'sleep' ? 'sleep' : a.state === 'act' ? PetAI.pose(a, Room.t).pose : 'sit';
      const s = this.sprite(a, pose), on = a.on && Room.uidMap[a.on.uid] ? a.on : null;
      return { cv: s.cv, left: Math.round(a.x) + s.left, top: Math.round(a.y) + s.top, z: on ? Room.base(on) + 0.03 : a.y + 0.01, own: on };
    }
    if (a.state === 'sit' && a.seat && Room.uidMap[a.seat.uid]) return this.seated(a, a.seat);
    if (a.state === 'sleep' && a.bed && Room.uidMap[a.bed.uid]) return this.inBed(a, a.bed);
    const s = this.sprite(a);
    return { cv: s.cv, left: Math.round(a.x) + s.left, top: Math.round(a.y) + s.top, z: a.y, own: null };
  },
  seated(a, it) {
    const [w] = itemSize(it), d = ITEMS[it.k], cv = avatarCanvas('sit0', a.cfg, null, 0);
    const [sx, sy] = d.chair ? [it.x + w / 2, it.y - 15] : [it.x + (it.flip ? w - d.seat.x : d.seat.x), it.y + d.seat.y - 22];
    return { cv, left: Math.round(sx - 10), top: Math.round(sy) - AVA_TOP, z: Room.base(it) + 0.02, own: it };
  },
  inBed(a, it) {
    const icv = Room.itemCanvas(it), b = ITEMS[it.k].bed, px = it.flip ? icv.width - b.x : b.x, cv = sleepHeadCanvas(a.cfg);
    return { cv, left: Math.round(it.x + px - 10), top: it.y + b.y - 8 - AVA_TOP, z: Room.base(it) + 0.02, own: it };
  },
  hidden(a) { const c = this.current(a); return this.occlusionAt(c.cv, c.left, c.top, c.z, c.own) > this.maxOcclusion; },
  // the owner only picks a sofa or a bed where they would be seen
  furnSafe(a, it, mode) {
    try { const c = mode === 'sleep' ? this.inBed(a, it) : this.seated(a, it); return this.occlusionAt(c.cv, c.left, c.top, c.z, c.own) <= this.maxOcclusion; } catch (e) { return true; }
  },
  safe(a, x, y, pose, depth, own) { return this.occlusion(a, x, y, pose, depth, own) <= this.maxOcclusion; },
  spotSafe(a, s, pose) {
    return this.safe(a, s.x, s.y + (s.high ? 1 : 2), pose, Room.base(s.it) + 0.03, s.it);
  },
  find(a, x, y, options = {}) {
    const origin = this.clamp(x, y), pose = options.pose;
    const accept = p => (!options.clear || options.clear(p[0], p[1])) && this.safe(a, p[0], p[1], pose);
    if (accept(origin)) return origin;
    let best = null, distance = Infinity;
    const consider = p => {
      const d = (p[0] - origin[0]) ** 2 + ((p[1] - origin[1]) * 1.4) ** 2;
      if (d < distance && accept(p)) { best = p; distance = d; }
    };
    // Prefer a nearby location so window/companion habits keep their intent.
    for (let i = 0; i < this.randomCandidates; i++) {
      const angle = Math.random() * Math.PI * 2, radius = 8 + i * 1.5;
      consider(this.clamp(origin[0] + Math.cos(angle) * radius, origin[1] + Math.sin(angle) * radius));
    }
    if (best) return best;
    // A crowded room needs a wider deterministic search, not a hidden fallback.
    for (let yy = 101; yy <= 167; yy += this.gridStep) {
      const [left, right] = floorX(yy);
      for (let xx = left + 6; xx <= right - 6; xx += this.gridStep) consider([xx, yy]);
    }
    return best;
  },
  // moving, jumping, showing a trick, eating (a few seconds) and the focus session at the desk are left alone
  protected(a) {
    return a.walking || a.jump || ['work', 'goingWork', 'deskstand', 'eat', 'trick', 'zoom', 'show', 'jump', 'hand', 'inbox'].includes(a.state);
  },
  // hidden behind furniture for a few seconds (also on a sofa, a cat tree or in bed): get up, walk out in front, carry on there
  tick(a, dt) {
    if (this.protected(a)) { a._hiddenFor = 0; a._visibilityClock = 0; return false; }
    a._visibilityClock = (a._visibilityClock || 0) + dt;
    if (a._visibilityClock < this.checkInterval) return false;
    const elapsed = a._visibilityClock; a._visibilityClock = 0;
    if (!this.hidden(a)) { a._hiddenFor = 0; return false; }
    a._hiddenFor = (a._hiddenFor || 0) + elapsed;
    if (a._hiddenFor < this.hiddenSeconds) return false;
    a._visibilityRetry = Math.max(0, (a._visibilityRetry || 0) - elapsed);
    if (a._visibilityRetry > 0) return false;
    const pet = a.pid != null, sleeping = a.state === 'sleep', remaining = a.timer;
    // where to go: from the floor in front of the furniture it is on
    let fx = a.x, fy = a.y;
    const furn = pet ? (a.on && Room.uidMap[a.on.uid] ? a.on : null) : (a.seat || a.bed);
    if (furn && Room.uidMap[furn.uid]) { const [w, h] = itemSize(furn); fx = furn.x + w / 2; fy = Math.min(167, furn.y + h + 3); }
    const pos = this.find(a, fx, fy, { pose: pet && sleeping ? 'sleep' : undefined });
    if (!pos) { a._visibilityRetry = this.retrySeconds; return false; }
    // interrupted habits may lead back behind the same object, so they are dropped; a nap goes on at the new place
    a.actCb = null; a.actPose = null; a.napAt = null; a.target = null;
    a._hiddenFor = 0; a._visibilityRetry = 0;
    const walk = () => {
      a.state = 'walk';
      a.walkTo(pos[0], pos[1], () => {
        if (pet) { a.state = sleeping ? 'sleep' : 'sit'; a.timer = sleeping ? Math.max(4, remaining || 0) : 2.5; }
        else { a.state = 'idle'; a.face = 'front'; a.timer = 2; }
      }, true);
    };
    if (pet) a.leaveSpot(walk);   // hops down from furniture first
    else { if (a.seat || a.bed) a.stand(); walk(); }
    return true;
  },
};
