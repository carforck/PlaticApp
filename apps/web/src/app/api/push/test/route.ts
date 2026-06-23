import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Envía una notificación de prueba a los dispositivos del propio usuario. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  await sendPushToUser(user.id, {
    title: "🔔 ¡Notificaciones activas!",
    body: "Así te llegarán los avisos de PlaticApp, aunque la app esté cerrada.",
    url: "/dashboard",
  });
  return NextResponse.json({ ok: true });
}
