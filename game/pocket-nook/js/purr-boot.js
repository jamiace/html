/* Runs before game scripts, so the room never flashes during startup. */
window.PurrBoot = {
  values: { pixel: 0, hd: 0, cloud: 0 }, hdDone: 0, objectDone: 0, objectTotal: 0, high: 0,
  set(part, value) {
    this.values[part] = Math.min(1, Math.max(0, value));
    const v = this.values, percent = Math.floor((v.pixel * .2 + v.hd * .6 + v.cloud * .2) * 100);
    this.high = Math.max(this.high, percent);
    const bar = document.getElementById('load-progress');
    bar.value = this.high;
    document.getElementById('load-percent').textContent = this.high + '%';
  },
  message(text) { document.getElementById('load-status').textContent = text; },
  hdStep() { this.hdDone++; this.set('hd', Math.min(1, this.hdDone / 10) * .2); },
  hdManifest(total) { this.objectTotal = total; this.set('hd', .2 + (total ? 0 : .8)); },
  objectStep() { this.objectDone++; this.set('hd', .2 + .8 * this.objectDone / Math.max(1,this.objectTotal)); },
  fail(text) { document.body.classList.remove('purr-save-choice'); this.message(text); document.getElementById('load-retry').hidden = false; },
};
document.getElementById('load-retry').addEventListener('click', () => location.reload());
window.addEventListener('error', e => {
  if (!document.body.classList.contains('purr-loading')) return;
  if (e.target?.tagName === 'SCRIPT' || e.error) PurrBoot.fail('遊戲啟動未完成，請重新載入；若持續發生，請檢查網路連線。');
}, true);
