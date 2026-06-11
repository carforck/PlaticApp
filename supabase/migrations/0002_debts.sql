-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Deudas / préstamos (ledger de quién debe a quién)
-- ════════════════════════════════════════════════════════════════
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  counterparty text not null,                 -- a quién / de quién
  direction text not null check (direction in ('i_owe', 'they_owe')), -- yo debo / me deben
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'COP',
  description text,
  status text not null default 'open' check (status in ('open', 'settled')),
  created_at timestamptz not null default now()
);
create index if not exists debts_user_idx on debts (user_id);

alter table debts enable row level security;
drop policy if exists owner_all on debts;
create policy owner_all on debts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table debts;
exception when duplicate_object then null; end $$;
