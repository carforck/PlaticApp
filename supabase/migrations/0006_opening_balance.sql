-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Saldo inicial por cuenta (lo que el usuario ya tiene)
--  El saldo mostrado = saldo inicial + movimientos. No cuenta como ingreso.
-- ════════════════════════════════════════════════════════════════
alter table accounts add column if not exists opening_balance_minor bigint not null default 0;

-- Recreamos la vista (drop + create porque cambia el set de columnas).
drop view if exists account_balances;
create view account_balances
with (security_invoker = on) as
  select a.id as account_id, a.user_id, a.name, a.type, a.currency,
    (a.opening_balance_minor + coalesce(sum(m.delta), 0))::bigint as balance_minor,
    a.opening_balance_minor as opening_minor
  from accounts a
  left join account_movements m on m.account_id = a.id
  group by a.id, a.user_id, a.name, a.type, a.currency, a.opening_balance_minor;
