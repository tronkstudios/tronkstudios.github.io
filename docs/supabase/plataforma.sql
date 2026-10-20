-- TronkStudios · docs/supabase/plataforma.sql
-- Perfiles, lista de deseados, avisos de lanzamiento y récords.
--
-- Cómo usarlo: Supabase → SQL Editor → pegar este archivo → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
-- Seguridad (Row Level Security):
-- - Todo el mundo puede VER perfiles, listas de deseados y récords.
-- - Cada persona solo puede CAMBIAR su propio perfil y su lista.
-- - Los récords solo se guardan con las funciones de abajo, que
--   comprueban los valores en el servidor.
-- - Los correos de los usuarios NUNCA se pueden leer desde la web:
--   solo el Worker, con la clave service_role, para los avisos.

/* =========================================================
   PERFILES
   ========================================================= */

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(trim(display_name)) between 2 and 30),
  bio text not null default ''
    check (char_length(bio) <= 160),
  avatar text not null default 'tronk'
    check (char_length(avatar) <= 16),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Perfiles visibles para todos" on public.profiles;
create policy "Perfiles visibles para todos"
  on public.profiles for select
  using (true);

drop policy if exists "Cada uno edita su perfil" on public.profiles;
create policy "Cada uno edita su perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Solo se pueden cambiar estas columnas (no el id ni la fecha)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, bio, avatar) on public.profiles to authenticated;

-- Al registrarse, se crea su perfil con el nombre del formulario
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), 30);
begin
  if char_length(v_name) < 2 then
    v_name := 'Tronker';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Perfiles para las cuentas que ya existían
insert into public.profiles (id, display_name, created_at)
select
  u.id,
  case
    when char_length(trim(coalesce(u.raw_user_meta_data ->> 'name', ''))) >= 2
      then left(trim(u.raw_user_meta_data ->> 'name'), 30)
    else 'Tronker'
  end,
  u.created_at
from auth.users u
on conflict (id) do nothing;

/* =========================================================
   LISTA DE DESEADOS (+ «Avísame cuando salga»)
   project_id es el id de PROJECTS en js/projects.js.
   ========================================================= */

create table if not exists public.wishlist (
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  project_id text not null
    check (project_id ~ '^[a-z0-9-]{1,60}$'),
  notify boolean not null default false,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.wishlist enable row level security;

drop policy if exists "Listas visibles para todos" on public.wishlist;
create policy "Listas visibles para todos"
  on public.wishlist for select
  using (true);

drop policy if exists "Cada uno añade a su lista" on public.wishlist;
create policy "Cada uno añade a su lista"
  on public.wishlist for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Cada uno cambia su lista" on public.wishlist;
create policy "Cada uno cambia su lista"
  on public.wishlist for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Cada uno quita de su lista" on public.wishlist;
create policy "Cada uno quita de su lista"
  on public.wishlist for delete
  to authenticated
  using (auth.uid() = user_id);

-- notified_at solo lo toca el Worker (service_role)
revoke insert, update, delete on public.wishlist from anon, authenticated;
grant insert (project_id, notify) on public.wishlist to authenticated;
grant update (notify) on public.wishlist to authenticated;
grant delete on public.wishlist to authenticated;

/* =========================================================
   FECHAS DE LANZAMIENTO (para los avisos por correo)
   Cuando un juego tenga fecha, añádela o cámbiala aquí:
     insert into public.game_releases values ('id', 'Título', 'AAAA-MM-DD')
     on conflict (project_id) do update
       set title = excluded.title, release_date = excluded.release_date;
   ========================================================= */

create table if not exists public.game_releases (
  project_id text primary key,
  title text not null,
  release_date date
);

alter table public.game_releases enable row level security;

drop policy if exists "Lanzamientos visibles para todos" on public.game_releases;
create policy "Lanzamientos visibles para todos"
  on public.game_releases for select
  using (true);

insert into public.game_releases (project_id, title, release_date) values
  ('z-tronks', 'Z Tronks', '2027-01-04'),
  ('the-sundered-sky', 'The Sundered Sky', null)
on conflict (project_id) do nothing;

-- Avisos pendientes: juegos que ya han salido y personas que
-- pidieron aviso y aún no lo han recibido. SOLO para el Worker.
create or replace function public.due_launch_notifications()
returns table (
  user_id uuid,
  email text,
  display_name text,
  project_id text,
  title text
)
language sql
security definer
set search_path = public
as $$
  select w.user_id, u.email::text, p.display_name, w.project_id, r.title
  from public.wishlist w
  join public.game_releases r on r.project_id = w.project_id
  join public.profiles p on p.id = w.user_id
  join auth.users u on u.id = w.user_id
  where w.notify
    and w.notified_at is null
    and r.release_date is not null
    and r.release_date <= current_date
    and u.email is not null
  limit 200;
$$;

revoke all on function public.due_launch_notifications() from public, anon, authenticated;
grant execute on function public.due_launch_notifications() to service_role;

/* =========================================================
   RÉCORDS DE LOS MINIJUEGOS
   - antitronks, protect-mogos: puntos (se guarda el mejor)
   - stick-drill: segundos aguantados (se guarda el mejor)
   - tronk-fight: victorias contra el bot (se van sumando)
   - miente: aciertos en una partida (se guarda el mejor)
   ========================================================= */

create table if not exists public.game_scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null
    check (game in ('antitronks', 'protect-mogos', 'stick-drill', 'tronk-fight', 'miente')),
  score numeric not null default 0 check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);

alter table public.game_scores enable row level security;

drop policy if exists "Récords visibles para todos" on public.game_scores;
create policy "Récords visibles para todos"
  on public.game_scores for select
  using (true);

revoke insert, update, delete on public.game_scores from anon, authenticated;

-- Guarda un récord si es mejor que el que había.
-- OJO: comunidad.sql la sustituye por una versión que además avisa a
-- quien pierde el primer puesto. Si vuelves a ejecutar este archivo,
-- ejecuta después también comunidad.sql.
create or replace function public.submit_score(p_game text, p_score numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_max numeric;
  v_best numeric;
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

  insert into public.game_scores (user_id, game, score)
  values (v_user, p_game, round(p_score, 1))
  on conflict (user_id, game) do update
    set score = greatest(game_scores.score, excluded.score),
        updated_at = case
          when excluded.score > game_scores.score then now()
          else game_scores.updated_at
        end
  returning score into v_best;

  return v_best;
end;
$$;

revoke all on function public.submit_score(text, numeric) from public, anon;
grant execute on function public.submit_score(text, numeric) to authenticated;

-- Suma una victoria de Tronk Fight contra el bot.
-- Como mucho una cada 20 segundos (un combate dura más).
create or replace function public.add_tronk_fight_win()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total numeric;
begin
  if v_user is null then
    raise exception 'Necesitas iniciar sesión para guardar victorias';
  end if;

  insert into public.game_scores (user_id, game, score)
  values (v_user, 'tronk-fight', 1)
  on conflict (user_id, game) do update
    set score = game_scores.score + 1,
        updated_at = now()
    where game_scores.updated_at < now() - interval '20 seconds'
  returning score into v_total;

  if v_total is null then
    select score into v_total
    from public.game_scores
    where user_id = v_user and game = 'tronk-fight';
  end if;

  return v_total;
end;
$$;

revoke all on function public.add_tronk_fight_win() from public, anon;
grant execute on function public.add_tronk_fight_win() to authenticated;
