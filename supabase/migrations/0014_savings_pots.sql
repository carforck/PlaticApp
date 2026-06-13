-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Ahorros con título (varios "sobres" por cuenta)
--  Antes era 1 apartado por cuenta; ahora cada ahorro tiene nombre
--  (ej. «Casa», «Celular», «Ropa») y vive en una cuenta.
-- ════════════════════════════════════════════════════════════════
create table if not exists savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete cascade,
  name text not null,
  reserved_minor bigint not null default 0,
  goal_minor bigint,
  created_at timestamptz not null default now()
);

alter table savings enable row level security;
drop policy if exists own_savings on savings;
create policy own_savings on savings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Migrar lo que ya existía (1 apartado/meta por cuenta) a un sobre llamado «Ahorro».
insert into savings (user_id, account_id, name, reserved_minor, goal_minor)
  select user_id, id, 'Ahorro', reserved_minor, savings_goal_minor
  from accounts
  where reserved_minor > 0 or savings_goal_minor is not null;

-- La vista ahora calcula lo apartado por cuenta como la SUMA de sus sobres.
drop view if exists account_balances;
create view account_balances
with (security_invoker = on) as
  select a.id as account_id, a.user_id, a.name, a.type, a.currency,
    (a.opening_balance_minor + coalesce(sum(m.delta), 0))::bigint as balance_minor,
    a.opening_balance_minor as opening_minor,
    coalesce((select sum(s.reserved_minor) from savings s where s.account_id = a.id), 0)::bigint as reserved_minor
  from accounts a
  left join account_movements m on m.account_id = a.id
  where coalesce(a.archived, false) = false
  group by a.id, a.user_id, a.name, a.type, a.currency, a.opening_balance_minor;
