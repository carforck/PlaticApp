import { createAdminClient } from "./supabase-admin";
import { telegram } from "./telegram";
import { ADMIN_EMAIL } from "@/lib/admin";

/** Envía un mensaje por Telegram solo al admin (si tiene su cuenta vinculada). Best-effort. */
export async function notifyAdmin(text: string): Promise<void> {
  try {
    const db = createAdminClient();
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    const admin = (list?.users ?? []).find((u) => u.email === ADMIN_EMAIL);
    if (!admin) return;
    const { data: link } = await db.from("telegram_links").select("telegram_chat_id").eq("user_id", admin.id).maybeSingle();
    if (!link?.telegram_chat_id) return;
    await telegram.sendMessage(link.telegram_chat_id, text);
  } catch {
    /* no romper el flujo principal si falla la notificación */
  }
}
