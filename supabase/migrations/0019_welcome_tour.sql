-- Tour de bienvenida paso a paso.
-- Asegura la columna welcomed_at y la reabre para TODOS los usuarios (incluidos los
-- que ya estaban), para que vean una vez la nueva guía de inicio en su próximo login.
alter table profiles add column if not exists welcomed_at timestamptz;
update profiles set welcomed_at = null;
