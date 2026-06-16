import { NextResponse } from "next/server";
import { createAdminClient } from "@/server/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * Estadísticas públicas para la landing (social proof). Solo conteos agregados,
 * nunca datos de usuarios. Se consulta con polling para que el contador «suba en vivo».
 */
export async function GET() {
  const db = createAdminClient();
  const [users, movimientos, cuentas] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("transactions").select("*", { count: "exact", head: true }),
    db.from("accounts").select("*", { count: "exact", head: true }),
  ]);
  return NextResponse.json(
    {
      users: users.count ?? 0,
      movimientos: movimientos.count ?? 0,
      cuentas: cuentas.count ?? 0,
    },
    { headers: { "cache-control": "public, max-age=10, s-maxage=10" } },
  );
}
