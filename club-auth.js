(() => {
'use strict';
const tr=window.ClubI18n.t,legacyKey='tomorrow-table-tennis-career-v1',key='tomorrow-table-tennis-local-v1';
const account={storageKey:key,ready:false,guest:false,local:true};
const gate=document.createElement('section');gate.id='authGate';gate.className='auth-gate';gate.hidden=true;
const bar=document.createElement('section');bar.className='account-bar local-save-bar';bar.hidden=true;
const label=document.createElement('strong');label.textContent=tr('기기 자동 저장');
const note=document.createElement('span');note.textContent=tr('이 브라우저에 저장됩니다. 데이터 삭제 전 저장 파일을 보관하세요.');
const status=document.createElement('span');status.id='localSaveStatus';status.setAttribute('role','status');
const button=text=>{const b=document.createElement('button');b.type='button';b.textContent=tr(text);return b;};
const download=button('저장 파일 내려받기'),upload=button('저장 파일 가져오기');
const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.hidden=true;
const oldSaves=document.createElement('select');oldSaves.hidden=true;oldSaves.setAttribute('aria-label',tr('이 기기의 이전 선수 기록'));
const importOld=button('이전 기록 가져오기');importOld.hidden=true;
bar.append(label,note,download,upload,oldSaves,importOld,picker,status);
document.getElementById('career').before(gate,bar);
let locked=false;
const read=name=>localStorage.getItem(name);
const currentKey=()=>account.storageKey;
function validate(raw){const data=JSON.parse(raw);window.ClubSaveSafety.assert(data);return data;}
function cachedSaves(){
 const result=[];
 for(let i=0;i<localStorage.length;i++){
  const name=localStorage.key(i);
  if(name.startsWith(key+':backup:')){const raw=read(name);if(raw)result.push({key:name,raw});continue;}
  if(name!==legacyKey&&!new RegExp('^'+legacyKey+':user:[a-f0-9-]+$','i').test(name))continue;
  const raw=read(name);if(raw)result.push({key:name,raw});
 }
 return result;
}
function lastAccountSave(candidates){
 const owners=new Set();
 for(let i=0;i<localStorage.length;i++){
  const name=localStorage.key(i);if(!name.startsWith('ttk-auth-'))continue;
  try{const id=JSON.parse(read(name))?.user?.id;if(typeof id==='string')owners.add(id);}catch{/* Preserve expired or unrelated session data. */}
 }
 const matches=candidates.filter(s=>s.key.startsWith(legacyKey+':user:')&&owners.has(s.key.slice((legacyKey+':user:').length)));
 return matches.length===1?matches[0]:null;
}
account.prepare=async()=>{
 let candidates=[];
 try{
  candidates=cachedSaves();let raw=read(key);
  if(!raw){
   // Prefer the previously signed-in player, without merging different players.
   const source=lastAccountSave(candidates)||candidates.find(s=>s.key===legacyKey)||(candidates.filter(s=>!s.key.startsWith(key+':backup:')).length===1?candidates.find(s=>!s.key.startsWith(key+':backup:')):null);
   if(source){
    try{validate(source.raw);}catch{return window.ClubSaveSafety.block(source.raw,source.key);}
    account.storageKey=source.key;localStorage.setItem(key,source.raw);account.storageKey=key;raw=source.raw;
    status.textContent=tr('이 기기의 이전 기록을 로컬 저장으로 이어받았습니다.');
   }
  }
  if(raw){try{validate(raw);}catch{return window.ClubSaveSafety.block(raw,key);}}
 }catch{status.textContent=tr('자동 저장 불가 · 현재 실행에서만 유지');}
 for(const save of candidates){
  let data;try{data=validate(save.raw);}catch{continue;}
  const option=document.createElement('option');option.value=save.key;
  option.textContent=(save.key.startsWith(key+':backup:')?tr('이전 기록 가져오기')+' · ':'')+(data.profile?.name||tr('나의 선수'))+' · Lv. '+data.level+' · '+(data.cleared?.length||0)+'/40';oldSaves.append(option);
 }
 oldSaves.hidden=importOld.hidden=!oldSaves.options.length;
 account.ready=true;delete document.body.dataset.auth;delete document.body.dataset.guest;bar.hidden=false;
};
function importSave(raw){
 if(locked)return;
 validate(raw);
 if(!confirm(tr('현재 진행 상황을 보관한 뒤 선택한 저장 파일로 바꿀까요?')))return;
 const previous=read(currentKey());
 if(previous)localStorage.setItem(key+':backup:'+Date.now(),previous);
 localStorage.setItem(currentKey(),raw);location.reload();
}
download.onclick=()=>{
 try{
  const raw=read(currentKey())||JSON.stringify(window.ClubCareer.inspect());validate(raw);
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download='tomorrow-table-tennis-save-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent=tr('저장 파일을 내려받았습니다.');
 }catch{status.textContent=tr('저장 파일을 보관하지 못했습니다. 저장 공간과 브라우저 설정을 확인해주세요.');}
};
upload.onclick=()=>{if(!locked)picker.click();};
picker.onchange=async()=>{
 const file=picker.files?.[0];if(!file)return;
 try{if(file.size>512*1024)throw Error('SAVE_TOO_LARGE');importSave(await file.text());}
 catch{status.textContent=tr('가져오지 못했습니다. 정상 저장 파일인지와 저장 공간을 확인해주세요. 기존 기록은 유지됩니다.');}
 finally{picker.value='';}
};
importOld.onclick=()=>{
 try{const raw=read(oldSaves.value);if(!raw)throw Error('SAVE_MISSING');importSave(raw);}
 catch{status.textContent=tr('가져오지 못했습니다. 정상 저장 파일인지와 저장 공간을 확인해주세요. 기존 기록은 유지됩니다.');}
};
account.updateLock=value=>{locked=!!value;upload.disabled=importOld.disabled=oldSaves.disabled=locked;};
account.queueSave=()=>{}; // Career saves synchronously to the device, without a network queue.
window.ClubAccount=account;
})();
