-- ============================================================================
-- GymApp migratie 0011 — notificaties
-- Voer uit ná 0010.
--
-- Eenvoudig, herbruikbaar notificatiesysteem. Eerste gebruik: laat een cliënt
-- weten wanneer zijn coach het toegewezen schema aanpast (bv. een oefening
-- vervangt). De inhoud wordt gestructureerd opgeslagen (type + data) en in de
-- taal van de ontvanger weergegeven.
-- ============================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade, -- ontvanger
  actor_id   uuid references auth.users (id) on delete set null,         -- wie het veroorzaakte
  type       text not null,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Ontvanger leest zijn eigen notificaties.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Ontvanger markeert ze als gelezen.
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ontvanger mag ze verwijderen.
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Een actieve coach mag een notificatie aan zijn cliënt sturen.
drop policy if exists "notifications_insert_coach" on public.notifications;
create policy "notifications_insert_coach" on public.notifications
  for insert to authenticated with check (
    actor_id = auth.uid()
    and user_id in (
      select client_id from public.coach_clients
      where coach_id = auth.uid() and status = 'active'
    )
  );
