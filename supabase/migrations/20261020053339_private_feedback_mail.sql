-- Recipient and provider key belong in Vault, never in this repository.
begin;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table ttk_private.feedback (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('idea','bug','other')),
 message text not null check(char_length(message) between 10 and 2000),
 player_name text not null,
 language text not null,
 created_at timestamptz not null default now(),
 state text not null default 'pending' check(state in ('pending','sending','accepted','failed')),
 attempts integer not null default 0,
 request_id bigint,
 attempted_at timestamptz,
 accepted_at timestamptz,
 provider_id text,
 last_status integer
);
alter table ttk_private.feedback enable row level security;
revoke all on ttk_private.feedback from public,anon,authenticated;
create index feedback_user_time on ttk_private.feedback(user_id,created_at desc);
create index feedback_pending on ttk_private.feedback(created_at) where state in ('pending','sending');

-- Runs only as the database owner. No provider response, key or address is
-- returned to players. API acceptance is distinct from inbox delivery.
create function ttk_private.deliver_feedback() returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare
 item record;
 api_key text;
 recipient text;
 sender text;
 request bigint;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('ttk-feedback-delivery',0)) then return; end if;
 update ttk_private.feedback f set state='accepted',accepted_at=now(),provider_id=(r.content::jsonb)->>'id',last_status=r.status_code
 from net._http_response r where f.state='sending' and f.request_id=r.id and r.status_code between 200 and 299
 and left(ltrim(coalesce(r.content,'')),1)='{';
 update ttk_private.feedback f set state=case when f.attempts>=5 or (r.status_code between 400 and 499 and r.status_code not in (408,409,429)) then 'failed' else 'pending' end,last_status=r.status_code
 from net._http_response r where f.state='sending' and f.request_id=r.id and (r.status_code is null or r.status_code not between 200 and 299 or r.timed_out or r.error_msg is not null);
 -- Lost worker responses are retried with the same Resend idempotency key.
 update ttk_private.feedback set state=case when attempts>=5 then 'failed' else 'pending' end
 where state='sending' and attempted_at<now()-interval '5 minutes';
 update ttk_private.feedback set state='failed' where state='pending' and created_at<now()-interval '23 hours';
 select decrypted_secret into api_key from vault.decrypted_secrets where name='ttk_feedback_resend_key';
 select decrypted_secret into recipient from vault.decrypted_secrets where name='ttk_feedback_to';
 select decrypted_secret into sender from vault.decrypted_secrets where name='ttk_feedback_from';
 if api_key is null or recipient is null or sender is null then return; end if;
 -- At most one request per tick stays below the provider's per-second limit.
 for item in select * from ttk_private.feedback where state='pending' and attempts<5
 and (attempted_at is null or attempted_at<now()-make_interval(mins=>least(30,attempts*attempts)))
 order by created_at limit 1 for update skip locked loop
  request:=net.http_post(url:='https://api.resend.com/emails',
   headers:=jsonb_build_object('Authorization','Bearer '||api_key,'Content-Type','application/json','Idempotency-Key','ttk-feedback/'||item.id),
   body:=jsonb_build_object('from',sender,'to',jsonb_build_array(recipient),
    'subject','[내일은 탁구왕] '||case item.category when 'bug' then '버그 제보' when 'idea' then '개선 제안' else '기타 의견' end,
    'text',concat('접수 번호: ',item.id,E'\n선수: ',item.player_name,E'\n언어: ',item.language,E'\n접수 시각(UTC): ',to_char(item.created_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'),E'\n\n',item.message)),
   timeout_milliseconds:=10000);
  update ttk_private.feedback set state='sending',attempts=attempts+1,request_id=request,attempted_at=now() where id=item.id;
 end loop;
end;
$$;
revoke all on function ttk_private.deliver_feedback() from public,anon,authenticated;

create function ttk_private.submit_feedback(p_id uuid,p_category text,p_message text,p_language text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare owner_id uuid:=auth.uid(); existing ttk_private.feedback; clean_message text:=btrim(p_message); player text;
begin
 if owner_id is null then raise sqlstate 'PT401' using message='LOGIN_REQUIRED'; end if;
 if p_id is null or p_category is null or p_category not in ('idea','bug','other') or clean_message is null or char_length(clean_message) not between 10 and 2000 then
  raise sqlstate 'PT400' using message='INVALID_FEEDBACK';
 end if;
 -- Serialize limits across all accounts, including concurrent submissions.
 perform pg_advisory_xact_lock(hashtextextended('ttk-feedback-submit',0));
 select * into existing from ttk_private.feedback where id=p_id;
 if found then
  if existing.user_id=owner_id and existing.category=p_category and existing.message=clean_message then return jsonb_build_object('id',existing.id,'received',true); end if;
  raise sqlstate 'PT409' using message='FEEDBACK_CONFLICT';
 end if;
 if (select count(*) from ttk_private.feedback where user_id=owner_id and created_at>now()-interval '10 minutes')>=3
 or (select count(*) from ttk_private.feedback where user_id=owner_id and created_at>now()-interval '24 hours')>=5
 or (select count(*) from ttk_private.feedback where created_at>now()-interval '24 hours')>=80 then
  raise sqlstate 'PT429' using message='FEEDBACK_RATE_LIMIT';
 end if;
 select display_name into player from public.ttk_leaderboard where user_id=owner_id;
 insert into ttk_private.feedback(id,user_id,category,message,player_name,language)
 values(p_id,owner_id,p_category,clean_message,coalesce(player,'Player'),case when p_language in ('ko','en','ja','zh-CN') then p_language else 'ko' end);
 return jsonb_build_object('id',p_id,'received',true);
end;
$$;
revoke all on function ttk_private.submit_feedback(uuid,text,text,text) from public,anon,authenticated;
grant usage on schema ttk_private to authenticated;
grant execute on function ttk_private.submit_feedback(uuid,text,text,text) to authenticated;
create function public.ttk_submit_feedback(p_id uuid,p_category text,p_message text,p_language text)
returns jsonb language sql security invoker set search_path=pg_catalog as $$
 select ttk_private.submit_feedback(p_id,p_category,p_message,p_language);
$$;
revoke all on function public.ttk_submit_feedback(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.ttk_submit_feedback(uuid,text,text,text) to authenticated;
select cron.schedule('ttk-feedback-delivery','* * * * *','select ttk_private.deliver_feedback();');
commit;
