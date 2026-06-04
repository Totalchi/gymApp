-- ============================================================================
-- GymApp migratie 0008 — sociale kant (profielen, volgen, feed, likes, comments)
-- Voer uit ná 0007.
-- ============================================================================

-- Profielen: gebruikersnaam + bio, en leesbaar voor ingelogde gebruikers.
alter table public.profiles
  add column if not exists username text unique,
  add column if not exists bio text;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
  for select to authenticated using (true);

-- Workouts kunnen gedeeld of privé zijn.
alter table public.workout_sessions
  add column if not exists shared boolean not null default true;

-- ----------------------------------------------------------------------------
-- Volgen
-- ----------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select to authenticated using (true);
drop policy if exists "follows_insert" on public.follows;
create policy "follows_insert" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists "follows_delete" on public.follows;
create policy "follows_delete" on public.follows
  for delete to authenticated using (follower_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Likes
-- ----------------------------------------------------------------------------
create table if not exists public.likes (
  user_id    uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
alter table public.likes enable row level security;
drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes for select to authenticated using (true);
drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert" on public.likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "likes_delete" on public.likes;
create policy "likes_delete" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Comments
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_session_idx on public.comments (session_id, created_at);
alter table public.comments enable row level security;
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select to authenticated using (true);
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Feed-leesrechten: gedeelde workouts van jezelf of mensen die je volgt.
-- ----------------------------------------------------------------------------
drop policy if exists "workout_sessions_feed" on public.workout_sessions;
create policy "workout_sessions_feed" on public.workout_sessions
  for select to authenticated using (
    shared = true and (
      user_id = auth.uid()
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = workout_sessions.user_id
      )
    )
  );

drop policy if exists "workout_sets_feed" on public.workout_sets;
create policy "workout_sets_feed" on public.workout_sets
  for select to authenticated using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.session_id and s.shared = true and (
        s.user_id = auth.uid()
        or exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.following_id = s.user_id
        )
      )
    )
  );
