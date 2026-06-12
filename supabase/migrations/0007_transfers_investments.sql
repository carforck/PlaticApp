-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Transferencias e inversiones que preservan el patrimonio
--  La cuenta destino (transfer_account_id) ahora se acredita también en
--  las inversiones, no solo en las transferencias. Así mover/invertir
--  plata no la hace "desaparecer" del patrimonio.
-- ════════════════════════════════════════════════════════════════
create or replace view account_movements
with (security_invoker = on) as
  select user_id, account_id,
    case when kind = 'income' then amount_minor else -amount_minor end as delta
  from transactions
  union all
  select user_id, transfer_account_id as account_id, amount_minor as delta
  from transactions
  where kind in ('transfer', 'investment') and transfer_account_id is not null;
