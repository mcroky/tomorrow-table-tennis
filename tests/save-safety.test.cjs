const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const between=(text,a,b)=>{assert(text.includes(a)&&text.includes(b));return text.slice(text.indexOf(a),text.indexOf(b));};
function base(){const c={window:{ClubI18n:{t:x=>x,language:'ko'},ClubAccount:{storageKey:'audit',guest:false},ClubAvatar:{defaults:()=>({}),clean:x=>x||{}}},console};vm.createContext(c);vm.runInContext(read('club-save-safety.js'),c);for(const name of ['club-bosses.js','club-equipment.js','club-match-stats.js'])vm.runInContext(read(name),c);return c;}
function career(c,raw=null){const values=new Map(raw===null?[]:[['audit',raw]]);c.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};c.globalThis=c;
 const s=read('club-career.js'),prefix=s.slice(0,s.indexOf('selected=data.activeMatch'));
 vm.runInContext(prefix+'globalThis.careerProbe={data,fresh,normalize};})();',c);return values;}
function fresh(){const c=base();career(c);return JSON.parse(JSON.stringify(c.careerProbe.fresh()));}
test('current saves and older version migrations retain progress',()=>{
 const c=base();career(c);const p=fresh();p.level=15;p.money=1200;p.wins=12;p.cleared=[0,1,2];
 assert.equal(c.careerProbe.normalize(p).money,1200);
 for(const version of [1,2]){const old={...p,version};delete old.money;const migrated=c.careerProbe.normalize(old);assert.equal(migrated.level,15);assert.equal(migrated.version,3);assert.equal(migrated.wins,12);}
});
test('malformed current save and future version refuse normalization',()=>{
 const c=base();career(c);for(const raw of [{...fresh(),level:'BROKEN'},{...fresh(),money:'BROKEN'},{...fresh(),version:4}])assert.throws(()=>c.careerProbe.normalize(raw),/SAVE_CORRUPT|SAVE_UNSUPPORTED_VERSION/);
});
test('startup stops on invalid JSON or malformed data without overwriting the primary',()=>{
 for(const raw of ['{broken',JSON.stringify({...fresh(),level:'BROKEN'})]){
  const c=base();let blockedRaw=null;c.window.ClubSaveSafety.block=(raw)=>{blockedRaw=raw;};
  const values=new Map([['audit',raw]]);c.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const s=read('club-career.js');assert.throws(()=>vm.runInContext(s.slice(0,s.indexOf('selected=data.activeMatch'))+'})();',c));assert.equal(values.get('audit'),raw);assert.equal(blockedRaw,raw);
 }
});
function cloud({different=false,nextDuringFlight=false,failMeta=false,remoteUnavailable=false}={}){
 const c=base(),messages=[];let serverRevision=1,payload=null,requests=0;
 c.client={auth:{getSession:async()=>({data:{session:{user:{id:'audit'}}}})},rpc:async(_fn,args)=>{
  requests++;if(args.p_expected_revision!==serverRevision)return {error:{code:'PT409',message:'SAVE_CONFLICT'}};
  payload=JSON.parse(JSON.stringify(args.p_payload));serverRevision++;
  if(requests===1){if(nextDuringFlight)c.cloudProbe.queueSave({...fresh(),level:21});throw Error('Response lost after commit');}
  return {data:{revision:serverRevision}};
 }};
 Object.assign(c,{status:x=>messages.push(x),setTimeout:()=>1,clearTimeout:()=>{},remoteSave:async()=>{if(remoteUnavailable)throw Error('OFFLINE');return {revision:serverRevision,payload:different?{...payload,level:22}:payload};},localWrite:()=>{if(failMeta)throw Error('QUOTA');}});
 vm.runInContext(`let saveAttempt=null;let user={id:'audit'},revision=1,pending=null,timer=0,retry=0,inflight=null,blocked=false,booted=true;const serialize=JSON.stringify,canonical=x=>x,meta=()=>({}),metaKey=()=>':sync',tr=x=>x;${between(read('club-auth.js'),'function queueSave(data){','account.prepare=')}globalThis.cloudProbe={queueSave,flush,state:()=>({revision,pending,blocked})};`,c);
 c.cloudProbe.queueSave({...fresh(),level:20});return {c,messages,state:()=>c.cloudProbe.state(),server:()=>({serverRevision,payload,requests})};
}
test('lost acknowledgement recovers and then saves newer pending progress',async()=>{
 const f=cloud({nextDuringFlight:true});await f.c.cloudProbe.flush();assert.equal(f.state().blocked,false);
 // The server contains the earlier write; acknowledge it before sending the newer one.
 // Retrying the newer payload must not infer that the older write belongs to another device.
 await f.c.cloudProbe.flush();assert.equal(f.state().blocked,false);assert.equal(f.server().payload.level,21);assert.equal(f.state().pending,null);
});
test('lost acknowledgement of an unchanged payload recovers without a false conflict',async()=>{
 const f=cloud();await f.c.cloudProbe.flush();await f.c.cloudProbe.flush();assert.equal(f.state().blocked,false);assert.equal(f.state().revision,2);assert.equal(f.state().pending,null);
});
test('genuinely different remote progress remains blocked for explicit selection',async()=>{
 const f=cloud({different:true});await f.c.cloudProbe.flush();await f.c.cloudProbe.flush();assert.equal(f.state().blocked,true);assert.notEqual(f.state().pending,null);
});
test('remote verification outage remains retryable and successful acknowledgement tolerates full cache',async()=>{
 const f=cloud({remoteUnavailable:true});await f.c.cloudProbe.flush();await f.c.cloudProbe.flush();assert.equal(f.state().blocked,false);assert.notEqual(f.state().pending,null);
 const g=cloud({failMeta:true});await g.c.cloudProbe.flush();await g.c.cloudProbe.flush();assert.equal(g.state().pending,null);assert.equal(g.state().blocked,false);
});
test('leaving the screen clears controls and pauses without changing ball state or auto-resuming',()=>{
 const handlers={},state={playing:true,careerMatch:true,keys:{KeyA:true},queuedSwing:{},velocity:[1,1]},ball={x:1,y:2,z:3},play={};
 const c={state,ball,dragging:true,releaseTouch:()=>{},career:{isMap:()=>false},$:()=>play,tr:x=>x,message:()=>{},addEventListener:(name,fn)=>handlers[name]=fn,document:{hidden:true,addEventListener:(name,fn)=>handlers[name]=fn}};vm.createContext(c);
 vm.runInContext(between(read('club-scene.js'),'function pauseForInterruption(){','career.bindSuspend('),c);
 handlers.blur();assert.equal(state.playing,false);assert.equal(Object.keys(state.keys).length,0);assert.deepEqual(Array.from(state.velocity),[0,0]);assert.deepEqual(ball,{x:1,y:2,z:3});
 c.document.hidden=false;handlers.visibilitychange();assert.equal(state.playing,false);
});
test('reduced motion removes flash and camera kick while preserving simulation effects',()=>{
 const s=read('club-scene.js'),segment=between(s,'const motionScale=auraMotion.matches?0:1;','drawMesh(venueMesh)');
 const flash={},eye=[1,2,3],fx={flash:.2,shake:.045,age:.01,lastContact:null,contactClock:null,hitstop:.08};let fov,observedEye;
 const c={auraMotion:{matches:true},fx,state:{view:'pov',povFov:50},eye,target:[0,0,0],w:800,h:600,$:()=>({style:flash}),add:(a,b)=>a.map((v,i)=>v+b[i]),mul:(a,b)=>a.map(v=>v*b),mm:x=>x,perspective:x=>{fov=x;return x;},lookAt:e=>{observedEye=e;return e;},gl:{uniformMatrix4fv:()=>{}},uVP:0,updateTouchBallGuide:()=>{},updateFollowPlayerOpacity:()=>{},dt:.016};vm.createContext(c);vm.runInContext(segment,c);
 assert.equal(flash.opacity,'0');assert.deepEqual(Array.from(observedEye),eye);assert.equal(fov,50*Math.PI/180);assert.equal(fx.hitstop,.08);
});

