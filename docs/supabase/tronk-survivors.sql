-- TronkStudios · docs/supabase/tronk-survivors.sql
-- Tronk Survivors (/survivors/):
--   1. Sus récords (puntos) salen en la clasificación y cuentan para los retos.
--   2. El progreso (monedas, personajes, mejoras, logros) se guarda en la
--      cuenta para no perderlo al cambiar de navegador o de dispositivo.
--   3. Reto diario: una partida igual para todos cada día, con su clasificación.
--   4. Modo infinito: clasificación de quién aguanta más tras ganar.
--   5. Récords comprobados: cada partida pide un «ticket» al empezar y al
--      acabar el servidor comprueba que los números son posibles y calcula
--      él mismo los puntos. Ya no se pueden mandar puntos sueltos.
-- El modo con amigos no necesita tablas: usa los canales de Realtime.
--
-- Hace falta haber ejecutado ANTES plataforma.sql, comunidad.sql, retos.sql
-- y el-juego-miente.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.

/* Los récords y los retos admiten el juego «survivors» */
alter table public.game_scores
  drop constraint if exists game_scores_game_check;

alter table public.game_scores
  add constraint game_scores_game_check
  check (game in ('antitronks', 'protect-mogos', 'stick-drill', 'tronk-fight', 'miente', 'survivors'));

alter table public.challenges
  drop constraint if exists challenges_game_check;

alter table public.challenges
  add constraint challenges_game_check
  check (game in ('antitronks', 'protect-mogos', 'stick-drill', 'tronk-fight', 'miente', 'survivors'));

/* =========================================================
   RÉCORDS (la misma función que el-juego-miente.sql, con «survivors»)
   ========================================================= */

