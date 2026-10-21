(() => {
'use strict';
const tr=window.ClubI18n.t,keys=['hits','center','critical','smashes','smashPoints','out','net','miss','unstable','drive','cut','block','shortServes','deepServes','opportunities','rallyHits','maxRally','points'];
function empty(partial=false){return {version:1,partial,...Object.fromEntries(keys.map(k=>[k,0]))};}
function clean(raw){if(!raw||raw.version!==1)return null;const result=empty(!!raw.partial);for(const k of keys)result[k]=Number.isFinite(raw[k])?Math.max(0,Math.min(100000,Math.floor(raw[k]))):0;for(const k of ['center','critical','smashes','unstable','drive','cut','block'])result[k]=Math.min(result.hits,result[k]);result.smashPoints=Math.min(result.smashes,result.smashPoints);return result;}
function record(stats,event){
 if(event.type==='contact'){
  stats.rallyHits++;stats.maxRally=Math.max(stats.maxRally,stats.rallyHits);
  if(!event.player){if(event.chance)stats.opportunities++;return;}
  stats.hits++;if(event.center)stats.center++;if(event.critical)stats.critical++;
  if(event.smash)stats.smashes++;else if(event.style==='drive')stats.drive++;else if(event.style==='cut')stats.cut++;else stats.block++;
  if(event.unstable)stats.unstable++;
 }else if(event.type==='serve'&&event.player){if(event.length==='short')stats.shortServes++;else stats.deepServes++;}
 else if(event.type==='point'){
  stats.points++;if(!event.won){if(event.fault==='out')stats.out++;else if(event.fault==='net')stats.net++;else stats.miss++;}
  if(event.won&&event.smashWinner)stats.smashPoints++;stats.maxRally=Math.max(stats.maxRally,stats.rallyHits);stats.rallyHits=0;
 }
}
function markup(stats){
 const s=clean(stats);if(!s)return '';
 const rate=s.hits?Math.round(s.center/s.hits*100):0,tips=[];
 if(!s.hits)tips.push(tr('공이 바운드하기 전 스윙을 준비하고, 몸 앞에서 맞혀보세요.'));
 else{
  if(s.out+s.net>=2)tips.push(tr('아웃과 네트 실수가 있었어요. 힘을 주기 전에 발을 멈추고 타이밍을 맞춰보세요.'));
  if(s.unstable/s.hits>.30)tips.push(tr('움직이면서 친 공이 많아요. 한 발을 딛고 허리를 돌려보세요.'));
  if(s.opportunities>=2&&!s.smashes)tips.push(tr('상대가 높이 띄운 공을 놓쳤어요. 바운드 뒤 E로 마무리해보세요.'));
  if(s.hits>=6&&!s.cut)tips.push(tr('짧은 커트로 상대를 앞으로 부른 뒤 깊은 드라이브를 노려보세요.'));
  if(rate>=60)tips.push(tr('라켓 중앙에 잘 맞혔어요. 다음에는 좌우 코스를 번갈아 노려보세요.'));
 }
 if(!tips.length)tips.push(tr('좌우 코스와 짧고 깊은 구질을 섞어 상대의 빈 곳을 만들어보세요.'));
 const metrics=[[tr('총 타격'),s.hits],[tr('정타율'),s.hits?rate+'%':'—'],[tr('크리티컬'),s.critical],[tr('스매시 득점'),s.smashPoints+' / '+s.smashes],[tr('최장 랠리'),s.maxRally],[tr('놓친 리턴'),s.miss]];
 const styles=[[tr('드라이브'),s.drive,'drive'],[tr('커트'),s.cut,'cut'],[tr('스매시'),s.smashes,'smash'],[tr('블록'),s.block,'block']];
 return '<h3>'+tr('경기 분석')+'</h3>'+(s.partial?'<p class="report-partial">'+tr('업데이트 이후 기록된 구간만 집계했어요.')+'</p>':'')+'<div class="report-metrics">'+metrics.map(([label,value])=>'<div><strong>'+value+'</strong><span>'+label+'</span></div>').join('')+'</div><h4>'+tr('구질 사용')+'</h4><div class="report-style-bar" aria-hidden="true">'+styles.map(([label,count,id])=>'<span data-style="'+id+'" style="flex:'+count+'"></span>').join('')+'</div><div class="report-style-legend">'+styles.map(([label,count,id])=>'<span data-style="'+id+'">'+label+' <b>'+count+'</b></span>').join('')+'</div><p class="report-faults">'+tr('아웃')+' '+s.out+' · '+tr('네트 실수')+' '+s.net+' · '+tr('불안정한 타격')+' '+s.unstable+'</p><p class="report-serves">'+tr('내 서브')+' · '+tr('짧은 서브')+' '+s.shortServes+' / '+tr('깊은 서브')+' '+s.deepServes+'</p><small>'+tr('정타율은 타이밍과 발 디딤이 안정된 중앙 타격 기준 · 랠리는 양쪽 타격 수')+'</small><div class="report-coach"><b>'+tr('다음 경기 팁')+'</b>'+tips.slice(0,2).map(t=>'<p>'+t+'</p>').join('')+'</div>';
}
window.ClubMatchStats={empty,clean,record,markup};
})();
