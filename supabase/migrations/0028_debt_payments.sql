-- Abonos (pagos parciales) de una deuda. Cada abono mueve una cuenta y reduce lo pendiente.
-- Reemplaza el modelo "todo-o-nada": antes saldar movía el monto completo por la vista.
create table if not exists debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  account_id uuid references accounts(id) on delete set null,  -- cuenta que recibe/paga el abono
  note text,
  created_at timestamptz not null default now()
);
alter table debt_payments enable row level security;
drop policy if exists debt_payments_owner on debt_payments;
create policy debt_payments_owner on debt_payments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists debt_payments_debt_idx on debt_payments(debt_id, created_at desc);
create index if not exists debt_payments_user_idx on debt_payments(user_id);

-- Backfill: cada deuda ya saldada se convierte en un abono completo, para NO cambiar ningún saldo
-- cuando la vista deje de usar la rama "settled".
insert into debt_payments (user_id, debt_id, amount_minor, account_id, note, created_at)
select d.user_id, d.id, d.amount_minor, coalesce(d.settle_account_id, d.account_id), 'saldo migrado', d.created_at
from debts d
where d.status = 'settled'
  and not exists (select 1 from debt_payments p where p.debt_id = d.id);

-- Vista de saldos: quitamos la rama "settled completo" y agregamos la rama de abonos.
create or replace view account_movements as
  select t.user_id, t.account_id,
    case when t.kind = 'income'::transaction_kind then t.amount_minor else -t.amount_minor end as delta
  from transactions t
  union all
  select t.user_id, t.transfer_account_id as account_id, t.amount_minor as delta
  from transactions t
  where t.kind = any (array['transfer'::transaction_kind, 'investment'::transaction_kind])
    and t.transfer_account_id is not null
  union all
  -- deuda "ya movida" al crearse (creation): la plata entra/sale en el momento de crearla
  select d.user_id, d.account_id,
    case when d.direction = 'they_owe'::text then -d.amount_minor else d.amount_minor end as delta
  from debts d
  where d.account_id is not null and d.moves_at = 'creation'::text
  union all
  -- abonos: cada abono mueve la cuenta elegida (me deben => entra; yo debo => sale)
  select p.user_id, p.account_id,
    case when d.direction = 'they_owe'::text then p.amount_minor else -p.amount_minor end as delta
  from debt_payments p
  join debts d on d.id = p.debt_id
  where p.account_id is not null;
