(() => {
'use strict';
const scripts=['club-bosses.js','club-equipment.js','club-avatar.js','club-match-stats.js','club-career.js','club-leaderboard.js','club-feedback.js','club-venues.js','club-scene.js','club-presence.js'];
const load=name=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=window.ClubAssetMap?.[name]||'./'+name;script.onload=resolve;script.onerror=()=>reject(Error(name));document.body.append(script);});
(async()=>{try{await window.ClubAccount.prepare();for(const name of scripts)await load(name);if(window.ClubAccount.guest)window.ClubCareer.startGuestPractice();}catch(error){document.body.dataset.auth='locked';const gate=document.getElementById('authGate');gate.hidden=false;gate.replaceChildren();const p=document.createElement('p');p.textContent=window.ClubI18n.t('게임을 준비하지 못했습니다. 페이지를 새로고침해주세요.');gate.append(p);}})();
})();
