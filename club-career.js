(() => {
'use strict';
const tr=window.ClubI18n.t,guest=!!window.ClubAccount?.guest;
const KEY=window.ClubAccount?.storageKey||'tomorrow-table-tennis-career-v1',W=1900,H=1060,overviewBounds={x:35,y:90,width:1800,height:880};
const regions=[tr('동네 탁구'),tr('동호회 거리'),tr('시·군 대회'),tr('전국 아마추어'),tr('실업 리그'),tr('국가대표 선발전'),tr('세계선수권'),tr('올림픽')];
const places=[
 [tr('골목 탁구대'),tr('공원 쉼터'),tr('학교 체육관'),tr('동네 탁구장'),tr('동네 최강자')],
 [tr('주말 동호회'),tr('직장인 클럽'),tr('대학 동아리'),tr('클럽 교류전'),tr('동호회 챔피언')],
 [tr('구민 체육관'),tr('시민 리그'),tr('시·군 예선'),tr('시·군 준결승'),tr('시·군 결승')],
 [tr('지역 대표전'),tr('전국 예선'),tr('전국 16강'),tr('전국 준결승'),tr('아마추어 왕좌')],
 [tr('실업팀 테스트'),tr('루키 리그'),tr('실업 리그전'),tr('실업 준결승'),tr('실업 최강자')],
 [tr('대표팀 입소전'),tr('강화 훈련전'),tr('국가대표 예선'),tr('최종 선발전'),tr('태극마크')],
 [tr('국제 오픈'),tr('세계선수권 예선'),tr('세계선수권 8강'),tr('세계선수권 4강'),tr('세계 챔피언')],
 [tr('올림픽 예선'),tr('올림픽 16강'),tr('올림픽 8강'),tr('올림픽 준결승'),tr('올림픽 금메달')]
];
const people=[[tr('동네 친구'),tr('공원 단골'),tr('학교 선배'),tr('탁구장 고수'),tr('관장님')],[tr('주말 에이스'),tr('직장인 강자'),tr('대학 주장'),tr('클럽 대표'),tr('클럽 회장')],[tr('구민 에이스'),tr('시민 강자'),tr('수비 달인'),tr('공격 달인'),tr('시·군 챔피언')],[tr('지역 에이스'),tr('전국 신예'),tr('전국 강호'),tr('우승 후보'),tr('전국 챔피언')],[tr('실업팀 신예'),tr('팀 주전'),tr('리그 베테랑'),tr('리그 에이스'),tr('실업 챔피언')],[tr('대표팀 유망주'),tr('대표팀 후보'),tr('선발전 강호'),tr('대표팀 주전'),tr('대표팀 에이스')],[tr('국제 신예'),tr('세계 랭커'),tr('유럽의 벽'),tr('아시아 강자'),tr('세계 최강자')],[tr('올림픽 신예'),tr('올림픽 강호'),tr('메달 후보'),tr('금메달 후보'),tr('디펜딩 챔피언')]];
const styles=[tr('균형형'),tr('코스 공략형'),tr('발 빠른 수비형'),tr('강타형'),tr('올라운드 보스')];
const nodes=regions.flatMap((region,tier)=>Array.from({length:5},(_,step)=>{
 const row=tier<4?0:1,col=row?7-tier:tier,dir=row?-1:1;
 return {id:tier*5+step,tier,step,code:(tier+1)+'-'+(step+1),name:places[tier][step],opponent:people[tier][step],style:step===4?window.ClubBosses.forNode(tier*5+step).name:styles[step],boss:step===4,x:250+col*450+dir*(-150+step*75),y:280+row*500+[35,-40,35,-40,0][step]};
}));
const labels={power:tr('파워'),speed:tr('스피드'),defense:tr('수비'),attack:tr('공격'),control:tr('컨트롤')};
const equipment=window.ClubEquipment,slots=equipment.slots,catalog=equipment.items;
const baseGear=()=>Object.fromEntries(Object.keys(slots).map(slot=>[slot,slot+'-base']));
const won=value=>Math.round(value).toLocaleString('ko-KR')+tr('원');
let shopCategory='clothes',shopNotice='';
const skills=[
 {id:'quickstep',name:tr('퀵 스텝'),branch:tr('풋워크'),level:2,description:tr('단계마다 이동 속도 +3%'),effect:tr('이동 속도'),icon:'↗'},
 {id:'splitstep',name:tr('스플릿 스텝'),branch:tr('풋워크'),level:4,requires:'quickstep',description:tr('퀵 스텝 2단계 필요 · 단계마다 자세 회복 +8%'),effect:tr('자세 회복'),icon:'⇄'},
 {id:'placement',name:tr('핀포인트'),branch:tr('컨트롤'),level:2,description:tr('단계마다 코스 오차 5% 감소'),effect:tr('코스 정확도'),icon:'◎'},
 {id:'sweetspot',name:tr('정타 감각'),branch:tr('컨트롤'),level:4,requires:'placement',description:tr('핀포인트 2단계 필요 · 단계마다 크리티컬 타이밍 여유 +10%'),effect:tr('정타 타이밍'),icon:'✦'},
 {id:'powersmash',name:tr('파워 스매시'),branch:tr('파워'),level:2,description:tr('단계마다 스매시 위력 +5%'),effect:tr('스매시 위력'),icon:'ϟ'},
 {id:'fullswing',name:tr('전신 임팩트'),branch:tr('파워'),level:5,requires:'powersmash',description:tr('파워 스매시 2단계 필요 · 단계마다 모든 타구 위력 +3%'),effect:tr('타구 위력'),icon:'★'},
 {id:'chase',name:tr('사이드 커버'),branch:tr('풋워크'),level:12,requires:'splitstep',max:8,step:2,description:tr('단계마다 이동 속도 +1%'),icon:'↔'},
 {id:'balance',name:tr('밸런스 훈련'),branch:tr('풋워크'),level:18,requires:'chase',max:8,step:2,description:tr('단계마다 자세 회복 +2%'),icon:'◇'},
 {id:'reading',name:tr('코스 설계'),branch:tr('컨트롤'),level:12,requires:'sweetspot',max:8,step:2,description:tr('단계마다 코스 오차 1.5% 감소'),icon:'⌖'},
 {id:'touch',name:tr('섬세한 터치'),branch:tr('컨트롤'),level:18,requires:'reading',max:8,step:2,description:tr('단계마다 정타 타이밍 여유 +2%'),icon:'◉'},
 {id:'driveforce',name:tr('드라이브 단련'),branch:tr('파워'),level:12,requires:'fullswing',max:8,step:2,description:tr('단계마다 모든 타구 위력 +1%'),icon:'➚'},
 {id:'decisive',name:tr('결정타 단련'),branch:tr('파워'),level:18,requires:'driveforce',max:8,step:2,description:tr('단계마다 스매시 위력 +1.5%'),icon:'ϟ'},
 {id:'footmaster',name:tr('풋워크 마스터'),branch:tr('풋워크'),level:30,requires:'balance',max:12,step:5,description:tr('단계마다 이동 속도 +0.5% · 자세 회복 +1%'),icon:'♜'},
 {id:'controlmaster',name:tr('컨트롤 마스터'),branch:tr('컨트롤'),level:30,requires:'touch',max:12,step:5,description:tr('단계마다 코스 오차 1% 감소 · 정타 타이밍 여유 +1%'),icon:'✧'},
 {id:'powermaster',name:tr('임팩트 마스터'),branch:tr('파워'),level:30,requires:'decisive',max:12,step:5,description:tr('단계마다 모든 타구 위력 +0.5% · 스매시 위력 +1%'),icon:'★'}
];
const skillMax=s=>s.max||3,skillLevel=(s,rank)=>s.level+rank*(s.step||0);
function availableSkillRanks(s,level){return Math.max(0,Math.min(skillMax(s),s.step?Math.floor((level-s.level)/s.step)+1:level>=s.level?skillMax(s):0));}
const trainingGoals=[
 {id:'sweet',name:tr('정타 5회'),target:5,xp:60,coins:200},
 {id:'placement',name:tr('좌우 코스 번갈아 6회 타격'),target:6,xp:90,coins:300},
 {id:'finish',name:tr('찬스 볼 스매시로 득점'),target:1,xp:120,coins:450}
];
const matchStats=window.ClubMatchStats;
const emptyTraining=()=>({sweet:0,placement:0,lastSide:0,finish:0,claimed:[]});

const int=(v,lo,hi)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,Math.floor(v))):lo,need=l=>80+(l-1)*45;
const fresh=()=>({version:3,profile:window.ClubAvatar.defaults(),customized:false,level:1,xp:0,money:0,owned:Object.values(baseGear()),equipped:baseGear(),upgrades:{},stats:{power:0,speed:0,defense:0,attack:0,control:0},skills:Object.fromEntries(skills.map(s=>[s.id,0])),wins:0,losses:0,tierWins:regions.map(()=>0),rivalWins:regions.map(()=>0),stageMedals:Array(40).fill(0),training:emptyTraining(),cleared:[],mapNode:0,journey:null,activeMatch:null,lastResult:null});
let data=fresh(),storageOK=true,saveMessage=tr('자동 저장 준비'),startHandler=null,mapHandler=null,practiceHandler=null,suspendHandler=null,forfeitResume=null,selected=0,tab='stage',zoom=.65,mapDrag=null,fitMode=true,focusTier=null,drawerOpen=false,drawerOpener=null,pendingResult=false,journeyFrame=0,journeyToken=0,journeyActive=false,playerPoint=null,arrivalTimer=0;
function frontier(d=data){let i=0;while(i<nodes.length&&d.cleared.includes(i))i++;return Math.min(i,39);}
function unlocked(id,d=data){return id===0||d.cleared.includes(id-1);}
function normalize(raw){
 window.ClubSaveSafety.assert(raw);
 const d=fresh();d.level=int(raw.level,1,99);d.xp=int(raw.xp,0,need(d.level)-1);let budget=(d.level-1)*3,sp=d.level-1;
 for(const k of Object.keys(labels)){const previous=k==='speed'&&raw.version<3?raw.stats?.footwork:raw.stats?.[k];d.stats[k]=int(previous,0,budget);budget-=d.stats[k];}
 for(const skill of skills){const can=d.level>=skill.level&&(!skill.requires||d.skills[skill.requires]>=2);d.skills[skill.id]=can?int(raw.skills?.[skill.id],0,Math.min(availableSkillRanks(skill,d.level),sp)):0;sp-=d.skills[skill.id];}
 d.wins=int(raw.wins,0,1000000);d.losses=int(raw.losses,0,1000000);d.tierWins=regions.map((_,i)=>int(raw.tierWins?.[i],0,1000000));
 if(raw.version>=2){for(let i=0;i<40;i++){if(Array.isArray(raw.cleared)&&raw.cleared.includes(i)&&(i===0||d.cleared.includes(i-1)))d.cleared.push(i);}}
 else {
  let tier=0;while(tier<7&&d.tierWins[tier]>=2)tier++;
  const count=d.tierWins[7]>0?40:Math.min(40,tier*5+Math.min(4,d.tierWins[tier]*2));d.cleared=Array.from({length:count},(_,i)=>i);
 }
 d.stageMedals=nodes.map(n=>d.cleared.includes(n.id)?int(raw.stageMedals?.[n.id],0,7)|1:0);
 d.rivalWins=regions.map((_,i)=>d.cleared.includes(i*5+4)?int(raw.rivalWins?.[i],0,3):0);
 const m=raw.activeMatch;
 if(m&&Array.isArray(m.score)&&m.score.length===2){
  const id=raw.version>=2?m.node:int(m.tier,0,7)*5,score=m.score.map(v=>int(v,0,10000));
  if(Number.isInteger(id)&&nodes[id]&&unlocked(id,d)&&!(Math.max(...score)>=11&&Math.abs(score[0]-score[1])>=2)){const rival=m.mode==='rival',rank=int(m.rank,1,3);if(!rival||d.cleared.includes(id)&&nodes[id].boss&&rank<=Math.min(3,d.rivalWins[nodes[id].tier]+1))d.activeMatch={node:id,tier:nodes[id].tier,score,analysis:matchStats.clean(m.analysis)||matchStats.empty(score[0]+score[1]>0),...(rival?{mode:'rival',rank}:{})};}
 }
 const r=raw.lastResult;
 if(r&&Array.isArray(r.score)&&r.score.length===2){const id=raw.version>=2?r.node:int(r.tier,0,7)*5;if(nodes[id])d.lastResult={medals:r.mode!=='rival'&&r.medals?{mask:int(r.medals.mask,0,7),newBits:int(r.medals.newBits,0,7),bonusXp:int(r.medals.bonusXp,0,10000),bonusCoins:int(r.medals.bonusCoins,0,100000)}:null,analysis:matchStats.clean(r.analysis),node:id,tier:nodes[id].tier,mode:r.mode==='rival'?'rival':'stage',rank:int(r.rank,1,3),firstRivalClear:!!r.firstRivalClear,rewardId:catalog.some(i=>i.id===r.rewardId)?r.rewardId:null,won:!!r.won,forfeited:!!r.forfeited,score:r.score.map(v=>int(v,0,10000)),xp:int(r.xp,r.forfeited?-10000:0,10000),coins:int(r.coins,0,1000000),levels:int(r.levels,0,98),firstClear:!!r.firstClear,promoted:!!r.promoted};}
 d.money=raw.version>=3?int(raw.money,0,1000000000):Math.min(1000000000,d.wins*500+d.losses*120);
 if(raw.version>=3){
  d.owned=[...new Set([...d.owned,...catalog.filter(i=>Array.isArray(raw.owned)&&raw.owned.includes(i.id)).map(i=>i.id)])];
  for(const slot of Object.keys(slots)){const id=raw.equipped?.[slot];if(d.owned.includes(id)&&catalog.some(i=>i.id===id&&i.slot===slot))d.equipped[slot]=id;}
 }
 for(const item of window.ClubBosses.rewards)if(d.cleared.includes(item.unlockNode)&&!d.owned.includes(item.id))d.owned.push(item.id);
 for(const item of window.ClubBosses.rivalRewards)if(d.rivalWins[Math.floor(item.unlockNode/5)]>=3&&!d.owned.includes(item.id))d.owned.push(item.id);
 for(const item of catalog)if(d.owned.includes(item.id)&&Object.values(item.bonus).some(v=>v>0))d.upgrades[item.id]=int(raw.upgrades?.[item.id],0,5);
 const training=raw.training||{};for(const g of trainingGoals)d.training[g.id]=int(training[g.id],0,g.target);d.training.lastSide=[-1,0,1].includes(training.lastSide)?training.lastSide:0;d.training.claimed=trainingGoals.filter(g=>Array.isArray(training.claimed)&&training.claimed.includes(g.id)&&d.training[g.id]>=g.target).map(g=>g.id);
 d.mapNode=Number.isInteger(raw.mapNode)&&nodes[raw.mapNode]&&unlocked(raw.mapNode,d)?raw.mapNode:d.activeMatch?.node??frontier(d);
 d.profile=window.ClubAvatar.clean(raw.profile);d.customized=raw.customized===true;
 const journey=raw.journey;if(journey&&Number.isInteger(journey.from)&&journey.to===journey.from+1&&nodes[journey.to]&&d.cleared.includes(journey.from)&&journey.to===d.mapNode)d.journey={from:journey.from,to:journey.to};
 return d;
}
try{const text=guest?null:localStorage.getItem(KEY);if(text){const raw=JSON.parse(text);data=normalize(raw);if(raw.version<3){try{localStorage.setItem(KEY+'-v'+raw.version+'-backup',text);}catch(error){}saveMessage=tr('기존 성장·능력치 이관 완료 · 이전 경기 상금 정산');}}}
catch(error){let original='';try{original=localStorage.getItem(KEY)||'';}catch{}window.ClubSaveSafety.block(original,KEY);throw Object.assign(error,{saveBlocked:true});}
selected=data.activeMatch?.node??frontier();
const root=document.getElementById('career'),hub=document.getElementById('worldHub'),arena=document.getElementById('arena'),el=id=>document.getElementById(id);
root.innerHTML=tr('<div class="career-head"><div><small>ROAD TO OLYMPICS</small><strong id="careerLevel"></strong><span id="careerRank"></span></div><div class="career-xp"><label id="careerXpText" for="careerXp"></label><progress id="careerXp" max="80" value="0"></progress></div><span id="careerWallet" class="career-wallet"></span><nav class="career-nav"><a class="studio-return" href="https://mcroky.github.io/roky-studio/" aria-label="로키 스튜디오로 돌아가기">← 로키 스튜디오</a><button id="worldHome" type="button">월드맵</button><button id="practiceHome" type="button">연습장</button><button id="shopHome" type="button">상점</button><button id="campaignContinue" type="button">다음 도전</button><button id="forfeitMatch" type="button" hidden>기권하고 나가기</button></nav></div><small id="careerSave" role="status"></small>');
el('campaignContinue').insertAdjacentHTML('afterend','<button id="lastMatchReview" type="button" hidden>'+tr('최근 경기 분석')+'</button>');
root.insertAdjacentHTML('beforeend',tr("<dialog id=\"forfeitDialog\" class=\"forfeit-dialog\" aria-labelledby=\"forfeitTitle\"><small>FORFEIT MATCH</small><h2 id=\"forfeitTitle\">경기를 기권할까요?</h2><p>기권하면 패배로 기록되며, 경험치가 차감됩니다. 경기 보상은 받을 수 없어요.</p><strong id=\"forfeitPenalty\"></strong><p class=\"forfeit-note\">레벨업 필요 경험치의 20% 차감 (보유 경험치 한도) · 경험치는 0 아래로 내려가지 않으며 레벨과 투자한 능력치는 유지됩니다.</p><div><button type=\"button\" id=\"forfeitCancel\" autofocus>경기 계속하기</button><button type=\"button\" id=\"forfeitConfirm\">기권하고 나가기</button></div></dialog>"));
hub.innerHTML=[
 tr('<div class="world-title"><div><small>동네의 한 게임이, 세계의 무대까지.</small><h2>나의 탁구 여정</h2><p id="worldProgress"></p></div><div class="world-tools"><button id="mapFit" type="button">전체 보기</button><button id="mapPanel" type="button" aria-controls="campaignDrawer" aria-expanded="false">선수 정보 ☰</button><button id="mapCenter" type="button">현재 위치</button><button id="mapOut" type="button" aria-label="지도 축소">−</button><output id="mapZoom"></output><button id="mapIn" type="button" aria-label="지도 확대">+</button></div></div>'),
 '<nav id="regionNav" class="region-nav" aria-label="'+tr('전체 보기')+'">'+regions.map((name,i)=>'<button type="button" data-region="'+i+'" aria-pressed="false"><span class="chapter-number">'+String(i+1).padStart(2,'0')+'</span><span><b>'+name+'</b><small id="chapterProgress-'+i+'"></small></span></button>').join('')+'</nav>',
 tr('<div class="campaign-layout"><div class="world-viewport" id="worldViewport" tabindex="0" aria-label="40개 스테이지 월드맵. 스크롤하거나 드래그해서 탐색하세요."><div id="worldSpace"><div id="worldBoard"></div></div></div>'),
 tr('<button type="button" class="drawer-backdrop" id="drawerBackdrop" aria-label="정보창 닫기" tabindex="-1" aria-hidden="true"></button><aside id="campaignDrawer" class="campaign-aside" role="dialog" aria-modal="true" aria-labelledby="drawerTitle" aria-hidden="true" inert><div class="drawer-header"><b id="drawerTitle">선수 정보</b><button id="drawerClose" type="button" aria-label="정보창 닫기">닫기 ×</button></div><div class="campaign-tabs" role="tablist" aria-label="캠페인 메뉴"><button id="tab-stage" role="tab" aria-controls="panel-stage" data-tab="stage">스테이지</button><button id="tab-stats" role="tab" aria-controls="panel-stats" data-tab="stats">능력치</button><button id="tab-skills" role="tab" aria-controls="panel-skills" data-tab="skills">스킬 트리</button><button id="tab-shop" role="tab" aria-controls="panel-shop" data-tab="shop">상점</button></div>'),
 tr('<section id="panel-stage" role="tabpanel" aria-labelledby="tab-stage"><span id="nodeCode" class="node-code"></span><h3 id="nodeTitle"></h3><p id="nodeRegion"></p><div id="nodeOpponent" class="node-opponent"></div><p id="nodeRule"></p><div class="node-reward" id="nodeReward"></div><p id="nodeGate"></p><button id="careerStart" class="node-start" type="button"></button><p class="world-caption">승리하면 다음 거점 개방 · 11점, 2점 차 승리<br>첫 클리어 보너스 · 패배해도 경험치 획득</p></section>'),
 tr('<section id="panel-stats" role="tabpanel" aria-labelledby="tab-stats" hidden><h3>나의 선수</h3><p id="careerPoints"></p><div id="careerStats" class="career-stats"></div><p class="world-caption">레벨업마다 능력치 포인트 3개. 경기 종료 후 배분할 수 있어요.</p></section>'),
 tr('<section id="panel-skills" role="tabpanel" aria-labelledby="tab-skills" hidden><h3>나만의 플레이 스타일</h3><p id="skillPoints"></p><div id="skillTree"></div><p class="world-caption">레벨업마다 스킬 포인트 1개. 기초 3단계 · 심화 8단계 · 마스터 12단계. 다음 단계는 레벨에 따라 열립니다.</p></section>'),
 tr('<section id="panel-shop" role="tabpanel" aria-labelledby="tab-shop" hidden><h3>탁구 용품점</h3><p id="shopBalance"></p><div id="equippedList" class="equipped-list"></div><div id="gearBonusSummary" class="gear-bonus-summary"></div><p class="grade-guide">일반 → 고급 → 희귀 → 영웅 → 전설</p><div id="shopCategories" class="shop-categories"></div><div id="shopItems" class="shop-items"></div><p id="shopNotice" role="status" aria-live="polite"></p><p class="world-caption">구매·장착은 경기 종료 후 가능합니다. 모든 장비 슬롯에 등급과 능력치 옵션이 있으며 장착한 옵션만 합산됩니다. 선수 뒤 시점(2)에서 외형을 확인하세요.</p></section>'),
 '<div id="careerResult" class="career-result" role="status" aria-live="polite" hidden></div></aside></div>'
].join('');
el('nodeReward').insertAdjacentHTML('afterend','<section id="stageMedals" class="stage-medals"></section>');
el('nodeOpponent').insertAdjacentHTML('afterend','<div id="bossPreview" class="boss-preview" hidden></div>');
el('panel-stage').insertAdjacentHTML('beforeend','<section id="rivalPreview" class="rival-preview" hidden></section>');
el('panel-stage').insertAdjacentHTML('beforeend','<section id="trainingGoals" class="training-goals"></section><p id="trainingNotice" role="status"></p>');
el('careerResult').insertAdjacentHTML('afterend','<section id="matchReport" class="match-report" aria-label="'+tr('경기 분석')+'" hidden></section>');
let cachedLoadout=null,cachedBonuses=null;const opponentCache=new Map();
function points(){return (data.level-1)*3-Object.values(data.stats).reduce((a,b)=>a+b,0);}
function skillPoints(){return data.level-1-Object.values(data.skills).reduce((a,b)=>a+b,0);}
function enhancedGear(id){const item=catalog.find(i=>i.id===id);return item?equipment.enhance(item,data.upgrades[id]||0):null;}
function gearItems(){return Object.values(data.equipped).map(enhancedGear);}
function profile(){return {...data.profile};}
function appearance(){return cachedLoadout||(cachedLoadout=Object.fromEntries(gearItems().map(i=>[i.slot,{...i}])));}
function gearBonuses(loadout=appearance()){const g={speed:0,recovery:0,accuracy:0,power:0,guard:0};for(const item of Object.values(loadout))for(const [key,value] of Object.entries(item.bonus))g[key]=(g[key]||0)+value;return g;}
function gradeBadge(item){const grade=equipment.rarities[item.grade];return '<span class="item-grade" data-grade="'+item.grade+'">'+grade.name+'</span>';}
function compareGear(item){
 const current=enhancedGear(data.equipped[item.slot]);if(current.id===item.id)return tr('<small class="gear-comparison">현재 장착 중</small>');
 const keys=[...new Set([...Object.keys(current.bonus),...Object.keys(item.bonus)])];
 const lines=keys.map(key=>({key,delta:Math.round(((item.bonus[key]||0)-(current.bonus[key]||0))*1000)/10})).filter(v=>v.delta!==0);
 return tr('<div class="gear-comparison"><small>현재 장비 대비 옵션</small>')+(lines.length?lines.map(v=>'<span data-change="'+(v.delta>0?'up':'down')+'">'+equipment.effectLabels[v.key]+' '+(v.delta>0?'+':'')+v.delta+'%p</span>').join(''):tr('<span>능력치 변화 없음</span>'))+'</div>';
}
function bonuses(loadout=null){
 if(!loadout&&cachedBonuses)return cachedBonuses;
 const boost=n=>1-Math.exp(-n/12),s=data.skills,g=gearBonuses(loadout||appearance());
 const result={speed:1+.40*boost(data.stats.speed)+s.quickstep*.03+s.chase*.01+s.footmaster*.005+g.speed,recovery:1+.20*boost(data.stats.speed)+.40*boost(data.stats.defense)+s.splitstep*.08+s.balance*.02+s.footmaster*.01+g.recovery,accuracy:(1-.50*boost(data.stats.control))*(1-s.placement*.05)*(1-s.reading*.015)*(1-s.controlmaster*.01)*(1-g.accuracy),power:1+.35*boost(data.stats.power)+s.fullswing*.03+s.driveforce*.01+s.powermaster*.005+g.power,smashPower:1+.30*boost(data.stats.attack)+s.powersmash*.05+s.decisive*.015+s.powermaster*.01,sweetWindow:1+.30*boost(data.stats.attack)+s.sweetspot*.10+s.touch*.02+s.controlmaster*.01,guard:.35*boost(data.stats.defense)+g.guard,blockPower:1+.30*boost(data.stats.defense)};
 if(!loadout)cachedBonuses=result;return result;
}
function renderShop(){
 el('shopBalance').textContent=tr('보유 상금 ')+won(data.money)+(data.activeMatch?tr(' · 경기 종료 후 구매·장착'):'');
 el('equippedList').innerHTML=gearItems().map(i=>'<div><small>'+slots[i.slot]+'</small>'+gradeBadge(i)+'<span>'+i.name+'</span></div>').join('');
 el('gearBonusSummary').textContent=tr('장착 효과 합계 · ')+equipment.describe(gearBonuses());
 el('shopItems').innerHTML=catalog.filter(i=>i.slot===shopCategory&&(!i.bossReward||data.owned.includes(i.id))).sort((a,b)=>equipment.rarities[a.grade].order-equipment.rarities[b.grade].order||a.price-b.price).map(base=>{
  const i=enhancedGear(base.id),owned=data.owned.includes(i.id),equipped=data.equipped[i.slot]===i.id,locked=!!data.activeMatch||equipped||!owned&&data.money<i.price;
  return '<article class="shop-item" data-preview-card="'+i.id+'" data-grade="'+i.grade+'"><button type="button" data-preview="'+i.id+'" class="item-swatch '+i.slot+'" style="--item-color:'+(i.color||'#d8ddce')+';--item-accent:'+i.accent+'" aria-label="'+i.name+tr(' 착장 미리보기"></button><div>')+gradeBadge(i)+'<b>'+i.name+'</b><p class="item-effects">'+equipment.describe(i.bonus)+'</p>'+compareGear(i)+'<strong>'+(i.bossReward?tr('보스 전리품'):!i.price?tr('기본 지급'):won(i.price))+'</strong></div><button type="button" class="item-preview-button" data-preview="'+i.id+tr('">입어보기 · 능력치 비교</button><button type="button" data-item="')+i.id+'" '+(locked?'disabled':'')+'>'+(equipped?tr('장착 중'):owned?tr('장착'):data.money<i.price?tr('상금 부족'):tr('구매·장착'))+'</button>'+(owned&&Object.values(i.bonus).some(v=>v>0)?'<button type="button" class="gear-upgrade-button" data-upgrade="'+i.id+'" '+(data.activeMatch||i.level>=5?'disabled':'')+'>'+(i.level>=5?tr('최대 강화 +5'):tr('강화 미리보기')+' · +'+i.level+' → +'+(i.level+1))+'</button>':'')+'</article>';
 }).join('');
 el('shopCategories').querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===shopCategory)));
 el('shopNotice').textContent=shopNotice;
 el('shopItems').querySelectorAll('[data-upgrade]').forEach(button=>button.onclick=()=>openUpgrade(button.dataset.upgrade));
 el('shopItems').querySelectorAll('[data-item]').forEach(button=>button.onclick=()=>purchaseItem(button.dataset.item));
 el('shopItems').querySelectorAll('[data-preview]').forEach(button=>button.onclick=()=>previewItem(button.dataset.preview));
 el('shopItems').querySelectorAll('[data-preview-card]').forEach(card=>card.onclick=event=>{if(!event.target.closest('button'))previewItem(card.dataset.previewCard);});
}
function purchaseItem(id){
 const item=catalog.find(i=>i.id===id);if(!item||data.activeMatch||item.bossReward&&!data.owned.includes(id))return false;
 if(!data.owned.includes(id)){if(data.money<item.price)return false;data.money-=item.price;data.owned.push(id);shopNotice=item.name+tr(' 구매·장착 완료 · ')+won(item.price)+tr(' 사용');}
 else shopNotice=item.name+tr(' 장착 완료');data.equipped[item.slot]=id;save();return true;
}
function previewItem(id){
 const base=catalog.find(i=>i.id===id);if(!base)return;closeDrawer(false);
 const loadout=()=>({...appearance(),[base.slot]:enhancedGear(id)});
 avatarEditor.openFitting({getEquipment:loadout,onClose:()=>{if(!hub.hidden)openDrawer('shop');},onAction:()=>purchaseItem(id),getState:()=>{
  const item=enhancedGear(id),equipped=data.equipped[item.slot]===id,owned=data.owned.includes(id),before=bonuses(),after=bonuses(loadout());
  const metrics=[['speed',tr('이동 속도'),false],['recovery',tr('자세 회복'),false],['power',tr('타구 위력'),false],['accuracy',tr('코스 오차 감소'),true],['guard',tr('수비 보정'),false]];
  const rows=metrics.map(([key,label,inverse])=>{const value=b=>Math.round((inverse?1-b[key]:key==='guard'?b[key]:b[key]-1)*1000)/10,a=value(before),b=value(after),delta=Math.round((b-a)*10)/10;return '<tr><th>'+label+'</th><td>'+a+'%</td><td>'+b+'%</td><td data-change="'+(delta>0?'up':delta<0?'down':'same')+'">'+(delta>0?'+':'')+delta+'%p</td></tr>';}).join('');
  return {html:'<h3>'+gradeBadge(item)+item.name+'</h3><p>'+equipment.describe(item.bonus)+tr('</p><p>가격 ')+won(item.price)+tr(' · 보유 ')+won(data.money)+tr('</p><table><caption>능력치와 스킬을 포함한 전체 효과</caption><thead><tr><th>항목</th><th>현재</th><th>착용 후</th><th>변화</th></tr></thead><tbody>')+rows+'</tbody></table><p class="fitting-status">'+(equipped?tr('현재 장착 중입니다.'):data.activeMatch?tr('경기 종료 후 구매·장착할 수 있어요.'):!owned&&data.money<item.price?tr('상금이 부족해요. 미리보기는 자유롭게 볼 수 있어요.'):tr('미리보기 중에는 상금과 실제 장착 상태가 바뀌지 않습니다.'))+'</p>',action:equipped?tr('장착 중'):owned?tr('이 장비 장착'):tr('구매·장착 · ')+won(item.price),disabled:equipped||!!data.activeMatch||item.bossReward&&!owned||!owned&&data.money<item.price};
 }});
}
root.insertAdjacentHTML('beforeend','<dialog id="upgradeDialog" class="upgrade-dialog" aria-labelledby="upgradeTitle"><small>GEAR UPGRADE</small><h2 id="upgradeTitle"></h2><div id="upgradePreview"></div><p id="upgradeBalance"></p><p class="upgrade-rule">'+tr('강화는 실패하지 않습니다. 단계마다 기본 장비 옵션이 20%씩 증가하며 최대 +5까지 가능합니다.')+'</p><div class="upgrade-actions"><button type="button" id="upgradeCancel">'+tr('닫기')+'</button><button type="button" id="upgradeConfirm"></button></div></dialog>');
let upgradeItem=null;
function openUpgrade(id){
 const item=catalog.find(i=>i.id===id);if(!item||data.activeMatch||!data.owned.includes(id)||!Object.values(item.bonus).some(v=>v>0))return;
 const level=data.upgrades[id]||0;if(level>=5)return;
 upgradeItem=id;const before=enhancedGear(id),after=equipment.enhance(item,level+1),cost=equipment.upgradeCost(item,level),equipped=data.equipped[item.slot]===id;
 const rows=Object.keys(item.bonus).map(key=>{const a=Math.round(before.bonus[key]*1000)/10,b=Math.round(after.bonus[key]*1000)/10;return '<tr><th>'+equipment.effectLabels[key]+'</th><td>+'+a+'%</td><td>+'+b+'%</td><td>+'+(Math.round((b-a)*10)/10)+'%p</td></tr>';}).join('');
 el('upgradeTitle').textContent=before.name+' → +'+(level+1);
 el('upgradePreview').innerHTML=gradeBadge(item)+'<p>'+tr('장비 옵션 변화')+'</p><table><thead><tr><th>'+tr('항목')+'</th><th>'+tr('현재')+'</th><th>'+tr('강화 후')+'</th><th>'+tr('변화')+'</th></tr></thead><tbody>'+rows+'</tbody></table><p class="upgrade-equipped">'+(equipped?tr('현재 장착 중 · 강화하면 경기 능력치에 바로 반영됩니다.'):tr('보관 중인 장비 · 강화 후 장착해야 경기 능력치에 반영됩니다.'))+'</p>';
 el('upgradeBalance').textContent=tr('강화 비용')+' '+won(cost)+' · '+tr('보유 상금 ')+won(data.money)+(data.money>=cost?' → '+won(data.money-cost):' · '+tr('상금 부족'));
 el('upgradeConfirm').textContent=tr('강화하기')+' · '+won(cost);el('upgradeConfirm').disabled=data.money<cost;
 el('upgradeDialog').showModal();
}
el('upgradeCancel').onclick=()=>el('upgradeDialog').close();
el('upgradeDialog').addEventListener('close',()=>{upgradeItem=null;});
el('upgradeConfirm').onclick=()=>{
 const id=upgradeItem,item=catalog.find(i=>i.id===id);if(!item||data.activeMatch||!data.owned.includes(id))return;
 const level=data.upgrades[id]||0;if(level>=5)return;const cost=equipment.upgradeCost(item,level);if(data.money<cost)return;
 el('upgradeConfirm').disabled=true;data.money-=cost;data.upgrades[id]=level+1;upgradeItem=null;el('upgradeDialog').close();shopNotice=equipment.enhance(item,level+1).name+' · '+tr('강화 완료');save();
};
el('shopCategories').innerHTML=Object.entries(slots).map(([slot,label])=>'<button type="button" data-category="'+slot+'">'+label+'</button>').join('');
el('shopCategories').querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>{shopCategory=button.dataset.category;renderShop();});
el('careerStats').innerHTML=Object.keys(labels).map(k=>'<div class="career-stat"><div><b>'+labels[k]+'</b><small id="statHelp-'+k+'"></small></div><strong id="statValue-'+k+'"></strong><button type="button" data-stat="'+k+'" aria-label="'+labels[k]+tr(' 1포인트 올리기">+ 1</button></div>')).join('');
el('skillTree').innerHTML=[tr('풋워크'),tr('컨트롤'),tr('파워')].map(branch=>'<div class="skill-branch"><h4>'+branch+'</h4>'+skills.filter(s=>s.branch===branch).map(s=>'<div class="skill-card" id="skill-'+s.id+'"><span class="skill-icon" aria-hidden="true">'+s.icon+'</span><div><b>'+s.name+' <small id="rank-'+s.id+'"></small></b><p>'+s.description+'</p><small id="gate-'+s.id+'"></small></div><button type="button" data-skill="'+s.id+'" aria-label="'+s.name+tr(' 스킬 배우기">+</button></div>')).join('')+'</div>').join('');
function illustratedRegion(name,i){
 const row=i<4?0:1,col=row?7-i:i,x=40+col*450,y=110+row*500;
 const palettes=[['#bbd599','#85ad72'],['#b1d4b1','#71a691'],['#d9ce9f','#b5ac78'],['#b8d2ba','#82a990'],['#b4cbd7','#7b9faf'],['#ccc4df','#9e96bc'],['#b1d7cf','#7baea6'],['#edda9e','#cbb36e']];
 const [grass,edge]=palettes[i],coast='M42 68Q12 96 24 150Q-2 194 25 235Q20 290 75 306Q122 342 187 320Q240 344 299 318Q364 324 391 280Q428 254 403 202Q425 150 395 120Q395 65 340 57Q301 21 250 41Q193 17 146 43Q80 26 42 68Z';
 const tree=(tx,ty,s=1)=>'<g transform="translate('+tx+' '+ty+') scale('+s+')"><ellipse cy="16" rx="15" ry="5" fill="#45694a1c"/><path d="M0 0v17" stroke="#917457" stroke-width="5"/><path d="M0-30L-17-4H-10L-21 8H21L10-4H17Z" fill="'+edge+'"/><path d="M0-30L-13-9H0Z" fill="#ffffff23"/></g>';
 const house=(hx,hy,c)=>'<g transform="translate('+hx+' '+hy+')"><ellipse cy="27" rx="37" ry="8" fill="#425d4920"/><path d="M-30-8H30V25H-30Z" fill="#fff1d0"/><path d="M-38-8L0-35 38-8Z" fill="'+c+'"/><rect x="-7" y="6" width="14" height="19" rx="2" fill="#6c8d88"/><path d="M-23 3h9v10h-9zm37 0h9v10h-9z" fill="#a9d0d0"/><path d="M-30 24h60" stroke="#d7c6a2" stroke-width="4"/></g>';
 const stadium='<g transform="translate(210 269)"><ellipse cy="33" rx="73" ry="13" fill="#47645825"/><path d="M-66-7Q0-45 66-7V27Q0 60-66 27Z" fill="#eee9d5"/><ellipse cy="-7" rx="66" ry="28" fill="#fbf8e8"/><ellipse cy="-7" rx="49" ry="19" fill="#749b93"/><path d="M-29-14H29V2H-29Z M0-14V2" fill="#6195a0" stroke="#f8f5df" stroke-width="1.5"/><path d="M-52 13v14m15-7v14m15-10v14m15-12v14m15-12v14m15-15v14m15-19v13" stroke="'+edge+'" stroke-width="5"/></g>';
 let landmark='';
 if(i===0)landmark=house(125,265,'#d88b6e')+house(283,275,'#d9b36b')+'<g transform="translate(207 274)"><path d="M-29 0H29L23 19H-23Z" fill="#638e9d" stroke="#fff7df" stroke-width="2"/><path d="M-22 19v12m44-12v12M0 0v19" stroke="#f9edce" stroke-width="2"/><path d="M-29 8H29" stroke="#344f53" stroke-width="2"/></g>';
 else if(i===1)landmark=house(174,270,'#759f98')+house(258,278,'#d7967f')+'<path d="M153 249h43v12h-43z" fill="#f9e3a1"/><text x="174" y="258" font-size="8" text-anchor="middle" fill="#6a7965">PING PONG</text>';
 else if(i===2||i===4)landmark='<g transform="translate(210 256)"><ellipse cy="40" rx="77" ry="12" fill="#49635c20"/><path d="M-68-35H68V38H-68Z" fill="#e8eddf"/><path d="M-76-35L0-59 76-35Z" fill="'+edge+'"/><rect x="-18" y="8" width="36" height="30" fill="#739eac"/>'+Array.from({length:8},(_,k)=>'<rect x="'+(-54+k%4*30)+'" y="'+(-22+Math.floor(k/4)*16)+'" width="15" height="10" rx="2" fill="#a5c6ca"/>').join('')+'<path d="M0-61v-25l24 6-24 8" fill="#dc9a72" stroke="#8c8970" stroke-width="2"/></g>';
 else landmark=stadium+(i===7?'<g transform="translate(210 225)" fill="none" stroke-width="4"><circle cx="-24" r="11" stroke="#638cab"/><circle r="11" stroke="#65766a"/><circle cx="24" r="11" stroke="#ba7e70"/><circle cx="-12" cy="12" r="11" stroke="#d3ac54"/><circle cx="12" cy="12" r="11" stroke="#79a380"/></g>':'');
 return '<g id="region-'+i+'" class="map-region" transform="translate('+x+' '+y+')"><path d="'+coast+'" transform="translate(0 13)" fill="#466f7429"/><path d="'+coast+'" fill="#f5e6bd" stroke="#eaf1db" stroke-width="6"/><path d="'+coast+'" transform="translate(22 20) scale(.895 .87)" fill="'+grass+'"/><path d="M63 214Q104 190 142 216T226 205T359 220" fill="none" stroke="#fff3ce" stroke-width="20" stroke-linecap="round" opacity=".45"/>'+tree(57,160,.85)+tree(363,158,.9)+tree(57,267,.72)+tree(344,283,.75)+landmark+'<g class="region-label"><rect x="80" y="35" width="260" height="59" rx="22" fill="#fffbeb" stroke="'+edge+'" stroke-width="2"/><text x="210" y="59" text-anchor="middle" fill="#526b58" font-size="11" font-weight="700" letter-spacing="3">CHAPTER '+String(i+1).padStart(2,'0')+'</text><text x="210" y="82" text-anchor="middle" fill="#2e5145" font-size="23" font-weight="800">'+name+'</text></g><g class="region-stars" fill="#ffffffa8"><path d="M321 94l3-8 3 8 8 3-8 3-3 8-3-8-8-3Z"/><circle cx="80" cy="117" r="4"/></g></g>';
}

