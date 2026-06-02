-- ============================================================================
-- GymApp — volledige database setup (migratie 0001 + 0002 gecombineerd)
-- Plak dit hele bestand in de Supabase SQL Editor en klik Run.
-- ============================================================================

-- profiles: 1-op-1 met auth.users
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  weight_unit  text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  created_at   timestamptz not null default now()
);

-- Maak automatisch een profiel aan bij registratie.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- exercises: gedeelde catalogus + optionele eigenaar (owner_id) voor eigen oefeningen
create table if not exists public.exercises (
  id                text primary key,
  name              text not null,
  category          text,
  level             text,
  mechanic          text,
  force             text,
  equipment         text,
  primary_muscles   text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  instructions      text[] not null default '{}',
  image_urls        text[] not null default '{}',
  owner_id          uuid references auth.users (id) on delete cascade
);

create index if not exists exercises_name_idx on public.exercises using gin (to_tsvector('english', name));
create index if not exists exercises_primary_muscles_idx on public.exercises using gin (primary_muscles);
create index if not exists exercises_owner_id_idx on public.exercises (owner_id);

-- routines: een trainingsschema
create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create index if not exists routines_user_id_idx on public.routines (user_id);

-- routine_days: dagen binnen een schema
create table if not exists public.routine_days (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  name       text not null,
  day_type   text not null default 'custom',
  day_order  int not null default 0
);

create index if not exists routine_days_routine_id_idx on public.routine_days (routine_id);

-- routine_exercises: oefeningen op een dag
create table if not exists public.routine_exercises (
  id          uuid primary key default gen_random_uuid(),
  day_id      uuid not null references public.routine_days (id) on delete cascade,
  exercise_id text not null references public.exercises (id),
  position    int not null default 0,
  sets        int not null default 3,
  reps        int not null default 10,
  weight      numeric,
  one_rep_max numeric,
  rir         numeric,
  notes       text
);

create index if not exists routine_exercises_day_id_idx on public.routine_exercises (day_id);

-- workout_sessions: een uitgevoerde training
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

-- workout_sets: gelogde sets binnen een sessie
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

create index if not exists workout_sets_session_idx on public.workout_sets (session_id);
create index if not exists workout_sets_exercise_idx on public.workout_sets (exercise_id);

-- Storage bucket voor geüploade oefeningfoto's
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_days      enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.workout_sets      enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- exercises: globaal OF eigen lezen; eigen schrijven
drop policy if exists "exercises_select_all" on public.exercises;
drop policy if exists "exercises_select" on public.exercises;
create policy "exercises_select" on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own" on public.exercises
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own" on public.exercises
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "exercises_delete_own" on public.exercises;
create policy "exercises_delete_own" on public.exercises
  for delete to authenticated using (owner_id = auth.uid());

-- routines
drop policy if exists "routines_all_own" on public.routines;
create policy "routines_all_own" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- routine_days: parent-routine moet van de gebruiker zijn
drop policy if exists "routine_days_all_own" on public.routine_days;
create policy "routine_days_all_own" on public.routine_days
  for all using (
    routine_id in (select id from public.routines where user_id = auth.uid())
  ) with check (
    routine_id in (select id from public.routines where user_id = auth.uid())
  );

-- routine_exercises: via dag -> routine
drop policy if exists "routine_exercises_all_own" on public.routine_exercises;
create policy "routine_exercises_all_own" on public.routine_exercises
  for all using (
    day_id in (
      select routine_days.id from public.routine_days
      where routine_days.routine_id in (
        select id from public.routines where user_id = auth.uid()
      )
    )
  ) with check (
    day_id in (
      select routine_days.id from public.routine_days
      where routine_days.routine_id in (
        select id from public.routines where user_id = auth.uid()
      )
    )
  );

-- workout_sessions
drop policy if exists "workout_sessions_all_own" on public.workout_sessions;
create policy "workout_sessions_all_own" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- workout_sets: via sessie
drop policy if exists "workout_sets_all_own" on public.workout_sets;
create policy "workout_sets_all_own" on public.workout_sets
  for all using (
    session_id in (select id from public.workout_sessions where user_id = auth.uid())
  ) with check (
    session_id in (select id from public.workout_sessions where user_id = auth.uid())
  );

-- Storage policies voor de foto-bucket
drop policy if exists "exercise_images_read" on storage.objects;
create policy "exercise_images_read" on storage.objects
  for select using (bucket_id = 'exercise-images');

drop policy if exists "exercise_images_insert" on storage.objects;
create policy "exercise_images_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exercise_images_delete" on storage.objects;
create policy "exercise_images_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
