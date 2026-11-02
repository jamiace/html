#!/usr/bin/env node
// 0.92.37 update check. Run BEFORE copying:  node purrcozy\tools\check-update.cjs "D:\path\to\Purr_Cozy"
// OK = the version you sent or 0.92.36 (safe to overwrite) · NEW = new file · DONE = already 0.92.37 · CHANGED = edited since.
const fs=require('fs'),path=require('path');
const BASE={"js/bootstrap.js":["cd1f3d32","a314effc","9fbfc935","f3b3439f"],"js/minigame-wiring.js":["4b52d052","5229e89a"],"css/minigames.css":["2ac155dd","7381bbc9"],"js/minigame-kit.js":["a08d053a"],"js/minigame-cards.js":["55c32d89"],"js/minigame-arcade.js":["3af3bb53"],"js/minigame-pinball.js":["cb3aa123"],"js/minigame-table.js":["39fc3bdc"],"js/minigame-vending.js":["3c666262"]};
const NEW={"js/bootstrap.js":["9fbfc935","f3b3439f"],"js/minigame-wiring.js":["5229e89a","5229e89a"],"css/minigames.css":["407e9527","407e9527"],"js/minigame-kit.js":["a08d053a","a08d053a"],"js/minigame-cards.js":["33c43015","33c43015"],"js/minigame-arcade.js":["3af3bb53","3af3bb53"],"js/minigame-pinball.js":["493cf40a","493cf40a"],"js/minigame-table.js":["949dd4a0","949dd4a0"],"js/minigame-vending.js":["d30532b1","d30532b1"]};
const table=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0});
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=table[(c^x)&255]^(c>>>8);return((c^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0')};
const root=path.resolve(process.argv[2]||process.cwd());
if(!fs.existsSync(path.join(root,'js','bootstrap.js'))){console.log('找不到遊戲檔案：'+root+'\n請把遊戲根目錄（有 js\\bootstrap.js 的那層）加在指令後面。');process.exit(2)}
console.log('檢查遊戲資料夾：'+root+'\n');let bad=0,todo=0;
const hit=(w,a,b)=>w&&(w.includes(a)||w.includes(b));
for(const f of Object.keys(NEW)){const p=path.join(root,f);
 if(!fs.existsSync(p)){if(BASE[f]===null||/minigame-(kit|cards|arcade)\.js$/.test(f)){todo++;console.log('NEW      '+f+'  (新檔，會加入)')}else{bad++;console.log('MISSING  '+f)}continue}
 const b=fs.readFileSync(p),got=crc(b),n=crc(Buffer.from(b.toString('latin1').replace(/\r\n/g,'\n'),'latin1'));
 if(hit(NEW[f],got,n))console.log('DONE     '+f+'  (已經是 0.92.37)');
 else if(hit(BASE[f],got,n)){todo++;console.log('OK       '+f+'  (你傳來的版本或 0.92.36，可以覆蓋)')}
 else{bad++;console.log('CHANGED  '+f+'  (改過了：先不要覆蓋，把檔案傳給 Claude 合併)')}}
console.log(bad?'\n'+bad+' 個檔案和你傳來的版本不同，先不要整包覆蓋。':todo?'\n沒有衝突：可以把 purrcozy\\ 整包複製到遊戲根目錄覆蓋。':'\n全部已經是 0.92.37。只要確認 i18n 已合併、version.json 已更新。');process.exitCode=bad?1:0;
