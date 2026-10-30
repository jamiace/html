from pathlib import Path
import json,zlib,mimetypes
root=Path(__file__).resolve().parent.parent
crc=lambda b:format(zlib.crc32(b)&0xffffffff,'08x')
vpath=root/'version.json';build=json.loads(vpath.read_text(encoding='utf-8'))
files=[]
for p in sorted(root.rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(root).as_posix()
 if rel in {'version.json','resources.json','resources.bin'} or rel.startswith(('tools/','godot/','docs/','.git/')) or p.suffix.lower() not in {'.html','.js','.css','.json','.png','.jpg','.jpeg','.webp','.woff','.woff2','.ttf','.ico','.webmanifest','.wav','.mp3','.ogg','.flac','.m4a','.lrc','.srt'}:continue
 b=p.read_bytes();files.append({'path':rel,'bytes':len(b),'crc32':crc(b),'mime':'application/javascript' if p.suffix=='.js' else mimetypes.guess_type(p.name)[0] or 'application/octet-stream'})
m=json.dumps({'schema':3,'files':files},ensure_ascii=False,separators=(',',':')).encode('utf-8')
(root/'resources.json').write_bytes(m);build['resources']={'manifest':'resources.json','checksum':crc(m)}
vpath.write_text(json.dumps(build,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Ready:',len(files),'files; CRC32:',crc(m));print('Upload changed files and resources.json; upload version.json LAST.')
