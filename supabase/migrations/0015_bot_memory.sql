-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Memoria de corto plazo del bot (hilo de conversación)
--  Guarda los últimos turnos por chat para dar contexto a la IA.
--  Solo lo usa el backend (service role); se purga lo viejo (>30 min).
-- ════════════════════════════════════════════════════════════════
create table if not exists bot_messages (
  id bigserial primary key,
  chat_id bigint not null,
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists bot_messages_chat_idx on bot_messages (chat_id, created_at desc);

alter table bot_messages enable row level security; -- sin policy: solo service role
