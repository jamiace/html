/* Autonomous actors may pass behind furniture, but rest in visible places.
   Uses the same sprite alpha and floor z order as Room.drawList(). */
const ActorVisibility = {
  maxOcclusion: 0.40,
  hiddenSeconds: 1.5,
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
  occlusion(a, x, y, pose, depth) {
    const s = this.sprite(a, pose), mask = this.opaquePixels(s.cv);
    if (!mask.total) return 0;
    const left = Math.round(x) + s.left, top = Math.round(y) + s.top;
    const z = depth == null ? y + (a.pid != null ? 0.01 : 0) : depth;
    const blockers = [];
    for (const it of Room.state.items) {
      // Walls/rugs render before actors. Equal-z items also render first.
      if (Room.layerOf(it) !== 'floor' || Room.base(it) <= z) continue;
      const cv = Room.itemCanvas(it);
      if (it.x >= left + s.cv.width || it.x + cv.width <= left || it.y >= top + s.cv.height || it.y + cv.height <= top) continue;
      blockers.push({ it, cv });
    }
    if (!blockers.length) return 0;
    let covered = 0;
    for (const [px, py, alpha] of mask.points) {
      let remaining = 1;
      for (const { it, cv } of blockers) {
        const ix = Math.floor(left + px + 0.5 - it.x), iy = Math.floor(top + py + 0.5 - it.y);
        if (ix >= 0 && iy >= 0 && ix < cv.width && iy < cv.height) remaining *= 1 - cv.alpha[(iy * cv.width + ix) * 4 + 3] / 255;
      }
      // Overlapping objects cover each actor pixel only once; translucent
      // sprites combine by opacity, and transparent holes remain visible.
      covered += alpha * (1 - remaining);
    }
    return covered / mask.total;
  },
  safe(a, x, y, pose, depth) { return this.occlusion(a, x, y, pose, depth) <= this.maxOcclusion; },
  spotSafe(a, s, pose) {
    return this.safe(a, s.x, s.y + (s.high ? 1 : 2), pose, Room.base(s.it) + 0.03);
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
  protected(a) {
    return a.walking || a.jump || a.on || a.seat || a.bed ||
      ['work', 'goingWork', 'deskstand', 'eat', 'trick', 'zoom'].includes(a.state);
  },
  tick(a, dt) {
    if (this.protected(a)) { a._hiddenFor = 0; a._visibilityClock = 0; return false; }
    a._visibilityClock = (a._visibilityClock || 0) + dt;
    if (a._visibilityClock < this.checkInterval) return false;
    const elapsed = a._visibilityClock; a._visibilityClock = 0;
    if (this.safe(a, a.x, a.y)) { a._hiddenFor = 0; return false; }
    a._hiddenFor = (a._hiddenFor || 0) + elapsed;
    if (a._hiddenFor < this.hiddenSeconds) return false;
    a._visibilityRetry = Math.max(0, (a._visibilityRetry || 0) - elapsed);
    if (a._visibilityRetry > 0) return false;
    const pose = a.pid != null && a.state === 'sleep' ? 'sleep' : undefined;
    const pos = this.find(a, a.x, a.y, { pose });
    if (!pos) { a._visibilityRetry = this.retrySeconds; return false; }
    const sleeping = a.state === 'sleep', remaining = a.timer;
    // Discard interrupted habit callbacks; they may send the pet back behind
    // the same object. Sleeping pets resume their nap at the new position.
    a.actCb = null; a.actPose = null; a.napAt = null; a.target = null;
    a._hiddenFor = 0; a._visibilityRetry = 0;
    a.state = 'walk';
    a.walkTo(pos[0], pos[1], () => {
      a.state = sleeping ? 'sleep' : a.pid != null ? 'sit' : 'idle';
      a.timer = sleeping ? Math.max(2, remaining || 0) : 2;
    }, true);
    return true;
  },
};
