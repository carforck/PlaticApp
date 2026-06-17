-- Una deuda puede mover la plata en dos momentos:
--   'creation'   = la plata ya salió/entró al crearla (préstamo en efectivo). Comportamiento anterior.
--   'settlement' = la plata se mueve solo cuando se paga (deuda «generada», nunca salió). Por defecto.
alter table debts add column if not exists moves_at text not null default 'settlement';

-- Las deudas que ya tenían cuenta asignada asumieron efectivo al crearse → 'creation' (no cambia su saldo).
update debts set moves_at = 'creation' where account_id is not null;

-- La vista de movimientos refleja ambos modos.
create or replace view account_movements as
select t.user_id, t.account_id,
  case when t.kind = 'income'::transaction_kind then t.amount_minor else -t.amount_minor end as delta
from transactions t
union all
select t.user_id, t.transfer_account_id as account_id, t.amount_minor as delta
from transactions t
where t.kind = any (array['transfer'::transaction_kind, 'investment'::transaction_kind]) and t.transfer_account_id is not null
union all
-- Modo 'creation': mueve mientras está abierta; al saldar vuelve (neto 0).
select d.user_id, d.account_id, case when d.direction = 'they_owe'::text then -d.amount_minor else d.amount_minor end as delta
from debts d where d.account_id is not null and d.moves_at = 'creation'
union all
select d.user_id, d.account_id, case when d.direction = 'they_owe'::text then d.amount_minor else -d.amount_minor end as delta
from debts d where d.account_id is not null and d.moves_at = 'creation' and d.status = 'settled'::text
union all
-- Modo 'settlement': solo se mueve al pagar (te deben → entra; debes → sale).
select d.user_id, d.account_id, case when d.direction = 'they_owe'::text then d.amount_minor else -d.amount_minor end as delta
from debts d where d.account_id is not null and d.moves_at = 'settlement' and d.status = 'settled'::text;
