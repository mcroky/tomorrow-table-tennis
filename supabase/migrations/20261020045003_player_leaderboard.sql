begin;
create schema if not exists ttk_private;
revoke all on schema ttk_private from public,anon,authenticated;
create table public.ttk_leaderboard (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 cleared integer not null check(cleared between 0 and 40),
 stars integer not null check(stars between 0 and 120),
 level integer not null check(level between 1 and 99),
 wins integer not null check(wins>=0),
 losses integer not null check(losses>=0),
 customized boolean not null default false,
 excluded boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.ttk_leaderboard enable row level security;
revoke all on public.ttk_leaderboard from public,anon,authenticated;
grant select on public.ttk_leaderboard to authenticated;
create policy ttk_read_rankings on public.ttk_leaderboard for select to authenticated using (customized and not excluded);
create index ttk_leaderboard_order on public.ttk_leaderboard(cleared desc,stars desc,level desc,wins desc,user_id) where customized and not excluded;

create function ttk_private.rank_projection(p jsonb)
returns table(display_name text,cleared integer,stars integer,level integer,wins integer,losses integer,customized boolean)
language sql immutable set search_path=pg_catalog as $$
 with ids as (
  select distinct e::integer as id from jsonb_array_elements_text(case when jsonb_typeof(p->'cleared')='array' then p->'cleared' else '[]'::jsonb end) e where e ~ '^([0-9]|[1-3][0-9])$'
 )
 select coalesce(nullif(left(trim(regexp_replace(p#>>'{profile,name}','[[:cntrl:]]','','g')),24),''),'Player'),
 (select count(*)::integer from ids),
 (select coalesce(sum(case when (p->'stageMedals'->>id) ~ '^[0-7]$' then (((p->'stageMedals'->>id)::integer & 1) + (((p->'stageMedals'->>id)::integer >> 1) & 1) + (((p->'stageMedals'->>id)::integer >> 2) & 1)) else 0 end),0)::integer from ids),
 case when p->>'level' ~ '^[0-9]{1,9}$' then greatest(1,least(99,(p->>'level')::integer)) else 1 end,
 case when p->>'wins' ~ '^[0-9]{1,9}$' then (p->>'wins')::integer else 0 end,
 case when p->>'losses' ~ '^[0-9]{1,9}$' then (p->>'losses')::integer else 0 end,
 coalesce(p->'customized'='true'::jsonb,false);
$$;
revoke all on function ttk_private.rank_projection(jsonb) from public,anon,authenticated;
create function ttk_private.sync_rankings() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
 insert into public.ttk_leaderboard(user_id,display_name,cleared,stars,level,wins,losses,customized,updated_at)
 select new.user_id,r.*,new.updated_at from ttk_private.rank_projection(new.payload) r
 on conflict(user_id) do update set display_name=excluded.display_name,cleared=excluded.cleared,stars=excluded.stars,level=excluded.level,wins=excluded.wins,losses=excluded.losses,customized=excluded.customized,updated_at=excluded.updated_at;
 return new;
end;
$$;
revoke all on function ttk_private.sync_rankings() from public,anon,authenticated;
create trigger ttk_save_rankings after insert or update of payload on public.ttk_game_saves for each row execute function ttk_private.sync_rankings();
-- Existing development accounts are excluded once, without deleting any saves.
insert into public.ttk_leaderboard(user_id,display_name,cleared,stars,level,wins,losses,customized,updated_at,excluded)
select s.user_id,r.*,s.updated_at,(u.email like 'qa\_ttk\_%' escape '\' or u.email like 'qa\_live\_%' escape '\')
from public.ttk_game_saves s join auth.users u on u.id=s.user_id cross join lateral ttk_private.rank_projection(s.payload) r;

create function public.ttk_get_leaderboard() returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
 with top_players as (
  select user_id,display_name,cleared,stars,level,wins,losses,updated_at,rank() over(order by cleared desc,stars desc,level desc,wins desc) as rank
  from public.ttk_leaderboard order by cleared desc,stars desc,level desc,wins desc,user_id limit 50
 ), mine as (select * from public.ttk_leaderboard where user_id=(select auth.uid())), own_rank as (
  select m.display_name,m.cleared,m.stars,m.level,m.wins,m.losses,m.updated_at,
  (select count(*)+1 from public.ttk_leaderboard l where (l.cleared,l.stars,l.level,l.wins)>(m.cleared,m.stars,m.level,m.wins)) as rank from mine m
 )
 select jsonb_build_object('players',coalesce((select jsonb_agg(to_jsonb(t)-'user_id'||jsonb_build_object('is_me',t.user_id=(select auth.uid())) order by t.rank,t.user_id) from top_players t),'[]'::jsonb),
 'mine',(select to_jsonb(o) from own_rank o),'total',(select count(*) from public.ttk_leaderboard),'fetched_at',now());
$$;
revoke all on function public.ttk_get_leaderboard() from public,anon;
grant execute on function public.ttk_get_leaderboard() to authenticated;
commit;
