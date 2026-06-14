import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bitácora de eventos para auditoría. Solo admin. Filtros: ?source= &level= */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "no autorizado" }, { status: 403 });

  const url = new URL(req.url);
  const source = url.searchParams.get("source");
  const level = url.searchParams.get("level");

  const db = createAdminClient();
  let q = db.from("event_log").select("id, created_at, level, source, event, detail, actor").order("created_at", { ascending: false }).limit(200);
  if (source && source !== "all") q = q.eq("source", source);
  if (level && level !== "all") q = q.eq("level", level);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // También el estado del webhook de Telegram (errores recientes del lado de Telegram).
  let webhook: { pending: number; lastError: string | null; lastErrorAt: string | null } | null = null;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((x) => x.json());
      const info = r.result ?? {};
      webhook = {
        pending: info.pending_update_count ?? 0,
        lastError: info.last_error_message ?? null,
        lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
      };
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ logs: data ?? [], webhook });
}
