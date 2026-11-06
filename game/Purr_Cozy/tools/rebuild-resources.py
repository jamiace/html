from pathlib import Path
import json,zlib,mimetypes,subprocess,os,sys,re
if hasattr(sys.stdout,"reconfigure"):sys.stdout.reconfigure(errors="backslashreplace")
ROOT=Path(__file__).resolve().parent.parent
crc=lambda b:format(zlib.crc32(b)&0xffffffff,'08x')
AUDIO={'.wav','.mp3','.ogg','.flac','.m4a','.aac','.oga','.opus','.webm'}
TEXT={'.html','.js','.css','.json','.webmanifest','.lrc','.srt'}
SUPPORTED=TEXT|{'.png','.jpg','.jpeg','.webp','.woff','.woff2','.ttf','.ico'}
def atomic(path,data):
 temp=path.with_name(path.name+'.tmp');temp.write_bytes(data);os.replace(temp,path)
def version():
 p=ROOT/'version.json'
 if p.is_file():
  try:return json.loads(p.read_text(encoding='utf-8-sig'))
  except (ValueError,UnicodeError) as e:raise ValueError('version.json is invalid UTF-8 JSON. Restore it from the update ZIP. '+str(e))
 # Recover only from this exact tracked path; never guess a release version.
 try:
  prefix=subprocess.check_output(['git','-C',str(ROOT),'rev-parse','--show-prefix'],stderr=subprocess.DEVNULL,text=True).strip()
  data=subprocess.check_output(['git','-C',str(ROOT),'show','HEAD:'+prefix+'version.json'],stderr=subprocess.DEVNULL)
  build=json.loads(data.decode('utf-8-sig'));print('version.json missing: recovered its build identity from Git HEAD.');return build
 except (OSError,subprocess.CalledProcessError,ValueError,UnicodeError):
  raise ValueError('Missing '+str(p)+' . Restore version.json from the update ZIP; it is required in the game root. Python is already working.')
# Built-in music: the game reads data/music-builtins.json, which is part of the verified resource list.
# It is regenerated from the music/ folder on every rebuild so new songs always reach the online build.
MUSIC_AUDIO=re.compile(r'\.(mp3|flac|m4a|aac|ogg|oga|opus|wav|webm)$',re.I)
def natural(s):return [(0,int(x),'') if x.isdigit() else (1,0,x.casefold()) for x in re.split(r'(\d+)',s)]
def sync_music():
 music=ROOT/'music'
 if not music.is_dir():return
 from urllib.parse import quote
 url=lambda p:'music/'+'/'.join(quote(part,safe="-_.!~*'()") for part in p.relative_to(music).parts)
 files=[p for p in music.rglob('*') if p.is_file() and not any(x.startswith('.') for x in p.relative_to(music).parts)]
 lrc={p.with_suffix('').as_posix().lower():p for p in files if p.suffix.lower()=='.lrc'}
 tracks=[]
 for p in files:
  if not MUSIC_AUDIO.search(p.name):continue
  folder=p.parent.relative_to(music).parts;t={'src':url(p),'title':p.stem,'album':' / '.join(folder) if folder else '內建'}
  l=lrc.get(p.with_suffix('').as_posix().lower())
  if l:t['lrc']=url(l)
  tracks.append(t)
 tracks.sort(key=lambda t:(natural(t['album']),natural(t['title'])))
 def write(path,text,crlf):
  data=(text.replace('\n','\r\n') if crlf else text).encode('utf-8')
  if not path.exists() or path.read_bytes()!=data:atomic(path,data);return True
  return False
 changed=write(ROOT/'data'/'music-builtins.json',json.dumps({'schema':1,'tracks':tracks},ensure_ascii=False,indent=2)+'\n',True)
 albums=len({t['album'] for t in tracks})
 print('MUSIC:',len(tracks),'songs,',albums,'albums,',sum('lrc' in t for t in tracks),'with lyrics','(list updated)' if changed else '(no change)')
