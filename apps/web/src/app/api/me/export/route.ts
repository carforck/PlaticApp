import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exporta TODOS los datos del usuario en un JSON descargable (portabilidad / Habeas Data). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  const db = createAdminClient();
  const uid = user.id;
  const [accounts, categories, transactions, debts, recurrences, budgets, receipts] = await Promise.all([
    db.from("accounts").select("*").eq("user_id", uid),
    db.from("categories").select("*").eq("user_id", uid),
    db.from("transactions").select("*").eq("user_id", uid).order("occurred_at", { ascending: false }),
    db.from("debts").select("*").eq("user_id", uid),
    db.from("recurrences").select("*").eq("user_id", uid),
    db.from("budgets").select("*").eq("user_id", uid),
    db.from("receipts").select("*").eq("user_id", uid),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    app: "PlaticApp",
    user: { id: uid, email: user.email },
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    transactions: transactions.data ?? [],
    debts: debts.data ?? [],
    recurrences: recurrences.data ?? [],
    budgets: budgets.data ?? [],
    receipts: receipts.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="platicapp-export-${uid.slice(0, 8)}.json"`,
    },
  });
}
