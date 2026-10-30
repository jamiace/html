from pathlib import Path
import hashlib, json, mimetypes, re
root = Path(__file__).resolve().parent.parent
version_path = root / 'version.json'
build = json.loads(version_path.read_text(encoding='utf-8'))
assert re.fullmatch('\\d+\\.\\d+\\.\\d+', build['version'])
exclude = {'version.json', 'resources.json', 'resources.bin'}
ui = json.loads((root / 'i18n/ui.json').read_text(encoding='utf-8'))['messages']
boot = {k: {lang: v[lang] for lang in ['zh-TW', 'zh-CN', 'ja']} for k, v in ui.items() if k.startswith('bootResource') or k == 'bootScriptFailure'}
bootfile = root / 'js/purr-boot.js'
code = bootfile.read_text(encoding='utf-8')
code = re.sub('/\\*BOOT_STRINGS_START\\*/.*?/\\*BOOT_STRINGS_END\\*/', '/*BOOT_STRINGS_START*/\nPurrBoot.strings=' + json.dumps(boot, ensure_ascii=False, separators=(',', ':')) + ';\n/*BOOT_STRINGS_END*/', code, flags=re.S)
bootfile.write_text(code, encoding='utf-8')
files = []
data = bytearray()
for p in sorted(root.rglob('*')):
    if not p.is_file():
        continue
    rel = p.relative_to(root).as_posix()
    if rel in exclude or rel.startswith(('tools/', 'godot/', 'docs/')) or p.suffix.lower() not in {'.html', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.ttf', '.ico', '.webmanifest', '.wav', '.mp3', '.ogg', '.flac', '.m4a', '.lrc', '.srt'}:
        continue
    b = p.read_bytes()
    mime = mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
    if p.suffix == '.js':
        mime = 'application/javascript'
    e = {'path': rel, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest(), 'mime': mime, 'offset': len(data)}
    files.append(e)
    data.extend(b)
(root / 'resources.bin').write_bytes(data)
manifest = {'schema': 1, 'version': build['version'], 'files': files, 'bundle': {'path': 'resources.bin', 'sha256': hashlib.sha256(data).hexdigest()}}
m = json.dumps(manifest, ensure_ascii=False, separators=(',', ':')).encode()
(root / 'resources.json').write_bytes(m)
build['resources'] = {'manifest': 'resources.json', 'sha256': hashlib.sha256(m).hexdigest()}
version_path.write_text(json.dumps(build, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('build', build['version'], 'files', len(files), 'bytes', len(data), 'PNG', sum((f['path'].endswith('.png') for f in files)))
