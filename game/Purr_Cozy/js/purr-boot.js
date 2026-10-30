/* Runs before game scripts, so the room never flashes during startup. */
window.PurrBoot = {
  visibleSince: null, minVisibleMs: 3000,
  values: { pixel: 0, cloud: 0 }, high: 0,
  set(part, value) {
    this.values[part] = Math.min(1, Math.max(0, value));
    const v = this.values, percent = Math.floor((v.pixel * .7 + v.cloud * .3) * 100);
    this.high = Math.max(this.high, percent);
    const bar = document.getElementById('load-progress');
    bar.value = this.high;
    document.getElementById('load-percent').textContent = this.high + '%';
  },
  text(key,args=[]){let lang;try{lang=localStorage.getItem('purr-cozy.language')}catch{}const text=this.strings?.[key]?.[lang]??this.strings?.[key]?.['zh-TW']??key;return text.replace(/\{(\d+)\}/g,(_,i)=>args[i]??'')},
  async minimumDisplay() { await this.appearanceReady; await new Promise(resolve => setTimeout(resolve,Math.max(0,this.minVisibleMs-(performance.now()-this.visibleSince)))); },
  message(text) { document.getElementById('load-status').textContent = text; },
  fail(text) { document.body.classList.remove('purr-save-choice'); this.message(text); document.getElementById('load-retry').hidden = false; },
};
/*BOOT_STRINGS_START*/
PurrBoot.strings={"bootResourceSecure":{"zh-TW":"素材預載需要 HTTPS 或 localhost，請透過網站開啟遊戲。","zh-CN":"素材预载需要 HTTPS 或 localhost，请通过网站打开游戏。","ja":"素材の事前読み込みには HTTPS または localhost が必要です。Web サイトからゲームを開いてください。"},"bootResourceHTTP":{"zh-TW":"下載素材失敗（HTTP {0}）","zh-CN":"下载素材失败（HTTP {0}）","ja":"素材のダウンロードに失敗しました（HTTP {0}）"},"bootResourceManifest":{"zh-TW":"素材清單驗證失敗，請重新載入。","zh-CN":"素材清单验证失败，请重新加载。","ja":"素材一覧の検証に失敗しました。再読み込みしてください。"},"bootResourceVersion":{"zh-TW":"素材版本不一致，請重新載入。","zh-CN":"素材版本不一致，请重新加载。","ja":"素材のバージョンが一致しません。再読み込みしてください。"},"bootResourceFile":{"zh-TW":"素材驗證失敗：{0}","zh-CN":"素材验证失败：{0}","ja":"素材の検証に失敗しました：{0}"},"bootResourceBundle":{"zh-TW":"素材包驗證失敗。","zh-CN":"素材包验证失败。","ja":"素材パッケージの検証に失敗しました。"},"bootResourceProgress":{"zh-TW":"下載並檢查素材 {0}%","zh-CN":"下载并检查素材 {0}%","ja":"素材をダウンロード・確認中 {0}%"},"bootResourceMissing":{"zh-TW":"本機素材遺失：{0}","zh-CN":"本机素材丢失：{0}","ja":"端末内の素材が見つかりません：{0}"},"bootResourceUnlisted":{"zh-TW":"素材未列入清單：{0}","zh-CN":"素材未列入清单：{0}","ja":"素材一覧に登録されていません：{0}"},"bootResourceNoBuild":{"zh-TW":"無法讀取 version.json，請檢查網路後重試。","zh-CN":"无法读取 version.json，请检查网络后重试。","ja":"version.json を読み込めません。通信状況を確認して再試行してください。"},"bootResourceFormat":{"zh-TW":"版本或素材清單格式不正確。","zh-CN":"版本或素材清单格式不正确。","ja":"バージョン情報または素材一覧の形式が正しくありません。"},"bootResourceScript":{"zh-TW":"無法載入：{0}","zh-CN":"无法加载：{0}","ja":"読み込めません：{0}"},"bootResourceCss":{"zh-TW":"無法載入介面樣式：{0}","zh-CN":"无法加载界面样式：{0}","ja":"画面のスタイルを読み込めません：{0}"},"bootScriptFailure":{"zh-TW":"遊戲啟動未完成，請重新載入；若持續發生，請檢查網路連線。","zh-CN":"游戏启动未完成，请重新加载；如持续发生，请检查网络连接。","ja":"ゲームを起動できませんでした。再読み込みしても解決しない場合は、通信状況を確認してください。"},"bootResourceRepair":{"zh-TW":"正在修復舊版本素材快取……","zh-CN":"正在修复旧版本素材缓存……","ja":"旧バージョンの素材キャッシュを修復しています……"}};
/*BOOT_STRINGS_END*/
PurrBoot.appearanceReady = document.querySelector('.purr-splash img').decode().catch(() => {}).then(() => new Promise(resolve => requestAnimationFrame(() => { PurrBoot.visibleSince=performance.now(); resolve(); })));
document.getElementById('load-retry').addEventListener('click', () => { const url=new URL(location.href);url.searchParams.set('refresh',String(Date.now()));location.replace(url.href); });
window.addEventListener('error', e => {
  if (!document.body.classList.contains('purr-loading')) return;
  if (e.target?.tagName === 'SCRIPT' || e.error) PurrBoot.fail(PurrBoot.text('bootScriptFailure'));
}, true);
