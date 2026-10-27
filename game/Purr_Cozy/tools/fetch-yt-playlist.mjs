// Refresh the song titles of the built-in YouTube playlist (小窩電台) in js/music_yt_tracks.js.
// Usage:  node tools/fetch-yt-playlist.mjs            (Node 18 or newer, run from the project folder)
// It reads the public playlist page once and writes id, title, channel and length of every song it lists.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('js/music_default.js', 'utf8');
const list = (src.match(/list: '([\w-]+)'/) || [])[1];
if (!list) { console.error('找不到 js/music_default.js 裡的播放清單 ID'); process.exit(1); }
const html = await (await fetch(`https://www.youtube.com/playlist?list=${list}&hl=zh-TW`, { headers: { 'accept-language': 'zh-TW,zh;q=0.9' } })).text();
const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
if (!m) { console.error('讀不到播放清單內容（YouTube 頁面格式可能改了）'); process.exit(1); }
const data = JSON.parse(m[1]), out = [];
const walk = o => { if (Array.isArray(o)) return o.forEach(walk); if (!o || typeof o !== 'object') return;
  if (o.lockupViewModel) { const v = o.lockupViewModel, md = v.metadata && v.metadata.lockupMetadataViewModel; if (v.contentId && md) {
    let by = ''; try { by = md.metadata.contentMetadataViewModel.metadataRows[0].metadataParts[0].text.content; } catch (e) { }
    let len = ''; const f = x => { if (len || !x || typeof x !== 'object') return; if (x.thumbnailBadgeViewModel) { len = x.thumbnailBadgeViewModel.text || ''; return; } Object.values(x).forEach(f); }; f(v.contentImage);
    out.push([v.contentId, md.title.content, by, len]); } }
  if (o.playlistVideoRenderer) { const v = o.playlistVideoRenderer; out.push([v.videoId, (v.title.runs || [{}])[0].text || '', ((v.shortBylineText || {}).runs || [{}])[0].text || '', (v.lengthText || {}).simpleText || '']); }
  Object.values(o).forEach(walk); };
walk(data);
const seen = new Set(), rows = out.filter(r => !seen.has(r[0]) && seen.add(r[0]));
if (!rows.length) { console.error('沒有找到任何歌曲'); process.exit(1); }
const head = readFileSync('js/music_yt_tracks.js', 'utf8').split('const NOOK_YT_TRACKS')[0];
writeFileSync('js/music_yt_tracks.js', head + 'const NOOK_YT_TRACKS = [\n' + rows.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n];\n');
console.log(`寫入 ${rows.length} 首到 js/music_yt_tracks.js（第一頁最多約 100 首）`);
