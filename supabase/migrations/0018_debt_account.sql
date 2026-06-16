-- ════════════════════════════════════════════════════════════════
--  PlaticApp · El préstamo mueve plata de una cuenta
--  Un préstamo puede salir/entrar de una cuenta (debts.account_id):
--    • «presté» (they_owe)  → sale de la cuenta (−)
--    • «me prestaron» (i_owe) → entra a la cuenta (+)
--  Al saldar, la plata vuelve (efecto inverso → neto 0).
--  NO usa transactions, así que NO cuenta como gasto/ingreso del mes.
-- ════════════════════════════════════════════════════════════════
alter table debts add column if not exists account_id uuid references accounts (id) on delete set null;

create or replace view account_movements
with (security_invoker = on) as
  -- Movimientos por transacciones (gastos, ingresos, transfers, inversiones).
  select user_id, account_id,
    case when kind = 'income' then amount_minor else -amount_minor end as delta
  from transactions
  union all
  select user_id, transfer_account_id as account_id, amount_minor as delta
  from transactions
  where kind in ('transfer', 'investment') and transfer_account_id is not null
  union all
  -- Préstamo: efecto inicial sobre la cuenta elegida.
  select user_id, account_id,
    case when direction = 'they_owe' then -amount_minor else amount_minor end as delta
  from debts
  where account_id is not null
  union all
  -- Al saldar, la plata vuelve (efecto inverso → el neto del préstamo saldado es 0).
  select user_id, account_id,
    case when direction = 'they_owe' then amount_minor else -amount_minor end as delta
  from debts
  where account_id is not null and status = 'settled';
