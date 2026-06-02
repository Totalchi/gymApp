-- ============================================================================
-- GymApp migratie 0003 — Hevy-achtige functies
-- Workout-logging upgrades, supersets, rusttijd, routine-mappen,
-- lichaamsmetingen. Voer uit ná 0002.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- routine_exercises: rusttijd + superset-groepering
-- ----------------------------------------------------------------------------
alter table public.routine_exercises
  add column if not exists rest_seconds int,
  add column if not exists superset_group int;

-- ----------------------------------------------------------------------------
-- workout_sets: set-type (warmup/normal/drop/failure) + afgevinkt
-- ----------------------------------------------------------------------------
alter table public.workout_sets
  add column if not exists set_type text not null default 'normal',
  add column if not exists completed boolean not null default true;

-- ----------------------------------------------------------------------------
-- workout_sessions: duur van de training
-- ----------------------------------------------------------------------------
alter table public.workout_sessions
  add column if not exists duration_seconds int;

-- ----------------------------------------------------------------------------
-- routine_folders: mappen om schema's te ordenen
-- ----------------------------------------------------------------------------
create table if not exists public.routine_folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists routine_folders_user_idx on public.routine_folders (user_id);

alter table public.routines
  add column if not exists folder_id uuid references public.routine_folders (id) on delete set null,
  add column if not exists position int not null default 0;

-- ----------------------------------------------------------------------------
-- body_metrics: lichaamsgewicht + maten
-- ----------------------------------------------------------------------------
create table if not exists public.body_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  measured_at date not null default current_date,
  weight      numeric,
  body_fat    numeric,
  chest       numeric,
  waist       numeric,
  arms        numeric,
  thighs      numeric,
  notes       text
);

create index if not exists body_metrics_user_idx
  on public.body_metrics (user_id, measured_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.routine_folders enable row level security;
alter table public.body_metrics    enable row level security;

drop policy if exists "routine_folders_all_own" on public.routine_folders;
create policy "routine_folders_all_own" on public.routine_folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "body_metrics_all_own" on public.body_metrics;
create policy "body_metrics_all_own" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
