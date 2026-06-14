-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Tope del apartado al saldo real
--  Si se gastó de una cuenta con ahorro, lo apartado no puede superar
--  el saldo. La vista limita reserved_minor a min(ahorros, saldo≥0),
--  así «disponible = saldo − apartado» nunca queda negativo.
-- ════════════════════════════════════════════════════════════════
drop view if exists account_balances;
create view account_balances
with (security_invoker = on) as
  select a.id as account_id, a.user_id, a.name, a.type, a.currency,
    (a.opening_balance_minor + coalesce(sum(m.delta), 0))::bigint as balance_minor,
    a.opening_balance_minor as opening_minor,
    least(
      coalesce((select sum(s.reserved_minor) from savings s where s.account_id = a.id), 0),
      greatest((a.opening_balance_minor + coalesce(sum(m.delta), 0))::bigint, 0)
    )::bigint as reserved_minor
  from accounts a
  left join account_movements m on m.account_id = a.id
  where coalesce(a.archived, false) = false
  group by a.id, a.user_id, a.name, a.type, a.currency, a.opening_balance_minor;
