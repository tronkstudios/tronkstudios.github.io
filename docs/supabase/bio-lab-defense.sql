-- Apply in the TronkStudios Supabase SQL editor. Safe to rerun.
begin;

create table if not exists public.bio_lab_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.bio_lab_saves enable row level security;
revoke all on public.bio_lab_saves from public, anon, authenticated;
grant select on public.bio_lab_saves to authenticated;
drop policy if exists "Read own Bio-Lab save" on public.bio_lab_saves;
create policy "Read own Bio-Lab save" on public.bio_lab_saves
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.save_bio_lab(p_owner uuid, p_revision integer, p_data jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision integer;
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then
    raise exception 'Necesitas iniciar sesion con la cuenta del guardado' using errcode = '42501';
  end if;
  if p_revision is null or p_revision < 0 or p_data is null
     or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 4096 then
    raise exception 'Progreso no valido' using errcode = '22023';
  end if;

  if p_revision = 0 then
    insert into public.bio_lab_saves (user_id, data, revision)
      values (p_owner, p_data, 1) on conflict (user_id) do nothing
      returning revision into v_revision;
  else
    update public.bio_lab_saves
      set data = p_data, revision = revision + 1, updated_at = now()
      where user_id = p_owner and revision = p_revision
      returning revision into v_revision;
  end if;
  return v_revision;
end;
$$;

revoke all on function public.save_bio_lab(uuid, integer, jsonb) from public, anon;
grant execute on function public.save_bio_lab(uuid, integer, jsonb) to authenticated;
commit;
