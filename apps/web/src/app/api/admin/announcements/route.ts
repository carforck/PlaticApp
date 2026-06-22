import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import { telegram } from "@/server/telegram";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TAGS = ["nuevo", "mejora", "arreglo"] as const;

/** Publica una novedad (solo admin) y, opcionalmente, la difunde por Telegram. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "no autorizado" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    emoji?: string;
    tag?: (typeof TAGS)[number];
    notify?: boolean;
  };
  const title = b.title?.trim();
  const body = b.body?.trim();
  if (!title || !body) return NextResponse.json({ error: "faltan título y mensaje" }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.from("announcements").insert({
    title,
    body,
    emoji: b.emoji?.trim() || "🚀",
    tag: TAGS.includes(b.tag as (typeof TAGS)[number]) ? b.tag : "nuevo",
  });
  if (error) {
    console.error("admin/announcements insert:", error.message);
    return NextResponse.json({ error: "No se pudo publicar la novedad" }, { status: 500 });
  }

  let notified = 0;
  if (b.notify) {
    const { data: links } = await db.from("telegram_links").select("telegram_chat_id");
    for (const l of links ?? []) {
      try {
        await telegram.sendMessage(l.telegram_chat_id, `${b.emoji || "🚀"} <b>${title}</b>\n${body}`);
        notified++;
      } catch {
        /* sigue con los demás */
      }
    }
  }
  return NextResponse.json({ ok: true, notified });
}
