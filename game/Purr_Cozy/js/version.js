/* ============================================================
   Version
   - NOOK_VERSION / NOOK_VERSION_DATE: this build (shown in Settings)
   - version.json at the site root: the newest build on the server
     → when you publish an update, change BOTH (same numbers)
   - when the game saves, it checks version.json at most every 10 minutes (and when it comes back
     to the front); a newer one shows a bar at the top with a "reload" button
   ============================================================ */
window.NOOK_VERSION = window.PURR_BUILD.version;
window.NOOK_VERSION_DATE = window.PURR_BUILD.date;

const Update = {
  lastCheck: 0, newer: null, bar: null,
  label(v, d) { return `v ${v}${d ? '  ' + d : ''}`; },
  cmp(a, b) { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; },
  async check(force) {
    if (window.NOOK_ENV !== 'web' || location.protocol === 'file:') return;
    if (!force && Date.now() - this.lastCheck < 10 * 60e3) return; this.lastCheck = Date.now();
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const j = await r.json(); if (!j || !j.version) return;
      if (this.cmp(j.version, NOOK_VERSION) > 0) { this.newer = j; this.show(); }
      else { this.newer = null; if (this.bar) this.hide(); }
    } catch (e) { }
  },
  show() {
    const j = this.newer; if (!j) return;
    if (!this.bar) {
      this.bar = h('div', { class: 'updbar', role: 'status' });
      const app = document.getElementById('app'); app.prepend(this.bar); document.body.classList.add('has-upd');
    }
    this.bar.replaceChildren(ico('i_sparkle', 20), h('span', { class: 'grow', text: `有新版本 ${this.label(j.version, j.date)}（目前 ${this.label(window.NOOK_VERSION)}）` }),
      h('button', { class: 'chip sm primary', onclick: () => this.reload() }, ico('i_reset', 16), '更新'),
      h('button', { class: 'xbtn', 'aria-label': '先不要', title: '先不要（下次存檔時會再提醒）', onclick: () => this.hide() }, ico('i_close', 16)));
  },
  hide() { if (this.bar) { this.bar.remove(); this.bar = null; document.body.classList.remove('has-upd'); } this.lastCheck = Date.now(); },
  // save first, then get the newest files (the service worker always asks the network first)
  async reload() {
    if (this.reloading) return;
    this.reloading = true;
    try {
      Game.save();
      if (typeof Cloud !== 'undefined' && Cloud.flush) await Promise.race([Cloud.flush(), new Promise(r => setTimeout(r,2500))]);
      const scopeURL = new URL('./', location.href);
      if ('caches' in window) {
        for (const name of await caches.keys()) {
          if (!/^(nook-|purr-cozy-)/.test(name)) continue;
          const cache = await caches.open(name), requests = await cache.keys();
          if (requests.some(r => r.url.startsWith(scopeURL.href))) await caches.delete(name);
        }
      }
      const target = this.newer?.version || NOOK_VERSION;
      if (navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) { await Promise.race([reg.update(),new Promise(r=>setTimeout(r,4000))]); reg.waiting?.postMessage({type:'SKIP_WAITING'}); }
      }
      const url = new URL('index.html',scopeURL);
      url.searchParams.set('build',target);
      url.searchParams.set('refresh',String(Date.now()));
      location.replace(url.href);
    } catch(e) {
      this.reloading=false;
      UI.toast('更新未完成，請檢查連線後再試一次。','i_cloud',5);
    }

  },
};

(function () {
  // checked when the game saves (at most every 10 minutes) and when it comes back to the front
  const save = Game.save.bind(Game);
  Game.save = function () { const r = save.apply(this, arguments); try { Update.check(); } catch (e) { } return r; };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) Update.check(); });
  window.addEventListener('load', () => setTimeout(() => Update.check(true), 4000));
  // Settings: the version at the bottom
  const ws = UI.w_settings;
  UI.w_settings = function () {
    const out = ws.apply(this, arguments);
    out.push(h('div', { class: 'row between verrow' }, h('span', { class: 'hint', text: '版本' }), h('span', { class: 'num', text: Update.label(window.NOOK_VERSION, window.NOOK_VERSION_DATE) }),
      window.NOOK_ENV === 'web' ? h('button', { class: 'chip sm', onclick: async () => { await Update.check(true); if (!Update.newer) UI.toast('已經是最新版本', 'i_check', 2.2); } }, '檢查更新') : null));
    return out;
  };
})();
