-- TronkStudios · docs/supabase/comunidad.sql
-- Estado de las ideas, respuestas y panel del equipo, encuestas,
-- notificaciones y entradas del diario guardadas en Supabase.
--
-- Hace falta haber ejecutado ANTES docs/supabase/plataforma.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.
--
-- Para entrar en el equipo, ejecuta después (con TU correo):
--   insert into public.team_members (user_id)
--   select id from auth.users where email = 'tu-correo@ejemplo.com'
--   on conflict do nothing;

/* =========================================================
   EQUIPO
   ========================================================= */

create table if not exists public.team_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

drop policy if exists "Cada uno ve si es del equipo" on public.team_members;
create policy "Cada uno ve si es del equipo"
  on public.team_members for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.team_members from anon, authenticated;

-- ¿La persona que hace la petición es del equipo?
create or replace function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members where user_id = auth.uid()
  );
$$;

grant execute on function public.is_team() to anon, authenticated;

/* =========================================================
   NOTIFICACIONES
   Las crea el servidor (nunca la web) cuando votan tu idea,
   el equipo cambia su estado o le responde, o te quitan un récord.
   ========================================================= */

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('votes', 'status', 'reply', 'record')),
  message text not null check (char_length(message) <= 200),
  link text not null default '' check (char_length(link) <= 100),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Cada uno ve sus notificaciones" on public.notifications;
create policy "Cada uno ve sus notificaciones"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Cada uno marca sus notificaciones" on public.notifications;
create policy "Cada uno marca sus notificaciones"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Cada uno borra sus notificaciones" on public.notifications;
create policy "Cada uno borra sus notificaciones"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- Uso interno: crea una notificación (sin repetir la misma)
create or replace function public.notify_user(
  p_user uuid,
  p_kind text,
  p_message text,
  p_link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null
    or not exists (select 1 from public.profiles where id = p_user) then
    return;
  end if;

  if exists (
    select 1 from public.notifications
    where user_id = p_user and kind = p_kind
      and message = left(p_message, 200) and link = p_link
  ) then
    return;
  end if;

  insert into public.notifications (user_id, kind, message, link)
  values (p_user, p_kind, left(p_message, 200), p_link);
end;
$$;

revoke all on function public.notify_user(uuid, text, text, text) from public, anon, authenticated;

/* =========================================================
   ESTADO DE LAS IDEAS Y RESPUESTA DEL EQUIPO
   ========================================================= */

alter table public.suggestions
  add column if not exists status text not null default 'pending';

alter table public.suggestions
  add column if not exists team_reply text not null default '';

alter table public.suggestions
  add column if not exists status_updated_at timestamptz;

alter table public.suggestions
  drop constraint if exists suggestions_status_check;

alter table public.suggestions
  add constraint suggestions_status_check
  check (status in ('pending', 'reviewing', 'planned', 'done', 'rejected'));

alter table public.suggestions
  drop constraint if exists suggestions_team_reply_check;

alter table public.suggestions
  add constraint suggestions_team_reply_check
  check (char_length(team_reply) <= 500);

-- Solo el equipo puede cambiar el estado o la respuesta
create or replace function public.protect_suggestion_team_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status
      or new.team_reply is distinct from old.team_reply)
    and auth.uid() is not null
    and not public.is_team() then
    raise exception 'Solo el equipo puede cambiar el estado de una idea';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_suggestion_team_fields on public.suggestions;
create trigger protect_suggestion_team_fields
  before update on public.suggestions
  for each row execute function public.protect_suggestion_team_fields();

