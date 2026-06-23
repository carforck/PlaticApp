-- Buzón de mensajes: dudas, preguntas y sugerencias de los usuarios (desde app o bot).
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  source text not null default 'app',   -- app | bot
  message text not null,
  status text not null default 'open',   -- open | done
  created_at timestamptz not null default now()
);
alter table feedback enable row level security;
drop policy if exists feedback_insert_own on feedback;
create policy feedback_insert_own on feedback for insert with check (user_id = auth.uid());
drop policy if exists feedback_select_own on feedback;
create policy feedback_select_own on feedback for select using (user_id = auth.uid());
create index if not exists feedback_created_idx on feedback(created_at desc);
