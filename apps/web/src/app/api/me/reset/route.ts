import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import { logEvent } from "@/server/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Empezar de nuevo": borra TODOS los datos financieros del usuario pero
 * conserva la cuenta (login, perfil y vínculo de Telegram). Irreversible.
 * Requiere confirmación textual exacta para evitar accidentes.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if ((body.confirm ?? "").trim().toUpperCase() !== "EMPEZAR DE NUEVO") {
    return NextResponse.json({ error: "Confirmación incorrecta" }, { status: 400 });
  }

  const db = createAdminClient();
  const uid = user.id;

  // 1) Borrar archivos de recibos del Storage (carpeta receipts/{uid}).
  const { data: files } = await db.storage.from("receipts").list(uid, { limit: 1000 });
  if (files?.length) {
    await db.storage.from("receipts").remove(files.map((f) => `${uid}/${f.name}`));
  }

  // 2) Borrar filas en orden seguro (transactions antes que accounts por el FK restrict).
  const tables = ["transactions", "savings", "budgets", "recurrences", "receipts", "debts", "accounts", "categories"];
  for (const t of tables) {
    const { error } = await db.from(t).delete().eq("user_id", uid);
    if (error) {
      console.error(`reset delete ${t}:`, error.message);
      return NextResponse.json({ error: "No se pudieron borrar todos los datos. Intenta de nuevo." }, { status: 500 });
    }
  }

  void logEvent({ source: "app", event: "datos_borrados", detail: "el usuario reinició su cuenta", actor: user.email ?? uid, level: "warn" });
  return NextResponse.json({ ok: true });
}
