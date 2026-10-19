/* 靜態煙霧測試：模擬 Firebase 認證 / Firestore，不存取真實網站或帳號。 */
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dir=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(dir,'js/core/db.js'),'utf8');
const cheats=fs.readFileSync(path.join(dir,'js/core/cheats.js'),'utf8');
const uiLogin=fs.readFileSync(path.join(dir,'js/ui/login.js'),'utf8');
const map=new Map();const passwords=new Map();let activeUser=null,n=0;
const ts={toDate:()=>new Date()};
const auth={
  setPersistence:async()=>{},
  onAuthStateChanged(fn){Promise.resolve().then(()=>fn(activeUser));return ()=>{};},
  createUserWithEmailAndPassword:async(email,pass)=>{if(passwords.has(email)) throw Object.assign(Error('exists'),{code:'auth/email-already-in-use'}); const u={uid:'user-'+(++n),email,displayName:'',providerData:[]};passwords.set(email,{pass,user:u});activeUser=u;return {user:u};},
  signInWithEmailAndPassword:async(email,pass)=>{const x=passwords.get(email);if(!x||x.pass!==pass)throw Object.assign(Error('bad'),{code:'auth/invalid-credential'});activeUser=x.user;return {user:activeUser};},
  signOut:async()=>{activeUser=null;},
  signInWithPopup:async()=>{throw Error('no Google in test')},
  get currentUser(){return activeUser;}
};
const firestore=()=>({
  settings(){},collection(c){assert.equal(c,'saves');return {doc(uid){return {key:uid,get:async()=>({exists:map.has(uid),data:()=>map.get(uid)}),delete:async()=>map.delete(uid)}}}},
  runTransaction:async(fn)=>{const pending=[]; const tx={get:async(ref)=>({exists:map.has(ref.key),data:()=>map.get(ref.key)}),set:(ref,value)=>pending.push([ref.key,value])};await fn(tx);for(const [k,v] of pending)map.set(k,v);}
});
firestore.FieldValue={serverTimestamp:()=>ts};
const firebase={initializeApp(){},auth:()=>auth,firestore};
firebase.auth.Auth={Persistence:{LOCAL:'local'}};
const fakeStorage=()=>{
 const data=new Map();return {get length(){return data.size},getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i],_data:data};
};
function make(protocol,cfg,host,storage=fakeStorage()){
 const timers=[];const head={appendChild(el){Promise.resolve().then(()=>el.onload?.());}};
 const G={FIREBASE_CONFIG:cfg,CLOUD_ALLOWED_HOSTS:['localhost','play.example.com'],CLOUD_SOCIAL_ENABLED:false};
 const env={G, firebase, document:{head,createElement:()=>({}),addEventListener:()=>{}}, localStorage:storage,location:{protocol,hostname:host},navigator:{onLine:true},window:{},crypto:require('crypto').webcrypto,TextEncoder,Date,JSON,Promise,Math,Set,Map,console,
   addEventListener:()=>{}, setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{}};
 env.window=env;vm.createContext(env);vm.runInContext(code,env);vm.runInContext(cheats,env);
 return {env,G,storage,timers};
}
(async()=>{
 const config={apiKey:'test-only',projectId:'test-project',authDomain:'test-project.firebaseapp.com'};
 const a=make('https:',config,'play.example.com');
 // Old cheated local account must never be transferred to the cloud.
 a.storage.setItem('ps.accounts',JSON.stringify({'jamiace':{name:'jamiace',salt:'xx',hash:'xx'}}));
 a.storage.setItem('ps.save.jamiace',JSON.stringify({name:'jamiace',coins:500000000,owned:{999:1}}));
 assert.equal(await a.G.DB.ready(),false); assert.equal(a.G.DB.mode,'cloud');
 let reg=await a.G.DB.register('jamiace','password123');assert.equal(reg.ok,true);
 assert.equal(a.G.DB.save.coins,500);assert.equal(a.G.DB.save.owned[999],undefined);
 assert.equal(a.G.Cheats.damageMul(),1);
 await a.G.DB.flush(); assert.equal(map.get(activeUser.uid).save.coins,500);
 assert.ok(['ok','pending','syncing'].includes(a.G.DB.syncState));
 a.G.DB.save.coins=880;assert.equal(a.G.DB.commit(true),true); a.storage.removeItem('ps.cloudok.'+activeUser.uid); await a.G.DB.flush();
 assert.equal(map.get(activeUser.uid).save.coins,880);
 const uid=activeUser.uid; await a.G.DB.logout();
 const b=make('https:',config,'play.example.com');
 assert.equal(await b.G.DB.ready(),false); const login=await b.G.DB.login('jamiace','password123');
 assert.equal(login.ok,true);assert.equal(b.G.DB.save.coins,880);assert.equal(map.has(uid),true);
 assert.equal(b.G.Cheats.invincible(),false);await b.G.DB.logout();
 const missing=make('https:',null,'play.example.com');assert.equal(await missing.G.DB.ready(),false);
 assert.equal(missing.G.DB.mode,'setup'); assert.equal((await missing.G.DB.login('jamiace','password123')).ok,false);
 const host=make('https:',config,'not-allowed.example.com');assert.equal(await host.G.DB.ready(),false);assert.equal(host.G.DB.localReason,'host');
 const file=make('file:',null,'');assert.equal(await file.G.DB.ready(),false);assert.equal(file.G.DB.mode,'local');
 const local=await file.G.DB.register('friend','1234');assert.equal(local.ok,true);assert.equal(file.G.DB.save.coins,500);
 console.log('PASS: Cloud registration / cross-device read / cloud write / cheats disabled / old cheated save isolated / setup & domain guard / local mode');
})().catch(e=>{console.error(e);process.exitCode=1;});
