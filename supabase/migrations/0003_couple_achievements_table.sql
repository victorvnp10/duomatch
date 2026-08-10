-- Task 1.3 (migrate-persistence-achievements-round-rules): append-only
-- unlocked-achievements table. The unique constraint on (couple_id,
-- achievement_id) is what makes "Newly unlocked achievements are persisted
-- exactly once" (specs/persistence-achievements-round-rules/spec.md)
-- enforceable via ON CONFLICT DO NOTHING instead of a client-side re-check.

create table public.couple_achievements (
  couple_id uuid not null references public.couples (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (couple_id, achievement_id)
);
