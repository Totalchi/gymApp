-- ============================================================================
-- GymApp migratie 0016 — herinneringen + PR-meldingen
-- Voer uit ná 0015.
-- ============================================================================

-- Voorkeur: wil de gebruiker herinneringen ontvangen?
alter table public.profiles
  add column if not exists reminders_enabled boolean not null default true;

-- Een gebruiker mag een notificatie voor ZICHZELF aanmaken (bv. PR-felicitatie).
drop policy if exists "notifications_insert_self" on public.notifications;
create policy "notifications_insert_self" on public.notifications
  for insert to authenticated with check (
    actor_id = auth.uid() and user_id = auth.uid()
  );
