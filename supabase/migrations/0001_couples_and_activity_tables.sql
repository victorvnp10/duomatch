-- Task 1.1 (migrate-persistence-achievements-round-rules): couples and the
-- activity/reward/wishlist tables that feed buildAchievementStats
-- (packages/domain/src/services/achievement-stats-builder.ts).

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references auth.users (id) on delete cascade,
  member_b uuid not null references auth.users (id) on delete cascade,
  daily_challenge_completions integer not null default 0,
  streak integer not null default 0,
  message_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint couples_distinct_members check (member_a <> member_b)
);

create index couples_member_a_idx on public.couples (member_a);
create index couples_member_b_idx on public.couples (member_b);

-- Mirrors domain Activity: { type, category, createdBy, createdAt }.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  type text,
  category text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index activities_couple_id_idx on public.activities (couple_id);
create index activities_created_by_idx on public.activities (created_by);

-- Mirrors domain Activity.selections: Record<userId, { status, date }>.
create table public.activity_selections (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  status text not null,
  selection_date date,
  primary key (activity_id, user_id)
);

create index activity_selections_user_id_idx on public.activity_selections (user_id);

-- Mirrors domain Reward: { status, cost }.
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  status text not null,
  cost integer,
  created_at timestamptz not null default now()
);

create index rewards_couple_id_idx on public.rewards (couple_id);

-- Mirrors domain WishlistItem: { status }.
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

create index wishlist_items_couple_id_idx on public.wishlist_items (couple_id);
