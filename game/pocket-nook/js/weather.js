/* Nearby weather is opt-in. Coordinates and forecast cache stay on this device. */
const Weather = {
  key:'pocketnook.weather.v1', data:null, local:null, status:'尚未選擇地區', busy:false, query:0,
  types:{clear:'晴天',cloud:'多雲',overcast:'陰天',drizzle:'細雨',rain:'下雨',storm:'雷雨',fog:'霧',snow:'下雪',wind:'有風'},
  cloudCover(type,reported){
    const manual={clear:0,cloud:38,overcast:100,drizzle:0,rain:100,storm:100,fog:80,snow:65,wind:0},value=Number.isFinite(reported)?Math.max(0,Math.min(100,reported)):(manual[type]||0);
    if(type==='cloud')return Math.max(25,Math.min(65,value));if(['overcast','rain','storm'].includes(type))return Math.max(95,value);if(type==='snow')return Math.max(55,value);return value;
  },
  veil(type){return type==='snow'?.055:type==='fog'?.12:['overcast','rain','storm'].includes(type)?.10:0;},
  load(){if(this.local)return this.local;try{this.local=JSON.parse(localStorage.getItem(this.key))||{}}catch(e){this.local={}}if(this.local.cache&&Date.now()-this.local.cache.at<3600e3)this.data=this.local.cache;return this.local},
  save(){try{localStorage.setItem(this.key,JSON.stringify(this.local))}catch(e){}},
  type(code,wind=0){if(code>=95)return 'storm';if([71,73,75,77,85,86].includes(code))return 'snow';if(code>=51&&code<=57)return 'drizzle';if(code>=61&&code<=82)return 'rain';if([45,48].includes(code))return 'fog';if(wind>=30)return 'wind';return code===3?'overcast':code===1||code===2?'cloud':'clear'},
  valid(){this.load();return this.data&&Date.now()-this.data.at<3600e3},
  setRegion(lat,lon,name){if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;this.load();if(this.abort)this.abort.abort();this.query++;this.data=null;this.local={lat:Math.round(lat*100)/100,lon:Math.round(lon*100)/100,name:name||'附近地區'};this.save();Game.S.settings.weatherMode='local';Game.save();this.fetch(true)},
  locate(){if(!navigator.geolocation)return UI.toast('這個瀏覽器無法定位，請搜尋地區','i_view');this.status='正在定位…';UI.refresh('settings');navigator.geolocation.getCurrentPosition(p=>this.setRegion(p.coords.latitude,p.coords.longitude,'附近地區'),()=>{this.status='無法定位，請改用地區搜尋';UI.refresh('settings')},{enableHighAccuracy:false,timeout:12000,maximumAge:600000})},
  async search(text){text=String(text||'').trim();if(text.length<2)return;const token=++this.searchToken;this.status='正在找地區…';this.matches=[];UI.refresh('settings');try{const url='https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:text,count:'6',language:'zh',format:'json'});const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const d=await r.json();if(token!==this.searchToken)return;this.matches=d.results||[];this.status=this.matches.length?'選擇所在地區':'找不到地區，試試城市名';}catch(e){if(token!==this.searchToken)return;this.status='地區搜尋暫時連不上，稍後再試';}UI.refresh('settings')},
  searchToken:0,matches:[],
  async fetch(force=false){const p=this.load();if(!Game.S||Game.S.settings.weatherMode!=='local'||p.lat==null||p.lon==null)return;if(this.busy&&!force)return;if(!force&&this.data&&Date.now()-this.data.at<900e3)return;
    const token=++this.query;this.busy=true;this.status='更新天氣中…';if(this.abort)this.abort.abort();const ac=this.abort=new AbortController(),timeout=setTimeout(()=>ac.abort(),12000);
    try{const base=window.NOOK_WEATHER_ENDPOINT||'https://api.open-meteo.com/v1/forecast';const url=new URL(base,location.href);url.search=new URLSearchParams({latitude:String(p.lat),longitude:String(p.lon),current:'temperature_2m,weather_code,cloud_cover,precipitation,wind_speed_10m,is_day',timezone:'auto'}).toString();const r=await fetch(url,{signal:ac.signal,credentials:'omit'});if(!r.ok)throw Error();const d=await r.json(),c=d.current;if(!c||!Number.isFinite(c.weather_code)||!Number.isFinite(c.temperature_2m))throw Error();if(token!==this.query)return;this.data={at:Date.now(),time:c.time,type:this.type(c.weather_code,c.wind_speed_10m),temp:c.temperature_2m,cloud:c.cloud_cover||0,wind:c.wind_speed_10m||0,rain:c.precipitation||0,offset:d.utc_offset_seconds||0,name:p.name};this.local.cache=this.data;this.save();this.status='已更新';}
    catch(e){if(token!==this.query)return;this.status=this.valid()?'暫時連不上，沿用最近資料':'暫時連不上，先使用手動天氣';}
    finally{clearTimeout(timeout);if(token===this.query){this.busy=false;Room.computeEnv(Game.S.settings);UI.refresh('settings')}}
  },
  panel(){this.load();const st=Game.S.settings,local=st.weatherMode==='local',d=this.valid()?this.data:null;
    const input=h('input',{type:'search',placeholder:'搜尋城市，例如：Taipei',value:this.searchText||'','aria-label':'搜尋天氣地區',oninput:e=>this.searchText=e.target.value,onkeydown:e=>{if(e.key==='Enter'){e.preventDefault();this.search(e.target.value)}}});
    return h('section',{class:'settings-card weather-card'},h('b',{text:'窗外天氣'}),h('div',{class:'row wrap'},...[[false,'自己選'],[true,'跟著附近天氣']].map(([v,label])=>h('button',{class:'chip'+(local===v?' on':''),'aria-pressed':String(local===v),onclick:()=>{st.weatherMode=v?'local':'manual';Game.save();if(v)this.fetch();Room.computeEnv(st);UI.refresh('settings')}},label))),
      local?h('div',{class:'weather-local'},h('div',{class:'row wrap'},h('button',{class:'chip',onclick:()=>this.locate()},ico('i_view',18),'使用定位'),h('button',{class:'chip',disabled:this.busy||this.local.lat==null,onclick:()=>this.fetch(true)},'更新天氣')),h('div',{class:'weather-search'},input,h('button',{class:'chip',onclick:()=>this.search(input.value)},'搜尋')),
        ...this.matches.map(m=>h('button',{class:'chip region-choice',onclick:()=>{this.matches=[];this.setRegion(m.latitude,m.longitude,[m.name,m.admin1,m.country].filter(Boolean).join(' · '))}},[m.name,m.admin1,m.country].filter(Boolean).join(' · '))),h('p',{class:'hint',text:d?`${d.name} · ${this.types[d.type]} ${Math.round(d.temp)}°C · ${new Date(d.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} 更新`:this.status}),this.status==='已更新'||!d?null:h('p',{class:'hint',text:this.status}),h('p',{class:'hint'},'地區預報可能與窗外稍有差異。資料：',h('a',{href:'https://open-meteo.com/',target:'_blank',rel:'noopener',text:'Open-Meteo'})))
      :h('div',{class:'weather-choices'},...Object.entries(this.types).map(([id,label])=>h('button',{class:'chip'+((st.weather|| (st.rain?'rain':'clear'))===id?' on':''),onclick:()=>{st.weather=id;st.rain=['rain','drizzle','storm'].includes(id);Game.save();Room.computeEnv(st);UI.refresh('settings')}},label))));
  },
};
(function(){
 const env=Room.computeEnv.bind(Room);Room.computeEnv=function(st){
   let type=st.weather||(st.rain?'rain':'clear'),d=null;
   if(st.weatherMode==='local'&&Weather.valid())d=Weather.data;
   if(d&&st.timeMode==='auto'&&window.NOOK_DEV_HOUR==null){const n=new Date(Date.now()+d.offset*1000),keep=window.NOOK_DEV_HOUR;window.NOOK_DEV_HOUR=n.getUTCHours()+n.getUTCMinutes()/60;try{env(st)}finally{window.NOOK_DEV_HOUR=keep}}else env(st);
   if(d)type=d.type;this.env.weather=type;this.env.rain=['drizzle','rain','storm'].includes(type);this.env.wind=d?d.wind:0;this.env.cloud=Weather.cloudCover(type,d?d.cloud:undefined);
   if(['overcast','fog','storm','rain'].includes(type))this.env.dark=Math.max(this.env.dark,.16);
 };
 const sky=Room.skyCols.bind(Room);Room.skyCols=function(hour){const cs=sky(hour),cover=(this.env.cloud||0)/100;if(!cover)return cs;if(this.env.weather==='drizzle'){const k=cover*.55;return cs.map(a=>a.map((v,i)=>v*(1-k)+[125,137,157][i]*k))}const night=hour<6||hour>19.3,dusk=!night&&(hour<7.5||hour>17),target=night?[25,31,47]:dusk?[101,98,119]:[112,126,141],k=cover*.78;return cs.map(a=>a.map((v,i)=>v*(1-k)+target[i]*k))};
 Room.rainOver=function(c,X,Y,w,h){const e=this.env,t=this.t,type=e.weather||(e.rain?'rain':'clear');c.save();c.beginPath();c.rect(X,Y,w,h);c.clip();
  if(['drizzle','rain','storm'].includes(type)){const n=type==='storm'?38:type==='rain'?23:9;c.fillStyle=type==='drizzle'?'rgba(210,225,255,.45)':'rgba(210,225,255,.8)';for(let i=0;i<n;i++){const ry=(t*(type==='storm'?65:40)+hsh(i,2)%100)%(h+6)-3,rx=(hsh(i,1)+t*(type==='storm'?9:2))%w;c.fillRect(X+rx,Y+ry,1,type==='drizzle'?2:4);}if(type==='storm'&&Math.sin(t*.47)> .9995){c.fillStyle='rgba(235,240,255,.5)';c.fillRect(X,Y,w,h)}}
  if(type==='snow'){c.fillStyle='rgba(245,249,255,'+Weather.veil(type)+')';c.fillRect(X,Y,w,h);c.fillStyle='#f5f9ff';for(let i=0;i<22;i++){const x=(hsh(i,7)%w+Math.sin(t+i)*3+w)%w,y=(hsh(i,3)%h+t*(4+i%4))%h;c.fillRect(X+Math.round(x),Y+Math.round(y),i%6===0?2:1,1)}}
  if(type==='fog'){c.fillStyle='rgba(222,230,235,'+Weather.veil(type)+')';c.fillRect(X,Y,w,h);for(let i=0;i<4;i++){c.fillStyle='rgba(222,230,235,.18)';c.fillRect(X,Y+((i*9+t)%h),w,4)}}
  if(['cloud','overcast','rain','storm'].includes(type)){const overcast=type!=='cloud';if(overcast){c.fillStyle='rgba(132,142,156,'+Weather.veil(type)+')';c.fillRect(X,Y,w,h)}c.fillStyle=overcast?'rgba(103,115,137,.42)':'rgba(161,179,199,.20)';for(let i=0;i<(overcast?5:2);i++){const x=X+(t*(overcast?.85:1.6)+i*17)%(w+24)-24;c.fillRect(x,Y+3+i*3,overcast?24:14,overcast?4:2);c.fillRect(x+3,Y+1+i*3,overcast?15:8,2)}}
  if(type==='wind'){c.fillStyle='rgba(230,240,245,.6)';for(let i=0;i<7;i++){const x=X+(t*18+i*13)%(w+10)-10,y=Y+4+(i*7)%(h-5);c.fillRect(x,y,6,1);c.fillRect(x+3,y+2,2,1)}}c.restore();
 };
 // Every scenery is clipped once, so new large windows and weather cannot spill onto walls.
 const draw=Room.drawWindowScene.bind(Room);Room.drawWindowScene=function(c,x,y,w,h,view){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();try{return draw(c,x,y,w,h,view)}finally{c.restore()}};
 const settings=UI.w_settings.bind(UI);UI.w_settings=function(){const out=settings();return [Weather.panel(),...out.filter(e=>!(e&&e.classList&&e.classList.contains('row')&&e.querySelector('button')&&['下雨中','下點雨'].includes(e.querySelector('button').textContent.trim()))) ]};
 window.addEventListener('load',()=>{Weather.load();Weather.fetch();setInterval(()=>{if(!document.hidden)Weather.fetch()},900e3)});document.addEventListener('visibilitychange',()=>{if(!document.hidden)Weather.fetch()});
})();