function drawMap(){
 const land=regions.map(illustratedRegion).join('');
 const ocean='<defs><pattern id="seaPattern" width="95" height="70" patternUnits="userSpaceOnUse"><path d="M12 35q10 7 20 0m27-21q8 5 16 0" fill="none" stroke="#f5fff2" stroke-width="2" opacity=".38"/></pattern><linearGradient id="seaTint" x2="0" y2="1"><stop stop-color="#b9d8d6"/><stop offset="1" stop-color="#cce3d9"/></linearGradient></defs><rect width="'+W+'" height="'+H+'" fill="url(#seaTint)"/><rect width="'+W+'" height="'+H+'" fill="url(#seaPattern)"/><path d="M310 525Q680 475 1000 535T1640 515" fill="none" stroke="#f1f8df" stroke-width="2" stroke-dasharray="5 12" opacity=".7"/><g transform="translate(950 525)" text-anchor="middle"><rect x="-200" y="-25" width="400" height="50" rx="25" fill="#f9f4df" stroke="#9dbab0" stroke-width="2"/><text y="6" fill="#567c74" font-size="18" font-weight="700" letter-spacing="5">ROAD TO OLYMPICS</text></g><g class="map-compass" transform="translate(1810 70)" fill="none" stroke="#6b968d" stroke-width="2" opacity=".65"><circle r="25"/><path d="M0-35V35M-35 0H35M0-19L8 8 0 3-8 8Z" fill="#f8f4df"/><text y="-43" text-anchor="middle" fill="#62887f" stroke="none" font-size="13">N</text></g>';
 const routes=nodes.slice(1).map((n,i)=>{const a=nodes[i],mid=(a.x+n.x)/2;return '<path id="route-'+i+'" d="M'+a.x+' '+a.y+' C'+mid+' '+a.y+' '+mid+' '+n.y+' '+n.x+' '+n.y+'" fill="none" stroke="#b1bba0" stroke-width="6" stroke-linecap="round" stroke-dasharray="3 12"/>';}).join('');
 el('worldBoard').innerHTML='<svg class="world-art" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true">'+ocean+land+routes+'</svg>'+nodes.map(n=>'<button type="button" class="world-node'+(n.boss?' boss':'')+'" data-node="'+n.id+'" style="left:'+n.x+'px;top:'+n.y+'px"><span class="node-medal" aria-hidden="true"></span><span class="node-stars" aria-hidden="true"></span><b>'+n.code+'</b><small>'+n.name+'</small></button>').join('');
 el('worldBoard').querySelectorAll('[data-node]').forEach(button=>button.onclick=()=>{finishMapJourney();selected=Number(button.dataset.node);render();if(fitMode){focusRegion(nodes[selected].tier);return;}openDrawer('stage');});
 el('worldBoard').insertAdjacentHTML('beforeend',tr('<button type="button" id="worldPlayer" class="world-player" aria-label="내 선수 정보"><span class="player-tag" id="worldPlayerTag"></span><span class="map-avatar"><svg class="map-figure" viewBox="0 0 72 100" aria-hidden="true"><ellipse cx="36" cy="94" rx="21" ry="5" fill="#304a3830"/><g class="map-leg leg-left"><path d="M28 67L26 87" stroke="#d7a883" stroke-width="8" stroke-linecap="round"/><path d="M23 88h11" stroke="var(--map-shoes)" stroke-width="9" stroke-linecap="round"/></g><g class="map-leg leg-right"><path d="M43 67L46 87" stroke="#d7a883" stroke-width="8" stroke-linecap="round"/><path d="M43 88h11" stroke="var(--map-shoes)" stroke-width="9" stroke-linecap="round"/></g><g class="map-arm arm-left"><path d="M23 43L16 62" stroke="#ddb18d" stroke-width="7" stroke-linecap="round"/></g><g class="map-arm arm-right"><path d="M49 43L56 61" stroke="#ddb18d" stroke-width="7" stroke-linecap="round"/><path d="M57 61l4 11" stroke="#a98050" stroke-width="4"/><ellipse cx="62" cy="76" rx="7" ry="9" fill="var(--map-racket)" stroke="#bf9a69" stroke-width="2"/></g><path d="M25 37L47 37 51 62Q36 70 21 62Z" fill="var(--map-shirt)" stroke="#ffffff80" stroke-width="1.5"/><path d="M23 62h26l-2 13H25Z" fill="#344a43"/><text x="36" y="57" text-anchor="middle" fill="var(--map-trim)" font-size="16" font-weight="800">7</text><rect x="31" y="30" width="10" height="11" rx="4" fill="#d7a680"/><ellipse cx="36" cy="22" rx="15" ry="17" fill="#ddb18d"/><path d="M21 23Q17 3 35 3Q54 1 52 23L45 12 28 16Z" fill="#3d3832"/><path class="map-headband" d="M22 17Q36 13 50 17" fill="none" stroke="var(--map-band)" stroke-width="5"/><circle cx="30" cy="24" r="1.6" fill="#344238"/><circle cx="42" cy="24" r="1.6" fill="#344238"/><path d="M32 31q4 3 8 0" fill="none" stroke="#976b52" stroke-width="1.5"/></svg></span></button>'));
 el('worldViewport').insertAdjacentHTML('afterend',tr('<div id="newRegionBanner" class="new-region-banner" role="status"><small>NEW REGION UNLOCKED</small><strong id="newRegionName"></strong><span>새로운 무대가 열렸어요!</span><i aria-hidden="true">✦</i></div><div id="mapJourneyNotice" class="map-journey-notice" role="status" aria-live="polite"></div>'));
 el('worldPlayer').onclick=()=>{finishMapJourney();closeDrawer(false);avatarEditor.open(!data.customized);};
}
function updateMapPlayer(){
 const wear=appearance(),look=profile(),player=el('worldPlayer');if(!player)return;player.dataset.legendary=String(Object.values(wear).some(item=>item.grade==='legendary'));
 player.style.setProperty('--map-shirt',wear.clothes.color);player.style.setProperty('--map-trim',wear.clothes.accent);player.style.setProperty('--map-shoes',wear.shoes.color);player.style.setProperty('--map-racket',wear.racket.color);player.style.setProperty('--map-band',wear.headband.color||'transparent');
 player.querySelectorAll('[fill="#ddb18d"],[fill="#d7a680"]').forEach(e=>e.setAttribute('fill','var(--map-skin)'));
 player.querySelectorAll('[stroke="#ddb18d"],[stroke="#d7a883"]').forEach(e=>e.setAttribute('stroke','var(--map-skin)'));
 const head=player.querySelector('.map-figure>ellipse[cx="36"][cy="22"]');if(head){head.setAttribute('rx',look.face==='round'?18:look.face==='angular'?17:16.5);head.setAttribute('ry',look.face==='round'?17.5:18);}
 const hair=player.querySelector('.map-figure>path[fill="#3d3832"],.map-hair');if(hair){hair.classList.add('map-hair');hair.setAttribute('fill','var(--map-hair)');hair.setAttribute('d',look.hairStyle==='crop'?'M21 18Q20 5 35 5Q51 4 51 18L45 13 27 14Z':look.hairStyle==='pony'?'M21 23Q17 3 35 3Q54 1 52 23L46 12 27 15Z M49 8Q65 9 57 31L53 22Z':'M21 23Q17 3 35 3Q54 1 52 23L45 12 28 16Z');}
 player.style.setProperty('--map-skin',look.skin);player.style.setProperty('--map-hair',look.hairColor);
 el('worldPlayerTag').textContent=look.name+' · Lv.'+data.level;
 const location=nodes[data.journey?.from??data.mapNode];player.setAttribute('aria-label',tr('내 선수 · 레벨 ')+data.level+' · '+nodes[data.mapNode].name);
 if(!journeyActive)placeMapPlayer(location);
}
function placeMapPlayer(point){
 const player=el('worldPlayer');if(!player||!point)return;
 if(playerPoint&&Math.abs(point.x-playerPoint.x)>.03)player.style.setProperty('--map-facing',point.x<playerPoint.x?-1:1);
 player.style.left=point.x+'px';player.style.top=(point.y-24)+'px';playerPoint={x:point.x,y:point.y};
 if(journeyActive&&!fitMode){const v=el('worldViewport'),x=point.x*zoom,y=point.y*zoom,left=v.scrollLeft,top=v.scrollTop;v.scrollLeft=Math.max(x-v.clientWidth*.75,Math.min(left,x-v.clientWidth*.25));v.scrollTop=Math.max(y-v.clientHeight*.75,Math.min(top,y-v.clientHeight*.35));}
}
function finishMapJourney(){
 journeyToken++;clearTimeout(arrivalTimer);hub.querySelectorAll('.player-arrival').forEach(node=>node.classList.remove('player-arrival'));if(journeyFrame)cancelAnimationFrame(journeyFrame);journeyFrame=0;journeyActive=false;
 el('worldPlayer')?.classList.remove('walking','arrived','celebrating');el('journeyTrail')?.remove();
 if(data.journey){data.mapNode=data.journey.to;data.journey=null;save();}
 hub.querySelectorAll('.region-unlocking').forEach(e=>e.classList.remove('region-unlocking'));el('newRegionBanner').classList.remove('visible');hub.classList.remove('region-unlock');
 placeMapPlayer(nodes[data.mapNode]);el('mapJourneyNotice')?.classList.remove('visible');
}
function playMapJourney(done=()=>{}){
 const trip=data.journey;if(!trip||hub.hidden){done();return;}
 const path=el('route-'+trip.from),player=el('worldPlayer'),notice=el('mapJourneyNotice');if(!path){finishMapJourney();done();return;}
 const token=++journeyToken;journeyActive=true;placeMapPlayer(nodes[trip.from]);
 const length=path.getTotalLength(),trail=path.cloneNode();trail.id='journeyTrail';trail.setAttribute('stroke','#e1ab4e');trail.setAttribute('stroke-width','10');trail.setAttribute('stroke-dasharray',length+' '+length);trail.setAttribute('stroke-dashoffset',String(length));el('worldBoard').querySelector('svg').appendChild(trail);
 notice.textContent=nodes[trip.from].code+tr(' 클리어! ')+nodes[trip.to].name+tr('으로 이동');notice.classList.add('visible');
 const newRegion=nodes[trip.from].boss&&nodes[trip.to].tier!==nodes[trip.from].tier;
 if(newRegion){el('newRegionName').textContent=regions[nodes[trip.to].tier];el('newRegionBanner').classList.add('visible');hub.classList.add('region-unlock');el('region-'+nodes[trip.to].tier).classList.add('region-unlocking');player.classList.add('celebrating');}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?0:Math.min(2300,Math.max(1100,length*3.5)),delay=reduced?0:newRegion?1600:380;let started=null;
 const step=time=>{
  if(token!==journeyToken)return;if(hub.hidden){finishMapJourney();return;}if(started===null)started=time;
  const elapsed=time-started-delay,u=duration?Math.max(0,Math.min(1,elapsed/duration)):1,e=u*u*(3-2*u);
  if(elapsed>=0){player.classList.remove('celebrating');el('newRegionBanner').classList.remove('visible');hub.classList.remove('region-unlock');if(!reduced)player.classList.add('walking');}placeMapPlayer(path.getPointAtLength(length*e));trail.setAttribute('stroke-dashoffset',String(length*(1-e)));
  if(u<1){journeyFrame=requestAnimationFrame(step);return;}
  journeyFrame=0;journeyActive=false;el('region-'+nodes[trip.to].tier).classList.remove('region-unlocking');player.classList.remove('walking');trail.remove();data.mapNode=trip.to;data.journey=null;save();if(!fitMode)focusRegion(nodes[trip.to].tier);
  const destination=el('worldBoard').querySelector('[data-node="'+trip.to+'"]');destination.classList.add('player-arrival');player.classList.add('arrived');notice.textContent=nodes[trip.to].code+' '+nodes[trip.to].name+tr(' 도착!');
  clearTimeout(arrivalTimer);arrivalTimer=setTimeout(()=>{destination.classList.remove('player-arrival');player.classList.remove('arrived');if(token!==journeyToken)return;notice.classList.remove('visible');if(!hub.hidden&&!drawerOpen)done();},reduced?100:700);
 };journeyFrame=requestAnimationFrame(step);
}
function setTab(next){tab=next;['stage','stats','skills','shop'].forEach(t=>{el('panel-'+t).hidden=t!==tab;el('tab-'+t).setAttribute('aria-selected',String(t===tab));el('tab-'+t).tabIndex=t===tab?0:-1;});}
function render(){
 const b=bonuses(),m=data.activeMatch,n=nodes[selected],p=points(),sp=skillPoints();window.ClubI18n.setLocked(!!m);window.ClubAccount?.updateLock(!!m);
 updateMapPlayer();
 renderTraining();renderRivals();renderStageMedals();
 el('careerWallet').textContent=tr('상금 ')+won(data.money);renderShop();
 el('careerLevel').textContent='Lv. '+data.level;el('careerRank').textContent=data.cleared.includes(39)?tr('올림픽 챔피언'):regions[Math.floor(frontier()/5)]+tr(' 도전자');
 el('careerXpText').textContent=data.level>=99?tr('최고 레벨'):data.xp+' / '+need(data.level)+' XP';el('careerXp').max=need(data.level);el('careerXp').value=data.level>=99?need(data.level):data.xp;
 updateRegionNav();el('worldProgress').textContent=data.cleared.length+tr(' / 40 거점 클리어 · ')+tr('별 ')+data.stageMedals.reduce((sum,mask)=>sum+countStars(mask),0)+' / 120 · '+data.wins+tr('승 ')+data.losses+tr('패 · 능력치 ')+p+tr('P / 스킬 ')+sp+'SP';
 el('campaignContinue').textContent=m?tr('진행 중 경기 이어하기'):data.cleared.includes(39)?tr('금메달 방어전'):tr('다음 거점 도전');el('campaignContinue').disabled=!startHandler||!!m&&hub.hidden;
 for(const id of ['worldHome','practiceHome','shopHome']){el(id).disabled=!!m;el(id).title=m?tr('경기 종료 또는 기권 후 이동할 수 있어요.'):'';}el('forfeitMatch').hidden=!m;
 el('nodeCode').textContent=n.code+' · '+(n.boss?tr('BOSS STAGE'):tr('CHALLENGE'));
 el('nodeTitle').textContent=n.name;el('nodeRegion').textContent=regions[n.tier]+' / '+(n.step+1)+tr('번째 거점')+(window.ClubVenues?' · '+window.ClubVenues.forTier(n.tier).name:'');
 const boss=window.ClubBosses.forNode(n.id);el('bossPreview').hidden=!boss;if(boss)el('bossPreview').innerHTML='<b>'+tr('보스 공략')+' · '+boss.name+'</b><p>'+boss.hint+'</p><small>'+tr('전용 보상')+' · '+boss.reward.name+' · '+equipment.describe(boss.reward.bonus)+'</small><small>'+tr('획득 칭호')+' · '+boss.title+'</small>';
 el('nodeOpponent').textContent=n.opponent+' · '+n.style;el('nodeRule').textContent=n.boss?tr('지역 최강자를 꺾고 다음 무대로 나아가세요.'):tr('한 명씩 이기며 나만의 플레이를 만들어보세요.');
 el('nodeReward').textContent=tr('승리 XP +')+reward(n.id,true,!data.cleared.includes(n.id),0)+(data.cleared.includes(n.id)?tr(' · 재도전'):tr(' · 첫 클리어 보너스 포함'))+tr(' / 상금 ')+won(prize(n.id,true,!data.cleared.includes(n.id),0));
 el('nodeGate').textContent=m?tr('진행 중: ')+nodes[m.node].code+' '+nodes[m.node].name+' · '+m.score.join(' : '):!unlocked(n.id)?tr('이전 거점 ')+nodes[n.id-1].code+tr(' 클리어 필요'):data.cleared.includes(n.id)?tr('클리어 완료 · 다시 도전해서 경험치를 얻을 수 있어요.'):tr('도전 가능 · 승리하면 다음 거점이 열려요.');
 el('careerStart').textContent=m?tr('진행 중 경기 이어하기'):data.cleared.includes(n.id)?tr('다시 도전'):tr('이 상대에게 도전');
 el('careerStart').disabled=!startHandler||(!m&&!unlocked(n.id));
 el('careerPoints').textContent=tr('남은 능력치 ')+p+'P'+(m?tr(' · 경기 종료 후 배분'):'');
 const help={speed:tr('이동 +')+Math.round((b.speed-1)*100)+tr('% · 회복 +')+Math.round((b.recovery-1)*100)+'%',defense:tr('자세 회복 +')+Math.round((b.recovery-1)*100)+tr('% · 수비 리턴 +')+Math.round((b.blockPower-1)*100)+'%',attack:tr('스매시 +')+Math.round((b.smashPower-1)*100)+tr('% · 정타 여유 +')+Math.round((b.sweetWindow-1)*100)+'%',control:tr('코스 오차 −')+Math.round((1-b.accuracy)*100)+'%',power:tr('타구 위력 +')+Math.round((b.power-1)*100)+'%'};
 for(const k of Object.keys(labels)){el('statValue-'+k).textContent=1+data.stats[k];el('statHelp-'+k).textContent=help[k];rootButton('[data-stat="'+k+'"]').disabled=p<=0||!!m;}
 el('skillPoints').textContent=tr('남은 스킬 ')+sp+'SP'+(m?tr(' · 경기 종료 후 습득'):tr(' · 한 단계에 1SP'));
 for(const s of skills){const rank=data.skills[s.id],level=skillLevel(s,rank),allowed=data.level>=level&&(!s.requires||data.skills[s.requires]>=2);el('rank-'+s.id).textContent=rank+' / '+skillMax(s);el('gate-'+s.id).textContent=rank===skillMax(s)?tr('최대 단계'):data.level<level?'Lv. '+level+tr(' 필요'):s.requires&&data.skills[s.requires]<2?tr('선행 스킬 2단계 필요'):m?tr('경기 종료 후 습득'):tr('습득 가능 · 1SP');el('skill-'+s.id).dataset.learned=String(rank>0);rootButton('[data-skill="'+s.id+'"]').disabled=!!m||sp<=0||!allowed||rank>=skillMax(s);}
 for(const node of nodes){const button=el('worldBoard').querySelector('[data-node="'+node.id+'"]'),clear=data.cleared.includes(node.id),open=unlocked(node.id);button.dataset.state=clear?'cleared':open?'open':'locked';button.dataset.mastered=String(data.stageMedals[node.id]===7);button.querySelector('.node-stars').textContent=open?starText(data.stageMedals[node.id]):'';button.setAttribute('aria-pressed',String(selected===node.id));button.setAttribute('aria-label',node.code+' '+node.name+' · '+(clear?tr('클리어'):open?tr('도전 가능'):tr('잠김'))+' · '+countStars(data.stageMedals[node.id])+' / 3');button.querySelector('.node-medal').textContent=clear?'✓':!open?'·':node.boss?'★':'🏓';if(node.id<39)el('route-'+node.id).setAttribute('stroke',clear?'#56876b':'#b1bba0');}
 for(let i=0;i<regions.length;i++){const region=el('region-'+i);region.dataset.locked=String(i>Math.floor(frontier()/5));region.dataset.current=String(i===Math.floor(frontier()/5));}
 document.querySelector('.scoreboard>div>span').textContent=data.profile.name;
 const r=data.lastResult;el('careerResult').hidden=!r;const report=el('matchReport');el('lastMatchReview').hidden=!r?.analysis;el('lastMatchReview').disabled=!!m;report.hidden=!r?.analysis;if(r?.analysis)report.innerHTML=matchStats.markup(r.analysis);
 if(r?.forfeited)el('careerResult').textContent=tr('기권 패배 · ')+nodes[r.node].name+' · XP −'+Math.abs(r.xp)+tr(' · 경기 보상 없음');
 else if(r)el('careerResult').textContent=(r.won?tr('승리! '):tr('다시 도전! '))+nodes[r.node].name+' '+r.score.join(' : ')+' · XP +'+r.xp+tr(' · 상금 +')+won(r.coins||0)+(r.firstClear?tr(' · 첫 클리어!'):'')+(r.levels?tr(' · 레벨업! 능력치 +')+r.levels*3+tr('P / 스킬 +')+r.levels+'SP':'')+(r.promoted?tr(' · 새 지역 개방!'):'')+(r.node===39&&r.won&&r.mode!=='rival'?tr(' · 올림픽 금메달!'):'')+(r.mode==='rival'?' · '+tr('라이벌 재대결')+' '+r.rank+tr('단계')+(r.firstRivalClear?' · '+tr('단계 돌파!'):''):'');
 if(r?.medals?.newBits)el('careerResult').textContent+=' · '+tr('새 별 획득')+' '+starText(r.medals.mask)+(r.medals.bonusXp?' · '+tr('3성 보너스 포함'): '');
 el('careerSave').textContent=saveMessage;el('careerSave').dataset.ok=String(storageOK);
 if(r?.rewardId){const trophy=catalog.find(i=>i.id===r.rewardId);if(trophy)el('careerResult').textContent+=' · '+tr('보스 클리어 보상 획득')+' · '+trophy.name+' · '+(r.mode==='rival'?window.ClubBosses.rivalTitle(r.tier):window.ClubBosses.forNode(r.node).title);}
}
function countStars(mask){return (mask&1)+((mask>>1)&1)+((mask>>2)&1);}
function starText(mask){return [1,2,4].map(bit=>mask&bit?'★':'☆').join('');}
function medalBonus(n){return {xp:80+n.tier*25+(n.boss?40:0),coins:300+n.tier*150+(n.boss?250:0)};}
function updateStageMedals(n,win,score,analysis){
 const previous=data.stageMedals[n.id],a=matchStats.clean(analysis);let mask=previous;
 if(win){mask|=1;if(a&&!a.partial&&a.hits>=5&&a.center/a.hits>=.5)mask|=2;if(score[1]<=5)mask|=4;}
 data.stageMedals[n.id]=mask;const reward=mask===7&&previous!==7?medalBonus(n):{xp:0,coins:0};
 return {mask,newBits:mask&~previous,bonusXp:reward.xp,bonusCoins:reward.coins};
}
function renderStageMedals(){
 const n=nodes[selected],mask=data.stageMedals[n.id],reward=medalBonus(n);
 const goals=[tr('승리하기'),tr('승리 + 타격 5회 이상 · 정타율 50% 이상'),tr('승리 + 실점 5점 이하')];
 el('stageMedals').innerHTML='<h4>'+tr('3성 도전')+' <span>'+starText(mask)+'</span></h4><ul>'+goals.map((text,i)=>'<li data-earned="'+!!(mask&(1<<i))+'"><span aria-hidden="true">'+(mask&(1<<i)?'★':'☆')+'</span>'+text+'</li>').join('')+'</ul><small>'+tr('목표는 여러 경기에서 나누어 달성할 수 있어요. 획득한 별은 유지됩니다.')+'</small><small>'+tr('별 수와 관계없이 승리하면 다음 거점이 열립니다.')+'</small><p>'+tr('3성 첫 달성 보상')+' · XP +'+reward.xp+' · '+won(reward.coins)+' <b>'+(mask===7?tr('수령 완료'):tr('미달성'))+'</b></p><small>'+tr('일반 스테이지 경기만 집계 · 라이벌 재대결 제외')+'</small>';
}
function earnedTitles(){return [...data.cleared.filter(id=>id%5===4).map(id=>window.ClubBosses.forNode(id).title),...data.rivalWins.flatMap((v,i)=>v>=3?[window.ClubBosses.rivalTitle(i)]:[])].filter((v,i,a)=>a.indexOf(v)===i);}
function rivalReward(node,rank,win,first,score){
 return {xp:Math.round(reward(node,win,first,score)*(1+rank*.15)),coins:Math.round(prize(node,win,first,score)*(1+rank*.20))};
}
function renderRivals(){
 const n=nodes[selected],box=el('rivalPreview');box.hidden=!n.boss||!data.cleared.includes(n.id);if(box.hidden)return;
 const cleared=data.rivalWins[n.tier],item=window.ClubBosses.rivalRewards[n.tier];
 const hints=[tr('기본 패턴 강화'),tr('짧고 깊은 코스 혼합'),tr('변칙 코스와 강한 압박')];
 box.innerHTML='<h4>'+tr('라이벌 재대결')+' <small>AI · '+cleared+' / 3</small></h4><p>'+tr('클리어한 보스와 3단계 도전 · 순서대로 승리하면 다음 단계가 열려요.')+'</p><div class="rival-ranks">'+[1,2,3].map(rank=>{
 const done=rank<=cleared,locked=rank>cleared+1,r=rivalReward(n.id,rank,true,!done,0);
 return '<button type="button" data-rival="'+rank+'" data-state="'+(done?'cleared':locked?'locked':'open')+'" '+(locked||data.activeMatch||!startHandler?'disabled':'')+'><b>'+(done?'✓ ':locked?'🔒 ':'')+rank+tr('단계')+'</b><span>'+hints[rank-1]+'</span><small>XP +'+r.xp+' · '+won(r.coins)+'</small></button>';
 }).join('')+'</div><small>'+tr('3단계 첫 승리 보상')+' · '+item.name+' · '+equipment.describe(item.bonus)+'</small><small>'+tr('획득 칭호')+' · '+window.ClubBosses.rivalTitle(n.tier)+'</small>';
 box.querySelectorAll('[data-rival]').forEach(button=>button.onclick=()=>launchRival(Number(button.dataset.rival)));
}
function launchRival(rank){
 const n=nodes[selected];if(!startHandler||data.activeMatch||!n.boss||!data.cleared.includes(n.id)||!Number.isInteger(rank)||rank<1||rank>Math.min(3,data.rivalWins[n.tier]+1))return;
 if(!data.customized){avatarEditor.open(true);return;}
 data.activeMatch={node:n.id,tier:n.tier,score:[0,0],analysis:matchStats.empty(),mode:'rival',rank};launch();
}
function completeRivalMatch(m,score){
 const n=nodes[m.node],won=score[0]>score[1],first=won&&m.rank===data.rivalWins[n.tier]+1;
 const {xp,coins}=rivalReward(n.id,m.rank,won,first,score[0]),levels=grantExperience(xp);
 data.money=Math.min(1000000000,data.money+coins);if(won)data.wins++;else data.losses++;
 if(first)data.rivalWins[n.tier]=m.rank;
 const trophy=first&&m.rank===3?window.ClubBosses.rivalRewards[n.tier]:null;
 if(trophy&&!data.owned.includes(trophy.id))data.owned.push(trophy.id);
 data.lastResult={analysis:matchStats.clean(m.analysis),mode:'rival',rank:m.rank,firstRivalClear:first,rewardId:trophy?.id||null,won,node:n.id,tier:n.tier,score:[...score],xp,coins,levels,firstClear:false,promoted:false};
 data.mapNode=n.id;data.journey=null;data.activeMatch=null;selected=n.id;pendingResult=true;
 setTab(levels?'skills':'stage');save();return {...data.lastResult};
}
function grantExperience(amount){
 const old=data.level;data.xp+=amount;while(data.level<99&&data.xp>=need(data.level)){data.xp-=need(data.level);data.level++;}if(data.level===99)data.xp=0;return data.level-old;
}
function recordMatchEvent(event){const m=data.activeMatch;if(!m)return;if(!m.analysis)m.analysis=matchStats.empty(m.score[0]+m.score[1]>0);matchStats.record(m.analysis,event);}
function recordTraining(event){
 if(!data.activeMatch)return;
 const t=data.training;
 if(event.quality==='center')t.sweet=Math.min(5,t.sweet+1);
 if((event.course===-1||event.course===1)&&event.kind!=='edge'){if(t.lastSide!==event.course)t.placement=Math.min(6,t.placement+1);t.lastSide=event.course;}
 if(event.finish)t.finish=1;
}
function renderTraining(){
 const t=data.training;
 el('trainingGoals').innerHTML='<h4>'+tr('훈련 목표')+'</h4><p>'+tr('성장 경기에서 진행 · 보상은 경기 종료 후 한 번만 받을 수 있어요.')+'</p>'+trainingGoals.map(g=>{
 const claimed=t.claimed.includes(g.id),ready=t[g.id]>=g.target;
 return '<article class="training-goal"><div><b>'+g.name+'</b><small>'+t[g.id]+' / '+g.target+' · XP +'+g.xp+' · '+won(g.coins)+'</small><progress max="'+g.target+'" value="'+t[g.id]+'"></progress></div><button type="button" data-training="'+g.id+'" '+(claimed||!ready||data.activeMatch?'disabled':'')+'>'+(claimed?tr('수령 완료'):ready?tr('보상 받기'):tr('진행 중'))+'</button></article>';
 }).join('');
 el('trainingGoals').querySelectorAll('[data-training]').forEach(button=>button.onclick=()=>{
 const g=trainingGoals.find(g=>g.id===button.dataset.training);if(!g||data.activeMatch||t.claimed.includes(g.id)||t[g.id]<g.target)return;
 t.claimed.push(g.id);const levels=grantExperience(g.xp);data.money=Math.min(1000000000,data.money+g.coins);save();el('trainingNotice').textContent=tr('훈련 보상 획득')+' · XP +'+g.xp+' · '+won(g.coins)+(levels?tr(' · 레벨업! 능력치 +')+levels*3:'');
 });
}
function opponentConfig(){
 const match=data.activeMatch,n=nodes[match?.node??0],rank=match?.mode==='rival'?match.rank:0,key=n.id+':'+rank;if(opponentCache.has(key))return opponentCache.get(key);
 const progress=n.id/39,boss=window.ClubBosses.forNode(n.id),base={speed:.70+progress*.56+(n.step===2?.06:n.boss?.05:0),reaction:(1.7-progress*.95)*(n.boss?.90:1),power:.86+progress*.37+(n.step===3||n.boss?.04:0),placement:.65+progress*.49+(n.step===1?.08:0)};
 if(boss){base.boss={...boss,rank,name:boss.name+(rank?' · '+tr('라이벌 재대결')+' '+rank+tr('단계'):'')};for(const key of ['speed','reaction','power','placement'])base[key]*=boss[key];base.shirt=boss.color;if(rank){base.speed*=1+rank*.055;base.reaction*=1-rank*.06;base.power*=1+rank*.045;base.placement=Math.min(1.30,base.placement*(1+rank*.035));}}
 // A gentler career curve: early rivals leave openings and readable returns.
 const beginner=Math.max(0,1-n.id/25),ease=rank?.25:.35+.65*beginner;
 base.speed*=1-.28*ease;base.reaction*=1+.50*ease;base.power*=1-.26*ease;base.placement*=1-.30*ease;
 base.ease=ease;base.mistakes=.035+.10*ease;
 // Readable early and midgame rallies, fading out before the final regions.
 // Reaction is a delay multiplier: increasing it gives the player a little more room.
 const midgameRelief=rank?0:Math.max(0,Math.min(1,(25-n.id)/6));
 base.speed*=1-.30*midgameRelief;base.reaction*=1+.40*midgameRelief;
 base.power*=1-.22*midgameRelief;base.placement*=1-.25*midgameRelief;
 base.mistakes+=.07*midgameRelief;base.learningRelief=midgameRelief;base.entryGame=!rank&&n.id<20;
 base.simpleReturns=rank?null:n.id<10?'flat':n.id<20?'mixed':null;
 // Defensive coverage grows separately from the deliberately gentle return power.
 const coverage=Math.min(1,n.id/18);
 base.receiveSpeed=Math.max(base.speed,.42+coverage*.95);
 base.receiveReaction=Math.min(base.reaction,2.6-coverage*1.45);
 opponentCache.set(key,base);return base;
}

