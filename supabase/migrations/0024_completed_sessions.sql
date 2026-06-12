-- ============================================================================
-- GymApp migratie 0024 — workouts tellen pas mee na "Stop workout"
-- Voer uit ná 0023.
-- ============================================================================

alter table public.workout_sessions
  add column if not exists completed_at timestamptz;

-- Bestaande workouts gelden als afgerond (anders verdwijnt je historie uit de cijfers).
update public.workout_sessions set completed_at = performed_at where completed_at is null;

-- Aggregaties: alleen afgeronde sessies tellen mee.
create or replace function public.user_workout_totals()
returns table (workouts bigint, sets bigint, volume numeric)
language sql stable
as $$
  with mine as (
    select id as sid from public.workout_sessions
    where user_id = auth.uid() and completed_at is not null
  )
  select
    (select count(*) from mine),
    count(ws.*),
    coalesce(sum(
      coalesce(ws.weight, 0) * coalesce(ws.reps, 0)
      * (case when ws.unilateral then 2 else 1 end)
    ), 0)
  from public.workout_sets ws
  where ws.session_id in (select sid from mine);
$$;

create or replace function public.user_daily_volume()
returns table (day date, volume numeric)
language sql stable
as $$
  with mine as (
    select id as sid, performed_at::date as day
    from public.workout_sessions
    where user_id = auth.uid() and completed_at is not null
  )
  select m.day, coalesce(sum(
    coalesce(ws.weight, 0) * coalesce(ws.reps, 0)
    * (case when ws.unilateral then 2 else 1 end)
  ), 0)
  from mine m
  left join public.workout_sets ws on ws.session_id = m.sid
  group by m.day;
$$;

create or replace function public.user_muscle_volume(p_since timestamptz)
returns table (muscle text, volume numeric)
language sql stable
as $$
  with my_sets as (
    select exercise_id,
      coalesce(weight, 0) * coalesce(reps, 0)
      * (case when unilateral then 2 else 1 end) as vol
    from public.workout_sets
    where session_id in (
      select id from public.workout_sessions
      where user_id = auth.uid()
        and completed_at is not null
        and (p_since is null or performed_at >= p_since)
    )
  ),
  ex as (select id as eid, primary_muscles from public.exercises)
  select m as muscle, sum(s.vol) as volume
  from my_sets s
  join ex on ex.eid = s.exercise_id
  cross join lateral unnest(ex.primary_muscles) as m
  where s.vol > 0
  group by m;
$$;

grant execute on function public.user_workout_totals() to authenticated;
grant execute on function public.user_daily_volume() to authenticated;
grant execute on function public.user_muscle_volume(timestamptz) to authenticated;
