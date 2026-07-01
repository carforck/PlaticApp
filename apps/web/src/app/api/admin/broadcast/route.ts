import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/server/supabase-admin";
import { sendPushToUser } from "@/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Difunde una notificación Web Push a todos los usuarios con suscripción.
 * Protegido con CRON_SECRET (Bearer). Reutilizable para avisos/novedades.
 * Body: { title, body, url? }
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("forbidden", { status: 401 });
  }

  const b = (await req.json().catch(() => ({}))) as { title?: string; body?: string; url?: string };
  if (!b.title || !b.body) return NextResponse.json({ error: "faltan title/body" }, { status: 400 });

  const db = createAdminClient();
  const { data: subs } = await db.from("push_subscriptions").select("user_id");
  const users = [...new Set((subs ?? []).map((s) => s.user_id))];
  const payload = { title: b.title, body: b.body, url: b.url || "/dashboard" };
  for (const uid of users) await sendPushToUser(uid, payload);

  return NextResponse.json({ ok: true, users: users.length });
}