function rootButton(selector){return hub.querySelector(selector);}
function save(){try{window.ClubSaveSafety.assert(data);}catch{let original='';try{original=localStorage.getItem(KEY)||'';}catch{}window.ClubSaveSafety.block(original,KEY);return;}cachedLoadout=null;cachedBonuses=null;if(guest){render();return;}try{localStorage.setItem(KEY,JSON.stringify(data));storageOK=true;saveMessage=tr('자동 저장됨 · 같은 브라우저에서 이어하기');}catch(error){storageOK=false;saveMessage=tr('자동 저장 불가 · 현재 실행에서만 유지');}render();window.ClubAccount?.queueSave(data);}
function reward(id,won,first,score){const n=nodes[id];return won?Math.round((110+n.tier*35+n.step*8+(n.boss?60:0))*(first?1.6:.70)):45+n.tier*15+Math.min(score,10)*3;}
function prize(id,win,first,score){const n=nodes[id];return win?Math.round((300+n.tier*180+n.step*50+(n.boss?350:0))*(first?1.5:.65)):90+n.tier*50+Math.min(score,10)*8;}
function beginMatch(){
 if(!data.activeMatch){if(!unlocked(selected))return null;data.activeMatch={node:selected,tier:nodes[selected].tier,score:[0,0],analysis:matchStats.empty()};}
 data.mapNode=data.activeMatch.node;save();const m=data.activeMatch,n=nodes[m.node];return {...m,score:[...m.score],title:n.code+' '+n.name+(m.mode==='rival'?' · '+tr('라이벌 재대결')+' '+m.rank+tr('단계'):''),opponent:n.opponent};
}
function enterCourt(){finishMapJourney();closeDrawer(false);hub.hidden=true;arena.hidden=false;document.body.dataset.surface='court';document.querySelector('.court-settings')?.removeAttribute('open');window.scrollTo({top:0,behavior:'instant'});}
function showMap(){
 if(guest){window.ClubAccount.requestLogin();return false;}
 if(data.activeMatch)return false;
 if(mapHandler)mapHandler();hub.hidden=false;arena.hidden=true;document.body.dataset.surface='map';render();
 const result=pendingResult;pendingResult=false;closeDrawer(false);requestAnimationFrame(()=>{
  if(hub.hidden)return;defaultMapView();const complete=()=>{if(result&&!hub.hidden&&!drawerOpen)openDrawer(tab);};
  if(data.journey){if(!journeyActive)playMapJourney(complete);}else complete();
 });
}
function launch(next=false){if(guest){window.ClubAccount.requestLogin();return;}if(!startHandler||data.activeMatch&&hub.hidden)return;if(!data.customized&&!data.activeMatch){avatarEditor.open(true);return;}finishMapJourney();if(next&&!data.activeMatch)selected=frontier();const match=beginMatch();if(!match)return;enterCourt();render();startHandler(match);}
function forfeitCost(){return Math.min(data.xp,Math.max(1,Math.ceil(need(data.level)*.20)));}
function requestForfeit(){
 if(!data.activeMatch||el('forfeitDialog').open)return;
 el('forfeitPenalty').textContent=tr('경험치 −')+forfeitCost()+tr(' XP · 현재 ')+data.xp+' → '+(data.xp-forfeitCost())+' XP';
 if(suspendHandler)forfeitResume=suspendHandler();
 el('forfeitDialog').showModal();
}
function forfeitMatch(){
 const m=data.activeMatch;if(!m)return;
 const penalty=forfeitCost();data.xp-=penalty;data.losses++;
 data.lastResult={analysis:matchStats.clean(m.analysis),mode:m.mode||'stage',rank:m.rank||0,won:false,forfeited:true,node:m.node,tier:m.tier,score:[...m.score],xp:-penalty,coins:0,levels:0,firstClear:false,promoted:false};
 data.mapNode=m.node;selected=m.node;data.journey=null;data.activeMatch=null;pendingResult=true;
 forfeitResume=null;el('forfeitDialog').close();setTab('stage');save();showMap();
}

