// No mail configuration or provider error body is returned to public callers.
const base=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function rpc(name:string,body:Record<string,unknown>={}){
 const response=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('INTERNAL');
 const text=await response.text();return text?JSON.parse(text):null;
}
async function equalSecret(a:string,b:string){
 const digest=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const [x,y]=await Promise.all([digest(a),digest(b)]);let result=0;for(let i=0;i<x.length;i++)result|=x[i]^y[i];return result===0;
}
Deno.serve(async(req:Request)=>{
 const reply=(status:number)=>new Response(JSON.stringify({ok:status===200}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply(405);
 const token=req.headers.get('x-feedback-worker')||'';if(token.length<32||token.length>100)return reply(401);
 try{
  const config=await rpc('ttk_feedback_config');
  if(!config?.ttk_feedback_worker||!await equalSecret(token,config.ttk_feedback_worker))return reply(401);
  if(!config.ttk_feedback_resend_key||!config.ttk_feedback_to||!config.ttk_feedback_from)return reply(503);
  for(let i=0;i<3;i++){
   const item=await rpc('ttk_claim_feedback');if(!item)break;
   let status=0,providerId:null|string=null;
   try{
    const category={bug:'버그 제보',idea:'개선 제안',other:'기타 의견'}[item.category as 'bug'|'idea'|'other']||'의견';
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+config.ttk_feedback_resend_key,'Content-Type':'application/json','Idempotency-Key':'ttk-feedback/'+item.id},
     body:JSON.stringify({from:config.ttk_feedback_from,to:[config.ttk_feedback_to],subject:'[내일은 탁구왕] '+category,
      text:'접수 번호: '+item.id+'\n선수: '+item.player_name+'\n언어: '+item.language+'\n접수 시각: '+item.created_at+'\n\n'+item.message}),signal:AbortSignal.timeout(10000)});
    status=response.status;if(response.ok){const data=await response.json();if(typeof data.id==='string')providerId=data.id;else status=502;}
    else await response.body?.cancel();
   }catch{status=0;}
   await rpc('ttk_finish_feedback',{p_id:item.id,p_attempt:item.attempt,p_status:status,p_provider_id:providerId});
   if(status===429)break;
   if(i<2)await new Promise(resolve=>setTimeout(resolve,600));
  }
  return reply(200);
 }catch{return reply(503);}
});
