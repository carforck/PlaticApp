-- Historial de estado de cada deuda: creada, saldada, reabierta, editada.
create table if not exists debt_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  event text not null,        -- created | settled | reopened | edited
  detail text,
  created_at timestamptz not null default now()
);
alter table debt_events enable row level security;
drop policy if exists debt_events_owner on debt_events;
create policy debt_events_owner on debt_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists debt_events_idx on debt_events(debt_id, created_at desc);
