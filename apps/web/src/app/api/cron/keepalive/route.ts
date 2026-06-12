import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario (Vercel): hace una consulta mínima a la base para mantener el
 * proyecto Supabase "activo" y evitar que lo pausen por inactividad (7 días en
 * el plan gratis). Protegido con CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("forbidden", { status: 401 });
  }

  const db = createAdminClient();
  // Consulta liviana (solo cuenta, sin traer filas) que cuenta como actividad.
  const { count, error } = await db.from("profiles").select("id", { count: "exact", head: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, at: new Date().toISOString(), users: count ?? 0 });
}
