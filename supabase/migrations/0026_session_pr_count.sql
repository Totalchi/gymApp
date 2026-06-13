-- ============================================================================
-- GymApp migratie 0026 — aantal PR's per sessie (voor snelle feed-badges)
-- Voer uit ná 0025. We bewaren het aantal PR's op de sessie zelf, zodat de feed
-- geen dure herberekening per workout hoeft te doen.
-- ============================================================================

alter table public.workout_sessions
  add column if not exists pr_count integer not null default 0;
