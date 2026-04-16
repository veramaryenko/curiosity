-- Soft delete support for challenges.
alter table public.challenges
  add column if not exists deleted_at timestamptz;

-- Keep active challenge lookups cheap.
create index if not exists idx_challenges_deleted_at
  on public.challenges (deleted_at)
  where deleted_at is null;

create index if not exists idx_challenges_user_created_at_active
  on public.challenges (user_id, created_at desc)
  where deleted_at is null;

drop policy if exists "Users can view own challenges" on public.challenges;
create policy "Users can view own challenges"
  on public.challenges for select
  using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "Users can create own challenges" on public.challenges;
create policy "Users can create own challenges"
  on public.challenges for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own challenges" on public.challenges;
create policy "Users can update own challenges"
  on public.challenges for update
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own tasks" on public.daily_tasks;
create policy "Users can view own tasks"
  on public.daily_tasks for select
  using (
    challenge_id in (
      select id
      from public.challenges
      where user_id = auth.uid() and deleted_at is null
    )
  );

drop policy if exists "Users can create tasks for own challenges" on public.daily_tasks;
create policy "Users can create tasks for own challenges"
  on public.daily_tasks for insert
  with check (
    challenge_id in (
      select id
      from public.challenges
      where user_id = auth.uid() and deleted_at is null
    )
  );

drop policy if exists "Users can update own tasks" on public.daily_tasks;
create policy "Users can update own tasks"
  on public.daily_tasks for update
  using (
    challenge_id in (
      select id
      from public.challenges
      where user_id = auth.uid() and deleted_at is null
    )
  );

drop policy if exists "Users can view own mood entries" on public.mood_entries;
create policy "Users can view own mood entries"
  on public.mood_entries for select
  using (
    auth.uid() = user_id
    and challenge_id in (
      select id
      from public.challenges
      where user_id = auth.uid() and deleted_at is null
    )
  );

drop policy if exists "Users can create own mood entries" on public.mood_entries;
create policy "Users can create own mood entries"
  on public.mood_entries for insert
  with check (
    auth.uid() = user_id
    and challenge_id in (
      select id
      from public.challenges
      where user_id = auth.uid() and deleted_at is null
    )
  );

drop policy if exists "Users can view own reflections" on public.reflections;
create policy "Users can view own reflections"
  on public.reflections for select
  using (
    auth.uid() = user_id
    and challenge_id in (
      select id
      from public.challenges
      where user_id = auth.uid() and deleted_at is null
    )
  );

drop policy if exists "Users can create own reflections" on public.reflections;
create policy "Users can create own reflections"
  on public.reflections for insert
  with check (
    auth.uid() = user_id
    and challenge_id in (
      select id
      from public.challenges
      where user_id = auth.uid() and deleted_at is null
    )
  );
