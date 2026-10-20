(() => {
'use strict';
const tr=window.ClubI18n.t,legacyKey='tomorrow-table-tennis-career-v1',config=window.ClubConfig||{};
const byId=id=>document.getElementById(id);
const serialize=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const canonical=raw=>{try{return serialize(JSON.parse(raw));}catch{return raw;}};
let client=null,user=null,revision=0,pending=null,timer=0,retry=0,inflight=null,blocked=false,booted=false,locked=false,intentionalLogout=false,continueBoot=null;
const account={storageKey:legacyKey,ready:false};
const gate=document.createElement('section');gate.id='authGate';gate.className='auth-gate';gate.hidden=true;document.getElementById('career').before(gate);
const bar=document.createElement('section');bar.className='account-bar';bar.hidden=true;bar.innerHTML='<span id="accountName"></span><span id="cloudStatus" role="status"></span><button type="button" id="cloudSync">'+tr('지금 동기화')+'</button><button type="button" id="accountLogout">'+tr('로그아웃')+'</button>';document.getElementById('career').before(bar);
function status(text){byId('cloudStatus').textContent=text;}
function localRead(key){try{return localStorage.getItem(key);}catch{return null;}}
function localWrite(key,value){localStorage.setItem(key,value);}
const metaKey=()=>account.storageKey+':sync';
function meta(){try{return JSON.parse(localRead(metaKey())||'{}');}catch{return {};}}
function valid(raw){return raw&&[1,2,3].includes(raw.version)&&typeof raw==='object';}
function parse(raw){try{const value=JSON.parse(raw);return valid(value)?value:null;}catch{return null;}}
function lockGate(){document.body.dataset.auth='locked';gate.hidden=false;bar.hidden=true;}
function showError(message){const output=byId('accountError');if(output)output.textContent=message;}
function safeError(error){
 if(error?.code==='email_not_confirmed')return tr('서버의 아이디 가입 설정이 완료되지 않았습니다. 관리자에게 알려주세요.');
 if(error?.code==='user_already_exists'||error?.code==='email_exists')return tr('이미 사용 중인 아이디입니다.');
 if(error?.code==='weak_password')return tr('비밀번호는 10자 이상으로 정해주세요.');
 if(error?.status===429||/rate|over_/.test(error?.code||''))return tr('요청이 많습니다. 잠시 뒤 다시 시도해주세요.');
 if(error?.code==='invalid_credentials')return tr('아이디 또는 비밀번호가 올바르지 않습니다.');
 return tr('연결하지 못했습니다. 입력 내용과 인터넷 연결을 확인해주세요.');
}
function sdk(){
 return new Promise((resolve,reject)=>{if(window.supabase)return resolve();const script=document.createElement('script');script.src='./vendor/supabase-2.118.0.js';script.onload=resolve;script.onerror=()=>reject(Error('SDK_LOAD'));document.head.append(script);});
}
function form(mode='login'){
 lockGate();const signup=mode==='signup';
 gate.innerHTML='<div class="account-intro"><small>ROAD TO OLYMPICS</small><h2>'+tr('내일은 탁구왕')+'</h2><p>'+tr('나만의 선수와 함께, 동네에서 세계 무대까지.')+'</p><div class="account-art" aria-hidden="true">🏓<span>01 → 40</span></div></div><div class="account-panel"><nav><button type="button" data-auth-mode="login" aria-pressed="'+!signup+'">'+tr('로그인')+'</button><button type="button" data-auth-mode="signup" aria-pressed="'+signup+'">'+tr('회원가입')+'</button></nav><h3>'+(signup?tr('새 선수 계정 만들기'):tr('나의 선수로 돌아오기'))+'</h3><p>'+tr('이메일 없이 아이디와 비밀번호로 시작하세요.')+'</p><form id="accountForm"><label>'+tr('아이디')+'<input id="accountUsername" name="username" autocomplete="username" minlength="3" maxlength="20" spellcheck="false" autocapitalize="none" required></label><small>'+tr('영문으로 시작하는 3~20자 · 영문, 숫자, 밑줄 · 대소문자 구분 없음')+'</small><label>'+tr('비밀번호')+'<input id="accountPassword" name="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" '+(signup?'minlength="10"':'')+' maxlength="128" required></label>'+(signup?'<label>'+tr('비밀번호 확인')+'<input id="accountPasswordAgain" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><small>'+tr('비밀번호는 10자 이상입니다. 이메일을 사용하지 않아 분실 시 자동 복구할 수 없습니다.')+'</small>':'')+'<p id="accountError" class="account-error" role="alert"></p><button type="submit" id="accountSubmit">'+(signup?tr('계정 만들고 시작'):tr('로그인'))+'</button></form><small>'+tr('계정마다 선수 성장과 장비를 클라우드에 저장합니다.')+'</small></div>';
 gate.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>form(b.dataset.authMode));
 byId('accountForm').onsubmit=async event=>{
  event.preventDefault();const username=byId('accountUsername').value.trim().toLowerCase(),password=byId('accountPassword').value;
  if(!/^[a-z][a-z0-9_]{2,19}$/.test(username))return showError(tr('아이디 형식을 확인해주세요.'));
  if(signup&&(password.length<10||password.length>128))return showError(tr('비밀번호는 10자 이상으로 정해주세요.'));
  if(signup&&password!==byId('accountPasswordAgain').value)return showError(tr('두 비밀번호가 일치하지 않습니다.'));
  const button=byId('accountSubmit'),navigation=[...gate.querySelectorAll('[data-auth-mode]')];button.disabled=true;navigation.forEach(b=>b.disabled=true);showError('');
  try{
   const email=username+'@'+config.usernameDomain;
   const result=signup?await client.auth.signUp({email,password,options:{data:{username}}}):await client.auth.signInWithPassword({email,password});
   byId('accountPassword').value='';if(signup)byId('accountPasswordAgain').value='';
   if(result.error)throw result.error;
   if(!result.data?.session)throw {code:'email_not_confirmed'};
   const verified=await client.auth.getUser();if(verified.error||!verified.data?.user)throw verified.error||Error('AUTH');
   await enter(verified.data.user);
  }catch(error){showError(safeError(error));button.disabled=false;navigation.forEach(b=>b.disabled=false);}
 };
}
function summary(raw){
 const d=parse(raw);return d?'Lv. '+(Number(d.level)||1)+' · '+tr('클리어')+' '+(Array.isArray(d.cleared)?d.cleared.length:0)+' · '+tr('상금 ')+(Number(d.money)||0).toLocaleString():'—';
}
function choice(title,detail,options){
 lockGate();gate.replaceChildren();const panel=document.createElement('div');panel.className='account-choice';const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=detail;panel.append(h,p);gate.append(panel);
 return new Promise(resolve=>options.forEach(option=>{const b=document.createElement('button');b.type='button';const name=document.createElement('b');name.textContent=option.label;const small=document.createElement('small');small.textContent=option.detail||'';b.append(name,small);b.onclick=()=>{for(const x of panel.querySelectorAll('button'))x.disabled=true;resolve(option.value);};panel.append(b);}));
}
async function remoteSave(){const result=await client.from('ttk_game_saves').select('payload,revision,updated_at').eq('user_id',user.id).maybeSingle();if(result.error)throw result.error;return result.data;}
async function reconcile(){
 const raw=canonical(localRead(account.storageKey)),info=meta();if(info.syncedRaw)info.syncedRaw=canonical(info.syncedRaw);let remote;
 try{remote=await remoteSave();}
 catch(error){
  if(!parse(raw))throw error;
  const selected=await choice(tr('클라우드에 연결하지 못했어요'),tr('이 기기에 저장된 기록은 보관되어 있습니다.'),[
   {label:tr('다시 연결'),value:'retry'},{label:tr('기기 기록으로 이어하기'),detail:summary(raw),value:'local'}]);
  if(selected==='retry')return reconcile();
  revision=Number.isSafeInteger(info.revision)?info.revision:0;status(tr('오프라인 · 기기에 저장 중'));return;
 }
 revision=remote?.revision||0;
 if(remote){
  const remoteRaw=serialize(remote.payload);if(!valid(remote.payload))throw Error('INVALID_REMOTE_SAVE');
  const dirty=!!parse(raw)&&info.syncedRaw!==raw;
  if(dirty&&raw!==remoteRaw&&info.revision!==revision){
   const selected=await choice(tr('서로 다른 저장 기록이 있어요'),tr('이어갈 기록을 골라주세요. 선택하지 않은 기기 기록은 백업합니다.'),[
    {label:tr('클라우드 기록'),detail:summary(remoteRaw),value:'cloud'},{label:tr('이 기기 기록'),detail:summary(raw),value:'local'}]);
   if(selected==='local'){localWrite(metaKey(),JSON.stringify({...info,revision}));return;}
  }else if(dirty&&info.revision===revision){return;}
  if(raw&&raw!==remoteRaw)localWrite(account.storageKey+':backup:'+Date.now(),raw);
  localWrite(account.storageKey,remoteRaw);localWrite(metaKey(),JSON.stringify({revision,syncedRaw:remoteRaw}));return;
 }
 if(!parse(raw)){
  const legacy=localRead(legacyKey);
  if(parse(legacy)){
   const selected=await choice(tr('이 기기의 기존 선수를 가져올까요?'),tr('기존 기록을 계정에 가져오거나 새 선수로 시작할 수 있어요.'),[
    {label:tr('기존 선수 가져오기'),detail:summary(legacy),value:'import'},{label:tr('새 선수로 시작'),value:'new'}]);
   if(selected==='import')localWrite(account.storageKey,legacy);
  }
 }
 localWrite(metaKey(),JSON.stringify({revision:0}));
}
async function enter(nextUser){
 user=nextUser;account.storageKey=legacyKey+':user:'+user.id;
 await reconcile();account.ready=true;booted=true;gate.hidden=true;delete document.body.dataset.auth;bar.hidden=false;
 byId('accountName').textContent=(user.email||'').split('@')[0]+' · '+tr('선수 계정');status(tr('클라우드 연결됨'));if(continueBoot){continueBoot();continueBoot=null;}
}
function queueSave(data){
 if(!client||!user||!booted||blocked)return;
 const raw=serialize(data);if(canonical(meta().syncedRaw)===raw&&!pending)return;
 pending=raw;status(tr('클라우드 저장 대기'));clearTimeout(timer);timer=setTimeout(flush,500);
}
async function flush(){
 if(!client||!user||!pending||blocked)return false;if(inflight)return inflight;
 inflight=(async()=>{
  while(pending&&!blocked){
   const raw=pending,owner=user.id;
   try{
    const current=await client.auth.getSession();if(current.data?.session?.user.id!==owner){blocked=true;status(tr('로그인이 만료됐어요 · 새로고침 후 로그인'));return false;}
    const result=await client.rpc('ttk_save_progress',{p_payload:JSON.parse(raw),p_expected_revision:revision});
    if(result.error)throw result.error;
    const row=Array.isArray(result.data)?result.data[0]:result.data;if(!row?.revision)throw Error('INVALID_RESPONSE');
    revision=row.revision;localWrite(metaKey(),JSON.stringify({revision,syncedRaw:raw}));
    if(pending===raw)pending=null;retry=0;status(pending?tr('클라우드 저장 대기'):tr('클라우드 저장됨'));
   }catch(error){
    if(['40001','PT409'].includes(error?.code)||/SAVE_CONFLICT/.test(error?.message||'')){blocked=true;status(tr('다른 기기의 새 기록이 있어요 · 동기화를 눌러 선택'));}
    else{status(tr('연결 지연 · 기기 기록 보관 중'));clearTimeout(timer);timer=setTimeout(flush,Math.min(60000,2000*2**Math.min(retry++,5)));}
    return false;
   }
  }return true;
 })();
 try{return await inflight;}finally{inflight=null;}
}
account.prepare=async()=>{
 const url=String(config.supabaseUrl||''),key=String(config.supabasePublishableKey||'');
 const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname)||location.protocol==='file:';
 if(!url||!key){
  if(local||config.requireLogin===false){account.ready=true;return;}
  lockGate();gate.innerHTML='<div class="account-choice"><h2>'+tr('로그인 서버 연결 준비 중')+'</h2><p>'+tr('관리자가 Supabase 설정을 완료하면 시작할 수 있습니다.')+'</p></div>';return new Promise(()=>{});
 }
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)||key.startsWith('sb_secret_')||!/^[a-z0-9.-]+$/.test(config.usernameDomain||'')){throw Error('INVALID_PUBLIC_AUTH_CONFIG');}
 lockGate();gate.innerHTML='<div class="account-choice"><h2>'+tr('선수 계정 확인 중')+'</h2></div>';
 await sdk();client=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'ttk-auth-'+new URL(url).hostname}});
 client.auth.onAuthStateChange((_event,session)=>{if(booted&&!intentionalLogout&&session?.user?.id!==user?.id){blocked=true;setTimeout(()=>{status(tr('계정이 변경됐어요 · 새로고침해주세요.'));if(window.ClubCareer?.hasActiveMatch())window.dispatchEvent(new Event('club-account-changed'));else location.reload();},0);}});
 return new Promise(resolve=>{
  continueBoot=resolve;
  client.auth.getSession().then(async result=>{
   if(result.error)throw result.error;
   if(result.data?.session?.user)await enter(result.data.session.user);else form();
  }).catch(()=>{form();showError(tr('저장된 계정에 연결하지 못했어요. 다시 로그인해주세요.'));});
 });
};
account.getLeaderboard=async()=>{
 if(!client||!user||!booted)throw Error('LOGIN_REQUIRED');
 const result=await client.rpc('ttk_get_leaderboard').abortSignal(AbortSignal.timeout(12000));
 if(result.error)throw result.error;return {...result.data,savePending:!!pending||blocked};
};
account.queueSave=queueSave;
account.updateLock=value=>{if(locked===!!value)return;locked=!!value;byId('accountLogout').disabled=locked;byId('cloudSync').disabled=locked;};
byId('cloudSync').onclick=async()=>{if(locked)return;if(blocked){location.reload();return;}await flush();};
byId('accountLogout').onclick=async()=>{if(locked||!client)return;byId('accountLogout').disabled=true;await flush();intentionalLogout=true;const result=await client.auth.signOut({scope:'local'});if(result.error){intentionalLogout=false;byId('accountLogout').disabled=false;status(tr('로그아웃하지 못했어요. 다시 시도해주세요.'));return;}location.reload();};
window.addEventListener('online',()=>{if(pending&&!blocked)flush();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&pending)flush();});
window.ClubAccount=account;
})();
