-- ════════════════════════════════════════════════════════════════
--  PlaticApp · Aviso al admin cuando se registra un usuario nuevo
--  Trigger AFTER INSERT en auth.users → llama (vía pg_net) al endpoint
--  /api/hooks/new-user, que notifica SOLO al admin por Telegram.
--  El secreto real (NEW_USER_HOOK_SECRET) se inyecta al aplicar; aquí va
--  como placeholder para no versionar credenciales.
-- ════════════════════════════════════════════════════════════════
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://platicapp-web.vercel.app/api/hooks/new-user?secret=__NEW_USER_HOOK_SECRET__',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'email', new.email,
      'name', coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      'provider', new.raw_app_meta_data->>'provider'
    )
  );
  return new;
exception when others then
  return new; -- nunca bloquea el registro si el aviso falla
end $$;

drop trigger if exists on_auth_user_created_notify on auth.users;
create trigger on_auth_user_created_notify
  after insert on auth.users
  for each row execute function public.notify_new_user();
