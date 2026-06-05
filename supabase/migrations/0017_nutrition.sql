-- ============================================================================
-- GymApp migratie 0017 — voeding (calorieën + macro's per dag)
-- Voer uit ná 0016.
-- ============================================================================

create table if not exists public.nutrition_logs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  log_date   date not null,
  calories   integer,
  protein    integer,
  carbs      integer,
  fat        integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

alter table public.nutrition_logs enable row level security;

drop policy if exists "nutrition_logs_own" on public.nutrition_logs;
create policy "nutrition_logs_own" on public.nutrition_logs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Dagdoelen op het profiel.
alter table public.profiles
  add column if not exists calorie_goal integer,
  add column if not exists protein_goal integer;
