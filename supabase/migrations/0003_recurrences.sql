-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Gastos/ingresos fijos (recurrentes) + recordatorios
-- ════════════════════════════════════════════════════════════════
create table if not exists recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind transaction_kind not null default 'expense',
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'COP',
  category_id uuid references categories (id) on delete set null,
  account_id uuid references accounts (id) on delete set null,
  frequency text not null default 'monthly' check (frequency in ('weekly', 'biweekly', 'monthly', 'yearly')),
  day_of_month int check (day_of_month between 1 and 31),
  next_due date not null,
  remind_days_before int not null default 1,
  last_reminded date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists recurrences_user_idx on recurrences (user_id);
create index if not exists recurrences_due_idx on recurrences (next_due) where active;

alter table recurrences enable row level security;
drop policy if exists owner_all on recurrences;
create policy owner_all on recurrences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table recurrences;
exception when duplicate_object then null; end $$;
