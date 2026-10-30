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
def main():
 build=version()
 if not isinstance(build,dict) or not isinstance(build.get('version'),str):raise ValueError('version.json must contain a version string.')
 required=['index.html','js/bootstrap.js','js/asset-cache.js','js/purr-boot.js','js/main.js','js/music-playlists.js','data/music-builtins.json','assets/png/catalog.json']
 missing=[p for p in required if not (ROOT/p).is_file()]
 if missing:raise ValueError('Incomplete update. Extract ALL ZIP subfolders. Missing: '+', '.join(missing))
 if not re.search(r'schema\s*:\s*4', (ROOT/'js/asset-cache.js').read_text(encoding='utf-8-sig')):raise ValueError('Old js/asset-cache.js detected. Extract the complete update ZIP before rebuilding.')
 files=[]
 for p in sorted(ROOT.rglob('*')):
  if not p.is_file():continue
  rel=p.relative_to(ROOT).as_posix()
  if p.suffix.lower() in AUDIO or any(part.startswith('.') for part in p.relative_to(ROOT).parts):continue
  if rel in {'version.json','resources.json','resources.bin','music/playlist.json','js/hd-furniture.js'} or rel.startswith(('tools/','godot/','docs/','build-manifests/','assets/png/hd/')) or p.suffix.lower() not in SUPPORTED:continue
  b=p.read_bytes();text=p.suffix.lower() in TEXT
  if text:b=b.replace(b'\r\n',b'\n')
  if p.suffix.lower() in {'.json','.webmanifest'}:
   try:json.loads(b.decode('utf-8-sig'))
   except (ValueError,UnicodeError) as e:raise ValueError('Invalid JSON: '+rel+' : '+str(e))
  files.append({'path':rel,'text':text,'bytes':len(b),'crc32':crc(b),'mime':'application/javascript' if p.suffix=='.js' else mimetypes.guess_type(p.name)[0] or 'application/octet-stream'})
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
