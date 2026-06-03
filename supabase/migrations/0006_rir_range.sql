-- ============================================================================
-- GymApp migratie 0006 — RIR als bereik (bv. "2-3") in het schema
-- Voer uit ná 0005.
-- ============================================================================

-- Bovengrens van het RIR-bereik. `rir` blijft de ondergrens.
alter table public.routine_exercises
  add column if not exists rir_max numeric;
