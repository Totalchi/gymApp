-- ============================================================================
-- GymApp migratie 0018 — progressiefoto's (met optioneel delen met de coach)
-- Voer uit ná 0017.
-- ============================================================================

create table if not exists public.progress_photos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  url               text not null,
  path              text not null,
  taken_on          date not null default current_date,
  shared_with_coach boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists progress_photos_user_idx
  on public.progress_photos (user_id, taken_on desc);

alter table public.progress_photos enable row level security;

-- Eigenaar beheert zijn eigen foto's.
drop policy if exists "progress_photos_own" on public.progress_photos;
create policy "progress_photos_own" on public.progress_photos
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Actieve coach mag GEDEELDE foto's van zijn cliënt zien.
drop policy if exists "progress_photos_coach" on public.progress_photos;
create policy "progress_photos_coach" on public.progress_photos
  for select to authenticated using (
    shared_with_coach = true and user_id in (
      select client_id from public.coach_clients
      where coach_id = auth.uid() and status = 'active'
    )
  );

-- ----------------------------------------------------------------------------
-- Storage-bucket voor de foto's (paden bevatten een willekeurige UUID).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('progress-photos', 'progress-photos', true)
  on conflict (id) do nothing;

drop policy if exists "progress_photos_upload" on storage.objects;
create policy "progress_photos_upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "progress_photos_delete" on storage.objects;
create policy "progress_photos_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "progress_photos_read" on storage.objects;
create policy "progress_photos_read" on storage.objects
  for select to authenticated using (bucket_id = 'progress-photos');
