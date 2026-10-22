#!/usr/bin/env node
/* 掃描 music/ 資料夾，產生 music/playlist.json（遊戲的「內建音樂」清單）。
 *
 *   node tools/make-playlist.mjs
 *
 * - 每個子資料夾是一個分類（專輯），子資料夾裡的子資料夾寫成「外層 / 內層」。
 * - 直接放在 music/ 底下的歌，分類叫「內建」。
 * - 標題就是檔名（去掉副檔名），清單照分類、檔名排序（數字照大小排，01、02、10）。
 * - 和歌曲同名、放在同一個資料夾的 .lrc 會自動接上當歌詞。
 * - 支援 MP3、FLAC、M4A、AAC、OGG、OPUS、WAV、WEBM。
 * 不需要安裝任何套件。推上 GitHub 時，.github/workflows/playlist.yml 也會自動跑這支程式。 */
import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC = join(ROOT, 'music');
const AUDIO = /\.(mp3|flac|m4a|aac|ogg|oga|opus|wav|webm)$/i;
const MAX_MB = 100;   // GitHub 單一檔案上限

if (!existsSync(MUSIC)) { console.error('找不到 music/ 資料夾'); process.exit(1); }
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name), st = statSync(p);
    if (st.isDirectory()) walk(p); else files.push({ p, size: st.size });
  }
})(MUSIC);

// a URL path that works for Chinese names, spaces and symbols such as # or ?
const url = (p) => 'music/' + relative(MUSIC, p).split(sep).map(encodeURIComponent).join('/');
const lrcOf = new Map(files.filter(f => /\.lrc$/i.test(f.p)).map(f => [f.p.slice(0, -4).toLowerCase(), f.p]));
const coll = new Intl.Collator('zh-Hant', { numeric: true, sensitivity: 'base' });
const tracks = [], big = [];
for (const f of files) {
  if (!AUDIO.test(f.p)) continue;
  if (f.size > MAX_MB * 1048576) big.push(relative(ROOT, f.p));
  const folder = relative(MUSIC, dirname(f.p)), album = folder ? folder.split(sep).join(' / ') : '內建';
  const t = { src: url(f.p), title: basename(f.p, extname(f.p)), album };
  const l = lrcOf.get(f.p.slice(0, -extname(f.p).length).toLowerCase()); if (l) t.lrc = url(l);
  tracks.push(t);
}
tracks.sort((a, b) => coll.compare(a.album, b.album) || coll.compare(a.title, b.title));

const out = join(MUSIC, 'playlist.json'), text = JSON.stringify(tracks, null, 1) + '\n';
const old = existsSync(out) ? readFileSync(out, 'utf8') : '';
if (old !== text) writeFileSync(out, text);
const albums = new Set(tracks.map(t => t.album)), lrc = tracks.filter(t => t.lrc).length;
console.log(`${old === text ? '沒有變動' : '已更新'} music/playlist.json：${tracks.length} 首、${albums.size} 個分類、${lrc} 首有歌詞`);
if (big.length) { console.warn(`\n這些檔案超過 ${MAX_MB} MB，GitHub 不收，請轉成 MP3 或降低位元率：\n  ` + big.join('\n  ')); process.exitCode = 1; }
