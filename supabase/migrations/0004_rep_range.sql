-- ============================================================================
-- GymApp migratie 0004 — reps-bereik (bv. 6-8) in het schema
-- Voer uit ná 0003.
-- ============================================================================

-- Bovengrens van het reps-bereik. `reps` blijft de ondergrens.
alter table public.routine_exercises
  add column if not exists reps_max int;
