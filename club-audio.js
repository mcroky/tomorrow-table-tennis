(() => {
'use strict';
function buildSample(kind,rate,variation=0){
 const durations={cut:.16,drive:.19,serve:.15,hit:.17,center:.21,edge:.12,bounce:.14,smash:.27,critical:.43,criticalSmash:.46,swing:.22,powerSwing:.30,net:.16,point:.64,concede:.40,shoe:.15,finish:.40,winner:.92};
 const duration=durations[kind]||.18,data=new Float32Array(Math.ceil(rate*duration));let seed=17431+variation*7919,previous=0,low=0;
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2147483648-1;};
 const musical=['point','concede','winner'].includes(kind),pitch=musical?1:1+(variation-1.5)*.012;
 for(let i=0;i<data.length;i++){
  const t=i/rate,n=random(),high=n-previous;previous=n;low+=.10*(n-low);let sample=0;
  const tone=(f,decay,gain)=>Math.sin(2*Math.PI*f*pitch*t)*Math.exp(-t*decay)*gain;
  const drop=(from,to,tau,decay,gain)=>Math.sin(2*Math.PI*pitch*(to*t+(from-to)*tau*(1-Math.exp(-t/tau))))*Math.exp(-t*decay)*gain;
  const note=(freq,delay,gain,decay=13)=>{if(t<delay)return 0;const u=t-delay,p=2*Math.PI*freq*u;return(Math.sin(p)+Math.sin(p*2)*.20+Math.sin(p*3)*.065)*Math.min(1,u/.004)*Math.exp(-u*decay)*gain;};
  if(kind==='cut'){
   sample=high*Math.exp(-t*660)*.12+(n-low)*Math.exp(-t*95)*.045+tone(1620,100,.14)+tone(650,120,.06);
  }else if(kind==='drive'){
   sample=high*Math.exp(-t*850)*.20+tone(1040,90,.25)+drop(310,210,.01,70,.09)+tone(2050,115,.085);
  }else if(kind==='serve'){
   sample=high*Math.exp(-t*800)*.12+tone(1260,100,.19)+tone(2340,130,.055);
  }else if(kind==='hit'){
   sample=high*Math.exp(-t*850)*.19+low*Math.exp(-t*170)*.12+tone(1120,85,.23)+tone(2180,115,.10)+tone(285,75,.045);
  }else if(kind==='center'){
   sample=high*Math.exp(-t*900)*.19+tone(1080,78,.27)+tone(2160,110,.11)+drop(340,210,.010,65,.12)+low*Math.exp(-t*200)*.11;
  }else if(kind==='edge'){
   sample=high*Math.exp(-t*600)*.20+(n-low)*Math.exp(-t*165)*.060+tone(3050,105,.105)+tone(870,160,.055);
  }else if(kind==='smash'||kind==='finish'||kind==='criticalSmash'){
   // Dry crack plus a fast downward body resonance: weight without a long boom.
   sample=high*Math.exp(-t*720)*.25+low*Math.exp(-t*160)*.17+drop(265,108,.011,52,.29)+tone(1050,105,.18)+tone(2070,160,.095);
   if(kind==='finish')sample+=drop(190,85,.016,36,.14)+tone(620,70,.11)+high*Math.exp(-t*260)*.065;
   if(kind==='criticalSmash')sample+=tone(1661,36,.11)+tone(3322,42,.055)+tone(4435,65,.018);
  }else if(kind==='critical'){
   // Bright sweet-spot click and a pitched metallic tail, distinct from the smash.
   sample=high*Math.exp(-t*980)*.17+tone(1380,110,.23)+tone(1661,30,.15)+tone(3322,39,.065)+tone(4435,62,.018)+tone(700,88,.075);
  }else if(kind==='bounce'){
   sample=tone(710,75,.14)+tone(1460,105,.07)+high*Math.exp(-t*700)*.08;
  }else if(kind==='swing'||kind==='powerSwing'){
   const p=t/duration,envelope=Math.pow(Math.sin(Math.PI*p),2);sample=(n-low)*envelope*(kind==='powerSwing'?.055:.026);
  }else if(kind==='shoe'){
   const envelope=Math.sin(Math.PI*Math.min(1,t/.15))*Math.exp(-t*24);sample=(high*.045+low*.25)*envelope+tone(165,80,.045);
  }else if(kind==='net'){sample=low*Math.exp(-t*55)*.22+tone(230,60,.045);
  }else if(kind==='point'){
   sample=note(783.99,0,.12)+note(987.77,.075,.12)+note(1174.66,.15,.14,11)+tone(245,55,.065);
  }else if(kind==='winner'){
   sample=drop(180,95,.012,40,.12)+high*Math.exp(-t*360)*.07;
   sample+=note(523.25,0,.11)+note(659.25,.07,.11)+note(783.99,.14,.12)+note(1046.50,.24,.15,8);
   sample+=note(261.63,.24,.028,8)+note(329.63,.24,.028,8)+note(392,.24,.028,8);
  }else if(kind==='concede'){sample=note(493.88,0,.080,17)+note(369.99,.11,.075,17);}
  sample*=Math.min(1,t/.00035)*Math.min(1,(duration-t)/.018);data[i]=Math.tanh(sample*1.12)*.84;
 }return data;
}
class ClubAudio {
 constructor(){this.ctx=null;this.master=null;this.analyser=null;this.volume=.72;this.muted=false;this.events=[];this.buffers={};this.failed=false;try{const saved=JSON.parse(localStorage.getItem('ttk-audio-v1')||'{}');this.volume=Math.max(0,Math.min(1,saved.volume??.72));this.muted=!!saved.muted;}catch{}}
 async unlock(){
  if(this.failed)return;
  try{
   if(!this.ctx){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC){this.failed=true;return;}
    this.ctx=new AC({latencyHint:'interactive'});const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=this.muted?0:this.volume*2.25;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=5;limiter.ratio.value=5;limiter.attack.value=.001;limiter.release.value=.08;
    // A final soft ceiling prevents amplified overlapping hits from clipping.
    const ceiling=c.createWaveShaper(),curve=new Float32Array(4096);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1,a=Math.abs(x);curve[i]=Math.sign(x)*(a<=.86?a:.86+.13*Math.tanh((a-.86)/.13));}ceiling.curve=curve;ceiling.oversample='2x';
    this.analyser=c.createAnalyser();this.analyser.fftSize=1024;this.master.connect(limiter);limiter.connect(ceiling);ceiling.connect(this.analyser);this.analyser.connect(c.destination);
    this.room=c.createConvolver();const length=Math.floor(c.sampleRate*.28),ir=c.createBuffer(2,length,c.sampleRate);let seed=311;
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<length;i++){seed=(1664525*seed+1013904223)>>>0;const t=i/c.sampleRate;d[i]=t<.012?0:(seed/2147483648-1)*Math.exp(-t*28)*.12;}}
    this.room.buffer=ir;const wet=c.createGain();wet.gain.value=.16;this.room.connect(wet);wet.connect(this.master);
    for(const kind of ['cut','drive','serve','hit','center','edge','bounce','smash','critical','swing','powerSwing','net','point','shoe','finish','winner','criticalSmash','concede']){this.buffers[kind]=[];for(let v=0;v<4;v++){const data=buildSample(kind,c.sampleRate,v),b=c.createBuffer(1,data.length,c.sampleRate);b.copyToChannel(data,0);this.buffers[kind].push(b);}}
   }
   if(this.ctx.state!=='running')await this.ctx.resume();
  }catch{this.failed=true;}
 }
 setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)));this.sync();}
 setMuted(value){this.muted=!!value;this.sync();}
 sync(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume*2.25,this.ctx.currentTime,.012);try{localStorage.setItem('ttk-audio-v1',JSON.stringify({volume:this.volume,muted:this.muted}));}catch{}}
 play(kind,{pan=0,gain=1,distance=0,whenMs=null}={}){
  if(!this.ctx||this.ctx.state!=='running'||!this.buffers[kind])return;
  const c=this.ctx,source=c.createBufferSource(),level=c.createGain(),panner=c.createStereoPanner(),send=c.createGain(),index=this.events.length%4;
  source.buffer=this.buffers[kind][index];const emphasis={center:1.05,edge:.76,smash:1.08,critical:1.10,criticalSmash:1.10,finish:1.08,point:1.05,winner:1.08,concede:.80};
  level.gain.value=gain*(emphasis[kind]||1)/(1+distance*.16);send.gain.value=({center:.65,edge:.22,smash:.45,finish:.65,critical:1.25,criticalSmash:1.05,point:.90,winner:1.05,concede:.55})[kind]??.65;panner.pan.value=Math.max(-.85,Math.min(.85,pan));
  source.connect(level);level.connect(panner);panner.connect(this.master);panner.connect(send);send.connect(this.room);
  const wallNow=performance.now(),audioNow=c.currentTime;let latency=Math.max(0,(c.baseLatency||0)+(c.outputLatency||0));
  try{if(typeof c.getOutputTimestamp==='function'){const stamp=c.getOutputTimestamp();if(stamp.contextTime>0&&stamp.performanceTime>0){const measured=(stamp.performanceTime-wallNow)/1000+audioNow-stamp.contextTime;if(Number.isFinite(measured)&&measured>=0&&measured<.25)latency=measured;}}}catch{}
  const startAt=whenMs===null?audioNow:Math.max(audioNow+.002,audioNow+(whenMs-wallNow)/1000-latency);
  const presentationMs=wallNow+(latency+startAt-audioNow)*1000;source.start(startAt);this.duckMusic?.(kind);
  this.events.push({kind,time:startAt,presentationMs,pan:panner.pan.value,gain:level.gain.value,muted:this.muted});if(this.events.length>96)this.events.shift();
  source.onended=()=>{source.disconnect();level.disconnect();panner.disconnect();send.disconnect();};
  return{audioTime:startAt,presentationMs,latency};
 }
 inspect(){return{state:this.ctx?.state||'locked',volume:this.volume,muted:this.muted,failed:this.failed,events:this.events.slice(-24)};}
 static buildSample(kind,rate,variation){return buildSample(kind,rate,variation);}
}
window.ClubAudio=ClubAudio;
})();
