-- ============================================================================
-- GymApp migratie 0019 — rol (atleet / coach) bij registratie
-- Voer uit ná 0018.
-- ============================================================================

alter table public.profiles
  add column if not exists role text not null default 'athlete'
  check (role in ('athlete', 'coach'));

-- Trigger uitbreiden zodat de gekozen rol uit de signup-metadata wordt bewaard.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach' else 'athlete' end
  );
  return new;
end;
$$;
