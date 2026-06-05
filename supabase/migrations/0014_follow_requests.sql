-- ============================================================================
-- GymApp migratie 0014 — volgverzoeken (accepteren/weigeren) + volglijsten
-- Voer uit ná 0013.
--
-- Volgen wordt nu een VERZOEK: de ontvanger moet accepteren. Bestaande volgers
-- blijven behouden (krijgen status 'accepted'). Enkel geaccepteerde volgers
-- zien voortaan je gedeelde workouts.
-- ============================================================================

alter table public.follows
  add column if not exists status text not null default 'accepted'
  check (status in ('pending', 'accepted'));

-- De ontvanger (following_id) mag een verzoek accepteren (status bijwerken)...
drop policy if exists "follows_update_target" on public.follows;
create policy "follows_update_target" on public.follows
  for update to authenticated
  using (following_id = auth.uid()) with check (following_id = auth.uid());

-- ...en mag een verzoek weigeren of een volger verwijderen.
drop policy if exists "follows_delete_target" on public.follows;
create policy "follows_delete_target" on public.follows
  for delete to authenticated using (following_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Feed: enkel GEACCEPTEERDE volgers zien gedeelde workouts.
-- ----------------------------------------------------------------------------
drop policy if exists "workout_sessions_feed" on public.workout_sessions;
create policy "workout_sessions_feed" on public.workout_sessions
  for select to authenticated using (
    shared = true and (
      user_id = auth.uid()
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid()
          and f.following_id = workout_sessions.user_id
          and f.status = 'accepted'
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
          where f.follower_id = auth.uid()
            and f.following_id = s.user_id
            and f.status = 'accepted'
        )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- Notificaties mogen ook voor volg-acties aangemaakt worden (naast coaching).
-- ----------------------------------------------------------------------------
drop policy if exists "notifications_insert_follow" on public.notifications;
create policy "notifications_insert_follow" on public.notifications
  for insert to authenticated with check (
    actor_id = auth.uid() and (
      exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = notifications.user_id
      )
      or exists (
        select 1 from public.follows f
        where f.following_id = auth.uid() and f.follower_id = notifications.user_id
      )
    )
  );
