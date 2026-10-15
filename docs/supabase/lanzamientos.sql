-- TronkStudios · docs/supabase/lanzamientos.sql
-- Cambiar la fecha de lanzamiento de un juego desde el panel del equipo
-- y avisar a quien lo tiene en su lista de deseados.
--
-- Hace falta haber ejecutado ANTES plataforma.sql y comunidad.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.
--
-- La tabla game_releases pasa a ser la fecha oficial: la web la lee
-- al cargar y, si existe, manda sobre la de js/projects.js.

/* Las notificaciones admiten un tipo nuevo: «release» */
alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('votes', 'status', 'reply', 'record', 'release'));

/* El equipo cambia la fecha (o la quita con p_date = null) */
create or replace function public.set_release_date(
  p_project text,
  p_title text,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old date;
  v_exists boolean;
  v_title text := left(trim(coalesce(p_title, '')), 80);
  v_message text;
  v_user uuid;
begin
  if not public.is_team() then
    raise exception 'Solo el equipo puede hacer esto';
  end if;

  if p_project !~ '^[a-z0-9-]{1,60}$' or v_title = '' then
    raise exception 'Juego no válido';
  end if;

  select release_date, true into v_old, v_exists
  from public.game_releases
  where project_id = p_project;

  insert into public.game_releases (project_id, title, release_date)
  values (p_project, v_title, p_date)
  on conflict (project_id) do update
    set title = excluded.title,
        release_date = excluded.release_date;

  -- Si la fecha no cambia, no se avisa a nadie
  if coalesce(v_exists, false) and v_old is not distinct from p_date then
    return;
  end if;

  v_message := case
    when p_date is null then
      format('%s ya no tiene fecha de lanzamiento por ahora', v_title)
    else
      format('%s sale el %s', v_title, to_char(p_date, 'DD/MM/YYYY'))
  end;

  -- Aviso a todos los que lo tienen en su lista de deseados
  for v_user in
    select user_id from public.wishlist where project_id = p_project
  loop
    perform public.notify_user(v_user, 'release', v_message, '#desarrollo');
  end loop;
end;
$$;

revoke all on function public.set_release_date(text, text, date) from public, anon;
grant execute on function public.set_release_date(text, text, date) to authenticated;
