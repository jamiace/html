#!/usr/bin/env node
// Merges i18n/minigames-0.92.30.json into the game's FULL i18n/ui.json without dropping any existing key.
//   node tools/merge-i18n.cjs <path/to/i18n/ui.json> [i18n/minigames-0.92.30.json] [--dry]
// Supports both layouts: { messages: { key: { "zh-TW": .., "zh-CN": .., ja: .. } } }  and  { "zh-TW": { key: .. }, ... }.
// New keys are added; mini.* keys and keys listed under "replace" overwrite their old text; everything else is left untouched.
const fs=require('fs'),path=require('path');
const [target,addFile=path.join(__dirname,'..','i18n','minigames-0.92.30.json')]=process.argv.slice(2).filter(a=>!a.startsWith('--')),dry=process.argv.includes('--dry');
if(!target){console.error('usage: node tools/merge-i18n.cjs <ui.json> [additions.json] [--dry]');process.exit(1)}
const raw=fs.readFileSync(target,'utf8'),ui=JSON.parse(raw.replace(/^﻿/,'')),add=JSON.parse(fs.readFileSync(addFile,'utf8'));
const langs=add.languages;let added=0,replaced=0,kept=0;
const put=(key,entry,force)=>{
 if(ui.messages&&typeof ui.messages==='object'){const old=ui.messages[key];if(old&&!force){kept++;return}ui.messages[key]={...(old||{}),...entry};old?replaced++:added++;return}
 const present=langs.some(l=>ui[l]&&key in ui[l]);if(present&&!force){kept++;return}
 for(const l of langs){if(!ui[l]||typeof ui[l]!=='object')throw Error('Unknown ui.json layout: missing language map '+l);ui[l][key]=entry[l]}present?replaced++:added++};
// mini.* keys belong to this package, so they are refreshed if an earlier earlier draft was merged before.
for(const[k,v]of Object.entries(add.messages))put(k,v,k.startsWith('mini.'));
for(const[k,v]of Object.entries(add.replace||{}))put(k,v,true);
// Keep the file's own formatting: minified stays minified, indented keeps its indent and line endings.
const m=/\n([ \t]+)"/.exec(raw),indent=m?m[1]:undefined,eol=raw.includes('\r\n')?'\r\n':'\n';
const text=JSON.stringify(ui,null,indent).replace(/\n/g,eol)+(raw.endsWith('\n')?eol:'');
if(!dry)fs.writeFileSync(target,(raw.startsWith('﻿')?'﻿':'')+text);
console.log(`${dry?'[dry] ':''}added ${added}, replaced ${replaced}, already present ${kept} -> ${target}`);