-- Avisos al autor: votos, nuevo estado y respuesta del equipo
create or replace function public.notify_suggestion_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if coalesce(new.votes, 0) > coalesce(old.votes, 0)
    and new.votes in (1, 5, 10, 25, 50, 100) then
    perform public.notify_user(
      new.user_id,
      'votes',
      format('Tu idea ha llegado a %s %s', new.votes,
        case when new.votes = 1 then 'voto' else 'votos' end),
      '#sugerencias'
    );
  end if;

  if new.status is distinct from old.status then
    v_label := case new.status
      when 'pending' then 'Pendiente'
      when 'reviewing' then 'En estudio'
      when 'planned' then 'Planeada'
      when 'done' then 'Hecha'
      when 'rejected' then 'Descartada'
    end;

    perform public.notify_user(
      new.user_id, 'status', format('Tu idea ahora está: %s', v_label), '#sugerencias'
    );
  end if;

  if new.team_reply is distinct from old.team_reply and new.team_reply <> '' then
    perform public.notify_user(
      new.user_id, 'reply', 'El equipo ha respondido a tu idea', '#sugerencias'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_suggestion_changes on public.suggestions;
create trigger notify_suggestion_changes
  after update on public.suggestions
  for each row execute function public.notify_suggestion_changes();

-- El equipo cambia estado y respuesta
create or replace function public.set_suggestion_status(
  p_suggestion_id text,
  p_status text,
  p_reply text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_team() then
    raise exception 'Solo el equipo puede hacer esto';
  end if;

  update public.suggestions
  set status = p_status,
      team_reply = left(trim(coalesce(p_reply, '')), 500),
      status_updated_at = now()
  where id::text = p_suggestion_id;
end;
$$;

revoke all on function public.set_suggestion_status(text, text, text) from public, anon;
grant execute on function public.set_suggestion_status(text, text, text) to authenticated;

-- El equipo borra una idea (y sus votos)
create or replace function public.team_delete_suggestion(p_suggestion_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_team() then
    raise exception 'Solo el equipo puede hacer esto';
  end if;

  delete from public.suggestion_votes where suggestion_id::text = p_suggestion_id;
  delete from public.suggestions where id::text = p_suggestion_id;
end;
$$;

revoke all on function public.team_delete_suggestion(text) from public, anon;
grant execute on function public.team_delete_suggestion(text) to authenticated;

-- El equipo borra un récord falso
create or replace function public.team_delete_score(p_user uuid, p_game text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_team() then
    raise exception 'Solo el equipo puede hacer esto';
  end if;

  delete from public.game_scores where user_id = p_user and game = p_game;
end;
$$;

revoke all on function public.team_delete_score(uuid, text) from public, anon;
grant execute on function public.team_delete_score(uuid, text) to authenticated;

/* =========================================================
   RÉCORDS: igual que en plataforma.sql, pero avisa a quien
   pierde el primer puesto.
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
   ENCUESTAS
   ========================================================= */

create table if not exists public.polls (
  id bigint generated always as identity primary key,
  question text not null check (char_length(trim(question)) between 3 and 200),
  options jsonb not null check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 6
  ),
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.polls enable row level security;

drop policy if exists "Encuestas visibles para todos" on public.polls;
create policy "Encuestas visibles para todos"
  on public.polls for select
  using (true);

drop policy if exists "El equipo crea encuestas" on public.polls;
create policy "El equipo crea encuestas"
  on public.polls for insert
  to authenticated
  with check (public.is_team());

drop policy if exists "El equipo cambia encuestas" on public.polls;
create policy "El equipo cambia encuestas"
  on public.polls for update
  to authenticated
  using (public.is_team())
  with check (public.is_team());

drop policy if exists "El equipo borra encuestas" on public.polls;
create policy "El equipo borra encuestas"
  on public.polls for delete
  to authenticated
  using (public.is_team());

create table if not exists public.poll_votes (
  poll_id bigint not null references public.polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_index integer not null check (option_index between 0 and 5),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.poll_votes enable row level security;

-- Cada uno solo ve SU voto; los totales salen de poll_results()
drop policy if exists "Cada uno ve su voto" on public.poll_votes;
create policy "Cada uno ve su voto"
  on public.poll_votes for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.poll_votes from anon, authenticated;

-- Votar (o cambiar el voto) en una encuesta abierta
create or replace function public.vote_poll(p_poll bigint, p_option integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_poll public.polls;
begin
  if v_user is null then
    raise exception 'Necesitas iniciar sesión para votar';
  end if;

  select * into v_poll from public.polls where id = p_poll;

  if v_poll.id is null or v_poll.closed then
    raise exception 'Esta encuesta está cerrada';
  end if;

  if p_option is null or p_option < 0 or p_option >= jsonb_array_length(v_poll.options) then
    raise exception 'Opción no válida';
  end if;

  insert into public.poll_votes (poll_id, user_id, option_index)
  values (p_poll, v_user, p_option)
  on conflict (poll_id, user_id) do update
    set option_index = excluded.option_index, created_at = now();
end;
$$;

revoke all on function public.vote_poll(bigint, integer) from public, anon;
grant execute on function public.vote_poll(bigint, integer) to authenticated;

-- Totales de todas las encuestas (sin decir quién votó qué)
create or replace function public.poll_results()
returns table (poll_id bigint, option_index integer, votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select poll_id, option_index, count(*)
  from public.poll_votes
  group by poll_id, option_index;
$$;

grant execute on function public.poll_results() to anon, authenticated;

/* =========================================================
   DIARIO DE DESARROLLO (entradas escritas desde el panel)
   ========================================================= */

create table if not exists public.news (
  id bigint generated always as identity primary key,
  published_on date not null default current_date,
  tag text not null check (tag in ('development', 'update', 'announcement')),
  title text not null check (char_length(trim(title)) between 3 and 100),
  body text not null check (char_length(trim(body)) between 3 and 600),
  created_at timestamptz not null default now()
);

alter table public.news enable row level security;

drop policy if exists "Diario visible para todos" on public.news;
create policy "Diario visible para todos"
  on public.news for select
  using (true);

drop policy if exists "El equipo escribe el diario" on public.news;
create policy "El equipo escribe el diario"
  on public.news for insert
  to authenticated
  with check (public.is_team());

drop policy if exists "El equipo borra del diario" on public.news;
create policy "El equipo borra del diario"
  on public.news for delete
  to authenticated
  using (public.is_team());

/* =========================================================
   AVATARES DIBUJADOS
   Los perfiles que tenían un emoji pasan al avatar por defecto.
   ========================================================= */

alter table public.profiles alter column avatar set default 'tronk';

update public.profiles
set avatar = 'tronk'
where avatar !~ '^[a-z]{2,16}$';