create or replace function public.submit_score(p_game text, p_score numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_max numeric;
  v_before numeric;
  v_best numeric;
  v_leader uuid;
  v_leader_score numeric;
  v_title text;
  v_name text;
begin
  if v_user is null then
    raise exception 'Necesitas iniciar sesión para guardar récords';
  end if;

  v_max := case p_game
    when 'antitronks' then 1000000
    when 'protect-mogos' then 1000000
    when 'stick-drill' then 3600
    when 'miente' then 100000
    when 'survivors' then 1000000
    else null
  end;

  if v_max is null then
    raise exception 'Juego no válido';
  end if;

  -- Tronk Survivors solo guarda récords a través de submit_survivors_run
  if p_game = 'survivors' and coalesce(current_setting('tronk.survivors', true), '') <> 'ok' then
    raise exception 'Partida no válida';
  end if;

  if p_score is null or p_score < 0 or p_score > v_max then
    raise exception 'Puntuación no válida';
  end if;

  select score into v_before
  from public.game_scores
  where user_id = v_user and game = p_game;

  select user_id, score into v_leader, v_leader_score
  from public.game_scores
  where game = p_game and user_id <> v_user
  order by score desc, updated_at asc
  limit 1;

  insert into public.game_scores (user_id, game, score)
  values (v_user, p_game, round(p_score, 1))
  on conflict (user_id, game) do update
    set score = greatest(game_scores.score, excluded.score),
        updated_at = case
          when excluded.score > game_scores.score then now()
          else game_scores.updated_at
        end
  returning score into v_best;

  -- Si acabas de pasar al primero, se le avisa
  if v_leader is not null
    and v_best > v_leader_score
    and coalesce(v_before, 0) <= v_leader_score then
    v_title := case p_game
      when 'antitronks' then 'Antitronks'
      when 'protect-mogos' then 'Protect Mogos'
      when 'miente' then 'El Juego Miente'
      when 'survivors' then 'Tronk Survivors'
      else 'Stick Drill'
    end;

    select display_name into v_name from public.profiles where id = v_user;

    perform public.notify_user(
      v_leader,
      'record',
      format('%s ha superado tu récord en %s', coalesce(v_name, 'Alguien'), v_title),
      '#minijuegos'
    );
  end if;

  return v_best;
end;
$$;

revoke all on function public.submit_score(text, numeric) from public, anon;
grant execute on function public.submit_score(text, numeric) to authenticated;

/* =========================================================
   RETOS (la misma función que el-juego-miente.sql, con «survivors»)
   ========================================================= */

create or replace function public.add_challenge_progress(p_game text, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_max integer;
  v_amount integer;
  v_challenge record;
  v_count integer := 0;
begin
  if v_user is null
    or not exists (select 1 from public.profiles where id = v_user) then
    return 0;
  end if;

  -- Máximo razonable en una sola partida
  v_max := case p_game
    when 'antitronks' then 300      -- Antitronks derribados
    when 'protect-mogos' then 400   -- ninjas derrotados
    when 'stick-drill' then 600     -- segundos aguantados
    when 'tronk-fight' then 1       -- victorias
    when 'miente' then 300          -- aciertos
    when 'survivors' then 3000      -- enemigos derrotados
    else 0
  end;

  if p_game = 'survivors' and coalesce(current_setting('tronk.survivors', true), '') <> 'ok' then
    return 0;
  end if;

  v_amount := least(greatest(coalesce(p_amount, 0), 0), v_max);

  if v_amount = 0 then
    return 0;
  end if;

  for v_challenge in
    select id, goal, progress
    from public.challenges
    where game = p_game
      and completed_at is null
      and now() between starts_at and ends_at
    for update
  loop
    -- Pausa mínima de 8 segundos entre partidas que cuentan
    if exists (
      select 1 from public.challenge_contributions
      where challenge_id = v_challenge.id
        and user_id = v_user
        and updated_at > now() - interval '8 seconds'
    ) then
      continue;
    end if;

    insert into public.challenge_contributions (challenge_id, user_id, amount, updated_at)
    values (v_challenge.id, v_user, v_amount, now())
    on conflict (challenge_id, user_id)
    do update set amount = challenge_contributions.amount + excluded.amount,
                  updated_at = now();

    update public.challenges
    set progress = progress + v_amount,
        completed_at = case
          when progress + v_amount >= goal then now()
          else null
        end
    where id = v_challenge.id;

    -- Reto superado: aviso a todos los que han ayudado
    if v_challenge.progress + v_amount >= v_challenge.goal then
      insert into public.notifications (user_id, kind, message, link)
      select c.user_id, 'challenge',
             left('¡Reto superado entre todos! ' || ch.title, 200), '#minijuegos'
      from public.challenge_contributions c
      join public.challenges ch on ch.id = c.challenge_id
      where c.challenge_id = v_challenge.id;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.add_challenge_progress(text, integer) from public, anon;
grant execute on function public.add_challenge_progress(text, integer) to authenticated;

/* =========================================================
   PROGRESO GUARDADO EN LA CUENTA
   ========================================================= */

create table if not exists public.survivors_saves (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.survivors_saves enable row level security;

drop policy if exists "Cada uno ve su progreso" on public.survivors_saves;
create policy "Cada uno ve su progreso"
  on public.survivors_saves for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.survivors_saves from anon, authenticated;

create or replace function public.save_survivors(p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_at timestamptz := now();
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'Necesitas iniciar sesión';
  end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 20000 then
    raise exception 'Progreso no válido';
  end if;

  insert into public.survivors_saves (user_id, data, updated_at)
  values (v_user, p_data, v_at)
  on conflict (user_id) do update set data = excluded.data, updated_at = v_at;

  return v_at;
end;
$$;

revoke all on function public.save_survivors(jsonb) from public, anon;
grant execute on function public.save_survivors(jsonb) to authenticated;

/* =========================================================
   RETO DIARIO
   ========================================================= */

create table if not exists public.survivors_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  score numeric not null default 0 check (score >= 0 and score <= 1000000),
  character text not null default '' check (char_length(character) <= 20),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists survivors_daily_day_idx
  on public.survivors_daily (day, score desc);

alter table public.survivors_daily enable row level security;

drop policy if exists "Reto diario visible para todos" on public.survivors_daily;
create policy "Reto diario visible para todos"
  on public.survivors_daily for select
  using (true);

revoke insert, update, delete on public.survivors_daily from anon, authenticated;

create or replace function public.submit_survivors_daily(p_day date, p_score numeric, p_character text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_best numeric;
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'Necesitas iniciar sesión';
  end if;

  -- Solo el reto de hoy (se admite el de ayer por la diferencia horaria)
  if p_day is null or p_day < current_date - 1 or p_day > current_date + 1 then
    raise exception 'Día no válido';
  end if;

  if p_score is null or p_score < 0 or p_score > 1000000 then
    raise exception 'Puntuación no válida';
  end if;

  insert into public.survivors_daily (user_id, day, score, character)
  values (v_user, p_day, round(p_score), left(coalesce(p_character, ''), 20))
  on conflict (user_id, day) do update
    set score = greatest(survivors_daily.score, excluded.score),
        character = case when excluded.score > survivors_daily.score then excluded.character else survivors_daily.character end,
        updated_at = now()
  returning score into v_best;

  return v_best;
end;
$$;

-- Solo se usa desde submit_survivors_run
revoke all on function public.submit_survivors_daily(date, numeric, text) from public, anon, authenticated;

/* =========================================================
   MODO INFINITO
   ========================================================= */

create table if not exists public.survivors_endless (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  seconds integer not null default 0 check (seconds >= 0 and seconds <= 14400),
  kills integer not null default 0 check (kills >= 0),
  character text not null default '' check (char_length(character) <= 20),
  map text not null default '' check (char_length(map) <= 20),
  updated_at timestamptz not null default now()
);

create index if not exists survivors_endless_seconds_idx
  on public.survivors_endless (seconds desc);

alter table public.survivors_endless enable row level security;

drop policy if exists "Modo infinito visible para todos" on public.survivors_endless;
create policy "Modo infinito visible para todos"
  on public.survivors_endless for select
  using (true);

revoke insert, update, delete on public.survivors_endless from anon, authenticated;

/* =========================================================
   PARTIDAS COMPROBADAS
   ========================================================= */

-- Cada partida: cuándo empezó y si ya se ha usado (privada, sin políticas)
create table if not exists public.survivors_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  points integer
);

create index if not exists survivors_runs_user_idx
  on public.survivors_runs (user_id, started_at desc);

alter table public.survivors_runs enable row level security;
revoke all on public.survivors_runs from anon, authenticated;

-- Al empezar una partida: devuelve el ticket
create or replace function public.start_survivors_run()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'Necesitas iniciar sesión';
  end if;

  -- Como mucho 60 partidas por hora
  if (select count(*) from public.survivors_runs
      where user_id = v_user and started_at > now() - interval '1 hour') >= 60 then
    raise exception 'Demasiadas partidas seguidas';
  end if;

  -- Limpieza de tickets viejos sin usar
  delete from public.survivors_runs
  where user_id = v_user and finished_at is null and started_at < now() - interval '1 day';

  insert into public.survivors_runs (user_id) values (v_user) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.start_survivors_run() from public, anon;
grant execute on function public.start_survivors_run() to authenticated;

-- Al acabar: comprueba la partida, calcula los puntos y los guarda en
-- la clasificación, los retos, el reto diario y el modo infinito.
create or replace function public.submit_survivors_run(
  p_run uuid,
  p_seconds integer,
  p_kills integer,
  p_bosses integer,
  p_level integer,
  p_victory boolean,
  p_endless boolean,
  p_character text,
  p_map text,
  p_daily date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_run public.survivors_runs;
  v_elapsed numeric;
  v_points integer;
  v_best numeric;
  v_max_bosses integer;
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'Necesitas iniciar sesión';
  end if;

  select * into v_run from public.survivors_runs
  where id = p_run and user_id = v_user
  for update;

  if v_run.id is null or v_run.finished_at is not null then
    raise exception 'Partida no válida';
  end if;

  p_victory := coalesce(p_victory, false);
  p_endless := coalesce(p_endless, false);

  -- La partida no puede durar más que el tiempo que ha pasado de verdad
  -- (con pausas puede durar menos, nunca más)
  v_elapsed := extract(epoch from now() - v_run.started_at);
  if p_seconds is null or p_seconds < 0 or p_seconds > v_elapsed * 1.05 + 5 then
    raise exception 'Partida no válida';
  end if;

  if p_seconds > (case when p_endless then 14400 else 1800 end) then
    raise exception 'Partida no válida';
  end if;

  -- Números posibles
  v_max_bosses := 4 + (case when p_endless then greatest(p_seconds - 600, 0) / 90 + 1 else 0 end);
  if p_kills is null or p_kills < 0 or p_kills > p_seconds * 20 + 100
    or p_bosses is null or p_bosses < 0 or p_bosses > v_max_bosses
    or p_level is null or p_level < 1 or p_level > 400
    or (p_victory and (p_seconds < 320 or p_bosses < 1))
    or (p_endless and not p_victory)
    or coalesce(p_character, '') !~ '^[a-z]{2,12}$'
    or coalesce(p_map, '') !~ '^[a-z]{2,12}$' then
    raise exception 'Partida no válida';
  end if;

  -- Los puntos los calcula el servidor
  v_points := least(1000000, p_kills + p_seconds * 5 + p_bosses * 500 + case when p_victory then 2000 else 0 end);

  update public.survivors_runs set finished_at = now(), points = v_points where id = v_run.id;

  perform set_config('tronk.survivors', 'ok', true);
  v_best := public.submit_score('survivors', v_points);
  if p_kills > 0 then
    perform public.add_challenge_progress('survivors', least(p_kills, 3000));
  end if;
  if p_daily is not null then
    perform public.submit_survivors_daily(p_daily, v_points, p_character);
  end if;
  perform set_config('tronk.survivors', '', true);

  if p_endless then
    insert into public.survivors_endless (user_id, seconds, kills, character, map)
    values (v_user, p_seconds, p_kills, p_character, p_map)
    on conflict (user_id) do update
      set seconds = greatest(survivors_endless.seconds, excluded.seconds),
          kills = case when excluded.seconds > survivors_endless.seconds then excluded.kills else survivors_endless.kills end,
          character = case when excluded.seconds > survivors_endless.seconds then excluded.character else survivors_endless.character end,
          map = case when excluded.seconds > survivors_endless.seconds then excluded.map else survivors_endless.map end,
          updated_at = now();
  end if;

  return jsonb_build_object('points', v_points, 'best', v_best);
end;
$$;

revoke all on function public.submit_survivors_run(uuid, integer, integer, integer, integer, boolean, boolean, text, text, date) from public, anon;
grant execute on function public.submit_survivors_run(uuid, integer, integer, integer, integer, boolean, boolean, text, text, date) to authenticated;
