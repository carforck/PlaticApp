import { NextResponse } from "next/server";
import { createAdminClient } from "@/server/supabase-admin";

export const dynamic = "force-dynamic";

// Caché en memoria: aunque haya muchos sondeos (polling), solo golpeamos la BD cada ~30s.
type Stats = { users: number; movimientos: number; cuentas: number };
let cache: { at: number; data: Stats } | null = null;
const TTL_MS = 30_000;

/**
 * Estadísticas públicas para la landing (social proof). Solo conteos agregados,
 * nunca datos de usuarios. Cacheadas para que el polling no sobrecargue la BD.
 */
export async function GET() {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const db = createAdminClient();
    const [users, movimientos, cuentas] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("transactions").select("*", { count: "exact", head: true }),
      db.from("accounts").select("*", { count: "exact", head: true }),
    ]);
    cache = { at: Date.now(), data: { users: users.count ?? 0, movimientos: movimientos.count ?? 0, cuentas: cuentas.count ?? 0 } };
  }
  return NextResponse.json(cache.data, {
    headers: { "cache-control": "public, max-age=30, s-maxage=30" },
  });
}
