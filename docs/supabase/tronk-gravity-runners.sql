-- Apply after plataforma.sql, with the existing game_scores table.
begin;

alter table public.game_scores drop constraint if exists game_scores_game_check;
alter table public.game_scores add constraint game_scores_game_check
  check (game in ('antitronks', 'protect-mogos', 'stick-drill', 'tronk-fight', 'miente', 'survivors', 'gravity-runners'));

create table if not exists public.gravity_runner_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now()
);
create index if not exists gravity_runner_tickets_owner on public.gravity_runner_tickets(user_id, started_at desc);
alter table public.gravity_runner_tickets enable row level security;
revoke all on public.gravity_runner_tickets from public, anon, authenticated;

create or replace function public.start_gravity_runner_record()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_ticket uuid;
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'Necesitas iniciar sesion' using errcode = '42501';
  end if;
  -- Keep a small window for quick restarts and multiple tabs.
  delete from public.gravity_runner_tickets where id in (
    select id from public.gravity_runner_tickets where user_id = v_user
    order by started_at desc, id offset 7
  );
  insert into public.gravity_runner_tickets(user_id) values (v_user) returning id into v_ticket;
  return v_ticket;
end;
$$;

create or replace function public.submit_gravity_runner_record(
  p_ticket uuid, p_seconds integer, p_distance integer, p_score integer
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_best numeric;
  v_started timestamptz;
begin
  if v_user is null then
    raise exception 'Necesitas iniciar sesion' using errcode = '42501';
  end if;
  -- The original mode is client-side. Bound impossible timing, distance and score.
  if p_seconds is null or p_seconds not between 3 and 14400
     or p_distance is null or p_distance not between 1 and (p_seconds + 1) * 32
     or p_score is null or p_score not between 1 and p_distance * 540 + 12000 then
    raise exception 'Resultado de partida no valido' using errcode = '22023';
  end if;

  delete from public.gravity_runner_tickets
    where id = p_ticket and user_id = v_user
    returning started_at into v_started;
  if v_started is null or v_started < now() - interval '5 hours'
     or p_seconds > extract(epoch from now() - v_started) + 4 then
    raise exception 'Ticket de partida no valido' using errcode = '22023';
  end if;

  insert into public.game_scores as s (user_id, game, score)
    values (v_user, 'gravity-runners', p_score)
    on conflict (user_id, game) do update set
      score = greatest(s.score, excluded.score),
      updated_at = case when excluded.score > s.score then now() else s.updated_at end
    returning score into v_best;
  return v_best;
end;
$$;

revoke all on function public.start_gravity_runner_record() from public, anon;
revoke all on function public.submit_gravity_runner_record(uuid, integer, integer, integer) from public, anon;
grant execute on function public.start_gravity_runner_record() to authenticated;
grant execute on function public.submit_gravity_runner_record(uuid, integer, integer, integer) to authenticated;
commit;
