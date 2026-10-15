-- TronkStudios · docs/supabase/avisos.sql
-- El equipo envía avisos (notificaciones) a los usuarios desde su panel,
-- por ejemplo «¡Z Tronks ya ha salido!» o «Era una prueba, no hagáis caso».
--
-- Hace falta haber ejecutado ANTES plataforma.sql y comunidad.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.

/* Las notificaciones admiten el tipo «team» (aviso del equipo) */
alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('votes', 'status', 'reply', 'record', 'release', 'team'));

/*
 * Envía un aviso. p_project = null → a todos los usuarios;
 * p_project = 'z-tronks' → solo a quien lo tiene en su lista de deseados.
 * Devuelve a cuántas personas ha llegado.
 */
create or replace function public.team_broadcast(
  p_message text,
  p_link text,
  p_project text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text := trim(coalesce(p_message, ''));
  v_link text := coalesce(p_link, '');
  v_count integer;
begin
  if not public.is_team() then
    raise exception 'Solo el equipo puede hacer esto';
  end if;

  if char_length(v_message) < 3 or char_length(v_message) > 200 then
    raise exception 'El aviso debe tener entre 3 y 200 caracteres';
  end if;

  if v_link !~ '^(#[a-z-]{1,40})?$' then
    raise exception 'Enlace no válido';
  end if;

  if p_project is null then
    insert into public.notifications (user_id, kind, message, link)
    select id, 'team', v_message, v_link
    from public.profiles;
  else
    insert into public.notifications (user_id, kind, message, link)
    select user_id, 'team', v_message, v_link
    from public.wishlist
    where project_id = p_project;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.team_broadcast(text, text, text) from public, anon;
grant execute on function public.team_broadcast(text, text, text) to authenticated;
