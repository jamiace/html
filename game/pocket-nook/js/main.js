/* Prepare every visual resource and the account save before revealing the room. */
(async function () {
  const B = window.PurrBoot;
  try {
    const pixel = SpriteFiles.load(20000).then(result => { B.set('pixel',1); return result; });
    const hd = HD2D.load();
    const results = await Promise.all([pixel, hd, document.fonts.ready]);
    B.set('pixel', 1);
    if (!results[1]) throw Error('HD-2D 素材尚未完整載入，請檢查網路後重試。');
    B.set('hd', 1);
    B.message('正在讀取帳號與雲端存檔…');
    const originalOnUser = Cloud.onUser.bind(Cloud);
    let authPending = 0;
    Cloud.onUser = async function (u) {
      authPending++;
      try { return await originalOnUser(u); }
      finally { authPending--; }
    };
    document.getElementById('edit-done').addEventListener('click', () => UI.setEdit(false));
    document.getElementById('edit-sto').addEventListener('click', () => UI.openWin('storage'));
    boot({});
    const outcome = await new Promise(resolve => {
      const began = Date.now();
      const poll = setInterval(() => {
        const choosing = Cloud.status === 'choose' || Cloud.working;
        document.body.classList.toggle('purr-save-choice', choosing);
        if (choosing) B.message('請先選擇要使用的存檔。');
        if (!authPending && !choosing && ['off','unconfigured','signedout','synced','error','offline','paused','outdated'].includes(Cloud.status)) {
          clearInterval(poll); resolve(Cloud.status);
        } else if (!choosing && Date.now() - began >= 30000) {
          clearInterval(poll); resolve('timeout');
        }
      }, 100);
    });
    B.set('cloud', 1);
    HD2D.attach();
    HD2D.enabled = !!(Game.S.settings.hd2d || window.NOOK_HD_DEMO);
    HD2D.sync();
    Room.indexItems(); Room.buildBg(Game.S.wp, Game.S.fl); Room.computeEnv(Game.S.settings);
    UI.refreshAll(); Mobile.render(); UI.layout(); Room.render(0);
    B.message(outcome === 'timeout' ? '雲端讀取逾時，先載入這台裝置的房間。' : '小窩準備好了');
    await B.minimumDisplay();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.body.classList.remove('purr-loading', 'purr-save-choice');
    document.getElementById('loading').remove();
    Game.startRendering();
    if (outcome === 'timeout') UI.toast('雲端讀取超過 30 秒，先使用本機進度；連線恢復後會繼續同步。', 'i_cloud', 7);
  } catch (error) {
    console.error('[Purr Cozy startup]', error);
    B.fail(error.message || '小窩尚未準備完成，請重新載入。');
  }
})();
