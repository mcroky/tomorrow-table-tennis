(() => {
'use strict';
const tr=window.ClubI18n.t;
const types=[
 {id:'defender',name:tr('철벽 수비수'),hint:tr('한쪽에만 치면 계속 받아냅니다. 좌우로 흔들어 뜬 공을 스매시로 마무리하세요.'),intro:tr('끝까지 받아줄게. 먼저 지치는 쪽이 지는 거야.'),title:tr('철벽을 넘은 자'),itemName:tr('수호자 유니폼'),slot:'clothes',color:'#427c8b',accent:'#d8eeeb',speed:1.13,reaction:.86,power:.92,placement:.94},
 {id:'tactician',name:tr('코스 설계자'),hint:tr('빈 곳으로 짧고 깊게 번갈아 보냅니다. 중앙으로 복귀하고 다음 코스를 읽어보세요.'),intro:tr('네가 비워둔 곳, 전부 보이는데?'),title:tr('코스를 읽는 눈'),itemName:tr('핀포인트 슈즈'),slot:'shoes',color:'#826894',accent:'#e8def1',speed:1.02,reaction:.96,power:.98,placement:1.12},
 {id:'striker',name:tr('스매시 사냥꾼'),hint:tr('높이 뜬 공을 강하게 내려칩니다. 낮게 리턴하고 스매시 뒤 반대쪽 빈 곳을 노리세요.'),intro:tr('공 띄우지 마. 바로 끝내줄 테니까.'),title:tr('강타를 잠재운 자'),itemName:tr('썬더 블레이드'),slot:'racket',color:'#bb574a',accent:'#f3d093',speed:.96,reaction:1.04,power:1.06,placement:1.0}
];
const order=[0,1,2,0,1,2,0,2];
const rewards=order.map((type,tier)=>{
 const b=types[type],bonus=type===0?{guard:.035+tier*.005,recovery:.040+tier*.005}:type===1?{speed:.025+tier*.005,accuracy:.020+tier*.003}:{power:.040+tier*.005,accuracy:.015+tier*.003};
 return {id:'boss-trophy-'+tier,slot:b.slot,name:b.itemName+' '+(tier+1),price:0,color:b.color,accent:b.accent,description:tr('보스 첫 클리어 전용 보상'),bonus,grade:tier<3?'rare':'epic',bossReward:true,unlockNode:tier*5+4};
});
const rivalRewards=order.map((type,tier)=>({id:'rival-trophy-'+tier,slot:'headband',name:tr('라이벌 마스터 밴드')+' '+(tier+1),price:0,color:types[type].color,accent:'#f2d380',description:tr('라이벌 3단계 첫 승리 전용 보상'),bonus:{recovery:.04+tier*.004,accuracy:.025+tier*.003},grade:'epic',bossReward:true,unlockNode:tier*5+4}));
const rivalTitle=tier=>tr('라이벌 마스터')+' · '+(tier+1);
window.ClubBosses={types,rewards,rivalRewards,rivalTitle,forNode(id){if(!Number.isInteger(id)||id%5!==4||id<0||id>39)return null;const tier=Math.floor(id/5);return {...types[order[tier]],tier,reward:rewards[tier]};}};
})();
