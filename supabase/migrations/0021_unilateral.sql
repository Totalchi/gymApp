-- ============================================================================
-- GymApp migratie 0021 — "per zijde" (unilateraal) markering per oefening
-- Voer uit ná 0020.
--
-- Markeer een oefening als per arm/been (bv. one-arm row): het gelogde gewicht
-- is dan per zijde. Puur informatief in de UI — geen drukke extra velden.
-- ============================================================================

alter table public.routine_exercises
  add column if not exists unilateral boolean not null default false;
