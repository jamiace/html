/* Prepare every visual resource and the account save before revealing the room. */
(async function () {
  const B = window.PurrBoot;
  try {
    const pixel = SpriteFiles.load(20000).then(result => { B.set('pixel',1); return result; });
    const chairs = ChairViews.ready;
    const results = await Promise.all([pixel, chairs, document.fonts.ready]);
    B.set('pixel', 1);

    B.message(I18n.s("u_0f9af51bc46d"));
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
        if (choosing) B.message(I18n.s("u_7ecf20110121"));
        if (!authPending && !choosing && ['off','unconfigured','signedout','synced','error','offline','paused','outdated'].includes(Cloud.status)) {
          clearInterval(poll); resolve(Cloud.status);
        } else if (!choosing && Date.now() - began >= 30000) {
          clearInterval(poll); resolve('timeout');
        }
      }, 100);
    });
    B.set('cloud', 1);
    delete Game.S.settings.hd2d;
    Room.indexItems(); Room.buildBg(Game.S.wp, Game.S.fl); Room.computeEnv(Game.S.settings);
    UI.refreshAll(); Mobile.render(); UI.layout(); Room.render(0);
    B.message(outcome === 'timeout' ? I18n.s("u_825b2d6577ca") : I18n.s("u_161321786a04"));
    await PurrAssets.commit();
    await B.minimumDisplay();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.body.classList.remove('purr-loading', 'purr-save-choice');
    document.getElementById('loading').remove();
    Game.startRendering();
    if (outcome === 'timeout') UI.toast(I18n.s("u_1c228083f513"), 'i_cloud', 7);
  } catch (error) {
    console.error('[Purr Cozy startup]', error);
    B.fail(error.message || I18n.s("u_428ce31091ba"));
  }
})();
