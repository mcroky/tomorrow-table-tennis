(() => {
'use strict';
// Original, locally synthesized arrangements. Render once off the game loop,
// then play cached buffers; no network streams or per-frame music synthesis.
const sound=window.ClubSound=new window.ClubAudio(),tr=window.ClubI18n.t;
const tracks=new Map(),voices=new Set();
let volume=.38,muted=false,active=null,request=0,unlocked=false,unlocking=null,duckBus=null;
try{const saved=JSON.parse(localStorage.getItem('ttk-music-v1')||'{}');volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.38;muted=!!saved.muted;}catch{}
const midi=n=>440*2**((n-69)/12);
async function compose(mode){
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!Offline)throw Error('OFFLINE_AUDIO_UNAVAILABLE');
 const rate=32000,bpm=mode==='match'?144:92,beat=60/bpm,length=32*beat,tail=1.6;
 const c=new Offline(2,Math.ceil((length+tail)*rate),rate),bus=c.createGain();bus.gain.value=.75;bus.connect(c.destination);
 const echo=c.createDelay(1);echo.delayTime.value=beat*.75;const echoGain=c.createGain();echoGain.gain.value=.16;echo.connect(echoGain);echoGain.connect(bus);
 function note(n,t,d,g,type='triangle',pan=0,cutoff=2400,delay=false){
  const o=c.createOscillator(),amp=c.createGain(),filter=c.createBiquadFilter(),p=c.createStereoPanner();
  o.type=type;o.frequency.value=midi(n);filter.type='lowpass';filter.frequency.value=cutoff;p.pan.value=pan;
  amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(g,t+.012);amp.gain.exponentialRampToValueAtTime(.0001,t+d+.16);
  o.connect(filter);filter.connect(amp);amp.connect(p);p.connect(bus);if(delay)p.connect(echo);o.start(t);o.stop(t+d+.18);
 }
 const noise=c.createBuffer(1,rate*.24,rate);let seed=92417;const samples=noise.getChannelData(0);
 for(let i=0;i<samples.length;i++){seed=(1664525*seed+1013904223)>>>0;samples[i]=seed/2147483648-1;}
 function drum(kind,t,g){
  const amp=c.createGain();amp.connect(bus);
  if(kind==='kick'){
   const o=c.createOscillator();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(46,t+.15);
   amp.gain.setValueAtTime(g,t);amp.gain.exponentialRampToValueAtTime(.0001,t+.23);o.connect(amp);o.start(t);o.stop(t+.25);
  }else{
   const src=c.createBufferSource(),f=c.createBiquadFilter();src.buffer=noise;f.type='highpass';f.frequency.value=kind==='hat'?6500:1500;
   const d=kind==='hat'?.045:.16;amp.gain.setValueAtTime(g,t);amp.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(f);f.connect(amp);src.start(t);src.stop(t+d+.01);
   if(kind==='snare')note(50,t,.045,g*.35,'triangle',0,900);
  }
 }
 const lobby=[[50,54,57,61],[47,50,54,57],[43,47,50,54],[45,49,52,55]],match=[[50,53,57,62],[46,50,53,58],[41,45,48,53],[48,52,55,60]];
 const chords=mode==='match'?match:lobby;
 const melody=mode==='match'?[[74,null,77,76,74,69,72,74],[70,74,77,null,74,72,70,69],[69,null,72,77,76,72,69,65],[72,76,79,77,76,72,69,72]]:[[69,null,73,74,null,73,69,66],[66,null,69,73,74,null,73,69],[66,69,null,71,69,null,66,62],[64,null,69,73,71,69,null,73]];
 for(let bar=0;bar<8;bar++){
  const chord=chords[bar%4],base=bar*4*beat;
  chord.forEach((n,i)=>note(n+12,base,beat*3.65,.036,mode==='match'?'sawtooth':'sine',(i-1.5)*.32,mode==='match'?1000:1500));
  for(let eighth=0;eighth<8;eighth++){
   const t=base+eighth*beat/2;
   if(mode==='match'){
    // Driving offbeat bass, bright arpeggio, four-on-the-floor drums.
    note(chord[0]-12+(eighth===6?12:0),t,beat*.30,.15,'triangle',0,650);
    note(chord[eighth%4]+12,t+beat*.25,beat*.18,.043,'sawtooth',eighth%2?.32:-.32,1800,true);
    drum('hat',t,eighth%2?.075:.04);
    if(eighth%2===0)drum('kick',t,.36);
    if(eighth===2||eighth===6)drum('snare',t,.14);
    if(bar%4===3&&eighth>=6)drum('snare',t+beat*.25,.07);
   }else{
    if(eighth%2===0)note(chord[0]-12,t,beat*.75,.13,'sine',0,800);
    if(eighth===0||eighth===4)drum('kick',t,.16);
    if(eighth===2||eighth===6)drum('snare',t,.055);
    drum('hat',t, .022);
    note(chord[eighth%4]+12,t,beat*.28,.055,'triangle',eighth%2?.35:-.35,2000,true);
   }
   const n=melody[bar%4][eighth];if(n!==null)note(n+(bar>=4&&mode==='lobby'?12:0),t,beat*(mode==='match'?.34:.65),mode==='match'?.09:.075,'triangle',-.12,mode==='match'?3200:2300,true);
  }
 }
 const rendered=await c.startRendering(),frames=Math.round(length*rate),buffer=sound.ctx.createBuffer(2,frames,rate);
 // Fold the previous loop's release/delay tail into its beginning.
 for(let ch=0;ch<2;ch++){const input=rendered.getChannelData(ch),out=buffer.getChannelData(ch);out.set(input.subarray(0,frames));for(let i=frames;i<input.length;i++)out[i-frames]+=input[i];}
 return buffer;
}
function track(mode){if(!tracks.has(mode))tracks.set(mode,compose(mode).catch(error=>{tracks.delete(mode);throw error;}));return tracks.get(mode);}
function desired(){return document.body.dataset.surface==='court'?'match':'lobby';}
function level(){return muted||document.hidden?0:volume*.60;}
function retire(voice,seconds=.65){
 if(!voice)return;const now=sound.ctx.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);voice.gain.gain.linearRampToValueAtTime(0,now+seconds);try{voice.source.stop(now+seconds+.03);}catch{}if(active===voice)active=null;
}
async function update(){
 if(!unlocked||!sound.ctx||sound.ctx.state!=='running')return;
 if(document.hidden){request++;for(const voice of voices)retire(voice,.04);return;}
 const mode=desired();if(active?.mode===mode)return;
 const token=++request;
 try{
  const buffer=await track(mode);if(token!==request||document.hidden||mode!==desired())return;
  const c=sound.ctx,source=c.createBufferSource(),gain=c.createGain();if(!duckBus){duckBus=c.createGain();duckBus.connect(sound.master);}source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(duckBus);
  const now=c.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level(),now+.75);
  for(const voice of voices)retire(voice);active={mode,source,gain};const voice=active;voices.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(voice);};source.start(now);
 }catch{/* Music support must never block signing in or playing. */}
}
sound.duckMusic=kind=>{
 if(!duckBus||!['hit','drive','cut','center','edge','smash','critical','criticalSmash','finish','winner','point','concede'].includes(kind))return;
 const now=sound.ctx.currentTime;duckBus.gain.cancelScheduledValues(now);duckBus.gain.setTargetAtTime(.48,now,.008);duckBus.gain.setTargetAtTime(1,now+.16,.10);
};
async function unlock(){
 if(unlocking)return unlocking;
 unlocking=(async()=>{await sound.unlock();unlocked=sound.ctx?.state==='running';if(unlocked){await update();const other=desired()==='match'?'lobby':'match';track(other).catch(()=>{});}})();
 try{await unlocking;}finally{unlocking=null;}
}
const controls=[];
function sync(){
 for(const control of controls){control.button.textContent=tr(muted?'배경음 꺼짐':'배경음 켜짐');control.button.setAttribute('aria-pressed',String(!muted));if(control.input){control.input.value=String(Math.round(volume*100));control.output.textContent=Math.round(volume*100)+'%';}}
 if(active)active.gain.gain.setTargetAtTime(level(),sound.ctx.currentTime,.08);
 try{localStorage.setItem('ttk-music-v1',JSON.stringify({volume,muted}));}catch{}
}
function makeControls(parent,full){
 const box=document.createElement('div'),button=document.createElement('button');box.className='music-controls'+(full?' music-settings':'');button.type='button';button.onclick=()=>{muted=!muted;sync();unlock();};box.append(button);
 const control={button};
 if(full){const label=document.createElement('label'),input=document.createElement('input'),output=document.createElement('output');input.type='range';input.min='0';input.max='100';input.step='1';label.append(document.createTextNode(tr('배경음 음량')+' '),input);box.append(label,output);control.input=input;control.output=output;input.oninput=()=>{volume=Number(input.value)/100;sync();unlock();};}
 controls.push(control);parent.prepend(box);
}
makeControls(document.querySelector('.shell>header'),false);makeControls(document.querySelector('.court-settings-panel'),true);sync();
// Browsers allow audio after a user gesture; the login screen is included.
document.addEventListener('pointerdown',()=>{if(!unlocked||sound.ctx?.state!=='running')unlock();},{capture:true});
document.addEventListener('keydown',event=>{if(!event.repeat&&(!unlocked||sound.ctx?.state!=='running'))unlock();},{capture:true});
new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-surface']});
document.addEventListener('visibilitychange',()=>{if(document.hidden)update();else if(unlocked)sound.unlock().then(update);});
window.addEventListener('pagehide',()=>{request++;for(const voice of voices)retire(voice,.02);});
window.addEventListener('pageshow',()=>{if(unlocked)sound.unlock().then(update);});
})();
