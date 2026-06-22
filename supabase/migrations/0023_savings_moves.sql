-- Historial de movimientos de cada ahorro (sobre): cada abono/retiro/gasto/ajuste queda registrado.
-- Antes, `savings.reserved_minor` solo guardaba el valor actual, sin log.
create table if not exists savings_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  saving_id uuid not null references savings(id) on delete cascade,
  delta_minor bigint not null,                 -- positivo = abono; negativo = retiro/gasto
  reason text not null default 'adjust',       -- deposit | withdraw | spent | goal | adjust
  created_at timestamptz not null default now()
);

alter table savings_moves enable row level security;
drop policy if exists savings_moves_owner on savings_moves;
create policy savings_moves_owner on savings_moves
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists savings_moves_saving_idx on savings_moves(saving_id, created_at desc);
