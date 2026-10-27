#!/usr/bin/env node
/* 把 LXGW WenKai TC（霞鶩文楷 TC，SIL OFL 1.1）下載到 assets/fonts/wenkai/，
 * 讓網站完全使用自己的字型檔，不再向 Google Fonts 載入。
 *
 * 用法（在專案根目錄）：node tools/fetch-fonts.mjs
 * 需要 Node.js 18 以上（內建 fetch）。
 *
 * 字型會依照 Google Fonts 的分割方式存成很多個 woff2 小檔，瀏覽器只會下載
 * 畫面上實際用到的字，載入速度不受影響。 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = join(root, 'assets', 'fonts');
const outDir = join(fontsDir, 'wenkai');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&display=swap';

const res = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
if (!res.ok) { console.error('無法連到 Google Fonts：HTTP ' + res.status); process.exit(1); }
const css = await res.text();
const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1].replace(/['"]/g, '')))];
if (!urls.length) { console.error('回應裡沒有字型檔網址，請稍後再試。'); process.exit(1); }

await mkdir(outDir, { recursive: true });
let out = css, i = 0;
for (const u of urls) {
  const name = `wenkai-${String(i).padStart(3, '0')}.woff2`;
  const r = await fetch(u);
  if (!r.ok) { console.error(`\n下載失敗：${u}`); process.exit(1); }
  await writeFile(join(outDir, name), Buffer.from(await r.arrayBuffer()));
  out = out.split(u).join(`wenkai/${name}`);
  i++; process.stdout.write(`\r下載字型 ${i}/${urls.length}`);
}
await writeFile(join(fontsDir, 'lxgw-wenkai-tc.css'), '/* LXGW WenKai TC — SIL Open Font License 1.1 — 由 tools/fetch-fonts.mjs 下載 */\n' + out);

try {
  const lic = await (await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/lxgwwenkaitc/OFL.txt')).text();
  if (lic.includes('SIL OPEN FONT LICENSE')) await writeFile(join(fontsDir, 'OFL-LXGWWenKaiTC.txt'), lic);
} catch { /* 授權檔可到 https://github.com/lxgw/LxgwWenkaiTC 取得 */ }

const fc = join(fontsDir, 'fonts.css');
const before = await readFile(fc, 'utf8');
const after = before.replace(/@import url\("https:\/\/fonts\.googleapis\.com[^"]*"\);/, '@import url("lxgw-wenkai-tc.css");');
await writeFile(fc, after);
console.log(`\n完成：${urls.length} 個字型檔在 assets/fonts/wenkai/，fonts.css 已改成使用本機字型。`);
