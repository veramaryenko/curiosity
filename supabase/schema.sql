-- Curiosity App Database Schema
-- Run this in Supabase SQL Editor

-- Challenges
create table public.challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text default '',
  duration_days integer not null check (duration_days >= 7),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  start_date date not null default current_date,
  end_date date not null,
  created_at timestamptz default now() not null
);

-- Daily tasks
create table public.daily_tasks (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  day_number integer not null,
  description text not null,
  resource_url text,
  completed boolean default false not null,
  date date not null
);

-- Mood entries (optional daily check-in)
create table public.mood_entries (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.daily_tasks(id) on delete cascade not null,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  mood_score integer not null check (mood_score between 1 and 5),
  note text,
  created_at timestamptz default now() not null
);

-- End-of-challenge reflections
create table public.reflections (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  overall_feeling integer not null check (overall_feeling between 1 and 5),
  liked text default '',
  disliked text default '',
  obstacles text default '',
  wants_to_continue boolean not null,
  ai_insight text,
  created_at timestamptz default now() not null
);

-- Notification preferences
create table public.notification_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  reminder_time time default '09:00' not null,
  email_enabled boolean default true not null
);

-- Indexes
create index idx_challenges_user_id on public.challenges(user_id);
create index idx_challenges_status on public.challenges(status);
create index idx_daily_tasks_challenge_id on public.daily_tasks(challenge_id);
create index idx_daily_tasks_date on public.daily_tasks(date);
create index idx_mood_entries_challenge_id on public.mood_entries(challenge_id);
create index idx_mood_entries_user_id on public.mood_entries(user_id);

-- Row Level Security (RLS) — users can only access their own data
alter table public.challenges enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.mood_entries enable row level security;
alter table public.reflections enable row level security;
alter table public.notification_preferences enable row level security;

-- Challenges: users see only their own
create policy "Users can view own challenges"
  on public.challenges for select
  using (auth.uid() = user_id);

create policy "Users can create own challenges"
  on public.challenges for insert
  with check (auth.uid() = user_id);

create policy "Users can update own challenges"
  on public.challenges for update
  using (auth.uid() = user_id);

-- Daily tasks: users see tasks for their challenges
create policy "Users can view own tasks"
  on public.daily_tasks for select
  using (challenge_id in (select id from public.challenges where user_id = auth.uid()));

create policy "Users can create tasks for own challenges"
  on public.daily_tasks for insert
  with check (challenge_id in (select id from public.challenges where user_id = auth.uid()));

create policy "Users can update own tasks"
  on public.daily_tasks for update
  using (challenge_id in (select id from public.challenges where user_id = auth.uid()));

-- Mood entries: users see only their own
create policy "Users can view own mood entries"
  on public.mood_entries for select
  using (auth.uid() = user_id);

create policy "Users can create own mood entries"
  on public.mood_entries for insert
  with check (auth.uid() = user_id);

-- Reflections: users see only their own
create policy "Users can view own reflections"
  on public.reflections for select
  using (auth.uid() = user_id);

create policy "Users can create own reflections"
  on public.reflections for insert
  with check (auth.uid() = user_id);

-- Notification preferences: users manage only their own
create policy "Users can view own notification prefs"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can create own notification prefs"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification prefs"
  on public.notification_preferences for update
  using (auth.uid() = user_id);

-- Function to create default notification preferences for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: auto-create notification prefs on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
