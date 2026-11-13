-- Migración para instalaciones existentes. Conserva firmas, permisos y validaciones.
-- Aplicar antes de publicar el recorrido de 25 minutos para admitir derrotas largas.
begin;

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

  -- El final llega al minuto 25: una derrota sin vaciar su barra puede superar los 30 minutos.
  if p_seconds > 14400 then
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

commit;
