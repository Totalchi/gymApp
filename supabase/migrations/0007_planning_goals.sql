-- ============================================================================
-- GymApp migratie 0007 — planning (weekdag per dag) + doelen
-- Voer uit ná 0006.
-- ============================================================================

-- Een schema-dag kan aan een weekdag gekoppeld worden (0 = maandag ... 6 = zondag).
alter table public.routine_days
  add column if not exists weekday int;

-- Doelen: streefgewicht (bodyweight) of doel-1RM voor een oefening (lift).
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('bodyweight', 'lift')),
  exercise_id text references public.exercises (id),
  target      numeric not null,
  created_at  timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals (user_id);

alter table public.goals enable row level security;

drop policy if exists "goals_all_own" on public.goals;
create policy "goals_all_own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
