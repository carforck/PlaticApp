-- Suscripciones Web Push (PWA): cada dispositivo que aceptó notificaciones.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists push_subs_owner on push_subscriptions;
create policy push_subs_owner on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
