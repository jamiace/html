/* HD-2D first playable slice. World coordinates and save rules stay with the game. */
const HD2D = {
  scale: 2,
  enabled: true,
  ready: false,
  images: {},
  surfaces: new WeakMap(),
  itemSources: new WeakMap(),
  masks: new WeakMap(),
  frames: 0,
  ms: 0,
  names: ['room-shell','bed','desk','chair','cat_tree','litter_house','rug','lantern','moon_bunny','window'],

  canvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    return cv;
  },

  async load() {
    const results = await Promise.allSettled(this.names.map(name => new Promise((ok, no) => {
      const im = new Image();
      im.onload = () => { this.images[name] = im; ok(); };
      im.onerror = () => no(Error('無法載入 ' + name));
      im.src = 'assets/hd2d/' + name + '.png';
    })));
    this.failed = results.filter(r => r.status === 'rejected').length;
    this.ready = !this.failed;
    return this.ready;
  },

  key(it) {
    const k = it.k, d = ITEMS[k];
    if (WallMount.side(it)) return null;
    if (k === 'cat_tree') return 'cat_tree';
    if (k === 'litter_house') return 'litter_house';
    if (k === 'moon_bunny') return 'moon_bunny';
    if (k === 'festival_lantern') return 'lantern';
    if (k === 'window_arch') return 'window';
    if (k.startsWith('a92_lantern_night_')) {
      if (d.bed) return 'bed';
      if (d.desk) return 'desk';
      if (d.chair) return 'chair';
      if (d.layer === 'rug') return 'rug';
    }
    return null;
  },

  source(it) {
    const key = this.key(it), base = Room.itemCanvas(it), im = key && this.images[key];
    if (im) { this.itemSources.set(base, im); return im; }
    return base;
  },

  mask(src) {
    if (!src) return null;
    let cv = this.masks.get(src);
    if (cv) return cv;
    cv = this.canvas(src.width, src.height);
    const c = cv.getContext('2d');
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#100a18';
    c.fillRect(0, 0, cv.width, cv.height);
    this.masks.set(src, cv);
    return cv;
  },

  floorClip(c) {
    c.beginPath();
    c.moveTo(20, 80);
    c.lineTo(220, 80);
    c.lineTo(238, 175);
    c.lineTo(2, 175);
    c.closePath();
    c.clip();
  },

  lights() {
    return Room.collectLights().filter(l => l.k > .05);
  },

  cast(c, src, x, foot, w, h, light, opacity = 0.28) {
    if (!src || opacity <= 0.01) return;
    const cy = foot - h * 0.35;
    const dx = x - light.x;
    const dy = cy - light.y; // 光源在面前時 dy < 0，影子向後伸展；光源在身後時 dy > 0，影子向前伸展
    const dist = Math.hypot(dx, dy) || 1;

    const len = Math.min(22, Math.max(10, h * 0.6));
    const vx = (dx / dist) * len;
    const vy = (dy / dist) * len * 0.48;

    const m = this.mask(src);
    if (!m) return;

    c.save();
    c.translate(x, foot);
    c.transform(1, 0, -vx / Math.max(1, h), -vy / Math.max(1, h), 0, 0);
    c.globalAlpha = opacity;
    c.drawImage(m, -w / 2, -h, w, h);
    c.restore();
  },

  shadows(c, list, lights) {
    const env = Room.env;
    const isAsleep = Lights.mode === 'night' || Lights.mode === 'paused';
    const darkVal = env ? (env.dark || 0) : 0;
    const ambFactor = isAsleep ? 0 : Math.max(0, 1 - darkVal * 1.5);

    // 真正開啟且有亮度的點光源
    const activeLights = lights.filter(l => l.r < 180 && l.k > 0.05);

    // 環境光最低且無點光源時，徹底不產生任何影子
    if (activeLights.length === 0 && ambFactor <= 0.05) {
      return;
    }

    c.save();
    this.floorClip(c);

    for (const e of list) {
      if (e.kind === 'item') {
        const it = e.it, d = ITEMS[it.k];
        if (d.layer === 'wall' || d.layer === 'rug' || it.p != null) continue;
        const base = Room.itemCanvas(it), w = base.width, h = base.height,
              foot = it.y + h - 2, src = this.source(it);
        const cx = it.x + w / 2;

        const contactAlpha = 0.25 * Math.max(ambFactor, activeLights.length ? 0.4 : 0);
        if (contactAlpha > 0.02) {
          c.fillStyle = `rgba(12, 7, 18, ${contactAlpha})`;
          c.beginPath();
          c.ellipse(cx, foot, w * 0.44, 1.8, 0, 0, Math.PI * 2);
          c.fill();
        }

        if (activeLights.length > 0) {
          const near = activeLights.slice().sort((a, b) =>
            Math.hypot(a.x - cx, a.y - foot) - Math.hypot(b.x - cx, b.y - foot)
          ).slice(0, 2);

          for (const l of near) {
            const dist = Math.hypot(l.x - cx, l.y - foot);
            if (dist < (l.r || 90)) {
              const distFactor = (1 - dist / (l.r || 90)) * Math.min(1, l.k || 1);
              if (distFactor > 0.05) {
                this.cast(c, src, cx, foot, w, h, l, 0.28 * distFactor);
              }
            }
          }
        }
      } else if (e.kind === 'actor' && e.a) {
        const a = e.a, pet = a.pid != null;
        let foot = a.y, elevation = 0;
        if (a.on) { foot = Room.base(a.on); elevation = Math.max(0, foot - a.y); }
        else if (a.jump) { foot = a.jump.y1; elevation = Math.max(0, foot - a.y); }
        if (foot < 90 || foot > 175) continue;

        const shrink = Math.max(0.5, 1 - elevation / 70);

        const actorContactAlpha = 0.25 * shrink * Math.max(ambFactor, activeLights.length ? 0.45 : 0);
        if (actorContactAlpha > 0.02) {
          c.fillStyle = `rgba(12, 7, 18, ${actorContactAlpha})`;
          c.beginPath();
          c.ellipse(a.x, foot, (pet ? 5.5 : 5) * shrink, 1.8 * shrink, 0, 0, Math.PI * 2);
          c.fill();
        }

        // 安全取得角色精靈圖
        try {
          const s = ActorVisibility.sprite(a);
          if (s && s.cv) {
            const w = s.cv.width;
            const h = s.cv.height;

            if (activeLights.length > 0) {
              const nearActor = activeLights.slice().sort((l1, l2) =>
                Math.hypot(l1.x - a.x, l1.y - foot) - Math.hypot(l2.x - a.x, l2.y - foot)
              ).slice(0, 2);

              for (const l of nearActor) {
                const dist = Math.hypot(l.x - a.x, l.y - foot);
                if (dist < (l.r || 90)) {
                  const distFactor = (1 - dist / (l.r || 90)) * Math.min(1, l.k || 1);
                  if (distFactor > 0.05) {
                    this.cast(c, s.cv, a.x, foot, w, h, l, 0.28 * shrink * distFactor);
                  }
                }
              }
            }
          }
        } catch (err) {}
      }
    }
    c.restore();
  },

  drawItem(c, it) {
    const key = this.key(it), d = ITEMS[it.k], base = Room.itemCanvas(it);
    const w = base.width, h = base.height;

    if (!key) {
      Room.drawItem(c, it);
      return;
    }

    const src = this.source(it);
    c.save();
    if (d.window) {
      const win = d.window;
      c.save();
      c.beginPath();
      c.moveTo(it.x + 4, it.y + h - 5);
      c.lineTo(it.x + 4, it.y + 28);
      c.quadraticCurveTo(it.x + 4, it.y + 4, it.x + w / 2, it.y + 4);
      c.quadraticCurveTo(it.x + w - 4, it.y + 4, it.x + w - 4, it.y + 28);
      c.lineTo(it.x + w - 4, it.y + h - 5);
      c.closePath();
      c.clip();
      Room.drawWindowScene(c, it.x + win.x, it.y + win.y, win.w, win.h);
      if (it.closed) {
        c.fillStyle = '#9b7a60';
        c.fillRect(it.x, it.y, w, h);
        c.strokeStyle = '#644b44';
        c.lineWidth = .5;
        for (let y = it.y + 4; y < it.y + h; y += 3) {
          c.beginPath();
          c.moveTo(it.x);
          c.lineTo(it.x + w, y);
          c.stroke();
        }
      }
      c.restore();
    }
    if (d.toggle && (!it.on || it.broken)) c.filter = 'brightness(.44) saturate(.55)';
    if (it.flip) {
      c.translate(it.x + w, it.y);
      c.scale(-1, 1);
      c.drawImage(src, 0, 0, w, h);
    } else {
      c.drawImage(src, it.x, it.y, w, h);
    }
    c.restore();

    if (it.used && d.litter) {
      c.fillStyle = '#74513b';
      for (let n = 0; n < it.used; n++) c.fillRect(it.x + 12 + n * 2, it.y + h - 6, 1, .7);
    }
  },

  lighting(c, lights) {
    const env = Room.env, night = env.h > 19 || env.h < 6, dusk = !night && (env.h > 17 || env.h < 7),
          asleep = Lights.mode === 'night' || Lights.mode === 'paused';
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = asleep ? '#20243e' : night ? '#a79ba8' : dusk ? '#d9ad9a' : '#f1eee5';
    c.fillRect(0, 0, RW, RH);
    c.restore();

    const L = this.lightCtx;
    L.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    L.clearRect(0, 0, RW, RH);
    const colors = { warm: '255,174,80', cool: '122,170,255', pink: '255,126,165' };

    for (const l of lights) {
      const r = Math.min(150, l.r), g = L.createRadialGradient(l.x, l.y, 1, l.x, l.y, r);
      g.addColorStop(0, 'rgba(' + (colors[l.col] || colors.warm) + ',' + Math.min(.7, (night ? .58 : .28) * l.k) + ')');
      g.addColorStop(.42, 'rgba(' + (colors[l.col] || colors.warm) + ',' + (.15 * l.k) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = g;
      L.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }

    c.save();
    c.globalCompositeOperation = 'screen';
    c.drawImage(this.light, 0, 0, RW, RH);
    c.restore();

    if (!asleep) {
      for (const it of Room.state.items) {
        const d = ITEMS[it.k];
        if (!d.window || it.closed || WallMount.side(it)) continue;
        const [w, h] = itemSize(it), alpha = night ? .09 : dusk ? .15 : .18;
        c.save();
        this.floorClip(c);
        c.globalCompositeOperation = 'screen';
        const g = c.createLinearGradient(it.x, 96, it.x + 18, 166);
        g.addColorStop(0, night ? 'rgba(134,175,255,' + alpha + ')' : 'rgba(255,215,151,' + alpha + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        for (let k = 0; k < 2; k++) {
          const x = it.x + 5 + k * (w / 2);
          c.beginPath();
          c.moveTo(x, 96);
          c.lineTo(x + w / 2 - 6, 96);
          c.lineTo(x + w / 2 + 20, 163);
          c.lineTo(x + 22, 163);
          c.closePath();
          c.fill();
        }
        c.restore();
      }
    }

    if (!asleep) {
      c.save();
      c.globalCompositeOperation = 'screen';
      for (const l of lights) {
        const r = 4 + (l.col === 'warm' ? 3 : 1), g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
        g.addColorStop(0, 'rgba(' + (colors[l.col] || colors.warm) + ',' + Math.min(.45, l.k * .36) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(l.x - r, l.y - r, r * 2, r * 2);
      }
      c.restore();
    }

    const vignette = c.createRadialGradient(120, 92, 63, 120, 92, 147);
    vignette.addColorStop(0, 'rgba(8,7,17,0)');
    vignette.addColorStop(1, 'rgba(8,7,17,.38)');
    c.fillStyle = vignette;
    c.fillRect(0, 0, RW, RH);
  },

  render() {
    if (!this.ready || !this.cv || !this.enabled) return;
    const start = performance.now(), c = this.ctx, S = this.scale;
    c.setTransform(S, 0, 0, S, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, RW, RH);
    c.imageSmoothingEnabled = false;

    const th = THEMES.lantern_night, isTheme = Room.state.wp === th.wp && Room.state.fl === th.fl;
    if (isTheme) {
      const img = this.images['room-shell'], seam = .474;
      c.drawImage(img, 0, 0, img.width, img.height * seam, 0, 0, RW, 96);
      c.drawImage(img, 0, img.height * seam, img.width, img.height * (1 - seam), 0, 96, RW, RH - 96);
    } else c.drawImage(Room.bg, 0, 0, RW, RH);

    const list = Room.drawList(), lights = this.lights();
    for (const e of list) if (e.kind === 'item' && ITEMS[e.it.k].layer === 'rug') this.drawItem(c, e.it);

    this.shadows(c, list, lights);

    for (const e of list) {
      if (e.kind === 'item') {
        if (ITEMS[e.it.k].layer !== 'rug') this.drawItem(c, e.it);
      } else if (e.kind === 'actor') {
        // 直接呼叫原生繪圖管線，不再透過 Proxy 攔截，保證主角與寵物絕對正常繪製出來！
        if (e.a && e.a.draw) e.a.draw(c, Room);
      } else {
        Room.drawGift(c, e.g);
      }
    }

    for (const p of Room.particles) {
      const cv = SPR.get(p.spr);
      c.globalAlpha = Math.max(0, (p.alpha || 1) * (1 - p.life / p.max));
      c.drawImage(cv, p.x, p.y, cv.width, cv.height);
    }
    c.globalAlpha = 1;

    this.lighting(c, lights);

    if (lights.length) {
      c.fillStyle = 'rgba(255,224,166,.35)';
      for (let i = 0; i < 13; i++) {
        const x = 35 + md(i * 31 + Math.sin(Room.t * .22 + i) * 3, 172),
              y = 28 + md(i * 17 + Room.t * (.5 + i % 3 * .18), 118);
        c.fillRect(x, y, .22, .22);
      }
    }

    if (!Room.edit && Room.state === Game.S) {
      Life.drawBubbles(c);
      Social.drawMarks(c);
    }
    if (Room.edit) {
      const it = Room.sel || Room.hover;
      if (it) Room.outline(c, it, Room.sel ? '#ffe3a3' : 'rgba(255,227,163,.6)');
    }

    this.frames++;
    this.ms = this.ms * .95 + (performance.now() - start) * .05;
  },

  toggle() {
    this.enabled = !this.enabled;
    this.sync();
    this.controls();
  },

  sync() {
    if (!this.cv) return;
    this.cv.hidden = !this.enabled || !this.ready;
    Room.cv.style.opacity = this.enabled && this.ready ? '0' : '1';
    document.body.classList.toggle('hd2d-on', this.enabled && this.ready);
  },

  time(mode) {
    Game.S.settings.timeMode = mode;
    Room.computeEnv(Game.S.settings);
    Game.save();
    this.controls();
  },

  controls() {
    if (!this.bar) return;
    this.bar.replaceChildren(
      h('div', { class: 'hd-title' },
        h('b', { text: 'HD-2D · 團圓夜' }),
        h('span', { text: window.NOOK_HD_DEMO ? '體驗進度獨立保存在本機' : '第一階段美術試作' })
      ),
      h('div', { class: 'hd-actions' },
        ...[["day", "日光"], ["dusk", "黃昏"], ["night", "月夜"]].map(([mode, n]) =>
          h('button', {
            class: 'hd-btn' + (Game.S.settings.timeMode === mode ? ' active' : ''),
            onclick: () => this.time(mode)
          }, n)
        ),
        h('button', {
          class: 'hd-btn',
          onclick: () => {
            for (const it of Game.S.items) if (ITEMS[it.k].light && ITEMS[it.k].toggle) it.on = !it.on;
            Game.save();
          }
        }, '切換燈光'),
        h('button', { class: 'hd-btn', onclick: () => UI.openWin('avatar') }, '換裝'),
        h('button', { class: 'hd-btn', onclick: () => UI.setEdit(!Room.edit) }, '佈置'),
        h('button', { class: 'hd-btn', onclick: () => this.toggle() }, this.enabled ? '比較原版' : '返回 HD-2D')
      )
    );
  },

  attach() {
    const wrap = Room.cv.parentElement;
    this.cv = this.canvas(RW * this.scale, RH * this.scale);
    this.cv.id = 'hd2d-room';
    this.cv.setAttribute('aria-hidden', 'true');
    wrap.insertBefore(this.cv, Room.cv.nextSibling);
    this.ctx = this.cv.getContext('2d');
    this.light = this.canvas(this.cv.width, this.cv.height);
    this.lightCtx = this.light.getContext('2d');
    this.bar = h('section', { class: 'hd-controls' });
    document.querySelector('.stage').append(this.bar);
    this.controls();
    this.sync();
    this.load().then(() => {
      this.sync();
      if (this.failed) UI.toast('HD 素材載入失敗，請重新整理；暫時使用原版畫面', 'i_view', 6);
    });
  }
};

(function() {
  const newState = Game.newState.bind(Game);
  Game.newState = function() {
    const s = newState();
    if (!window.NOOK_HD_DEMO) return s;
    const t = THEMES.lantern_night;
    s.themes.push('lantern_night');
    s.wp = t.wp; s.fl = t.fl; s.view = t.view;
    s.items = this.buildLayout(t.layout, () => s.nextUid++, k => k);
    s.ownWP.push(t.wp); s.ownFL.push(t.fl);
    s.settings.timeMode = 'night';
    s.settings.hd2d = true;
    s.seenIntro = true;
    s.coins = 500;
    return s;
  };
  const init = UI.init.bind(UI);
  UI.init = function() {
    const r = init();
    if (window.NOOK_HD_DEMO || Game.S.settings.hd2d) HD2D.attach();
    return r;
  };
  const render = Room.render.bind(Room);
  Room.render = function(dt) {
    if (!HD2D.ready || !HD2D.enabled || !HD2D.cv || this.ctx !== this.cv.getContext('2d')) return render(dt);
    this.t += dt;
    this.syncChildren();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life > p.max) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt + (p.wob ? Math.sin(p.life * 6) * p.wob * dt : 0);
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }
    HD2D.render();
  };
  const settings = UI.w_settings.bind(UI);
  UI.w_settings = function() {
    const out = settings();
    out.unshift(h('section', { class: 'settings-card' },
      h('b', { text: 'HD-2D 美術試作' }),
      h('p', { class: 'hint', text: '團圓夜套組支援新的家具與房間材質；所有造型與寵物動作可使用新的材質光照。' }),
      h('button', {
        class: 'chip',
        onclick: () => {
          Game.S.settings.hd2d = !Game.S.settings.hd2d;
          if (!HD2D.cv) HD2D.attach();
          HD2D.enabled = !!Game.S.settings.hd2d;
          HD2D.sync();
          Game.save();
          UI.refresh('settings');
        }
      }, Game.S.settings.hd2d ? '關閉 HD-2D' : '啟用 HD-2D')
    ));
    return out;
  };
  if (window.NOOK_HD_DEMO) {
    Cloud.init = () => Promise.resolve();
    Cowork.init = () => {};
    UI.w_account = () => [h('p', { text: '這是 HD-2D 體驗版，進度只保存在本機，不會讀取或覆寫正式帳號。' })];
  }
})();