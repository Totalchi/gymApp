-- ============================================================================
-- GymApp migratie 0025 — extra populaire variant-oefeningen
-- Voer uit ná 0024. Deze variant-lifts (pause/tempo/pin/Pendlay/deficit/Spoto)
-- staan wel in apps als Hevy maar ontbreken in de open dataset. Foto's hergebruiken
-- de bestaande basisoefening. on conflict do nothing => veilig herhaalbaar.
-- ============================================================================

insert into public.exercises
  (id, name, category, level, mechanic, force, equipment,
   primary_muscles, secondary_muscles, instructions, image_urls)
values
  (
    'Pause_Bench_Press', 'Pause Bench Press', 'strength', 'intermediate', 'compound', 'push', 'barbell',
    ARRAY['chest']::text[],
    ARRAY['triceps','shoulders']::text[],
    ARRAY[
      'Laat de stang gecontroleerd zakken tot op je borst.',
      'Pauzeer 1-2 seconden volledig stil op de borst, blijf op spanning.',
      'Druk explosief omhoog zonder te veren.'
    ]::text[],
    ARRAY[
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/1.jpg'
    ]::text[]
  ),
  (
    'Spoto_Press', 'Spoto Press', 'strength', 'intermediate', 'compound', 'push', 'barbell',
    ARRAY['chest']::text[],
    ARRAY['triceps','shoulders']::text[],
    ARRAY[
      'Laat de stang zakken tot ~2-3 cm boven je borst.',
      'Pauzeer daar zwevend 1-2 seconden zonder de borst te raken.',
      'Druk weer omhoog naar de startpositie.'
    ]::text[],
    ARRAY[
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg'
    ]::text[]
  ),
  (
    'Tempo_Squat', 'Tempo Squat', 'strength', 'intermediate', 'compound', 'push', 'barbell',
    ARRAY['quadriceps']::text[],
    ARRAY['glutes','hamstrings','lower back']::text[],
    ARRAY[
      'Zak in 3-4 seconden gecontroleerd naar het diepste punt.',
      'Kort onderaan, kom dan gecontroleerd weer omhoog.',
      'Houd de hele beweging onder spanning en de borst hoog.'
    ]::text[],
    ARRAY[
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg',
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/1.jpg'
    ]::text[]
  ),
  (
    'Pin_Squat', 'Pin Squat', 'strength', 'advanced', 'compound', 'push', 'barbell',
    ARRAY['quadriceps']::text[],
    ARRAY['glutes','hamstrings','lower back']::text[],
    ARRAY[
      'Stel de pinnen in het rek af op je gewenste diepte.',
      'Zak tot de stang op de pinnen rust en ontspan kort de spanning.',
      'Druk vanaf dood punt explosief omhoog.'
    ]::text[],
    ARRAY[
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg'
    ]::text[]
  ),
  (
    'Pendlay_Row', 'Pendlay Row', 'strength', 'intermediate', 'compound', 'pull', 'barbell',
    ARRAY['middle back']::text[],
    ARRAY['lats','biceps','traps']::text[],
    ARRAY[
      'Buig voorover met rechte rug tot je torso bijna horizontaal is.',
      'Trek de stang explosief vanaf de grond naar je onderste ribben.',
      'Laat de stang elke herhaling weer volledig op de grond rusten.'
    ]::text[],
    ARRAY[
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg',
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/1.jpg'
    ]::text[]
  ),
  (
    'Deficit_Deadlift', 'Deficit Deadlift', 'strength', 'advanced', 'compound', 'pull', 'barbell',
    ARRAY['lower back']::text[],
    ARRAY['glutes','hamstrings','quadriceps','traps']::text[],
    ARRAY[
      'Sta op een verhoging van 2-5 cm voor een grotere bewegingsbaan.',
      'Pak de stang vast met rechte rug en gespannen core.',
      'Til op met een vlakke rug en strek volledig in de heupen.'
    ]::text[],
    ARRAY[
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg',
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/1.jpg'
    ]::text[]
  )
on conflict (id) do nothing;
