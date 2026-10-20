-- TronkStudios · docs/supabase/push.sql
-- Notificaciones push en el móvil o el ordenador (también con la web
-- cerrada, sobre todo con la app instalada). Cada aviso de la campanita
-- (votos, respuestas del equipo, lanzamientos, retos, comentarios...)
-- se envía también como notificación push a los dispositivos que la
-- hayan activado. Las envía el Worker cada minuto (ver index.js).
--
-- Hace falta haber ejecutado ANTES plataforma.sql y comunidad.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO el
-- contenido de este archivo → Run. Se puede ejecutar más de una vez.

/* Dispositivos con las notificaciones activadas */
create table if not exists public.push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  p256dh text not null check (char_length(p256dh) between 40 and 200),
  auth text not null check (char_length(auth) between 10 and 60),
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Cada uno ve sus dispositivos" on public.push_subscriptions;
create policy "Cada uno ve sus dispositivos"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Cada uno activa sus dispositivos" on public.push_subscriptions;
create policy "Cada uno activa sus dispositivos"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Cada uno desactiva sus dispositivos" on public.push_subscriptions;
create policy "Cada uno desactiva sus dispositivos"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.push_subscriptions from anon, authenticated;
grant insert (endpoint, p256dh, auth) on public.push_subscriptions to authenticated;
grant delete on public.push_subscriptions to authenticated;

-- Como mucho 10 dispositivos por persona
create or replace function public.check_push_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();

  if new.user_id is null then
    raise exception 'Necesitas iniciar sesión';
  end if;

  -- Si ese dispositivo ya estaba (de otra cuenta), pasa a esta
  delete from public.push_subscriptions where endpoint = new.endpoint;

  if (select count(*) from public.push_subscriptions where user_id = new.user_id) >= 10 then
    raise exception 'Demasiados dispositivos';
  end if;

  return new;
end;
$$;

drop trigger if exists check_push_subscription on public.push_subscriptions;
create trigger check_push_subscription
  before insert on public.push_subscriptions
  for each row execute function public.check_push_subscription();

/* Qué avisos ya se han enviado por push */
alter table public.notifications
  add column if not exists pushed_at timestamptz;

create index if not exists notifications_push_idx
  on public.notifications (created_at)
  where pushed_at is null;

-- Los avisos que ya existían no se envían ahora de golpe
update public.notifications set pushed_at = now() where pushed_at is null and created_at < now() - interval '1 hour';
