-- ============================================================================
-- GymApp migratie 0013 — taalvoorkeur per gebruiker
-- Voer uit ná 0012.
--
-- Zo kunnen we push-meldingen in de taal van de ONTVANGER versturen (de
-- taal-cookie is server-side niet bereikbaar voor een andere gebruiker).
-- ============================================================================

alter table public.profiles
  add column if not exists lang text not null default 'nl'
  check (lang in ('nl', 'en'));
