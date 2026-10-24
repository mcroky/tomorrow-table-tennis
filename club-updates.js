(() => {
'use strict';
const supportStyle=document.createElement('style');supportStyle.textContent="/* Web support stays in document flow, after the page's other content. */\n.roky-support-footer{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;flex:0 0 auto;clear:both;position:static;width:100%;max-width:100%;min-width:0;margin:0;padding:16px max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));border-top:1px solid #dedfd5;background:#f7f7ef;color:#34483e;text-align:center}\n.roky-support-footer>a{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;max-width:100%;margin:0;padding:10px 16px;border:1px solid #a28a12;border-radius:9px;background:#ffe14c;color:#242000;font:600 13px/1.5 system-ui,sans-serif;text-decoration:none;white-space:normal;overflow-wrap:anywhere;cursor:pointer}\n.roky-support-footer>a:hover{background:#ffed91;color:#242000;text-decoration:none}\n.roky-support-footer>a:focus-visible{outline:3px solid #2676c4;outline-offset:3px}\n.roky-support-footer>p{margin:0;color:#596c5d;font:13px/1.7 system-ui,sans-serif}\n.roky-support-footer[hidden]{display:none}\n";document.head.append(supportStyle);
const language=['ko','en','ja','zh-CN'].indexOf(document.documentElement.lang);
const text=words=>words[Math.max(0,language)];
const title=text(['업데이트 내역','Updates','アップデート情報','更新记录']);
// Add new releases at the top; keep previous entries available to players.
const releases=[
 {"date":"2026-10-24","title":["전자책 바로가기","E-book link","電子書籍リンク","电子书链接"],"items":[["공통 메뉴에서 로키스튜디오 전자책 페이지를 새 탭으로 열 수 있습니다.","Open Roky Studio e-books in a new tab from the shared menu.","共通メニューからRoky Studioの電子書籍を新しいタブで開けます。","可从公共菜单在新标签页打开 Roky Studio 电子书。"]]},
 {date:'2026-10-24',title:['로그인 없이 바로 시작','Play without signing in','ログインなしですぐプレイ','无需登录即可开始'],items:[
  ['로그인 화면 없이 월드맵으로 바로 들어갑니다. 성장·장비·경기 기록은 현재 기기의 브라우저에 자동 저장됩니다.','Open directly on the world map. Progress, equipment, and match records autosave in this device’s browser.','ワールドマップに直接入ります。成長・装備・試合記録はこの端末のブラウザに自動保存されます。','直接进入世界地图。成长、装备和比赛记录自动保存在此设备的浏览器中。'],
  ['이 기기에 남아 있는 이전 선수 기록을 이어받고, 저장 파일 내려받기·가져오기를 지원합니다. 서버 랭킹과 접속 현황은 종료하고 의견 보내기는 Roky Studio로 연결합니다.','Continue cached player progress and export or import save files. Server rankings and presence are disabled; feedback opens Roky Studio.','端末に残っている選手記録を引き継ぎ、セーブの保存・読み込みに対応。サーバーランキングと接続状況は停止し、ご意見はRoky Studioへ接続します。','继承设备上的旧球员存档，支持导出和导入存档。停用服务器排名和在线状态，反馈链接至Roky Studio。']
 ]},
 {"date":"2026-10-24","title":["더 좋은 앱을 위한 후원 안내","Bank transfer information","銀行振込の案内","银行转账说明"],"items":[["상단 공통 메뉴에서 카카오뱅크 계좌 안내를 새 탭으로 열고 홈페이지에서 계좌번호를 복사할 수 있습니다.","Support better apps in a new tab and copy the account number on the homepage.","上部メニューから振込案内を新しいタブで開き、ホームページで口座番号をコピーできます。","可从顶部菜单在新标签页打开转账说明，并在主页复制账号。"]]},
 {"date":"2026-10-24","title":["저장 보호와 경기 일시정지","Save protection and match pausing","セーブ保護と試合の一時停止","存档保护与比赛暂停"],"items":[["손상되거나 지원하지 않는 저장 기록을 자동으로 덮어쓰지 않습니다. 원본 다운로드와 정상 클라우드 기록 선택 복구를 안내합니다.","Unreadable or unsupported saves are not overwritten automatically. Download the original or choose valid cloud progress when available.","破損・未対応の記録は自動上書きせず、原本の保存と正常なクラウド記録の選択復元を案内します。","不会自动覆盖损坏或不支持的存档。可下载原始文件，并在有正常云端记录时选择恢复。"],["다른 창·탭으로 이동하거나 업데이트 창을 열면 경기를 멈춥니다. 돌아온 뒤 직접 재개할 수 있습니다.","Matches pause when you leave the window or tab, or open Updates. Resume explicitly when ready.","別のウィンドウ・タブへの移動や更新情報を開くと試合を停止し、戻ってから手動で再開できます。","切换窗口、标签页或打开更新记录时暂停比赛，返回后可手动继续。"],["서버 저장 성공 후 응답이 끊겨도 기록을 다시 확인해 잘못된 기기 간 충돌 안내를 줄였습니다. 실제 다른 기록은 선택 절차를 유지합니다.","After a lost save response, remote progress is checked to recover acknowledged writes. Genuinely different progress still requires your choice.","保存成功後に応答が途切れても記録を再確認し、誤った競合を防ぎます。実際に異なる記録は選択して解決します。","保存成功但响应丢失后会重新检查云端记录，避免误判冲突。真正不同的记录仍需选择。"],["시스템의 움직임 줄이기 설정을 켜면 타격 시 카메라 흔들림·순간 시야각 변화·화면 섬광을 끕니다.","Reduced motion disables impact camera shake, FOV kicks, and screen flashes.","動きを減らす設定では打撃時のカメラ揺れ・瞬間的な画角変化・画面フラッシュを無効にします。","减少动态效果设置会关闭击球时的镜头抖动、瞬间视野变化和画面闪光。"]]},
 {date:'2026-10-23',title:['Roky Studio 소셜 바로가기','Roky Studio social links','Roky Studioのソーシャルリンク','Roky Studio 社交链接'],items:[['상단 메뉴에서 운영자의 X와 Threads 계정을 새 탭으로 열 수 있습니다.','Open the creator’s X and Threads profiles in a new tab from the header.','上部メニューから運営者のXとThreadsを新しいタブで開けます。','可从顶部菜单在新标签页打开作者的 X 和 Threads 账号。']]},
 {date:'2026-10-22',title:['모바일 경기 화면 확대','Larger mobile court','モバイルの試合画面を拡大','扩大手机比赛画面'],items:[
  ['모바일 전체화면 버튼을 상단 경기 메뉴로 옮겼습니다. 시점 선택 아래의 버튼 줄을 줄이고 확보한 높이를 기본 게임 화면에 사용합니다.','Moved the mobile fullscreen button into the upper match menu. Removing its toolbar row gives the default court more height.','モバイルの全画面ボタンを上部の試合メニューへ移動。視点選択の下の行を減らし、その分だけ通常の試合画面を広げました。','将手机全屏按钮移至顶部比赛菜单，减少视角选择下方的一行，将腾出的高度用于默认比赛画面。']
 ]},
 {date:'2026-10-22',title:['중반 수비와 후반 스킬 성장','Midgame defense and late-game skills','中盤の守備と終盤のスキル成長','中期防守与后期技能成长'],items:[
  ['상대의 모서리 수비 이동과 스윙 타이밍을 개선했습니다. 지역이 올라갈수록 수비 범위가 넓어지며 리턴 위력과는 별도로 성장합니다.','Improved opponent coverage and swing timing on corner shots. Defensive coverage grows by region, separately from return power.','相手のコーナー守備とスイングタイミングを改善。地域が進むほど守備範囲が広がり、返球威力とは別に成長します。','改善对手角落防守与挥拍时机。防守覆盖随地区推进提升，与回球威力分开成长。'],
  ['심화 스킬 6개와 마스터 스킬 3개를 추가했습니다. 총 102SP를 투자할 수 있으며 레벨 12·18·30부터 새 스킬이 열리고 상위 단계도 순차 해금됩니다. 기존 투자와 남은 SP는 유지됩니다.','Added six advanced and three mastery skills, for 102 SP of total capacity. New skills unlock at levels 12, 18, and 30, with higher ranks unlocked gradually. Existing ranks and unspent SP are preserved.','応用6種とマスター3種を追加し、合計102SPまで投資可能に。レベル12・18・30で新スキルが解放され、上位段階も順次解放。既存の投資と残りSPは維持されます。','新增6个进阶和3个精通技能，总计可投入102SP。新技能在12、18、30级解锁，更高等级逐步开放。保留已有技能和剩余SP。']
 ]},
 {date:'2026-10-22',title:['사이드 공 리턴 개선','Better returns on wide shots','サイドへの返球を改善','改善边路来球回击'],items:[
  ['좌우로 따라가며 스윙할 때 라켓이 이동 전 위치에 남아 공을 놓치던 문제를 수정했습니다.','Fixed the racket lagging behind your movement when swinging at a wide ball.','左右へ追いかけながら振るとラケットが移動前の位置に残って空振りする問題を修正しました。','修复追向左右边路并挥拍时，球拍滞留在移动前位置而漏球的问题。'],
  ['사이드 공을 쫓는 도중에는 이동이 과하게 멈추지 않고, 공에 가까워지면 발을 디디며 타격하도록 개선했습니다.','Reduced excessive stopping during a lateral chase, while retaining the plant as you reach the ball.','サイドの球を追う途中で急に止まりすぎないようにし、球に近づくと踏み込んで打てるよう改善しました。','改善追边路球时过度急停的问题，接近来球后仍会踩稳击球。'],
  ['직접 이동하고 스윙해야 리턴되는 규칙은 유지됩니다.','Returns still require manual movement and swing input.','移動とスイングは引き続き自分で操作します。','回球仍需手动移动和挥拍。']
 ]},
 {date:'2026-10-21',title:['직접 치는 실전 경기','Take control in career matches','自分で打つ本番の試合','亲自掌控正式比赛'],items:[
  ['초반 일반 리턴이 지나치게 높게 튀어 일반 스윙으로 맞히기 어려웠던 궤적 문제를 수정했습니다. 높은 찬스 볼에는 스매시 버튼도 밝아지며, 직접 누른 스매시 입력을 잠시 받아둡니다.','Fixed early normal returns bouncing too high for a regular swing. Smash now lights up for high chance balls, and a manual smash press can wait briefly for that ball.','序盤の通常返球が高く弾みすぎて通常スイングで打ちにくかった軌道を修正。チャンスボールではスマッシュも光り、手動のスマッシュ先行入力を短時間受け付けます。','修复前期普通回球弹得过高、普通挥拍难以击中的轨迹问题。高机会球会点亮扣杀按钮，并短暂保留手动扣杀输入。'],
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
function open(event){opener=event.currentTarget;if(dialog.open)return;window.dispatchEvent(new Event('club-game-interrupt'));dialog.showModal();dialog.scrollTop=0;close.focus();}
close.onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
// Keep keyboard gameplay shortcuts from firing while browsing release notes.
dialog.addEventListener('keydown',event=>event.stopPropagation());
function mount(parent){if(!parent||parent.querySelector('.updates-open'))return;const button=make('button',title);button.type='button';button.className='updates-open';button.setAttribute('aria-haspopup','dialog');button.onclick=open;const studio=make('a',text(['← 로키 스튜디오','← Roky Studio','← Roky Studio','← Roky Studio']));studio.className='studio-return';studio.href='https://mcroky.github.io/roky-studio/';studio.setAttribute('aria-label',text(['로키 스튜디오로 돌아가기','Return to Roky Studio','Roky Studioに戻る','返回Roky Studio']));const socials=make('nav');socials.className='roky-social';socials.setAttribute('aria-label','Roky Studio social profiles');for(const [label,url] of [['X','https://x.com/loki60542'],['Threads','https://www.threads.com/@loki60542']]){const link=make('a',label+' ↗');link.className='roky-social-link';link.href=url;link.target='_blank';link.rel='me noopener noreferrer';link.setAttribute('aria-label',label+' @loki60542 (opens in a new tab)');socials.append(link);}if(window.ClubConfig?.distributionChannel!=='google-play'){const bank=make('a',text(['더 좋은 앱을 위한 후원 ↗','Support better apps ↗','より良いアプリを応援 ↗','支持更好的应用 ↗']));bank.className='roky-social-link roky-transfer-link';bank.setAttribute('data-web-only-support','');bank.href='https://buymeacoffee.com/roky.studio';bank.target='_blank';bank.rel='noopener noreferrer';bank.setAttribute('aria-label',text(['더 좋은 앱을 위한 후원 새 탭에서 열기','Support better apps in a new tab','より良いアプリへの支援ページを新しいタブで開く','在新标签页打开应用支持页面']));let supportFooter=document.querySelector('body > .roky-support-footer');if(!supportFooter){supportFooter=make('div');supportFooter.className='roky-support-footer';supportFooter.setAttribute('data-web-only-support','');document.body.append(supportFooter);}if(!supportFooter.querySelector('a'))supportFooter.append(bank);}if(window.ClubConfig?.distributionChannel!=='google-play'){const ebook=make('a',text(['전자책 ↗','E-books ↗','電子書籍 ↗','电子书 ↗']));ebook.className='roky-social-link roky-ebook-link';ebook.setAttribute('data-web-only-commerce','');ebook.href='https://litt.ly/roky.studio';ebook.target='_blank';ebook.rel='noopener noreferrer';ebook.setAttribute('aria-label',text(['로키스튜디오 전자책 새 탭에서 열기','Open Roky Studio e-books in a new tab','Roky Studioの電子書籍を新しいタブで開く','在新标签页打开 Roky Studio 电子书']));socials.append(ebook);}parent.append(button,studio,socials);}
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
