-- ============================================================================
-- GymApp migratie 0005 — rusttijd als vrije tekst (bv. "2-3 min", "60-90 sec")
-- Voer uit ná 0004.
-- ============================================================================

alter table public.routine_exercises
  add column if not exists rest text;
