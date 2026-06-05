-- ============================================================================
-- GymApp migratie 0015 — coach ↔ cliënt chat
-- Voer uit ná 0014.
--
-- Directe berichten tussen een coach en zijn cliënt (beide richtingen),
-- enkel mogelijk zolang er een ACTIEVE coach-relatie is.
-- ============================================================================

create table if not exists public.coach_messages (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users (id) on delete cascade,
  client_id  uuid not null references auth.users (id) on delete cascade,
  sender_id  uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_messages_pair_idx
  on public.coach_messages (coach_id, client_id, created_at);

alter table public.coach_messages enable row level security;

-- Lezen: enkel de twee betrokkenen, en enkel bij een actieve relatie.
drop policy if exists "coach_messages_select" on public.coach_messages;
create policy "coach_messages_select" on public.coach_messages
  for select to authenticated using (
    (auth.uid() = coach_id or auth.uid() = client_id)
    and exists (
      select 1 from public.coach_clients c
      where c.coach_id = coach_messages.coach_id
        and c.client_id = coach_messages.client_id
        and c.status = 'active'
    )
  );

-- Sturen: je bent de afzender én één van de twee, en de relatie is actief.
drop policy if exists "coach_messages_insert" on public.coach_messages;
create policy "coach_messages_insert" on public.coach_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and (auth.uid() = coach_id or auth.uid() = client_id)
    and exists (
      select 1 from public.coach_clients c
      where c.coach_id = coach_messages.coach_id
        and c.client_id = coach_messages.client_id
        and c.status = 'active'
    )
  );

-- Notificaties mogen ook voor chatberichten (beide richtingen) aangemaakt worden.
drop policy if exists "notifications_insert_coachmsg" on public.notifications;
create policy "notifications_insert_coachmsg" on public.notifications
  for insert to authenticated with check (
    actor_id = auth.uid() and exists (
      select 1 from public.coach_clients c
      where c.status = 'active' and (
        (c.coach_id = auth.uid() and c.client_id = notifications.user_id)
        or (c.client_id = auth.uid() and c.coach_id = notifications.user_id)
      )
    )
  );

-- Push-abonnementen van de gesprekspartner ophalen (beide richtingen).
create or replace function public.pair_push_subs(p_other_id uuid)
returns table (endpoint text, p256dh text, auth_secret text)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from coach_clients c
    where c.status = 'active' and (
      (c.coach_id = auth.uid() and c.client_id = p_other_id)
      or (c.client_id = auth.uid() and c.coach_id = p_other_id)
    )
  ) then
    return;
  end if;

  return query
    select s.endpoint, s.p256dh, s.auth_secret
    from push_subscriptions s
    where s.user_id = p_other_id;
end;
$$;

grant execute on function public.pair_push_subs(uuid) to authenticated;
