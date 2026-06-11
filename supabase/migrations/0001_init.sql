-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Esquema inicial
--  Multiusuario con Row Level Security (cada quien ve solo lo suyo).
--  Pega TODO esto en el SQL Editor de Supabase y ejecútalo.
-- ════════════════════════════════════════════════════════════════

-- ── Tipos ──────────────────────────────────────────────────────
do $$ begin
  create type transaction_kind as enum ('expense', 'income', 'investment', 'transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_type as enum ('bank', 'cash', 'investment', 'wallet', 'credit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_channel as enum ('telegram_text', 'telegram_audio', 'telegram_image', 'web');
exception when duplicate_object then null; end $$;

-- ── Perfil del usuario ─────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  default_currency text not null default 'COP',
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now()
);

-- ── Cuentas (dónde vive el dinero) ─────────────────────────────
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type account_type not null,
  currency text not null default 'COP',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists accounts_user_idx on accounts (user_id);

-- ── Categorías de clasificación ────────────────────────────────
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  applies_to text check (applies_to in ('expense', 'income')),
  emoji text,
  color text,
  created_at timestamptz not null default now()
);
create index if not exists categories_user_idx on categories (user_id);

-- ── Transacciones ──────────────────────────────────────────────
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind transaction_kind not null,
  amount_minor bigint not null check (amount_minor > 0), -- monto positivo; el signo lo da 'kind'
  currency text not null default 'COP',
  account_id uuid not null references accounts (id) on delete restrict,
  transfer_account_id uuid references accounts (id) on delete restrict, -- destino en transfers
  category_id uuid references categories (id) on delete set null,
  description text,
  occurred_at timestamptz not null default now(),
  source source_channel not null default 'web',
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_time_idx on transactions (user_id, occurred_at desc);

-- ── Vínculo con Telegram + códigos de vinculación ──────────────
create table if not exists telegram_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  telegram_chat_id bigint unique not null,
  telegram_username text,
  linked_at timestamptz not null default now()
);

create table if not exists link_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- ── Idempotencia de updates de Telegram (el webhook reintenta) ─
create table if not exists processed_updates (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);

-- ── Borradores pendientes de confirmar (flujo confirmar-antes-de-guardar) ─
create table if not exists pending_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  draft jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists pending_drafts_user_idx on pending_drafts (user_id);

-- ════════════════════════════════════════════════════════════════
--  Vistas de saldos (respetan RLS: security_invoker)
-- ════════════════════════════════════════════════════════════════
create or replace view account_movements
with (security_invoker = on) as
  select user_id, account_id,
    case when kind = 'income' then amount_minor else -amount_minor end as delta
  from transactions
  union all
  select user_id, transfer_account_id as account_id, amount_minor as delta
  from transactions
  where kind = 'transfer' and transfer_account_id is not null;

create or replace view account_balances
with (security_invoker = on) as
  select a.id as account_id, a.user_id, a.name, a.type, a.currency,
    coalesce(sum(m.delta), 0)::bigint as balance_minor
  from accounts a
  left join account_movements m on m.account_id = a.id
  group by a.id, a.user_id, a.name, a.type, a.currency;

-- ════════════════════════════════════════════════════════════════
--  Row Level Security — cada usuario solo accede a SUS filas
-- ════════════════════════════════════════════════════════════════
alter table profiles        enable row level security;
alter table accounts        enable row level security;
alter table categories      enable row level security;
alter table transactions    enable row level security;
alter table telegram_links  enable row level security;
alter table link_codes      enable row level security;
alter table processed_updates enable row level security; -- sin policies => solo service role

-- Helper: política "dueño" sobre user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array['accounts','categories','transactions','telegram_links','link_codes','pending_drafts']
  loop
    execute format($f$
      drop policy if exists owner_all on %1$I;
      create policy owner_all on %1$I
        for all to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- Perfil: el usuario ve/edita el suyo
drop policy if exists profile_self on profiles;
create policy profile_self on profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ════════════════════════════════════════════════════════════════
--  Al registrarse: crear perfil + cuentas y categorías por defecto
-- ════════════════════════════════════════════════════════════════
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;

  insert into public.accounts (user_id, name, type) values
    (new.id, 'Efectivo', 'cash'),
    (new.id, 'Banco', 'bank');

  insert into public.categories (user_id, name, applies_to, emoji, color) values
    (new.id, 'Comida',      'expense', '🍽️', '#ff9f0a'),
    (new.id, 'Transporte',  'expense', '🚕', '#0a84ff'),
    (new.id, 'Arriendo',    'expense', '🏠', '#bf5af2'),
    (new.id, 'Ocio',        'expense', '🎉', '#30d158'),
    (new.id, 'Salud',       'expense', '🩺', '#ff375f'),
    (new.id, 'Salario',     'income',  '💰', '#30d158'),
    (new.id, 'Otros',       null,      '🧾', '#8e8e93');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ════════════════════════════════════════════════════════════════
--  Realtime: el dashboard se actualiza solo
-- ════════════════════════════════════════════════════════════════
do $$ begin
  alter publication supabase_realtime add table transactions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table accounts;
exception when duplicate_object then null; end $$;
