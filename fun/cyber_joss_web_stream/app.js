(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);

  const screens = {
    intro: $('#introScreen'),
    intent: $('#intentScreen'),
    ritual: $('#ritualScreen'),
    result: $('#resultScreen'),
  };

  const canvas = $('#particleCanvas');
  const ctx = canvas.getContext('2d');
  const app = $('#app');
  const ambientGlow = $('#ambientGlow');
  const burnGate = $('#burnGate');
  const jossPaper = $('#jossPaper');
  const jossPaperImage = $('#jossPaperImage');
  const paperShotLayer = $('#paperShotLayer');
  const backIntentButton = $('#backIntentButton');
  const burnMask = $('#burnMask');
  const paperEdgeGlow = $('#paperEdgeGlow');
  const instruction = $('#instruction');
  const energyMeterBar = $('#energyMeter span');

  const todayCountEl = $('#todayCount');
  const totalCountEl = $('#totalCount');
  const resultTodayCountEl = $('#resultTodayCount');
  const resultTotalCountEl = $('#resultTotalCount');
  const blessingTextEl = $('#blessingText');
  const currentIntentLabel = $('#currentIntentLabel');

  const soundToggle = $('#soundToggle');
  const hapticToggle = $('#hapticToggle');

  const intents = [
    { label: '平安', desc: '願今日安穩，少一分掛念' },
    { label: '財運', desc: '願財氣流通，生活有餘裕' },
    { label: '健康', desc: '願身體安好，精神慢慢回來' },
    { label: '工作順利', desc: '願事情推進，貴人相助' },
    { label: '家人平安', desc: '願家中日子安定和順' },
    { label: '心情安定', desc: '願煩惱慢慢散去' },
    { label: '感謝', desc: '把謝意送進火光裡' },
    { label: '想念', desc: '願遠方的人被好好祝福' },
    { label: '考試順利', desc: '願心定手穩，思路清明' },
    { label: '旅途平安', desc: '願去程順利，歸途安穩' },
    { label: '小人退散', desc: '願雜事遠離，清靜做事' },
    { label: '隨喜祈願', desc: '把此刻心意交給火光' },
  ];

  const blessings = [
    '願今日平安，心中少一分掛念。',
    '願所行之路順遂，所遇之人和善。',
    '願家人安康，日子安穩。',
    '願心中所念，被溫柔安放。',
    '願煩惱隨火光散去，留下清明。',
    '願努力不被辜負，等待終有回音。',
    '願你在混亂之中，仍能找到自己的方向。',
    '願財氣流通，生活有餘裕。',
    '願身體安好，精神慢慢回來。',
    '願遠方的人平安，想念有所依靠。',
    '願今日的火光，替你照亮一小段路。',
    '願該放下的慢慢放下，該前進的穩穩前進。',
    '願工作順利，貴人相助，小人退散。',
    '願考運清明，心定手穩。',
    '願旅途平安，去程順利，歸途安穩。',
    '願一切未說出口的心意，都被好好接住。',
    '願你守住善意，也守住自己的力氣。',
    '願此刻所祈，不急不躁，自有安排。',
    '願火光收下心意，也替你留下勇氣。',
    '願今日的小小儀式，換來心裡的一點安定。',
  ];

  const storageKey = 'cyber-joss-paper-v1';
  const todayKey = new Date().toISOString().slice(0, 10);

  const state = {
    screen: 'intro',
    currentIntent: '平安',
    soundOn: true,
    hapticOn: true,
    audioContext: null,
    dragging: false,
    pointerId: null,
    dragOffsetY: 0,
    dragStartY: 0,
    paperY: 0,
    charge: 0,
    lastTime: performance.now(),
    particles: [],
    burning: false,
    burnProgress: 0,
    lastBurnAt: 0,
    swipeCountInSession: 0,
    dragStartTime: 0,
    lastPointerY: 0,
    lastPointerAt: 0,
    gateAfterglow: false,
    resultAfterglowUntil: 0,
    stats: loadStats(),
    size: { width: 0, height: 0, dpr: 1 },
  };

  function loadStats() {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      const total = Number.isFinite(parsed.total) ? parsed.total : 0;
      const today = parsed.date === todayKey && Number.isFinite(parsed.today) ? parsed.today : 0;
      return { date: todayKey, today, total };
    } catch {
      return { date: todayKey, today: 0, total: 0 };
    }
  }

  function saveStats() {
    localStorage.setItem(storageKey, JSON.stringify(state.stats));
  }

  function updateStatsUI() {
    todayCountEl.textContent = String(state.stats.today);
    totalCountEl.textContent = String(state.stats.total);
    resultTodayCountEl.textContent = `${state.stats.today} 張`;
    resultTotalCountEl.textContent = `${state.stats.total} 張`;
  }

  function clearParticles() {
    state.particles = [];
    if (state.size.width && state.size.height) {
      ctx.clearRect(0, 0, state.size.width, state.size.height);
    }
  }

  function clearPaperShots() {
    paperShotLayer?.replaceChildren();
  }

  function setScreen(name) {
    state.screen = name;
    Object.entries(screens).forEach(([key, el]) => {
      const active = key === name;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
      if (active) el.scrollTop = 0;
    });
    window.scrollTo?.(0, 0);

    if (name === 'intro' || name === 'intent') {
      state.resultAfterglowUntil = 0;
      state.gateAfterglow = false;
      state.burning = false;
      state.dragging = false;
      state.pointerId = null;
      state.lastBurnAt = 0;
      clearParticles();
      clearPaperShots();
      burnGate.classList.remove('is-open', 'is-afterglow');
      ambientGlow.classList.remove('is-hot');
    }

    burnGate.classList.toggle('is-visible', name === 'ritual' || name === 'result');
    burnGate.classList.toggle('is-afterglow', name === 'result');
    if (name === 'intent') requestAnimationFrame(() => { screens.intent.scrollTop = 0; });
    if (name === 'ritual') resetRitual();
  }

  function bindFastTap(element, handler) {
    let startPoint = null;

    element.addEventListener('pointerdown', (event) => {
      startPoint = { x: event.clientX, y: event.clientY };
    }, { passive: true });

    element.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'mouse' || !startPoint) return;
      const moved = Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y);
      startPoint = null;
      if (moved <= 14) {
        event.preventDefault();
        handler(event);
      }
    });

    element.addEventListener('pointercancel', () => {
      startPoint = null;
    });

    element.addEventListener('click', handler);
  }

  function buildIntentGrid() {
    const grid = $('#intentGrid');
    grid.innerHTML = '';
    intents.forEach((intent) => {
      const button = document.createElement('button');
      button.className = 'intent-button';
      button.type = 'button';
      button.innerHTML = `<strong>${intent.label}</strong><span>${intent.desc}</span>`;
      bindFastTap(button, () => {
        chooseIntent(intent.label);
      });
      grid.appendChild(button);
    });
  }

  function chooseIntent(label) {
    if (state.screen !== 'intent') return;
    state.currentIntent = label;
    currentIntentLabel.textContent = label;
    initAudio();
    setScreen('ritual');
  }

  function resetRitual() {
    state.dragging = false;
    state.burning = false;
    state.burnProgress = 0;
    state.gateAfterglow = false;
    state.resultAfterglowUntil = 0;
    state.swipeCountInSession = 0;
    state.lastBurnAt = 0;
    clearParticles();
    clearPaperShots();
    state.charge = 0;
    state.paperY = 0;
    burnMask.style.opacity = '0';
    burnMask.style.transform = 'translateY(-32%)';
    paperEdgeGlow.style.opacity = '0';
    jossPaper.style.transition = 'none';
    jossPaper.style.opacity = '1';
    jossPaper.style.transform = 'translate3d(-50%, 0, 0) scale(1) rotate(0deg)';
    jossPaper.classList.remove('is-burning', 'is-pressed');
    requestAnimationFrame(() => { jossPaper.style.transition = ''; });
    burnGate.classList.remove('is-open', 'is-afterglow');
    ambientGlow.classList.remove('is-hot');
    instruction.classList.remove('is-hot');
    instruction.textContent = '往上滑金紙，可連續送入爐口。';
    energyMeterBar.style.width = '0%';
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = window.visualViewport;
    const width = Math.round(viewport?.width || window.innerWidth);
    const height = Math.round(viewport?.height || window.innerHeight);
    state.size = { width, height, dpr };
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  class Particle {
    constructor(options) {
      Object.assign(this, options);
      this.age = 0;
      this.life = options.life || rand(480, 1200);
      this.rotation = options.rotation || rand(0, Math.PI * 2);
      this.spin = options.spin || rand(-0.05, 0.05);
    }

    update(dt) {
      this.age += dt;
      const t = this.age / this.life;
      this.x += this.vx * dt / 16.67;
      this.y += this.vy * dt / 16.67;
      this.vx *= this.drag ?? 0.992;
      this.vy *= this.drag ?? 0.992;
      this.vy += (this.gravity || 0) * dt / 16.67;
      this.rotation += this.spin * dt / 16.67;
      this.alpha = clamp(1 - t, 0, 1);
      return t < 1;
    }

    draw(ctx) {
      const alpha = this.alpha ?? 1;
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha * (this.opacity ?? 1);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      if (this.kind === 'ash') {
        ctx.fillStyle = `rgba(92, 78, 62, ${alpha})`;
        ctx.fillRect(-this.size * 0.5, -this.size * 0.2, this.size, this.size * 0.42);
      } else if (this.kind === 'paper') {
        ctx.fillStyle = `rgba(204, 159, 86, ${alpha})`;
        ctx.fillRect(-this.size * 0.5, -this.size * 0.33, this.size, this.size * 0.66);
      } else {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        if (this.kind === 'gold') {
          gradient.addColorStop(0, 'rgba(255, 246, 188, 1)');
          gradient.addColorStop(0.36, 'rgba(247, 194, 89, 0.92)');
          gradient.addColorStop(1, 'rgba(247, 194, 89, 0)');
        } else if (this.kind === 'fire') {
          gradient.addColorStop(0, 'rgba(255, 244, 182, 1)');
          gradient.addColorStop(0.34, 'rgba(255, 128, 42, 0.9)');
          gradient.addColorStop(1, 'rgba(255, 64, 22, 0)');
        } else {
          gradient.addColorStop(0, 'rgba(255, 206, 118, 0.95)');
          gradient.addColorStop(1, 'rgba(255, 130, 48, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function addParticle(options) {
    state.particles.push(new Particle(options));
    if (state.particles.length > 1800) state.particles.splice(0, state.particles.length - 1800);
  }

  function emitGateIdle(dt) {
    if (state.screen !== 'ritual' && state.screen !== 'result') return;
    const now = performance.now();
    if (state.screen === 'result' && now > state.resultAfterglowUntil) return;
    if (state.screen === 'ritual' && now - state.lastBurnAt > 900) return;

    const gate = getGatePoint();
    const recentlyBurned = now - state.lastBurnAt < 420;
    const amount = state.screen === 'result' ? 1 : (recentlyBurned ? 4 : 1);
    for (let i = 0; i < amount; i++) {
      if (Math.random() > dt / (state.screen === 'result' ? 180 : 55)) continue;
      addParticle({
        kind: Math.random() > 0.42 ? 'ember' : 'gold',
        x: gate.x + rand(-110, 110),
        y: gate.y + rand(-4, 12),
        vx: rand(-0.16, 0.16),
        vy: rand(-1.5, -0.45),
        size: rand(1.4, 4.2),
        life: rand(520, 1180),
        opacity: rand(0.22, 0.68),
        gravity: -0.006,
      });
    }
  }

  function emitChargeParticles() {
    const rect = jossPaper.getBoundingClientRect();
    for (let i = 0; i < 3; i++) {
      addParticle({
        kind: 'gold',
        x: rand(rect.left + 12, rect.right - 12),
        y: rand(rect.top + 20, rect.bottom - 20),
        vx: rand(-0.45, 0.45),
        vy: rand(-0.9, -0.25),
        size: rand(1, 3.8),
        life: rand(420, 980),
        opacity: rand(0.35, 0.9),
      });
    }
  }

  function emitCombustionBurst() {
    const gate = getGatePoint();
    for (let i = 0; i < 180; i++) {
      const kindRand = Math.random();
      const kind = kindRand > 0.58 ? 'gold' : kindRand > 0.22 ? 'fire' : 'ash';
      addParticle({
        kind,
        x: gate.x + rand(-44, 44),
        y: gate.y + rand(0, 40),
        vx: rand(-4.4, 4.4),
        vy: rand(-7.8, -1.8),
        size: kind === 'ash' ? rand(1.2, 4.2) : rand(2.4, 10.8),
        life: kind === 'fire' ? rand(460, 880) : rand(900, 1900),
        opacity: kind === 'ash' ? rand(0.32, 0.72) : rand(0.64, 1),
        gravity: kind === 'ash' ? rand(0.004, 0.018) : rand(-0.018, 0.006),
        drag: rand(0.976, 0.994),
        spin: rand(-0.14, 0.14),
      });
    }

    for (let i = 0; i < 36; i++) {
      addParticle({
        kind: 'paper',
        x: gate.x + rand(-46, 46),
        y: gate.y + rand(8, 42),
        vx: rand(-2.7, 2.7),
        vy: rand(-3.8, -0.8),
        size: rand(4, 12),
        life: rand(760, 1500),
        opacity: rand(0.28, 0.68),
        gravity: rand(0.012, 0.035),
        drag: rand(0.98, 0.994),
      });
    }
  }

  function drawParticles(dt) {
    ctx.clearRect(0, 0, state.size.width, state.size.height);
    ctx.globalCompositeOperation = 'lighter';
    state.particles = state.particles.filter((particle) => {
      const alive = particle.update(dt);
      particle.draw(ctx);
      return alive;
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function getGatePoint() {
    return {
      x: window.innerWidth / 2,
      y: 40 + Math.max(0, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-top'), 10) || 0),
    };
  }

  function setPaperTransform(y, extra = '') {
    state.paperY = y;
    const stretch = clamp(Math.abs(y) / 280, 0, 1);
    const scale = 1 - stretch * 0.08;
    const rotate = clamp(y / 80, -5, 3);
    jossPaper.style.transform = `translate3d(-50%, ${y}px, 0) scale(${scale}) rotate(${rotate}deg) ${extra}`;
  }

  function resetPaperFeeder() {
    state.paperY = 0;
    state.charge = 0;
    burnMask.style.opacity = '0';
    paperEdgeGlow.style.opacity = '0';
    jossPaper.classList.remove('is-burning', 'is-pressed');
    jossPaper.style.transition = 'none';
    jossPaper.style.opacity = '1';
    jossPaper.style.transform = 'translate3d(-50%, 0, 0) scale(1) rotate(0deg)';
    requestAnimationFrame(() => { jossPaper.style.transition = ''; });
  }

  function createPaperShot(sourceRect) {
    if (!paperShotLayer) return;

    const shot = document.createElement('div');
    shot.className = 'paper-shot';
    shot.style.left = `${sourceRect.left}px`;
    shot.style.top = `${sourceRect.top}px`;
    shot.style.width = `${sourceRect.width}px`;
    shot.style.height = `${sourceRect.height}px`;

    const src = jossPaperImage?.getAttribute('src') || 'assets/joss-paper-fujin.jpg';
    shot.innerHTML = `
      <img class="paper-shot-image" src="${src}" alt="" draggable="false" />
      <div class="paper-shot-burn"></div>
    `;
    paperShotLayer.appendChild(shot);

    const gate = getGatePoint();
    const targetX = gate.x - (sourceRect.left + sourceRect.width / 2);
    const targetY = gate.y + 4 - (sourceRect.top + sourceRect.height * 0.34);
    const rotateStart = rand(-4, 4);
    const rotateEnd = rand(-15, 15);

    shot.animate(
      [
        { transform: `translate3d(0, 0, 0) scale(1) rotate(${rotateStart}deg)`, opacity: 1, filter: 'brightness(1.04)' },
        { transform: `translate3d(${targetX * 0.72}px, ${targetY * 0.72}px, 0) scale(.78) rotate(${rotateEnd * 0.55}deg)`, opacity: .96, filter: 'brightness(1.22)' },
        { transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(.18) rotate(${rotateEnd}deg)`, opacity: 0, filter: 'brightness(1.75) blur(1px)' },
      ],
      { duration: 520, easing: 'cubic-bezier(.16,.82,.25,1)', fill: 'forwards' }
    ).finished.finally(() => shot.remove());
  }

  function emitSwipeBurst(scale = 1) {
    const gate = getGatePoint();
    const fireCount = Math.round(42 * scale);
    const paperCount = Math.round(8 * scale);

    for (let i = 0; i < fireCount; i++) {
      const kindRand = Math.random();
      const kind = kindRand > 0.58 ? 'gold' : kindRand > 0.24 ? 'fire' : 'ash';
      addParticle({
        kind,
        x: gate.x + rand(-38, 38),
        y: gate.y + rand(0, 30),
        vx: rand(-3.6, 3.6),
        vy: rand(-6.8, -1.2),
        size: kind === 'ash' ? rand(1.1, 3.8) : rand(2.0, 8.6),
        life: kind === 'fire' ? rand(360, 760) : rand(760, 1550),
        opacity: kind === 'ash' ? rand(0.26, 0.62) : rand(0.52, 0.94),
        gravity: kind === 'ash' ? rand(0.004, 0.018) : rand(-0.018, 0.006),
        drag: rand(0.976, 0.994),
        spin: rand(-0.14, 0.14),
      });
    }

    for (let i = 0; i < paperCount; i++) {
      addParticle({
        kind: 'paper',
        x: gate.x + rand(-40, 40),
        y: gate.y + rand(8, 34),
        vx: rand(-2.4, 2.4),
        vy: rand(-3.3, -0.6),
        size: rand(3.5, 9.4),
        life: rand(640, 1320),
        opacity: rand(0.22, 0.54),
        gravity: rand(0.012, 0.035),
        drag: rand(0.98, 0.994),
      });
    }
  }

  function burnOnePaper(sourceRect) {
    if (state.screen !== 'ritual') return;

    const rect = sourceRect || jossPaper.getBoundingClientRect();
    state.dragging = false;
    state.pointerId = null;
    state.burning = false;
    state.swipeCountInSession += 1;
    state.lastBurnAt = performance.now();

    createPaperShot(rect);
    resetPaperFeeder();

    state.stats.today += 1;
    state.stats.total += 1;
    saveStats();
    updateStatsUI();

    burnGate.classList.add('is-open');
    burnGate.classList.remove('is-afterglow');
    ambientGlow.classList.add('is-hot');
    instruction.classList.add('is-hot');
    instruction.textContent = `已送入 ${state.swipeCountInSession} 張，繼續往上刷。`;

    playFriction(0.9);
    playIgnite();
    if (state.swipeCountInSession % 5 === 0) playCompletion();
    pulseHaptic(state.swipeCountInSession % 5 === 0 ? [20, 24, 20] : 18);

    window.setTimeout(() => {
      if (state.screen === 'ritual') emitSwipeBurst(0.78);
    }, 190);
  }

  function updateGateHeat() {
    if (state.screen !== 'ritual' || state.dragging) return;
    const idleFor = performance.now() - state.lastBurnAt;
    if (idleFor > 520) {
      burnGate.classList.remove('is-open');
      ambientGlow.classList.remove('is-hot');
      if (!state.dragging && state.swipeCountInSession > 0) {
        instruction.textContent = `已燒化 ${state.swipeCountInSession} 張。繼續往上滑，或按返回。`;
      }
    }
  }

  function onPointerDown(event) {
    if (state.screen !== 'ritual') return;
    initAudio();
    jossPaper.setPointerCapture?.(event.pointerId);
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.dragStartY = event.clientY;
    state.dragStartTime = performance.now();
    state.lastPointerY = event.clientY;
    state.lastPointerAt = state.dragStartTime;
    state.dragOffsetY = state.paperY;
    state.charge = Math.max(state.charge, 0.12);
    jossPaper.classList.add('is-pressed');
    instruction.textContent = '往上刷，送入爐口。';
    instruction.classList.add('is-hot');
  }

  function onPointerMove(event) {
    if (!state.dragging || state.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaY = event.clientY - state.dragStartY;
    const nextY = clamp(state.dragOffsetY + deltaY, -window.innerHeight * 0.74, 28);
    setPaperTransform(nextY);
    state.lastPointerY = event.clientY;
    state.lastPointerAt = performance.now();

    const progress = getGateProgress();
    const hot = progress > 0.38 || deltaY < -76;
    burnGate.classList.toggle('is-open', hot);
    ambientGlow.classList.toggle('is-hot', hot);
    instruction.textContent = hot ? '放手也可以，繼續往上刷會直接燒化。' : '往上滑，像刷鈔票一樣送進爐口。';

    if (progress > 0.36) {
      paperEdgeGlow.style.opacity = String(clamp((progress - 0.36) / 0.48, 0, 1));
      playFriction(progress);
    }

    if (progress >= 0.82) {
      jossPaper.releasePointerCapture?.(event.pointerId);
      burnOnePaper(jossPaper.getBoundingClientRect());
    }
  }

  function onPointerUp(event) {
    if (!state.dragging || state.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - state.dragStartY;
    const elapsed = Math.max(1, performance.now() - state.dragStartTime);
    const velocityY = deltaY / elapsed;
    const progress = getGateProgress();
    state.dragging = false;
    state.pointerId = null;
    jossPaper.classList.remove('is-pressed');

    if (progress > 0.55 || deltaY < -92 || velocityY < -0.72) {
      burnOnePaper(jossPaper.getBoundingClientRect());
      return;
    }

    burnGate.classList.remove('is-open', 'is-afterglow');
    ambientGlow.classList.remove('is-hot');
    paperEdgeGlow.style.opacity = '0';
    instruction.textContent = state.swipeCountInSession > 0 ? `已燒化 ${state.swipeCountInSession} 張。繼續往上滑，或按返回。` : '往上滑金紙，可連續送入爐口。';
    jossPaper.animate(
      [
        { transform: jossPaper.style.transform },
        { transform: 'translate3d(-50%, 0, 0) scale(1) rotate(0deg)' },
      ],
      { duration: 180, easing: 'cubic-bezier(.2,.9,.2,1)' }
    );
    setPaperTransform(0);
  }

  function getGateProgress() {
    const paperRect = jossPaper.getBoundingClientRect();
    const targetY = 90;
    const distance = paperRect.top - targetY;
    return clamp(1 - distance / 360, 0, 1);
  }

  function startBurning() {
    burnOnePaper(jossPaper.getBoundingClientRect());
  }

  function updateBurning(dt) {
    return;
  }

  function completeRitual() {
    // 連續燒化版不進入結果頁；保留函式避免舊事件呼叫時中斷流程。
    burnOnePaper(jossPaper.getBoundingClientRect());
  }

  function pickBlessing() {
    const filtered = blessings.filter((text) => {
      if (state.currentIntent === '財運') return text.includes('財') || text.includes('餘裕') || text.includes('努力');
      if (state.currentIntent === '健康') return text.includes('身體') || text.includes('精神') || text.includes('安康');
      if (state.currentIntent === '工作順利') return text.includes('工作') || text.includes('努力') || text.includes('貴人');
      if (state.currentIntent === '家人平安') return text.includes('家人') || text.includes('家中') || text.includes('安康');
      if (state.currentIntent === '心情安定') return text.includes('煩惱') || text.includes('安定') || text.includes('清明');
      if (state.currentIntent === '想念') return text.includes('遠方') || text.includes('想念') || text.includes('未說出口');
      if (state.currentIntent === '考試順利') return text.includes('考') || text.includes('心定') || text.includes('清明');
      if (state.currentIntent === '旅途平安') return text.includes('旅途') || text.includes('歸途') || text.includes('所行之路');
      if (state.currentIntent === '小人退散') return text.includes('小人') || text.includes('方向') || text.includes('清靜');
      return true;
    });
    const pool = filtered.length ? filtered : blessings;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function tick(now) {
    const dt = clamp(now - state.lastTime, 0, 48);
    state.lastTime = now;

    if (state.dragging && state.screen === 'ritual') {
      state.charge = clamp(state.charge + dt / 900, 0, 1);
      energyMeterBar.style.width = `${Math.round(state.charge * 100)}%`;
      if (Math.random() < dt / 42) emitChargeParticles();
    } else {
      state.charge = clamp(state.charge - dt / 900, 0, 1);
      energyMeterBar.style.width = `${Math.round(state.charge * 100)}%`;
    }

    updateGateHeat();
    emitGateIdle(dt);
    updateBurning(dt);
    drawParticles(dt);
    requestAnimationFrame(tick);
  }

  function initAudio() {
    if (!state.soundOn) return;
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      state.audioContext = new AudioContext();
    }
    if (state.audioContext.state === 'suspended') state.audioContext.resume();
  }

  function playFriction(intensity = 0.5) {
    if (!state.soundOn || !state.audioContext || Math.random() > 0.08) return;
    const ctxAudio = state.audioContext;
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    osc.type = 'triangle';
    osc.frequency.value = rand(160, 280);
    gain.gain.value = 0.004 * intensity;
    osc.connect(gain).connect(ctxAudio.destination);
    osc.start();
    osc.stop(ctxAudio.currentTime + rand(0.018, 0.045));
  }

  function playIgnite() {
    if (!state.soundOn || !state.audioContext) return;
    const ctxAudio = state.audioContext;
    const noiseBuffer = ctxAudio.createBuffer(1, ctxAudio.sampleRate * 0.42, ctxAudio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 0.72);
    }
    const source = ctxAudio.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctxAudio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 0.8;
    const gain = ctxAudio.createGain();
    gain.gain.value = 0.035;
    source.connect(filter).connect(gain).connect(ctxAudio.destination);
    source.start();
  }

  function playCompletion() {
    if (!state.soundOn || !state.audioContext) return;
    const ctxAudio = state.audioContext;
    const now = ctxAudio.currentTime;
    [392, 587.33, 783.99].forEach((freq, index) => {
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + index * 0.045);
      gain.gain.linearRampToValueAtTime(0.04 / (index + 1), now + index * 0.045 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.045 + 0.72);
      osc.connect(gain).connect(ctxAudio.destination);
      osc.start(now + index * 0.045);
      osc.stop(now + index * 0.045 + 0.76);
    });
  }

  function pulseHaptic(pattern) {
    if (!state.hapticOn || !navigator.vibrate) return;
    navigator.vibrate(pattern);
  }

  function bindEvents() {
    $('#startButton').addEventListener('click', () => {
      initAudio();
      setScreen('intent');
    });

    bindFastTap($('#randomIntentButton'), () => chooseIntent('隨喜祈願'));
    backIntentButton?.addEventListener('click', () => setScreen('intent'));
    $('#againButton').addEventListener('click', () => {
      initAudio();
      setScreen('ritual');
    });
    $('#changeIntentButton').addEventListener('click', () => setScreen('intent'));

    soundToggle.addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      soundToggle.classList.toggle('is-on', state.soundOn);
      if (state.soundOn) initAudio();
    });

    hapticToggle.addEventListener('click', () => {
      state.hapticOn = !state.hapticOn;
      hapticToggle.classList.toggle('is-on', state.hapticOn);
      pulseHaptic(12);
    });

    jossPaper.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    jossPaper.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (state.screen === 'ritual') {
          state.charge = 1;
          energyMeterBar.style.width = '100%';
          burnOnePaper(jossPaper.getBoundingClientRect());
        }
      }
    });

    window.addEventListener('resize', resizeCanvas);
    window.visualViewport?.addEventListener('resize', resizeCanvas);
    window.visualViewport?.addEventListener('scroll', resizeCanvas);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js?v=7').catch(() => {});
    }
  }

  function init() {
    resizeCanvas();
    buildIntentGrid();
    bindEvents();
    updateStatsUI();
    resetRitual();
    registerServiceWorker();
    requestAnimationFrame(tick);
  }

  init();
})();
