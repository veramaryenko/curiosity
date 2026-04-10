-- Add a `metric` column to daily_tasks for concrete, measurable per-day goals.
-- Examples: "200 słów", "15 minut", "2 km", "3 szkice".
-- Existing tasks created before this migration will have metric = null,
-- and the UI must handle that case gracefully.

alter table public.daily_tasks
  add column if not exists metric text;
