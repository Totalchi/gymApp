-- ============================================================================
-- GymApp database schema
-- Voer dit uit in de Supabase SQL Editor (of via de Supabase CLI) op een
-- nieuw project. Maakt tabellen, relaties en Row Level Security policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: 1-op-1 met auth.users, voor app-specifieke gebruikersdata.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
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

-- ----------------------------------------------------------------------------
-- exercises: gedeelde catalogus (geseed uit free-exercise-db). Read-only
-- voor gebruikers.
-- ----------------------------------------------------------------------------
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
  image_urls        text[] not null default '{}'
);

create index if not exists exercises_name_idx on public.exercises using gin (to_tsvector('english', name));
create index if not exists exercises_primary_muscles_idx on public.exercises using gin (primary_muscles);

-- ----------------------------------------------------------------------------
-- routines: een trainingsschema van een gebruiker (bv. "Push/Pull/Legs").
-- ----------------------------------------------------------------------------
create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create index if not exists routines_user_id_idx on public.routines (user_id);

-- ----------------------------------------------------------------------------
-- routine_days: dagen binnen een schema (push/pull/legs/full body/...).
-- ----------------------------------------------------------------------------
create table if not exists public.routine_days (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  name       text not null,
  day_type   text not null default 'custom',
  day_order  int not null default 0
);

create index if not exists routine_days_routine_id_idx on public.routine_days (routine_id);

-- ----------------------------------------------------------------------------
-- routine_exercises: oefeningen op een dag, met sets/reps/kg en RIR.
-- ----------------------------------------------------------------------------
create table if not exists public.routine_exercises (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid not null references public.routine_days (id) on delete cascade,
  exercise_id  text not null references public.exercises (id),
  position     int not null default 0,
  sets         int not null default 3,
  reps         int not null default 10,
  weight       numeric,
  one_rep_max  numeric,
  rir          numeric,
  notes        text
);

create index if not exists routine_exercises_day_id_idx on public.routine_exercises (day_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_days      enable row level security;
alter table public.routine_exercises enable row level security;

-- profiles: alleen je eigen profiel.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- exercises: iedereen die ingelogd is mag lezen.
drop policy if exists "exercises_select_all" on public.exercises;
create policy "exercises_select_all" on public.exercises
  for select to authenticated using (true);

-- routines: alleen eigenaar.
drop policy if exists "routines_all_own" on public.routines;
create policy "routines_all_own" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- routine_days: via de bovenliggende routine.
drop policy if exists "routine_days_all_own" on public.routine_days;
create policy "routine_days_all_own" on public.routine_days
  for all using (
    exists (
      select 1 from public.routines r
      where r.id = routine_days.routine_id and r.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_days.routine_id and r.user_id = auth.uid()
    )
  );

-- routine_exercises: via dag -> routine.
drop policy if exists "routine_exercises_all_own" on public.routine_exercises;
create policy "routine_exercises_all_own" on public.routine_exercises
  for all using (
    exists (
      select 1
      from public.routine_days d
      join public.routines r on r.id = d.routine_id
      where d.id = routine_exercises.day_id and r.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.routine_days d
      join public.routines r on r.id = d.routine_id
      where d.id = routine_exercises.day_id and r.user_id = auth.uid()
    )
  );
