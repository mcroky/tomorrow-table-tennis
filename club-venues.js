(() => {
'use strict';
const tr=window.ClubI18n.t;
const venues=[
 {name:tr('골목 탁구클럽'),code:'LOCAL CLUB',floor:'#d7aa70',wall:'#e8e6d6',lower:'#91a394',accent:'#8f9f75',fog:'#c4ccba',rows:0,dark:false},
 {name:tr('동호회 클럽하우스'),code:'CLUB HOUSE',floor:'#5d9b96',wall:'#e9eadd',lower:'#5f8085',accent:'#e2b271',fog:'#c9d9cf',rows:0,dark:false},
 {name:tr('시민 종합체육관'),code:'CITY ARENA',floor:'#b4665b',wall:'#d8e0df',lower:'#527e8a',accent:'#e4c58b',fog:'#bdced0',rows:1,dark:false},
 {name:tr('전국 대회 아레나'),code:'NATIONAL OPEN',floor:'#9b5660',wall:'#8793a3',lower:'#434f6d',accent:'#d9c28b',fog:'#8996a4',rows:2,dark:false},
 {name:tr('프로 리그 센터코트'),code:'PRO LEAGUE',floor:'#527c9c',wall:'#46536c',lower:'#293b56',accent:'#88d7d0',fog:'#596a80',rows:2,dark:true},
 {name:tr('국가대표 훈련센터'),code:'TEAM KOREA',floor:'#a75b61',wall:'#cbd5dc',lower:'#394f74',accent:'#e4e9e1',fog:'#aabec9',rows:1,dark:false},
 {name:tr('월드 챔피언십 홀'),code:'WORLD CHAMPIONSHIP',floor:'#416f9b',wall:'#354a68',lower:'#233a59',accent:'#83c9d7',fog:'#4e6b83',rows:3,dark:true},
 {name:tr('올림픽 결승 아레나'),code:'OLYMPIC FINAL',floor:'#7b485e',wall:'#314b54',lower:'#203a45',accent:'#e5c57b',fog:'#506b72',rows:3,dark:true}
];
function forTier(tier){return venues[Math.max(0,Math.min(7,Number.isFinite(tier)?Math.floor(tier):0))];}
function build(tier,{box,sphere,tube}){
 const v=forTier(tier),pale=v.dark?'#dde5df':'#f5f3e5';
 box(0,-.065,0,12,.12,15,v.floor);
 box(0,2.3,-6.2,12,4.6,.14,v.wall);box(-5.8,2.3,0,.14,4.6,12.4,v.wall);box(5.8,2.3,0,.14,4.6,12.4,v.wall);
 box(0,.60,-6.08,11.5,1.2,.12,v.lower);
 for(const x of [-5.68,5.68]){box(x,.60,0,.12,1.2,12.1,v.lower);box(x,1.25,0,.12,.055,12.1,v.accent);}
 // Court boundary and courtside barriers are outside the players movement area.
 for(const x of [-2.65,2.65])box(x,.008,0,.035,.008,7.8,pale);
 for(const z of [-3.9,3.9])box(0,.008,z,5.3,.008,.035,pale);
 for(const x of [-3.15,3.15])for(const z of [-2.5,-.83,.83,2.5]){box(x,.34,z,.055,.65,1.53,v.lower);box(x,.62,z,.07,.035,1.53,v.accent);box(x,.36,z,.065,.12,.48,v.accent);}
 box(0,2.45,-6.05,3.6,.95,.10,v.lower);box(0,2.45,-5.98,3.36,.70,.055,v.dark?'#172d3b':'#edf0e2');
 for(const x of [-.9,.9]){box(x,2.5,-5.94,.42,.07,.025,v.accent);box(x,2.27,-5.94,.42,.07,.025,v.accent);box(x-.18,2.39,-5.94,.06,.26,.025,v.accent);box(x+.18,2.39,-5.94,.06,.26,.025,v.accent);}
 for(const x of [-4.7,4.7]){box(x,2.9,-6.03,.14,2.7,.12,v.accent);box(x,4.04,-5.91,1.05,.12,.35,pale);}
 for(const x of [-4.6,-2.3,0,2.3,4.6])box(x,4.35,-1.1,1.45,.08,.40,pale);
 if(tier===1){
  for(const x of [-5.62,5.62])for(const z of [-3.3,-.7,1.9]){box(x,2.5,z,.10,1.55,1.65,'#bddbd6');box(x,2.5,z,.13,1.65,.06,pale);box(x,2.5,z,.14,.06,1.72,pale);}
  for(const x of [-4.25,4.25]){box(x,.42,-3.1,.72,.12,2.4,'#b4936d');box(x,.72,-3.1,.1,.60,2.4,'#b4936d');}
 }else{
  const colors=['#819bb0','#b58c82','#9dada0','#c2b18b','#727f9f'];
  for(let row=0;row<v.rows;row++)for(let i=0;i<10;i++){
   const x=-4.7+i*1.04,y=.22+row*.30,z=-4.65-row*.46;
   box(x,y,z,.83,.20,.40,v.lower);box(x,y+.22,z-.13,.80,.35,.08,v.accent);
   // Small static crowd meshes: no per-frame spectator animation or geometry creation.
   if((i+row+tier)%4!==0){box(x,y+.46,z,.27,.36,.22,colors[(i+row)%colors.length]);sphere(x,y+.75,z,.115,.13,.11,['#d9b18c','#a47e60','#e1c3a0'][(i+row)%3],4,6);}
  }
 }
 if(tier>=3){
  for(const side of [-1,1]){box(side*4.4,.45,-1.15,.46,.9,.48,v.lower);box(side*4.4,.99,-1.15,.50,.18,.52,'#243b43');box(side*4.4,1.12,-1.15,.38,.06,.44,v.accent);}
  for(let i=0;i<9;i++)box(-4.8+i*1.2,3.65,-6.02,.70,.15,.08,v.accent);
 }
 if(tier===5){
  for(const x of [-3.4,3.4]){box(x,2.55,-6.0,1.08,1.45,.10,'#f0eee2');sphere(x,2.63,-5.91,.20,.20,.03,'#b95e5a',6,12);box(x,2.30,-5.89,.42,.045,.02,'#537ba0');}
 }
 if(tier===6||tier===7){
  const flagColors=['#bb6d69','#e5d6a6','#7b9cae','#93b5a0','#c0a2b1'];
  for(let i=0;i<10;i++){const x=-4.9+i*1.08;box(x,3.18,-6.0,.43,.75,.07,flagColors[i%5]);box(x,3.45,-5.94,.43,.09,.025,pale);}
 }
 if(tier===7){
  const rings=[[-.42,3.55,'#638fa9'],[0,3.55,'#253a42'],[.42,3.55,'#ba706b'],[-.21,3.34,'#dcc071'],[.21,3.34,'#79a285']];
  for(const [x,y,c] of rings)for(let j=0;j<24;j++){const a=j*Math.PI/12,b=(j+1)*Math.PI/12;tube([x+Math.cos(a)*.21,y+Math.sin(a)*.21,-5.88],[x+Math.cos(b)*.21,y+Math.sin(b)*.21,-5.88],.019,c,5);}
  for(const side of [-1,1]){box(side*5.2,1.8,-4.35,.14,3.6,.14,v.accent);box(side*5.2,3.63,-4.35,.65,.12,.5,pale);}
 }
}
window.ClubVenues={venues,forTier,build};
})();
