(() => {
'use strict';
const language=['ko','en','ja','zh-CN'].indexOf(document.documentElement.lang);
const text=words=>words[Math.max(0,language)];
const title=text(['업데이트 내역','Updates','アップデート情報','更新记录']);
// Add new releases at the top; keep previous entries available to players.
const releases=[
 {date:'2026-10-21',title:['직접 치는 실전 경기','Take control in career matches','自分で打つ本番の試合','亲自掌控正式比赛'],items:[
  ['중반까지 일반 스윙의 선입력을 허용합니다. 직접 누른 입력 한 번만 현재 공에 적용되며 자동 이동은 없습니다. 상대의 서브와 리턴 코스를 읽기 쉽게 바꾸고 수비에도 빈틈을 늘렸습니다.','Normal swings accept an early press through midgame. Each manual press applies only once to the current ball, without automatic movement. Opponent serves and returns are more readable, with more defensive openings.','中盤までは通常スイングの先行入力に対応。手動入力一回は今の球に一度だけ適用され、自動移動はありません。相手のサーブと返球を読みやすくし、守備にも隙を増やしました。','前中期普通挥拍支持提前输入。每次手动输入仅对当前来球挥拍一次，不自动移动。对手发球和回球更易判断，防守空当也更多。'],
  ['초반~중반 일반 스윙의 입력 반응을 개선했습니다. 공이 가까울 때 누르면 더 짧게 휘두르며, 스윙하기 좋은 순간에 버튼이 밝아집니다. 이동과 스윙 입력은 직접 해야 합니다.','Improved normal-swing response in early and midgame: a nearby ball gets a shorter swing, and the button lights up at a good moment to press. Movement and swing input remain manual.','序盤〜中盤の通常スイングの反応を改善。球が近いと短く振り、押しやすい瞬間にボタンが光ります。移動とスイング入力は手動です。','改善前中期普通挥拍的输入响应：近球使用更短挥拍，并在适合按键时点亮按钮。移动和挥拍仍需手动操作。'],
  ['본게임 초반~중반 난이도를 추가 완화했습니다. 상대의 수비와 타구를 더 낮추고, 첫 지역은 무회전 위주로 변경했습니다. 직접 스윙한 타구의 타이밍 실수도 덜 엄격하게 판정합니다.','Further eased early and midgame opponents. Reduced defense and shot power, made first-region returns flat, and softened timing-error penalties on active swings.','本番の序盤〜中盤をさらに緩和。相手の守備と打球を弱め、最初の地域は無回転中心に。自分で振った打球のタイミングミス判定も緩和しました。','进一步降低正式比赛前中期难度，削弱对手防守与击球，首个区域以无旋转回球为主，并放宽主动挥拍的时机失误判定。'],
  ['본게임 초반~중반 상대의 이동·반응·타구 위력을 소폭 완화했습니다. 후반과 라이벌 재대결은 유지하며 자동 조작은 적용하지 않습니다.','Slightly eased early and midgame opponent movement, reactions, and shot power. Late stages and rival rematches remain unchanged, with no automatic controls.','本番の序盤〜中盤の相手の移動・反応・打球威力を少し緩和しました。終盤とライバル再戦は維持し、自動操作は適用しません。','小幅降低正式比赛前中期对手的移动、反应和击球威力。后期及宿敌重赛保持原样，不提供自动操作。'],
  ['Windows 고정 키 안내를 피하도록 PC 스매시를 E키로 변경하고 튜토리얼과 조작 안내를 수정했습니다. Space는 일반 스윙, F는 필살기입니다.','Changed PC smash to E to avoid the Windows Sticky Keys prompt, and updated tutorials and controls. Space swings; F uses your special.','Windowsの固定キー案内を避けるため、PCのスマッシュをEキーに変更し、操作案内を更新しました。Spaceは通常スイング、Fは必殺技です。','电脑端扣杀改为E键，避免触发Windows粘滞键提示，并更新教程与操作说明。空格键普通挥拍，F键必杀技。'],
  ['로키 스튜디오로 돌아가기 버튼을 추가했습니다.','Added a return link to Roky Studio.','Roky Studioに戻るボタンを追加しました。','新增返回Roky Studio的按钮。'],
  ['필살기 라이징 스매시 추가: 직접 리턴으로 충전하고 높은 공에 F키 또는 필살기 버튼으로 사용하세요.','Added Rising Smash: charge it with active returns, then use F or the Special button on a high ball.','必殺技ライジングスマッシュを追加。返球で充電し、高い球にFキーまたは必殺技ボタンで使えます。','新增升龙扣杀：主动回球充能，在高球到来时按F或必杀技按钮使用。'],
  ['자동 이동과 타이밍 보정은 연습에서만 적용됩니다.','Automatic movement and timing assistance now apply only in practice.','自動移動とタイミング補助は練習でのみ適用されます。','自动移动和时机辅助仅在练习中生效。'],
  ['본게임에서는 직접 스윙해야 공을 받아낼 수 있습니다.','Career matches require a swing to return the ball.','本番の試合では自分でスイングして返球します。','正式比赛需要主动挥拍才能回球。'],
  ['전체화면 플레이 안내와 업데이트 내역 창을 추가했습니다.','Added a fullscreen play hint and this update history.','全画面プレイの案内とアップデート情報を追加しました。','新增全屏游玩提示和更新记录。']
 ]},
 {date:'2026-10-20',title:['조작과 화면 개선','Controls and display improvements','操作と画面の改善','操作与画面优化'],items:[
  ['PC 스매시를 단독 키 입력으로 간소화했습니다(현재 E키).','Simplified PC smash to a single key (currently E).','PCのスマッシュを単独キー操作に変更しました（現在はEキー）。','电脑端扣杀简化为单键操作（当前为E键）。'],
  ['월드맵 기본 확대율을 65%로 설정하고 내 캐릭터를 중심으로 표시합니다.','The world map opens at 65% zoom, centered on your character.','ワールドマップは自分のキャラクターを中心に65%表示で開きます。','世界地图默认缩放为65%，以你的角色为中心。'],
  ['기본 시점을 1번 라켓 시점으로 변경했습니다.','The default camera is now view 1, the racket view.','初期視点を1番のラケット視点に変更しました。','默认视角改为1号球拍视角。'],
  ['터치 노트북의 PC 조작 판별을 개선하고 경기 화면 확대와 전체화면 버튼을 추가했습니다.','Improved desktop control detection on touch laptops, expanded the court layout, and added a fullscreen button.','タッチ対応ノートPCの操作判定を改善し、試合画面の拡大と全画面ボタンを追加しました。','优化触屏笔记本的电脑操作识别，扩大比赛画面并新增全屏按钮。'],
  ['자유 연습 상대의 수비와 리턴을 조정하고 서브·스윙·스매시 튜토리얼을 추가했습니다.','Adjusted practice opponent defense and returns, and added a serve, swing, and smash tutorial.','自由練習の相手の守備と返球を調整し、サーブ・スイング・スマッシュのチュートリアルを追加しました。','调整自由练习对手的防守与回球，新增发球、挥拍和扣杀教程。']
 ]}
];
const make=(tag,content)=>{const el=document.createElement(tag);if(content)el.textContent=content;return el;};
const dialog=make('dialog');dialog.className='updates-dialog';dialog.setAttribute('aria-labelledby','updatesTitle');
const heading=make('div');heading.className='updates-heading';
const h=make('h2',title);h.id='updatesTitle';
const close=make('button',text(['닫기','Close','閉じる','关闭']));close.type='button';heading.append(h,close);
const intro=make('p',text(['최근 변경사항을 날짜별로 확인하세요.','See what changed in each update.','日付ごとの変更内容を確認できます。','按日期查看最近的更新内容。']));intro.className='updates-intro';
const history=make('div');history.className='updates-history';
for(const release of releases){
 const article=make('article'),date=make('time',release.date);date.dateTime=release.date;
 const label=make('h3',text(release.title)),list=make('ul');
 for(const item of release.items)list.append(make('li',text(item)));
 article.append(date,label,list);history.append(article);
}
dialog.append(heading,intro,history);document.body.append(dialog);
let opener=null;
function open(event){opener=event.currentTarget;if(dialog.open)return;dialog.showModal();dialog.scrollTop=0;close.focus();}
close.onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
// Keep keyboard gameplay shortcuts from firing while browsing release notes.
dialog.addEventListener('keydown',event=>event.stopPropagation());
function mount(parent){if(!parent||parent.querySelector('.updates-open'))return;const button=make('button',title);button.type='button';button.className='updates-open';button.setAttribute('aria-haspopup','dialog');button.onclick=open;const studio=make('a',text(['← 로키 스튜디오','← Roky Studio','← Roky Studio','← Roky Studio']));studio.className='studio-return';studio.href='https://mcroky.github.io/roky-studio/';studio.setAttribute('aria-label',text(['로키 스튜디오로 돌아가기','Return to Roky Studio','Roky Studioに戻る','返回Roky Studio']));parent.append(button,studio);}
mount(document.querySelector('.shell>header'));
// Career exits must go through the existing forfeit flow first.
document.addEventListener('click',event=>{const link=event.target instanceof Element?event.target.closest('a.studio-return'):null;if(link&&window.ClubCareer?.hasActiveMatch()){event.preventDefault();document.getElementById('forfeitMatch')?.click();}});
function watchGate(gate){
 const attach=()=>mount(gate.querySelector('.account-intro'));
 attach();new MutationObserver(attach).observe(gate,{childList:true,subtree:true});
}
const gate=document.getElementById('authGate');
if(gate)watchGate(gate);else{
 const observer=new MutationObserver(()=>{const gate=document.getElementById('authGate');if(gate){observer.disconnect();watchGate(gate);}});
 observer.observe(document.body,{childList:true});
}
})();
