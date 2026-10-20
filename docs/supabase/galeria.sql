-- TronkStudios · docs/supabase/galeria.sql
-- Galería de fans: la comunidad sube dibujos y capturas de los juegos de
-- TronkStudios, los vota y el más votado de la semana sale destacado.
-- Nada se publica sin que el equipo lo apruebe (en su panel, pestaña
-- «Galería»), y al autor le llega un aviso.
--
-- Hace falta haber ejecutado ANTES plataforma.sql y comunidad.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.
-- Crea también el «bucket» de Storage «fan-art» (imágenes de hasta 3 MB).

/* =========================================================
   IMÁGENES (Storage)
   ========================================================= */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fan-art', 'fan-art', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada uno sube solo a su carpeta (fan-art/<su id>/...)
drop policy if exists "Fan art: subir a tu carpeta" on storage.objects;
create policy "Fan art: subir a tu carpeta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fan-art'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Borra sus imágenes cada uno; el equipo, cualquiera
drop policy if exists "Fan art: borrar lo tuyo o el equipo" on storage.objects;
create policy "Fan art: borrar lo tuyo o el equipo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fan-art'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_team())
  );

/* =========================================================
   DIBUJOS Y CAPTURAS
   ========================================================= */

create table if not exists public.fan_art (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 60),
  kind text not null default 'drawing' check (kind in ('drawing', 'screenshot')),
  image_path text not null check (char_length(image_path) between 5 and 200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  votes integer not null default 0,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists fan_art_status_idx
  on public.fan_art (status, approved_at desc);

alter table public.fan_art enable row level security;

-- Se ve lo aprobado; lo tuyo (aunque esté pendiente) y todo si eres del equipo
drop policy if exists "Fan art visible" on public.fan_art;
create policy "Fan art visible"
  on public.fan_art for select
  using (status = 'approved' or auth.uid() = user_id or public.is_team());

drop policy if exists "Cada uno sube su fan art" on public.fan_art;
create policy "Cada uno sube su fan art"
  on public.fan_art for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Borrar fan art propio o del equipo" on public.fan_art;
create policy "Borrar fan art propio o del equipo"
  on public.fan_art for delete
  to authenticated
  using (auth.uid() = user_id or public.is_team());

revoke insert, update, delete on public.fan_art from anon, authenticated;
grant insert (title, kind, image_path) on public.fan_art to authenticated;
grant delete on public.fan_art to authenticated;

/* Antes de guardar: siempre pendiente, en tu carpeta y sin abusar */
create or replace function public.check_fan_art()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.title := trim(new.title);
  new.status := 'pending';
  new.votes := 0;
  new.created_at := now();
  new.approved_at := null;

  if new.user_id is null
    or not exists (select 1 from public.profiles where id = new.user_id) then
    raise exception 'Necesitas una cuenta para subir dibujos';
  end if;

  if split_part(new.image_path, '/', 1) <> new.user_id::text then
    raise exception 'Imagen no válida';
  end if;

  if exists (
    select 1 from public.fan_art
    where user_id = new.user_id and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'Espera un minuto antes de subir otro';
  end if;

  if (
    select count(*) from public.fan_art
    where user_id = new.user_id and status = 'pending'
  ) >= 3 then
    raise exception 'Ya tienes 3 envíos esperando revisión';
  end if;

  return new;
end;
$$;

drop trigger if exists check_fan_art on public.fan_art;
create trigger check_fan_art
  before insert on public.fan_art
  for each row execute function public.check_fan_art();

/* =========================================================
   MODERACIÓN (solo el equipo)
   ========================================================= */

create or replace function public.set_fan_art_status(p_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_art record;
begin
  if not public.is_team() then
    raise exception 'Solo el equipo puede hacer esto';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Estado no válido';
  end if;

  update public.fan_art
  set status = p_status,
      approved_at = case when p_status = 'approved' then now() else null end
  where id = p_id
  returning * into v_art;

  if v_art.id is null then
    return;
  end if;

  perform public.notify_user(
    v_art.user_id,
    'fanart',
    left(case p_status
      when 'approved' then format('¡Tu dibujo «%s» ya está en la galería de fans!', v_art.title)
      else format('Tu dibujo «%s» no se ha publicado en la galería', v_art.title)
    end, 200),
    '#galeria'
  );
end;
$$;

revoke all on function public.set_fan_art_status(bigint, text) from public, anon;
grant execute on function public.set_fan_art_status(bigint, text) to authenticated;

/* =========================================================
   VOTOS
   ========================================================= */

create table if not exists public.fan_art_votes (
  art_id bigint not null references public.fan_art (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (art_id, user_id)
);

alter table public.fan_art_votes enable row level security;

-- Cada uno ve sus votos (para pintar el botón)
drop policy if exists "Cada uno ve sus votos de fan art" on public.fan_art_votes;
create policy "Cada uno ve sus votos de fan art"
  on public.fan_art_votes for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.fan_art_votes from anon, authenticated;

-- Votar o quitar el voto. Devuelve los votos y si ahora está votado.
create or replace function public.toggle_fan_art_vote(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_votes integer;
  v_voted boolean;
begin
  if v_user is null then
    raise exception 'Necesitas iniciar sesión para votar';
  end if;

  select user_id into v_owner
  from public.fan_art
  where id = p_id and status = 'approved';

  if v_owner is null then
    raise exception 'Ese dibujo no existe';
  end if;

  if v_owner = v_user then
    raise exception 'No puedes votar tu propio dibujo';
  end if;

  delete from public.fan_art_votes where art_id = p_id and user_id = v_user;

  if found then
    v_voted := false;
  else
    insert into public.fan_art_votes (art_id, user_id) values (p_id, v_user);
    v_voted := true;
  end if;

  update public.fan_art
  set votes = (select count(*) from public.fan_art_votes where art_id = p_id)
  where id = p_id
  returning votes into v_votes;

  return jsonb_build_object('votes', v_votes, 'voted', v_voted);
end;
$$;

revoke all on function public.toggle_fan_art_vote(bigint) from public, anon;
grant execute on function public.toggle_fan_art_vote(bigint) to authenticated;

/* Las notificaciones admiten el tipo «fanart» */
alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('votes', 'status', 'reply', 'record', 'release', 'team', 'challenge', 'comment', 'fanart'));
