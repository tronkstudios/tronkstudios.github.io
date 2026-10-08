-- TronkStudios · docs/supabase/votos.sql
-- Función para QUITAR el voto de una sugerencia.
-- Complementa a vote_suggestion (ya creada en Supabase).
--
-- Cómo usarla: Supabase → SQL Editor → pegar este archivo → Run.
--
-- Borra el voto de la persona que ha iniciado sesión y resta 1 al
-- contador de la sugerencia, solo si de verdad había votado. Se
-- ejecuta en el servidor, así nadie puede restar votos de otros.

create or replace function public.unvote_suggestion(p_suggestion_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_deleted integer;
  v_votes integer;
begin
  if v_user is null then
    raise exception 'Necesitas iniciar sesión para quitar el voto';
  end if;

  delete from suggestion_votes
  where suggestion_id::text = p_suggestion_id
    and user_id = v_user;

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    update suggestions
    set votes = greatest(coalesce(votes, 0) - 1, 0)
    where id::text = p_suggestion_id
    returning votes into v_votes;
  else
    select votes into v_votes
    from suggestions
    where id::text = p_suggestion_id;
  end if;

  return jsonb_build_object(
    'removed', v_deleted > 0,
    'votes', coalesce(v_votes, 0)
  );
end;
$$;

revoke all on function public.unvote_suggestion(text) from public, anon;
grant execute on function public.unvote_suggestion(text) to authenticated;
