-- Business save conflicts must return HTTP 409, not trigger transaction retries.
begin;
create or replace function public.ttk_save_progress(p_payload jsonb, p_expected_revision bigint)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_user uuid := auth.uid(); v_revision bigint; v_updated timestamptz;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'version' is distinct from '3'
    or octet_length(p_payload::text) > 262144 or p_expected_revision is null or p_expected_revision < 0 then
  raise exception 'INVALID_SAVE' using errcode='22023';
 end if;
 if p_expected_revision = 0 then
  insert into public.ttk_game_saves as s(user_id,payload) values(v_user,p_payload)
   on conflict (user_id) do nothing returning s.revision,s.updated_at into v_revision,v_updated;
 else
  update public.ttk_game_saves as s set payload=p_payload,revision=s.revision+1,updated_at=clock_timestamp()
   where s.user_id=v_user and s.revision=p_expected_revision returning s.revision,s.updated_at into v_revision,v_updated;
 end if;
 if v_revision is null then raise exception 'SAVE_CONFLICT' using errcode='PT409'; end if;
 return query select v_revision,v_updated;
end;
$$;
commit;
