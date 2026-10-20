begin;
-- The network queue contains only a worker trigger; private mail credentials
-- and the recipient are read by the Edge Function directly from Vault.
do $$ begin
 if not exists(select 1 from vault.secrets where name='ttk_feedback_worker') then
  perform vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'ttk_feedback_worker');
 end if;
end $$;
create or replace function ttk_private.deliver_feedback() returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare worker text;
begin
 if not exists(select 1 from ttk_private.feedback where state in ('pending','sending')) then return; end if;
 select decrypted_secret into worker from vault.decrypted_secrets where name='ttk_feedback_worker';
 perform net.http_post(url:='https://jcmceanrkrrigaafoitm.supabase.co/functions/v1/feedback-delivery',
  headers:=jsonb_build_object('Content-Type','application/json','x-feedback-worker',worker),
  body:='{"op":"drain"}'::jsonb,timeout_milliseconds:=20000);
end;
$$;
create function ttk_private.feedback_config() returns jsonb
language sql security definer set search_path=pg_catalog as $$
 select jsonb_object_agg(name,decrypted_secret) from vault.decrypted_secrets
 where name in ('ttk_feedback_resend_key','ttk_feedback_to','ttk_feedback_from','ttk_feedback_worker');
$$;
create function ttk_private.claim_feedback() returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare item ttk_private.feedback;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('ttk-feedback-delivery',0)) then return null; end if;
 update ttk_private.feedback set state=case when attempts>=5 then 'failed' else 'pending' end
 where state='sending' and attempted_at<now()-interval '5 minutes';
 update ttk_private.feedback set state='failed' where state='pending' and created_at<now()-interval '23 hours';
 select * into item from ttk_private.feedback where state='pending' and attempts<5
 and (attempted_at is null or attempted_at<now()-make_interval(mins=>least(30,attempts*attempts)))
 order by created_at limit 1 for update skip locked;
 if not found then return null; end if;
 update ttk_private.feedback set state='sending',attempts=attempts+1,attempted_at=now(),request_id=null where id=item.id;
 return jsonb_build_object('id',item.id,'category',item.category,'message',item.message,'player_name',item.player_name,'language',item.language,'created_at',item.created_at,'attempt',item.attempts+1);
end;
$$;
create function ttk_private.finish_feedback(p_id uuid,p_attempt integer,p_status integer,p_provider_id text) returns void
language sql security definer set search_path=pg_catalog as $$
 update ttk_private.feedback set
 state=case when p_status between 200 and 299 then 'accepted' when attempts>=5 or (p_status between 400 and 499 and p_status not in (408,409,429)) then 'failed' else 'pending' end,
 last_status=p_status,provider_id=left(p_provider_id,100),accepted_at=case when p_status between 200 and 299 then now() else null end
 where id=p_id and attempts=p_attempt and state='sending';
$$;
revoke all on function ttk_private.feedback_config(),ttk_private.claim_feedback(),ttk_private.finish_feedback(uuid,integer,integer,text) from public,anon,authenticated;
grant usage on schema ttk_private to service_role;
grant execute on function ttk_private.feedback_config(),ttk_private.claim_feedback(),ttk_private.finish_feedback(uuid,integer,integer,text) to service_role;
create function public.ttk_feedback_config() returns jsonb language sql security invoker set search_path=pg_catalog as $$select ttk_private.feedback_config();$$;
create function public.ttk_claim_feedback() returns jsonb language sql security invoker set search_path=pg_catalog as $$select ttk_private.claim_feedback();$$;
create function public.ttk_finish_feedback(p_id uuid,p_attempt integer,p_status integer,p_provider_id text) returns void language sql security invoker set search_path=pg_catalog as $$select ttk_private.finish_feedback(p_id,p_attempt,p_status,p_provider_id);$$;
revoke all on function public.ttk_feedback_config(),public.ttk_claim_feedback(),public.ttk_finish_feedback(uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.ttk_feedback_config(),public.ttk_claim_feedback(),public.ttk_finish_feedback(uuid,integer,integer,text) to service_role;
commit;
