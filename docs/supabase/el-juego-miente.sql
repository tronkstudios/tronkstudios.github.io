-- TronkStudios · docs/supabase/el-juego-miente.sql
-- Quinto minijuego, «El Juego Miente»: sus récords (aciertos) se guardan
-- en la cuenta, salen en la clasificación y cuentan para los retos.
--
-- Hace falta haber ejecutado ANTES plataforma.sql, comunidad.sql y retos.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.
-- (plataforma.sql, comunidad.sql y retos.sql ya incluyen estos cambios por
-- si algún día se vuelven a ejecutar desde cero.)

/* Los récords y los retos admiten el juego «miente» */
alter table public.game_scores
  drop constraint if exists game_scores_game_check;

alter table public.game_scores
  add constraint game_scores_game_check
  check (game in ('antitronks', 'protect-mogos', 'stick-drill', 'tronk-fight', 'miente'));

alter table public.challenges
  drop constraint if exists challenges_game_check;

alter table public.challenges
  add constraint challenges_game_check
  check (game in ('antitronks', 'protect-mogos', 'stick-drill', 'tronk-fight', 'miente'));

/* =========================================================
   RÉCORDS (la misma función que comunidad.sql, con «miente»)
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
    else null
  end;

  if v_max is null then
    raise exception 'Juego no válido';
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
   RETOS (la misma función que retos.sql, con «miente»)
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
