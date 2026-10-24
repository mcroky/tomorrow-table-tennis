(() => {
'use strict';
const tr=window.ClubI18n.t;
const canvas = document.getElementById('game');
const gl = canvas.getContext('webgl', {antialias:true, alpha:false, preserveDrawingBuffer:true});
if (!gl) { const e=document.getElementById('error');e.hidden=false;e.textContent=tr('3D 화면을 열 수 없어요. 브라우저의 하드웨어 가속 설정을 확인해주세요.');return; }
const $=id=>document.getElementById(id);
const V=(x,y,z)=>[x,y,z], add=(a,b)=>a.map((n,i)=>n+b[i]), sub=(a,b)=>a.map((n,i)=>n-b[i]), mul=(a,k)=>a.map(n=>n*k);
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>mul(a,1/(Math.hypot(...a)||1)), clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
const colorCache=new Map();
function color(hex){let c=colorCache.get(hex);if(!c){c=hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255);colorCache.set(hex,c);}return c;}
function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
const program=gl.createProgram();
gl.attachShader(program,shader(gl.VERTEX_SHADER,`
attribute vec3 aPosition,aNormal,aColor;
attribute float aMaterial;
uniform mat4 uVP;
varying vec3 vColor,vNormal,vWorld;
varying float vMaterial,vDepth;
void main(){vec4 p=uVP*vec4(aPosition,1.);gl_Position=p;vColor=aColor;vNormal=aNormal;vWorld=aPosition;vMaterial=aMaterial;vDepth=p.w;}
`));
gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
precision mediump float;
uniform vec3 uFogColor,uAuraEye;
uniform float uAuraTime,uMeshOpacity;
varying vec3 vColor,vNormal,vWorld;
varying float vMaterial,vDepth;
void main(){
 if(vMaterial>=4.){float rim=1.-abs(dot(normalize(vNormal),normalize(uAuraEye-vWorld)));float pulse=.1+.9*(.5-.5*cos(uAuraTime*1.5));gl_FragColor=vec4(vColor,(vMaterial-4.)*pulse*(.12+.88*rim*rim)*uMeshOpacity);return;}
 if(vMaterial>1.5){gl_FragColor=vec4(.18,.23,.17,clamp(vMaterial-2.,0.,1.)*.20*uMeshOpacity);return;}
 vec3 n=normalize(vNormal);
 float lighting=.72+.26*max(dot(n,normalize(vec3(-.6,1.,.3))),0.)+.04*max(n.z,0.);
 vec3 col=vColor*lighting;
 if(vMaterial>.5){
  float board=floor((vWorld.x+10.)/.19);
  float seam=step(.976,fract((vWorld.x+10.)/.19));
  float endSeam=step(.993,fract((vWorld.z+board*.713)/1.7));
  float grain=sin(vWorld.z*38.+sin(vWorld.x*18.)*3.)*.008;
  col*=1.-seam*.16-endSeam*.13+sin(board*19.)*.036+grain;
 }
 float fog=clamp((vDepth-5.)*.012,0.,.16);
 gl_FragColor=vec4(mix(col,uFogColor,fog),uMeshOpacity);
}
`));
gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.77,.80,.73,1);
const attrs=['aPosition','aNormal','aColor','aMaterial'].map(n=>gl.getAttribLocation(program,n));
const uVP=gl.getUniformLocation(program,'uVP'),uFogColor=gl.getUniformLocation(program,'uFogColor'),uAuraTime=gl.getUniformLocation(program,'uAuraTime'),uAuraEye=gl.getUniformLocation(program,'uAuraEye');
const uMeshOpacity=gl.getUniformLocation(program,'uMeshOpacity');gl.uniform1f(uMeshOpacity,1);
const auraMotion=matchMedia('(prefers-reduced-motion: reduce)');
gl.uniform3fv(uFogColor,color('#c4ccba'));
let geo=[],auraGeo=[],material=0,modelFrames=[],portraitDetail=false;
const ringMeshCache=new Map(),segmentMeshCache=new Map();
function vertex(p,n,c){
 const output=material>=4?auraGeo:geo;
 const f=modelFrames[modelFrames.length-1];
 if(!f){output.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],material);return;}
 const x=p[0],y=p[1],z=p[2],nx=n[0],ny=n[1],nz=n[2],r=f.r,u=f.u,v=f.f,o=f.o;
 output.push(o[0]+r[0]*x+u[0]*y+v[0]*z,o[1]+r[1]*x+u[1]*y+v[1]*z,o[2]+r[2]*x+u[2]*y+v[2]*z,
 r[0]*nx+u[0]*ny+v[0]*nz,r[1]*nx+u[1]*ny+v[1]*nz,r[2]*nx+u[2]*ny+v[2]*nz,c[0],c[1],c[2],material);
}
function triangle(a,b,c,col,normal){const n=normal||norm(cross(sub(b,a),sub(c,a))),cc=Array.isArray(col)?col:color(col);vertex(a,n,cc);vertex(b,n,cc);vertex(c,n,cc);}
function quad(a,b,c,d,col,n){triangle(a,b,c,col,n);triangle(a,c,d,col,n);}
function box(x,y,z,w,h,d,col){const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,f=z-d/2,g=z+d/2;
 quad([a,c,g],[b,c,g],[b,e,g],[a,e,g],col,[0,0,1]);
 quad([b,c,f],[a,c,f],[a,e,f],[b,e,f],col,[0,0,-1]);
 quad([b,c,g],[b,c,f],[b,e,f],[b,e,g],col,[1,0,0]);
 quad([a,c,f],[a,c,g],[a,e,g],[a,e,f],col,[-1,0,0]);
 quad([a,e,g],[b,e,g],[b,e,f],[a,e,f],col,[0,1,0]);
 quad([a,c,f],[b,c,f],[b,c,g],[a,c,g],col,[0,-1,0]);
}
function sphere(x,y,z,rx,ry,rz,col,rows=7,cols=12){for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){
 const p=(rr,kk)=>{const a=rr*Math.PI/rows,b=kk*2*Math.PI/cols;return[x+rx*Math.sin(a)*Math.cos(b),y+ry*Math.cos(a),z+rz*Math.sin(a)*Math.sin(b)];};
 const a=p(r,k),b=p(r+1,k),c=p(r+1,k+1),d=p(r,k+1);
 const normal=norm([(a[0]+b[0]+c[0]+d[0]-4*x)/(rx*rx),(a[1]+b[1]+c[1]+d[1]-4*y)/(ry*ry),(a[2]+b[2]+c[2]+d[2]-4*z)/(rz*rz)]);
 quad(a,b,c,d,col,normal);
}}
function roundSegment(a,b,r1,r2,col,segments,smoothNormals){
 const axis=sub(b,a),length=Math.hypot(axis[0],axis[1],axis[2])||1,direction=[axis[0]/length,axis[1]/length,axis[2]/length],u=norm(cross(direction,Math.abs(direction[1])>.9?[1,0,0]:[0,1,0])),v=cross(direction,u);
 const key=segments+':'+r1+':'+r2+':'+Number(smoothNormals);let mesh=segmentMeshCache.get(key);
 if(!mesh){const data=[],emit=(p,n)=>data.push(p[0],p[1],p[2],n[0],n[1],n[2]);
  for(let i=0;i<segments;i++){const t=i*Math.PI*2/segments,t2=(i+1)*Math.PI*2/segments,n=[Math.cos(t),0,Math.sin(t)],m=[Math.cos(t2),0,Math.sin(t2)],a1=[n[0]*r1,0,n[2]*r1],a2=[m[0]*r1,0,m[2]*r1],b1=[n[0]*r2,1,n[2]*r2],b2=[m[0]*r2,1,m[2]*r2],flat=norm(add(n,m));
   const nn=smoothNormals?n:flat,mm=smoothNormals?m:flat;
   emit(a1,nn);emit(b1,nn);emit(b2,mm);emit(a1,nn);emit(b2,mm);emit(a2,mm);
   emit([0,0,0],[0,-1,0]);emit(a2,[0,-1,0]);emit(a1,[0,-1,0]);emit([0,1,0],[0,1,0]);emit(b1,[0,1,0]);emit(b2,[0,1,0]);
  }mesh=new Float32Array(data);if(segmentMeshCache.size>=256)segmentMeshCache.delete(segmentMeshCache.keys().next().value);segmentMeshCache.set(key,mesh);
 }
 withFrame(a,u,axis,v,()=>appendMesh(mesh,col));
}
function tube(a,b,r,col,segments=8){roundSegment(a,b,r,r,col,segments,false);}
function shadow(x,z,rx,rz){const c=[.18,.23,.17],n=[0,1,0];for(let i=0;i<40;i++){const t=i*2*Math.PI/40,t2=(i+1)*2*Math.PI/40;material=2.9;vertex([x,.008,z],n,c);material=2.;vertex([x+rx*1.35*Math.cos(t),.008,z+rz*1.35*Math.sin(t)],n,c);vertex([x+rx*1.35*Math.cos(t2),.008,z+rz*1.35*Math.sin(t2)],n,c);}material=0;}
function buffer(data,usage=gl.STATIC_DRAW){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),usage);return{buffer:b,count:data.length/10};}
function drawMesh(mesh,first=0,count=mesh.count){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);let offsets=[0,3,6,9],sizes=[3,3,3,1];attrs.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,sizes[i],gl.FLOAT,false,40,offsets[i]*4);});gl.drawArrays(gl.TRIANGLES,first,count);}
function lookAt(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function perspective(fov,aspect){const f=1/Math.tan(fov/2),n=.045,far=70;return[f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0];}
function mm(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let n=0;for(let k=0;k<4;k++)n+=a[k*4+r]*b[c*4+k];o[c*4+r]=n;}return o;}
function buildClubRoom(){
// Room: warm maple floor, sage walls and daylight from the left.
material=1;box(0,-.065,0,12,.12,15,'#d7aa70');material=0;
box(0,2.15,-6.2,12,4.3,.14,'#e8e6d6');box(-5.8,2.15,0,.14,4.3,12.4,'#eeeade');box(5.8,2.15,0,.14,4.3,12.4,'#e5e4d4');
box(0,.58,-6.1,11.6,1.16,.08,'#91a394');box(-5.71,.58,0,.06,1.16,12.2,'#9aaa99');box(5.71,.58,0,.06,1.16,12.2,'#9aaa99');
box(0,1.18,-6.01,11.6,.07,.11,'#c1c8b5');box(-5.65,1.18,0,.12,.07,12,'#c1c8b5');box(5.65,1.18,0,.12,.07,12,'#c1c8b5');
box(0,.055,-6.03,11.6,.1,.09,'#647e6c');box(-5.65,.055,0,.1,.1,12,'#647e6c');box(5.65,.055,0,.1,.1,12,'#647e6c');
for(let z=-4.5;z<4;z+=2.5){box(-5.66,2.55,z,.07,1.65,1.65,'#b9d6cf');for(const dz of [-.87,0,.87])box(-5.57,2.55,z+dz,.1,1.85,.06,'#f5f0dd');for(const y of [1.68,2.55,3.42])box(-5.55,y,z,.13,.065,1.8,'#f5f0dd');box(-5.45,1.62,z,.42,.1,1.96,'#e4decc');}
for(let z=-4.4;z<4;z+=2.5){quad([-4.9,.011,z-.6],[-3.9,.011,z-.1],[-1.6,.011,z+1.1],[-2.8,.011,z+1.4],'#e2ba7d',[0,1,0]);}
box(5.65,2.35,-1.8,.13,1.5,3.9,'#8c694b');box(5.56,2.35,-1.8,.06,1.32,3.68,'#bda478');
const paperColors=['#ece6c6','#ce9a7e','#bfd0ac','#e1cc8d','#ccd5ce'];for(let i=0;i<8;i++){const z=-3.2+(i%4)*.9,y=1.95+Math.floor(i/4)*.68;box(5.5,y,z,.025,.48,.6,paperColors[i%5]);for(let k=0;k<3;k++)box(5.48,y+.12-k*.07,z,.012,.017,.4,'#879280');}
for(const z of [-3.2,.2,3.6]){box(4.45,.44,z,.58,.095,1.9,'#b98653');box(4.67,.78,z,.07,.53,1.9,'#c18e5c');for(const zz of [z-.69,z+.69]){box(4.45,.2,zz,.44,.4,.06,'#425b4a');}}
box(-3.4,.4,-5,.85,.78,.62,'#ede6d0');box(-3.4,.84,-5,.9,.08,.68,'#c2b7a0');box(-3.4,1.13,-5,.28,.55,.28,'#b4d0cd');
box(0,2.4,-6.02,2.4,.72,.05,'#355748');box(0,2.4,-5.98,2.2,.55,.04,'#f1edda');
for(const x of [-.7,0,.7]){box(x,2.4,-5.94,.14,.22,.02,'#75896a');}
box(3.4,.32,-4.9,.72,.6,.4,'#45675a');box(3.4,.66,-4.9,.78,.08,.48,'#f2e8cd');
}
buildClubRoom();const clubRoomMesh=buffer(geo);geo=[];
// The table uses real proportions in metres: 2.74 x 1.525, 0.76 high.
shadow(0,0,.95,1.6);
box(0,.719,0,1.525,.07,2.74,'#184e62');box(0,.756,0,1.525,.018,2.74,'#277f9e');
for(const x of [-.7525,.7525])box(x,.766,0,.02,.003,2.74,'#f5f1de');
for(const z of [-1.36,1.36])box(0,.767,z,1.525,.003,.02,'#f5f1de');
box(0,.768,0,.003,.003,2.72,'#f1ecdc');
for(const z of [-.99,.99])for(const x of [-.54,.54]){box(x,.365,z,.055,.67,.055,'#394744');sphere(x,.05,z,.055,.05,.055,'#27312f');}
for(const x of [-.54,.54]){box(x,.34,0,.025,.04,2,'#3b4d48');tube([x,.1,-.99],[x,.65,.1],.018,'#56675d');tube([x,.1,.99],[x,.65,-.1],.018,'#56675d');}
box(0,.48,0,1.12,.06,.06,'#3e534a');
for(const x of [-.79,.79]){tube([x,.71,0],[x,.935,0],.012,'#293b37');box(x,.75,0,.075,.035,.095,'#293b37');}
for(let i=0;i<=50;i++){const x=-.775+i*1.55/50;tube([x,.778,0],[x,.921,0],.0016,'#d1d6bf',4);}
for(let j=0;j<7;j++){const y=.78+j*.023;tube([-.775,y,0],[.775,y,0],.0016,'#8d9d92',4);}
tube([-.795,.927,0],[.795,.927,0],.005,'#faf4df',6);
const staticMesh=buffer(geo);geo=[];
const dynamicMesh={buffer:gl.createBuffer(),count:0},auraMesh={buffer:gl.createBuffer(),count:0};
const portraitMeshes={key:null,body:{buffer:gl.createBuffer(),count:0},aura:{buffer:gl.createBuffer(),count:0}};
function uploadMesh(mesh,data){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);mesh.count=data.length/10;}
function drawAura(mesh,camera){if(!mesh.count)return;gl.uniform1f(uAuraTime,auraMotion.matches?1.6:performance.now()*.001);gl.uniform3fv(uAuraEye,camera);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);try{drawMesh(mesh);}finally{gl.depthMask(true);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}}
const gearRank=item=>window.ClubEquipment.rarities[item?.grade]?.order||0;
function gearAura(item,x,y,z,rx,ry,rz){if(item?.grade!=='legendary')return;const previous=material;material=4.22;try{softSphere(x,y,z,rx,ry,rz,['racket','headband'].includes(item.slot)?'#a9eadf':'#f3ce7a',5,12);}finally{material=previous;}}
function gem(x,y,z,r,col){quad([x-r,y,z],[x,y+r,z+.002],[x+r,y,z],[x,y-r,z+.002],col);}
function gearBall(x,y,z,r,item){softSphere(x,y,z,r,r,r,item.color,8,12);const grade=gearRank(item);if(grade>0)softSphere(x,y,z,r*1.007,r*.14,r*1.007,item.accent,4,12);if(grade>=2)softSphere(x,y+r*.4,z+r*.91,r*.18,r*.18,r*.04,item.accent,4,8);gearAura(item,x,y,z,r*1.5,r*1.5,r*1.5);}

let venueIndex=0,venueMesh=clubRoomMesh;
const venueCache=new Map([[0,clubRoomMesh]]);
function selectVenue(tier){
 const index=Number.isFinite(tier)?clamp(Math.floor(tier),0,7):0;venueIndex=index;
 if(venueCache.has(index)){venueMesh=venueCache.get(index);venueCache.delete(index);venueCache.set(index,venueMesh);}
 else{const oldGeo=geo,oldFrames=modelFrames,oldMaterial=material;try{geo=[];modelFrames=[];material=0;window.ClubVenues.build(index,{box,sphere,tube});venueMesh=buffer(geo);venueCache.set(index,venueMesh);}finally{geo=oldGeo;modelFrames=oldFrames;material=oldMaterial;}}
 while(venueCache.size>3){const oldest=venueCache.keys().next().value;if(oldest===0){venueCache.delete(0);venueCache.set(0,clubRoomMesh);continue;}gl.deleteBuffer(venueCache.get(oldest).buffer);venueCache.delete(oldest);}
 const v=window.ClubVenues.forTier(index),fog=color(v.fog);gl.clearColor(...fog,1);gl.uniform3fv(uFogColor,fog);$('arena').dataset.venueMood=v.dark?'night':'day';document.querySelector('.location small').textContent=v.name;$('venueCode').textContent=v.code+' / COURT 01';
}


const state={strokeStyle:'drive',serveLength:'short',serve:null,course:0,lastShot:null,previewFooting:null,queuedSwing:null,celebration:{active:false,age:0,duration:1.5,power:false,from:null},highFeed:false,playerStroke:{mix:0,selected:'forehand',locked:null,predictedX:0},enemyStroke:{mix:0,selected:'forehand',locked:null,predictedX:0},elapsed:0,velocity:[0,0],playerMotion:{phase:0,blend:0,lateral:0},enemyMotion:{phase:0,blend:0,lateral:0},enemyPrepared:false,enemyHit:false,view:'pov',povFov:56,yaw:0,pitch:.45,distance:4.5,px:0,pz:2.18,enemyX:.06,enemyZ:-2,enemyDefense:{phase:'ready',age:0,amount:0,stretch:0,recoil:0,lean:0,vx:0,targetX:0,targetY:1.1,bodyTarget:0,direction:1,pressure:0,delay:0,outcome:null,events:[]},swing:0,enemySwing:0,playing:false,pointWait:0,score:[0,0],keys:{},drag:false,moved:false,hit:false};
const career=window.ClubCareer;
const growth=()=>career.bonuses();
let specialCharge=0,specialUIKey='';const specialButtons=[];
function useSpecial(){
 if(career.isMap()||document.querySelector('dialog[open]')||tutorial.active||!state.playing||state.matchFinished||state.serve||state.pointWait>0||state.celebration.active)return;
 if(specialCharge<100){message(tr('직접 공을 받아내 필살기 게이지를 채우세요.'));return;}
 if(state.swing>0||state.hit||ball.vz<=.05||predictFlight(.26).y<=1.20){message(tr('높게 오는 공에 맞춰 필살기를 사용하세요.'));return;}
 state.queuedSwing=null;swing(true,true,false);
 if(state.swing>0&&state.playerStroke.smash){specialCharge=0;state.playerStroke.special=true;updateSpecialUI();}
}
function updateSpecialUI(){
 const charge=Math.floor(specialCharge),ready=charge>=100,disabled=!ready||tutorial.active||!state.playing||!!state.serve||state.matchFinished||state.pointWait>0||state.celebration.active;
 const key=charge+':'+disabled;if(key===specialUIKey)return;specialUIKey=key;
 for(const button of specialButtons){const label=tr('필살기')+' '+(ready?tr('준비!'):charge+'%')+(button.id==='specialShot'?' · F':'');if(button.textContent!==label)button.textContent=label;if(button.disabled!==disabled)button.disabled=disabled;button.dataset.ready=String(ready);button.style.setProperty('--charge',charge+'%');}
}
const opponentLevel=()=>state.careerMatch?career.opponent():tutorial.active?{speed:.46,reaction:2.1,power:.55,placement:.18,ease:1,mistakes:.24}:{speed:.58,reaction:1.85,power:.68,placement:.35,ease:.85,mistakes:.10};
let eye=[.12,1.57,2.95],target=[0,.77,-.3],ball={x:0,y:1,z:1.7,vx:0,vy:0,vz:0},lastTime=0;

// Character geometry uses local frames, so the racket, wrist and body rotate together.
const smooth=t=>t*t*(3-2*t);
function framePoint(p,f,normal=false){const a=add(add(mul(f.r,p[0]),mul(f.u,p[1])),mul(f.f,p[2]));return normal?a:add(f.o,a);}
function withFrame(origin,r,u,f,fn){
 const parent=modelFrames[modelFrames.length-1],frame=parent?{o:framePoint(origin,parent),r:framePoint(r,parent,true),u:framePoint(u,parent,true),f:framePoint(f,parent,true)}:{o:origin,r,u,f};
 modelFrames.push(frame);try{fn();}finally{modelFrames.pop();}
}
function rotatedFrame(origin,rx=0,ry=0,rz=0,fn){
 const rot=p=>{let [x,y,z]=p;[y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];[x,z]=[x*Math.cos(ry)+z*Math.sin(ry),-x*Math.sin(ry)+z*Math.cos(ry)];return[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz),z];};
 withFrame(origin,rot([1,0,0]),rot([0,1,0]),rot([0,0,1]),fn);
}
const sphereMeshCache=new Map();
function appendMesh(mesh,col,x=0,y=0,z=0){
 const output=material>=4?auraGeo:geo;
 const c=color(col),f=modelFrames[modelFrames.length-1];
 if(!f){for(let i=0;i<mesh.length;i+=6)output.push(x+mesh[i],y+mesh[i+1],z+mesh[i+2],mesh[i+3],mesh[i+4],mesh[i+5],c[0],c[1],c[2],material);return;}
 const r=f.r,u=f.u,v=f.f,o=f.o,ox=o[0]+r[0]*x+u[0]*y+v[0]*z,oy=o[1]+r[1]*x+u[1]*y+v[1]*z,oz=o[2]+r[2]*x+u[2]*y+v[2]*z;
 for(let i=0;i<mesh.length;i+=6){const px=mesh[i],py=mesh[i+1],pz=mesh[i+2],nx=mesh[i+3],ny=mesh[i+4],nz=mesh[i+5];output.push(ox+r[0]*px+u[0]*py+v[0]*pz,oy+r[1]*px+u[1]*py+v[1]*pz,oz+r[2]*px+u[2]*py+v[2]*pz,r[0]*nx+u[0]*ny+v[0]*nz,r[1]*nx+u[1]*ny+v[1]*nz,r[2]*nx+u[2]*ny+v[2]*nz,c[0],c[1],c[2],material);}
}
function softSphere(x,y,z,rx,ry,rz,col,rows=7,cols=12){
 if(!portraitDetail){rows=Math.min(rows,5);cols=Math.min(cols,10);}
 const quantum=portraitDetail?10000:2000,ax=Math.max(1,Math.round(rx*quantum)),ay=Math.max(1,Math.round(ry*quantum)),az=Math.max(1,Math.round(rz*quantum)),key=quantum+':'+rows+':'+cols+':'+ax+':'+ay+':'+az;let mesh=sphereMeshCache.get(key);
 if(!mesh){
  rx=ax/quantum;ry=ay/quantum;rz=az/quantum;const grid=[],out=[];
  for(let j=0;j<=rows;j++){const t=j*Math.PI/rows,st=Math.sin(t),ct=Math.cos(t);for(let i=0;i<=cols;i++){const a=i*2*Math.PI/cols,ux=st*Math.cos(a),uy=ct,uz=st*Math.sin(a),nx=ux/rx,ny=uy/ry,nz=uz/rz,length=Math.hypot(nx,ny,nz)||1;grid.push([rx*ux,ry*uy,rz*uz,nx/length,ny/length,nz/length]);}}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;for(const index of [a,b,b+1,a,b+1,a+1])out.push(...grid[index]);}
  mesh=new Float32Array(out);if(sphereMeshCache.size>=512)sphereMeshCache.delete(sphereMeshCache.keys().next().value);sphereMeshCache.set(key,mesh);
 }appendMesh(mesh,col,x,y,z);
}
function taper(a,b,r1,r2,col,segments=12){roundSegment(a,b,r1,r2,col,portraitDetail?segments:Math.min(segments,8),true);}
function rings(profile,col,segments=20){
 if(!portraitDetail)segments=Math.min(segments,16);
 const key=segments+':'+JSON.stringify(profile);let mesh=ringMeshCache.get(key);
 if(!mesh){
  const grid=[],out=[];
  for(let j=0;j<profile.length;j++){
   const r=profile[j],lo=profile[Math.max(0,j-1)],hi=profile[Math.min(profile.length-1,j+1)],dy=Math.max(.001,hi[0]-lo[0]);
   for(let i=0;i<=segments;i++){const t=i*Math.PI*2/segments,cs=Math.cos(t),sn=Math.sin(t),ax=hi[3]-lo[3]+cs*(hi[1]-lo[1]),az=hi[4]-lo[4]+sn*(hi[2]-lo[2]),tx=-sn*r[1],tz=cs*r[2],nx=dy*tz,ny=az*tx-ax*tz,nz=-dy*tx,len=Math.hypot(nx,ny,nz)||1;
    grid.push([r[3]+cs*r[1],r[0],r[4]+sn*r[2],nx/len,ny/len,nz/len]);
   }
  }
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){const p=j*(segments+1)+i,q=p+segments+1;for(const index of [p,q,q+1,p,q+1,p+1])out.push(...grid[index]);}
  mesh=new Float32Array(out);if(ringMeshCache.size>=160)ringMeshCache.clear();ringMeshCache.set(key,mesh);
 }
 const c=color(col),f=modelFrames[modelFrames.length-1];
 if(!f){for(let i=0;i<mesh.length;i+=6)geo.push(mesh[i],mesh[i+1],mesh[i+2],mesh[i+3],mesh[i+4],mesh[i+5],c[0],c[1],c[2],material);return;}
 const r=f.r,u=f.u,v=f.f,o=f.o;
 for(let i=0;i<mesh.length;i+=6){const x=mesh[i],y=mesh[i+1],z=mesh[i+2],nx=mesh[i+3],ny=mesh[i+4],nz=mesh[i+5];geo.push(o[0]+r[0]*x+u[0]*y+v[0]*z,o[1]+r[1]*x+u[1]*y+v[1]*z,o[2]+r[2]*x+u[2]*y+v[2]*z,r[0]*nx+u[0]*ny+v[0]*nz,r[1]*nx+u[1]*ny+v[1]*nz,r[2]*nx+u[2]*ny+v[2]*nz,c[0],c[1],c[2],material);}
}
function roundedRings(profile,col,segments=32){
 const subdivisions=portraitDetail?3:1;if(subdivisions===1){rings(profile,col,segments);return;}
 const smoothProfile=[];
 for(let i=0;i<profile.length-1;i++){const a=profile[Math.max(0,i-1)],b=profile[i],c=profile[i+1],d=profile[Math.min(profile.length-1,i+2)];
  for(let step=0;step<3;step++){const t=step/3,t2=t*t,t3=t2*t;smoothProfile.push(b.map((value,k)=>{if(k===0)return mix(value,c[k],t);const v=.5*((2*value)+(-a[k]+c[k])*t+(2*a[k]-5*value+4*c[k]-d[k])*t2+(-a[k]+3*value-3*c[k]+d[k])*t3);return k===1||k===2?Math.max(.003,clamp(v,Math.min(value,c[k])-.002,Math.max(value,c[k])+.002)):v;}));}
 }smoothProfile.push(profile[profile.length-1]);rings(smoothProfile,col,segments);
}
function tintHex(base,target,amount){return '#'+color(base).map((v,i)=>Math.round(mix(v,color(target)[i],amount)*255).toString(16).padStart(2,'0')).join('');}
function twoBone(root,goal,upper,lower,pole){
 const delta=sub(goal,root),d=clamp(Math.hypot(...delta),.035,upper+lower-.008),axis=norm(delta),along=(upper*upper-lower*lower+d*d)/(2*d);
 let bend=sub(pole,mul(axis,dot(pole,axis)));if(Math.hypot(...bend)<.001)bend=cross(axis,[0,0,1]);
 return add(add(root,mul(axis,along)),mul(norm(bend),Math.sqrt(Math.max(.0001,upper*upper-along*along))));
}
// Nonuniform Hermite keys keep velocity continuous through the stroke.
const strokeKeys=[
 {t:0,v:[.30,1.04,.29,0,0,0,0,0,.12,-.12]},
 {t:.16,v:[.43,1.00,-.08,-.16,-.43,.032,-.022,-.018,-.22,-.25]},
 {t:.25,v:[.45,.99,-.10,-.14,-.40,.036,-.015,-.028,-.18,-.27]},
 {t:.37,v:[.16,1.10,.46,.15,.18,-.025,.035,-.008,.21,.03]},
 {t:.60,v:[-.16,1.27,.29,.27,.57,-.053,.045,.009,.43,.58]},
 {t:.79,v:[-.07,1.17,.34,.10,.25,-.025,.023,.003,.28,.26]},
 {t:1,v:[.30,1.04,.29,0,0,0,0,0,.12,-.12]}
];
const strokeDuration=.76;

const backhandKeys=[
 {t:0,v:[.025,1.055,.29,0,.025,0,0,0,.08,.06]},
 {t:.16,v:[-.155,1.04,.185,.06,.14,-.018,-.012,-.017,-.12,.10]},
 {t:.25,v:[-.195,1.03,.16,.055,.17,-.025,-.006,-.027,-.18,.01]},
 {t:.37,v:[-.12,1.125,.485,-.075,-.14,.012,.026,-.006,.18,-.22]},
 {t:.60,v:[.145,1.225,.44,-.13,-.28,.025,.03,.006,.35,-.46]},
 {t:.79,v:[.09,1.14,.36,-.055,-.13,.011,.014,.002,.22,-.16]},
 {t:1,v:[.025,1.055,.29,0,.025,0,0,0,.08,.06]}
];
function sampleStroke(keys,t){
 let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;
 const a=keys[i],b=keys[i+1],prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)],u=clamp((t-a.t)/(b.t-a.t),0,1),dt=b.t-a.t;
 return a.v.map((v,k)=>{const m0=i===0?0:(b.v[k]-prev.v[k])/(b.t-prev.t),m1=i+1===keys.length-1?0:(next.v[k]-a.v[k])/(next.t-a.t);return(2*u*u*u-3*u*u+1)*v+(u*u*u-2*u*u+u)*m0*dt+(-2*u*u*u+3*u*u)*b.v[k]+(u*u*u-u*u)*m1*dt;});
}
function strokePose(countdown,backhand=0){
 const t=countdown>0?1-countdown:0,fh=sampleStroke(strokeKeys,t),bh=sampleStroke(backhandKeys,t),vals=fh.map((v,k)=>mix(v,bh[k],backhand));
 const coil=smooth(clamp(t/.18,0,1))*(1-smooth(clamp((t-.25)/.18,0,1))),drive=smooth(clamp((t-.25)/.14,0,1))*(1-smooth(clamp((t-.62)/.38,0,1)));
 return{t,backhand,faceTurn:Math.PI*backhand,hand:vals.slice(0,3),hip:vals[3],chest:vals[4],shift:vals[5],forward:vals[6],dip:vals[7],tilt:vals[8],roll:vals[9],bodyPitch:-.075-.045*coil+.10*drive,bodyRoll:(1-2*backhand)*(.018*coil-.030*drive),hipPitch:-.065-.025*coil+.055*drive,frontStep:.055*drive,rearHeel:.026*drive,footLift:0};
}
function prepareStroke(receiver,bodyX,bodyZ,facing,force=false){
 if(receiver.locked)return;
 const inbound=ball.vz*facing<-.05;
 if(!inbound&&!force)return;
 // Predict where the ball crosses the receiver's reach, in the receiver's right-handed frame.
 const seconds=inbound?clamp((bodyZ+facing*.45-ball.z)/ball.vz,0,.85):0;
 receiver.predictedX=ball.x+ball.vx*seconds;
 const relative=(receiver.predictedX-bodyX)*(-facing);
 if(relative<-.065)receiver.selected='backhand';
 else if(relative>.085)receiver.selected='forehand';
}
function updateFootStance(receiver,target,countdown,dt,bodyX,bodyZ){
 const s=receiver.stance||(receiver.stance={left:0,right:0,body:0,leftLift:0,rightLift:0,leftArc:0,rightArc:0,visibility:1,active:false,target:0,age:0,duration:.30});
 s.visibility=mix(s.visibility??1,receiver.defense||state.celebration.active?0:1,1-Math.exp(-dt*12));
 const allowed=!receiver.defense&&!state.celebration.active&&state.pointWait<=0&&(countdown<=.32||countdown>=.84);
 if(!s.active&&allowed&&Math.abs(target-(s.left+s.right)*.5)>.45){
  s.active=true;s.target=target;s.fromLeft=s.left;s.fromRight=s.right;s.age=0;s.duration=countdown>=.84?.23:.30;s.first=target>.5?'right':'left';s.landed=0;
 }
 if(s.active){
  s.age=Math.min(s.duration,s.age+dt);const t=s.age/s.duration;
  for(const foot of ['left','right']){
   const first=foot===s.first,u=clamp(t*2-(first?0:1),0,1),ease=u*u*u*(u*(u*6-15)+10),from=foot==='left'?s.fromLeft:s.fromRight;
   s[foot]=mix(from,s.target,ease);s[foot+'Lift']=Math.pow(Math.sin(u*Math.PI),2)*.024;s[foot+'Arc']=Math.sin(u*Math.PI)*.012;
  }
  const landed=t>=1?2:t>=.5?1:0;
  if(landed>s.landed)s.landed=landed;
  if(t>=1){s.active=false;s.left=s.right=s.target;s.leftLift=s.rightLift=s.leftArc=s.rightArc=0;}
 }
 s.body=mix(s.body,(s.left+s.right)*.5,1-Math.exp(-dt*11));
}

function updateReceiver(receiver,bodyX,bodyZ,facing,countdown,dt){
 if(countdown<=0)receiver.locked=null;
 prepareStroke(receiver,bodyX,bodyZ,facing);
 const target=(receiver.locked||receiver.selected)==='backhand'?1:0;
 receiver.mix=mix(receiver.mix,target,1-Math.exp(-(receiver.locked?15:10)*dt));
 let stanceTarget=target;
 if(receiver.locked&&countdown<.32&&ball.vz*facing<-.05){const preview={selected:receiver.selected,locked:null};prepareStroke(preview,bodyX,bodyZ,facing);receiver.nextSelected=preview.selected;stanceTarget=preview.selected==='backhand'?1:0;}else receiver.nextSelected=null;
 updateFootStance(receiver,stanceTarget,countdown,dt,bodyX,bodyZ);
}
function lockStroke(receiver,bodyX,bodyZ,facing){
 prepareStroke(receiver,bodyX,bodyZ,facing,true);
 receiver.locked=receiver.selected;
}
function reachableSide(receiver,relative){return(receiver.locked||receiver.selected)==='backhand'?relative<.22:relative>-.20;}


const sound=window.ClubSound||new window.ClubAudio();
let practiceAssist=true;try{practiceAssist=localStorage.getItem('ttk-practice-assist-v1')!=='off';}catch{}
const practiceHelp=()=>!state.careerMatch&&(practiceAssist||tutorial.active);
const fx={contactClock:null,contactVisible:true,renderLead:16,announcement:null,age:10,slowFor:0,hold:.65,hitstop:0,shake:0,flash:0,power:0,point:null,rays:[],trail:[],swingTrail:[],lastContact:null,contacts:[],rally:0};
const BALL_RADIUS=.021,FACE_X=.079,FACE_Y=.100,FACE_DEPTH=.014;
function eulerVector(p,rx=0,ry=0,rz=0){
 let [x,y,z]=p;[y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];[x,z]=[x*Math.cos(ry)+z*Math.sin(ry),-x*Math.sin(ry)+z*Math.cos(ry)];return[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz),z];
}

// A smash coils low, lifts the racket above the head, then drives through and down.
const smashKeys=[
 {t:0,v:[.30,1.04,.29,0,0,0,0,0,.12,-.12,-.075,0,0,0,0,-.065]},
 {t:.12,v:[.39,1.30,-.10,-.19,-.48,.040,-.032,-.080,-.42,-.20,-.13,-.045,.015,0,0,-.12]},
 {t:.22,v:[.28,1.60,-.085,-.27,-.74,.056,-.035,-.050,-.60,-.28,-.15,-.060,.075,.014,.038,-.12]},
 {t:.265,v:[.23,1.64,.09,-.10,-.34,.016,.015,.030,-.20,-.11,-.015,-.02,.13,.033,.020,-.02]},
 {t:.31,v:[.12,1.38,.38,.20,.42,-.045,.055,.045,.44,.10,.16,.065,.145,.055,0,.08]},
 {t:.53,v:[-.18,.98,.47,.43,.91,-.100,.125,-.025,.54,.61,.38,.12,.145,.080,0,.16]},
 {t:.68,v:[-.23,.86,.26,.28,.67,-.077,.105,-.060,.35,.56,.27,.08,.14,.044,0,.13]},
 {t:.85,v:[-.01,1.02,.27,.10,.24,-.025,.043,-.020,.20,.20,.075,.025,.065,.012,0,.02]},
 {t:1,v:[.30,1.04,.29,0,0,0,0,0,.12,-.12,-.075,0,0,0,0,-.065]}
];
const backhandSmashKeys=smashKeys.map((key,i)=>{
 const v=[...key.v],ready=i===0||i===smashKeys.length-1;
 v[0]=ready?.025:-key.v[0]*.72;v[1]=ready?1.055:key.v[1];v[2]=ready?.29:key.v[2];
 v[3]*=-.75;v[4]*=-.75;v[5]*=-.7;v[8]=ready?.08:-key.v[8];v[9]=ready?.06:-key.v[9];v[11]*=-1;
 return{t:key.t,v};
});
function smashPose(countdown,backhand){
 const t=countdown>0?1-countdown:0,fh=sampleStroke(smashKeys,t),bh=sampleStroke(backhandSmashKeys,t),v=fh.map((n,i)=>mix(n,bh[i],backhand));
 return{t,backhand,faceTurn:Math.PI*backhand,hand:v.slice(0,3),hip:v[3],chest:v[4],shift:v[5],forward:v[6],dip:v[7],tilt:v[8],roll:v[9],
 bodyPitch:v[10],bodyRoll:v[11],frontStep:v[12],rearHeel:v[13],footLift:v[14],hipPitch:v[15],power:true};
}

// Celebrate with the free hand; the racket remains in the playing hand.
const celebrationKeys=[
 {t:0,v:[.30,1.04,.29,-.25,.26,.28,-.075,0,0,0]},
 {t:.13,v:[.34,.99,.21,-.30,.39,.23,.04,-.10,-.035,-.025]},
 {t:.28,v:[.37,.94,.18,-.29,.76,.20,-.12,.16,.035,.035]},
 {t:.43,v:[.36,.95,.19,-.24,.57,.25,-.025,.10,.012,.015]},
 {t:.57,v:[.37,.94,.18,-.29,.74,.20,-.10,.16,.030,.030]},
 {t:.72,v:[.35,.97,.21,-.26,.52,.25,-.02,.07,.008,.008]},
 {t:1,v:[.30,1.04,.29,-.25,.26,.28,-.075,0,0,0]}
];
function gestureMetadata(pose,from,base,enter,exit){
 pose.gestureEnter=enter;pose.gestureExit=exit;pose.gesturePoles=from.armPoles;pose.gestureSegments=from.armSegments;
 pose.gestureStartRotation=from.wristRotation;
 pose.gestureReadyRotation={pitch:base.tilt,yaw:-base.chest*.27+base.faceTurn,roll:base.roll};
 return pose;
}
function mixAngle(a,b,t){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;}

function gestureBalanceOffset(pose){
 const loading=smooth(clamp(pose.t/(pose.power?.10:.18),0,1))*(1-smooth(clamp((pose.t-.23)/.18,0,1)))*(pose.power?1:.35),follow=Math.sin(Math.PI*clamp((pose.t-.31)/.60,0,1))*(pose.power?1:.35);
 return pose.balanceHand||eulerVector([mix(-.25+pose.chest*.10,-.31,pose.backhand)-follow*.10,.26+loading*.18,mix(.28-Math.abs(pose.chest)*.08,.12,pose.backhand)+loading*.10-follow*.10],pose.bodyPitch*.25,pose.chest*.32,pose.bodyRoll*.30);
}
function snapshotGesturePose(player){
 const rig=strikeRig(player),pose=JSON.parse(JSON.stringify(rig.pose)),left=balanceArm(rig),breath=Math.sin(state.elapsed*2.4)*.004;
 // Start at the solved wrists, including reach and torso corrections.
 pose.hand=sub(rig.localHand,[pose.shift,pose.dip+breath,pose.forward]);
 pose.balanceHand=sub(left.hand,rig.hip);
 pose.tilt=rig.rotation.pitch;pose.roll=rig.rotation.roll;pose.faceTurn=rig.rotation.yaw+pose.chest*.27;pose.wristRotation={...rig.rotation};
 const basis=[[1,0,0],[0,1,0],[0,0,1]].map(v=>eulerVector(v,...rig.torsoRotation));pose.armPoles=[sub(left.elbow,rig.localLeftShoulder),sub(rig.localElbow,rig.localShoulder)].map(v=>basis.map(b=>dot(v,b)));pose.armSegments=[[sub(left.elbow,rig.localLeftShoulder),sub(left.hand,left.elbow)],[sub(rig.localElbow,rig.localShoulder),sub(rig.localHand,rig.localElbow)]].map(arm=>arm.map(v=>basis.map(b=>dot(v,b))));
 return pose;
}

function beginCelebration(power=false){
 const c=state.celebration;c.from=snapshotGesturePose(true);c.age=0;c.duration=power?1.90:1.50;c.power=power;c.active=true;
 state.swing=0;state.playerStroke.locked=null;state.playerStroke.smash=false;state.playerStroke.aim=[0,0,0];
}
function celebrationPose(base){
 const c=state.celebration,t=clamp(c.age/c.duration,0,1),v=sampleStroke(celebrationKeys,t),enter=smooth(clamp(t/.30,0,1)),exit=1-smooth(clamp((t-.72)/.28,0,1)),w=enter*exit;
 const from=c.from||base,strength=c.power?1:.72,pose={...base};
 pose.hand=v.slice(0,3).map((n,i)=>mix(from.hand[i],n,enter));
 for(const [key,target] of [['bodyPitch',v[6]],['chest',v[7]*strength],['dip',v[8]*strength],['shift',v[9]*strength],['hip',v[7]*.45],['forward',0],['tilt',.10],['roll',-.12],['faceTurn',0],['bodyRoll',-.035*strength],['hipPitch',-.035]]){
  const n=mix(from[key]??base[key]??0,target,enter);pose[key]=mix(n,base[key]??0,1-exit);
 }
 pose.hand=pose.hand.map((n,i)=>mix(n,base.hand[i],1-exit));
 const ready=gestureBalanceOffset(base),start=from.balanceHand||ready;
 pose.balanceHand=v.slice(3,6).map((n,i)=>mix(mix(start[i],i===1?mix(.26,n,strength):n,enter),ready[i],1-exit));
 pose.celebration=w;pose.cheerPower=strength;pose.frontStep=mix(from.frontStep||0,0,enter);pose.rearHeel=mix(from.rearHeel||0,0,enter);pose.footLift=mix(from.footLift||0,0,enter);pose.stepOut=mix(from.stepOut||0,0,enter);pose.power=false;
 return gestureMetadata(pose,from,base,enter,exit);
}
const rivalQuips=[
 ['wink',tr('어라, 이게 들어가네?')],
 ['finger',tr('한 번 더 해볼까?')],
 ['listen',tr('응? 응원 소리가 안 들리는데~')],
 ['dance',tr('리듬 좀 타볼까?')],
 ['salute',tr('다음 공도 부탁해!')]
];
function beginRivalTaunt(){
 const m=state.enemyMotion,previous=m.lastTaunt??-1,index=previous<0?Math.floor(Math.random()*rivalQuips.length):(previous+1+Math.floor(Math.random()*(rivalQuips.length-1)))%rivalQuips.length;
 const from=snapshotGesturePose(false);m.revengePending=true;m.lastTaunt=index;m.taunt={kind:rivalQuips[index][0],quip:rivalQuips[index][1],started:state.elapsed,duration:1.85,from};
 state.enemySwing=0;state.enemyStroke.defense=false;state.enemyStroke.transition=null;state.enemyStroke.recovery=null;state.enemyStroke.locked=null;
 state.enemyDefense.lean=0;state.enemyDefense.scramble=0;
 state.pointWait=Math.max(state.pointWait,2.05);if(m.face)m.face.until=state.elapsed+1.85;
}
function beginRivalRevenge(){
 const m=state.enemyMotion,kind=m.lastRevenge==='flustered'?'frustrated':'flustered';
 const from=snapshotGesturePose(false);m.lastRevenge=kind;
 m.revenge={kind,started:state.elapsed,duration:2.30,from};m.taunt=null;
 state.enemySwing=0;state.enemyStroke.defense=false;state.enemyStroke.transition=null;state.enemyStroke.recovery=null;
 if(m.face){m.face.happy=0;m.face.sad=0;m.face.focus=0;m.face.until=state.elapsed+2.3;}
}
function rivalRevengePose(base){
 const r=state.enemyMotion.revenge;if(!r||state.pointWait<=0)return base;
 const age=state.elapsed-r.started,u=clamp(age/r.duration,0,1);if(u>=1)return base;
 const enter=smooth(clamp(age/.46,0,1)),exit=1-smooth(clamp((u-.80)/.20,0,1)),w=enter*exit,shock=1-smooth(clamp((age-.42)/.38,0,1)),anger=1-shock,p={...base};
 const pump=smooth(Math.max(0,1-Math.abs(age-1.05)/.22))+smooth(Math.max(0,1-Math.abs(age-1.55)/.22)),shake=Math.sin((age-.45)*15)*anger*(r.kind==='frustrated'?1:.65),left=r.kind==='frustrated'?[-.32,.19+pump*.19,.23]:[-.35,.53,.25],right=[.35,1.04+pump*.055,.20];
 for(const [key,target] of [['bodyPitch',mix(-.22,.075,anger)],['hipPitch',-.035],['bodyRoll',shake*.045],['chest',shake*.075],['hip',0],['dip',-.018*shock],['shift',0],['forward',-.035*shock],['tilt',.15],['roll',.02],['faceTurn',0],['frontStep',0],['rearHeel',0],['footLift',0]]){
  p[key]=mix(mix(r.from[key]??base[key]??0,target,enter),base[key]??0,1-exit);
 }
 p.hand=right.map((v,i)=>mix(mix(r.from.hand[i],v,enter),base.hand[i],1-exit));
 const start=r.from.balanceHand||[-.25,.26,.28],ready=gestureBalanceOffset(base);
 p.balanceHand=left.map((v,i)=>mix(mix(start[i],v,enter),ready[i],1-exit));
 p.revenge=r.kind;p.revengeWeight=w;p.revengeShock=shock*w;p.revengeAnger=anger*w;p.revengeHeadYaw=shake*.24*w;p.celebration=0;p.power=false;return gestureMetadata(p,r.from,base,enter,exit);
}
function presentRevenge(){
 const r=state.enemyMotion.revenge;state.pointWait=Math.max(state.pointWait,2.55);
 const label=$('impactLabel');label.className='impact-label critical point winner visible';label.querySelector('b').textContent=tr('PAYBACK SMASH!');
 label.querySelector('span').textContent=tr('도발을 스매시로 응징! · ')+(r.kind==='flustered'?tr('상대: “자, 잠깐…!”'):tr('상대: “방금 건 인정 못 해!”'));
 announceImpact('winner');if(!ball.finisher?.landed)sound.play('critical',{gain:.42,pan:0});
 message(r.kind==='flustered'?tr('아까의 여유는 어디로? 상대가 당황했어요!'):tr('상대가 주먹을 꽉 쥐고 분해합니다. 통쾌한 한 방!'),tr('PAYBACK SMASH'));
}

function rivalTauntPose(base){
 const t=state.enemyMotion.taunt;if(!t||state.pointWait<=0)return base;
 const age=state.elapsed-t.started,u=clamp(age/t.duration,0,1);if(age>=t.duration)return base;
 const enter=smooth(clamp(u/.28,0,1)),exit=1-smooth(clamp((u-.76)/.24,0,1)),w=enter*exit,pulse=Math.sin(u*Math.PI*6),p={...base};
 let left=[-.34,.46,.24],right=[.34,.96,.28],chest=.06,roll=-.055,dip=0;
 if(t.kind==='finger'){left=[-.37+Math.sin(u*22)*.012,.59,.25];chest=-.09;}
 if(t.kind==='listen'){left=[-.36,.61,.19];roll=.10;chest=.12;}
 if(t.kind==='dance'){left=[-.32,.36+pulse*.045,.22];right=[.35,1.02-pulse*.025,.27];chest=pulse*.14;roll=pulse*.065;dip=-.008*(1+Math.cos(u*Math.PI*12));}
 if(t.kind==='salute'){left=[-.28,.28,.25];right=[.30,1.42,.18];chest=-.12;roll=-.06;}
 for(const [key,target] of [['bodyPitch',-.025],['hipPitch',-.02],['bodyRoll',roll],['chest',chest],['hip',chest*.4],['dip',dip],['shift',0],['forward',0],['tilt',.1],['roll',-.10],['faceTurn',0],['frontStep',0],['rearHeel',0],['footLift',0]])p[key]=mix(mix(t.from[key]??base[key]??0,target,enter),base[key]??0,1-exit);
 p.hand=right.map((v,i)=>mix(mix(t.from.hand[i],v,enter),base.hand[i],1-exit));
 const start=t.from.balanceHand||[-.25,.26,.28],ready=gestureBalanceOffset(base);p.balanceHand=left.map((v,i)=>mix(mix(start[i],v,enter),ready[i],1-exit));
 p.taunt=t.kind;p.tauntWeight=w;p.tauntHeadRoll=roll*w;p.celebration=t.kind==='dance'?w*.6:0;p.power=false;return gestureMetadata(p,t.from,base,enter,exit);
}
function rivalGesture(hand,skin,kind,weight){
 if(weight<.35){clenchedFist(hand,skin);return;}
 if(kind==='finger'){
  clenchedFist(hand,skin);taper(add(hand,[0,.01,.015]),add(hand,[0,.094,.018]),.010,.007,skin,8);softSphere(...add(hand,[0,.094,.018]),.007,.008,.007,skin,6,10);
 }else if(kind==='listen'){
  withFrame(hand,[1,0,0],[0,1,0],[0,0,1],()=>{softSphere(0,0,0,.033,.043,.016,skin,7,12);for(let i=0;i<4;i++)taper([-.022+i*.014,.020,0],[-.023+i*.014,.063-Math.abs(1.5-i)*.008,.012],.007,.006,skin,6);});
 }else clenchedFist(hand,skin);
}

function clenchedFist(hand,skin){
 softSphere(...hand,.040,.039,.034,skin,7,12);
 for(let i=0;i<4;i++)softSphere(hand[0]-.025+i*.016,hand[1]+.008,hand[2]+.026,.010,.017,.012,skin,5,8);
 softSphere(hand[0]+.031,hand[1]-.008,hand[2]+.015,.017,.025,.018,'#d7a782',5,8);
}

function defensePhase(phase){
 const d=state.enemyDefense;if(d.phase===phase)return;d.phase=phase;d.age=0;
 d.events.push({phase,time:state.elapsed,x:state.enemyX,z:state.enemyZ});if(d.events.length>24)d.events.shift();
}
function beginEnemyRecovery(rig){
 const rec=state.enemyStroke,d=state.enemyDefense,old=state.enemyMotion.turn;
 if(!rec.defense&&!(old?.amount>.10)&&!(d.scramble>.25)&&d.outcome!=='saved')return;
 const direction=Math.sign((d.coverX||0)-state.enemyX)||-d.direction,feet=rec.groundFeet?.feet||[];
 const support=feet.find(f=>f.side===old?.supportSide&&!f.moving)||feet.find(f=>f.side===direction&&!f.moving)||feet.find(f=>!f.moving);
 const side=support?.side??old?.supportSide??direction;
 rec.recovery={phase:'land',age:0,phaseAge:0,supportSide:side,worldDirection:direction,amount:0,shift:0,roll:0};
 state.enemyMotion.turn={phase:'land',age:0,direction:-direction,worldDirection:direction,supportSide:side,amount:old?.amount||0,roll:old?.roll||0,shift:old?.shift||0,freeStepped:false,pivot:old?.supportSide===side?old.pivot||0:0,supportYaw:old?.supportSide===side?old.supportYaw:footIntent(rig,side).yaw};
}
function updateEnemyRecovery(dt){
 const rec=state.enemyStroke,r=rec.recovery;if(!r)return;const d=state.enemyDefense,t=state.enemyMotion.turn;
 if(!state.playing||state.pointWait>0){rec.recovery=null;return;}
 r.age+=dt;r.phaseAge+=dt;
 if(r.phase==='handoff'){r.amount*=Math.exp(-dt*14);r.shift*=Math.exp(-dt*14);r.roll*=Math.exp(-dt*14);if(r.amount<.005)rec.recovery=null;return;}
 const feet=rec.groundFeet?.feet||[],support=feet.find(f=>f.side===r.supportSide),free=feet.find(f=>f.side!==r.supportSide);
 if(r.phase==='land'&&(!support||!support.moving)&&feet.every(f=>!f.moving)&&r.phaseAge>.085){
  r.phase='push';r.phaseAge=0;defensePhase('recover');
  if(t){t.phase='push';t.age=0;t.direction=-r.worldDirection;t.worldDirection=r.worldDirection;t.freeStepped=false;}
 }
 if(r.phase==='push'&&(t?.freeStepped&&free&&!free.moving&&r.phaseAge>.08||r.phaseAge>.30)){r.phase='cover';r.phaseAge=0;if(t){t.phase='settle';t.age=0;}}
 if(r.phase==='cover'&&r.phaseAge>.40){r.phase='handoff';r.phaseAge=0;}
 const desired=r.phase==='push'?1:r.phase==='cover'?.40:.20;r.amount=mix(r.amount,desired,1-Math.exp(-dt*12));
 r.shift=mix(r.shift,-r.worldDirection*r.amount*.014,1-Math.exp(-dt*11));r.roll=mix(r.roll,r.worldDirection*r.amount*.045,1-Math.exp(-dt*11));
}

function updateEnemyTransfer(dt){
 const t=state.enemyMotion.turn;if(!t)return;const d=state.enemyDefense;t.age+=dt;
 if(d.phase==='brake'&&t.phase!=='brake'){t.phase='brake';t.age=0;}
 if(t.phase==='brake'&&['rush','track','block'].includes(d.phase)){t.phase='push';t.age=0;t.freeStepped=false;}
 const feet=state.enemyStroke.groundFeet?.feet||[],free=feet.find(f=>f.side!==t.supportSide);
 if(['recoil','recover','stumble'].includes(d.phase)&&['brake','push'].includes(t.phase)&&state.enemyStroke.recovery?.phase!=='push'){t.phase='land';t.age=0;}
 if(t.phase==='push'&&(t.freeStepped&&free&&!free.moving&&t.age>.07||t.age>.24)){t.phase='settle';t.age=0;}
 if(t.phase==='land'&&(feet.every(f=>!f.moving)&&t.age>.08||t.age>.26)){t.phase='settle';t.age=0;}
 if(t.phase==='settle'&&t.age>.26){t.phase='ready';t.age=0;}
 const active=['brake','push','land'].includes(t.phase);t.amount=mix(t.amount,active?1:0,1-Math.exp(-dt*(active?18:11)));
 const direction=t.phase==='brake'?t.supportSide:t.direction;
 t.pivot=mix(t.pivot||0,t.phase==='brake'?0:1,1-Math.exp(-dt*18));
 t.roll=mix(t.roll,-direction*(t.phase==='brake'?.085:.12)*t.amount,1-Math.exp(-dt*11));
 t.shift=mix(t.shift,direction*(t.phase==='brake'?.026:.022)*t.amount,1-Math.exp(-dt*11));
}

function beginDefense(kind){
 if(state.enemyAI)state.enemyAI.telegraph=false;
 const previous=strikeRig(false),d=state.enemyDefense;
 d.depthTarget=ball.shotStyle==='cut'?-1.49:-2.08;
 const eta=clamp((ball.z-(d.depthTarget+.43))/Math.max(.5,-ball.vz),.08,1.6),pred=predictFlight(eta),delta=pred.x-state.enemyX;
 const recovery=state.enemyStroke.recovery,continuing=!!recovery;
 const oldTarget=d.targetX??0,switched=Math.abs(pred.x-oldTarget)>.68,movingWrong=(d.vx||0)*delta<-.08&&Math.abs(d.vx||0)>.20;
 d.scramble=clamp((d.scramble||0)*.75+(switched?.30:0)+(movingWrong?.22:0),0,1);
 d.targetX=clamp(pred.x,-1.35,1.35);d.targetY=clamp(pred.y,.65,1.65);d.direction=Math.abs(delta)>.025?Math.sign(delta):d.direction||1;
 d.smash=kind.includes('smash');d.finisher=kind.includes('finish');d.arrival=eta;d.gap=Math.abs(delta);
 const needed=Math.max(0,Math.abs(delta)-.20)/Math.max(.12,eta-.10);
 d.urgent=d.smash||Math.abs(delta)>.48||needed>1.0||movingWrong||switched&&d.scramble>.25;
 d.pressure=clamp(needed*.35+Math.abs(delta)*.30+d.scramble*.30+(d.smash?.30:0),.10,1);
 d.delay=d.finisher?.15:d.smash?(kind.includes('critical')?.095:.065):.075+d.scramble*.035;
 d.brakeTime=movingWrong?.065+d.scramble*.045:0;d.oldDirection=Math.sign(d.vx||0)||d.direction;d.age=0;d.outcome=null;d.started=state.elapsed;
 d.bodyTarget=clamp(d.targetX-(d.finisher?d.direction*.48:d.direction*.12),-1.18,1.18);
 d.coverX=clamp(d.targetX*.48,-.40,.40);
 if(continuing){d.delay=Math.min(d.delay,.045+d.scramble*.020);recovery.phase='handoff';recovery.phaseAge=0;}
 d.delay*=opponentLevel().receiveReaction??opponentLevel().reaction;if(opponentLevel().boss?.id==='striker'&&state.elapsed-(state.enemyAI?.lastSmash??-100)<1.20)d.delay+=.09;
 if(movingWrong||switched&&d.gap>.48||continuing&&d.gap>.20){
  const oldWorld=Math.sign(d.vx||0)||Math.sign(oldTarget-state.enemyX)||-d.direction;
  const old=state.enemyMotion.turn,feet=state.enemyStroke.groundFeet?.feet||[];
  const supported=continuing?(feet.find(f=>f.side===old?.supportSide&&!f.moving)||feet.find(f=>!f.moving)):null;
  const supportSide=supported?.side??-oldWorld;
  state.enemyMotion.turn={phase:movingWrong?'brake':'push',age:0,direction:-d.direction,worldDirection:d.direction,supportSide,amount:old?.amount||0,roll:old?.roll||0,shift:old?.shift||0,freeStepped:false,pivot:continuing&&old?.supportSide===supportSide?old.pivot||0:0,supportYaw:continuing&&old?.supportSide===supportSide?old.supportYaw:footIntent(previous,supportSide).yaw};
  d.brakeTime=movingWrong?Math.max(d.brakeTime,.055):0;
 }
 d.history=d.history||[];d.history.push({x:d.targetX,gap:d.gap,urgent:d.urgent,reversed:movingWrong,time:state.elapsed});if(d.history.length>12)d.history.shift();
 state.enemyPrepared=false;state.enemyHit=false;state.enemySwing=0;state.enemyStroke.locked=null;state.enemyStroke.defense=d.urgent;state.enemyStroke.aim=[0,0,0];
 state.enemyStroke.transition={started:state.elapsed,duration:continuing?.115:.085,pose:JSON.parse(JSON.stringify(previous.pose)),hand:[...previous.localHand],velocity:continuing?{...state.enemyStroke.poseVelocity}:null,handVelocity:continuing?[...(state.enemyStroke.handVelocity||[0,0,0])]:null};
 defensePhase('read');
}
function updateDefense(dt){
 const d=state.enemyDefense;d.age+=dt;d.scramble=Math.max(0,(d.scramble||0)-dt*.12);
 if(!state.playing&&d.phase!=='ready'&&d.phase!=='recover')defensePhase('recover');
 if(d.phase==='read'&&d.age>=d.delay)defensePhase(d.brakeTime>0?'brake':d.urgent?'rush':'track');
 if(d.phase==='brake'){const side=state.enemyMotion.turn?.supportSide,support=state.enemyStroke.groundFeet?.feet.find(f=>f.side===side);d.brakeTime=Math.max(0,d.brakeTime-dt);if(d.brakeTime<=0&&Math.abs(d.vx)<.30&&(!support||!support.moving))defensePhase(d.urgent?'rush':'track');}
 updateEnemyRecovery(dt);updateEnemyTransfer(dt);
 if(d.phase==='recoil'&&d.age>.34)defensePhase('recover');
 if(d.phase==='stumble'&&d.age>(d.finisher?.95:.52))defensePhase('recover');
 const recovering=d.phase==='recover',active=d.phase!=='ready',pursuing=['track','rush','block'].includes(d.phase),urgent=!!d.urgent;
 const amount=active&&!recovering&&urgent?1:0;d.amount=mix(d.amount,amount,1-Math.exp(-dt*(recovering?6:14)));
 const distance=Math.abs((d.targetX||0)-state.enemyX);d.stretch=mix(d.stretch,active?clamp(distance/.52+d.pressure*.12,0,1):0,1-Math.exp(-dt*13));
 d.recoil=mix(d.recoil,d.phase==='recoil'?1:d.phase==='stumble'?(d.finisher?1.65:1.2):0,1-Math.exp(-dt*15));
 const leanDirection=d.phase==='brake'?(d.oldDirection||d.direction):d.direction;
 d.lean=mix(d.lean,active?leanDirection*(.055+d.stretch*.16+d.recoil*.13)*(urgent?Math.max(.25,d.amount):.55):0,1-Math.exp(-dt*12));
 const target=recovering||d.phase==='ready'?(state.pointWait>0?0:d.coverX||0):pursuing?d.bodyTarget:d.phase==='stumble'?state.enemyX+d.direction*.10:state.enemyX;
 const transfer=state.enemyMotion.turn,baseSpeed=recovering||d.phase==='ready'?1.05:urgent?2.75:1.70;
 const maxSpeed=(transfer?.phase==='push'?Math.min(baseSpeed,2.0):baseSpeed)*(opponentLevel().receiveSpeed??opponentLevel().speed);
 if(state.enemyStroke.recovery?.phase==='land')d.vx=(d.vx||0)*Math.exp(-dt*18);
 else if(d.phase==='read'||d.phase==='brake')d.vx=(d.vx||0)*Math.exp(-dt*(d.phase==='brake'?28:9));
 else{const acceleration=clamp((target-state.enemyX)*(pursuing?38:21)-(d.vx||0)*(d.phase==='recoil'?5:8),urgent?-12:-8,urgent?12:8);d.vx=clamp((d.vx||0)+acceleration*dt,-maxSpeed,maxSpeed);}
 state.enemyX=clamp(state.enemyX+d.vx*dt,-1.35,1.35);
 const back=urgent&&active?-.07*d.amount-.10*d.recoil:0;state.enemyZ=mix(state.enemyZ,(pursuing?d.depthTarget??-2:-2)+back,1-Math.exp(-dt*(pursuing?5:3.5)));
 if(recovering&&d.age>.72&&d.amount<.016){d.amount=0;d.lean=0;d.recoil=0;state.enemyStroke.defense=false;d.finisher=false;d.urgent=false;defensePhase('ready');}
}
const blockKeys=[
 {t:0,v:[.23,1.08,.28,0,0,0,0,0,.06,-.08]},
 {t:.24,v:[.24,1.10,.27,-.03,-.05,.006,-.008,-.012,-.05,-.08]},
 {t:.42,v:[.20,1.12,.42,.025,.06,0,.012,-.018,.14,.02]},
 {t:.64,v:[.25,1.18,.30,.045,.12,.012,-.025,-.048,.25,.10]},
 {t:1,v:[.23,1.08,.28,0,0,0,0,0,.06,-.08]}
];
function defensivePose(base,countdown,backhand){
 const d=state.enemyDefense,t=countdown>0?1-countdown:0,v=sampleStroke(blockKeys,t),w=d.amount;
 const bhX=mix(-.08,-.12,Math.sin(t*Math.PI)),hand=[mix(v[0],bhX,backhand)-d.direction*d.stretch*.04,v[1],v[2]];
 if(d.finisher&&d.phase==='stumble'){const fall=smooth(clamp(d.age/.32,0,1));hand[0]-=d.direction*.16*fall;hand[1]-=.20*fall;hand[2]+=.12*fall;}
 const result={...base,hand:base.hand.map((n,i)=>mix(n,hand[i],w)),hip:mix(base.hip,v[3],w),chest:mix(base.chest,mix(v[4],-v[4],backhand),w),
 shift:base.shift-d.direction*(.025+.055*d.stretch)*w,forward:base.forward-.018*w,dip:base.dip-(.025+.045*d.stretch+(d.finisher?.085:.035)*d.recoil)*w,
 tilt:mix(base.tilt,mix(v[8],-v[8],backhand),w),roll:mix(base.roll,mix(v[9],-v[9],backhand),w),
 bodyPitch:mix(-.075,-.13+.055*d.stretch-.13*d.recoil,w),bodyRoll:d.lean*(1-(state.enemyMotion.turn?.amount||0)*.45),frontStep:0,rearHeel:.012*d.recoil,
 footLift:0,hipPitch:mix(-.065,-.10-.07*d.recoil,w),defense:true,defenseSpread:(.025+.10*d.stretch+.055*d.recoil)*w,defenseDir:d.direction,
 balanceHand:[mix(mix(-.25+base.chest*.10,-.31,backhand),-.43,w),.26+.11*d.recoil*w,mix(mix(.28-Math.abs(base.chest)*.08,.12,backhand),.18-.08*d.recoil,w)]};
 return result;
}
function defenseMiss(){
 const d=state.enemyDefense;if(!['read','brake','track','rush','block'].includes(d.phase))return;
 d.outcome='miss';d.vx+=d.direction*.28;defensePhase('stumble');playAt('shoe',[state.enemyX,.03,state.enemyZ],.48);
}
function defenseSaved(){
 const d=state.enemyDefense;d.outcome='saved';d.vx+=d.direction*(.25+.35*d.stretch);defensePhase('recoil');playAt('shoe',[state.enemyX,.03,state.enemyZ],.32);
}

// The lead foot lands before contact; the pelvis unwinds ahead of the chest.
// Values: pelvis yaw, weight shift, forward shift, knee compression, lead step, lead lift, rear heel, stance width.
const transferKeys=[
 {t:0,v:[0,0,0,0,0,0,0,0]},
 {t:.14,v:[-.12,.022,-.010,-.018,.018,.017,0,.008]},
 {t:.24,v:[-.15,.029,-.016,-.026,.060,.025,.003,.018]},
 {t:.31,v:[.055,.009,-.004,-.014,.082,.007,.022,.024]},
 {t:.345,v:[.15,-.013,.010,-.004,.085,0,.034,.026]},
 {t:.43,v:[.26,-.036,.025,-.004,.085,0,.046,.026]},
 {t:.61,v:[.24,-.042,.032,-.010,.085,0,.042,.026]},
 {t:.79,v:[.095,-.016,.013,-.006,.048,0,.015,.010]},
 {t:1,v:[0,0,0,0,0,0,0,0]}
];
function weightTransfer(pose,receiver){
 const cp=receiver.contactPhase??.38,t=pose.t,u=t<=cp?t*.38/cp:.38+(t-cp)*.62/(1-cp),v=sampleStroke(transferKeys,clamp(u,0,1));
 const side=1-2*pose.backhand,power=!!pose.power,amount=power?1.55:mix(1,.66,pose.backhand);
 const recovery=u>.66?Math.sin(Math.PI*clamp((u-.66)/.34,0,1))*.022:0;
 const result={...pose,hip:v[0]*side*amount,frontStep:clamp(v[4],0,.085)*amount,footLift:(Math.max(0,v[5])+recovery)*amount,rearHeel:Math.max(0,v[6])*amount,stepOut:clamp(v[7],0,.026)*amount,plant:smooth(clamp(u/.16,0,1))*(1-smooth(clamp((u-.72)/.28,0,1)))};
 if(!power){result.shift=v[1]*side;result.forward=v[2];result.dip=v[3];}
 result.weightBias=side*clamp(-v[1]/.042,-1,1);
 return result;
}

function approachSmashPose(pose,receiver){
 const a=receiver.approachStrike;if(!a||!pose.power)return pose;
 const t=pose.t,cp=receiver.contactPhase??.31,plant=smooth(clamp((t-.10)/Math.max(.08,cp-.14),0,1)),recover=1-smooth(clamp((t-.68)/.32,0,1));
 const drive=smooth(clamp((t-(cp-.09))/.13,0,1))*recover,coil=smooth(clamp(t/.12,0,1))*(1-smooth(clamp((t-(cp-.10))/.13,0,1)));
 const carry=1-smooth(clamp(t/cp,0,1)),result={...pose,leadSide:a.leadSide};
 result.frontStep=Math.min(.165,pose.frontStep+.030*a.momentum*plant*recover);
 result.dip-=.025*a.momentum*coil;result.bodyPitch+=.070*a.momentum*coil+.028*a.momentum*drive;
 result.hipPitch+=.028*a.momentum*drive;result.forward+=.022*a.momentum*drive;
 result.hip+=a.hipYaw*.20*carry;result.chest+=a.hipYaw*.12*carry;
 result.rearHeel=Math.max(pose.rearHeel,.060*a.momentum*drive);
 return result;
}

function rememberRigMotion(rig){
 const rec=rig.receiver,old=rec.motionSample,now=state.elapsed,dt=old?now-old.time:0;
 if(dt>.0001&&dt<.10){
  const limits={hip:3.5,chest:5,shift:.40,forward:.40,dip:.40,bodyPitch:3,bodyRoll:3,hipPitch:3},velocity={};
  for(const key of Object.keys(limits))velocity[key]=clamp(((rig.pose[key]||0)-(old.pose[key]||0))/dt,-limits[key],limits[key]);
  rec.poseVelocity=velocity;rec.handVelocity=rig.localHand.map((n,i)=>clamp((n-old.hand[i])/dt,-2.5,2.5));
 }
 rec.motionSample={time:now,pose:{...rig.pose},hand:[...rig.localHand]};
}

function poseTransition(pose,receiver){
 const transition=receiver.transition;if(!transition)return pose;
 const u=clamp((state.elapsed-transition.started)/transition.duration,0,1),w=smooth(u),carry=u*(1-u)*(1-u)*transition.duration,from=transition.pose,result={...pose};
 for(const key of ['hip','chest','shift','forward','dip','tilt','roll','faceTurn','backhand','bodyPitch','bodyRoll','hipPitch','frontStep','rearHeel','footLift','stepOut','plant'])result[key]=mix(from[key]??0,pose[key]??0,w)+carry*(transition.velocity?.[key]||0);
 if(from.balanceHand||pose.balanceHand){
  const ready=p=>[mix(-.25+(p.chest||0)*.10,-.31,p.backhand||0),.26,mix(.28-Math.abs(p.chest||0)*.08,.12,p.backhand||0)];
  const a=from.balanceHand||ready(from),b=pose.balanceHand||ready(pose);result.balanceHand=a.map((v,i)=>mix(v,b[i],w));
 }
 return result;
}
function processQueuedSwing(){
 const q=state.queuedSwing;if(!q)return;
 if(state.careerMatch&&!q.careerPress||q.careerPress&&(!state.careerMatch||!state.playing||state.hit||q.shot!==ball.rallyShot)||state.elapsed>q.expires||state.celebration.active||state.pointWait>0){state.queuedSwing=null;return;}
 const eta=ball.vz>.05?(state.pz-.45-ball.z)/ball.vz:Infinity;
 if(q.practice&&(!state.playing||state.hit||state.serve))return;
 const power=q.power&&(!q.practice||predictFlight(.26).y>1.16);
 if(state.swing<=.12&&(!state.playing||(eta>=.015&&eta<=.36))){state.queuedSwing=null;swing(power,true,!!q.assisted);}
}

// Resolve the wrist and arm capsules against an expanded chest in the chest's own frame.
// The corrected wrist is shared by the paddle mesh, continuous collision and both cameras.
function armOutsideTorso(root,goal,upper,lower,pole,origin,rotation){
 const basis=[[1,0,0],[0,1,0],[0,0,1]].map(v=>eulerVector(v,...rotation));
 const local=p=>{const d=sub(p,origin);return basis.map(v=>dot(d,v));},worldVector=v=>add(add(mul(basis[0],v[0]),mul(basis[1],v[1])),mul(basis[2],v[2]));
 const radii=[.224,.235,.165],center=[0,.285,.015];
 const penetration=p=>{const q=sub(local(p),center),r=Math.hypot(q[0]/radii[0],q[1]/radii[1],q[2]/radii[2]);if(r>=1)return null;
  const front=Math.sqrt(Math.max(0,1-(q[0]/radii[0])**2-(q[1]/radii[1])**2))*radii[2];
  return worldVector([0,0,Math.max(.002,front-q[2]+.006)]);};
 let hand=[...goal];
 for(let i=0;i<3;i++){const push=penetration(hand);if(push)hand=add(hand,push);const reach=sub(hand,root),d=Math.hypot(...reach),limit=upper+lower-.008;if(d>limit)hand=add(root,mul(reach,limit/d));}
 let elbow=twoBone(root,hand,upper,lower,pole);
 for(let retry=0;retry<3;retry++){
 for(let iteration=0;iteration<7;iteration++){
  let force=[0,0,0],count=0;
  for(const t of [.28,.46,.64,.82,1]){const push=penetration(add(root,mul(sub(elbow,root),t)));if(push){force=add(force,mul(push,1/Math.max(.35,t)));count++;}}
  for(const t of [0,.20,.40,.60,.80]){const push=penetration(add(elbow,mul(sub(hand,elbow),t)));if(push){force=add(force,mul(push,1/Math.max(.30,1-t)));count++;}}
  if(!count)break;
  const push=mul(force,1/count),candidate=add(elbow,push);elbow=twoBone(root,hand,upper,lower,sub(candidate,root));
 }
 let obstruction=0;
 for(const t of [.35,.60,.80]){const push=penetration(add(elbow,mul(sub(hand,elbow),t)));if(push)obstruction+=Math.hypot(...push);}
 if(obstruction<.001)break;
 hand=add(hand,worldVector([0,0,Math.min(.030,obstruction*.45)]));const reach=sub(hand,root),d=Math.hypot(...reach),limit=upper+lower-.008;if(d>limit)hand=add(root,mul(reach,limit/d));
 elbow=twoBone(root,hand,upper,lower,sub(elbow,root));
 }
 return{hand,elbow};
}

function ceremonyWeight(pose){
 return clamp(Math.max(pose.celebration||0,pose.tauntWeight||0,pose.revengeWeight||0),0,1);
}
function ceremonyArm(root,goal,upper,lower,pole,origin,rotation,weight,side,pose){
 if(weight>.001){
  const delta=sub(goal,root),distance=Math.hypot(...delta),reach=upper+lower,safe=clamp(distance,reach*.68,reach*.94);
  if(distance>.0001)goal=add(root,mul(delta,mix(1,safe/distance,weight)));
  const axis=norm(sub(goal,root)),out=eulerVector([side,0,0],...rotation),forward=eulerVector([0,0,1],...rotation);
  const perpendicular=v=>{let p=sub(v,mul(axis,dot(v,axis)));if(Math.hypot(...p)<.02)p=sub(forward,mul(axis,dot(forward,axis)));return norm(p);};
  const around=(a,b,t)=>{a=perpendicular(a);b=perpendicular(b);const angle=Math.atan2(dot(axis,cross(a,b)),clamp(dot(a,b),-1,1))*t;return add(mul(a,Math.cos(angle)),mul(cross(axis,a),Math.sin(angle)));};
  const start=pose?.gesturePoles?.[side<0?0:1],startPole=start?eulerVector(start,...rotation):pole;
  const entering=around(startPole,out,pose?.gestureEnter??weight);
  pole=around(entering,pole,1-(pose?.gestureExit??1));
 }
 const solved=armOutsideTorso(root,goal,upper,lower,pole,origin,rotation),segments=pose?.gestureSegments?.[side<0?0:1],enter=pose?.gestureEnter??1;
 if(segments&&enter<1){
  // Blend the two bone directions, rather than letting an IK elbow swivel at entry.
  const blendDirection=(start,end)=>{start=norm(eulerVector(start,...rotation));end=norm(end);const cosine=clamp(dot(start,end),-1,1),angle=Math.acos(cosine);if(angle<.001)return end;let tangent=sub(end,mul(start,cosine));if(Math.hypot(...tangent)<.001)tangent=cross(start,[0,0,1]);tangent=norm(tangent);return add(mul(start,Math.cos(angle*enter)),mul(tangent,Math.sin(angle*enter)));};
  const elbow=add(root,mul(blendDirection(segments[0],sub(solved.elbow,root)),upper)),hand=add(elbow,mul(blendDirection(segments[1],sub(solved.hand,solved.elbow)),lower));
  return {elbow,hand};
 }
 return solved;
}
function previewRestArm(root,upper,lower,side){
 // A relaxed arm has the elbow slightly behind the wrist, with a soft forward bend.
 // This dressing-room pose is authored directly so torso IK cannot flip the elbow.
 const upperDirection=norm([side*.050,-.270,-.026]),lowerDirection=norm([side*.018,-.235,.075]);
 const elbow=add(root,mul(upperDirection,upper)),hand=add(elbow,mul(lowerDirection,lower));
 return {elbow,hand};
}

function balanceArm(rig){
 if(rig.receiver.preview)return previewRestArm(rig.localLeftShoulder,.245,.235,-1);
 const pose=rig.pose,offset=gestureBalanceOffset(pose);
 return ceremonyArm(rig.localLeftShoulder,add(rig.hip,offset),.245,.235,eulerVector([-1,-.35,-.15],...rig.torsoRotation),rig.torsoOrigin,rig.torsoRotation,ceremonyWeight(pose),-1,pose);
}
function withCeremonyWrist(hand,elbow,fn){
 const axis=norm(sub(hand,elbow)),up=norm(add([0,.80,0],mul(axis,.65))),right=norm(cross(up,[0,0,1])),front=cross(right,up);
 withFrame(hand,right,up,front,fn);
}

function strikeRig(player,countdownOverride=null,aimOverride=null){
 const receiver=player?state.playerStroke:state.enemyStroke,countdown=countdownOverride??(player?state.swing:state.enemySwing),x=player?state.px:state.enemyX,z=player?state.pz:state.enemyZ,facing=player?-1:1;
 let pose=receiver.smash&&countdown>0?smashPose(countdown,receiver.mix):strokePose(countdown,receiver.mix);
 if(countdown>0&&!receiver.defense)pose=weightTransfer(pose,receiver);
 if(countdown>0&&!receiver.smash&&!receiver.defense&&receiver.shotStyle==='cut'){const w=Math.sin(Math.PI*clamp(pose.t,0,1));pose.bodyPitch=(pose.bodyPitch??-.075)*.80;pose.chest*=.66;if(pose.hand){pose.hand[1]+=.060*w*Math.cos(Math.PI*pose.t);pose.hand[2]-=.035*w;}pose.tilt+=.16*w;}

 if(countdown>0&&!receiver.smash&&!receiver.preview){const low=(receiver.lowContact||0)*smooth(clamp(pose.t/.18,0,1))*(1-smooth(clamp((pose.t-.62)/.38,0,1)));pose.dip-=low*(player?.14:.23);pose.bodyPitch=(pose.bodyPitch??-.075)-low*.065;}
 if(player&&countdown>0&&receiver.approachStrike)pose=approachSmashPose(pose,receiver);
 if(player&&state.celebration.active)pose=celebrationPose(pose);
 if(!player&&receiver.defense&&state.enemyDefense.phase!=="ready")pose=defensivePose(pose,countdown,receiver.mix);
 const motion=player?state.playerMotion:state.enemyMotion,breath=Math.sin(state.elapsed*2.4)*.004;
 pose.bodyPitch??=-.075;pose.bodyRoll??=0;pose.frontStep??=0;pose.rearHeel??=0;pose.footLift??=0;pose.hipPitch??=-.065;
 if(player&&receiver.preview)Object.assign(pose,{hand:[.27,.78,.045],balanceHand:[-.235,-.07,.015],hip:0,chest:0,bodyPitch:0,hipPitch:0,bodyRoll:0,dip:0,shift:0,forward:0,frontStep:0,stepOut:0,rearHeel:0,footLift:0,tilt:.02,faceTurn:0,roll:.04});
 if(player&&!receiver.approachStrike&&!state.celebration.active){const load=motion.approachLoad||0;pose.bodyPitch+=load*.075;pose.hipPitch+=load*.030;pose.dip-=load*.014;pose.forward+=load*.008;}
 if(!player&&!pose.defense){pose.bodyRoll+=state.enemyDefense.lean*.45;pose.dip-=(state.enemyDefense.scramble||0)*.010;}
 if(!pose.defense&&!state.celebration.active){
  const ready=(receiver.ready||0)*(countdown>0?smooth(clamp((pose.t-.65)/.35,0,1)):1);
  pose.dip-=ready*.022;pose.bodyPitch-=ready*.035;pose.hand=[pose.hand[0],pose.hand[1]+ready*.015,pose.hand[2]];pose.stepOut=(pose.stepOut||0)+ready*.012;
 }
 if(!pose.defense&&!state.celebration.active&&receiver.stance){
  const st=receiver.stance,settled=countdown>0?Math.max(1-smooth(clamp(pose.t/.24,0,1)),smooth(clamp((pose.t-.70)/.30,0,1))):1;
  pose.hip+=mix(-.050,.075,st.body)*settled;pose.chest+=mix(-.090,.120,st.body)*settled;
  pose.shift+=(st.leftLift-st.rightLift)*.60*settled;pose.dip-=(st.leftLift+st.rightLift)*.18*settled;
 }
 if(motion.turn&&(!player||!state.celebration.active)){const turn=motion.turn,link=player?receiver.turnShot:null,carry=link&&countdown>0?1-smooth(clamp(pose.t/(receiver.contactPhase??.38),0,1)):1;pose.dip-=turn.amount*.036*carry;pose.shift+=turn.shift*carry;pose.bodyRoll+=turn.roll*carry;pose.hip+=turn.direction*turn.amount*.035*carry;pose.chest+=turn.direction*turn.amount*.055*carry;}
 if(!player&&receiver.recovery){pose.shift+=receiver.recovery.shift;pose.bodyRoll+=receiver.recovery.roll;pose.dip-=receiver.recovery.amount*.012;}
 if(player&&receiver.rallyRecovery&&!state.celebration.active){const r=receiver.rallyRecovery;pose.shift+=r.shift;pose.bodyRoll+=r.roll;pose.dip-=r.amount*.016;pose.hip+=r.readDirection*r.amount*.025;pose.chest+=r.readDirection*r.amount*.045;if(r.mode==='retreat'){pose.forward-=r.backLoad*.022;pose.bodyPitch+=Math.abs(r.backLoad)*.055;pose.hipPitch-=r.backLoad*.018;pose.dip-=Math.abs(r.backLoad)*.012+(r.brakeLoad||0)*.022;pose.bodyPitch+=(r.brakeLoad||0)*.035;pose.hip+=(r.headingYaw||0)*.45;pose.chest+=(r.headingYaw||0)*.70;}}
 if(countdownOverride===null&&!state.celebration.active)pose=poseTransition(pose,receiver);
 if(!player&&countdownOverride===null)pose=rivalRevengePose(rivalTauntPose(pose));
 const settle=-Math.abs(Math.sin(motion.phase))*.012*motion.blend;
 const hip=[pose.shift+Math.sin(motion.phase)*.008*motion.blend,.805+pose.dip+breath+settle,pose.forward],lean=motion.lateral*.025;
 const torsoOrigin=add(hip,[lean,0,.015]),torsoRotation=[pose.bodyPitch,pose.chest,pose.bodyRoll-motion.lateral*.022];
 const lift=pose.power?smooth(clamp(pose.t/.20,0,1))*(1-smooth(clamp((pose.t-.27)/.20,0,1))):0;
 const follow=smooth(clamp((pose.t-.29)/.18,0,1))*(1-smooth(clamp((pose.t-.68)/.32,0,1)));
 const shoulder=add(torsoOrigin,eulerVector([.182,.445+lift*.024,.018+follow*.023],...torsoRotation));
 const leftShoulder=add(torsoOrigin,eulerVector([-.182,.445-lift*.008,.018-follow*.010],...torsoRotation));
 const weight=countdown>0?smooth(clamp(pose.t/(receiver.smash?.25:.30),0,1))*(1-smooth(clamp((pose.t-.60)/.40,0,1))):0;
 let hand=add(pose.hand,[pose.shift,pose.dip+breath,pose.forward]),aim=aimOverride||receiver.aim||[0,0,0];
 hand=add(hand,mul(aim,weight));
 if(countdownOverride===null&&receiver.transition&&!state.celebration.active){const tr=receiver.transition,u=clamp((state.elapsed-tr.started)/tr.duration,0,1),w=smooth(u),carry=u*(1-u)*(1-u)*tr.duration;hand=tr.hand.map((n,i)=>mix(n,hand[i],w)+carry*(tr.handVelocity?.[i]||0));}
 const pole=eulerVector([mix(1,.45,pose.backhand),mix(-.60,-.80,pose.backhand)+lift*.85,mix(-.10,.55,pose.backhand)-lift*.25],...torsoRotation);
 const ceremony=ceremonyWeight(pose),solved=receiver.preview?previewRestArm(shoulder,.285,.275,1):ceremonyArm(shoulder,hand,.285,.275,pole,torsoOrigin,torsoRotation,ceremony,1,pose);hand=solved.hand;
 const rotation={pitch:pose.tilt,yaw:-pose.chest*.27+pose.faceTurn,roll:pose.roll};
 if(ceremony>.001){const up=norm(add([0,.80,0],mul(norm(sub(hand,solved.elbow)),.65))),desired={pitch:Math.atan2(up[2],up[1]),yaw:-pose.chest*.12,roll:-Math.atan2(up[0],Math.hypot(up[1],up[2]))},from=pose.gestureStartRotation||rotation,ready=pose.gestureReadyRotation||rotation;for(const key of ['pitch','yaw','roll']){const anchor=mixAngle(from[key],0,1),destination=anchor+desired[key],returning=mixAngle(from[key],ready[key],1);rotation[key]=mix(mix(from[key],destination,pose.gestureEnter??ceremony),returning,1-(pose.gestureExit??1));}}
 const localGrip=add(hand,[0,.012,.012]);
 const root=p=>[x-facing*p[0],p[1],z+facing*p[2]],direction=p=>[-facing*p[0],p[1],facing*p[2]];
 const r=direction(eulerVector([1,0,0],rotation.pitch,rotation.yaw,rotation.roll)),u=direction(eulerVector([0,1,0],rotation.pitch,rotation.yaw,rotation.roll)),n=direction(eulerVector([0,0,1],rotation.pitch,rotation.yaw,rotation.roll));
 const origin=root(localGrip),center=add(origin,mul(u,.145));
 // The elbow pole turns with the ribcage and opens during an overhead stroke.
 const elbow=solved.elbow;
 return{player,receiver,countdown,pose,hip,torsoOrigin,torsoRotation,localHand:hand,localShoulder:shoulder,localLeftShoulder:leftShoulder,localElbow:elbow,shoulder:root(shoulder),elbow:root(elbow),localGrip,rotation,origin,center,r,u,n,hand:root(hand)};
}

function predictFlight(seconds){
 const b={...ball};let t=0;while(t<seconds){const h=Math.min(1/240,seconds-t),old=b.y;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;b.vy-=(b.gravity||5.8)*h;if(old>=.79&&b.y<.79&&b.vy<0&&Math.abs(b.x)<.7625&&Math.abs(b.z)<1.37){b.y=.79;const cut=b.spin==='cut',drive=b.spin==='drive';b.vy=-b.vy*(b.entryBounce?.65:cut?.78:drive?.72:.88);b.vx*=cut?.78:drive?1.10:1;b.vz*=cut?.78:drive?1.13:1;}t+=h;}return b;
}
function aimStroke(player,remaining=null,dt=0){
 const rec=player?state.playerStroke:state.enemyStroke,phase=rec.contactPhase??.38,t=remaining??(rec.duration||strokeDuration)*phase,pred=predictFlight(t);
 rec.lowContact=rec.smash?0:clamp((1.12-pred.y)/.24,0,1);
 const base=strikeRig(player,1-phase,[0,0,0]);
 const velocity=[pred.vx,pred.vy,pred.vz],side=-Math.sign(dot(velocity,base.n))||1,desired=sub([pred.x,pred.y,pred.z],mul(base.n,side*(BALL_RADIUS+FACE_DEPTH))),delta=sub(desired,base.center),facing=player?-1:1;
 if(remaining===null)rec.inputTiming=Math.abs(delta[2])/Math.max(.5,Math.abs(pred.vz));
 let local=[clamp(-facing*delta[0],-.29,.29),clamp(delta[1],-.32,.36),clamp(facing*delta[2],-.28,.28)];
 const length=Math.hypot(...local);if(length>.39)local=mul(local,.39/length);
 rec.aim=remaining!==null&&rec.aim?rec.aim.map((v,i)=>mix(v,local[i],1-Math.exp(-28*dt))):local;rec.aimBodyX=player?state.px:state.enemyX;rec.aimBodyZ=player?state.pz:state.enemyZ;
}
function rigLerp(a,b,t){const o={};for(const k of ['center','r','u','n'])o[k]=a[k].map((v,i)=>mix(v,b[k][i],t));for(const k of ['r','u','n'])o[k]=norm(o[k]);return o;}
function sweptFace(a,b,r0,r1){
 const d0=dot(sub(a,r0.center),r0.n),d1=dot(sub(b,r1.center),r1.n),h=BALL_RADIUS+FACE_DEPTH+.001;
 let t;if(d0>h&&d1<=h)t=(d0-h)/(d0-d1);else if(d0<-h&&d1>=-h)t=(d0+h)/(d0-d1);
 else if(Math.abs(d0)<=h&&Math.abs(d1)<=Math.abs(d0)+.003)t=0;else return null;
 t=clamp(t,0,1);const rig=rigLerp(r0,r1,t),point=a.map((v,i)=>mix(v,b[i],t)),offset=sub(point,rig.center),u=dot(offset,rig.r),v=dot(offset,rig.u);
 const radial=Math.hypot(u/(FACE_X+BALL_RADIUS),v/(FACE_Y+BALL_RADIUS));if(radial>1)return null;
 return{t,u,v,side:Math.sign(dot(offset,rig.n))||Math.sign(d0)||1,radial,sweet:Math.hypot(u/FACE_X,v/FACE_Y)};
}
function spatial(point){const right=norm(cross(norm(sub(target,eye)),[0,1,0])),delta=sub(point,eye),distance=Math.hypot(...delta);return{pan:clamp(dot(delta,right)/Math.max(1,distance)*1.4,-.8,.8),distance};}
function playAt(kind,point,gain=1,whenMs=null){return sound.play(kind,{...spatial(point),gain,whenMs});}
function announceImpact(type){fx.announcement=type;}
function flushImpactAnnouncement(){
 if(fx.contactClock&&!fx.contactVisible)return;
 const type=fx.announcement;if(!type)return;fx.announcement=null;
 const label=$('impactLabel'),strip=label.closest('.feedback-strip');if(!strip)return;
 const durations={hit:.65,save:.85,smash:.95,critical:1.12,'critical-smash':1.20,finisher:1.12,point:1.40,winner:1.75,opponent:1.20};
 fx.hold=durations[type]??.75;strip.dataset.impact=type;label.classList.add('visible');
 for(const animation of label.impactAnimations||[])animation.cancel();label.impactAnimations=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 strip.classList.remove('burst');if(!reduced){void strip.offsetWidth;strip.classList.add('burst');
  const strong=['smash','critical','critical-smash','finisher','winner'].includes(type);
  label.impactAnimations.push(label.animate([{opacity:0,transform:'translateY(7px) scale('+(strong?.82:.96)+')'},{opacity:1,transform:'translateY(-1px) scale('+(strong?1.055:1.01)+')',offset:.57},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:strong?380:200,easing:'cubic-bezier(.16,.8,.24,1)'}));
 }
 if(['point','winner','opponent'].includes(type)){
  const board=document.querySelector('.scoreboard');board.dataset.result=type==='opponent'?'opponent':'you';
  $('score').classList.remove('score-pop');if(!reduced){void $('score').offsetWidth;$('score').classList.add('score-pop');}
 }
}

function syncContactFeedback(presentationNow){
 const clock=fx.contactClock;if(!clock)return;
 const seconds=(presentationNow-clock.presentationMs)/1000;fx.contactVisible=seconds>=0;fx.age=Math.max(0,seconds);
 fx.shake=seconds>=0?clock.shake*Math.exp(-seconds*28):0;
 fx.flash=seconds>=0?clock.flash*Math.exp(-seconds*30):0;
}

const strokeName=value=>value==='cut'?tr('커트'):value==='drive'?tr('드라이브'):value==='lob'?tr('높은 공'):tr('리턴');
function showIncoming(style,warning=false){
 const output=$('spinRead');if(!output)return;output.dataset.spin=warning?'danger':style;
 if(!state.careerMatch&&!warning&&style==='flat'){output.textContent=tr('입문 연습 · 스윙 버튼에 불이 들어오면 눌러보세요.');return;}
 output.textContent=warning?tr('리턴이 높이 떴어요 · 상대 스매시 주의'):style==='cut'?tr('하회전 · 앞으로 들어가 커트, 안정된 자세에서는 드라이브'):style==='drive'?tr('상회전 · 드라이브로 맞받거나 안정된 자세로 커트'):style==='lob'?tr('높은 공 · 바운드 후 스매시 기회'):tr('오는 공의 구질을 보고 리턴하세요.');
}
function chooseEnemyStyle(){
 if(!state.careerMatch||practiceHelp())return 'flat';
 const boss=opponentLevel().boss,index=fx.rally+state.score[0]+state.score[1];
 if(opponentLevel().simpleReturns==='flat'||opponentLevel().simpleReturns==='mixed'&&index%3!==0)return 'flat';
 if(boss?.id==='defender')return index%3===0?'drive':'cut';
 if(boss?.id==='tactician')return index%2===0?'cut':'drive';
 if(boss?.id==='striker')return index%4===0?'cut':'drive';
 return index%3===1?'cut':'drive';
}
function readSpin(incoming,style,footing,timingRisk,sweet,smash,player){
 const control=player?clamp(growth().accuracy,.45,1):1;
 const pressure=clamp(((1-(footing?.score??.75))*.65+timingRisk*.70+Math.max(0,sweet-.45)*.35)*control,0,1);
 const netDip=incoming==='cut'&&style==='drive'&&!smash?Math.max(0,pressure-.32)*1.9:0;
 const popup=incoming==='drive'&&style==='cut'&&!smash?clamp((pressure-.34)*1.8,0,1):0;
 return {incoming,pressure,netDip,popup,mode:netDip>.15?'underlift':popup>.22?'popup':incoming==='cut'&&style==='drive'?'lift':incoming==='drive'&&style==='cut'?'soft':'normal'};
}
function setStrokeStyle(value){
 if(!['drive','cut'].includes(value))return;state.strokeStyle=value;
 document.querySelectorAll('[data-stroke]').forEach(b=>{const active=b.dataset.stroke===value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
function setServeLength(value){
 if(!['short','deep'].includes(value))return;state.serveLength=value;
 document.querySelectorAll('[data-serve]').forEach(b=>{const active=b.dataset.serve===value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
const courseName=value=>value<0?tr('왼쪽'):value>0?tr('오른쪽'):tr('가운데');
function setCourse(value){
 state.course=clamp(Number(value),-1,1);
 document.querySelectorAll('[data-course]').forEach(button=>{const active=Number(button.dataset.course)===state.course;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
}
function evaluateFooting(rig){
 const player=rig.player,receiver=player?state.playerStroke:state.enemyStroke,facing=player?-1:1,bx=player?state.px:state.enemyX,bz=player?state.pz:state.enemyZ;
 const feet=receiver.groundFeet?.feet||[],planted=feet.filter(f=>!f.moving&&f.y<.004),speed=player?Math.hypot(...state.velocity):Math.hypot(state.enemyDefense.vx||0,state.enemyMotion.forwardVelocity||0);
 const center=[bx-facing*rig.hip[0],bz+facing*rig.hip[2]],points=planted.map(f=>[f.x,f.z-facing*.09]);
 let distance=.40;
 if(points.length===1)distance=Math.hypot(center[0]-points[0][0],center[1]-points[0][1]);
 if(points.length>=2){const a=points[0],b=points[1],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((center[0]-a[0])*dx+(center[1]-a[1])*dz)/Math.max(.001,dx*dx+dz*dz),0,1);distance=Math.hypot(center[0]-a[0]-dx*t,center[1]-a[1]-dz*t);}
 const support=planted.length>=2?1:planted.length===1?.58:.06,settled=planted.length?planted.reduce((sum,f)=>sum+clamp((f.plantedTime||0)*(player?growth().recovery:1)/.10,0,1),0)/planted.length:0;
 const balance=clamp(1-distance/(planted.length===1?.34:.22),0,1),turn=player?state.playerMotion.turn:state.enemyMotion.turn;
 const inertia=clamp(speed/(1.45*(player?growth().speed:1))*.78+(turn?.phase==='brake'?turn.amount*.30:0),0,1);
 const lunge=player?0:clamp((state.enemyDefense.stretch||0)*.08+(state.enemyDefense.scramble||0)*.03,0,.11);
 const score=clamp(support*.42+settled*.24+balance*.20+(1-inertia)*.14-lunge,0,1);
 return{score,grade:score>=.78?'stable':score>=.50?'adjusting':'unstable',label:score>=.78?tr('안정'):score>=.50?tr('조정 중'):tr('중심 불안'),planted:planted.length,speed,balance,power:mix(.70,1.08,score),spread:(.012+(1-score)**2*.24+speed*.020)*(player?growth().accuracy*(1-(1-score)*growth().guard):1)};
}
let footingUIAt=-Infinity;
function updateFootingUI(time){
 if(time-footingUIAt<90)return;footingUIAt=time;const footing=evaluateFooting(strikeRig(true));state.previewFooting=footing;
 const status=$('footingStatus');if(status){status.textContent=tr('발 디딤 · ')+footing.label;status.dataset.grade=footing.grade;}
}
function drawCourseGuide(){
 if(state.pointWait>0||state.playing&&ball.vz<0)return;
 const x=state.course*.52,y=.786,z=state.serve?.phase==='ready'?(state.serveLength==='short'?-.52:-1.16):state.strokeStyle==='cut'?-.50:-1.12,col=state.previewFooting?.grade==='stable'?'#d9efca':'#e6cf9d';
 for(const sx of [-1,1])for(const sz of [-1,1]){const p=[x+sx*.060,y,z+sz*.075];tube(p,[p[0]-sx*.025,y,p[2]],.0032,col,5);tube(p,[p[0],y,p[2]-sz*.030],.0032,col,5);}
}

function impact(player,contact,beforeCountdown,afterCountdown){
 const rec=player?state.playerStroke:state.enemyStroke,key=player?'swing':'enemySwing';
 state[key]=mix(beforeCountdown,afterCountdown,contact.t);
 const rig=strikeRig(player),surface=add(add(add(rig.center,mul(rig.r,contact.u)),mul(rig.u,contact.v)),mul(rig.n,contact.side*FACE_DEPTH));
 const position=add(surface,mul(rig.n,contact.side*(BALL_RADIUS+.001)));
 [ball.x,ball.y,ball.z]=position;
 const defending=!player&&rec.defense,footing=evaluateFooting(rig),course=player?state.course:0;
 const active=state[key]>0,p=active?1-state[key]:-1,timing=Math.abs(p-(rec.contactPhase??.38)),perfect=!defending&&(!player||!rec.assistedTiming)&&footing.score>=(player?.62:.78)&&active&&contact.sweet<=.42&&timing<.105&&(rec.inputTiming??1)<.036*(player?growth().sweetWindow:1);
 const learningRelief=state.careerMatch?(opponentLevel().learningRelief||0):0;
 const timingOffset=active?(p-(rec.contactPhase??.38))*(rec.duration||strokeDuration):0,timingError=active?Math.max(Math.abs(timingOffset),(rec.inputTiming??0)*.65):0,timingRisk=player&&active?smooth(clamp((timingError-(state.careerMatch?.085+.055*learningRelief:.15)*growth().sweetWindow)/(state.careerMatch?.18+.06*learningRelief:.24),0,1)):0;
 const edge=contact.sweet>.82,centered=contact.sweet<=.42,smash=!!rec.smash&&active&&ball.y>1.16&&!edge,finisher=player&&smash&&!edge&&!!ball.smashChance&&!!ball.chanceBounced&&footing.score>=.72&&timingRisk<.20,unstableReturn=!player&&(footing.score<.62||footing.planted<2&&footing.speed>.85||footing.score<.76&&state.enemyDefense.stretch>.55),kind=unstableReturn?'unstable-block':finisher?(perfect?'critical-finish-smash':'finish-smash'):defending?(state.enemyDefense.stretch>.5?'desperate-block':'pressure-block'):perfect?(smash?'critical-smash':'critical'):(smash?'smash':(!active?'block':edge?'edge':centered?'center':'hit'));
 if(player){state.hit=true;if((rec.approachStrike||rec.advanceShot)&&!finisher){const a=rec.approachStrike||rec.advanceShot;rec.rallyRecovery={mode:'retreat',phase:'follow',phaseAge:0,age:0,supportSide:a.leadSide,direction:0,retreatZ:0,readDirection:0,release:0,amount:0,shift:0,roll:0,backLoad:0,headingYaw:rec.turnShot?.headingYaw||0,diagonalLoad:rec.turnShot?.diagonalLoad||0,freeStepped:false};}else if(rec.turnShot&&!finisher)rec.rallyRecovery={phase:'follow',phaseAge:0,age:0,supportSide:rec.turnShot.side,direction:0,shotDirection:rec.turnShot.direction,targetX:state.px,readDirection:0,release:0,amount:0,shift:0,roll:0,freeStepped:false};}else state.enemyHit=true;
 const incoming=ball.spin||'flat',style=active&&!smash?(rec.shotStyle||'drive'):'flat',response=readSpin(incoming,style,footing,timingRisk,contact.sweet,smash,player);
 const special=player&&active&&rec.special&&smash&&timingRisk<=.25&&footing.score>=.50;
 const flight=returnBall(!player,{special,kind,sweet:contact.sweet,u:contact.u,footing,course,timingRisk,timingOffset,style,response});
 if(defending||unstableReturn)defenseSaved();else if(!player){state.enemyDefense.outcome='returned';defensePhase('recover');}
 if(!player)beginEnemyRecovery(rig);
 const shot=rec.locked||rec.selected,record={player,special:!!special,kind,course:player?course:null,footing:footing?{...footing}:null,landing:flight,quality:edge?'edge':centered?'center':'face',style:flight.style,response,timingError,timingOffset,timingRisk,finisher,shot,progress:p,inputTiming:rec.inputTiming??null,sweet:contact.sweet,position:[...position],surface:[...surface],racketCenter:[...rig.center],normal:[...rig.n],planeDistance:Math.abs(dot(sub(position,rig.center),rig.n)),time:state.elapsed,body:{pitch:rig.pose.bodyPitch,hip:rig.pose.hip,chest:rig.pose.chest},rally:++fx.rally};
 if(!player){state.lastEnemyShot=record;const output=$('enemyReturnStatus');if(output){output.textContent=tr('상대: ')+strokeName(flight.style)+' · '+footing.label+(flight.chance?tr(' · 약한 로브 · 찬스 볼'):tr(' · 힘 ')+Math.round(flight.power*100)+'%');output.dataset.chance=String(flight.chance);}}
 if(state.careerMatch)career.recordMatchEvent({type:'contact',player,center:centered&&timingRisk<=.25&&footing.score>=.62&&response.mode!=='underlift'&&response.mode!=='popup',critical:perfect,smash,style:flight.style,unstable:footing.score<.50,chance:!player&&flight.chance});
 if(player&&state.careerMatch)career.recordTraining({quality:timingRisk>.25||response.mode==='underlift'||response.mode==='popup'?'mistimed':record.quality,course,kind});
 if(player){state.lastShot=record;const output=$('shotResult');if(output)output.textContent=tr('마지막 타구: ')+courseName(course)+' · '+(smash?tr('스매시'):strokeName(flight.style))+' · '+footing.label+tr(' · 힘 ')+Math.round(flight.power*100)+'%'+(timingRisk>.25?' · '+(timingOffset>=0?tr('스윙이 빨랐어요'):tr('스윙이 늦었어요')):'');}
 fx.lastContact=record;fx.contacts.push(record);if(fx.contacts.length>40)fx.contacts.shift();
 if(player&&active&&!tutorial.active&&!rec.special)specialCharge=Math.min(100,specialCharge+(edge?8:perfect?24:18));
 if(player)tutorial.contact({power:!!rec.smash&&active,high:ball.y>1.16,active});
 fx.age=0;fx.hold=finisher?.95:.65;fx.slowFor=finisher?.20:0;fx.hitstop=finisher?.085:perfect?.057:smash?.040:edge?.007:centered?.030:.018;fx.shake=finisher?.045:perfect?.033:smash?.022:edge?.0028:centered?.010:.006;fx.flash=finisher?.23:perfect?.17:smash?.09:edge?.009:centered?.045:.025;fx.power=smash||perfect?1:0;fx.point=[...surface];
 if(player){fx.shake*=mix(.72,1.08,footing.score);fx.flash*=mix(.75,1.05,footing.score);}else{fx.shake*=mix(.55,.90,footing.score);fx.flash*=mix(.55,.90,footing.score);fx.hitstop*=mix(.65,1,footing.score);}
 fx.rays=Array.from({length:finisher?20:perfect?14:smash?10:edge?3:centered?8:5},(_,i)=>({angle:i*2*Math.PI/(finisher?20:perfect?14:smash?10:edge?3:centered?8:5),length:(finisher?.30:perfect?.20:.11)*(1+(i%3)*.17)}));
 if(special){fx.hold=.9;fx.slowFor=.14;fx.hitstop=.075;fx.shake=.035;fx.flash=.20;fx.power=1;}
 fx.ring={r:rig.r,u:rig.u,n:rig.n};fx.trail=[];
 const expectedPresentation=performance.now()+fx.renderLead;
 const audioEvent=playAt(special?'special':edge?'edge':finisher?'finish':perfect?(smash?'criticalSmash':'critical'):smash?'smash':player&&active&&!defending&&flight.style==='cut'?'cut':player&&active&&!defending&&flight.style==='drive'?'drive':centered&&active&&!defending?'center':!active||defending?'edge':'hit',surface,player?mix(.78,1.04,footing.score):mix(.58,.84,footing.score),expectedPresentation);
 const presentationMs=audioEvent?.presentationMs??expectedPresentation;
 fx.contactClock={presentationMs,rattle:edge,shake:fx.shake*(player?1:.65),flash:fx.flash};fx.contactVisible=false;
 fx.hitstop+=Math.max(0,(presentationMs-expectedPresentation)/1000);
 record.feedback={presentationMs,audioTime:audioEvent?.audioTime??null,latencyMs:(audioEvent?.latency||0)*1000};
 const label=$('impactLabel');label.className='impact-label '+(perfect?'critical':'')+(smash?' smash':'');label.querySelector('b').textContent=perfect?(smash?tr('CRITICAL SMASH'):tr('CRITICAL!')):smash?tr('SMASH!'):edge?tr('EDGE HIT'):!active?tr('BLOCK'):centered?tr('SWEET SPOT'):tr('NICE SHOT');
 label.querySelector('span').textContent=(shot==='backhand'?tr('백핸드'):tr('포핸드'))+(perfect?tr(' · 정확한 타이밍과 정타'):smash?tr(' · 강한 한 방'):edge?tr(' · 라켓 끝 빗맞음'):centered?tr(' · 라켓 중앙 정타'):tr(' · 리턴'));
 announceImpact(finisher?'finisher':defending?'save':perfect?(smash?'critical-smash':'critical'):smash?'smash':edge?'edge':centered?'center':'hit');
 if(player&&response.mode==='popup'){label.querySelector('b').textContent='FLOATING RETURN';label.querySelector('span').textContent=tr('상회전을 누르지 못해 공이 떴어요');showIncoming('lob',true);message(tr('상대 스매시에 대비하세요. 자세를 낮추고 코스를 보세요.'),'DEFEND');return;}
 if(player&&response.mode==='underlift'){label.querySelector('b').textContent='LOW RETURN';label.querySelector('span').textContent=tr('하회전을 들어 올리지 못했어요 · 네트 주의');message(tr('발을 멈추고 공을 조금 더 기다려 들어 올려보세요.'),'SPIN READ');return;}
 if(player&&!smash&&active&&timingRisk<=.25){label.querySelector('b').textContent=perfect?'PERFECT '+(flight.style==='cut'?'CUT':'DRIVE'):flight.style==='cut'?'CUT!':'DRIVE!';label.querySelector('span').textContent=strokeName(flight.style)+' · '+(flight.style==='cut'?tr('짧고 낮게 · 상대를 앞으로'):tr('깊고 빠르게 · 바운드 후 전진'));}
 if(player&&timingRisk>.25){label.querySelector('b').textContent=timingOffset>=0?'EARLY!':'LATE!';label.querySelector('span').textContent=(timingOffset>=0?tr('스윙이 빨랐어요'):tr('스윙이 늦었어요'))+' · '+tr('코스 오차 증가');message(tr('타이밍이 어긋나 공이 벗어날 수 있어요.'),tr('RALLY'));return;}
 if(special){label.classList.add('special');label.querySelector('b').textContent=tr('라이징 스매시!');label.querySelector('span').textContent=tr('온몸의 힘을 모은 필살의 한 방');announceImpact('finisher');message(tr('라이징 스매시! 빈 코스를 노리세요.'),'SPECIAL SMASH');return;}
 if(finisher){label.classList.add('finisher');label.querySelector('b').textContent=tr('FINISH SMASH!');label.querySelector('span').textContent=tr('찬스를 놓치지 않은 결정타');message(tr('찬스 볼을 강하게 마무리!'),tr('FINISH SMASH'));return;}
 if(!player&&flight.chance){label.querySelector('b').textContent='CHANCE BALL';label.querySelector('span').textContent=tr('상대 발 디딤 불안정 · 높게 뜬 리턴');announceImpact('save');message(tr('상대가 중심을 잃어 공이 높게 떴어요! 바운드 뒤 E!'),'SMASH CHANCE');return;}
 if(defending){label.querySelector('b').textContent='BLOCK!';label.querySelector('span').textContent=tr('상대가 발을 딛고 낮게 받아냈어요.');message(tr('상대가 중심을 잡고 블록했어요. 다음 코스를 노려보세요.'),tr('RALLY'));return;}
 message((shot==='backhand'?tr('백핸드'):tr('포핸드'))+(perfect?(smash?tr(' 크리티컬 스매시!'):tr(' 크리티컬!')):smash?tr(' 스매시!'):!active?tr(' 블록!'):tr(' 리턴!')),perfect?tr('PERFECT CONTACT'):smash?'SMASH':tr('RALLY'));
}
function updateFX(realDt){
 fx.age+=realDt;fx.slowFor=Math.max(0,fx.slowFor-realDt);fx.hitstop=Math.max(0,fx.hitstop-realDt);fx.shake*=Math.exp(-realDt*24);fx.flash*=Math.exp(-realDt*24);
 if(fx.age>fx.hold){$('impactLabel').classList.remove('visible');const strip=$('impactLabel').closest('.feedback-strip');if(strip){delete strip.dataset.impact;strip.classList.remove('burst');}const board=document.querySelector('.scoreboard');delete board.dataset.result;}else if(!fx.contactClock||fx.contactVisible)$('impactLabel').classList.add('visible');else $('impactLabel').classList.remove('visible');
 for(const point of fx.trail)point.age+=realDt;fx.trail=fx.trail.filter(p=>p.age<.15);
 for(const point of fx.swingTrail)point.age+=realDt;fx.swingTrail=fx.swingTrail.filter(p=>p.age<.095);
}
function drawImpact(){
 if(fx.contactClock&&!fx.contactVisible)return;
 if(fx.point&&fx.age<.25){
  const fade=1-fx.age/.25,ring=fx.ring,center=fx.point,radius=.018+fx.age*(fx.power?1.05:.55),col=fx.power?'#ffda78':'#f8f4d9';
  for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;const p=t=>add(add(center,mul(ring.r,Math.cos(t)*radius)),mul(ring.u,Math.sin(t)*radius));tube(p(a),p(b),.0025*fade,col,4);}
  for(const ray of fx.rays){const d=add(mul(ring.r,Math.cos(ray.angle)),mul(ring.u,Math.sin(ray.angle))),inner=.025+fx.age*.8,outer=inner+ray.length*fade;tube(add(center,mul(d,inner)),add(center,mul(d,outer)),.0035*fade,col,4);}
 }
 if(fx.power&&fx.trail.length>1)for(let i=1;i<fx.trail.length;i++){const a=fx.trail[i-1],b=fx.trail[i],width=(fx.lastContact?.finisher?.016:.010)*(1-b.age/.15);if(width>0)tube(a.p,b.p,width,fx.lastContact?.finisher?'#fff0ae':fx.lastContact?.kind.includes('critical')?'#ffe7a0':'#f1c46a',5);}
 if(fx.swingTrail.length>1)for(let i=1;i<fx.swingTrail.length;i++){const a=fx.swingTrail[i-1],b=fx.swingTrail[i],radius=.010*(1-b.age/.095);if(radius>0)tube(a.p,b.p,radius,'#ffe3ac',5);}
}

function racket(x,y,z,rotation={pitch:0,yaw:0,roll:0},face='#252b29',gear=null){
 rotatedFrame([x,y,z],rotation.pitch||0,rotation.yaw||0,rotation.roll||0,()=>{
  taper([0,-.035,0],[0,.073,0],.015,.011,gear?.accent||'#ad8052',10);
  softSphere(0,.145,0,.083,.105,.013,gear?.accent||'#ccb083',8,16);
  softSphere(0,.145,.014,.079,.100,.003,face,8,16);
  softSphere(0,.145,-.014,.079,.100,.003,gear?gear.color:'#bd5247',8,16);
  box(0,-.032,0,.026,.012,.025,'#6a4b36');
  const grade=gearRank(gear);if(grade){
   for(const side of [-1,1]){const z=side*.019;for(let k=0;k<grade;k++){const y=.104+k*.018;tube([-.027,y,z],[0,y+.022,z],.0025,gear.accent,5);tube([0,y+.022,z],[.027,y,z],.0025,gear.accent,5);}if(grade>=2)gem(0,.175,z,.012,grade===4?'#b5f0e5':gear.accent);}
   if(grade>=3){for(let k=0;k<12;k++){const a=k*Math.PI/6,b=a+.19;tube([Math.cos(a)*.081,.145+Math.sin(a)*.103,0],[Math.cos(b)*.081,.145+Math.sin(b)*.103,0],.0035,gear.accent,5);}}
   if(grade===4){taper([0,-.03,0],[0,.068,0],.016,.012,gear.accent,8);gem(0,.073,-.019,.01,'#b5f0e5');}
  }gearAura(gear,0,.145,0,.105,.130,.032);
 });
}
// Grip geometry rotates in the same frame as the paddle and its collision face.
function grippedRacket(skin,face,gear=null){
 softSphere(0,-.005,-.018,.032,.043,.024,skin,6,10);
 for(let i=0;i<4;i++){
  const y=-.030+i*.018;
  taper([-.023,y,-.010],[-.014,y,.018],.009,.008,skin,6);
  taper([-.014,y,.018],[.012,y,.020],.008,.007,skin,6);
 }
 taper([.026,.023,-.018],[.021,.044,.006],.012,.010,skin,7);
 taper([.021,.044,.006],[.006,.049,.009],.010,.008,skin,7);
 racket(0,0,0,{},face,gear);
}
function relaxedHand(hand,elbow,skin){
 const axis=norm(sub(hand,elbow)),right=norm(cross(axis,Math.abs(axis[2])>.85?[0,1,0]:[0,0,1])),front=cross(right,axis);
 withFrame(hand,right,axis,front,()=>{
  softSphere(0,.004,0,.028,.034,.018,skin,6,10);
  for(let i=0;i<4;i++){const x=-.020+i*.013,length=[.026,.035,.032,.022][i];taper([x,.025,.002],[x,.025+length,.009],.007,.005,skin,6);}
  taper([-.026,0,.004],[-.038,.024,.010],.010,.007,skin,6);
 });
}

function updateRallyRecovery(dt,input,depthInput=0){
 const rec=state.playerStroke;let r=rec.rallyRecovery;
 const desired=Math.sign(depthInput),strokeSafe=state.swing<=0||state.hit&&1-state.swing>=(rec.contactPhase??.38)+.12;
 const reversing=desired!==0&&strokeSafe&&state.playing&&state.pointWait<=0&&!state.celebration.active&&
  (desired*state.velocity[1]<-.20||r?.mode==='retreat'&&['push','chase'].includes(r.phase)&&desired*(r.driveDirection||1)<0);
 if(reversing&&(!r||r.phase!=='brake')){
  const feet=rec.groundFeet?.feet||[],rear=feet.filter(f=>!f.moving).sort((a,b)=>desired*(a.z-b.z)+input*(a.x-b.x)*.70)[0];
  if(rear){
   const yaw=footIntent(strikeRig(true),rear.side).yaw;
   r=rec.rallyRecovery={mode:'retreat',driveDirection:desired,phase:'brake',phaseAge:0,age:0,supportSide:rear.side,supportYaw:yaw,direction:input/Math.max(1,Math.hypot(input,depthInput)),retreatZ:0,headingYaw:r?.headingYaw||0,diagonalLoad:r?.diagonalLoad||0,readDirection:0,release:0,amount:r?.amount||0,shift:r?.shift||0,roll:r?.roll||0,backLoad:r?.backLoad||0,brakeLoad:0,freeStepped:false};
  }
 }
 if(!r)return;
 if(state.pointWait>0||state.celebration.active||!state.playing){rec.rallyRecovery=null;return;}
 r.age+=dt;r.phaseAge+=dt;
 const inbound=ball.vz>.05,eta=inbound?clamp((state.pz-.45-ball.z)/ball.vz,0,1.2):0;
 r.targetX=inbound?clamp(ball.x+ball.vx*eta,-1.1,1.1):state.px;
 const delta=r.targetX-state.px;r.readDirection=inbound&&Math.abs(delta)>.10?Math.sign(delta):0;
 const progress=state.swing>0?1-state.swing:1,cp=rec.contactPhase??.38;
 if(r.mode==='retreat'){
  const feet=rec.groundFeet?.feet||[];
  if(r.phase==='brake'){
   const support=feet.find(f=>f.side===r.supportSide),allLanded=!feet.some(f=>f.moving);
   if(depthInput*(r.driveDirection||1)<=0){r.phase='ready';r.phaseAge=0;}
   else if(support&&!support.moving&&allLanded&&Math.hypot(...state.velocity)<.16&&r.phaseAge>.055){
    // On a diagonal entry, push from the opposite foot so the near foot can lead.
    if(input!==0){const outside=feet.find(f=>f.side===-Math.sign(input));if(outside&&!outside.moving){r.supportSide=outside.side;r.supportYaw=footIntent(strikeRig(true),outside.side).yaw;}}
    r.phase='push';r.phaseAge=0;r.freeStepped=false;r.direction=input/Math.max(1,Math.hypot(input,depthInput));r.retreatZ=(r.driveDirection||1)/Math.max(1,Math.hypot(input,depthInput));
   }
  }
  if(r.phase==='follow'&&depthInput>0&&progress>=cp+.12){
   const front=feet.filter(f=>!f.moving).sort((a,b)=>a.z-b.z)[0];
   if(front){r.supportSide=front.side;r.supportYaw=footIntent(strikeRig(true),front.side).yaw;r.phase='brake';r.phaseAge=0;r.direction=input/Math.max(1,Math.hypot(input,depthInput));r.retreatZ=depthInput/Math.max(1,Math.hypot(input,depthInput));r.driveDirection=1;r.freeStepped=false;}
  }
  const free=feet.find(f=>f.side!==r.supportSide);
  const entryLength=Math.max(1,Math.hypot(input,depthInput));
  if(r.phase==='brake'||r.phase==='chase'){
   r.direction=mix(r.direction,input/entryLength,1-Math.exp(-dt*12));
   if(r.phase==='chase')r.retreatZ=mix(r.retreatZ,depthInput/entryLength,1-Math.exp(-dt*12));
  }
  // Landing goals remain fixed in flight; steering changes the following step.
  const diagonalTarget=r.driveDirection===-1&&['brake','push','chase'].includes(r.phase)?Math.abs(r.direction):0;
  r.diagonalLoad=mix(r.diagonalLoad||0,diagonalTarget,1-Math.exp(-dt*12));
  r.headingYaw=mix(r.headingYaw||0,r.direction*.26*r.diagonalLoad,1-Math.exp(-dt*10));
  if(r.phase==='push'&&r.freeStepped&&free&&!free.moving){r.phase='chase';r.phaseAge=0;}
  if(r.phase==='chase'&&(depthInput*(r.driveDirection||1)<=0||inbound&&eta<.25||(r.driveDirection===-1?state.pz<=1.80:state.pz>=2.92))){r.phase='ready';r.phaseAge=0;}
  const departing=r.phase!=='follow';
  r.release=mix(r.release,departing?1:0,1-Math.exp(-dt*15));
  r.amount=mix(r.amount,r.phase==='brake'?.85:r.phase==='push'?1:r.phase==='chase'?.45:0,1-Math.exp(-dt*12));
  r.backLoad=mix(r.backLoad,r.phase==='push'?(r.driveDirection||1):r.phase==='chase'?clamp(state.velocity[1]/1.45,-1,1)*.65:0,1-Math.exp(-dt*11));
  r.brakeLoad=mix(r.brakeLoad||0,r.phase==='brake'?1:0,1-Math.exp(-dt*16));
  const pushDirection=r.phase==='brake'?r.supportSide:r.direction;
  r.shift=mix(r.shift,(r.supportSide*.012+pushDirection*.022*(r.diagonalLoad||0))*r.amount,1-Math.exp(-dt*12));
  r.roll=mix(r.roll,(-r.supportSide*.025-pushDirection*.050*(r.diagonalLoad||0))*r.amount,1-Math.exp(-dt*12));
  if(r.phase==='ready'&&r.amount<.01&&Math.abs(r.backLoad)<.01&&(r.brakeLoad||0)<.01&&(r.diagonalLoad||0)<.01&&Math.abs(r.headingYaw||0)<.01||r.age>3.5)rec.rallyRecovery=null;
  return;
 }
 if(r.phase==='follow'&&input!==0&&progress>=cp+.13&&(inbound||r.age>.18)){
  r.phase='push';r.phaseAge=0;r.direction=Math.sign(input);
  const feet=rec.groundFeet?.feet||[],support=feet.find(f=>f.side===-r.direction&&!f.moving)||feet.find(f=>f.side===r.supportSide&&!f.moving)||feet.find(f=>!f.moving);
  if(support)r.supportSide=support.side;r.freeStepped=false;
 }
 const free=rec.groundFeet?.feet.find(f=>f.side!==r.supportSide);
 if(r.phase==='push'&&(r.freeStepped&&free&&!free.moving&&r.phaseAge>.08||r.phaseAge>.28)){r.phase='chase';r.phaseAge=0;}
 if(r.phase==='chase'&&(r.phaseAge>.40||inbound&&eta<.28||input===0)){r.phase='ready';r.phaseAge=0;}
 const departing=r.phase==='push'||r.phase==='chase'||r.phase==='ready';
 r.release=mix(r.release,departing?1:0,1-Math.exp(-dt*15));
 const anticipation=r.phase==='follow'&&r.readDirection!==0?.32:0,target=r.phase==='push'?1:r.phase==='chase'?.45:anticipation;
 r.amount=mix(r.amount,target,1-Math.exp(-dt*12));
 const direction=r.phase==='follow'?r.readDirection:r.direction;
 r.shift=mix(r.shift,direction*.019*r.amount,1-Math.exp(-dt*11));r.roll=mix(r.roll,-direction*.065*r.amount,1-Math.exp(-dt*11));
 if(r.phase==='ready'&&r.amount<.01||r.age>3.5)rec.rallyRecovery=null;
}

function updateDirectionChange(dt,input){
 const m=state.playerMotion,t=m.turn||(m.turn={phase:'ready',age:0,direction:0,supportSide:1,amount:0,roll:0,shift:0,braceSound:false});
 t.age+=dt;const vx=state.velocity[0],recovery=state.playerStroke.rallyRecovery,depthOwned=recovery?.mode==='retreat'&&['brake','push'].includes(recovery.phase);
 if(depthOwned&&['brake','push'].includes(t.phase)){t.phase='recover';t.age=0;}
 if((t.phase==='ready'||t.phase==='recover'&&t.age>.08)&&input*vx<-.25&&!state.celebration.active&&!depthOwned){
  t.phase='brake';t.age=0;t.direction=Math.sign(input);t.supportSide=Math.sign(vx);t.braceSound=false;
 }
 if((t.phase==='brake'||t.phase==='push')&&(input===0||Math.sign(input)!==t.direction)){t.phase='recover';t.age=0;}
 const support=state.playerStroke.groundFeet?.feet.find(f=>f.side===t.supportSide),grounded=!support||!support.moving;
 if(t.phase==='brake'&&grounded&&t.age>.025&&!t.braceSound){t.braceSound=true;if(state.playing&&state.pointWait<=0)playAt('shoe',[support?.x??state.px,.025,support?.z??state.pz],.30);}
 if(t.phase==='brake'&&Math.abs(vx)<.17&&grounded&&t.age>.065){t.phase='push';t.age=0;}
 if(t.phase==='push'&&t.age>.17){t.phase='recover';t.age=0;}
 if(t.phase==='recover'&&t.age>.24){t.phase='ready';t.age=0;}
 const active=t.phase==='brake'||t.phase==='push';t.amount=mix(t.amount,active?1:0,1-Math.exp(-dt*(active?20:12)));
 const direction=t.phase==='brake'?t.supportSide:t.direction;
 t.roll=mix(t.roll,-direction*(t.phase==='brake'?.075:.115)*t.amount,1-Math.exp(-dt*10));
 t.shift=mix(t.shift,direction*(t.phase==='brake'?.022:.018)*t.amount,1-Math.exp(-dt*11));
 return t;
}

function footIntent(rig,side){
 if(rig.receiver.preview)return {toe:[side*.145,0,.135],lift:0,heel:0,yaw:side*.06,lead:side<0?1:0};
 const pose=rig.pose,rec=rig.receiver,st=rec.stance,key=side<0?'left':'right',blend=st?st[key]:0,visibility=st?(st.visibility??1):1;
 const transfer=rig.player?state.playerMotion.turn:state.enemyMotion.turn,turnWidth=(transfer?.amount||0)*.016;
 const retreat=rig.player?rec.rallyRecovery:null;
 const pushHeel=retreat?.mode==='retreat'&&retreat.phase==='push'&&side===retreat.supportSide?.030*retreat.amount:!rig.player&&transfer?.phase==='push'&&side===transfer.supportSide ? .026*transfer.amount : 0;
 const lead=pose.leadSide!==undefined?(side===pose.leadSide?1:0):(side<0?1-pose.backhand:pose.backhand),rear=1-lead;
 return{toe:[side*(.205+turnWidth)+side*(st?(st[key+'Arc']||0)*visibility:0)+side*lead*(pose.stepOut||0)+(pose.defense?-pose.defenseDir*pose.defenseSpread*(side===-pose.defenseDir?1:.2):0),0,side*.025-side*mix(.035,-.035,blend)*visibility+lead*pose.frontStep+.135],
  lift:lead*pose.footLift*(st?.active?0:1)+(st?(st[key+'Lift']||0)*visibility:0),heel:Math.max(rear*pose.rearHeel,pushHeel),yaw:side*.10+mix(-.075,.090,blend)*visibility+pose.hip*(lead*.14+rear*.82)+(retreat?.headingYaw||0),lead};
}
function updateGroundFeet(player,dt,vx,vz){
 const rig=strikeRig(player),rec=rig.receiver,bx=player?state.px:state.enemyX,bz=player?state.pz:state.enemyZ,facing=player?-1:1,c=player?state.swing:state.enemySwing,phase=c>0?1-c:0,cp=rec.contactPhase??.38;
 const toWorld=p=>[bx-facing*p[0],bz+facing*p[2]],speed=Math.hypot(vx,vz),turn=player?state.playerMotion.turn:state.enemyMotion.turn;
 const approach=player&&c>0&&phase<cp+.10?rec.approachStrike:null;
 const link=approach||(player&&c>0&&phase<cp+.13?rec.turnShot:null);
 const departure=player&&rec.rallyRecovery?.phase==='push'?rec.rallyRecovery:!player&&turn&&turn.phase==='push'?turn:null;
 const directionWorld=departure?(departure.worldDirection??departure.direction):(turn?.worldDirection??turn?.direction??0);
 const turning=turn&&['brake','push','land'].includes(turn.phase);
 const depthBrake=player&&rec.rallyRecovery?.mode==='retreat'&&rec.rallyRecovery.phase==='brake'?rec.rallyRecovery:null;
 const retreat=departure?.mode==='retreat',forecastZ=depthBrake?0:retreat?departure.retreatZ*Math.max(.55,Math.abs(vz)):vz;
 const forecastX=depthBrake?0:departure?directionWorld*Math.max(.65,Math.abs(vx)):turn&&['brake','land'].includes(turn.phase)?0:turn?.phase==='push'?directionWorld*Math.max(.65,Math.abs(vx)):vx;
 const brace=c>0&&!rec.defense&&phase>=cp-.045&&phase<cp+.18&&!(player&&(rec.rallyRecovery?.release||0)>.25);
 const goals=[-1,1].map(side=>{const intent=footIntent(rig,side);
  if(c>0&&!rec.defense&&phase>.12&&phase<cp-.045&&intent.lead>.5){const future=footIntent(strikeRig(player,1-(cp-.04),[0,0,0]),side);intent.toe=future.toe;}
  const world=toWorld(intent.toe),lead=brace||link?0:clamp(.09+speed*.015,.09,.13);
  if(link&&side!==link.side&&phase>.08)world[0]+=link.direction*.040;
  if(departure&&side!==departure.supportSide){world[0]+=directionWorld*.060;if(retreat)world[1]+=departure.retreatZ*.085;}
  return{side,intent,x:world[0]+forecastX*lead,z:world[1]+forecastZ*lead};});
 if(!rec.groundFeet)rec.groundFeet={next:1,feet:goals.map(g=>({side:g.side,x:g.x,z:g.z,y:0,moving:false,progress:1,plantedTime:.15,liftHandled:false}))};
 const plan=rec.groundFeet;
 for(const f of plan.feet){
  const g=goals.find(g=>g.side===f.side);f.plantedTime=f.moving?0:(f.plantedTime||0)+dt;if(g.intent.lift<.002)f.liftHandled=false;
  if(f.moving){
   f.progress=Math.min(1,f.progress+dt/f.duration);const u=f.progress,e=u*u*u*(u*(u*6-15)+10);
   f.x=mix(f.fromX,f.toX,e);f.z=mix(f.fromZ,f.toZ,e);f.y=Math.sin(Math.PI*u)**2*f.height;
   if(u>=1){f.moving=false;f.plantedTime=0;if(player&&rec.approachStrike?.stepped&&f.side===rec.approachStrike.leadSide){rec.approachStrike.leadPlanted=true;rec.approachStrike.landedAt=state.elapsed;}f.x=f.toX;f.z=f.toZ;f.y=0;plan.next=-f.side;if(state.playing&&state.pointWait<=0)playAt('shoe',[f.x,.025,f.z],brace?.30:.15+Math.min(speed,2)*.065);}
  }
 }
 if(!plan.feet.some(f=>f.moving)){
  const candidates=plan.feet.map(f=>{const g=goals.find(g=>g.side===f.side),error=Math.hypot(g.x-f.x,g.z-f.z),lift=(g.intent.lift>.006&&!f.liftHandled)||(!!link&&f.side!==link.side&&!link.freeStepped&&phase>(approach?.12:.08))||(!!departure&&f.side!==departure.supportSide&&!departure.freeStepped);return{f,g,error,lift};})
   .filter(v=>(!brace||!!departure||v.error>.25)&&(!turning||!!link||!!departure||v.f.side!==turn.supportSide||v.error>.30)&&(!link||v.f.side!==link.side||v.error>.32)&&(!departure||v.f.side!==departure.supportSide||v.error>.32)&&(!depthBrake||v.error>.32)&&(v.error>(speed>.12?.09:.030)||v.lift))
   .sort((a,b)=>(b.lift?1:0)-(a.lift?1:0)||b.error-a.error+(b.f.side===plan.next?.035:0)-(a.f.side===plan.next?.035:0));
  if(candidates.length){const {f,g,error}=candidates[0];
   f.fromX=f.x;f.fromZ=f.z;f.toX=g.x;f.toZ=g.z;f.progress=0;f.duration=clamp(.17-speed*.026,.105,.17);
   if(c>0&&phase<cp-.045)f.duration=Math.min(f.duration,Math.max(.075,(cp-.045-phase)*(rec.duration||strokeDuration)));
   if(link&&f.side!==link.side)link.freeStepped=true;
   if(player&&rec.approachStrike&&f.side===rec.approachStrike.leadSide)rec.approachStrike.stepped=true;
   if(departure&&f.side!==departure.supportSide)departure.freeStepped=true;
   f.height=Math.max(g.intent.lift,clamp(.025+error*.07,.025,.058));f.moving=true;f.plantedTime=0;f.liftHandled=true;plan.next=-f.side;
  }
 }
}

// Shared sports-comic design for the match, dressing room and item fitting.
function pointExpressions(playerWon){
 for(const player of [true,false]){const motion=player?state.playerMotion:state.enemyMotion,won=player===playerWon,previous=motion.face||{};
  motion.face={...previous,happy:previous.happy||0,sad:previous.sad||0,focus:previous.focus||0,kind:won?'happy':'sad',until:state.elapsed+(ball.finisher?.landed?1.9:1.3)};
 }
}
function updateExpressions(dt){
 for(const player of [true,false]){const motion=player?state.playerMotion:state.enemyMotion,face=motion.face||(motion.face={kind:'neutral',until:0,happy:0,sad:0,focus:0});
  const envelope=clamp((face.until-state.elapsed)/.40,0,1),happy=face.kind==='happy'?envelope:0,sad=face.kind==='sad'?envelope:0;
  const rec=player?state.playerStroke:state.enemyStroke,countdown=player?state.swing:state.enemySwing,focus=state.playing&&state.pointWait<=0?(countdown>0?.9:.50):0,blend=1-Math.exp(-dt*11);
  face.happy=mix(face.happy,happy,blend);face.sad=mix(face.sad,sad,blend);face.focus=mix(face.focus,focus*(1-Math.max(face.happy,face.sad)),blend);
 }
}
function cartoonAthleteHead(look,skin,hair,wear,motion,pose,isPlayer){
 const shape=look?.face||'oval',jaw=shape==='angular'?.086:shape==='round'?.102:.094,cheek=shape==='round'?.122:.116;
 const cheer=Math.max(pose.celebration||0,motion.face?.happy||0)*(!isPlayer&&pose.taunt&&pose.taunt!=='dance'&&pose.taunt!=='salute'?.45:1),sad=motion.face?.sad||0,focus=motion.face?.focus||0,blink=(state.elapsed+(isPlayer?0:1.7))%4.8,open=Math.max(.08,blink<.14?1-Math.sin(blink/.14*Math.PI):1);
 const shock=!isPlayer?(pose.revengeShock||0):0,anger=!isPlayer?(pose.revengeAnger||0):0;
 const ink='#303633',lip=tintHex(skin,'#a45b55',.74),blush=tintHex(skin,'#ef8b89',.40);
 // Broad cheeks and a small rounded chin read clearly from the match camera.
 roundedRings([[0,.035,.038,0,.002],[.013,.071,.059,0,.003],[.036,jaw,.078,0,.006],[.076,cheek,.095,0,.001],[.137,cheek,.101,0,-.004],[.195,.103,.094,0,-.012],[.239,.074,.069,0,-.016],[.264,.020,.023,0,-.016]],skin,32);
 for(const side of [-1,1]){
  softSphere(side*(cheek-.002),.120,-.012,.017,.023,.015,skin,8,14);
  softSphere(side*cheek,.120,-.001,.006,.011,.005,tintHex(skin,'#c67e6c',.27),6,10);
  const eyeX=side*.045,eyeY=.132-sad*.003,pupilX=eyeX+clamp((motion.lookYaw||0)*.009,-.004,.004);
  const eyeH=.024*(1-focus*.12-cheer*.28)*(1+shock*.22)*open;
  if(!isPlayer&&pose.taunt==='wink'&&pose.tauntWeight>.25&&side===1){
   tube([eyeX-.015,eyeY,.100],[eyeX+.015,eyeY+.002,.100],.0038,ink,8);
  }else if(cheer>.65){
   tube([eyeX-.016,eyeY-.004,.099],[eyeX,eyeY+.006,.104],.0035,ink,8);
   tube([eyeX,eyeY+.006,.104],[eyeX+.016,eyeY-.004,.099],.0035,ink,8);
  }else{
   softSphere(eyeX,eyeY,.094,.024,eyeH+.003,.009,'#fff8eb',8,16);
   softSphere(pupilX,eyeY,.102,.016*(1-shock*.35),eyeH*(1-shock*.32),.005,ink,8,16);
   softSphere(pupilX,eyeY-.008,.106,.010,.009*open,.0015,'#695c49',6,12);
   if(open>.4&&shock<.4){softSphere(pupilX-.005,eyeY+.009,.108,.0048,.0055,.0016,'#ffffff',6,10);softSphere(pupilX+.005,eyeY-.009,.108,.002,.002,.001,'#fff6d9',5,8);}
  }
  tube([side*.025,.172+sad*.011-focus*.006+shock*.017-anger*.013,.094],[side*.067,.170-sad*.010+focus*.003+shock*.011+anger*.010,.079],.0045,hair,8);
  softSphere(side*.080,.093,.078,.019,.009,.003,blush,7,14);
 }
 softSphere(0,.101,.106,.009,.008,.007,tintHex(skin,'#f4c8a6',.22),8,14);
 const smug=!isPlayer&&pose.taunt?pose.tauntWeight||0:0,cornerY=.066+cheer*.005-sad*.010,centerY=.058+sad*.015;
 if(shock>.35){softSphere(0,.064,.092,.012,.018,.004,lip,8,14);}else if(anger>.25){tube([-.020,.065,.087],[0,.070,.094],.003,lip,8);tube([0,.070,.094],[.020,.065,.087],.003,lip,8);}else{
 if(cheer>.15){softSphere(0,.060,.089,.021*cheer,.017*cheer,.004,lip,8,14);taper([-.013*cheer,.067,.094],[.013*cheer,.067,.094],.0025,.0025,'#fff9e9',8);}
 tube([-.019,cornerY,.085],[-.009,centerY,.092],.0028,lip,8);tube([-.009,centerY,.092],[.009,centerY,.092],.0028,lip,8);tube([.009,centerY,.092],[.019,cornerY+smug*.009,.085],.0028,lip,8);
 }
 if(shock>.12){softSphere(.113,.169,.047,.010,.023,.007,'#a7dbdf',7,12);softSphere(-.114,.150,.045,.007,.015,.006,'#a7dbdf',6,10);}
 if(anger>.45&&pose.revenge==='frustrated'){const red='#c86f60';tube([.081,.181,.071],[.081,.194,.071],.0025,red,6);tube([.081,.194,.071],[.094,.194,.071],.0025,red,6);tube([.101,.181,.069],[.101,.169,.069],.0025,red,6);tube([.101,.169,.069],[.089,.169,.072],.0025,red,6);}
 const style=look?.hairStyle||'part',shine=tintHex(hair,'#b9aa87',.13);
 // One continuous cap with broad locks instead of many small hair pieces.
 roundedRings([[.182,.117,.107,0,-.018],[.218,.119,.111,0,-.020],[.260,.101,.095,-.006,-.020],[style==='crop'?.282:.302,.062,.060,-.011,-.019],[style==='crop'?.290:.319,.009,.012,-.014,-.018]],hair,32);
 if(style==='part'){
  rotatedFrame([-.037,.212,.078],0,0,-.24,()=>softSphere(0,0,0,.078,.037,.039,hair,10,20));
  rotatedFrame([.063,.216,.063],0,0,.35,()=>softSphere(0,0,0,.036,.031,.036,hair,9,16));
  rotatedFrame([-.039,.242,.093],0,0,-.24,()=>softSphere(0,0,0,.050,.009,.003,shine,6,14));
 }else if(style==='crop'){
  for(const [x,y,r] of [[-.064,.199,.040],[0,.196,.043],[.062,.205,.038]])softSphere(x,y,.079,r,.022,.028,hair,8,16);
  softSphere(-.026,.254,.079,.043,.007,.003,shine,6,12);
 }else{
  softSphere(-.050,.207,.076,.055,.030,.034,hair,9,18);softSphere(.047,.207,.076,.055,.030,.034,hair,9,18);
  softSphere(0,.207,-.136,.045,.054,.041,hair,9,18);taper([0,.20,-.15],[.020,.103,-.164],.031,.015,hair,12);
  softSphere(0,.211,-.138,.048,.013,.043,isPlayer?wear.clothes.accent:'#d8dfc3',7,14);
 }
 for(const side of [-1,1])softSphere(side*.110,.171,-.016,.011,.022,.022,hair,7,12);
 if(isPlayer&&wear.headband.color){
  const item=wear.headband,grade=gearRank(item);roundedRings([[.176,.124,.119,0,-.014],[.196,.125,.120,0,-.016]],item.color,28);
  if(grade>=2){rings([[.176,.125,.120,0,-.014],[.181,.126,.121,0,-.014]],item.accent,24);rings([[.193,.126,.121,0,-.016],[.197,.125,.120,0,-.016]],item.accent,24);gem(0,.187,.109,grade===4?.016:.009,grade===4?'#a9eee1':item.accent);}
  if(grade>=3){taper([.065,.185,-.115],[.080,.13,-.145],.009,.005,item.color,6);taper([.055,.185,-.12],[.038,.11,-.14],.007,.004,item.accent,6);}
  gearAura(item,0,.187,-.014,.145,.040,.140);
 }
}
function avatar(x,z,facing,shirt,countdown,isPlayer,profileOverride=null,equipmentOverride=null){
 const wear=isPlayer?(equipmentOverride||career.appearance()):null,look=isPlayer?(profileOverride||career.profile()):null;if(isPlayer)shirt=wear.clothes.color;
 const receiver=isPlayer?state.playerStroke:state.enemyStroke,rig=strikeRig(isPlayer),pose=rig.pose,motion=isPlayer?state.playerMotion:state.enemyMotion,walk=motion.blend,step=motion.phase,breath=Math.sin(state.elapsed*2.4)*.004;
 const sway=Math.sin(step)*.012*walk,hip=rig.hip,leanX=motion.lateral*.025,skin=isPlayer?look.skin:'#d4a889',hair=isPlayer?look.hairColor:'#293c38';
 shadow(x,z,.25,.19);
 withFrame([x,0,z],[-facing,0,0],[0,1,0],[0,0,facing],()=>{
  const rotate=p=>[Math.cos(pose.chest)*p[0]+Math.sin(pose.chest)*p[2],p[1],-Math.sin(pose.chest)*p[0]+Math.cos(pose.chest)*p[2]];
  const shoulder=side=>side>0?rig.localShoulder:rig.localLeftShoulder;
  // Feet stay near the ground; each knee bends toward the table as weight changes.
  for(const side of [-1,1]){
   const intent=footIntent(rig,side),ground=receiver.groundFeet?.feet.find(f=>f.side===side);
   const toe=ground?[-facing*(ground.x-x),ground.y,facing*(ground.z-z)]:intent.toe;
   const footAngle=intent.heel*5,link=isPlayer&&state.swing>0?(receiver.approachStrike||receiver.turnShot):null;
   const pivot=link&&side===link.side?smooth(clamp((pose.t-.10)/((receiver.contactPhase??.38)+.02),0,1)):1;
   const recovery=isPlayer&&receiver.rallyRecovery?.mode==='retreat'?receiver.rallyRecovery:null;
   const transfer=!isPlayer?motion.turn:recovery,held=transfer&&(transfer.amount>.015||['brake','push','land'].includes(transfer.phase))&&side===transfer.supportSide;
   const transferPivot=recovery?1-recovery.amount:transfer?.pivot||0;
   const footYaw=link&&side===link.side?mix(link.supportYaw,intent.yaw,pivot):held?mix(transfer.supportYaw,intent.yaw,transferPivot):intent.yaw;
   const ankle=add(toe,eulerVector([0,.105,-.135],footAngle,footYaw,0));
   const upper=add(hip,eulerVector([side*.098,0,0],pose.hipPitch,pose.hip,pose.bodyRoll*.45));
   const kneePole=eulerVector([side*.20,.04,1],0,footYaw*.55+pose.hip*.45,0),knee=twoBone(upper,ankle,.37,.365,kneePole);
   taper(upper,add(upper,mul(sub(knee,upper),.58)),.087,.073,'#304b43');
   taper(add(upper,mul(sub(knee,upper),.49)),knee,.067,.056,skin,16);
   softSphere(...knee,.055,.055,.054,skin,8,16);
   const calf=add(knee,mul(sub(ankle,knee),.40));taper(knee,calf,.050,.052,skin,16);softSphere(...calf,.051,.058,.050,skin,7,14);taper(calf,ankle,.052,.033,skin,16);
   taper(add(ankle,[0,.081,0]),add(ankle,[0,-.026,0]),.038,.038,'#f7f1e4');
   rotatedFrame(toe,footAngle,footYaw,0,()=>{
    softSphere(0,.049,-.094,.078,.052,.129,isPlayer?wear.shoes.color:'#f4ecd9',9,18);
    softSphere(0,.025,-.089,.077,.018,.128,isPlayer?wear.shoes.accent:'#3f685b',5,12);
    for(let j=0;j<3;j++)tube([-.03,.087-j*.003,-.097+j*.018],[.03,.087-j*.003,-.097+j*.018],.0025,'#c8cec1',4);
    for(const edge of [-1,1])tube([edge*.061,.052,-.13],[edge*.062,.048,-.054],.005,isPlayer?wear.shoes.accent:'#477e77',5);
    if(isPlayer){const item=wear.shoes,grade=gearRank(item);for(let k=0;k<grade;k++)tube([-.045,.071,-.16+k*.018],[.045,.071,-.16+k*.018],.003,item.accent,5);if(grade>=3)for(const edge of [-1,1]){quad([edge*.076,.045,-.08],[edge*.077,.074,-.02],[edge*.077,.077,.014],[edge*.076,.052,-.002],item.accent);if(grade===4)quad([edge*.077,.052,-.045],[edge*.078,.090,.020],[edge*.078,.065,.008],[edge*.077,.042,-.014],'#f6dd9e');}gearAura(item,0,.052,-.090,.100,.080,.155);}
   });
  }
  rotatedFrame(hip,pose.hipPitch,pose.hip,pose.bodyRoll*.45,()=>{
   roundedRings([[0,.150,.104,0,0],[.09,.150,.102,0,.008],[.19,.158,.103,0,.018]],shirt,28);
  });
  rotatedFrame(rig.torsoOrigin,...rig.torsoRotation,()=>{
   roundedRings([[.10,.145,.102,0,0],[.19,.154,.103,0,.012],[.32,.176,.109,0,.018],[.40,.185,.108,0,.015],[.445,.176,.099,0,.012],[.48,.112,.075,0,.012]],shirt,28);
   rings([[.105,.146,.104,0,0],[.12,.148,.105,0,.002]],isPlayer?wear.clothes.accent:'#477e77',24);
   // Simple round neck and a clean jersey silhouette.
   taper([0,.471,.012],[0,.535,.019],.052,.046,skin,16);
   roundedRings([[.467,.073,.056,0,.013],[.480,.070,.052,0,.013],[.489,.064,.048,0,.013]],isPlayer?wear.clothes.accent:'#dbe5d5',28);
   softSphere(-.09,.353,.123,.020,.022,.003,'#f6edd7',6,10);softSphere(-.09,.353,.127,.010,.011,.001,isPlayer?wear.clothes.accent:'#477e77',5,8);
   
   for(const side of [-1,1]){
    tube([side*.146,.17,.068],[side*.177,.34,.071],.003,isPlayer?wear.clothes.accent:'#a8c8b0',6);
    tube([side*.09,.445,.085],[side*.172,.426,.071],.004,'#f2e8d1',5);
   }
   if(isPlayer){const item=wear.clothes,grade=gearRank(item);if(grade){for(const side of [-1,1]){
    for(const front of [-1,1]){quad([side*.110,.425,front*.085],[side*.170,.413,front*.079],[side*.154,.348,front*.107],[side*.108,.377,front*.114],item.accent);if(grade>=2)tube([side*.025,.29,front*.122],[side*.123,.35,front*.119],.004,item.accent,5);if(grade>=3)tube([side*.025,.265,front*.119],[side*.123,.325,front*.119],.003,'#e9c574',5);}
   }gem(-.088,.355,.130,grade===4?.027:.015,grade>=3?'#e9c574':item.accent);if(grade===4){gem(-.088,.355,.134,.013,'#adf0dd');for(const side of [-1,1]){tube([side*.030,.405,.109],[side*.075,.442,.093],.006,'#f3d17c',5);tube([side*.030,.405,-.109],[side*.075,.442,-.093],.006,'#f3d17c',5);}}}gearAura(item,0,.29,.01,.235,.285,.165);}
   const jerseyInk='#f1e7cc';
   if(isPlayer){tube([-.042,.36,-.113],[.044,.36,-.113],.010,jerseyInk,6);tube([.044,.36,-.113],[-.014,.24,-.112],.010,jerseyInk,6);}
   else{tube([-.040,.36,-.113],[.040,.36,-.113],.009,jerseyInk,6);tube([.040,.36,-.113],[.040,.31,-.114],.009,jerseyInk,6);tube([.040,.31,-.114],[-.040,.24,-.112],.009,jerseyInk,6);tube([-.040,.24,-.112],[.040,.24,-.112],.009,jerseyInk,6);}
   // Stable head with a small counter-rotation to keep the eyes on the ball.
   const cheer=pose.celebration||0,blinkPhase=(state.elapsed+(isPlayer?0:1.7))%4.8,blink=blinkPhase<.14?Math.sin(blinkPhase/.14*Math.PI):0;
   const disappointment=motion.face?.sad||0,eyeOpen=Math.max(.12,1-blink),headYaw=(motion.lookYaw||0)*(1-cheer)-pose.chest*.72;
   rotatedFrame([0,.515,.025],.03-pose.bodyPitch*.65+(motion.lookPitch||0)*(1-cheer)-cheer*.10+disappointment*.085,headYaw+(pose.revengeHeadYaw||0),-pose.bodyRoll*.40+cheer*.035-disappointment*.045+(pose.tauntHeadRoll||0),()=>{
    withFrame([0,0,0],[1.62,0,0],[0,1.48,0],[0,0,1.44],()=>cartoonAthleteHead(look,skin,hair,wear,motion,pose,isPlayer));
   });
  });
  const leftRoot=shoulder(-1),leftSolved=balanceArm(rig),leftHand=leftSolved.hand,leftElbow=leftSolved.elbow;
  const rightRoot=shoulder(1),rightHand=rig.localHand,rightElbow=rig.localElbow;
  function arm(root,elbow,hand,right){
   const cuff=add(root,mul(sub(elbow,root),.43));
   softSphere(...root,.059,.061,.060,shirt,8,16);
   taper(root,cuff,.061,.052,shirt,16);
   const seam=norm(sub(elbow,root));taper(add(cuff,mul(seam,-.007)),add(cuff,mul(seam,.007)),.053,.052,isPlayer?wear.clothes.accent:'#a8c8b0',10);
   taper(cuff,elbow,.049,.040,skin,16);
   softSphere(...elbow,.042,.042,.042,skin,8,16);taper(elbow,hand,.040,.027,skin,16);
   if(right)taper(add(hand,mul(sub(elbow,hand),.12)),add(hand,mul(sub(elbow,hand),.24)),.031,.033,'#eee5d1',10);
   if(right)rotatedFrame(rig.localGrip,rig.rotation.pitch,rig.rotation.yaw,rig.rotation.roll,()=>grippedRacket(skin,isPlayer?wear.racket.color:'#b64e43',isPlayer?wear.racket:null));
   else if(ceremonyWeight(pose)>.02)withCeremonyWrist(hand,elbow,()=>{if(!isPlayer&&pose.taunt)rivalGesture([0,0,0],skin,pose.taunt,pose.tauntWeight);else clenchedFist([0,0,0],skin);});else relaxedHand(hand,elbow,skin);
  }
  arm(leftRoot,leftElbow,leftHand,false);arm(rightRoot,rightElbow,rightHand,true);
 });
}
function povHands(){
 const rig=strikeRig(true),hand=rig.hand,root=rig.shoulder,elbow=rig.elbow,wear=career.appearance(),skin=career.profile().skin;
 const slim=document.documentElement.dataset.input==='touch'?.78:1;
 taper(root,elbow,.063*slim,.045*slim,skin);softSphere(...elbow,.044*slim,.047*slim,.042*slim,skin,6,12);taper(elbow,hand,.041*slim,.027,skin);
 taper(add(hand,mul(sub(elbow,hand),.12)),add(hand,mul(sub(elbow,hand),.24)),.032,.034,'#eee5d1',10);
 withFrame(rig.origin,rig.r,rig.u,rig.n,()=>grippedRacket(skin,wear.racket.color,wear.racket));
 if(rig.pose.celebration>.01){
  const solved=balanceArm(rig),world=p=>[state.px+p[0],p[1],state.pz-p[2]],fist=world(solved.hand),shoulder=world(rig.localLeftShoulder),elbow=world(solved.elbow);
  taper(shoulder,elbow,.060,.041,skin);softSphere(...elbow,.041,.044,.041,skin,5,10);taper(elbow,fist,.040,.027,skin);
  withFrame([state.px,0,state.pz],[1,0,0],[0,1,0],[0,0,-1],()=>withCeremonyWrist(solved.hand,solved.elbow,()=>clenchedFist([0,0,0],skin)));
 }
}
function cameraGoal(){
 if(state.view==='pov'){
  const touch=document.documentElement.dataset.input==='touch',height=touch?1.64:1.55,assist=touch?clamp(Math.atan2(-state.px,state.pz+1.1),-.30,.30):0;
  const e=[state.px,height,state.pz+.7],yaw=state.yaw+assist,d=norm([Math.sin(yaw),-state.pitch,-Math.cos(yaw)]);
  return[e,add(e,mul(d,3))];
 }
 if(state.view==='follow'){
  // Raise and pull back the chase camera so the near player's head clears
  // the table. Portrait screens and retreating footwork need extra room.
  // The scene boots while the court is hidden. A zero-width canvas must not
  // produce an infinite camera position when follow is the default view.
  const aspect=canvas.clientWidth>0&&canvas.clientHeight>0?canvas.clientWidth/canvas.clientHeight:Math.max(.35,innerWidth/Math.max(1,innerHeight)),portrait=clamp((1.15-aspect)/.45,0,1);
  const center=[state.px*.30,.74,0],pitch=Math.max(.54,state.pitch)+portrait*.045;
  const orbit=[Math.sin(state.yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(state.yaw)*Math.cos(pitch)],right=[Math.cos(state.yaw),0,-Math.sin(state.yaw)],up=cross(orbit,right),tan=Math.tan(49*Math.PI/360);
  let distance=Math.max(4.7,state.distance)+portrait*.20+Math.max(0,state.pz-2.18)*.65;
  const topBound=Math.max(.4,1-2*(document.documentElement.dataset.input==='touch'?60:94)/Math.max(1,canvas.clientHeight));
  // Fit feet after a retreat and keep the rival's head below the score HUD.
  for(const p of [[state.px-.5,0,state.pz+.30],[state.px+.5,0,state.pz+.30],[state.px,2.25,state.pz],[state.enemyX,1.98,state.enemyZ]]){
   const delta=sub(p,center),y=dot(delta,up);
   distance=Math.max(distance,dot(delta,orbit)+Math.max(Math.abs(dot(delta,right))/(tan*aspect*.94),Math.abs(y)/(tan*(y>0?topBound:.94))));
  }
  return[add(center,mul(orbit,distance)),center];
 }
 const center=[0,.75,0];
 return[add(center,[Math.sin(state.yaw)*Math.cos(state.pitch)*state.distance,Math.sin(state.pitch)*state.distance,Math.cos(state.yaw)*Math.cos(state.pitch)*state.distance]),center];
}
function setView(view){
 state.view=view;state.yaw=0;
 if(view==='pov'){state.pitch=.30;state.distance=4.5;state.povFov=56}
 if(view==='follow'){state.pitch=.60;state.distance=4.9}
 if(view==='side'){state.yaw=1.06;state.pitch=.44;state.distance=4.9}
 if(view==='top'){state.yaw=.18;state.pitch=1.12;state.distance=4.6}
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',b.dataset.view===view)});
 $('cameraLabel').textContent={pov:tr('라켓 시점'),follow:tr('선수 뒤'),side:tr('측면'),top:tr('전체 보기')}[view];
}
function message(text,phase=tr('PRACTICE RALLY')){if(document.documentElement.dataset.input==='touch'){text=text.replace(/\bE\b/gi,tr('스매시 버튼')).replace(/\bSPACE\b/g,tr('스윙 버튼'));if(document.documentElement.lang==='ko')text=text.replaceAll('버튼로','버튼으로').replaceAll('버튼를','버튼을');if(innerWidth<=850&&innerHeight>innerWidth){const idle=document.querySelector('.feedback-idle');if(idle)idle.textContent=text;}}$('message').textContent=text;$('phase').textContent=phase;}

function feed(opening=false){
 state.serve=null;
 state.queuedSwing=null;state.playerStroke.transition=null;state.enemyStroke.transition=null;state.playerStroke.turnShot=null;state.playerStroke.approachStrike=null;state.playerStroke.advanceShot=null;state.playerMotion.lastForwardAt=-100;state.playerStroke.rallyRecovery=null;state.playerStroke.motionSample=null;
 state.celebration.active=false;state.enemyMotion.taunt=null;state.enemyMotion.revenge=null;state.rallyStarted=state.elapsed;if(state.score[0]===0&&state.score[1]===0)state.enemyMotion.revengePending=false;
 if(state.enemyDefense.phase!=='ready')defensePhase('recover');
 state.enemySwing=0;state.enemyStroke.locked=null;state.enemyStroke.defense=false;state.enemyStroke.recovery=null;
 if(state.enemyMotion.turn){state.enemyMotion.turn.phase='settle';state.enemyMotion.turn.age=0;}
 const high=state.highFeed,x=(Math.random()-.5)*.16,targetX=clamp(state.px*.75+.08,-.55,.55);
 ball={x,y:high?1.5:1.16,z:-1.03,vx:(targetX-x)/(high?1.55:1.25),vy:high?1.7:1.1,vz:high?1.7:2.15};
 state.pointWait=0;state.hit=false;state.enemyPrepared=false;state.enemyHit=false;fx.rally=0;fx.trail=[];
 // The opening practice ball waits for the player's serve input. Auto-feeding
 // on entry used to award a point before a newcomer had time to get ready.
 if(opening||tutorial.active&&tutorial.step===1||state.careerMatch&&!high){prepareServe();return;}
 showIncoming(high?'lob':'flat');
 $('serveStatus').textContent=tr('연습 랠리 · 자동 투구');
 message(high?tr('높이 튀는 공에 E로 스매시!'):tr('공을 몸 앞까지 기다렸다가 SPACE로 스윙하세요.'));
}
function prepareServe(){
 const total=state.score[0]+state.score[1],turn=total>=20?10+total-20:Math.floor(total/2),player=turn%2===0;
 state.swing=0;state.enemySwing=0;state.velocity=[0,0];state.px=clamp(state.px,-.65,.65);state.pz=2.05;state.enemyX=clamp(state.enemyX,-.65,.65);state.enemyZ=-2.05;
 showIncoming('flat');
 state.serve={player,phase:'ready',age:0,style:state.serveLength,course:0};ball.rallyShot=null;ball.vx=ball.vy=ball.vz=0;
 $('serveStatus').textContent=(player?(document.documentElement.dataset.input==='touch'?tr('내 서브 · 스윙 버튼으로 시작'):tr('내 서브 · SPACE로 시작')):tr('상대 서브 · 리턴 준비'))+' · '+(total>=20?tr('듀스 · 매 포인트 교대'):tr('2점마다 교대'));
 message(player?tr('코스와 서브 길이를 고른 뒤 SPACE를 누르세요.'):tr('상대가 서브를 준비합니다. 공을 기다리세요.'),'SERVE');
}
function beginServeToss(){
 const serve=state.serve;if(!serve||serve.phase!=='ready')return;
 const player=serve.player,rec=player?state.playerStroke:state.enemyStroke,key=player?'swing':'enemySwing';
 serve.phase='toss';serve.age=0;serve.style=player?state.serveLength:(practiceHelp()||state.careerMatch&&opponentLevel().entryGame)?'deep':(state.score[0]+state.score[1])%3===0?'deep':'short';serve.course=player?state.course:(practiceHelp()||state.careerMatch&&opponentLevel().entryGame)?0:(Math.random()<.5?-1:1);
 rec.locked=null;lockStroke(rec,player?state.px:state.enemyX,player?state.pz:state.enemyZ,player?-1:1);
 rec.transition=null;rec.turnShot=null;rec.approachStrike=null;rec.advanceShot=null;rec.rallyRecovery=null;rec.smash=false;rec.defense=false;rec.shotStyle='cut';rec.duration=.80;rec.contactPhase=.38;rec.aim=[0,0,0];rec.whoosh=false;rec.planted=false;state[key]=1;
}
function launchServe(){
 const serve=state.serve,player=serve.player,rig=strikeRig(player),direction=player?-1:1,deep=serve.style==='deep',targetX=serve.course*.48,ownZ=-direction*.64,receiveZ=direction*(deep?1.16:.52),t=.38;
 [ball.x,ball.y,ball.z]=rig.center;ball.y=Math.max(.99,ball.y);
 ball.vx=(targetX*.35-ball.x)/t;ball.vz=(ownZ-ball.z)/t;ball.vy=(.79-ball.y+2.9*t*t)/t;
 ball.gravity=5.8;ball.entryBounce=false;ball.spin=deep?'drive':'cut';ball.shotStyle=ball.spin;ball.finisher=null;ball.smashChance=false;ball.opponentChance=false;ball.chanceBounced=false;
 ball.rallyShot={hitter:player,landed:false,bounces:0,serveBounce:0,receiveX:targetX,receiveZ,serveStyle:serve.style};
 if(player){state.hit=true;state.enemyHit=false;state.enemyPrepared=false;}else{state.enemyHit=true;state.hit=false;}
 state.serve=null;if(!player)showIncoming(ball.spin);$('serveStatus').textContent=(player?tr('내 서브'):tr('상대 서브'))+' · '+(deep?tr('깊고 빠른 서브'):tr('짧고 낮은 서브'));playAt('serve',rig.center,.85);
 const label=$('impactLabel');label.className='impact-label';label.querySelector('b').textContent='SERVE';label.querySelector('span').textContent=deep?tr('깊고 빠른 서브'):tr('짧고 낮은 서브');
 fx.contactClock=null;fx.contactVisible=true;fx.age=0;fx.hold=.65;fx.shake=.003;fx.flash=.015;fx.point=[...rig.center];fx.ring={r:rig.r,u:rig.u,n:rig.n};fx.rays=[];fx.trail=[];
 message((player?tr('내 서브'):tr('상대 서브'))+' · '+(deep?tr('깊고 빠른 서브'):tr('짧고 낮은 서브')),'SERVE');
}
function updateServe(dt){
 const serve=state.serve;if(!serve)return false;serve.age+=dt;
 if(serve.phase==='ready'&&!serve.player&&serve.age>.85)beginServeToss();
 if(serve.phase==='toss'&&serve.age>=.80*.38){launchServe();return true;}
 const rig=strikeRig(serve.player),p=serve.phase==='toss'?clamp(serve.age/(.80*.38),0,1):0;
 ball.x=rig.center[0];ball.z=rig.center[2];ball.y=Math.max(1.02,rig.center[1])+.22*Math.sin(Math.PI*p);ball.vx=ball.vy=ball.vz=0;
 return true;
}
function start(){
 if(document.hidden||document.querySelector('dialog[open]'))return;
 if(tutorial.active&&tutorial.step===4){tutorial.finish();return;}
 if(tutorial.active){tutorial.togglePlay();return;}
 sound.unlock();
 if(state.matchFinished){state.playing=false;state.matchFinished=false;state.careerMatch=false;state.pointWait=0;}
 const resume=!!state.careerMatch;
 state.playing=!state.playing;
 $('play').textContent=state.playing?(resume?tr('경기 일시정지'):tr('연습 멈추기')):(resume?tr('경기 재개'):tr('자유 연습 시작'));
 if(state.playing){if(!resume){state.score=[0,0];state.px=0;state.pz=2.18;state.enemyX=.06;state.enemyZ=-2;state.swing=state.enemySwing=0;state.playerStroke.locked=state.enemyStroke.locked=null;state.playerStroke.groundFeet=state.enemyStroke.groundFeet=null;state.playerMotion.turn=state.enemyMotion.turn=null;state.playerMotion.face=state.enemyMotion.face=null;$('score').textContent='0 : 0';document.querySelector('.scoreboard .opponent span').textContent=tr('연습 상대');document.querySelector('.location b').textContent=tr('오늘도, 한 게임.');$('highFeed').disabled=tutorial.active;selectVenue(0);feed(true);}else message(tr('경기를 이어갑니다. 오는 공을 확인하세요.'),tr('RALLY'));}
 else{state.keys={};state.queuedSwing=null;message(resume?tr('성장 경기를 일시정지했어요. 재개하면 이어집니다.'):tr('자유 연습 중에는 경험치를 받지 않아요. 성장 경기로 도전해보세요.'),tr('PAUSED'));}
}
function startCareerMatch(match){
 tutorial.cancel();tutorial.replay.disabled=true;
 if(state.careerMatch&&state.playing&&!state.matchFinished)return;
 selectVenue(match.tier);
 specialCharge=0;state.playerStroke.special=false;sound.unlock();state.careerMatch=true;state.matchFinished=false;state.playing=true;state.score=[...match.score];state.keys={};
 state.swing=0;state.enemySwing=0;state.velocity=[0,0];state.px=0;state.pz=2.18;state.enemyX=.06;state.enemyZ=-2;state.enemyAI={shots:0,lastCorner:0,lastSmash:-100};
 state.playerStroke.groundFeet=null;state.enemyStroke.groundFeet=null;state.playerMotion.turn=null;state.enemyMotion.turn=null;state.playerMotion.face=null;state.enemyMotion.face=null;
 state.enemyDefense={phase:'ready',age:0,amount:0,stretch:0,recoil:0,lean:0,vx:0,targetX:0,targetY:1.1,bodyTarget:0,direction:1,pressure:0,delay:0,outcome:null,events:[]};
 state.highFeed=false;$('highFeed').setAttribute('aria-pressed','false');$('highFeed').textContent=tr('높은 공 연습');$('highFeed').disabled=true;
 $('score').textContent=state.score.join(' : ');$('play').textContent=tr('경기 일시정지');
 const title=match.title;
 document.querySelector('.scoreboard .opponent span').textContent=match.opponent;
 document.querySelector('.location b').textContent=title+tr(' · 성장 경기');
 fx.hitstop=0;fx.slowFor=0;fx.shake=0;fx.flash=0;fx.contactClock=null;fx.age=10;state.celebration.active=false;
 feed();const boss=opponentLevel().boss;const status=$('bossTactic');status.hidden=!boss;if(boss){status.textContent=boss.name+' · '+boss.hint;status.dataset.type=boss.id;state.pointWait=1.8;}message(title+' · '+(boss?boss.intro:tr(' · 11점, 2점 차 승리!')),tr('CAREER MATCH'));
}
function finishCareerPoint(){
 if(!state.careerMatch||state.matchFinished)return;
 const result=career.recordPoint(state.score);if(!result)return;
 state.matchFinished=true;state.keys={};state.queuedSwing=null;if(result.rewardId){$('bossTactic').hidden=false;$('bossTactic').textContent=tr('보스 클리어 보상 획득')+' · '+window.ClubEquipment.items.find(i=>i.id===result.rewardId).name;}state.pointWait=Math.max(state.pointWait,2.6);
 $('play').textContent=tr('자유 연습 시작');$('highFeed').disabled=false;
 message((result.won?tr('경기 승리!'):tr('경기 종료.'))+(result.mode==='rival'?' · '+tr('라이벌 재대결')+' '+result.rank+tr('단계')+(result.firstRivalClear?' · '+tr('단계 돌파!'):''):'')+tr(' 경험치 +')+result.xp+tr(' · 상금 +')+result.coins.toLocaleString('ko-KR')+tr('원')+(result.levels?tr(' · 레벨업! 능력치 +')+result.levels*3+tr('P / 스킬 +')+result.levels+'SP':'')+(result.promoted?tr(' · 새 지역 개방!'):'')+(result.medals?.bonusXp?tr(' · 3성 완성! 추가 보상 획득'):''),tr('MATCH COMPLETE'));
 $('impactLabel').querySelector('span').textContent+=(result.won?tr(' · 경기 승리'):tr(' · 경기 종료'))+' · XP +'+result.xp;
}
const tutorial=(()=>{
 const key='ttk-practice-tutorial-v1',bar=document.createElement('section');bar.className='practice-tutorial';bar.hidden=true;bar.setAttribute('aria-label',tr('탁구 첫걸음'));bar.setAttribute('aria-live','polite');
 const count=document.createElement('span'),info=document.createElement('div'),title=document.createElement('b'),detail=document.createElement('p'),skip=document.createElement('button');count.className='tutorial-count';info.append(title,detail);skip.type='button';bar.append(count,info,skip);document.querySelector('.toolbar').append(bar);
 const replay=document.createElement('button');replay.type='button';replay.className='tutorial-replay';replay.textContent=tr('튜토리얼 다시 보기');document.querySelector('.court-settings-panel').prepend(replay);
 let active=false,step=0,pending=0,nextAt=0,savedHigh=false;
 const touch=()=>document.documentElement.dataset.input==='touch';
 function high(value){state.highFeed=!!value;$('highFeed').setAttribute('aria-pressed',String(state.highFeed));$('highFeed').textContent=tr(state.highFeed?'높은 공 연습 중':'높은 공 연습');}
 function remember(value){try{localStorage.setItem(key,value);}catch{}}
 function seen(){try{return ['complete','skipped'].includes(localStorage.getItem(key));}catch{return false;}}
 function render(){
  bar.hidden=!active;if(!active)return;
  count.textContent=step===4?'✓':step+' / 3';
  title.textContent=tr(['','1. 서브로 시작하기','2. 공을 기다렸다가 스윙','3. 높은 공은 스매시!','준비 끝! 이제 자유롭게 연습하세요.'][step]);
  detail.textContent=tr(step===1?(touch()?'스윙 버튼을 눌러 서브하세요.':'SPACE를 눌러 서브하세요.'):step===2?'버튼이 밝아지면 스윙! 공을 실제로 맞히면 다음 단계로 넘어가요.':step===3?(touch()?'스매시 버튼이 밝아지면 눌러 높은 공을 내려치세요.':'스매시 버튼이 밝아지면 E로 높은 공을 내려치세요.'):'서브, 스윙, 스매시를 모두 해냈어요. 놓쳐도 괜찮으니 계속 도전해보세요.');
  skip.textContent=tr(step===4?'계속 연습하기':'건너뛰기');$('highFeed').disabled=true;$('practiceAssist').disabled=true;$('practiceAssist').checked=true;
 }
 function reset(){fx.age=10;fx.hitstop=0;fx.slowFor=0;fx.contactClock=null;fx.announcement=null;$('impactLabel').classList.remove('visible');state.pointWait=0;state.celebration.active=false;state.enemyMotion.taunt=null;state.enemyMotion.revenge=null;state.swing=state.enemySwing=0;state.queuedSwing=null;state.keys={};state.velocity=[0,0];state.px=0;state.pz=2.05;state.playerStroke.groundFeet=state.enemyStroke.groundFeet=null;state.playerStroke.locked=state.enemyStroke.locked=null;state.score=[0,0];$('score').textContent='0 : 0';}
 function enter(next){
  step=next;pending=0;nextAt=0;reset();
  if(step===4){remember('complete');state.playing=false;$('play').textContent=tr('자유 연습 시작');message(tr('준비 끝! 이제 자유롭게 연습하세요.'),'GOOD JOB');sound.play('point',{gain:.75});}
  else{state.playing=true;high(step===3);feed(step===1);$('play').textContent=tr('연습 멈추기');}
  render();
 }
 function cancel(){if(!active)return;active=false;pending=0;bar.hidden=true;$('highFeed').disabled=false;$('practiceAssist').disabled=false;$('practiceAssist').checked=practiceAssist;high(savedHigh);for(const id of ['smash','mobileSmash'])$(id).classList.remove('timing-ready');}
 function finish(skipped=false){if(!active)return;if(skipped)remember('skipped');cancel();reset();state.playing=true;feed(true);$('play').textContent=tr('연습 멈추기');}
 function queue(next){if(!active||pending)return;pending=next;nextAt=state.elapsed+.65;}
 const api={get active(){return active;},get step(){return step;},replay,seen,cancel,finish,
  togglePlay(){if(!state.playing){enter(pending||step);return;}state.playing=false;state.keys={};state.velocity=[0,0];state.queuedSwing=null;$('play').textContent=tr('자유 연습 시작');},
  start(){if(state.careerMatch)return;if(!active)savedHigh=state.highFeed;active=true;replay.disabled=false;enter(1);},
  served(){if(active&&step===1)queue(2);},
  contact(hit){if(!active||pending)return;if(step===2)queue(hit.active&&!hit.power?3:2);else if(step===3)queue(hit.power&&hit.high?4:3);},
  retry(){state.queuedSwing=null;state.pointWait=.75;message(tr('놓쳐도 괜찮아요. 같은 공으로 다시 해볼게요.'),'TRY AGAIN');},
  tick(){if(active&&pending&&state.playing&&state.elapsed>=nextAt)enter(pending);}
 };
 skip.onclick=()=>finish(step!==4);replay.onclick=()=>api.start();return api;
})();
career.bindStart(startCareerMatch);
window.addEventListener('club-account-changed',()=>{state.playing=false;state.keys={};state.queuedSwing=null;state.velocity=[0,0];message(tr('계정이 변경됐어요 · 새로고침해주세요.'),'ACCOUNT');});
function pauseForInterruption(){
 state.keys={};state.queuedSwing=null;state.velocity=[0,0];dragging=false;releaseTouch();
 if(!state.playing||career.isMap())return;
 state.playing=false;
 $('play').textContent=state.careerMatch?tr('경기 재개'):tr('자유 연습 시작');
 message(tr('화면을 벗어나 경기를 멈췄어요. 준비되면 재개해주세요.'),tr('PAUSED'));
}
addEventListener('blur',pauseForInterruption);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForInterruption();});
addEventListener('club-game-interrupt',pauseForInterruption);
career.bindSuspend(()=>{const wasPlaying=state.playing;state.playing=false;state.keys={};state.queuedSwing=null;state.velocity=[0,0];return()=>{if(state.careerMatch&&!state.matchFinished)state.playing=wasPlaying;};});
career.bindMap(()=>{
 tutorial.cancel();
 state.playing=false;state.serve=null;state.keys={};state.queuedSwing=null;state.velocity=[0,0];dragging=false;
 if(state.matchFinished||!career.hasActiveMatch()){state.matchFinished=false;state.careerMatch=false;state.pointWait=0;state.celebration.active=false;state.enemyMotion.taunt=null;state.enemyMotion.revenge=null;}
 $('play').textContent=state.careerMatch?tr('경기 재개'):tr('자유 연습 시작');
});
career.bindPractice(()=>{
 specialCharge=0;state.playerStroke.special=false;$('bossTactic').hidden=true;state.enemyAI=null;
 state.careerMatch=false;state.matchFinished=false;state.playing=false;state.pointWait=0;state.keys={};state.velocity=[0,0];state.celebration.active=false;state.swing=0;start();tutorial.replay.disabled=false;if(!tutorial.seen())tutorial.start();
});
function swing(power=false,buffered=false,assisted=false){
 sound.unlock();if(state.careerMatch&&!state.playing||state.celebration.active||state.pointWait>0)return;
 if(state.serve){if(state.serve.player&&state.serve.phase==='ready')beginServeToss();return;}
 // One explicit press may wait briefly for this incoming ball. It cannot carry into another shot.
 const careerWindow=state.careerMatch?(opponentLevel().learningRelief||0):0,pressEta=ball.vz>.05?(state.pz-.45-ball.z)/ball.vz:Infinity;
 if(careerWindow>0&&(!power||ball.smashChance)&&!buffered&&state.playing&&!state.hit&&pressEta>.34&&pressEta<.36+.54*careerWindow){state.queuedSwing={power:!!power,expires:state.elapsed+Math.min(1.1,pressEta+.18),assisted:true,careerPress:true,shot:ball.rallyShot};message(tr('스윙 입력 완료 · 공이 오면 한 번 휘두릅니다.'));return;}
 if(practiceHelp()&&!buffered&&state.playing){state.queuedSwing={power:!!power,expires:state.elapsed+3,assisted:true,practice:true};message(tr(power?'스매시 준비! 높은 공을 기다려요.':'스윙 준비! 공이 가까워지면 맞춰 칩니다.'));return;}
 if(state.swing>0&&(!buffered||state.swing>.12)){
  if(!state.careerMatch&&state.swing<=(power?.34:.45))state.queuedSwing={power:!!power,expires:state.elapsed+(power?.24:.34),assisted:!power};return;
 }
 // The same modest normal-shot input buffer applies to every input device.
 // It schedules a real racket swing; contact still requires a swept face hit.
 const incomingEta=ball.vz>.05?(state.pz-.45-ball.z)/ball.vz:Infinity;
 if(!state.careerMatch&&!power&&!buffered&&state.playing&&!state.hit&&incomingEta>.42&&incomingEta<=(state.careerMatch?.84:1.10)){state.queuedSwing={power:false,expires:state.elapsed+(state.careerMatch?.64:.90),assisted:true};return;}
 const inputX=(state.keys.KeyD||state.keys.ArrowRight?1:0)-(state.keys.KeyA||state.keys.ArrowLeft?1:0)+(state.touchMove?.x||0);
 if(inputX*state.velocity[0]<-.25)updateDirectionChange(0,inputX);
 const previous=strikeRig(true),rec=state.playerStroke,turn=state.playerMotion.turn,depthTransfer=rec.rallyRecovery?.mode==='retreat'?rec.rallyRecovery:null,fromRetreat=rec.rallyRecovery?.mode==='retreat';state.queuedSwing=null;rec.rallyRecovery=null;
 const linked=!depthTransfer&&turn&&(turn.phase==='brake'||turn.phase==='push'||turn.phase==='recover'&&turn.age<.20);
 const support=linked?rec.groundFeet?.feet.find(f=>f.side===turn.supportSide&&!f.moving)||rec.groundFeet?.feet.find(f=>!f.moving):null;
 rec.turnShot=linked?{side:support?.side??turn.supportSide,direction:turn.direction,freeStepped:false,started:state.elapsed,supportYaw:footIntent(previous,support?.side??turn.supportSide).yaw}:depthTransfer?{side:depthTransfer.supportSide,direction:depthTransfer.direction,freeStepped:depthTransfer.freeStepped,started:state.elapsed,supportYaw:depthTransfer.supportYaw??footIntent(previous,depthTransfer.supportSide).yaw,headingYaw:depthTransfer.headingYaw||0,diagonalLoad:depthTransfer.diagonalLoad||0}:null;
 rec.locked=null;lockStroke(rec,state.px,state.pz,-1);const pred=predictFlight(.26);
 rec.transition={started:state.elapsed,duration:linked||fromRetreat?.135:buffered?.115:.095,pose:JSON.parse(JSON.stringify(previous.pose)),hand:[...previous.localHand],velocity:linked||fromRetreat?{...rec.poseVelocity}:null,handVelocity:linked||fromRetreat?[...(rec.handVelocity||[0,0,0])]:null};
 const forwardCarry=-state.velocity[1]>.12||depthTransfer?.driveDirection===-1||state.elapsed-(state.playerMotion.lastForwardAt??-100)<.22;
 const forwardFeet=rec.groundFeet?.feet||[],front=forwardFeet.filter(f=>!f.moving).sort((a,b)=>a.z-b.z)[0];
 rec.advanceShot=forwardCarry?{leadSide:front?.side??(rec.mix>.5?1:-1),started:state.elapsed}:null;
 if(rec.advanceShot){rec.transition.duration=.135;rec.transition.velocity={...rec.poseVelocity};rec.transition.handVelocity=[...(rec.handVelocity||[0,0,0])];}
 rec.smash=!!power&&pred.y>1.12;
 const motion=state.playerMotion,advancing=rec.smash&&!!ball.smashChance&&((motion.approachLoad||0)>.08||-state.velocity[1]>.15||state.elapsed-(motion.lastAdvanceAt??-100)<.35);
 rec.approachStrike=null;
 if(advancing){
  const feet=rec.groundFeet?.feet||[],grounded=feet.filter(f=>!f.moving).sort((a,b)=>b.z-a.z),rear=grounded[0]||[...feet].sort((a,b)=>b.z-a.z)[0],side=rear?.side??(rec.mix>.5?-1:1);
  rec.approachStrike={side,supportSide:side,leadSide:-side,direction:0,momentum:clamp(Math.max(-state.velocity[1],motion.lastAdvanceSpeed||0,(motion.approachLoad||0)*1.45)/1.45,.15,1),hipYaw:previous.pose.hip,supportYaw:footIntent(previous,side).yaw,freeStepped:false,stepped:false,leadPlanted:false,started:state.elapsed};
  rec.transition.duration=.135;rec.transition.velocity={...rec.poseVelocity};rec.transition.handVelocity=[...(rec.handVelocity||[0,0,0])];
 }
 rec.special=false;rec.shotStyle=state.strokeStyle;rec.duration=rec.smash?.84:rec.shotStyle==='cut'?.78:strokeDuration;rec.contactPhase=rec.smash?.31:.38;rec.assistedTiming=assisted;rec.whoosh=false;rec.planted=false;rec.aim=[0,0,0];state.swing=1;state.hit=false;
 if(state.playing){
  // Respond to this explicit press instead of requiring a fixed 0.29-second lead.
  // Keep the real racket sweep and manual positioning; never create a return without a swing.
  const relief=state.careerMatch?(opponentLevel().learningRelief||0):0;
  if(relief>0&&!power&&!state.hit&&incomingEta>.055&&incomingEta<.50){
   const originalDuration=rec.duration,targetDuration=clamp(incomingEta/rec.contactPhase,.24,1.12);
   rec.duration=mix(originalDuration,targetDuration,relief);rec.assistedTiming=Math.abs(rec.duration-originalDuration)>.025;
  }
  aimStroke(true);
  // A slightly late normal press can use a shorter stroke. Keep its original
  // timing error so the adjustment never grants a free perfect/critical hit.
  if(!state.careerMatch&&!power&&incomingEta>.04&&incomingEta<.29){const originalTiming=rec.inputTiming;rec.duration=Math.max(.40,Math.min(rec.duration,incomingEta/rec.contactPhase));rec.assistedTiming=true;aimStroke(true);rec.inputTiming=Math.max(originalTiming,rec.inputTiming);}
 }else message(rec.smash?tr('스매시 준비! 높은 공 연습에서 타이밍을 맞춰보세요.'):(rec.locked==='backhand'?tr('백핸드'):tr('포핸드'))+tr(' 준비 스윙.'),tr('WARM UP'));
}
function planBossReturn(kind,chance){
 const opponent=opponentLevel(),boss=opponent.boss;if(!boss||chance)return null;
 const ai=state.enemyAI||(state.enemyAI={shots:0,lastCorner:0,lastSmash:-100});ai.shots++;
 const rank=boss.rank||0,alternate=ai.shots%2?1:-1,open=-Math.sign(state.px+state.velocity[0]*.12)||alternate;
 let plan;
 if(boss.id==='defender')plan={aimX:(Math.floor((ai.shots-1)/2)%2?1:-1)*.43,endZ:1.16,timeScale:1.12,spreadScale:.92,label:tr('깊은 로브로 버티기')};
 else if(boss.id==='tactician'){const short=ai.shots%2===1;plan={aimX:open*.58,endZ:short?.66:1.18,timeScale:short?1.04:1,spreadScale:.78,label:short?tr('빈 곳으로 짧게'):tr('반대편 깊은 코스')};}
 else{const smash=kind.includes('smash');if(smash)ai.lastSmash=state.elapsed;plan={aimX:open*(smash?.56:.46),endZ:1.10,timeScale:smash?.88:1,spreadScale:smash?1.08:1,label:smash?tr('스매시 후 복귀 중 · 반대쪽을 노리세요!'):tr('다음 도전을 준비하세요.')};}
 // Rematches mix readable patterns; pressured returns retain weak-lob counterplay.
 if(rank){
  if(boss.id==='defender'){
   plan.aimX=(rank>=2?alternate:Math.floor((ai.shots-1)/2)%2?1:-1)*(.43+rank*.025);
   if(rank>=2&&ai.shots%3===0){plan.endZ=.72;plan.label=tr('수비에서 짧은 코스로 전환');}
   plan.timeScale=1.12-rank*.025;
  }else if(boss.id==='tactician'){
   if(rank>=2&&ai.shots%3===0){plan.aimX=Math.max(-.45,Math.min(.45,state.px));plan.endZ=1.14;plan.label=tr('몸쪽 깊은 코스');}
   if(rank===3&&ai.shots%4===0){plan.aimX=-ai.lastCorner*.59;plan.endZ=.70;plan.label=tr('반대편 짧은 코스');}
   plan.timeScale*=1-rank*.025;
  }else{
   if(rank>=2&&!kind.includes('smash')){plan.endZ=ai.shots%3===0?.72:1.17;plan.aimX=open*.55;plan.label=tr('짧고 깊게 흔들기');}
   plan.timeScale*=1-rank*.02;
  }
 }
 ai.lastCorner=Math.sign(plan.aimX);const status=$('bossTactic');if(status){status.hidden=false;status.textContent=boss.name+' · '+plan.label;status.dataset.type=boss.id;}
 return plan;
}

function returnBall(toNear,{special=false,kind='hit',sweet=0,u=0,footing=null,course=0,timingRisk=0,timingOffset=0,style='flat',response=null}={}){
 if(!toNear){state.enemyPrepared=false;state.enemyHit=false;}else state.hit=false;
 const cut=style==='cut',drive=style==='drive',exposed=!toNear&&(response?.popup||0)>.22;
 const critical=kind.includes('critical'),smash=kind.includes('smash'),weak=kind==='edge'||kind.includes('block');
 // A pressured save becomes a deep lob: one legal bounce, then a high ball in front of the player.
 const chance=toNear&&(kind==='unstable-block'||['pressure-block','desperate-block'].includes(kind)&&(footing?.score??0)<.74),finishing=!toNear&&kind.includes('finish');
 ball.finisher=finishing?{landed:false,missAt:null}:null;ball.chanceBounced=false;
 ball.smashChance=chance;ball.opponentChance=exposed;
 const opponent=opponentLevel(),ease=toNear?(opponent.ease||0):0,plan=toNear?planBossReturn(kind,chance):null;
 if(plan&&opponent.entryGame){plan.aimX=state.px*.35+plan.aimX*.25+.05;plan.endZ=1.08;}
 if(plan){plan.aimX*=1-ease*.25;plan.timeScale*=1+ease*.12;plan.endZ=Math.max(.78,plan.endZ);}
 const practiceReturn=toNear&&!state.careerMatch;
 const entryReturn=toNear&&!!opponent.entryGame&&!chance;
 const aimX=entryReturn?clamp(state.px*.35+.08+(Math.random()-.5)*.18,-.42,.42):practiceReturn?clamp(state.px*(tutorial.active?.75:.55)+.08+(Math.random()-.5)*(tutorial.active?.06:.26),-.55,.55):plan?plan.aimX:toNear?(chance?clamp(state.px*.65+(Math.random()-.5)*.14,-.48,.48):(Math.random()-.5)*.8*opponentLevel().placement):course*.52,spread=(footing?(footing.spread+clamp(sweet-.42,0,1)*.065):0)*(plan?.spreadScale||1)*(practiceReturn?.35:1);
 const error=(Math.random()+Math.random()-1)*spread;
 const mistime=!toNear?timingRisk:0,early=timingOffset>=0,missSide=Math.sign(course)||Math.sign(u)||1;
 // Timing errors alter the flight itself. A good contact keeps the existing safe landing range.
 const sideways=!early?missSide*Math.pow(mistime,1.4)*1.02:missSide*mistime*.12;
 // Inexperience and poor footing can produce a real wide ball, never a gifted point.
 const opponentFault=toNear&&fx.rally>=(practiceReturn&&!tutorial.active?5:3)&&Math.random()<(opponent.mistakes||0)*(.65+(1-(footing?.score??1))*.85+state.enemyDefense.stretch*.25);
 const endX=opponentFault?(Math.sign(aimX+error)||1)*(.86+Math.random()*.16):clamp(aimX+error+sideways,toNear?(chance?-.56:-.65):-.71-mistime*1.05,toNear?(chance?.56:.65):.71+mistime*1.05);
 const endZ=(entryReturn?1.08:practiceReturn?1.10:plan?plan.endZ:chance?1.16:toNear?(cut?.52+ease*.28:drive?1.12:.92):exposed?-1.02:cut?-.50:drive?-1.12:-.95)-(early?Math.pow(mistime,1.4)*.94:mistime*.17);
 const baseTime=finishing?.40:exposed?1.15:chance?1.22+state.enemyDefense.stretch*.06:kind==='edge'?.98:weak?.88:cut?.68:drive?.64:kind==='center'?.72:smash?(critical?.43:.50):(critical?.66:.76);
 const requestedPower=(special?1.22:1)*(1-mistime*.22)*(1-(response?.popup||0)*.10)*(footing?.power??1)*(toNear?opponent.power:growth().power*(smash?growth().smashPower:1)*(kind==='block'?growth().blockPower:1)),rawTime=exposed?1.15:chance?clamp(baseTime/requestedPower,1.18,1.36):cut?clamp(baseTime/Math.sqrt(requestedPower),.60,.82+ease*.30):baseTime/requestedPower*(plan?.timeScale||1),t=entryReturn?clamp(rawTime,.90,1.18):practiceReturn?Math.min(rawTime,chance?(tutorial.active?1.36:1.28):(tutorial.active?1.16:1.04)):rawTime,power=baseTime/t;
 ball.spin=chance||exposed?'lob':smash?'flat':cut?'cut':drive?'drive':'flat';ball.shotStyle=ball.spin;
 ball.rallyShot={hitter:!toNear,landed:false,bounces:0,timingRisk:mistime};
 // Slow entry returns must stay within normal racket height instead of turning into unmarked lobs.
 ball.gravity=entryReturn?3.8:5.8;ball.entryBounce=entryReturn;
 ball.vx=(endX-ball.x)/t;ball.vz=(endZ-ball.z)/t;ball.vy=(.79-ball.y+ball.gravity*.5*t*t)/t-(chance||exposed?0:response?.netDip||0);
 if(toNear)showIncoming(ball.spin);else if(exposed)showIncoming('lob',true);
 if(!toNear)beginDefense(kind);
 return{aimX,x:endX,z:endZ,error:endX-aimX,spread,power,flightTime:t,chance,style:ball.shotStyle,exposed,netDip:response?.netDip||0,timingRisk:mistime,bossPattern:plan?.label||null};
}

function point(player,reason=''){
 if(state.pointWait>0)return;
 if(tutorial.active&&!state.careerMatch){tutorial.retry();return;}
 if(state.careerMatch){const last=fx.lastContact,current=last&&last.time>=(state.rallyStarted??0);career.recordMatchEvent({type:'point',won:player,fault:!player&&ball.rallyShot?.hitter===true&&(reason==='out'||reason==='net')?reason:'miss',smashWinner:player&&ball.rallyShot?.hitter===true&&current&&last.player&&last.kind.includes('smash')});}
 state.lastPoint={winner:player?'player':'opponent',reason,time:state.elapsed};state.queuedSwing=null;state.playerStroke.transition=null;if(player)defenseMiss();state.score[player?0:1]++;$('score').textContent=state.score.join(' : ');state.pointWait=player?1.80:1.5;
 if(player&&state.careerMatch&&ball.finisher?.landed)career.recordTraining({finish:true});
 const revenge=player&&!!state.enemyMotion.revengePending&&!!fx.lastContact?.player&&fx.lastContact.kind.includes('smash')&&fx.lastContact.time>=(state.rallyStarted??0);
 state.enemyMotion.revengePending=false;pointExpressions(player);if(revenge)beginRivalRevenge();
 if(player){state.enemyMotion.taunt=null;beginCelebration(!!ball.finisher?.landed);}else beginRivalTaunt();
 if(player&&ball.finisher?.landed){finishPoint();if(revenge)presentRevenge();finishCareerPoint();return;}
 fx.contactClock=null;fx.contactVisible=true;fx.age=0;fx.point=null;fx.rays=[];fx.trail=[];fx.power=0;fx.flash=player?.09:.025;
 const label=$('impactLabel');label.className='impact-label point'+(player?' winner':'');label.querySelector('b').textContent=reason==='net'?'NET!':reason==='out'?'OUT!':player?tr('POINT!'):tr('OPPONENT POINT');label.querySelector('span').textContent=(reason==='net'?(player?tr('상대 네트 실수 · 나의 득점'):tr('네트에 걸렸어요 · 상대 득점')):reason==='out'?(player?tr('상대 타구 아웃 · 나의 득점'):tr('내 타구 아웃 · 상대 득점')):(player?tr('나의 득점'):'“'+state.enemyMotion.taunt.quip+'”'))+' · '+state.score.join(' : ');announceImpact(player?'point':'opponent');
 sound.play(player?'point':'concede',{gain:player?.92:.68,pan:0});
 message(reason==='net'?(player?tr('상대 공이 네트에 걸렸어요.'):fx.lastContact?.response?.mode==='underlift'?tr('네트 실수 · 자세를 잡고 하회전을 들어 올려보세요.'):tr('네트 실수 · 타이밍과 발 디딤을 조절해보세요.')):reason==='out'?(player?tr('상대 타구가 탁구대를 벗어났어요.'):tr('아웃! 스윙 타이밍을 조금 조절해보세요.')):player?tr('득점! 다음 공도 집중해봐요.'):tr('상대 득점. 공이 가까이 오면 스윙해보세요.'),tr('NEXT POINT'));
 if(revenge)presentRevenge();
 finishCareerPoint();
}

function finishPoint(){
 state.pointWait=2.15;fx.contactClock=null;fx.contactVisible=true;fx.age=0;fx.hold=1.45;fx.hitstop=.10;fx.slowFor=0;fx.shake=.038;fx.flash=.20;fx.power=1;
 fx.point=[clamp(ball.x,-.72,.72),.84,-1.18];fx.ring={r:[1,0,0],u:[0,0,1],n:[0,1,0]};
 fx.rays=Array.from({length:18},(_,i)=>({angle:i*Math.PI/9,length:.24+(i%3)*.035}));
 const label=$('impactLabel');label.className='impact-label critical smash finisher winner visible';label.querySelector('b').textContent=tr('SMASH WINNER!');
 label.querySelector('span').textContent=tr('결정타 성공 · ')+state.score.join(' : ');$('score').classList.remove('score-pop');void $('score').offsetWidth;$('score').classList.add('score-pop');
 announceImpact('winner');
 sound.play('winner',{gain:.95,pan:0});message(tr('결정타 성공! 상대가 손도 못 댔어요.'),'SMASH WINNER');
}

function update(dt){
 if(state.careerMatch&&!state.playing)return;
 processQueuedSwing();
 const priorPlayer=strikeRig(true),priorEnemy=strikeRig(false),priorCountdown=state.swing,priorEnemyCountdown=state.enemySwing;
 rememberRigMotion(priorPlayer);rememberRigMotion(priorEnemy);
 state.elapsed+=dt;updateExpressions(dt);
 const celebration=state.celebration;if(celebration.active){celebration.age+=dt;if(celebration.age>=celebration.duration)celebration.active=false;}
 const k=state.celebration.active?{}:state.keys,touch=state.celebration.active?null:state.touchMove;
 let dx=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0)+(touch?.x||0),dz=(k.KeyS||k.ArrowDown?1:0)-(k.KeyW||k.ArrowUp?1:0)+(touch?.z||0);
 if(practiceHelp()&&Math.hypot(dx,dz)<.08&&state.playing&&!state.serve&&state.pointWait<=0&&!state.celebration.active&&state.swing<=0&&ball.vz>.05){const eta=clamp((state.pz-.45-ball.z)/ball.vz,.06,1.4),pred=predictFlight(eta),targetX=clamp(pred.x-.08,-.72,.72),targetZ=ball.spin==='cut'?1.58:2.05;dx=clamp((targetX-state.px)*4,-.8,.8);dz=clamp((targetZ-state.pz)*4,-.65,.65);}
 const len=Math.max(1,Math.hypot(dx,dz)),blend=1-Math.exp(-13*dt);
 const phase=state.swing>0?1-state.swing:0,cp=state.playerStroke.contactPhase??.38;
 updateRallyRecovery(dt,dx,dz);
 const release=state.playerStroke.rallyRecovery?.release||0;
 const braking=(1-.80*release)*(state.swing>0?smooth(clamp((phase-(cp-.15))/.09,0,1))*(1-smooth(clamp((phase-(cp+.16))/.23,0,1))):0);
 const linkedBrake=(1-release)*(state.playerStroke.turnShot&&state.swing>0?smooth(clamp(phase/.10,0,1))*(1-smooth(clamp((phase-(cp+.13))/.20,0,1))):0);
 const approachBrace=(1-release)*(state.playerStroke.approachStrike&&state.swing>0?smooth(clamp((phase-.08)/.12,0,1))*(1-smooth(clamp((phase-.60)/.35,0,1))):0);
 // A manually directed chase must reach its plant before the swing brakes the body.
 const chaseEta=ball.vz>.05?clamp((state.pz-.45-ball.z)/ball.vz,0,.65):0,chaseGap=ball.x+ball.vx*chaseEta-state.px;
 const chasing=state.playing&&!state.hit&&!state.playerStroke.smash&&ball.vz>.05&&dx*chaseGap>.025&&Math.abs(chaseGap)>.24,brakeWeight=chasing?.22:1;
 const turn=updateDirectionChange(dt,dx),runSpeed=1.45*growth().speed*(1-.80*braking*brakeWeight)*(1-.55*linkedBrake*brakeWeight),moveBlend=1-Math.exp(-(braking>.1?24:13)*growth().recovery*dt);
 const lateralTarget=turn.phase==='brake'?0:dx/len*runSpeed,lateralBlend=1-Math.exp(-(turn.phase==='brake'?27:turn.phase==='push'?15:braking>.1?24:13)*growth().recovery*dt);
 const recovery=state.playerStroke.rallyRecovery,retreatPush=recovery?.mode==='retreat'&&recovery.phase==='push';
 const depthBraking=recovery?.mode==='retreat'&&recovery.phase==='brake';
 const retreatBlend=depthBraking?1-Math.exp(-dt*30):retreatPush?1-Math.exp(-dt*10):moveBlend,retreatPace=retreatPush?mix(.28,.78,smooth(clamp(recovery.phaseAge/.18,0,1))):1;
 const entryX=retreatPush?recovery.direction:dx/len,entryZ=retreatPush?recovery.retreatZ:dz/len;
 const entryLength=Math.max(1,Math.hypot(entryX,entryZ));
 const entryTargetX=retreatPush?entryX/entryLength*runSpeed*retreatPace:lateralTarget;
 state.velocity[0]=mix(state.velocity[0],depthBraking?0:entryTargetX,depthBraking?retreatBlend:retreatPush?retreatBlend:lateralBlend);
 state.velocity[1]=mix(state.velocity[1],(depthBraking?0:entryZ/entryLength*runSpeed*(1-.90*approachBrace)*retreatPace),!depthBraking&&approachBrace>.1?1-Math.exp(-28*dt):retreatBlend);
 state.px=clamp(state.px+state.velocity[0]*dt,-1.1,1.1);state.pz=clamp(state.pz+state.velocity[1]*dt,1.48,3);
 const playerSpeed=Math.hypot(...state.velocity),pm=state.playerMotion;
 const approaching=ball.smashChance&&ball.vz>0&&!state.celebration.active?clamp(-state.velocity[1]/1.45,0,1):0;
 pm.approachLoad=mix(pm.approachLoad||0,approaching,1-Math.exp(-dt*10));
 if(approaching>.14){pm.lastAdvanceAt=state.elapsed;pm.lastAdvanceSpeed=-state.velocity[1];}
 if(state.velocity[1]<-.12)pm.lastForwardAt=state.elapsed;
 pm.blend=mix(pm.blend,Math.min(1,playerSpeed/1.45),1-Math.exp(-9*dt));pm.phase+=playerSpeed*dt*12;pm.forward=mix(pm.forward||0,-state.velocity[1]/1.45,blend);pm.lateral=mix(pm.lateral,state.velocity[0]/1.45,blend);
 const oldEnemy=state.enemyX,oldEnemyZ=state.enemyZ;updateDefense(dt);
 const enemyVelocity=(state.enemyX-oldEnemy)/Math.max(.001,dt),em=state.enemyMotion;
 em.forwardVelocity=(state.enemyZ-oldEnemyZ)/Math.max(.001,dt);
 em.blend=mix(em.blend,Math.min(1,Math.abs(enemyVelocity)/1.1),blend);em.phase+=Math.abs(enemyVelocity)*dt*12;em.lateral=mix(em.lateral,-enemyVelocity/1.45,blend);
 for(const player of [true,false]){
  const m=player?state.playerMotion:state.enemyMotion,bx=player?state.px:state.enemyX,bz=player?state.pz:state.enemyZ,facing=player?-1:1;
  const dz=facing*(ball.z-bz),dx=-facing*(ball.x-bx),distance=Math.max(.20,Math.hypot(dx,dz));
  const yaw=state.playing?clamp(Math.atan2(dx,Math.max(.12,dz)),-.58,.58):0,pitch=state.playing?clamp(Math.atan2(1.48-ball.y,distance)*.40,-.16,.20):.02;
  m.lookYaw=mix(m.lookYaw||0,yaw,1-Math.exp(-9*dt));m.lookPitch=mix(m.lookPitch||0,pitch,1-Math.exp(-8*dt));
 }
 if(state.swing>0)state.swing=Math.max(0,state.swing-dt/(state.playerStroke.duration||strokeDuration));
 if(state.enemySwing>0)state.enemySwing=Math.max(0,state.enemySwing-dt/(state.enemyStroke.duration||strokeDuration));
 updateReceiver(state.playerStroke,state.px,state.pz,-1,state.swing,dt);
 updateReceiver(state.enemyStroke,state.enemyX,state.enemyZ,1,state.enemySwing,dt);
 // Keep both players' racket targets aligned with their moving bodies, within normal arm reach.
 // Preserve the original timing grade and the intentional finisher miss reaction.
 if(state.playing&&!state.serve&&state.pointWait<=0)for(const player of [true,false]){
  const count=player?state.swing:state.enemySwing,hit=player?state.hit:state.enemyHit,inbound=player?ball.vz>.05:ball.vz<-.05;
  if(count<=0||hit||!inbound||!player&&ball.finisher)continue;
  const rec=player?state.playerStroke:state.enemyStroke,phase=1-count,cp=rec.contactPhase??.38;
  if(phase<cp-.015)aimStroke(player,Math.max(.015,(cp-phase)*(rec.duration||strokeDuration)+dt),dt);
 }
 for(const player of [true,false]){
  const rec=player?state.playerStroke:state.enemyStroke,z=player?state.pz:state.enemyZ,facing=player?-1:1;
  const inbound=state.playing&&state.pointWait<=0&&ball.vz*facing<-.05,eta=inbound?(z+facing*.45-ball.z)/ball.vz:Infinity;
  const ready=inbound&&eta>-.06&&eta<.85?1-smooth(clamp((eta-.30)/.55,0,1)):0;
  rec.ready=mix(rec.ready||0,ready,1-Math.exp(-dt*(ready>0?10:7)));
  if(rec.transition&&state.elapsed-rec.transition.started>=rec.transition.duration)rec.transition=null;
  if(player&&state.swing<=0){rec.turnShot=null;rec.approachStrike=null;rec.advanceShot=null;}
 }
 updateGroundFeet(true,dt,state.velocity[0],state.velocity[1]);
 updateGroundFeet(false,dt,enemyVelocity,(state.enemyZ-oldEnemyZ)/Math.max(.001,dt));
 for(const player of [true,false]){
  const rec=player?state.playerStroke:state.enemyStroke,c=player?state.swing:state.enemySwing;
  if(c>0&&!rec.defense&&!rec.planted&&(1-c)>(rec.contactPhase??.38)-.045)rec.planted=true;
  if(c>0&&(1-c)>(rec.smash?.14:.24)&&!rec.whoosh){rec.whoosh=true;playAt(rec.smash?'powerSwing':'swing',strikeRig(player).center,player?1:.65);}
  if(player&&rec.smash&&c>0&&(1-c)>.22&&(1-c)<.68){
   const p=strikeRig(true).center,last=fx.swingTrail[fx.swingTrail.length-1];if(!last||Math.hypot(...sub(p,last.p))>.022)fx.swingTrail.push({p:[...p],age:0});
  }
 }
 if(state.playing&&state.pointWait<=0&&state.serve){updateServe(dt);return;}
 if(!state.playing&&state.serve)return;
 if(!state.playing){ball.x=state.px+.15;ball.y=1.04;ball.z=state.pz-.37;return;}
 if(state.pointWait>0){state.pointWait-=dt;if(state.pointWait<=0){
 if(state.matchFinished){state.matchFinished=false;state.careerMatch=false;state.playing=false;$('play').textContent=tr('자유 연습 시작');career.showMap();}
 else feed();
}return;}
 const previous=[ball.x,ball.y,ball.z],oldY=ball.y,oldZ=ball.z;
 ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.z+=ball.vz*dt;ball.vy-=(ball.gravity||5.8)*dt;
 if(oldY>=.79&&ball.y<.79&&ball.vy<0){
  const fraction=clamp((oldY-.79)/Math.max(.000001,oldY-ball.y),0,1),crossX=mix(previous[0],ball.x,fraction),crossZ=mix(oldZ,ball.z,fraction);
  // Include the ball radius so a table-edge contact remains in.
  const onTable=Math.abs(crossX)<=.7625+BALL_RADIUS&&Math.abs(crossZ)<=1.37+BALL_RADIUS,shot=ball.rallyShot;
  if(shot&&shot.serveBounce===0){
   const ownHalf=shot.hitter?crossZ>0:crossZ<0;
   if(!onTable||!ownHalf){point(!shot.hitter,'out');return;}
   shot.serveBounce=1;ball.y=.79;const t=shot.serveStyle==='deep'?.58:.70;ball.vx=(shot.receiveX-ball.x)/t;ball.vz=(shot.receiveZ-ball.z)/t;ball.vy=2.9*t;playAt('bounce',[crossX,.77,crossZ],.72);if(shot.hitter)beginDefense('serve');return;
  }
  if(shot&&!shot.landed){
   const receiverHalf=shot.hitter?crossZ<0:crossZ>0;
   if(!onTable||!receiverHalf){point(!shot.hitter,'out');return;}
   shot.landed=true;shot.bounces=1;if(shot.serveBounce===1&&shot.hitter)tutorial.served();if(state.careerMatch&&shot.serveBounce===1)career.recordMatchEvent({type:'serve',player:shot.hitter,length:shot.serveStyle});
  }else if(shot?.landed&&onTable){shot.bounces++;point(shot.hitter);return;}
  if(onTable){ball.y=.79;const cut=ball.spin==='cut',drive=ball.spin==='drive';ball.vy=-ball.vy*(ball.entryBounce?.65:cut?.78:drive?.72:.88);ball.vx*=cut?.78:drive?1.10:1;ball.vz*=cut?.78:drive?1.13:1;if(ball.smashChance&&ball.z>0)ball.chanceBounced=true;if(ball.finisher&&ball.z<0)ball.finisher.landed=true;playAt('bounce',[crossX,.77,crossZ],.78);}
 }
 if(oldZ*ball.z<0&&Math.abs(ball.x)<.805&&ball.y>.75&&ball.y<.948){if(ball.rallyShot?.serveBounce===1){prepareServe();message(tr('네트에 닿은 서브 · 다시 서브하세요.'),'LET');return;}const near=ball.vz>0;playAt('net',[ball.x,ball.y,0],.9);point(near,'net');return;}
 if(ball.vz<0&&!state.enemyPrepared){
  const d=state.enemyDefense,eta=(ball.z-(state.enemyZ+.45))/Math.abs(ball.vz);
  if(eta<.36&&!d.smash&&!['read','brake'].includes(d.phase)){
   const late=Math.abs(d.targetX-state.enemyX)>.22||Math.abs(d.vx)>1.15||(d.scramble||0)>.48;
   state.enemyStroke.defense=late;
  }
  const defending=state.enemyStroke.defense,canSmash=(opponentLevel().boss?.id==='striker'||ball.opponentChance)&&!defending&&!ball.finisher&&Math.abs(ball.x+ball.vx*Math.max(0,eta)-state.enemyX)<.34&&eta<.46&&d.targetY>1.22-(opponentLevel().boss?.rank||0)*.025;
  if(canSmash&&eta<.46){state.enemyAI=state.enemyAI||{shots:0,lastCorner:0,lastSmash:-100};if(!state.enemyAI.telegraph){state.enemyAI.telegraph=true;const status=$('enemyReturnStatus');status.textContent=tr('상대가 높은 공을 노립니다 · 스매시 준비!');if(opponentLevel().boss)$('bossTactic').textContent=opponentLevel().boss.name+' · '+tr('높은 공 포착 · 스매시 준비!');}}
  if(eta<(ball.finisher?.10:canSmash?.235:defending?.24:.32)&&eta>-.08&&!['read','brake'].includes(state.enemyDefense.phase)){
   const previousEnemy=strikeRig(false);state.enemyStroke.transition={started:state.elapsed,duration:.095,pose:JSON.parse(JSON.stringify(previousEnemy.pose)),hand:[...previousEnemy.localHand],velocity:{...state.enemyStroke.poseVelocity},handVelocity:[...(state.enemyStroke.handVelocity||[0,0,0])]};
   state.enemyPrepared=true;state.enemyStroke.locked=null;lockStroke(state.enemyStroke,state.enemyX,state.enemyZ,1);state.enemyStroke.smash=canSmash;state.enemyStroke.shotStyle=canSmash||defending?'flat':chooseEnemyStyle();state.enemyStroke.duration=canSmash?.72:defending?.48:state.enemyStroke.shotStyle==='cut'?.78:strokeDuration;state.enemyStroke.contactPhase=canSmash?.31:defending?.42:.38;
   // Match the stroke's contact phase to arrival instead of using a fixed windup.
   if(!ball.finisher)state.enemyStroke.duration=clamp(Math.max(.07,eta-.025)/state.enemyStroke.contactPhase,.26,.92);
   state.enemyStroke.whoosh=false;state.enemyStroke.planted=false;state.enemyStroke.aim=[0,0,0];state.enemySwing=1;state.enemyHit=false;if(defending)defensePhase("block");if(!ball.finisher)aimStroke(false);else{state.enemyStroke.aimBodyX=state.enemyX;state.enemyStroke.aimBodyZ=state.enemyZ;}
  }
 }
 const current=[ball.x,ball.y,ball.z];
 if(ball.vz>0&&!state.hit&&(!state.careerMatch||priorCountdown>0||state.swing>0)&&(!ball.rallyShot||ball.rallyShot.landed)){const contact=sweptFace(previous,current,priorPlayer,strikeRig(true));if(contact){impact(true,contact,priorCountdown,state.swing);return;}}
 if(ball.vz<0&&!ball.finisher&&!state.enemyHit&&state.enemySwing>0&&(!ball.rallyShot||ball.rallyShot.landed)){const contact=sweptFace(previous,current,priorEnemy,strikeRig(false));if(contact){impact(false,contact,priorEnemyCountdown,state.enemySwing);return;}}
 if(fx.power&&fx.age<.8){const last=fx.trail[fx.trail.length-1];if(!last||Math.hypot(...sub(current,last.p))>.025)fx.trail.push({p:current,age:0});}
 if(ball.vz<0&&!state.enemyHit&&ball.z<state.enemyZ+(ball.finisher?.10:-.18)){
  defenseMiss();if(ball.finisher?.landed&&ball.finisher.missAt===null)ball.finisher.missAt=state.elapsed;
 }
 if(ball.finisher?.landed&&ball.finisher.missAt!==null&&state.elapsed-ball.finisher.missAt>.16){point(true);return;}
 if(ball.y<.06||Math.abs(ball.z)>3.5||Math.abs(ball.x)>2.4){const shot=ball.rallyShot;point(shot?(shot.landed?shot.hitter:!shot.hitter):ball.vz<0,shot&&!shot.landed?'out':'');}
}
function advance(realDt){
 const frozen=Math.min(realDt,fx.hitstop);updateFX(realDt);
 const movable=realDt-frozen;if(movable<=0)return;
 const simulationDt=movable*(fx.slowFor>0?.45:1),steps=Math.ceil(simulationDt/(1/240)),h=simulationDt/steps;
 for(let i=0;i<steps;i++){update(h);if(fx.hitstop>0)break;}
}

let dragging=false,pointerX=0,pointerY=0,travel=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;pointerX=e.clientX;pointerY=e.clientY;travel=0;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-pointerX,dy=e.clientY-pointerY;travel+=Math.abs(dx)+Math.abs(dy);pointerX=e.clientX;pointerY=e.clientY;state.yaw-=dx*.006;state.pitch=clamp(state.pitch+dy*.004,state.view==='pov'?-.1:state.view==='follow'?.54:.12,state.view==='pov'?.8:1.43)});
canvas.addEventListener('pointerup',()=>{dragging=false;if(travel<5)swing()});canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(state.view==='pov')state.povFov=clamp(state.povFov+e.deltaY*.02,36,72);else state.distance=clamp(state.distance+e.deltaY*.003,state.view==='follow'?4.7:2.8,state.view==='follow'?7.6:5.5)},{passive:false});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
 document.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>setCourse(b.dataset.course));
 document.querySelectorAll('[data-stroke]').forEach(b=>b.onclick=()=>setStrokeStyle(b.dataset.stroke));
 document.querySelectorAll('[data-serve]').forEach(b=>b.onclick=()=>setServeLength(b.dataset.serve));
document.querySelectorAll('[data-hold]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();state.keys[b.dataset.hold]=true;b.setPointerCapture(e.pointerId)};b.onpointerup=b.onpointercancel=()=>state.keys[b.dataset.hold]=false;});
const fullscreenButton=document.createElement('button');fullscreenButton.type='button';fullscreenButton.id='courtFullscreen';fullscreenButton.hidden=!document.fullscreenEnabled;fullscreenButton.setAttribute('aria-pressed','false');
const fullscreenHint=document.createElement('p');fullscreenHint.id='fullscreenHint';fullscreenHint.className='fullscreen-hint';fullscreenHint.textContent=tr('전체화면으로 플레이하면 더 실감나요! 전체화면을 눌러 시작해보세요.');document.querySelector('.toolbar').append(fullscreenHint);fullscreenButton.setAttribute('aria-describedby','fullscreenHint');
function updateFullscreenButton(){const active=!!document.fullscreenElement;fullscreenButton.textContent=tr(active?'전체화면 해제':'전체화면');fullscreenButton.setAttribute('aria-pressed',String(active));fullscreenHint.hidden=active||!document.fullscreenEnabled;}
fullscreenButton.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message(tr('전체화면을 열지 못했습니다. 브라우저의 전체화면 기능을 이용해주세요.'));}};
function positionFullscreenButton(){
 const nav=document.querySelector('.career-nav'),touch=document.documentElement.dataset.input==='touch';
 if(touch&&nav)nav.insertBefore(fullscreenButton,$('lastMatchReview'));
 else document.querySelector('.camera-group').append(fullscreenButton);
}
document.querySelector('.camera-group').append(fullscreenButton);document.addEventListener('fullscreenchange',updateFullscreenButton);updateFullscreenButton();
$('play').onclick=start;$('swing').onclick=()=>swing(false);$('mobileSwing').onclick=()=>swing(false);$('smash').onclick=$('mobileSmash').onclick=()=>swing(true);$('reset').onclick=()=>setView(state.view);
const touchBallMarker=document.createElement('span');touchBallMarker.className='touch-ball-marker';touchBallMarker.hidden=true;touchBallMarker.setAttribute('aria-hidden','true');touchBallMarker.innerHTML='<i></i>';$('stage').append(touchBallMarker);
let ballAssist=true,previousBallScreen=null;try{ballAssist=localStorage.getItem('ttk-touch-ball-guide')!=='off';}catch{}
const ballGuideOption=document.createElement('label');ballGuideOption.className='ball-guide-option';const ballGuideCheckbox=document.createElement('input');ballGuideCheckbox.type='checkbox';ballGuideCheckbox.checked=ballAssist;ballGuideOption.append(ballGuideCheckbox,document.createTextNode(tr('공 위치 강조')));document.querySelector('.court-settings-panel').prepend(ballGuideOption);ballGuideCheckbox.onchange=()=>{ballAssist=ballGuideCheckbox.checked;try{localStorage.setItem('ttk-touch-ball-guide',ballAssist?'on':'off');}catch{}};
function updateTouchBallGuide(vp){
 if((document.documentElement.dataset.input!=='touch'&&state.view!=='follow')||!ballAssist||!state.playing||state.pointWait>0||state.celebration.active){touchBallMarker.hidden=true;previousBallScreen=null;return;}
 const clipW=vp[3]*ball.x+vp[7]*ball.y+vp[11]*ball.z+vp[15],px=vp[0]*ball.x+vp[4]*ball.y+vp[8]*ball.z+vp[12],py=vp[1]*ball.x+vp[5]*ball.y+vp[9]*ball.z+vp[13];
 if(clipW<=.05||Math.abs(px/clipW)>1||Math.abs(py/clipW)>1){touchBallMarker.hidden=true;previousBallScreen=null;return;}
 const x=(px/clipW*.5+.5)*canvas.clientWidth,y=(.5-py/clipW*.5)*canvas.clientHeight,dx=(previousBallScreen?.x??x)-x,dy=(previousBallScreen?.y??y)-y;
 touchBallMarker.hidden=false;touchBallMarker.style.transform='translate3d('+(x-5)+'px,'+(y-5)+'px,0)';touchBallMarker.style.setProperty('--tail-length',Math.min(20,Math.hypot(dx,dy)*1.2)+'px');touchBallMarker.style.setProperty('--tail-angle',Math.atan2(dy,dx)+'rad');touchBallMarker.dataset.chance=String(!!ball.smashChance);previousBallScreen={x,y};
}
const touchMedia=matchMedia('(pointer: coarse)'),desktopPointerMedia=matchMedia('(any-hover: hover) and (any-pointer: fine)');
// Touch capability alone also describes laptops with touch screens.
function detectTouch(){document.documentElement.dataset.input=touchMedia.matches&&!desktopPointerMedia.matches?'touch':'keyboard';positionFullscreenButton();}
detectTouch();touchMedia.addEventListener('change',detectTouch);desktopPointerMedia.addEventListener('change',detectTouch);
const stick=$('touchStick'),knob=$('touchStickKnob');let stickPointer=null;
let stickOrigin=null,stickSensitivity=100,stickAxis=null,stickFreeMove=false,stickCandidate=null,stickAxisTimer=null,stickLastPoint=null;
try{const saved=Number(localStorage.getItem('ttk-stick-sensitivity'));if(saved>=70&&saved<=140)stickSensitivity=saved;}catch{}
try{stickFreeMove=localStorage.getItem('ttk-stick-free-move')==='on';}catch{}
const moveZone=document.createElement('div');moveZone.className='touch-move-zone';moveZone.setAttribute('aria-label',tr('왼쪽 영역 어디서나 드래그해서 이동'));stick.before(moveZone);moveZone.append(stick);
const moveHint=document.createElement('small');moveHint.className='touch-zone-hint';moveHint.textContent=tr('드래그해서 이동');moveZone.append(moveHint);
const freeMoveOption=document.createElement('label');freeMoveOption.className='ball-guide-option touch-only-option';const freeMoveInput=document.createElement('input');freeMoveInput.type='checkbox';freeMoveInput.checked=stickFreeMove;freeMoveOption.append(freeMoveInput,document.createTextNode(tr('방향 보정 없이 이동')));ballGuideOption.after(freeMoveOption);
const axisHelp=document.createElement('p');axisHelp.className='touch-axis-help';axisHelp.textContent=tr('좌우 이동의 작은 흔들림은 보정하고, 확실히 비스듬하게 밀면 대각선으로 이동합니다.');freeMoveOption.after(axisHelp);
freeMoveInput.onchange=()=>{stickFreeMove=freeMoveInput.checked;releaseTouch();try{localStorage.setItem('ttk-stick-free-move',stickFreeMove?'on':'off');}catch{}};
const sensitivityOption=document.createElement('label');sensitivityOption.className='touch-sensitivity';const sensitivityName=document.createElement('span');sensitivityName.textContent=tr('조이스틱 감도');const sensitivityInput=document.createElement('input');sensitivityInput.type='range';sensitivityInput.min='70';sensitivityInput.max='140';sensitivityInput.step='10';sensitivityInput.value=String(stickSensitivity);const sensitivityValue=document.createElement('output');sensitivityValue.textContent=stickSensitivity+'%';sensitivityOption.append(sensitivityName,sensitivityInput,sensitivityValue);ballGuideOption.after(sensitivityOption);
sensitivityInput.oninput=()=>{stickSensitivity=Number(sensitivityInput.value);sensitivityValue.textContent=stickSensitivity+'%';try{localStorage.setItem('ttk-stick-sensitivity',String(stickSensitivity));}catch{}};
const touchDeck=document.querySelector('.touch-deck'),courtControls=document.querySelector('.court-controls');
function positionTouchDeck(){
 const overlay=document.documentElement.dataset.input==='touch'&&innerWidth<=850&&innerHeight>innerWidth;
 const parent=overlay?$('stage'):courtControls;
 if(touchDeck.parentElement!==parent){releaseTouch();parent.append(touchDeck);}
 $('stage').dataset.touchOverlay=String(overlay);
}
positionTouchDeck();addEventListener('resize',positionTouchDeck);touchMedia.addEventListener('change',positionTouchDeck);desktopPointerMedia.addEventListener('change',positionTouchDeck);
function releaseTouch(){clearTimeout(stickAxisTimer);stickAxisTimer=null;stickCandidate=null;stickLastPoint=null;stickPointer=null;stickOrigin=null;stickAxis=null;delete moveZone.dataset.axis;moveHint.textContent=tr('드래그해서 이동');state.touchMove={x:0,z:0};knob.style.transform='translate(-50%,-50%)';stick.style.left='50%';stick.style.top='50%';stick.classList.remove('active');moveZone.classList.remove('active');document.querySelectorAll('.touch-hit-buttons button').forEach(b=>b.classList.remove('pressed'));}
function moveStick(e){
 if(e.pointerId!==stickPointer||!stickOrigin)return;
 stickLastPoint={x:e.clientX,y:e.clientY};
 const rawX=e.clientX-stickOrigin.x,rawZ=e.clientY-stickOrigin.y;
 // Broad cardinal sectors absorb thumb wobble. A clear diagonal remains
 // available by default; hysteresis avoids switching during a reversal.
 if(!stickFreeMove){
  const x=Math.abs(rawX),z=Math.abs(rawZ);
  let desired=null;
  if(!stickAxis){if(x>=6&&z<=x*.8)desired='x';else if(z>=16&&z>x*1.8)desired='z';else if(x>=16&&z>=16)desired='diagonal';}
  else if(x>=(stickAxis==='z'?18:6)&&z<=x*.55)desired='x';
  else if(z>=(stickAxis==='x'?28:16)&&z>=x*2)desired='z';
  else if(x>=16&&z>=16&&z>=x*.8&&z<=x*1.25)desired='diagonal';
  if(!stickAxis&&desired)stickAxis=desired;
  if(desired&&desired!==stickAxis){
   if(stickCandidate!==desired){
    clearTimeout(stickAxisTimer);stickCandidate=desired;const owner=stickPointer,origin=stickOrigin;
    stickAxisTimer=setTimeout(()=>{if(stickPointer!==owner||stickOrigin!==origin||stickCandidate!==desired||!stickLastPoint)return;stickAxis=desired;stickCandidate=null;stickAxisTimer=null;moveStick({pointerId:owner,clientX:stickLastPoint.x,clientY:stickLastPoint.y});},90);
   }
  }else{clearTimeout(stickAxisTimer);stickAxisTimer=null;stickCandidate=null;}
  if(stickAxis){moveZone.dataset.axis=stickAxis;moveHint.textContent=tr(stickAxis==='x'?'좌우 이동':stickAxis==='z'?'앞뒤 이동':'대각선 이동');}
 }
 const diagonal=stickFreeMove||stickAxis==='diagonal',dx=diagonal||stickAxis==='x'?rawX:0,dz=diagonal||stickAxis==='z'?rawZ:0,length=Math.hypot(dx,dz),radius=42*100/stickSensitivity,magnitude=Math.min(1,length/radius),visualRadius=stick.clientWidth*.34,visualScale=Math.min(1,visualRadius/Math.max(length,.001));
 knob.style.transform='translate(calc(-50% + '+dx*visualScale+'px),calc(-50% + '+dz*visualScale+'px))';
 const strength=magnitude<.10?0:Math.pow((magnitude-.10)/.90,.85);
 state.touchMove={x:length?dx/length*strength:0,z:length?dz/length*strength:0};
}
moveZone.onpointerdown=e=>{
 if(stickPointer!==null||career.isMap()||document.querySelector('dialog[open]'))return;
 e.preventDefault();sound.unlock();stickPointer=e.pointerId;stickAxis=null;stickOrigin={x:e.clientX,y:e.clientY};const r=moveZone.getBoundingClientRect(),edge=stick.clientWidth*.38;
 stick.style.left=clamp(e.clientX-r.left,edge,r.width-edge)+'px';stick.style.top=clamp(e.clientY-r.top,edge,r.height-edge)+'px';
 moveZone.setPointerCapture(e.pointerId);stick.classList.add('active');moveZone.classList.add('active');moveStick(e);
};
moveZone.onpointermove=e=>{if(e.pointerId===stickPointer){e.preventDefault();moveStick(e);}};
moveZone.onpointerup=moveZone.onpointercancel=moveZone.onlostpointercapture=e=>{if(e.pointerId===stickPointer)releaseTouch();};
for(const [id,power] of [['mobileSwing',false],['mobileSmash',true]]){const button=$(id);button.onpointerdown=e=>{e.preventDefault();if(document.querySelector('dialog[open]')||career.isMap())return;button.setPointerCapture(e.pointerId);button.classList.add('pressed');swing(power);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>button.classList.remove('pressed');button.onclick=e=>{if(e.detail===0)swing(power);};}
addEventListener('blur',releaseTouch);addEventListener('resize',releaseTouch);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseTouch();});
addEventListener('keydown',e=>{if(career.isMap()||document.querySelector('dialog[open]'))return;if(e.target instanceof Element&&e.target.closest('input,select,textarea'))return;state.keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(e.code==='Space')swing(false);if(e.code==='KeyE')swing(true);}if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&['KeyJ','KeyK','KeyL'].includes(e.code))setCourse({KeyJ:-1,KeyK:0,KeyL:1}[e.code]);if(!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(e.code==='KeyF')useSpecial();if(e.code==='KeyZ')setStrokeStyle('drive');if(e.code==='KeyX')setStrokeStyle('cut');if(e.code==='KeyC')setServeLength('short');if(e.code==='KeyV')setServeLength('deep');}const views=['pov','follow','side','top'];if(/^Digit[1-4]$/.test(e.code))setView(views[Number(e.code.slice(-1))-1]);});
addEventListener('keyup',e=>state.keys[e.code]=false);addEventListener('blur',()=>{state.queuedSwing=null;state.keys={};dragging=false;});

function syncAudioUI(){
 $('soundToggle').textContent=sound.muted?tr('소리 꺼짐'):tr('소리 켜짐');
 $('soundToggle').setAttribute('aria-pressed',String(!sound.muted));
 $('volume').value=String(Math.round(sound.volume*100));$('volumeValue').textContent=Math.round(sound.volume*100)+'%';
}
$('soundToggle').onclick=()=>{sound.unlock();sound.setMuted(!sound.muted);syncAudioUI();};
$('volume').oninput=e=>{sound.unlock();sound.setVolume(Number(e.target.value)/100);syncAudioUI();};
const audioPreviewTimers=[];
function stopSoundPreview(){for(const timer of audioPreviewTimers)clearTimeout(timer);audioPreviewTimers.length=0;$('soundPreview').disabled=false;}
document.querySelectorAll('[data-sound]').forEach(button=>button.onclick=async()=>{
 stopSoundPreview();await sound.unlock();sound.play(button.dataset.sound,{gain:.92,pan:0});$('soundStatus').textContent=button.dataset.soundLabel;
});
$('soundPreview').onclick=async()=>{
 stopSoundPreview();await sound.unlock();$('soundPreview').disabled=true;
 const demo=[['center',tr('중앙 정타 · 단단한 타격음'),0],['edge',tr('끝 빗맞음 · 얇고 거친 소리'),.45],['hit',tr('일반 타구'),.85],['smash',tr('스매시 · 묵직한 파열음'),1.30],['critical',tr('크리티컬 · 선명한 정타음'),2.00],['criticalSmash',tr('크리티컬 스매시 · 충격 + 정타'),2.80],['point',tr('득점 · 상승 멜로디'),3.65],['winner',tr('결정타 득점 · 승리 팡파르'),4.65]];
 for(const [kind,label,delay] of demo)audioPreviewTimers.push(setTimeout(()=>{sound.play(kind,{gain:.92,pan:0});$('soundStatus').textContent=label;},delay*1000));
 audioPreviewTimers.push(setTimeout(()=>{$('soundPreview').disabled=false;$('soundStatus').textContent=tr('스매시 · 크리티컬 · 득점');audioPreviewTimers.length=0;},5800));
};
$('highFeed').onclick=()=>{if(state.careerMatch||tutorial.active)return;state.highFeed=!state.highFeed;$('highFeed').setAttribute('aria-pressed',String(state.highFeed));$('highFeed').textContent=state.highFeed?tr('높은 공 연습 중'):tr('높은 공 연습');if(state.playing)feed();else message(state.highFeed?tr('높은 공 연습을 켰어요. 랠리를 시작해보세요.'):tr('일반 랠리 연습으로 돌아왔어요.'));};
addEventListener('pointerdown',()=>sound.unlock(),{once:true});
addEventListener('keydown',()=>sound.unlock(),{once:true});
syncAudioUI();
for(const [id,parent] of [['specialShot',document.querySelector('.toolbar .actions')],['mobileSpecial',document.querySelector('.touch-hit-buttons')]]){const button=document.createElement('button');button.type='button';button.id=id;button.className='special-shot';button.title=tr('라이징 스매시 · 직접 리턴으로 충전 · 높은 공에 사용 · 헛스윙하면 소모');button.setAttribute('aria-label',button.title);button.disabled=true;button.onclick=useSpecial;if(id==='mobileSpecial'){button.onpointerdown=e=>{e.preventDefault();useSpecial();};button.onclick=e=>{if(e.detail===0)useSpecial();};}parent.append(button);specialButtons.push(button);}updateSpecialUI();
const assistLabel=document.createElement('label'),assistInput=document.createElement('input');assistLabel.className='practice-assist-option';assistLabel.title=tr('연습에서만 이동과 타이밍을 도와줍니다.');assistInput.type='checkbox';assistInput.id='practiceAssist';assistInput.checked=practiceAssist;assistLabel.append(assistInput,document.createTextNode(tr('입문 보조 · 공 따라가기와 타이밍 보정')));document.querySelector('.court-settings-panel').prepend(assistLabel);assistInput.onchange=()=>{practiceAssist=assistInput.checked;state.queuedSwing=null;try{localStorage.setItem('ttk-practice-assist-v1',practiceAssist?'on':'off');}catch{}};

let followPlayerOpacity=1;
let swingHintReady=false,smashHintReady=false;
function updatePracticeSwingHint(){
 updateSpecialUI();
 const assistDisabled=!!state.careerMatch||tutorial.active,assistChecked=!state.careerMatch&&(practiceAssist||tutorial.active);if(assistInput.disabled!==assistDisabled)assistInput.disabled=assistDisabled;if(assistInput.checked!==assistChecked)assistInput.checked=assistChecked;
 const eta=ball.vz>.1?(state.pz-.45-ball.z)/ball.vz:Infinity;
 const careerHint=state.careerMatch&&(opponentLevel().learningRelief||0)>0,powerLesson=tutorial.active&&tutorial.step===3,available=(!state.careerMatch||careerHint)&&state.playing&&state.pointWait<=0&&state.swing<=0&&!state.queuedSwing&&!state.celebration.active;
 const smashChance=careerHint&&!!ball.smashChance,powerReady=available&&(powerLesson||smashChance)&&!state.serve&&!state.hit&&eta>.18&&eta<.65&&ball.y>1.0;
 const ready=available&&!powerLesson&&!smashChance&&(state.serve?.player&&state.serve.phase==='ready'||!state.serve&&!state.hit&&eta>(careerHint?.10:.08)&&eta<(careerHint?.84:1.05));
 if(ready!==swingHintReady){swingHintReady=ready;for(const id of ['swing','mobileSwing'])$(id).classList.toggle('timing-ready',ready);}
 if(powerReady!==smashHintReady){smashHintReady=powerReady;for(const id of ['smash','mobileSmash'])$(id).classList.toggle('timing-ready',powerReady);}
}
function updateFollowPlayerOpacity(vp,dt){
 let goal=1;
 if(state.view==='follow'&&state.playing&&!state.serve&&state.pointWait<=0&&ball.y>.5){
  const project=(x,y,z)=>{const w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];return{x:(.5+(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w*.5)*canvas.clientWidth,y:(.5-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w*.5)*canvas.clientHeight,w};};
  const b=project(ball.x,ball.y,ball.z),head=project(state.px,1.98,state.pz),hip=project(state.px,.52,state.pz),left=project(state.px-.48,1.2,state.pz),right=project(state.px+.48,1.2,state.pz);
  if(b.w>.05&&b.w>Math.min(head.w,hip.w)-.35&&b.x>Math.min(left.x,right.x)-12&&b.x<Math.max(left.x,right.x)+12&&b.y>Math.min(head.y,hip.y)-10&&b.y<Math.max(head.y,hip.y)+10)goal=.30;
 }
 followPlayerOpacity=state.view==='follow'?mix(followPlayerOpacity,goal,1-Math.exp(-dt*(goal<followPlayerOpacity?32:12))):1;
 if(followPlayerOpacity>.995)followPlayerOpacity=1;
}
function frame(time){
 if(career.isMap()){lastTime=time;requestAnimationFrame(frame);return;}
 const renderStart=performance.now();
 const dt=Math.min((time-lastTime)/1000||.016,.035);lastTime=time;advance(dt);tutorial.tick();updatePracticeSwingHint();
 if(career.isMap()){requestAnimationFrame(frame);return;}
 const dpr=Math.min(devicePixelRatio||1,1.25),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const [goalEye,goalTarget]=cameraGoal(),lerp=fx.hitstop>0?0:1-Math.exp(-9*dt);eye=eye.map((v,i)=>mix(v,goalEye[i],lerp));target=target.map((v,i)=>mix(v,goalTarget[i],lerp));
 syncContactFeedback(performance.now()+fx.renderLead);
 const motionScale=auraMotion.matches?0:1;
 $('impactFlash').style.opacity=String(fx.flash*motionScale);
 // Every contact starts at the peak of a short kick, rather than a random sine phase.
 const vibration=fx.shake*motionScale,age=fx.age,side=fx.lastContact?.shot==='backhand'?-1:1;
 const rattle=!!fx.contactClock?.rattle;
 const shake=[Math.cos(age*(rattle?190:93))*vibration*side,Math.cos(age*(rattle?225:117))*vibration*(rattle?.35:.65),0];
 const frameVP=mm(perspective(((state.view==='pov'?state.povFov:49)-fx.shake*22*motionScale)*Math.PI/180,w/h),lookAt(add(eye,shake),add(target,mul(shake,.15))));gl.uniformMatrix4fv(uVP,false,frameVP);updateTouchBallGuide(frameVP);updateFollowPlayerOpacity(frameVP,dt);
 drawMesh(venueMesh);drawMesh(staticMesh);geo=[];auraGeo=[];
 avatar(state.enemyX,state.enemyZ,1,opponentLevel().shirt||'#528f85',state.enemySwing,false);
 const playerFirst=geo.length/10;
 if(state.view==='pov')povHands();else avatar(state.px,state.pz,-1,'#df7253',state.swing,true);
 const playerEnd=geo.length/10;
 if(state.pointWait<=0){shadow(ball.x,ball.z,.055,.045);gearBall(ball.x,ball.y,ball.z,.021,career.appearance().ball);}
 const touchUnavailable=state.pointWait>0||state.celebration.active||state.careerMatch&&!state.playing;for(const id of ['mobileSwing','mobileSmash']){if($(id).disabled!==touchUnavailable)$(id).disabled=touchUnavailable;}
 const touchLabel=$('mobileSwing').querySelector('span'),nextTouchLabel=state.serve?.player?tr('서브'):tr('스윙');if(touchLabel.textContent!==nextTouchLabel)touchLabel.textContent=nextTouchLabel;
 drawCourseGuide();drawImpact();updateFootingUI(time);
 gl.bindBuffer(gl.ARRAY_BUFFER,dynamicMesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geo),gl.DYNAMIC_DRAW);dynamicMesh.count=geo.length/10;
 if(followPlayerOpacity<1){
  // Reuse the same uploaded geometry; only the occluding athlete is blended.
  drawMesh(dynamicMesh,0,playerFirst);drawMesh(dynamicMesh,playerEnd,dynamicMesh.count-playerEnd);
  // Resolve the nearest surface first so faces/limbs inside the model do not
  // show through one another when the athlete fades.
  gl.colorMask(false,false,false,false);drawMesh(dynamicMesh,playerFirst,playerEnd-playerFirst);gl.colorMask(true,true,true,true);
  gl.uniform1f(uMeshOpacity,followPlayerOpacity);gl.depthMask(false);gl.depthFunc(gl.LEQUAL);
  try{drawMesh(dynamicMesh,playerFirst,playerEnd-playerFirst);}finally{gl.depthMask(true);gl.depthFunc(gl.LESS);gl.uniform1f(uMeshOpacity,1);}
 }else drawMesh(dynamicMesh);
 if(auraGeo.length){uploadMesh(auraMesh,auraGeo);drawAura(auraMesh,eye);}
 flushImpactAnnouncement();
 const renderCost=performance.now()-renderStart;fx.renderLead=mix(fx.renderLead,clamp(renderCost+8,8,45),.12);
 requestAnimationFrame(frame);
}
function renderAvatarPreview(output,look,angle,closeup,equipmentOverride=null){
 const previewWear=equipmentOverride||career.appearance();
 const saved={px:state.px,pz:state.pz,swing:state.swing,velocity:state.velocity,playerStroke:state.playerStroke,playerMotion:state.playerMotion,celebration:state.celebration},oldGeo=geo,oldAura=auraGeo,oldFrames=modelFrames,oldDetail=portraitDetail;
 try{
  portraitDetail=true;
  state.px=0;state.pz=0;state.swing=0;state.velocity=[0,0];state.playerStroke={mix:0,selected:'forehand',ready:0,preview:true};state.playerMotion={phase:0,blend:0,lateral:0,lookYaw:0,lookPitch:0,forward:0};state.celebration={active:false,age:0};
  const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(240,Math.round(output.clientWidth*dpr)),h=Math.max(320,Math.round(output.clientHeight*dpr));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;if(output.width!==w)output.width=w;if(output.height!==h)output.height=h;
  gl.viewport(0,0,w,h);gl.uniform3fv(uFogColor,[.88,.91,.84]);gl.clearColor(.88,.91,.84,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const distance=closeup?1.05:3.2,focus=closeup?1.51:.88,camera=[Math.sin(angle)*distance,focus+(closeup?.03:.22),-Math.cos(angle)*distance];
  gl.uniformMatrix4fv(uVP,false,mm(perspective(36*Math.PI/180,w/h),lookAt(camera,[0,focus,0])));
  const key=JSON.stringify([look,angle,closeup,Object.values(previewWear).map(item=>[item.id,item.grade,item.color,item.accent]),w,h]);
  if(portraitMeshes.key!==key){geo=[];auraGeo=[];modelFrames=[];if(!closeup)softSphere(0,-.025,0,.53,.045,.40,'#bdcbb1',5,40);avatar(0,0,-1,previewWear.clothes.color,0,true,look,previewWear);if(!closeup)gearBall(.40,.045,-.08,.035,previewWear.ball);uploadMesh(portraitMeshes.body,geo);uploadMesh(portraitMeshes.aura,auraGeo);portraitMeshes.key=key;}
  drawMesh(portraitMeshes.body);drawAura(portraitMeshes.aura,camera);
  output.getContext('2d').drawImage(canvas,0,0);
 }finally{Object.assign(state,saved);geo=oldGeo;auraGeo=oldAura;modelFrames=oldFrames;portraitDetail=oldDetail;const fog=color(window.ClubVenues.forTier(venueIndex).fog);gl.clearColor(...fog,1);gl.uniform3fv(uFogColor,fog);}
}
career.bindPreview(renderAvatarPreview);
selectVenue(0);setCourse(0);setView('pov');const init=cameraGoal();eye=init[0];target=init[1];requestAnimationFrame(frame);
window.clubScene={getState:()=>({special:{charge:specialCharge,active:!!state.playerStroke.special&&state.swing>0},career:career.inspect(),venue:{tier:venueIndex,name:window.ClubVenues.forTier(venueIndex).name,cached:venueCache.size,vertices:venueMesh.count},careerMatch:!!state.careerMatch,matchFinished:!!state.matchFinished,boss:opponentLevel().boss?.id||null,enemyAI:state.enemyAI?{...state.enemyAI}:null,course:state.course,strokeStyle:state.strokeStyle,serve:state.serve?{...state.serve}:null,footing:state.previewFooting,lastShot:state.lastShot,lastPoint:state.lastPoint?{...state.lastPoint}:null,lastEnemyShot:state.lastEnemyShot,view:state.view,playing:state.playing,score:[...state.score],player:[state.px,state.pz],yaw:state.yaw,pitch:state.pitch,distance:state.distance,ball:{...ball},queuedSwing:state.queuedSwing?{power:state.queuedSwing.power,remaining:Math.max(0,state.queuedSwing.expires-state.elapsed)}:null,celebration:{active:state.celebration.active,age:state.celebration.age,duration:state.celebration.duration,power:state.celebration.power},animation:{player:state.swing>0?1-state.swing:null,opponent:state.enemySwing>0?1-state.enemySwing:null,revengePending:!!state.enemyMotion.revengePending,rivalRevenge:state.enemyMotion.revenge?{kind:state.enemyMotion.revenge.kind,age:state.elapsed-state.enemyMotion.revenge.started}:null,rivalTaunt:state.enemyMotion.taunt?{kind:state.enemyMotion.taunt.kind,age:state.elapsed-state.enemyMotion.taunt.started}:null,expressions:{player:state.playerMotion.face?{...state.playerMotion.face}:null,opponent:state.enemyMotion.face?{...state.enemyMotion.face}:null}},strokes:{player:{...state.playerStroke},opponent:{...state.enemyStroke}},enemyTransfer:state.enemyMotion.turn?{...state.enemyMotion.turn}:null,enemyDefense:{...state.enemyDefense,position:[state.enemyX,state.enemyZ],pose:strikeRig(false).pose},practiceMode:state.highFeed?'high':'normal',impact:fx.lastContact,contacts:fx.contacts.map(v=>({...v})),feedback:{age:fx.age,hitstop:fx.hitstop,visible:fx.contactVisible,presentationMs:fx.contactClock?.presentationMs??null,renderLeadMs:fx.renderLead},audio:sound.inspect(),rackets:{player:strikeRig(true).center,opponent:strikeRig(false).center},powerMotion:(()=>{const r=strikeRig(true);return{active:!!r.pose.power,phase:r.pose.t,hip:r.hip,bodyPitch:r.pose.bodyPitch,chest:r.pose.chest,frontStep:r.pose.frontStep,rearHeel:r.pose.rearHeel,approach:state.playerStroke.approachStrike?{...state.playerStroke.approachStrike}:null,hipYaw:r.pose.hip,weightBias:r.pose.weightBias||0,plant:r.pose.plant||0,hand:r.hand}})(),rallyRecovery:state.playerStroke.rallyRecovery?{...state.playerStroke.rallyRecovery}:null,directionChange:state.playerMotion.turn?{...state.playerMotion.turn}:null,feet:state.playerStroke.groundFeet?.feet.map(f=>({side:f.side,position:[f.x,f.y,f.z],planted:!f.moving})),movement:state.playerMotion.blend,webgl:!!gl}),setView};
})();
