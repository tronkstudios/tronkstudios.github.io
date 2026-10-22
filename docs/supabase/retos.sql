-- TronkStudios · docs/supabase/retos.sql
-- Retos de la comunidad: «entre todos, derrotad 10.000 ninjas esta semana».
-- Cada partida de un minijuego suma a la barra del reto activo de ese juego.
-- El equipo crea y borra los retos desde su panel.
--
-- Hace falta haber ejecutado ANTES plataforma.sql, comunidad.sql y avisos.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.

/* =========================================================
   RETOS
   ========================================================= */

create table if not exists public.challenges (
  id bigint generated always as identity primary key,
  title text not null check (char_length(trim(title)) between 3 and 80),
  game text not null
    check (game in ('antitronks', 'protect-mogos', 'stick-drill', 'tronk-fight', 'miente', 'survivors')),
  goal integer not null check (goal between 1 and 10000000),
  progress bigint not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Descripción del reto (se ve en su ficha). Si ya tenías la tabla, se añade aquí.
alter table public.challenges
  add column if not exists description text not null default ''
    check (char_length(description) <= 500);

alter table public.challenges enable row level security;

drop policy if exists "Retos visibles para todos" on public.challenges;
create policy "Retos visibles para todos"
  on public.challenges for select
  using (true);

drop policy if exists "El equipo crea retos" on public.challenges;
create policy "El equipo crea retos"
  on public.challenges for insert
  to authenticated
  with check (public.is_team());

drop policy if exists "El equipo borra retos" on public.challenges;
create policy "El equipo borra retos"
  on public.challenges for delete
  to authenticated
  using (public.is_team());

-- El progreso solo lo cambia add_challenge_progress (nunca la web)
revoke insert, update, delete on public.challenges from anon, authenticated;
grant insert (title, description, game, goal, starts_at, ends_at) on public.challenges to authenticated;
grant delete on public.challenges to authenticated;

/* Lo que ha aportado cada jugador a cada reto */
create table if not exists public.challenge_contributions (
  challenge_id bigint not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenge_contributions enable row level security;

drop policy if exists "Aportes visibles para todos" on public.challenge_contributions;
create policy "Aportes visibles para todos"
  on public.challenge_contributions for select
  using (true);

revoke insert, update, delete on public.challenge_contributions from anon, authenticated;

/* Las notificaciones admiten el tipo «challenge» (reto superado) */
alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('votes', 'status', 'reply', 'record', 'release', 'team', 'challenge', 'comment', 'fanart'));

/* =========================================================
   SUMAR UNA PARTIDA
   La llaman los minijuegos al acabar (js/challenges.js).
   Contra trampas: hay un máximo por partida y una pausa mínima
   entre partidas del mismo jugador.
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
