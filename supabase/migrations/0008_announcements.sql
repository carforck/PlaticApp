-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Centro de Novedades (changelog + canal de info)
-- ════════════════════════════════════════════════════════════════
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  emoji text not null default '🚀',
  tag text not null default 'nuevo' check (tag in ('nuevo', 'mejora', 'arreglo')),
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists announcements_created_idx on announcements (created_at desc);

alter table announcements enable row level security;
-- Todos los usuarios autenticados LEEN las publicadas; nadie escribe por RLS
-- (solo el service role desde la API admin).
drop policy if exists read_published on announcements;
create policy read_published on announcements
  for select to authenticated
  using (published);

do $$ begin
  alter publication supabase_realtime add table announcements;
exception when duplicate_object then null; end $$;

-- Marca de "última novedad vista" por usuario (para el badge de no leídas).
alter table profiles add column if not exists announcements_seen_at timestamptz;
