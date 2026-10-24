(() => {
'use strict';
if(window.ClubAccount?.local)return;
if(window.ClubAccount?.guest)return;
const tr=window.ClubI18n.t,node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=tr(String(text));if(className)n.className=className;return n;};
const opener=node('button','운영자','operator-open');opener.type='button';opener.hidden=true;opener.setAttribute('aria-haspopup','dialog');opener.setAttribute('aria-controls','operatorDialog');document.getElementById('feedbackOpen').after(opener);
const dialog=node('dialog',undefined,'operator-dialog');dialog.id='operatorDialog';dialog.setAttribute('aria-labelledby','operatorTitle');
const header=node('header'),heading=node('div'),title=node('h2','운영 현황');title.id='operatorTitle';heading.append(node('small','OPERATOR'),title);const close=node('button','닫기');close.type='button';header.append(heading,close);
const note=node('p','접속 기준: 최근 90초 내 연결 · 같은 계정은 1명 · 30초마다 갱신','operator-note'),stats=node('section',undefined,'operator-stats'),feedback=node('p',undefined,'operator-feedback'),toolbar=node('div',undefined,'operator-toolbar'),updated=node('small'),refresh=node('button','새로고침');refresh.type='button';toolbar.append(updated,refresh);
const status=node('p',undefined,'operator-status');status.setAttribute('role','status');
const listTitle=node('h3','현재 접속 선수'),list=node('div',undefined,'operator-players');dialog.append(header,note,stats,feedback,toolbar,status,listTitle,list);document.body.append(dialog);
let heartbeatTimer=null,dashboardTimer=null,beating=false,loading=false,operator=false,request=0,lastBeat=0;
const integer=value=>Math.max(0,Math.floor(Number(value)||0));
function render(data){
 stats.replaceChildren();for(const [label,value] of [['현재 접속',data.online],['경기 중',data.playing],['최근 24시간 활동',data.active_24h],['전체 가입자',data.registered],['24시간 신규 가입',data.new_24h]]){const card=node('article');card.append(node('small',label),node('strong',integer(value).toLocaleString()));stats.append(card);}
 feedback.textContent=tr('의견 접수')+' '+integer(data.feedback?.total)+' · '+tr('발송 대기')+' '+integer(data.feedback?.pending)+' · '+tr('발송 실패')+' '+integer(data.feedback?.failed);
 list.replaceChildren();const players=Array.isArray(data.players)?data.players.slice(0,50):[];
 for(const player of players){const row=node('div',undefined,'operator-player'),identity=node('div'),name=node('b'),activity={map:'월드맵',practice:'연습장',match:'경기 중'}[player.activity]||'월드맵';name.textContent=player.name||'Player';identity.append(name,node('small','Lv. '+integer(player.level)));const seen=new Date(player.last_seen);row.append(identity,node('span',activity),node('time',Number.isNaN(seen.getTime())?'':seen.toLocaleTimeString(document.documentElement.lang,{hour:'2-digit',minute:'2-digit',second:'2-digit'})));list.append(row);}
 if(!players.length)list.append(node('p','현재 접속 중인 선수가 없어요.'));
 const stamp=new Date(data.fetched_at);updated.textContent=tr('갱신')+' · '+(Number.isNaN(stamp.getTime())?'':stamp.toLocaleTimeString(document.documentElement.lang));
 status.textContent=integer(data.online)>50?tr('접속 선수 목록은 최대 50명까지 표시합니다.'):'';
}
async function refreshDashboard(){
 clearTimeout(dashboardTimer);if(!dialog.open||document.hidden||loading)return;
 loading=true;refresh.disabled=true;const token=++request;status.textContent=tr('운영 정보를 불러오는 중…');
 try{const data=await window.ClubAccount.getOperatorDashboard();if(token===request&&dialog.open)render(data);}
 catch(error){if(error?.code==='PT403'){operator=false;opener.hidden=true;dialog.close();}else if(token===request&&dialog.open)status.textContent=tr('운영 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.');}
 finally{loading=false;refresh.disabled=false;if(dialog.open&&!document.hidden)dashboardTimer=setTimeout(refreshDashboard,token===request?30000:0);}
}
async function beat(){
 clearTimeout(heartbeatTimer);if(document.hidden||beating)return;
 if(Date.now()-lastBeat<5000){heartbeatTimer=setTimeout(beat,5000);return;}
 beating=true;lastBeat=Date.now();
 try{const activity=window.ClubCareer.hasActiveMatch()?'match':window.ClubCareer.isMap()?'map':'practice',result=await window.ClubAccount.presenceHeartbeat(activity);operator=!!result?.operator;opener.hidden=!operator;if(!operator&&dialog.open)dialog.close();}
 catch{/* Presence failures must not interrupt play or saves. */}
 finally{beating=false;if(!document.hidden)heartbeatTimer=setTimeout(beat,30000);}
}
opener.onclick=()=>{if(!operator||window.ClubCareer.hasActiveMatch())return;dialog.showModal();close.focus();refreshDashboard();};close.onclick=()=>dialog.close();refresh.onclick=refreshDashboard;
dialog.addEventListener('close',()=>{request++;clearTimeout(dashboardTimer);opener.focus({preventScroll:true});});
document.addEventListener('visibilitychange',()=>{clearTimeout(heartbeatTimer);clearTimeout(dashboardTimer);if(!document.hidden){beat();if(dialog.open)refreshDashboard();}});
window.addEventListener('online',()=>{beat();if(dialog.open)refreshDashboard();});
window.addEventListener('pagehide',()=>{clearTimeout(heartbeatTimer);clearTimeout(dashboardTimer);});
window.addEventListener('pageshow',()=>{beat();if(dialog.open)refreshDashboard();});
beat();
})();
