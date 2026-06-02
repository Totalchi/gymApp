-- ============================================================================
-- GymApp migratie 0002
-- Voegt toe: eigen oefeningen (+ foto-upload via Storage), workout-logging
-- en voortgang. Voer uit ná 0001_init.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Eigen oefeningen: exercises krijgen een optionele eigenaar.
--   owner_id IS NULL  -> globale (geseede) oefening, zichtbaar voor iedereen
--   owner_id = user   -> eigen oefening, alleen voor die gebruiker
-- ----------------------------------------------------------------------------
alter table public.exercises
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

create index if not exists exercises_owner_id_idx on public.exercises (owner_id);

-- Lees-policy vervangen: globaal OF eigen.
drop policy if exists "exercises_select_all" on public.exercises;
drop policy if exists "exercises_select" on public.exercises;
create policy "exercises_select" on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

-- Schrijf-policies voor eigen oefeningen.
drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own" on public.exercises
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own" on public.exercises
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "exercises_delete_own" on public.exercises;
create policy "exercises_delete_own" on public.exercises
  for delete to authenticated
  using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Storage bucket voor geüploade oefeningfoto's.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

drop policy if exists "exercise_images_read" on storage.objects;
create policy "exercise_images_read" on storage.objects
  for select using (bucket_id = 'exercise-images');

drop policy if exists "exercise_images_insert" on storage.objects;
create policy "exercise_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exercise_images_delete" on storage.objects;
create policy "exercise_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Workout logging: een uitgevoerde trainingssessie + de gelogde sets.
-- ----------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  routine_id   uuid references public.routines (id) on delete set null,
  day_id       uuid references public.routine_days (id) on delete set null,
  day_name     text,
  performed_at timestamptz not null default now(),
  notes        text
);

create index if not exists workout_sessions_user_idx
  on public.workout_sessions (user_id, performed_at desc);

create table if not exists public.workout_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id   text not null references public.exercises (id),
  exercise_name text,
  set_number    int not null default 1,
  reps          int,
  weight        numeric,
  one_rep_max   numeric,
  rir           numeric
);

create index if not exists workout_sets_session_idx
  on public.workout_sets (session_id);
create index if not exists workout_sets_exercise_idx
  on public.workout_sets (exercise_id);

-- RLS.
alter table public.workout_sessions enable row level security;
alter table public.workout_sets     enable row level security;

drop policy if exists "workout_sessions_all_own" on public.workout_sessions;
create policy "workout_sessions_all_own" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workout_sets_all_own" on public.workout_sets;
create policy "workout_sets_all_own" on public.workout_sets
  for all using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.session_id and s.user_id = auth.uid()
    )
  );