function recordPoint(score){
 const m=data.activeMatch;if(!m||!Array.isArray(score)||score.length!==2)return null;
 const delta=score.map((v,i)=>v-m.score[i]);if(!score.every(Number.isInteger)||!((delta[0]===1&&delta[1]===0)||(delta[0]===0&&delta[1]===1)))return null;
 m.score=[...score];if(Math.max(...score)<11||Math.abs(score[0]-score[1])<2){save();return null;}
 if(m.mode==='rival')return completeRivalMatch(m,score);
 const won=score[0]>score[1],n=nodes[m.node],firstClear=won&&!data.cleared.includes(n.id),medals=updateStageMedals(n,won,score,m.analysis),xp=reward(n.id,won,firstClear,score[0])+medals.bonusXp,oldLevel=data.level,coins=prize(n.id,won,firstClear,score[0])+medals.bonusCoins;
 data.money=Math.min(1000000000,data.money+coins);
 grantExperience(xp);
 if(won){data.wins++;data.tierWins[n.tier]++;if(firstClear)data.cleared.push(n.id);}else data.losses++;
 const trophy=firstClear&&n.boss?window.ClubBosses.forNode(n.id).reward:null;if(trophy&&!data.owned.includes(trophy.id))data.owned.push(trophy.id);
 data.lastResult={medals,analysis:matchStats.clean(m.analysis),rewardId:trophy?.id||null,won,node:n.id,tier:n.tier,score:[...score],xp,coins,levels:data.level-oldLevel,firstClear,promoted:firstClear&&n.boss&&n.id<39};
 data.mapNode=firstClear&&n.id<39?n.id+1:n.id;data.journey=firstClear&&n.id<39?{from:n.id,to:n.id+1}:null;
 data.activeMatch=null;pendingResult=true;selected=won?frontier():n.id;if(data.level>oldLevel)setTab('skills');else setTab('stage');save();return {...data.lastResult};
}
function sizeViewport(){const v=el('worldViewport');if(hub.hidden)return;v.style.height=Math.max(280,window.innerHeight-v.getBoundingClientRect().top-26)+'px';}
function resizeMap(){
 const v=el('worldViewport'),bounds=fitMode?overviewBounds:{x:0,y:0,width:W,height:H},space=el('worldSpace');
 el('worldBoard').style.transform='translate('+(-bounds.x*zoom)+'px,'+(-bounds.y*zoom)+'px) scale('+zoom+')';
 space.style.width=bounds.width*zoom+'px';space.style.height=bounds.height*zoom+'px';space.style.marginTop=Math.max(0,(v.clientHeight-bounds.height*zoom)/2)+'px';
 v.dataset.fitted=String(fitMode);v.dataset.overview=String(zoom<.4);el('mapZoom').textContent=Math.round(zoom*100)+'%';
 v.style.setProperty('--node-label-size',Math.max(14,12/zoom)+'px');v.style.setProperty('--node-code-size',Math.max(16,11/zoom)+'px');
 el('worldPlayer')?.style.setProperty('--player-scale',Math.max(.8,Math.min(fitMode?1:2.8,.65/zoom)));
}
function fitMap(){if(hub.hidden)return;fitMode=true;focusTier=null;updateRegionNav();sizeViewport();const v=el('worldViewport');zoom=Math.max(.08,Math.min((v.clientWidth-24)/overviewBounds.width,(v.clientHeight-24)/overviewBounds.height,1));resizeMap();v.scrollTo({left:0,top:0,behavior:'instant'});}
function compactMap(){return innerWidth<=760||(innerWidth<=1100&&matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-hover: hover) and (any-pointer: fine)').matches);}
function defaultMapView(){if(hub.hidden)return;fitMode=false;focusTier=null;zoom=.65;updateRegionNav();sizeViewport();resizeMap();const n=nodes[data.mapNode],v=el('worldViewport');v.scrollTo({left:n.x*zoom-v.clientWidth/2,top:n.y*zoom-v.clientHeight/2,behavior:'instant'});}
function updateRegionNav(){
 el('mapFit').setAttribute('aria-pressed',String(fitMode));
 hub.querySelectorAll('[data-region]').forEach(button=>{const tier=Number(button.dataset.region);button.setAttribute('aria-pressed',String(!fitMode&&focusTier===tier));button.dataset.locked=String(tier>Math.floor(frontier()/5));el('chapterProgress-'+tier).textContent=(tier>Math.floor(frontier()/5)?'🔒 · ':'')+data.cleared.filter(id=>nodes[id]?.tier===tier).length+' / 5';});
}
function focusRegion(tier){
 if(hub.hidden)return;focusTier=tier;fitMode=false;sizeViewport();const v=el('worldViewport');zoom=compactMap()?Math.max(.72,Math.min((v.clientWidth-24)/430,(v.clientHeight-24)/320,1.2)):Math.max(.28,Math.min((v.clientWidth-36)/460,(v.clientHeight-24)/360,1.2)*.595);resizeMap();
 v.style.setProperty('--node-medal-size',Math.max(48,44/zoom)+'px');
 const row=tier<4?0:1,col=row?7-tier:tier;v.scrollTo({left:(250+col*450)*zoom-v.clientWidth/2,top:(280+row*500)*zoom-v.clientHeight/2,behavior:'instant'});updateRegionNav();const nav=el('regionNav'),button=nav.querySelector('[data-region="'+tier+'"]');nav.scrollTo({left:button.offsetLeft-nav.offsetLeft-(nav.clientWidth-button.offsetWidth)/2,behavior:'instant'});
}
function centerMap(usePlayer=false){const n=usePlayer&&playerPoint?playerPoint:nodes[data.activeMatch?.node??selected],v=el('worldViewport');v.scrollTo({left:n.x*zoom-v.clientWidth/2,top:n.y*zoom-v.clientHeight/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
function openDrawer(next=tab){
 setTab(next);if(!drawerOpen){drawerOpener=document.activeElement;el('campaignDrawer').getBoundingClientRect();}drawerOpen=true;
 hub.classList.add('drawer-open');el('campaignDrawer').inert=false;el('campaignDrawer').setAttribute('aria-hidden','false');el('mapPanel').setAttribute('aria-expanded','true');
 document.body.classList.add('map-drawer-open');requestAnimationFrame(()=>{if(drawerOpen)el('drawerClose').focus({preventScroll:true});});
}
function closeDrawer(restore=true){
 const wasOpen=drawerOpen;drawerOpen=false;hub.classList.remove('drawer-open');el('campaignDrawer').inert=true;el('campaignDrawer').setAttribute('aria-hidden','true');el('mapPanel').setAttribute('aria-expanded','false');document.body.classList.remove('map-drawer-open');
 if(wasOpen&&restore&&drawerOpener?.isConnected)drawerOpener.focus({preventScroll:true});
}
el('mapPanel').onclick=()=>drawerOpen?closeDrawer():openDrawer();
el('drawerClose').onclick=()=>closeDrawer();el('drawerBackdrop').onclick=()=>closeDrawer();el('mapFit').onclick=fitMap;
document.addEventListener('keydown',event=>{
 if(!drawerOpen||document.querySelector('dialog[open]'))return;
 if(event.key==='Escape'){event.preventDefault();closeDrawer();return;}
 if(event.key==='Tab'){const focusable=[...el('campaignDrawer').querySelectorAll('button:not(:disabled),[tabindex="0"],select,input,a[href]')].filter(e=>e.getClientRects().length),first=focusable[0],last=focusable[focusable.length-1];if(!first)return;if(!el('campaignDrawer').contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
window.addEventListener('resize',()=>{if(hub.hidden)return;sizeViewport();if(fitMode)fitMap();else if(focusTier!==null)focusRegion(focusTier);else{resizeMap();centerMap();}});
let mapLayoutFrame=0;
new ResizeObserver(()=>{cancelAnimationFrame(mapLayoutFrame);mapLayoutFrame=requestAnimationFrame(()=>{if(hub.hidden)return;if(fitMode)fitMap();else if(focusTier!==null)focusRegion(focusTier);else sizeViewport();});}).observe(hub.querySelector('.world-title'));
drawMap();setTab('stage');hub.querySelectorAll('[data-region]').forEach(button=>button.onclick=()=>{finishMapJourney();focusRegion(Number(button.dataset.region));});
hub.querySelectorAll('[data-tab]').forEach(button=>{button.onclick=()=>setTab(button.dataset.tab);button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=['stage','stats','skills','shop'],next=tabs[(tabs.indexOf(tab)+(e.key==='ArrowRight'?1:3))%4];setTab(next);el('tab-'+next).focus();};});
hub.querySelectorAll('[data-stat]').forEach(button=>button.onclick=()=>{if(data.activeMatch||points()<=0)return;data.stats[button.dataset.stat]++;save();});
hub.querySelectorAll('[data-skill]').forEach(button=>button.onclick=()=>{const s=skills.find(s=>s.id===button.dataset.skill);if(data.activeMatch||skillPoints()<=0||data.level<skillLevel(s,data.skills[s.id])||data.skills[s.id]>=skillMax(s)||s.requires&&data.skills[s.requires]<2)return;data.skills[s.id]++;save();});
el('careerStart').onclick=()=>launch();el('campaignContinue').onclick=()=>launch(true);el('worldHome').onclick=showMap;
el('lastMatchReview').onclick=()=>{if(data.activeMatch||!data.lastResult?.analysis)return;showMap();openDrawer('stage');requestAnimationFrame(()=>el('matchReport').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));};
el('shopHome').onclick=()=>{if(guest){window.ClubAccount.requestLogin();return;}if(data.activeMatch)return;showMap();openDrawer('shop');};
el('practiceHome').onclick=()=>{if(!practiceHandler||data.activeMatch)return;enterCourt();practiceHandler();};
el('forfeitMatch').onclick=requestForfeit;el('forfeitCancel').onclick=()=>el('forfeitDialog').close();el('forfeitConfirm').onclick=forfeitMatch;
el('forfeitDialog').addEventListener('close',()=>{const resume=forfeitResume;forfeitResume=null;if(resume&&data.activeMatch)resume();});
window.addEventListener('beforeunload',event=>{if(data.activeMatch){event.preventDefault();event.returnValue='';}});
el('mapCenter').onclick=()=>{selected=data.activeMatch?.node??data.mapNode;render();focusRegion(nodes[data.mapNode].tier);};
function changeZoom(delta){const v=el('worldViewport'),board=el('worldBoard'),view=v.getBoundingClientRect(),before=board.getBoundingClientRect(),x=(view.left+v.clientWidth/2-before.left)/zoom,y=(view.top+v.clientHeight/2-before.top)/zoom;fitMode=false;focusTier=null;updateRegionNav();zoom=Math.max(.1,Math.min(1.2,Math.round((zoom+delta)*100)/100));resizeMap();const after=board.getBoundingClientRect();v.scrollLeft+=after.left+x*zoom-view.left-v.clientWidth/2;v.scrollTop+=after.top+y*zoom-view.top-v.clientHeight/2;}
el('mapOut').onclick=()=>changeZoom(-.1);el('mapIn').onclick=()=>changeZoom(.1);
// Fit the actual canvas inside a centered slot; menus keep their own layout.
const courtStage=el('stage');
let courtFrame=el('courtFrame');
if(!courtFrame){courtFrame=document.createElement('div');courtFrame.id='courtFrame';courtFrame.className='court-frame-slot';courtStage.before(courtFrame);courtFrame.append(courtStage);}
if(!window.ClubAssetMap){const styles=document.querySelector('link[href*="world-map.css"]');if(styles)styles.href='./world-map.css?v=centered-court-20261020';}
const courtSizeObserver=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;if(width<=0||height<=0)return;const portraitTouch=document.documentElement.dataset.input==='touch'&&innerHeight>innerWidth,w=Math.floor(portraitTouch?width:Math.min(width,height*16/9)),h=Math.floor(portraitTouch?height:w*9/16);courtStage.style.width=w+'px';courtStage.style.height=h+'px';courtStage.style.maxWidth='none';});
courtSizeObserver.observe(courtFrame);
const viewport=el('worldViewport');
viewport.onpointerdown=e=>{if(e.button!==0||e.target.closest('button'))return;focusTier=null;updateRegionNav();mapDrag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');};
viewport.onpointermove=e=>{if(!mapDrag)return;viewport.scrollLeft=mapDrag.left-(e.clientX-mapDrag.x);viewport.scrollTop=mapDrag.top-(e.clientY-mapDrag.y);};
viewport.onpointerup=viewport.onpointercancel=()=>{mapDrag=null;viewport.classList.remove('dragging');};
const avatarEditor=new window.ClubAvatar.Editor({getProfile:profile,getEquipment:appearance,onSave:look=>{data.profile=look;data.customized=true;save();if(data.journey&&!journeyActive&&!hub.hidden)requestAnimationFrame(()=>playMapJourney());}});
window.ClubCareer={
 bonuses,appearance,profile,gearBonuses,recordPoint,showMap,isMap:()=>!hub.hidden,
 bindPreview(handler){avatarEditor.renderer=handler;if(!guest&&!data.customized)requestAnimationFrame(()=>avatarEditor.open(true));},
 bindStart(handler){startHandler=handler;render();if(data.activeMatch)requestAnimationFrame(()=>launch());},
 bindSuspend(handler){suspendHandler=handler;},
 hasActiveMatch:()=>!!data.activeMatch,
 bindMap(handler){mapHandler=handler;},
 bindPractice(handler){practiceHandler=handler;},
 startGuestPractice(){if(!guest||!practiceHandler)return;enterCourt();practiceHandler();el('worldHome').textContent=tr('내 선수로 도전하기');},
 opponent:opponentConfig,
 recordTraining,recordMatchEvent,
 titles:earnedTitles,
 inspect(){return JSON.parse(JSON.stringify({...data,points:points(),skillPoints:skillPoints(),bonuses:bonuses()}));}
};
if(storageOK)save();else render();
arena.hidden=true;hub.hidden=false;document.body.dataset.surface='map';requestAnimationFrame(()=>{defaultMapView();if(data.journey&&data.customized)playMapJourney();});
})();
