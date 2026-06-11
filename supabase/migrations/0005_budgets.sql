-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Presupuestos por categoría (mensuales)
-- ════════════════════════════════════════════════════════════════
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references categories (id) on delete cascade, -- null = presupuesto global
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default now()
);
create index if not exists budgets_user_idx on budgets (user_id);
-- Un presupuesto por categoría (y uno solo global) por usuario.
create unique index if not exists budgets_user_cat_uniq on budgets (user_id, category_id) where category_id is not null;
create unique index if not exists budgets_user_global_uniq on budgets (user_id) where category_id is null;

alter table budgets enable row level security;
drop policy if exists owner_all on budgets;
create policy owner_all on budgets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table budgets;
exception when duplicate_object then null; end $$;
