#!/usr/bin/env node
/* 把 Google 雲端硬碟資料夾（含子資料夾）裡的音樂和同名的 .lrc 歌詞檔下載到 music/，並寫出 music/playlist.json。
 *
 *   node tools/fetch-drive-music.mjs --key 你的API金鑰 [--folder 資料夾網址或ID] [--out music] [--dry]
 *
 * 也可以用環境變數 DRIVE_API_KEY / DRIVE_FOLDER。需要 Node 18 以上。
 * 已經下載過、大小相同的檔案會跳過，所以可以重複執行來同步新歌。
 * 每首歌都會記下原本的雲端檔案 ID，遊戲裡就會優先播放網站上的這份，不再串流雲端硬碟。
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const KEY = opt('key', process.env.DRIVE_API_KEY || '');
const RAW = opt('folder', process.env.DRIVE_FOLDER || '11uJHdrWUOjZBRGfyqc763bUeT6qTfD6w');
const ROOT = (RAW.match(/folders\/([\w-]+)/) || [])[1] || RAW;
const OUT = opt('out', 'music');
const DRY = args.includes('--dry');
const AUDIO = /\.(mp3|flac|m4a|aac|ogg|oga|opus|wav|webm)$/i;
if (!KEY) { console.error('需要 API 金鑰：node tools/fetch-drive-music.mjs --key AIza...'); process.exit(1); }

async function api(p, params = {}) {
  const u = new URL('https://www.googleapis.com/drive/v3/' + p);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) u.searchParams.set(k, v);
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r;
}
const safe = (s) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || '_';

const rootName = (await (await api('files/' + ROOT, { fields: 'name', supportsAllDrives: 'true' })).json()).name || 'music';
console.log(`資料夾：${rootName}`);
const tracks = [], lyrics = {};
const queue = [{ id: ROOT, parts: [] }];
const seen = new Set();
while (queue.length) {
  const f = queue.shift(); if (seen.has(f.id)) continue; seen.add(f.id);
  let pageToken = '';
  do {
    const j = await (await api('files', { q: `'${f.id}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType,size,shortcutDetails)', pageSize: '1000', orderBy: 'name', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', ...(pageToken ? { pageToken } : {}) })).json();
    for (const x of j.files || []) {
      let id = x.id, mt = x.mimeType;
      if (mt === 'application/vnd.google-apps.shortcut' && x.shortcutDetails) { id = x.shortcutDetails.targetId; mt = x.shortcutDetails.targetMimeType; }
      if (mt === 'application/vnd.google-apps.folder') queue.push({ id, parts: [...f.parts, x.name] });
      else if (/\.lrc$/i.test(x.name)) lyrics[f.parts.join('/') + '/' + x.name.replace(/\.lrc$/i, '').toLowerCase()] = { id, name: x.name, size: +x.size || 0 };
      else if ((mt || '').startsWith('audio/') || AUDIO.test(x.name)) tracks.push({ id, name: x.name, size: +x.size || 0, parts: f.parts });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
}
console.log(`找到 ${tracks.length} 首，${seen.size} 個資料夾`);

const list = [];
let got = 0, skipped = 0, bytes = 0;
for (const t of tracks) {
  const dir = path.join(OUT, ...t.parts.map(safe));
  const file = path.join(dir, safe(t.name));
  const src = file.split(path.sep).map(encodeURIComponent).join('/');
  const entry = { src, title: t.name.replace(AUDIO, ''), album: t.parts.length ? t.parts.join(' / ') : rootName, drive: t.id };
  const ly = lyrics[t.parts.join('/') + '/' + t.name.replace(AUDIO, '').toLowerCase()];
  if (ly) {
    const lf = path.join(dir, safe(ly.name)); entry.lrc = lf.split(path.sep).map(encodeURIComponent).join('/');
    if (!DRY && !(fs.existsSync(lf) && (!ly.size || fs.statSync(lf).size === ly.size))) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(lf, Buffer.from(await (await api('files/' + ly.id, { alt: 'media', supportsAllDrives: 'true' })).arrayBuffer())); }
  }
  list.push(entry);
  if (t.size > 100 * 1024 * 1024) console.warn(`  ! ${t.name} 超過 100 MB，GitHub 不接受這麼大的檔案`);
  if (DRY) continue;
  if (fs.existsSync(file) && (!t.size || fs.statSync(file).size === t.size)) { skipped++; continue; }
  fs.mkdirSync(dir, { recursive: true });
  process.stdout.write(`  下載 ${path.relative(OUT, file)} … `);
  const r = await api('files/' + t.id, { alt: 'media', supportsAllDrives: 'true' });
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(file, buf); got++; bytes += buf.length;
  console.log(`${(buf.length / 1048576).toFixed(1)} MB`);
}
if (!DRY) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'playlist.json'), JSON.stringify(list, null, 2) + '\n');
}
console.log(DRY ? `（試跑，沒有下載）共 ${list.length} 首` : `完成：下載 ${got} 首（${(bytes / 1048576).toFixed(1)} MB），已存在 ${skipped} 首，清單寫進 ${path.join(OUT, 'playlist.json')}`);
