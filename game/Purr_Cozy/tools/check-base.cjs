#!/usr/bin/env node
// Run BEFORE copying the 0.92.29 files. Either from the game root:  node <package>/purrcozy/tools/check-base.cjs
// or from anywhere with the game root as argument:  node purrcozy/tools/check-base.cjs "C:\\path\\to\\Purr_Cozy"
// The five files below are replaced wholesale. They were rewritten from the 0.92.27 snapshot in the handoff package;
// if your local copy differs (e.g. later fixes), the script tells you which ones to merge by hand instead of overwriting.
const fs=require('fs'),path=require('path');
// [crc32 as shipped, crc32 with CRLF→LF] so a checkout with different line endings (git autocrlf) still counts as unchanged.
// Each entry lists accepted versions: the 0.92.27 handoff snapshot and Jami's local 0.92.29 (furniture-motion load order,
// pendulum artSize29 + musicShortcut in cozy-update.js), which this package's replacement files already include.
const BASE={'js/bootstrap.js':[['7573b744','6540bda0'],['f4dd79dc','d6e0de37']],'js/cozy-refine.js':[['ca01ef28','da1a60da']],'js/cozy-update.js':[['12b754a8','5954365e'],['7c9a35f7','9671b813']],'js/furniture-play.js':[['9aebe915','3b135dbb']],'css/cozy-update.css':[['438d2668','438d2668']]};
const table=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0});
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=table[(c^x)&255]^(c>>>8);return((c^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0')};
const root=path.resolve(process.argv[2]||process.cwd());let differ=0;
if(!fs.existsSync(path.join(root,'js','bootstrap.js'))&&!fs.existsSync(path.join(root,'js','cozy-update.js'))){
 console.log('找不到遊戲檔案：'+root+'\n這個資料夾看起來不是 Purr Cozy 遊戲的根目錄（應該要有 js\\bootstrap.js、js\\cozy-update.js）。\n請把遊戲根目錄的路徑加在指令後面，例如：\n  node purrcozy\\tools\\check-base.cjs "C:\\你的路徑\\Purr_Cozy"\n或先 cd 到遊戲根目錄再執行。');
 process.exit(2)}
console.log('檢查遊戲資料夾：'+root+'\n');
for(const[f,want]of Object.entries(BASE)){const p=path.join(root,f);if(!fs.existsSync(p)){console.log('MISSING  '+f);differ++;continue}const buf=fs.readFileSync(p),got=crc(buf),lf=crc(Buffer.from(buf.toString('latin1').replace(/\r\n/g,'\n'),'latin1'));
 const hit=want.findIndex(([r,l])=>got===r||lf===l);if(hit>=0)console.log('OK       '+f+'  ('+(hit?'local 0.92.29':'0.92.27 handoff')+' version, safe to replace)');else{differ++;console.log('CHANGED  '+f+'  crc '+got+'  → merge by hand with patches/'+path.basename(f)+'.patch')}}
console.log(differ?`\n${differ} file(s) differ from the handoff baseline. Copy the new minigame-* files, then apply the listed edits by hand for those files.`:'\nAll baseline files match. You can copy the whole purrcozy/ folder over the repo.');
process.exitCode=differ?1:0;
