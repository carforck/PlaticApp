import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Marca al usuario como activo ahora (para el estado "en línea" del admin). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
