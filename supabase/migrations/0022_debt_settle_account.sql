-- Al pagar una deuda, el dinero puede entrar/salir de una cuenta DISTINTA a la de origen
-- (ej. presté desde Nequi pero me pagaron a Bancolombia). settle_account_id guarda esa cuenta.
alter table debts add column if not exists settle_account_id uuid references accounts(id) on delete set null;

create or replace view account_movements as
select t.user_id, t.account_id,
  case when t.kind = 'income'::transaction_kind then t.amount_minor else -t.amount_minor end as delta
from transactions t
union all
select t.user_id, t.transfer_account_id as account_id, t.amount_minor as delta
from transactions t
where t.kind = any (array['transfer'::transaction_kind, 'investment'::transaction_kind]) and t.transfer_account_id is not null
union all
-- Movimiento de ORIGEN (solo modo 'creation': la plata ya se movió al crear).
select d.user_id, d.account_id, case when d.direction = 'they_owe'::text then -d.amount_minor else d.amount_minor end as delta
from debts d where d.account_id is not null and d.moves_at = 'creation'
union all
-- Movimiento al PAGAR (cualquier modo, al saldar): te deben → entra (+), debes → sale (-).
-- Va a la cuenta donde se recibió/pagó (settle_account_id), o a account_id si no se indicó.
select d.user_id, coalesce(d.settle_account_id, d.account_id) as account_id,
  case when d.direction = 'they_owe'::text then d.amount_minor else -d.amount_minor end as delta
from debts d where d.status = 'settled'::text and coalesce(d.settle_account_id, d.account_id) is not null;
