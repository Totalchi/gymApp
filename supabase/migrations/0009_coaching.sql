-- ============================================================================
-- GymApp migratie 0009 — trainer ↔ cliënt coaching (toestemmings-gebaseerd)
-- Voer uit ná 0008.
-- ============================================================================

-- Coach-relaties. Een coach nodigt een cliënt uit (pending); de cliënt
-- accepteert (active). Pas dan krijgt de coach inzage + kan hij schema's pushen.
create table if not exists public.coach_clients (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users (id) on delete cascade,
  client_id  uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  unique (coach_id, client_id)
);
create index if not exists coach_clients_coach_idx on public.coach_clients (coach_id);
create index if not exists coach_clients_client_idx on public.coach_clients (client_id);

alter table public.coach_clients enable row level security;

drop policy if exists "coach_clients_select" on public.coach_clients;
create policy "coach_clients_select" on public.coach_clients
  for select to authenticated
  using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists "coach_clients_insert" on public.coach_clients;
create policy "coach_clients_insert" on public.coach_clients
  for insert to authenticated with check (coach_id = auth.uid() and coach_id <> client_id);

-- Cliënt accepteert (status bijwerken).
drop policy if exists "coach_clients_update" on public.coach_clients;
create policy "coach_clients_update" on public.coach_clients
  for update to authenticated
  using (client_id = auth.uid()) with check (client_id = auth.uid());

-- Beide partijen mogen de relatie verwijderen (annuleren / stoppen).
drop policy if exists "coach_clients_delete" on public.coach_clients;
create policy "coach_clients_delete" on public.coach_clients
  for delete to authenticated
  using (coach_id = auth.uid() or client_id = auth.uid());

-- Schema's kunnen door een coach zijn toegewezen.
alter table public.routines
  add column if not exists assigned_by uuid references auth.users (id);

-- ----------------------------------------------------------------------------
-- Leesrechten voor de coach op data van een ACTIEVE cliënt.
-- ----------------------------------------------------------------------------
drop policy if exists "workout_sessions_coach" on public.workout_sessions;
create policy "workout_sessions_coach" on public.workout_sessions
  for select to authenticated using (
    exists (
      select 1 from public.coach_clients c
      where c.coach_id = auth.uid() and c.client_id = workout_sessions.user_id and c.status = 'active'
    )
  );

drop policy if exists "workout_sets_coach" on public.workout_sets;
create policy "workout_sets_coach" on public.workout_sets
  for select to authenticated using (
    exists (
      select 1 from public.workout_sessions s
      join public.coach_clients c on c.client_id = s.user_id
      where s.id = workout_sets.session_id and c.coach_id = auth.uid() and c.status = 'active'
    )
  );

drop policy if exists "body_metrics_coach" on public.body_metrics;
create policy "body_metrics_coach" on public.body_metrics
  for select to authenticated using (
    exists (
      select 1 from public.coach_clients c
      where c.coach_id = auth.uid() and c.client_id = body_metrics.user_id and c.status = 'active'
    )
  );

drop policy if exists "goals_coach" on public.goals;
create policy "goals_coach" on public.goals
  for select to authenticated using (
    exists (
      select 1 from public.coach_clients c
      where c.coach_id = auth.uid() and c.client_id = goals.user_id and c.status = 'active'
    )
  );

-- ----------------------------------------------------------------------------
-- Veilige functie: wijs (kopieer) een eigen schema toe aan een cliënt.
-- ----------------------------------------------------------------------------
create or replace function public.assign_routine(p_routine_id uuid, p_client_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_new_routine uuid;
  d record;
  v_new_day uuid;
begin
  if not exists (
    select 1 from coach_clients c
    where c.coach_id = v_coach and c.client_id = p_client_id and c.status = 'active'
  ) then
    raise exception 'Not an active coach of this client';
  end if;

  if not exists (select 1 from routines r where r.id = p_routine_id and r.user_id = v_coach) then
    raise exception 'Routine not found';
  end if;

  insert into routines (user_id, name, description, assigned_by)
    select p_client_id, name, description, v_coach from routines where id = p_routine_id
    returning id into v_new_routine;

  for d in select * from routine_days where routine_id = p_routine_id order by day_order loop
    insert into routine_days (routine_id, name, day_type, day_order, weekday)
      values (v_new_routine, d.name, d.day_type, d.day_order, d.weekday)
      returning id into v_new_day;

    insert into routine_exercises
      (day_id, exercise_id, position, sets, reps, reps_max, weight, one_rep_max,
       rir, rir_max, notes, rest, rest_seconds, superset_group)
    select v_new_day, exercise_id, position, sets, reps, reps_max, weight, one_rep_max,
       rir, rir_max, notes, rest, rest_seconds, superset_group
    from routine_exercises where day_id = d.id;
  end loop;

  return v_new_routine;
end;
$$;

grant execute on function public.assign_routine(uuid, uuid) to authenticated;
