-- TronkStudios · docs/supabase/proyectos.sql
-- Juegos editables desde el panel del equipo (pestaña «Juegos»):
-- los de «En desarrollo» y los de «Nuestros juegos», con su ficha
-- (descripción, imágenes, tráiler, plataformas, tiendas, Roblox...).
-- Si esta tabla no existe o está vacía, la web enseña los juegos que
-- vienen escritos en js/projects.js.
--
-- Hace falta haber ejecutado ANTES plataforma.sql y comunidad.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.
-- La FECHA de lanzamiento se sigue cambiando en la pestaña «Lanzamientos»
-- (así avisa a quien tiene el juego en su lista de deseados).

/* =========================================================
   JUEGOS
   ========================================================= */

create table if not exists public.projects (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (char_length(trim(title)) between 1 and 80),
  section text not null default 'desarrollo' check (section in ('desarrollo', 'juegos')),
  category text not null default 'Juego' check (char_length(category) <= 40),
  genre text not null default '' check (char_length(genre) <= 120),
  platforms text[] not null default '{}',
  status text not null default 'development'
    check (status in ('concept', 'development', 'alpha', 'beta', 'released')),
  people integer not null default 1 check (people between 1 and 500),
  trailer text not null default '' check (trailer ~ '^[A-Za-z0-9_-]{0,20}$'),
  description text not null default '' check (char_length(description) <= 6000),
  image text not null default '' check (char_length(image) <= 400),
  image_alt text not null default '' check (char_length(image_alt) <= 160),
  gallery jsonb not null default '[]'::jsonb,
  stores jsonb not null default '[]'::jsonb,
  roblox_place_id text not null default '' check (roblox_place_id ~ '^[0-9]{0,20}$'),
  sort_order integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "Juegos visibles" on public.projects;
create policy "Juegos visibles"
  on public.projects for select
  using (visible or public.is_team());

drop policy if exists "El equipo crea juegos" on public.projects;
create policy "El equipo crea juegos"
  on public.projects for insert
  to authenticated
  with check (public.is_team());

drop policy if exists "El equipo edita juegos" on public.projects;
create policy "El equipo edita juegos"
  on public.projects for update
  to authenticated
  using (public.is_team())
  with check (public.is_team());

drop policy if exists "El equipo borra juegos" on public.projects;
create policy "El equipo borra juegos"
  on public.projects for delete
  to authenticated
  using (public.is_team());

grant select on public.projects to anon;
grant select, insert, update, delete on public.projects to authenticated;

-- Fecha de la última edición
create or replace function public.touch_project()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_project on public.projects;
create trigger touch_project
  before insert or update on public.projects
  for each row execute function public.touch_project();

-- Cada juego tiene su fila de lanzamiento (para la pestaña «Lanzamientos»)
create or replace function public.project_release_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.game_releases (project_id, title)
  values (new.id, new.title)
  on conflict (project_id) do update set title = excluded.title;
  return new;
end;
$$;

drop trigger if exists project_release_row on public.projects;
create trigger project_release_row
  after insert or update of title on public.projects
  for each row execute function public.project_release_row();

/* Los dos juegos que ya había en la web (no se pisan si ya existen) */
insert into public.projects
  (id, title, section, category, genre, platforms, status, people, trailer, description, image, image_alt, roblox_place_id, sort_order)
values
  ('z-tronks', 'Z Tronks', 'desarrollo', 'Roblox', 'Acción · Supervivencia · Cooperativo', array['Roblox'], 'development', 5, 'VrHyQbwUtrY',
   'Z Tronks es un juego de acción y supervivencia ambientado en un mundo devastado por un apocalipsis zombi. Los jugadores deberán explorar una ciudad abandonada, enfrentarse a diferentes tipos de zombis, completar misiones y conseguir experiencia y recursos para mejorar a su personaje.

Cada jugador podrá elegir entre distintas clases, como Gunner, Warrior, Rogue y Medic, cada una con sus propias armas, habilidades y estilos de combate. A medida que avances, podrás desbloquear nuevas habilidades, conseguir mejor equipamiento y enfrentarte a enemigos cada vez más peligrosos.

Forma un equipo con tus amigos, sobrevive al apocalipsis y conviértete en uno de los supervivientes más poderosos de Z Tronks.',
   'img/juegos/z-tronks.png', 'Z Tronks - juego de zombis para Roblox', '', 1),
  ('the-sundered-sky', 'The Sundered Sky', 'desarrollo', 'Juego', 'RPG · Aventura · Fantasía', array['PC'], 'development', 1, '',
   'The Sundered Sky es un RPG de fantasía y aventuras en un mundo hecho de cubos. Hace siglos, un gran cataclismo conocido como la Ruptura partió el antiguo continente en pedazos, y hoy sus restos flotan como islas sobre un inmenso mar de nubes.

Junto a tus amigos viajarás en un barco volador por un archipiélago que se genera al azar en cada partida. Explora biomas muy distintos, descubre criaturas nunca vistas, visita ciudades de razas y facciones con sus propias ideas, y adéntrate en mazmorras llenas de tesoros. Elige tu clase, consigue armas y armaduras, fabrica equipo, doma mascotas y mejora tu barco para llegar cada vez más lejos.

Cada pueblo habla su propia lengua. Aprende sus palabras poco a poco para leer libros antiguos, desvelar los secretos de la Ruptura y enfrentarte a jefes legendarios. Un mundo de aventuras para todas las edades, pensado para disfrutarlo en compañía.',
   'img/juegos/the-sundered-sky.png', 'The Sundered Sky - RPG de aventuras en islas flotantes hechas de cubos', '', 2)
on conflict (id) do nothing;

/* =========================================================
   IMÁGENES DE LOS JUEGOS (Storage, solo el equipo sube)
   ========================================================= */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-media', 'project-media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Imágenes de juegos: sube el equipo" on storage.objects;
create policy "Imágenes de juegos: sube el equipo"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-media' and public.is_team());

drop policy if exists "Imágenes de juegos: borra el equipo" on storage.objects;
create policy "Imágenes de juegos: borra el equipo"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-media' and public.is_team());
