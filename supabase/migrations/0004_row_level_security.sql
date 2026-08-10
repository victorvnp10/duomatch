-- Task 1.4 (migrate-persistence-achievements-round-rules): couple-scoped RLS
-- on every table added by 0001-0003, satisfying "Couple data isolation"
-- (specs/persistence-achievements-round-rules/spec.md). auth.uid() is
-- wrapped in `(select ...)` per Supabase's documented RLS optimization, so
-- it is evaluated once per query instead of once per row.

alter table public.couples enable row level security;
alter table public.activities enable row level security;
alter table public.activity_selections enable row level security;
alter table public.rewards enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.rounds enable row level security;
alter table public.couple_member_scores enable row level security;
alter table public.couple_achievements enable row level security;

create policy "couple members can access their couple" on public.couples
  for all
  using ((select auth.uid()) = member_a or (select auth.uid()) = member_b)
  with check ((select auth.uid()) = member_a or (select auth.uid()) = member_b);

create policy "couple members can access their activities" on public.activities
  for all
  using (exists (
    select 1 from public.couples c
    where c.id = activities.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ))
  with check (exists (
    select 1 from public.couples c
    where c.id = activities.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ));

create policy "couple members can access their activity selections" on public.activity_selections
  for all
  using (exists (
    select 1 from public.activities a
    join public.couples c on c.id = a.couple_id
    where a.id = activity_selections.activity_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ))
  with check (exists (
    select 1 from public.activities a
    join public.couples c on c.id = a.couple_id
    where a.id = activity_selections.activity_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ));

create policy "couple members can access their rewards" on public.rewards
  for all
  using (exists (
    select 1 from public.couples c
    where c.id = rewards.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ))
  with check (exists (
    select 1 from public.couples c
    where c.id = rewards.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ));

create policy "couple members can access their wishlist items" on public.wishlist_items
  for all
  using (exists (
    select 1 from public.couples c
    where c.id = wishlist_items.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ))
  with check (exists (
    select 1 from public.couples c
    where c.id = wishlist_items.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ));

create policy "couple members can access their rounds" on public.rounds
  for all
  using (exists (
    select 1 from public.couples c
    where c.id = rounds.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ))
  with check (exists (
    select 1 from public.couples c
    where c.id = rounds.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ));

-- Read-only for clients: couple_member_scores is written only through the
-- apply_round_rule_adjustment() SECURITY DEFINER RPC (0005), which bypasses
-- RLS internally after its own authorization check.
create policy "couple members can read their scores" on public.couple_member_scores
  for select
  using (exists (
    select 1 from public.couples c
    where c.id = couple_member_scores.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ));

create policy "couple members can access their achievements" on public.couple_achievements
  for all
  using (exists (
    select 1 from public.couples c
    where c.id = couple_achievements.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ))
  with check (exists (
    select 1 from public.couples c
    where c.id = couple_achievements.couple_id
      and ((select auth.uid()) = c.member_a or (select auth.uid()) = c.member_b)
  ));
