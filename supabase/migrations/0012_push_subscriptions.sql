-- ============================================================================
-- GymApp migratie 0012 — Web Push abonnementen
-- Voer uit ná 0011.
--
-- Slaat de push-abonnementen van een toestel op zodat we echte
-- telefoonmeldingen kunnen sturen. iOS ondersteunt dit enkel wanneer de PWA
-- aan het beginscherm is toegevoegd (geïnstalleerd).
-- ============================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_secret text not null,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Een gebruiker beheert enkel zijn eigen abonnementen.
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Veilige functie: een actieve coach mag de push-abonnementen van zijn cliënt
-- ophalen om een melding te kunnen sturen.
-- ----------------------------------------------------------------------------
create or replace function public.coach_client_push_subs(p_client_id uuid)
returns table (endpoint text, p256dh text, auth_secret text)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from coach_clients
    where coach_id = auth.uid() and client_id = p_client_id and status = 'active'
  ) then
    return;
  end if;

  return query
    select s.endpoint, s.p256dh, s.auth_secret
    from push_subscriptions s
    where s.user_id = p_client_id;
end;
$$;

grant execute on function public.coach_client_push_subs(uuid) to authenticated;
