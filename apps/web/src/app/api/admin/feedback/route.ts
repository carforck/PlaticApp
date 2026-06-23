import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && user.email === ADMIN_EMAIL ? user : null;
}

/** Lista todos los mensajes (solo admin). */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  const db = createAdminClient();
  const { data } = await db.from("feedback").select("*").order("created_at", { ascending: false }).limit(300);
  return NextResponse.json({ items: data ?? [] });
}

/** Marca un mensaje como atendido o pendiente (solo admin). */
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; status?: "open" | "done" };
  if (!b.id || (b.status !== "open" && b.status !== "done")) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const db = createAdminClient();
  const { error } = await db.from("feedback").update({ status: b.status }).eq("id", b.id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
