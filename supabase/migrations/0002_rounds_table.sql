-- Task 1.2 (migrate-persistence-achievements-round-rules): rounds table,
-- mirroring domain Round/RoundRule/RulesLastChecked
-- (packages/domain/src/types.ts) as columns instead of nested objects so
-- each rule's "due" check can be expressed as a plain SQL predicate.

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  min_activities_days integer,
  min_activities_quantity integer,
  min_activities_penalty integer,
  min_challenges_days integer,
  min_challenges_quantity integer,
  min_challenges_penalty integer,
  activities_last_checked date,
  challenges_last_checked date,
  constraint rounds_end_after_start check (end_date >= start_date)
);

create index rounds_couple_id_idx on public.rounds (couple_id);
create index rounds_couple_active_idx on public.rounds (couple_id, start_date, end_date);

-- Per-partner score adjustments produced by evaluateCyclicalRules
-- (Round-rule score adjustments are applied exactly once per due period).
create table public.couple_member_scores (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  score integer not null default 0,
  primary key (couple_id, user_id)
);

create index couple_member_scores_user_id_idx on public.couple_member_scores (user_id);
