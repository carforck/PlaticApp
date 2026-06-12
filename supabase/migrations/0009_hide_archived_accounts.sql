-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Ocultar cuentas archivadas de la vista de saldos
--  Antes mostraba todas; ahora las archivadas no aparecen en el panel.
-- ════════════════════════════════════════════════════════════════
drop view if exists account_balances;
create view account_balances
with (security_invoker = on) as
  select a.id as account_id, a.user_id, a.name, a.type, a.currency,
    (a.opening_balance_minor + coalesce(sum(m.delta), 0))::bigint as balance_minor,
    a.opening_balance_minor as opening_minor
  from accounts a
  left join account_movements m on m.account_id = a.id
  where coalesce(a.archived, false) = false
  group by a.id, a.user_id, a.name, a.type, a.currency, a.opening_balance_minor;
