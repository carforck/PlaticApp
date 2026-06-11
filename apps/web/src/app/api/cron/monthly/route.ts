import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/server/supabase-admin";
import { telegram } from "@/server/telegram";
import { summarize } from "@/server/ai/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const pesos = (minor: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(minor);
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Cron mensual (día 1): envía a cada usuario un resumen del mes anterior con un insight de IA. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("forbidden", { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date();
  // ?test=current => mes en curso (para previsualizar). Por defecto: mes anterior.
  const testCurrent = new URL(req.url).searchParams.get("test") === "current";
  const from = testCurrent ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = testCurrent ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = `${MONTHS[from.getMonth()]} ${from.getFullYear()}`;

  const { data: links } = await db.from("telegram_links").select("user_id, telegram_chat_id");
  let sent = 0;

  for (const link of links ?? []) {
    try {
      const { data: txs } = await db
        .from("transactions")
        .select("kind, amount_minor, category_id")
        .eq("user_id", link.user_id)
        .gte("occurred_at", from.toISOString())
        .lt("occurred_at", to.toISOString());
      if (!txs?.length) continue;

      let income = 0;
      let expense = 0;
      const byCat = new Map<string, number>();
      for (const t of txs) {
        if (t.kind === "income") income += t.amount_minor;
        else if (t.kind === "expense") {
          expense += t.amount_minor;
          byCat.set(t.category_id ?? "otros", (byCat.get(t.category_id ?? "otros") ?? 0) + t.amount_minor);
        }
      }
      const { data: cats } = await db.from("categories").select("id, name").eq("user_id", link.user_id);
      const catName = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));
      const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      const balance = income - expense;

      const stats = [
        `Ingresos: ${pesos(income)}`,
        `Gastos: ${pesos(expense)}`,
        `Balance: ${pesos(balance)}`,
        `Top categorías: ${top.map(([id, v]) => `${catName.get(id) ?? "Otros"} ${pesos(v)}`).join(", ") || "—"}`,
      ].join("\n");

      let insight = "";
      try {
        insight = await summarize(
          `Eres un asesor financiero cercano (Colombia, español). Con estos datos de ${monthLabel} de un usuario, escribe 2-3 frases cortas, motivadoras y útiles (sin markdown, sin viñetas, tono cálido). Datos:\n${stats}`,
        );
      } catch {
        insight = balance >= 0 ? "¡Buen mes! Cerraste en positivo. 💪" : "Cuida el próximo mes: gastaste más de lo que ingresó. 👀";
      }

      await telegram.sendMessage(
        link.telegram_chat_id,
        `📅 <b>Tu resumen de ${monthLabel}</b>\n\n💰 Ingresos: ${pesos(income)}\n💸 Gastos: ${pesos(expense)}\n⚖️ Balance: <b>${pesos(balance)}</b>\n${top.length ? `\n📊 Donde más gastaste:\n${top.map(([id, v]) => `• ${catName.get(id) ?? "Otros"}: ${pesos(v)}`).join("\n")}` : ""}\n\n💡 ${insight}`,
      );
      sent++;
    } catch {
      /* sigue con el siguiente usuario */
    }
  }

  return NextResponse.json({ ok: true, sent, users: links?.length ?? 0 });
}
