-- ============================================================================
-- GymApp migratie 0023 — volgorde, geplande warmups, Pause Squat
-- Voer uit ná 0022.
-- ============================================================================

-- 1) Workout-sets onthouden de schema-volgorde (bug: was alfabetisch).
alter table public.workout_sets
  add column if not exists position integer not null default 0;

-- 2) Warmup-sets plannen in het sjabloon (aantal per oefening).
alter table public.routine_exercises
  add column if not exists warmup_sets integer not null default 0;

-- 3) Pause Squat toevoegen aan de catalogus (ontbrak in de dataset).
insert into public.exercises
  (id, name, category, level, mechanic, force, equipment,
   primary_muscles, secondary_muscles, instructions, image_urls)
values (
  'Pause_Squat', 'Pause Squat', 'strength', 'intermediate', 'compound', 'push', 'barbell',
  ARRAY['quadriceps']::text[],
  ARRAY['glutes','hamstrings','lower back']::text[],
  ARRAY[
    'Zet de stang op je rug zoals bij een gewone squat en zak gecontroleerd naar beneden.',
    'Pauzeer 2-3 seconden op het diepste punt. Blijf op spanning: zak niet door en veer niet.',
    'Druk explosief omhoog naar de startpositie zonder gebruik te maken van de rekreflex.',
    'Houd je borst hoog en je core aangespannen tijdens de pauze.'
  ]::text[],
  ARRAY[
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg',
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/1.jpg'
  ]::text[]
)
on conflict (id) do nothing;

-- 4) assign_routine kopieert nu ook unilateral + warmup_sets mee naar de cliënt.
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
       rir, rir_max, notes, rest, rest_seconds, superset_group, unilateral, warmup_sets)
    select v_new_day, exercise_id, position, sets, reps, reps_max, weight, one_rep_max,
       rir, rir_max, notes, rest, rest_seconds, superset_group, unilateral, warmup_sets
    from routine_exercises where day_id = d.id;
  end loop;

  return v_new_routine;
end;
$$;
