(() => {
'use strict';
const tr=window.ClubI18n.t,el=id=>document.getElementById(id);
let request=0;
const opener=document.createElement('button');opener.id='rankingOpen';opener.type='button';opener.textContent='🏆 '+tr('랭킹');opener.setAttribute('aria-haspopup','dialog');opener.setAttribute('aria-controls','rankingDialog');el('mapPanel').after(opener);
const dialog=document.createElement('dialog');dialog.id='rankingDialog';dialog.className='ranking-dialog';dialog.setAttribute('aria-labelledby','rankingTitle');
dialog.innerHTML='<header class="ranking-header"><div><small>WORLD TOUR · LEADERBOARD</small><h2 id="rankingTitle">'+tr('유저 랭킹')+'</h2></div><button type="button" id="rankingClose" aria-label="'+tr('랭킹 닫기')+'">'+tr('닫기')+' ×</button></header><p class="ranking-rules">'+tr('거점 → 별 → 레벨 → 승리 순 · 같은 기록은 공동 순위')+'</p><section id="rankingMine" class="ranking-mine" aria-label="'+tr('내 순위')+'" hidden></section><div class="ranking-toolbar"><b>'+tr('상위 50명')+'</b><span id="rankingTotal"></span><button type="button" id="rankingRefresh">↻ '+tr('새로고침')+'</button></div><p id="rankingStatus" role="status"></p><div class="ranking-scroll"><table class="ranking-table"><thead><tr><th scope="col">'+tr('순위')+'</th><th scope="col">'+tr('선수')+'</th><th scope="col">'+tr('진행도')+'</th><th scope="col">'+tr('레벨')+'</th><th scope="col">'+tr('승리')+'</th></tr></thead><tbody id="rankingRows"></tbody></table></div><p id="rankingUpdated" class="ranking-updated"></p>';
document.body.append(dialog);
const text=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;};
const number=value=>Math.max(0,Math.floor(Number(value)||0));
function identity(player){const name=document.createElement('span');name.className='ranking-name';name.append(text('i',Array.from(String(player.display_name||'Player'))[0]||'?','ranking-avatar'),text('b',player.display_name||'Player'));if(player.is_me)name.append(text('small',tr('나'),'ranking-you'));return name;}
function progress(player){const box=document.createElement('span');box.className='ranking-progress';box.append(text('b',number(player.cleared)+' / 40'),text('small','★ '+number(player.stars)+' / 120'));return box;}
function render(data){
 const rows=el('rankingRows');rows.replaceChildren();const players=Array.isArray(data.players)?data.players.slice(0,50):[];
 for(const player of players){const row=document.createElement('tr');row.dataset.me=String(!!player.is_me);const rank=number(player.rank);row.dataset.podium=rank<=3?String(rank):'';const rankCell=text('td',String(rank),'ranking-position'),name=document.createElement('td'),journey=document.createElement('td');name.append(identity(player));journey.append(progress(player));row.append(rankCell,name,journey,text('td','Lv. '+number(player.level)),text('td',number(player.wins).toLocaleString()));rows.append(row);}
 const mine=el('rankingMine');mine.hidden=false;mine.replaceChildren();
 if(data.mine){const p=data.mine,rank=document.createElement('div');rank.append(text('small',tr('내 순위')),text('strong','#'+number(p.rank)));const info=document.createElement('div');info.append(identity({...p,is_me:true}),text('small','Lv. '+number(p.level)+' · '+number(p.wins)+tr('승 ')+number(p.losses)+tr('패')));mine.append(rank,info,progress(p));}
 else mine.append(text('p',tr('선수 설정을 마치고 클라우드에 저장하면 순위가 등록돼요.')));
 el('rankingTotal').textContent=tr('참가 선수')+' '+number(data.total).toLocaleString();
 el('rankingStatus').textContent=data.savePending?tr('아직 저장되지 않은 기록이 있어요. 클라우드 저장 후 새로고침해주세요.'):players.length?'':tr('아직 등록된 선수가 없어요. 첫 번째 기록을 남겨보세요!');
 const fetched=new Date(data.fetched_at);el('rankingUpdated').textContent=Number.isNaN(fetched.getTime())?'':tr('갱신')+' · '+fetched.toLocaleTimeString(document.documentElement.lang,{hour:'2-digit',minute:'2-digit'});
}
async function refresh(){const token=++request,button=el('rankingRefresh');button.disabled=true;dialog.setAttribute('aria-busy','true');el('rankingStatus').textContent=tr('랭킹을 불러오는 중…');
 try{const data=await window.ClubAccount.getLeaderboard();if(token===request&&dialog.open)render(data);}
 catch{if(token===request&&dialog.open)el('rankingStatus').textContent=tr('랭킹을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.');}
 finally{if(token===request){button.disabled=false;dialog.removeAttribute('aria-busy');}}
}
opener.onclick=()=>{if(window.ClubCareer.hasActiveMatch())return;dialog.showModal();el('rankingClose').focus();refresh();};
el('rankingRefresh').onclick=refresh;el('rankingClose').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{request++;el('rankingRefresh').disabled=false;dialog.removeAttribute('aria-busy');opener.focus({preventScroll:true});});
})();
