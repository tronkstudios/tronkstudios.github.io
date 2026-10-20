-- TronkStudios · docs/supabase/calendario.sql
-- Calendario de TronkStudios: lanzamientos, torneos, concursos, directos
-- y otros eventos. El equipo los crea en su panel (pestaña «Calendario»)
-- y la gente los añade a su calendario o se suscribe a todos.
-- Las fechas de lanzamiento de «Lanzamientos» salen solas en el calendario.
--
-- Hace falta haber ejecutado ANTES comunidad.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.

create table if not exists public.calendar_events (
  id bigint generated always as identity primary key,
  title text not null check (char_length(trim(title)) between 2 and 100),
  kind text not null default 'evento'
    check (kind in ('lanzamiento', 'torneo', 'concurso', 'directo', 'evento')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  description text not null default '' check (char_length(description) <= 1000),
  link text not null default '' check (link = '' or link ~ '^https://'),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index if not exists calendar_events_starts_idx
  on public.calendar_events (starts_at);

alter table public.calendar_events enable row level security;

drop policy if exists "Calendario visible para todos" on public.calendar_events;
create policy "Calendario visible para todos"
  on public.calendar_events for select
  using (true);

drop policy if exists "El equipo crea eventos" on public.calendar_events;
create policy "El equipo crea eventos"
  on public.calendar_events for insert
  to authenticated
  with check (public.is_team());

drop policy if exists "El equipo edita eventos" on public.calendar_events;
create policy "El equipo edita eventos"
  on public.calendar_events for update
  to authenticated
  using (public.is_team())
  with check (public.is_team());

drop policy if exists "El equipo borra eventos" on public.calendar_events;
create policy "El equipo borra eventos"
  on public.calendar_events for delete
  to authenticated
  using (public.is_team());

grant select on public.calendar_events to anon, authenticated;
grant insert, update, delete on public.calendar_events to authenticated;
