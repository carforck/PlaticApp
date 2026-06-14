import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/server/supabase-admin";
import { telegram } from "@/server/telegram";
import { logEvent } from "@/server/logs";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook que dispara la base al registrarse un usuario nuevo (cualquier método).
 * Notifica SOLO al admin por Telegram. Protegido con ?secret=NEW_USER_HOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.NEW_USER_HOOK_SECRET;
  const given = new URL(req.url).searchParams.get("secret");
  if (!secret || given !== secret) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { email?: string; name?: string; provider?: string };
  const db = createAdminClient();

  void logEvent({ source: "auth", event: "registro_nuevo", detail: `${body.name ?? ""} ${body.email ?? ""}`.trim(), actor: body.email ?? null });

  // Chat de Telegram del admin (debe tener su cuenta vinculada).
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const admin = (list?.users ?? []).find((u) => u.email === ADMIN_EMAIL);
  if (!admin) return NextResponse.json({ ok: false, reason: "sin admin" });
  const { data: link } = await db.from("telegram_links").select("telegram_chat_id").eq("user_id", admin.id).maybeSingle();
  if (!link?.telegram_chat_id) return NextResponse.json({ ok: false, reason: "admin sin telegram" });

  const total = list?.users?.length ?? 0;
  const name = body.name?.trim();
  const provider = body.provider ? ` · vía ${body.provider}` : "";
  const msg =
    `🎉 <b>¡Nuevo usuario en PlaticApp!</b>\n` +
    `${name ? `${name}\n` : ""}` +
    `${body.email ?? "sin correo"}${provider}\n` +
    `👥 Ya son <b>${total}</b> usuarios.`;

  await telegram.sendMessage(link.telegram_chat_id, msg);
  return NextResponse.json({ ok: true });
}
