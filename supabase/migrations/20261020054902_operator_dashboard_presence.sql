begin;
create table ttk_private.operators (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table ttk_private.operators enable row level security;
revoke all on ttk_private.operators from public,anon,authenticated;
create policy operators_no_client_access on ttk_private.operators as restrictive for all to anon,authenticated using(false) with check(false);
-- Assign the existing login account once. A display-name change cannot grant
-- privileges, and deleting/recreating that account does not inherit its role.
do $$ begin
 if (select count(*) from auth.users where email='roky@players.ttk.invalid')<>1 then raise exception 'OPERATOR_ACCOUNT_NOT_UNIQUE'; end if;
 insert into ttk_private.operators(user_id) select id from auth.users where email='roky@players.ttk.invalid';
end $$;

create table ttk_private.player_presence (
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_seen timestamptz not null default now(),
 activity text not null check(activity in ('map','practice','match'))
);
alter table ttk_private.player_presence enable row level security;
revoke all on ttk_private.player_presence from public,anon,authenticated;
create policy presence_no_client_access on ttk_private.player_presence as restrictive for all to anon,authenticated using(false) with check(false);
create index player_presence_seen on ttk_private.player_presence(last_seen desc);

create function ttk_private.presence_heartbeat(p_activity text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare owner_id uuid:=auth.uid();
begin
 if owner_id is null then raise sqlstate 'PT401' using message='LOGIN_REQUIRED'; end if;
 if p_activity is null or p_activity not in ('map','practice','match') then raise sqlstate 'PT400' using message='INVALID_ACTIVITY'; end if;
 insert into ttk_private.player_presence(user_id,last_seen,activity) values(owner_id,now(),p_activity)
 on conflict(user_id) do update set last_seen=excluded.last_seen,activity=excluded.activity
 where ttk_private.player_presence.last_seen<now()-interval '5 seconds';
 return jsonb_build_object('operator',exists(select 1 from ttk_private.operators where user_id=owner_id),'server_time',now());
end;
$$;
create function ttk_private.operator_dashboard() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if auth.uid() is null or not exists(select 1 from ttk_private.operators where user_id=auth.uid()) then
  raise sqlstate 'PT403' using message='OPERATOR_REQUIRED';
 end if;
 return (
  with visible_presence as (
   select p.*,coalesce(l.display_name,'Player') as player_name,l.level
   from ttk_private.player_presence p left join public.ttk_leaderboard l on l.user_id=p.user_id
   where not coalesce(l.excluded,false)
  ), online_players as (select * from visible_presence where last_seen>now()-interval '90 seconds')
  select jsonb_build_object(
   'online',(select count(*) from online_players),
   'playing',(select count(*) from online_players where activity='match'),
   'active_24h',(select count(*) from visible_presence where last_seen>now()-interval '24 hours'),
   'registered',(select count(*) from auth.users u where not exists(select 1 from public.ttk_leaderboard l where l.user_id=u.id and l.excluded)),
   'new_24h',(select count(*) from auth.users u where u.created_at>now()-interval '24 hours' and not exists(select 1 from public.ttk_leaderboard l where l.user_id=u.id and l.excluded)),
   'feedback',jsonb_build_object('total',(select count(*) from ttk_private.feedback),'pending',(select count(*) from ttk_private.feedback where state in ('pending','sending')),'failed',(select count(*) from ttk_private.feedback where state='failed')),
   'players',coalesce((select jsonb_agg(jsonb_build_object('name',player_name,'level',coalesce(level,1),'activity',activity,'last_seen',last_seen) order by last_seen desc) from (select * from online_players order by last_seen desc limit 50) p),'[]'::jsonb),
   'fetched_at',now()
  )
 );
end;
$$;
revoke all on function ttk_private.presence_heartbeat(text),ttk_private.operator_dashboard() from public,anon,authenticated;
grant execute on function ttk_private.presence_heartbeat(text),ttk_private.operator_dashboard() to authenticated;
create function public.ttk_presence_heartbeat(p_activity text) returns jsonb language sql security invoker set search_path=pg_catalog as $$select ttk_private.presence_heartbeat(p_activity);$$;
create function public.ttk_operator_dashboard() returns jsonb language sql security invoker set search_path=pg_catalog as $$select ttk_private.operator_dashboard();$$;
revoke all on function public.ttk_presence_heartbeat(text),public.ttk_operator_dashboard() from public,anon,authenticated;
grant execute on function public.ttk_presence_heartbeat(text),public.ttk_operator_dashboard() to authenticated;
commit;
