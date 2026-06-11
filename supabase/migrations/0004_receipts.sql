-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Recibos (fotos que se le envían al bot de Telegram)
-- ════════════════════════════════════════════════════════════════

-- Tabla de recibos (metadatos; la imagen vive en Storage).
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null,            -- ruta en el bucket: {user_id}/{uuid}.jpg
  caption text,                  -- resumen de lo detectado
  created_at timestamptz not null default now()
);
create index if not exists receipts_user_idx on receipts (user_id, created_at desc);

alter table receipts enable row level security;
drop policy if exists owner_all on receipts;
create policy owner_all on receipts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table receipts;
exception when duplicate_object then null; end $$;

-- Bucket de Storage privado para las imágenes.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- RLS de Storage: cada usuario solo accede a su propia carpeta ({user_id}/...).
drop policy if exists "receipts_own_select" on storage.objects;
create policy "receipts_own_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_own_insert" on storage.objects;
create policy "receipts_own_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_own_delete" on storage.objects;
create policy "receipts_own_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
