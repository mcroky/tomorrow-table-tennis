(() => {
'use strict';
const tr=window.ClubI18n.t;
const rarities={common:{name:tr('일반'),order:0,color:'#7c8976'},uncommon:{name:tr('고급'),order:1,color:'#478158'},rare:{name:tr('희귀'),order:2,color:'#4d78ad'},epic:{name:tr('영웅'),order:3,color:'#9064ad'},legendary:{name:tr('전설'),order:4,color:'#d5a539'}};
const gradeIds={legendary:['clothes-legend','headband-legend','shoes-legend','racket-legend','ball-legend'],uncommon:['clothes-mint','headband-white','shoes-light','racket-control','ball-white'],rare:['clothes-navy','headband-red','shoes-sprint','racket-drive','ball-orange'],epic:['clothes-gold','headband-gold','shoes-elite','racket-pro','ball-gold']};
const effectLabels={speed:tr('이동 속도'),recovery:tr('자세 회복'),guard:tr('수비 보정'),accuracy:tr('코스 오차 감소'),power:tr('타구 위력')};
const describe=bonus=>Object.entries(bonus).filter(([,v])=>v!==0).map(([k,v])=>effectLabels[k]+' +'+(Math.round(v*1000)/10)+'%').join(' · ')||tr('추가 능력치 없음');
const item=(id,slot,name,price,color,description,bonus={},accent='#f1e7cc')=>({id,slot,name,price,color,description,bonus,accent,grade:Object.keys(gradeIds).find(g=>gradeIds[g].includes(id))||'common'});
const enhance=(item,level=0)=>{const rank=Number.isFinite(level)?Math.max(0,Math.min(5,Math.floor(level))):0;return {...item,level:rank,name:item.name+(rank?' +'+rank:''),bonus:Object.fromEntries(Object.entries(item.bonus).map(([key,value])=>[key,value*(1+rank*.20)]))};};
const upgradeCost=(item,level)=>Math.round((120*(rarities[item.grade].order+1)+item.price*.12)*Math.pow(level+1,1.5)/10)*10;
window.ClubEquipment={rarities,effectLabels,describe,enhance,upgradeCost,
 slots:{clothes:tr('옷'),headband:tr('헤어밴드'),shoes:tr('신발'),racket:tr('탁구채'),ball:tr('탁구공')},
 items:[
 item('clothes-base','clothes',tr('동네 연습복'),0,'#df7253',tr('기본 연습복'),{guard:.01}),
 item('clothes-mint','clothes',tr('민트 클럽 유니폼'),600,'#529a88',tr('가볍게 움직이는 클럽 유니폼'),{recovery:.03,guard:.02},'#d5ead5'),
 item('clothes-navy','clothes',tr('네이비 선수복'),1200,'#364d79',tr('안정적인 수비를 위한 선수복'),{recovery:.05,guard:.04},'#c7d9e5'),
 item('clothes-gold','clothes',tr('챔피언 유니폼'),2400,'#b78b3f',tr('최상위 무대용 챔피언 유니폼'),{recovery:.08,guard:.06},'#fff0c1'),
 item('headband-base','headband',tr('헤어밴드 없음'),0,null,tr('기본 외형')),
 item('headband-white','headband',tr('화이트 헤어밴드'),350,'#eee8d4',tr('자세 회복 +3%'),{recovery:.03}),
 item('headband-red','headband',tr('레드 집중 밴드'),850,'#c65143',tr('자세 회복 +5% · 수비 보정 +2%'),{recovery:.05,guard:.02}),
 item('headband-gold','headband',tr('골드 집중 밴드'),1800,'#e3bb64',tr('자세 회복 +8% · 수비 보정 +4%'),{recovery:.08,guard:.04}),
 item('shoes-base','shoes',tr('동네 운동화'),0,'#f4ecd9',tr('기본 운동화'),{speed:.01},'#c5644b'),
 item('shoes-light','shoes',tr('라이트 스텝'),700,'#d9e8d4',tr('이동 속도 +2%'),{speed:.02},'#4d916e'),
 item('shoes-sprint','shoes',tr('스프린트 슈즈'),1500,'#e8d4ba',tr('이동 속도 +4% · 자세 회복 +3%'),{speed:.04,recovery:.03},'#c0733d'),
 item('shoes-elite','shoes',tr('엘리트 풋워크'),3200,'#d5deed',tr('이동 속도 +7% · 자세 회복 +5%'),{speed:.07,recovery:.05},'#446a9e'),
 item('racket-base','racket',tr('기본 라켓'),0,'#303532',tr('기본 탁구채'),{power:.01},'#ad8052'),
 item('racket-control','racket',tr('컨트롤 우드'),900,'#3b6e62',tr('코스 오차 5% 감소'),{accuracy:.05},'#b28b58'),
 item('racket-drive','racket',tr('드라이브 카본'),2000,'#ba4c44',tr('타구 위력 +5% · 코스 오차 3% 감소'),{power:.05,accuracy:.03},'#4f5465'),
 item('racket-pro','racket',tr('챔피언 블레이드'),4200,'#343a62',tr('타구 위력 +8% · 코스 오차 6% 감소'),{power:.08,accuracy:.06},'#b38c47'),
 item('ball-base','ball',tr('연습용 아이보리 공'),0,'#fff1bd',tr('기본 연습용 공'),{accuracy:.01}),
 item('ball-white','ball',tr('클래식 화이트 공'),250,'#fffaf0',tr('정확한 코스를 위한 화이트 공'),{accuracy:.03}),
 item('ball-orange','ball',tr('클래식 오렌지 공'),650,'#f7a13e',tr('공격과 정확도를 함께 높이는 공'),{power:.03,accuracy:.04}),
 item('clothes-legend','clothes',tr('천상의 제왕 유니폼'),12500,'#243e59',tr('금빛 문장과 은은한 오라를 두른 전설 선수복'),{recovery:.12,guard:.09},'#f3d17c'),
 item('headband-legend','headband',tr('여명의 왕관 밴드'),8500,'#f1d48b',tr('보석 장식과 여명의 빛이 흐르는 전설 밴드'),{recovery:.12,guard:.06},'#a9eee1'),
 item('shoes-legend','shoes',tr('별빛 비상 슈즈'),14500,'#eff5ef',tr('금빛 날개 장식과 별빛 오라의 전설 슈즈'),{speed:.10,recovery:.08},'#e2b95d'),
 item('racket-legend','racket',tr('오로라 소버린'),18500,'#285d66',tr('금빛 프레임과 오로라를 품은 전설 블레이드'),{power:.12,accuracy:.09},'#f5d27e'),
 item('ball-legend','ball',tr('영원의 별 탁구공'),6500,'#fff9df',tr('금빛 띠와 부드러운 광채를 품은 전설 탁구공'),{power:.07,accuracy:.09},'#e6bc60'),
 item('ball-gold','ball',tr('골든 챔피언 공'),1400,'#ead17a',tr('최상위 대회용 챔피언 공'),{power:.05,accuracy:.06})
 ]
};
window.ClubEquipment.items.push(...window.ClubBosses.rewards,...window.ClubBosses.rivalRewards);
})();
