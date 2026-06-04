-- ============================================================================
-- GymApp migratie 0010 — coach mag een TOEGEWEZEN schema van een cliënt bewerken
-- Voer uit ná 0009.
--
-- Een coach wijst met assign_routine een KOPIE toe aan de cliënt. Die kopie
-- staat op naam van de cliënt (user_id = cliënt) met assigned_by = coach.
-- Hierna kon de coach die kopie niet meer aanpassen. Deze migratie geeft de
-- coach lees- + schrijfrechten op exact die schema's (en hun dagen/oefeningen),
-- zolang de coach-relatie 'active' is. De cliënt blijft eigenaar en ziet de
-- wijzigingen meteen.
-- ============================================================================

-- routines: coach mag een door hem toegewezen schema van een actieve cliënt
-- lezen en bewerken (naast de bestaande eigenaar-policy; policies zijn OR).
drop policy if exists "routines_coach_assigned" on public.routines;
create policy "routines_coach_assigned" on public.routines
  for all to authenticated
  using (
    assigned_by = auth.uid()
    and user_id in (
      select client_id from public.coach_clients
      where coach_id = auth.uid() and status = 'active'
    )
  )
  with check (
    assigned_by = auth.uid()
    and user_id in (
      select client_id from public.coach_clients
      where coach_id = auth.uid() and status = 'active'
    )
  );

-- routine_days: via het bovenliggende toegewezen schema.
drop policy if exists "routine_days_coach_assigned" on public.routine_days;
create policy "routine_days_coach_assigned" on public.routine_days
  for all to authenticated
  using (
    routine_id in (
      select id from public.routines
      where assigned_by = auth.uid()
        and user_id in (
          select client_id from public.coach_clients
          where coach_id = auth.uid() and status = 'active'
        )
    )
  )
  with check (
    routine_id in (
      select id from public.routines
      where assigned_by = auth.uid()
        and user_id in (
          select client_id from public.coach_clients
          where coach_id = auth.uid() and status = 'active'
        )
    )
  );

-- routine_exercises: via dag -> toegewezen schema.
drop policy if exists "routine_exercises_coach_assigned" on public.routine_exercises;
create policy "routine_exercises_coach_assigned" on public.routine_exercises
  for all to authenticated
  using (
    day_id in (
      select id from public.routine_days
      where routine_id in (
        select id from public.routines
        where assigned_by = auth.uid()
          and user_id in (
            select client_id from public.coach_clients
            where coach_id = auth.uid() and status = 'active'
          )
      )
    )
  )
  with check (
    day_id in (
      select id from public.routine_days
      where routine_id in (
        select id from public.routines
        where assigned_by = auth.uid()
          and user_id in (
            select client_id from public.coach_clients
            where coach_id = auth.uid() and status = 'active'
          )
      )
    )
  );
