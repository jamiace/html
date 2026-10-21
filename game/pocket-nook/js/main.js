/* 啟動：先載入 PNG 圖檔（若有），再開始遊戲 */
(async function () {
  try { const r = await SpriteFiles.load(); if (r.total) console.info(`[sprites] 已載入 ${r.loaded}/${r.total} 張 PNG`); }
  catch (e) { console.warn('[sprites]', e); }
  const loading = document.getElementById('loading'); if (loading) loading.remove();
  document.getElementById('edit-done').addEventListener('click', () => UI.setEdit(false));
  document.getElementById('edit-sto').addEventListener('click', () => UI.openWin('storage'));
  boot({});
})();
