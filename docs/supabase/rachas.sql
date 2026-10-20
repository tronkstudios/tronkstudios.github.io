-- TronkStudios · docs/supabase/rachas.sql
-- Racha de días entrando a la web: cuántos días seguidos has visitado
-- TronkStudios con tu cuenta. Sale con una llama en tu perfil.
-- Los días se cuentan con la hora de España (Europe/Madrid).
--
-- Hace falta haber ejecutado ANTES plataforma.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.

alter table public.profiles
  add column if not exists visit_streak integer not null default 0,
  add column if not exists best_visit_streak integer not null default 0,
  add column if not exists last_visit_on date;

-- La web NO puede cambiar estas columnas: solo touch_visit_streak
-- (plataforma.sql solo deja cambiar display_name, bio y avatar).

/* La llama la web una vez al entrar con tu cuenta.
   Devuelve la racha y si ha subido hoy. */
create or replace function public.touch_visit_streak()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Europe/Madrid')::date;
  v_last date;
  v_streak integer;
  v_best integer;
  v_increased boolean := false;
begin
  if v_user is null then
    return null;
  end if;

  select last_visit_on, visit_streak, best_visit_streak
  into v_last, v_streak, v_best
  from public.profiles
  where id = v_user
  for update;

  if not found then
    return null;
  end if;

  if v_last is distinct from v_today then
    v_streak := case when v_last = v_today - 1 then v_streak + 1 else 1 end;
    v_best := greatest(v_best, v_streak);
    v_increased := true;

    update public.profiles
    set visit_streak = v_streak,
        best_visit_streak = v_best,
        last_visit_on = v_today
    where id = v_user;
  end if;

  return jsonb_build_object(
    'streak', v_streak,
    'best', v_best,
    'increased', v_increased
  );
end;
$$;

revoke all on function public.touch_visit_streak() from public, anon;
grant execute on function public.touch_visit_streak() to authenticated;
