#!/usr/bin/env node
// 0.92.34 update check. Run BEFORE copying:  node purrcozy\tools\check-update.cjs "D:\path\to\Purr_Cozy"
// Each file is one of: OK (0.92.30-0.92.33, safe to overwrite), DONE (already 0.92.34), CHANGED (edited since).
const fs=require('fs'),path=require('path');
// Accepted base CRCs: 0.92.30 to 0.92.33 (raw and CRLF->LF)
const BASE={"js/minigame-physics.js":["72c5a754","889b7715"],"js/minigame-table.js":["fa8c7ed9","39fc3bdc"],"js/minigame-pinball.js":["121db62b","cb3aa123"],"js/minigame-toss.js":["97497b32","3dff32c5","566cf9ec"],"js/minigame-maze.js":["a5e3ff69","ae4dd620"],"js/minigame-vending.js":["89b909df","b27edb94","17572957","3c666262"],"css/minigames.css":["98f39bc3","2ac155dd"],"css/style.css":["cdbf9f89","0393fb41","3371968f","3ae3c7f8","23b590b7","1e8a2b07"]};
const NEW={"js/minigame-physics.js":["889b7715","889b7715"],"js/minigame-table.js":["39fc3bdc","39fc3bdc"],"js/minigame-pinball.js":["cb3aa123","cb3aa123"],"js/minigame-toss.js":["361718c2","361718c2"],"js/minigame-maze.js":["ae4dd620","ae4dd620"],"js/minigame-vending.js":["3c666262","3c666262"],"css/minigames.css":["2ac155dd","2ac155dd"],"css/style.css":["23b590b7","1e8a2b07"]};
const table=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0});
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=table[(c^x)&255]^(c>>>8);return((c^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0')};
const root=path.resolve(process.argv[2]||process.cwd());
if(!fs.existsSync(path.join(root,'js','bootstrap.js'))){console.log('找不到遊戲檔案：'+root+'\n請把遊戲根目錄（有 js\\bootstrap.js 的那層）加在指令後面。');process.exit(2)}
console.log('檢查遊戲資料夾：'+root+'\n');let bad=0,done=0,todo=0;
const hit=(want,got,n)=>want&&(want.includes(got)||want.includes(n));
for(const f of Object.keys(NEW)){const p=path.join(root,f);
 if(!fs.existsSync(p)){if(BASE[f]===null){todo++;console.log('NEW      '+f+'  (新檔，會加入)');}else{bad++;console.log('MISSING  '+f)}continue}
 const b=fs.readFileSync(p),got=crc(b),n=crc(Buffer.from(b.toString('latin1').replace(/\r\n/g,'\n'),'latin1'));
 if(hit(NEW[f],got,n)){done++;console.log('DONE     '+f+'  (已經是 0.92.34)')}
 else if(hit(BASE[f],got,n)){todo++;console.log('OK       '+f+'  (0.92.30～0.92.33，可以覆蓋)')}
 else{bad++;console.log('CHANGED  '+f+'  (改過了：覆蓋前先比對，或把檔案傳給 Claude 合併)')}}
if(bad)console.log(`\n${bad} 個檔案和 0.92.30～0.92.34 都不同，先不要整包覆蓋。`);
else if(!todo)console.log('\n全部已經是 0.92.34，程式不用再複製。只要確認 i18n 已合併、version.json 已更新。');
else console.log('\n沒有衝突：可以把 purrcozy\\ 整包複製到遊戲根目錄覆蓋。');
process.exitCode=bad?1:0;
