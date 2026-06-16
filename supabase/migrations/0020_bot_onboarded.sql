-- Marca si ya le mostramos al usuario la ruta de inicio en el bot.
-- Las filas existentes quedan en null → verán la guía una vez en su próximo mensaje.
alter table telegram_links add column if not exists onboarded_at timestamptz;
