(() => {
'use strict';
const tr=window.ClubI18n.t;
const opener=document.createElement('button');opener.id='feedbackOpen';opener.type='button';opener.textContent='✉ '+tr('의견 보내기');opener.setAttribute('aria-haspopup','dialog');opener.setAttribute('aria-controls','feedbackDialog');document.getElementById('rankingOpen').after(opener);
const dialog=document.createElement('dialog');dialog.id='feedbackDialog';dialog.className='feedback-dialog';dialog.setAttribute('aria-labelledby','feedbackTitle');
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=tr(text);return n;};
const header=node('header'),title=node('h2','개선사항 보내기'),close=node('button','닫기');title.id='feedbackTitle';close.type='button';header.append(title,close);
const form=node('form'),description=node('p','더 재미있는 탁구 게임을 위해 의견을 들려주세요.'),categoryLabel=node('label','의견 종류'),category=node('select');
category.name='category';for(const [value,label] of [['idea','개선 제안'],['bug','버그 제보'],['other','기타 의견']]){const option=node('option',label);option.value=value;category.append(option);}categoryLabel.append(category);
const messageLabel=node('label','내용'),message=node('textarea');message.name='message';message.required=true;message.minLength=10;message.maxLength=2000;message.rows=7;message.placeholder=tr('불편했던 점이나 원하는 기능을 구체적으로 적어주세요.');messageLabel.append(message);
const counter=node('small','0 / 2000'),privacy=node('p','선수 이름과 의견 내용이 운영자에게 전달됩니다. 비밀번호나 개인정보는 적지 마세요.');privacy.className='feedback-privacy';
const status=node('p');status.className='feedback-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const submit=node('button','보내기');submit.type='submit';submit.className='feedback-submit';form.append(description,categoryLabel,messageLabel,counter,privacy,status,submit);dialog.append(header,form);document.body.append(dialog);
let busy=false,receipt=null,fingerprint='';
const resetReceipt=()=>{const next=category.value+'\n'+message.value.trim();if(next!==fingerprint){fingerprint=next;receipt=null;}counter.textContent=message.value.length+' / 2000';};
message.addEventListener('input',resetReceipt);category.addEventListener('change',resetReceipt);
opener.onclick=()=>{if(window.ClubCareer.hasActiveMatch())return;status.textContent='';dialog.showModal();message.focus();};close.onclick=()=>dialog.close();
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>opener.focus({preventScroll:true}));
form.onsubmit=async event=>{event.preventDefault();if(busy)return;const content=message.value.trim();if(content.length<10){status.textContent=tr('내용을 10자 이상 입력해주세요.');message.focus();return;}
 resetReceipt();receipt=receipt||crypto.randomUUID();busy=true;submit.disabled=true;close.disabled=true;message.disabled=true;category.disabled=true;status.textContent=tr('의견을 보내는 중…');
 try{await window.ClubAccount.submitFeedback({id:receipt,category:category.value,message:content,language:document.documentElement.lang});status.textContent=tr('의견을 접수했어요. 감사합니다!');message.value='';receipt=null;fingerprint='';counter.textContent='0 / 2000';}
 catch(error){status.textContent=tr(error?.code==='PT429'?'잠시 후 다시 보내주세요. 의견은 10분에 3번, 하루에 5번 보낼 수 있어요.':'전송하지 못했어요. 입력한 내용은 유지됩니다. 잠시 뒤 다시 시도해주세요.');}
 finally{busy=false;submit.disabled=false;close.disabled=false;message.disabled=false;category.disabled=false;}
};
})();
