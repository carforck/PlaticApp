-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Bitácora de eventos (logs) para auditoría del Admin
--  Registra actividad del bot de Telegram y de la app. Solo lo escribe
--  el backend (service role); el Admin lo consulta. Se purga lo viejo.
-- ════════════════════════════════════════════════════════════════
create table if not exists event_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  source text not null,           -- 'telegram' | 'app' | 'cron' | 'auth'
  event text not null,            -- ej. 'mensaje', 'registro', 'error', 'login'
  detail text,                    -- texto corto descriptivo
  actor text                      -- correo, @usuario o chat_id
);
create index if not exists event_log_created_idx on event_log (created_at desc);
create index if not exists event_log_source_idx on event_log (source, created_at desc);

alter table event_log enable row level security; -- sin policy: solo service role