# Windows and Git ignore letter case, GitHub Pages does not. A file renamed only in case (abc.lrc -> ABC.lrc)
# keeps its old name in Git, so the online game would request a name that does not exist (HTTP 404).
def check_git_case(paths):
 try:out=subprocess.check_output(['git','-C',str(ROOT),'ls-files','-z'],stderr=subprocess.DEVNULL)
 except (OSError,subprocess.CalledProcessError):return
 tracked={}
 for raw in out.split(b'\0'):
  if raw:name=raw.decode('utf-8','replace');tracked[name.lower()]=name
 bad=[(tracked[p.lower()],p) for p in paths if p.lower() in tracked and tracked[p.lower()]!=p]
 if not bad:return
 lines=['Letter case differs between this folder and Git (GitHub Pages would answer 404):']
 for old,new in bad:lines+=['  Git:    '+old,'  Folder: '+new,'  Fix:    git mv -f "'+old+'" "'+old+'.tmp"  then  git mv -f "'+old+'.tmp" "'+new+'"']
 raise ValueError('\n'.join(lines)+'\nRun the Fix lines inside this game folder, then run Update-Game.cmd again.')
def main():
 build=version()
 if not isinstance(build,dict) or not isinstance(build.get('version'),str):raise ValueError('version.json must contain a version string.')
 required=['index.html','js/bootstrap.js','js/asset-cache.js','js/purr-boot.js','js/main.js','js/music-playlists.js','data/music-builtins.json','assets/png/catalog.json']
 missing=[p for p in required if not (ROOT/p).is_file()]
 if missing:raise ValueError('Incomplete update. Extract ALL ZIP subfolders. Missing: '+', '.join(missing))
 sync_music()
 if not re.search(r'schema\s*:\s*4', (ROOT/'js/asset-cache.js').read_text(encoding='utf-8-sig')):raise ValueError('Old js/asset-cache.js detected. Extract the complete update ZIP before rebuilding.')
 files=[]
 for p in sorted(ROOT.rglob('*')):
  if not p.is_file():continue
  rel=p.relative_to(ROOT).as_posix()
  if p.suffix.lower() in AUDIO or any(part.startswith('.') for part in p.relative_to(ROOT).parts):continue
  if rel in {'version.json','resources.json','resources.bin','music/playlist.json','js/hd-furniture.js'} or rel.startswith(('tools/','godot/','docs/','build-manifests/','assets/png/hd/','Claude outputs/')) or p.suffix.lower() not in SUPPORTED:continue
  b=p.read_bytes();text=p.suffix.lower() in TEXT
  if text:b=b.replace(b'\r\n',b'\n')
  if p.suffix.lower() in {'.json','.webmanifest'}:
   try:json.loads(b.decode('utf-8-sig'))
   except (ValueError,UnicodeError) as e:raise ValueError('Invalid JSON: '+rel+' : '+str(e))
  files.append({'path':rel,'text':text,'bytes':len(b),'crc32':crc(b),'mime':'application/javascript' if p.suffix=='.js' else mimetypes.guess_type(p.name)[0] or 'application/octet-stream'})
 check_git_case([f['path'] for f in files]+[p.relative_to(ROOT).as_posix() for p in (ROOT/'music').rglob('*') if p.is_file() and p.suffix.lower() in AUDIO])
 m=json.dumps({'schema':4,'files':files},ensure_ascii=False,separators=(',',':')).encode('utf-8');checksum=crc(m)
 folder=ROOT/'build-manifests';folder.mkdir(exist_ok=True);manifest=folder/(checksum+'.json')
 if manifest.exists() and manifest.read_bytes()!=m:raise ValueError('CRC32 manifest name collision. Existing manifest was not changed.')
 atomic(manifest,m);atomic(ROOT/'resources.json',m)
 build['resources']={'manifest':'build-manifests/'+checksum+'.json','checksum':checksum}
 atomic(ROOT/'version.json',(json.dumps(build,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
 print('READY:',len(files),'files; CRC32:',checksum)
 print('Commit all changed files including build-manifests/, resources.json and version.json together. Push ONCE.')
 print('Audio files are excluded. No Git commit or push is performed by this tool.')
if __name__=='__main__':
 try:main()
 except (OSError,ValueError) as e:
  print('ERROR: '+str(e));sys.exit(1)
