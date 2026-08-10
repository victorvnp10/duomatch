-- Task 1.5 (migrate-persistence-achievements-round-rules): single
-- transactional RPC applying a round's score deltas and last-checked dates
-- together, so "Partial failure does not apply a partial adjustment"
-- (specs/persistence-achievements-round-rules/spec.md) holds even though
-- supabase-js cannot span a client-side multi-statement transaction.
--
-- SECURITY DEFINER is required to let a couple member update
-- couple_member_scores (writable only through this function per 0004's
-- read-only policy); the function re-checks couple membership itself so it
-- does not widen access beyond what RLS already allows a caller.
create or replace function public.apply_round_rule_adjustment(
  p_round_id uuid,
  p_score_deltas jsonb,
  p_activities_checked_date date default null,
  p_challenges_checked_date date default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_member_a uuid;
  v_member_b uuid;
  v_user_id uuid;
  v_delta integer;
begin
  select r.couple_id, c.member_a, c.member_b
    into v_couple_id, v_member_a, v_member_b
  from public.rounds r
  join public.couples c on c.id = r.couple_id
  where r.id = p_round_id
  for update of r;

  if v_couple_id is null then
    raise exception 'round % not found', p_round_id;
  end if;

  if auth.uid() is distinct from v_member_a and auth.uid() is distinct from v_member_b then
    raise exception 'not authorized for round %', p_round_id;
  end if;

  for v_user_id, v_delta in
    select key::uuid, value::integer from jsonb_each_text(coalesce(p_score_deltas, '{}'::jsonb))
  loop
    insert into public.couple_member_scores (couple_id, user_id, score)
    values (v_couple_id, v_user_id, v_delta)
    on conflict (couple_id, user_id)
    do update set score = public.couple_member_scores.score + excluded.score;
  end loop;

  update public.rounds
  set
    activities_last_checked = coalesce(p_activities_checked_date, activities_last_checked),
    challenges_last_checked = coalesce(p_challenges_checked_date, challenges_last_checked)
  where id = p_round_id;
end;
$$;

revoke all on function public.apply_round_rule_adjustment(uuid, jsonb, date, date) from public;
grant execute on function public.apply_round_rule_adjustment(uuid, jsonb, date, date) to authenticated;

-- Supabase grants EXECUTE to anon/authenticated by default on function
-- creation, independent of "revoke ... from public" above — must be
-- revoked explicitly or anon can call this SECURITY DEFINER function.
revoke execute on function public.apply_round_rule_adjustment(uuid, jsonb, date, date) from anon;
