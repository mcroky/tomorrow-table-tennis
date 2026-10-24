(() => {
'use strict';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
function assertSave(raw){
 const fail=()=>{throw Object.assign(Error('SAVE_CORRUPT'),{saveBlocked:true});};
 if(!object(raw))fail();
 if(![1,2,3].includes(raw.version))throw Object.assign(Error('SAVE_UNSUPPORTED_VERSION'),{saveBlocked:true});
 if(!integer(raw.level,1,99)||!integer(raw.xp)||!integer(raw.wins)||!integer(raw.losses)||!object(raw.stats)||!object(raw.skills)||!Array.isArray(raw.tierWins)||raw.tierWins.some(v=>!integer(v)))fail();
 for(const values of [raw.stats,raw.skills,raw.upgrades])if(values!==undefined&&(!object(values)||Object.values(values).some(v=>!integer(v))))fail();
 if(raw.version===3&&!integer(raw.money))fail();
 if(raw.version>=2&&(!Array.isArray(raw.cleared)||raw.cleared.some(v=>!integer(v,0,39))))fail();
 for(const key of ['stageMedals','rivalWins'])if(raw[key]!==undefined&&(!Array.isArray(raw[key])||raw[key].some(v=>!integer(v))))fail();
 if(raw.owned!==undefined&&(!Array.isArray(raw.owned)||raw.owned.some(v=>typeof v!=='string')))fail();
 if(raw.equipped!==undefined&&(!object(raw.equipped)||Object.values(raw.equipped).some(v=>typeof v!=='string')))fail();
 for(const key of ['activeMatch','lastResult'])if(raw[key]!=null&&(!object(raw[key])||!Array.isArray(raw[key].score)||raw[key].score.length!==2||raw[key].score.some(v=>!integer(v))))fail();
 if(raw.training!==undefined){
  if(!object(raw.training))fail();
  for(const key of ['sweet','placement','finish'])if(raw.training[key]!==undefined&&!integer(raw.training[key]))fail();
  if(raw.training.claimed!==undefined&&(!Array.isArray(raw.training.claimed)||raw.training.claimed.some(v=>typeof v!=='string')))fail();
 }
 return raw;
}
const words={
 ko:['저장 기록 확인이 필요합니다','읽을 수 없는 기록을 자동으로 덮어쓰지 않았습니다. 원본을 내려받아 보관한 뒤 다시 시도해주세요.','원본 내려받기','다시 시도','정상 클라우드 기록으로 복구','원본을 보관하지 못해 복구를 중단했습니다. 저장 공간을 확인해주세요.'],
 en:['Check your saved progress','Unreadable progress has not been overwritten. Download the original and try again.','Download original','Try again','Restore valid cloud progress','Could not preserve the original. Check storage space before restoring.'],
 ja:['セーブ記録の確認が必要です','読み込めない記録は上書きしていません。原本を保存してから再試行してください。','原本を保存','再試行','正常なクラウド記録を復元','原本を保管できないため復元を中断しました。空き容量を確認してください。'],
 zh:['需要检查存档','未覆盖无法读取的存档。请下载原始文件后重试。','下载原始存档','重试','恢复正常云端存档','无法保留原始存档，已停止恢复。请检查存储空间。']
};
function block(raw,key,restore){
 window.ClubSaveSafety.blocked=true;
 window.dispatchEvent?.(new Event('club-game-interrupt'));
 const w=words[window.ClubI18n.language]||words.ko;
 let preserved=false;try{localStorage.setItem(key+':damaged',raw);preserved=true;}catch{/* Keep the original key untouched. */}
 document.body.dataset.auth='locked';
 const gate=document.getElementById('authGate');gate.hidden=false;gate.replaceChildren();
 const panel=document.createElement('div');panel.className='account-choice';
 const heading=document.createElement('h2');heading.textContent=w[0];const detail=document.createElement('p');detail.textContent=w[1];panel.append(heading,detail);
 const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;panel.append(b);return b;};
 button(w[2],()=>{const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='table-tennis-original-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 if(restore)button(w[4],()=>{if(!preserved){detail.textContent=w[5];return;}try{restore();}catch{detail.textContent=w[5];}});
 button(w[3],()=>location.reload());gate.append(panel);panel.querySelector('button').focus();
 // Boot remains blocked until explicit recovery/reload; no game can queue a save.
 return new Promise(()=>{});
}
window.ClubSaveSafety={assert:assertSave,block};
})();
