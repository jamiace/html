"""vocab.json -> src/vocab.js  (python3 tools_vocab.py data/vocab.json src/vocab.js)"""
import json, re, collections, sys, os
src = sys.argv[1] if len(sys.argv) > 1 else 'data/vocab.json'
dst = sys.argv[2] if len(sys.argv) > 2 else 'src/vocab.js'
d = json.load(open(src, encoding='utf-8'))
FIX = {('can', 'v. (aux.)'): '能夠；可以'}   # 原始資料裡助動詞 can 的中文誤植成「罐頭」
def clean_word(w):
    w = w.replace('’', "'").replace('‘', "'").strip(); note = ''
    m = re.match(r'^(.*?)\s*\((=.*)\)\s*$', w)
    if m: w, note = m.group(1).strip(), m.group(2).strip()
    elif '=' in w and not w.startswith('='):
        a, b = w.split('=', 1); w, note = a.strip(), '=' + b.strip()
    return w, note
def clean_mean(z):
    parts = [re.sub(r'^\s*\d+\.\s*', '', s).strip() for s in z.replace('\r', '').split('\n')]
    return '；'.join(p for p in parts if p)
merged = collections.OrderedDict()
for x in d:
    w, note = clean_word(x['word']); p = (x.get('partOfSpeech') or '').strip()
    z = FIX.get((w, p)) or clean_mean(x.get('meaning') or '')
    if not w or not z: continue
    ph = (x.get('phonetic') or '').strip()
    if ph.startswith('[['): ph = ph[1:]
    lv = int(x.get('level') or 1); au = x.get('audio') or ''
    if w not in merged: merged[w] = dict(w=w, p=[p] if p else [], z=[s for s in z.split('；') if s], t=lv, ph=ph, au=au, note=note); continue
    m = merged[w]
    if p and p not in m['p']: m['p'].append(p)
    for s in z.split('；'):
        if s and s not in m['z']: m['z'].append(s)
    m['t'] = min(m['t'], lv); m['ph'] = m['ph'] or ph; m['note'] = m['note'] or note
items = sorted(merged.values(), key=lambda m: m['t'])
lines, cur = [], None
for m in items:
    if m['t'] != cur: cur = m['t']; lines.append(f'#{cur}')
    pos = '/'.join(dict.fromkeys('/'.join(m['p']).split('/'))) if m['p'] else ''
    z = '；'.join(m['z']) + (f'（{m["note"]}）' if m['note'] else '')
    au = '' if m['au'] in ('', m['w'] + '.mp3') else m['au']
    f = [m['w'], pos, z, m['ph'], au]
    f = [s.replace('|', '/').replace('`', "'").replace('\\', '/').replace('${', '$ {') for s in f]
    while f and f[-1] == '': f.pop()
    lines.append('|'.join(f))
head = f'''/* ============================================================
   英文單字（Level 1–6，共 {len(items)} 個，由 vocab.json 轉換）
   格式：英文|詞性|中文|音標|音檔（音檔省略時是「英文.mp3」）
   #1 … #6 是程度（Level）。換單字表：python3 tools/vocab-to-js.py 你的檔案.json js/vocab.js
   ============================================================ */
'''
tail = r'''const VOCAB = (() => {
  const out = [], seen = new Set(); let tier = 1;
  for (const raw of VOCAB_RAW.split('\n')) {
    const line = raw.trim(); if (!line) continue;
    if (line[0] === '#') { tier = +line.slice(1) || tier; continue; }
    const [w, p, z, ph, au] = line.split('|'); if (!w || !z || seen.has(w)) continue;
    seen.add(w); out.push({ i: out.length, w, p: p || '', z, t: tier, ph: ph || '', au: au || w + '.mp3' });
  }
  return out;
})();
const VIDX = (() => { const m = {}; for (const v of VOCAB) m[v.w] = v.i; return m; })();
const VLEVELS = [...new Set(VOCAB.map(v => v.t))].sort((a, b) => a - b);
const TIER_NAME = new Proxy({}, { get: (_, k) => 'Level ' + String(k) });
'''
open(dst, 'w', encoding='utf-8').write(head + 'const VOCAB_RAW = `\n' + '\n'.join(lines) + '\n`;\n' + tail)
print(len(items), 'words', collections.Counter(m['t'] for m in items), os.path.getsize(dst) // 1024, 'KB')
