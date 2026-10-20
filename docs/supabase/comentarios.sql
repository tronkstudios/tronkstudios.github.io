-- TronkStudios · docs/supabase/comentarios.sql
-- Comentarios en las sugerencias: la gente puede opinar, no solo votar.
-- Al autor de la idea le llega un aviso cuando alguien la comenta.
--
-- Hace falta haber ejecutado ANTES plataforma.sql, comunidad.sql y retos.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.

/* =========================================================
   COMENTARIOS
   suggestion_id se guarda como texto (igual que en votos.sql) para
   funcionar sea cual sea el tipo del id de la tabla suggestions.
   ========================================================= */

create table if not exists public.suggestion_comments (
  id bigint generated always as identity primary key,
  suggestion_id text not null,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists suggestion_comments_suggestion_idx
  on public.suggestion_comments (suggestion_id, created_at);

alter table public.suggestion_comments enable row level security;

drop policy if exists "Comentarios visibles para todos" on public.suggestion_comments;
create policy "Comentarios visibles para todos"
  on public.suggestion_comments for select
  using (true);

drop policy if exists "Cada uno escribe sus comentarios" on public.suggestion_comments;
create policy "Cada uno escribe sus comentarios"
  on public.suggestion_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Cada uno borra los suyos; el equipo puede borrar cualquiera
drop policy if exists "Borrar comentarios propios o del equipo" on public.suggestion_comments;
create policy "Borrar comentarios propios o del equipo"
  on public.suggestion_comments for delete
  to authenticated
  using (auth.uid() = user_id or public.is_team());

revoke insert, update, delete on public.suggestion_comments from anon, authenticated;
grant insert (suggestion_id, body) on public.suggestion_comments to authenticated;
grant delete on public.suggestion_comments to authenticated;

/* Antes de guardar: la idea tiene que existir y hay una pausa
   mínima entre comentarios de la misma persona (contra el spam) */
create or replace function public.check_suggestion_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.body := trim(new.body);
  new.created_at := now();

  if new.user_id is null
    or not exists (select 1 from public.profiles where id = new.user_id) then
    raise exception 'Necesitas una cuenta para comentar';
  end if;

  if not exists (select 1 from public.suggestions where id::text = new.suggestion_id) then
    raise exception 'Esa sugerencia ya no existe';
  end if;

  if exists (
    select 1 from public.suggestion_comments
    where user_id = new.user_id
      and created_at > now() - interval '15 seconds'
  ) then
    raise exception 'Espera unos segundos antes de volver a comentar';
  end if;

  return new;
end;
$$;

drop trigger if exists check_suggestion_comment on public.suggestion_comments;
create trigger check_suggestion_comment
  before insert on public.suggestion_comments
  for each row execute function public.check_suggestion_comment();

/* Aviso al autor de la idea (si no es él quien comenta) */
create or replace function public.notify_suggestion_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
begin
  select user_id into v_owner
  from public.suggestions
  where id::text = new.suggestion_id;

  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;

  select display_name into v_name from public.profiles where id = new.user_id;

  perform public.notify_user(
    v_owner,
    'comment',
    left(format('%s ha comentado tu idea: «%s»',
      coalesce(v_name, 'Alguien'), left(new.body, 60)), 200),
    '#sugerencias'
  );

  return new;
end;
$$;

drop trigger if exists notify_suggestion_comment on public.suggestion_comments;
create trigger notify_suggestion_comment
  after insert on public.suggestion_comments
  for each row execute function public.notify_suggestion_comment();

/* Si se borra una idea, se borran sus comentarios */
create or replace function public.delete_suggestion_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.suggestion_comments where suggestion_id = old.id::text;
  return old;
end;
$$;

drop trigger if exists delete_suggestion_comments on public.suggestions;
create trigger delete_suggestion_comments
  after delete on public.suggestions
  for each row execute function public.delete_suggestion_comments();

/* Las notificaciones admiten el tipo «comment» */
alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('votes', 'status', 'reply', 'record', 'release', 'team', 'challenge', 'comment', 'fanart'));