function authBoot(raw=null){
 class Node{constructor(){this.children=[];this.dataset={};this.hidden=false;}before(){}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}querySelector(){return this.children.find(x=>x.type==='button')||this.children.flatMap(x=>x.children||[]).find(x=>x.type==='button');}focus(){}}
 const nodes=new Map(),values=new Map(raw===null?[]:[['tomorrow-table-tennis-career-v1',raw]]),c=base();
 Object.assign(c,{document:{createElement:()=>new Node(),getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},body:new Node(),addEventListener:()=>{}},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},location:{hostname:'localhost',protocol:'http:',reload:()=>{}},setTimeout:()=>1,clearTimeout:()=>{}});
 // The real auth module creates its own gate and registers its controls.
 c.document.createElement=()=>{const n=new Node();Object.defineProperty(n,'id',{set(id){nodes.set(id,n);}});return n;};
 c.window.addEventListener=()=>{};vm.runInContext(read('club-auth.js'),c);return {c,nodes,values};
}
test('a new local player with no save can finish auth preparation',async()=>{
 const f=authBoot();await f.c.window.ClubAccount.prepare();assert.equal(f.c.window.ClubAccount.ready,true);
});
test('unsupported local progress displays recovery controls and keeps the original',()=>{
 const original=JSON.stringify({...fresh(),version:4}),f=authBoot(original);f.c.window.ClubAccount.prepare();
 assert.equal(f.c.window.ClubAccount.ready,false);assert.equal(f.values.get('tomorrow-table-tennis-career-v1'),original);assert.equal(f.values.get('tomorrow-table-tennis-career-v1:damaged'),original);
 const gate=f.nodes.get('authGate');assert.equal(gate.hidden,false);assert.ok(gate.children[0].children.some(n=>n.type==='button'&&n.textContent==='원본 내려받기'));
});
