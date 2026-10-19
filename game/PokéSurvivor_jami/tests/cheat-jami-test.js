/* 單機版 JAMI 隱藏啟動鍵：不連線、不修改真實存檔。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(path.join(__dirname, '../js/core/cheats.js'), 'utf8');

function fixture(mode='local') {
  const control = { visible: ['scr-menu'], now: 1000, keydown: null, toasts: [], level:0, resumes:0 };
  const dom = new Map();
  function el(id) {
    if (!dom.has(id)) dom.set(id, {
      id, hidden:false, value:'', checked:false, disabled:false, tagName:'DIV', isContentEditable:false,
      classList:{toggle(){}}, dataset:{}, addEventListener(){},
      querySelectorAll(){return []}, click(){}, remove(){}, appendChild(){},
      set innerHTML(x){this._html=x},get innerHTML(){return this._html}
    });
    return dom.get(id);
  }
  const document = {
    getElementById:el,
    createElement:()=>el('ps-cheat-overlay'),
    querySelectorAll:()=>control.visible.map(el),
    body:{appendChild(){}}
  };
  const G = {
    DB:{mode, save:{coins:500,tickets:{t1:2,t10:3}, name:'test', partner:1}, guest:false,user:'test'},
    UI:{refreshCoins(){},toast(x){control.toasts.push(x)}},
    Game:{state:'ui',player:{hp:90,maxHp:100},debugLevelUp(){control.level++},togglePause(){control.resumes++;this.state='playing'}},
    Coop:{active:false},
  };
  const win = {addEventListener(type, fn, capture){if(type==='keydown' && capture) control.keydown=fn;}};
  const ctx = {window:win, document, G, localStorage:{setItem(){}},Date,JSON,Math,Set,Number,Error,console,performance:{now:()=>control.now}};
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  G.Cheats.init();
  function key(k, opts={}) {
    control.now += 200;
    let prevented=false;
    const event={key:k,code:k==='F9'?'F9':`Key${k.toUpperCase()}`, target:{tagName:opts.tagName||'BODY',isContentEditable:false},isComposing:false,repeat:false,ctrlKey:false,altKey:false,metaKey:false,
      preventDefault(){prevented=true},stopPropagation(){},stopImmediatePropagation(){}};
    control.keydown({...event,...opts});
    return prevented;
  }
  function write(seq){for(const c of seq) key(c);}
  return {G,control,el,key,write};
}
const f=fixture();
f.key('F9');assert.equal(f.G.Cheats.isOpen(),false,'F9 must not open');
f.write('JaMi');assert.equal(f.G.Cheats.isOpen(),true,'case insensitive on main menu');
f.key('Escape');assert.equal(f.G.Cheats.isOpen(),false,'Escape closes');
f.write('JA');f.control.now+=2600;f.write('MI');assert.equal(f.G.Cheats.isOpen(),false,'expired sequence');
f.control.visible=['scr-gacha'];f.write('JAMI');assert.equal(f.G.Cheats.isOpen(),false,'gacha is not eligible');
f.control.visible=['scr-menu','scr-settings'];f.write('JAMI');assert.equal(f.G.Cheats.isOpen(),false,'no trigger through overlaid settings');
f.control.visible=['scr-menu'];for(const c of 'JAMI') f.key(c,{tagName:'INPUT'});assert.equal(f.G.Cheats.isOpen(),false,'typing form text is safe');
f.G.Game.state='playing';f.control.visible=[];f.write('JAMI');assert.equal(f.G.Cheats.isOpen(),false,'running gameplay is not eligible');
f.G.Game.state='paused';f.control.visible=['scr-pause'];f.write('jAmI');assert.equal(f.G.Cheats.isOpen(),true,'pause should open');
f.G.Cheats.close();assert.equal(f.G.Game.state,'paused','closing cheat panel should preserve pause');
f.write('JAMI');assert.equal(f.G.Cheats.isOpen(),true,'reopen from pause');
f.el('ps-cheat-run-msg');
f.G.Cheats.close();
const cloud=fixture('cloud');cloud.write('JAMI');assert.equal(cloud.G.Cheats.isOpen(),false,'cloud cheat is disabled');assert.equal(cloud.control.toasts.length,1,'cloud blocked notice');
console.log('JAMI cheat hotkey checks passed (main menu / pause / mixed case / ignore F9 / ignore form fields / cloud isolation).');
