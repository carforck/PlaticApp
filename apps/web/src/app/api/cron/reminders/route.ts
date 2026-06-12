import { NextResponse, type NextRequest } from "next/server";
import { nextOccurrence, type Frequency } from "@platica/core";
import { createAdminClient } from "@/server/supabase-admin";
import { sendRecurrenceReminder } from "@/server/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREQ_LABEL: Record<string, string> = {
  weekly: "semanal",
  biweekly: "quincenal",
  monthly: "mensual",
  yearly: "anual",
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (minor: number, currency: string) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor);

/**
 * Cron diario (Vercel): recuerda 1 día antes los pagos fijos que vencen,
 * y adelanta los vencidos que quedaron sin atender. Protegido con CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("forbidden", { status: 401 });
  }

  const db = createAdminClient();
  const today = new Date();
  const todayStr = ymd(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = ymd(tomorrow);

  const { data: recs } = await db.from("recurrences").select("*").eq("active", true);
  let reminded = 0;
  let rolled = 0;

  for (const r of recs ?? []) {
    // 1) Adelantar los vencidos sin atender (evita que se queden pegados).
    if (r.next_due < todayStr) {
      let next = new Date(`${r.next_due}T00:00:00`);
      let guard = 0;
      while (ymd(next) < todayStr && guard++ < 60) next = nextOccurrence(next, r.frequency as Frequency);
      await db.from("recurrences").update({ next_due: ymd(next) }).eq("id", r.id);
      rolled++;
      continue;
    }

    // 2) Recordar 1 día antes (una sola vez por ciclo).
    if (r.next_due === tomorrowStr && r.last_reminded !== todayStr) {
      const { data: link } = await db
        .from("telegram_links")
        .select("telegram_chat_id")
        .eq("user_id", r.user_id)
        .maybeSingle();
      if (link?.telegram_chat_id) {
        try {
          await sendRecurrenceReminder(
            link.telegram_chat_id,
            r.id,
            r.name,
            fmt(r.amount_minor, r.currency),
            FREQ_LABEL[r.frequency] ?? r.frequency,
          );
          await db.from("recurrences").update({ last_reminded: todayStr }).eq("id", r.id);
          reminded++;
        } catch {
          /* sigue con los demás */
        }
      }
    }
  }

  // Housekeeping: limpia datos efímeros viejos.
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString();
  const dayAgo = new Date(today.getTime() - 86400000).toISOString();
  await db.from("processed_updates").delete().lt("processed_at", weekAgo);
  await db.from("link_codes").delete().or(`used_at.not.is.null,expires_at.lt.${today.toISOString()}`);
  await db.from("pending_drafts").delete().lt("created_at", dayAgo);

  return NextResponse.json({ ok: true, reminded, rolled, checked: recs?.length ?? 0 });
}
