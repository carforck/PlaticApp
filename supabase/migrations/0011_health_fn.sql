-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Función de diagnóstico (doctor)
--  Resume métricas de salud para el panel de Admin. SECURITY DEFINER
--  para leer tamaños del sistema; solo la llama el backend (service role).
-- ════════════════════════════════════════════════════════════════
create or replace function public.platica_health()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'db_size',            pg_database_size(current_database()),
    'storage_bytes',      (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects where bucket_id = 'receipts'),
    'receipts',           (select count(*) from receipts),
    'users',              (select count(*) from auth.users),
    'transactions',       (select count(*) from transactions),
    'accounts',           (select count(*) from accounts),
    'pending_drafts',     (select count(*) from pending_drafts),
    'stuck_drafts',       (select count(*) from pending_drafts where created_at < now() - interval '1 day'),
    'processed_updates',  (select count(*) from processed_updates),
    'active_today',       (select count(*) from profiles where last_seen > now() - interval '24 hours')
  );
$$;

revoke all on function public.platica_health() from anon, authenticated;
grant execute on function public.platica_health() to service_role;
