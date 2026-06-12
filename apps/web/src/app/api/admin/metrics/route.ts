import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEEKS = 8;
const WEEK_MS = 7 * 86_400_000;

/** Métricas de usuarios para las gráficas del Admin. Solo admin. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "no autorizado" }, { status: 403 });

  const db = createAdminClient();
  const [{ data: list }, txs, profs, links] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("transactions").select("occurred_at"),
    db.from("profiles").select("last_seen"),
    db.from("telegram_links").select("user_id"),
  ]);

  const userTs = (list?.users ?? []).map((u) => new Date(u.created_at).getTime());
  const txTs = (txs.data ?? []).map((t) => new Date(t.occurred_at as string).getTime());
  const now = Date.now();

  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const endMs = now - (WEEKS - 1 - i) * WEEK_MS;
    const startMs = endMs - WEEK_MS;
    return {
      label: new Date(endMs).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
      signups: userTs.filter((t) => t > startMs && t <= endMs).length,
      cumulative: userTs.filter((t) => t <= endMs).length,
      movimientos: txTs.filter((t) => t > startMs && t <= endMs).length,
    };
  });

  const weekAgo = now - WEEK_MS;
  const activeWeek = (profs.data ?? []).filter((p) => p.last_seen && new Date(p.last_seen).getTime() > weekAgo).length;

  return NextResponse.json({
    totalUsers: list?.users?.length ?? 0,
    withTelegram: links.data?.length ?? 0,
    activeWeek,
    newThisWeek: weeks[weeks.length - 1]?.signups ?? 0,
    weeks,
  });
}
