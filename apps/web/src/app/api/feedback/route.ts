import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** El usuario envía una duda, pregunta o sugerencia desde la app. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { message?: string };
  const message = b.message?.trim();
  if (!message) return NextResponse.json({ error: "Escribe tu mensaje" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "Mensaje muy largo" }, { status: 400 });

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    email: user.email ?? null,
    source: "app",
    message,
  });
  if (error) {
    console.error("feedback insert:", error.message);
    return NextResponse.json({ error: "No se pudo enviar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
