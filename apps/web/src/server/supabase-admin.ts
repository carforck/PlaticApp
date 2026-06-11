import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la SECRET key (service role): se salta RLS.
 * SOLO en backend/bot. Por eso filtramos por user_id manualmente en cada query.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
