(() => {
'use strict';
const KEY='tomorrow-table-tennis-language',supported=['ko','en','ja','zh-CN'],catalog=window.ClubLocales||{};
let lang='ko';try{const saved=localStorage.getItem(KEY);if(supported.includes(saved))lang=saved;}catch{}
const index={en:0,ja:1,'zh-CN':2}[lang],cache=new Map();
const keys=Object.keys(catalog).sort((a,b)=>b.length-a.length),pattern=new RegExp(keys.map(k=>k.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&')).join('|'),'g');
function t(value){
 if(lang==='ko'||typeof value!=='string')return value;
 if(cache.has(value))return cache.get(value);
 const translated=value.replace(pattern,key=>catalog[key][index]);if(cache.size>=4096)cache.clear();cache.set(value,translated);return translated;
}
let locked=false;
function mountPicker(parent){
 const label=document.createElement('label');label.className='language-picker';label.setAttribute('data-i18n-skip','');
 const name=document.createElement('span');name.textContent=t('언어');
 const select=document.createElement('select');select.setAttribute('aria-label',t('언어'));
 for(const [id,text] of [['ko','한국어'],['en','English'],['ja','日本語'],['zh-CN','简体中文']]){const option=document.createElement('option');option.value=id;option.textContent=text;select.append(option);}
 select.value=lang;label.append(name,select);parent.append(label);
 select.onchange=()=>{if(locked){select.value=lang;return;}try{localStorage.setItem(KEY,select.value);}catch{select.value=lang;return;}location.reload();};
 select.disabled=locked;return select;
}
function setLocked(value){
 if(locked===!!value)return;locked=!!value;
 document.querySelectorAll('.language-picker select').forEach(select=>{select.disabled=locked;select.title=locked?t('경기 중에는 언어를 바꿀 수 없어요. 종료 후 변경해주세요.') : '';});
}
function translateInitialPage(){
 const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT,{acceptNode:node=>node.parentElement?.closest('script,style,select,[data-i18n-skip]')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}),nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes)node.nodeValue=t(node.nodeValue);
 for(const element of document.querySelectorAll('[aria-label],[title],[data-sound-label]'))for(const attr of ['aria-label','title','data-sound-label'])if(element.hasAttribute(attr))element.setAttribute(attr,t(element.getAttribute(attr)));
}
document.documentElement.lang=lang;
window.ClubI18n={t,language:lang,mountPicker,setLocked};
translateInitialPage();mountPicker(document.querySelector('header'));
})();
