-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Ahorros (apartado por cuenta + meta opcional)
--  reserved_minor: parte del saldo apartada como ahorro (intocable).
--  savings_goal_minor: objetivo de ahorro de esa cuenta (NULL = sin meta).
--  Sigue siendo patrimonio (el dinero no sale de la cuenta).
-- ════════════════════════════════════════════════════════════════
alter table accounts add column if not exists reserved_minor bigint not null default 0;
alter table accounts add column if not exists savings_goal_minor bigint;

-- Recreamos la vista para exponer lo apartado y la meta (manteniendo filtro de archivadas).
drop view if exists account_balances;
create view account_balances
with (security_invoker = on) as
  select a.id as account_id, a.user_id, a.name, a.type, a.currency,
    (a.opening_balance_minor + coalesce(sum(m.delta), 0))::bigint as balance_minor,
    a.opening_balance_minor as opening_minor,
    a.reserved_minor,
    a.savings_goal_minor as goal_minor
  from accounts a
  left join account_movements m on m.account_id = a.id
  where coalesce(a.archived, false) = false
  group by a.id, a.user_id, a.name, a.type, a.currency, a.opening_balance_minor, a.reserved_minor, a.savings_goal_minor;
