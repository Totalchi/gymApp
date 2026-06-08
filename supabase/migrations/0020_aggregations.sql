-- ============================================================================
-- GymApp migratie 0020 — server-side aggregaties (snelheid)
-- Voer uit ná 0019.
--
-- Dashboard en stats berekenden totalen door ÁLLE sets op te halen. Deze
-- functies doen de optelling in de database en geven enkel de uitkomst terug.
-- (security invoker → RLS blijft gelden: je ziet enkel je eigen data.)
-- ============================================================================

-- Totalen: aantal workouts, aantal sets, totaal volume.
create or replace function public.user_workout_totals()
returns table (workouts bigint, sets bigint, volume numeric)
language sql stable
as $$
  with mine as (
    select id as sid from public.workout_sessions where user_id = auth.uid()
  )
  select
    (select count(*) from mine),
    count(ws.*),
    coalesce(sum(coalesce(ws.weight, 0) * coalesce(ws.reps, 0)), 0)
  from public.workout_sets ws
  where ws.session_id in (select sid from mine);
$$;

-- Volume per dag (voor heatmap + weekgrafiek).
create or replace function public.user_daily_volume()
returns table (day date, volume numeric)
language sql stable
as $$
  with mine as (
    select id as sid, performed_at::date as day
    from public.workout_sessions where user_id = auth.uid()
  )
  select m.day, coalesce(sum(coalesce(ws.weight, 0) * coalesce(ws.reps, 0)), 0)
  from mine m
  left join public.workout_sets ws on ws.session_id = m.sid
  group by m.day;
$$;

-- Volume per spiergroep (optioneel sinds een datum).
create or replace function public.user_muscle_volume(p_since timestamptz)
returns table (muscle text, volume numeric)
language sql stable
as $$
  with my_sets as (
    select exercise_id, coalesce(weight, 0) * coalesce(reps, 0) as vol
    from public.workout_sets
    where session_id in (
      select id from public.workout_sessions
      where user_id = auth.uid()
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
