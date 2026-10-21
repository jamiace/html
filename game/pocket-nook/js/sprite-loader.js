/* 讀取 assets/sprites/overrides.json 列出的 PNG，取代同名的程式繪製圖。
 * assets/sprites/ 裡有所有圖的 PNG（一千多張）可以拿來參考或修改；
 * 改好之後把檔名（不含 .png）加進 overrides.json，遊戲才會讀取，避免一次下載上千張圖。
 * PNG 會依照調色盤轉成內部格式，所以用 assets/palette 裡的顏色畫，
 * 家具換色（例如粉紅床、藍沙發）就會自動套用；調色盤以外的顏色會原樣保留。 */
const SpriteFiles = {
  base: '',
  async load(timeoutMs = 8000) {
    if (!window.NOOK_USE_PNG_SPRITES || location.protocol === 'file:') return { loaded: 0, skipped: true };
    let idx;
    try { const res = await fetch(this.base + 'assets/sprites/overrides.json', { cache: 'no-cache' }); if (!res.ok) return { loaded: 0 }; idx = await res.json(); }
    catch (e) { return { loaded: 0 }; }
    const names = (Array.isArray(idx) ? idx : Array.isArray(idx.sprites) ? idx.sprites : []).filter(n => typeof n === 'string' && SPR.defs[n]);
    let loaded = 0;
    const one = (name) => new Promise(ok => {
      const img = new Image();
      img.onload = () => { try { SPR.override(name, Grid.fromImage(img)); loaded++; } catch (e) { console.warn('[sprites] 無法讀取', name, e); } ok(); };
      img.onerror = () => { console.warn('[sprites] 找不到', name + '.png，改用內建圖'); ok(); };
      img.src = this.base + 'assets/sprites/' + encodeURIComponent(name) + '.png?v=' + (idx.version || 1);
    });
    await Promise.race([Promise.all(names.map(one)), new Promise(ok => setTimeout(ok, timeoutMs))]);
    return { loaded, total: names.length };
  },
};
