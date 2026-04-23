-- Wymiana pojedynczego resource_url na strukturalny resources jsonb.
-- Migracja DESTRUKCYJNA — dropujemy kolumnę. Potwierdzone: baza produkcyjna jest pusta.

alter table public.daily_tasks
  drop column if exists resource_url,
  add column if not exists resources jsonb default null;
