-- Historial de pagos de cada pago fijo (recurrencia): cada pago o salto queda registrado.
create table if not exists recurrence_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurrence_id uuid not null references recurrences(id) on delete cascade,
  amount_minor bigint not null,
  account_id uuid references accounts(id) on delete set null,
  status text not null default 'paid',   -- paid | skipped
  paid_for date,                          -- el vencimiento que cubre
  created_at timestamptz not null default now()
);
alter table recurrence_payments enable row level security;
drop policy if exists recurrence_payments_owner on recurrence_payments;
create policy recurrence_payments_owner on recurrence_payments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists recurrence_payments_idx on recurrence_payments(recurrence_id, created_at desc);
