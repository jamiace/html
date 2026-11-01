#!/usr/bin/env node
// 0.92.30 update check. Run BEFORE copying:  node purrcozy\tools\check-update.cjs "D:\path\to\Purr_Cozy"
// Confirms the files this update replaces are still exactly the 0.92.29 versions you merged (so overwriting loses nothing).
const fs=require('fs'),path=require('path');
const BASE={'js/bootstrap.js':['54f0d8b3','25518baf'],'js/minigame-instrument.js':['7c354d43','7c354d43'],'js/minigame-maze.js':['b29eed62','b29eed62'],'js/minigame-table.js':['dfd18764','dfd18764'],'js/minigame-wiring.js':['5cc84c06','5cc84c06'],'css/minigames.css':['e2b3ed97','e2b3ed97']};
const table=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0});
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=table[(c^x)&255]^(c>>>8);return((c^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0')};
const root=path.resolve(process.argv[2]||process.cwd());
if(!fs.existsSync(path.join(root,'js','bootstrap.js'))){console.log('找不到遊戲檔案：'+root+'\n請把遊戲根目錄（有 js\\bootstrap.js 的那層）加在指令後面。');process.exit(2)}
console.log('檢查遊戲資料夾：'+root+'\n');let bad=0;
for(const[f,[raw,lf]]of Object.entries(BASE)){const p=path.join(root,f);if(!fs.existsSync(p)){console.log('MISSING  '+f);bad++;continue}const b=fs.readFileSync(p),got=crc(b),n=crc(Buffer.from(b.toString('latin1').replace(/\r\n/g,'\n'),'latin1'));
 if(got===raw||n===lf)console.log('OK       '+f);else{bad++;console.log('CHANGED  '+f+'  (改過了：覆蓋前先比對，或把檔案傳給 Claude 合併)')}}
console.log(bad?`\n${bad} 個檔案和你上次合併的版本不同，先不要整包覆蓋。`:'\n全部 OK：可以把 purrcozy\\ 整包複製到遊戲根目錄覆蓋。');process.exitCode=bad?1:0;
