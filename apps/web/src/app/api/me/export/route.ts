import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Exporta los datos del usuario: JSON completo, o CSV de movimientos con ?format=csv (para Excel). */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  const db = createAdminClient();
  const uid = user.id;
  const format = new URL(req.url).searchParams.get("format");

  // CSV de movimientos (lo más útil para abrir en Excel / Sheets).
  if (format === "csv") {
    const { data: txs } = await db.from("transactions").select("*").eq("user_id", uid).order("occurred_at", { ascending: false });
    const { data: accts } = await db.from("accounts").select("id, name").eq("user_id", uid);
    const { data: cats } = await db.from("categories").select("id, name").eq("user_id", uid);
    const accName = new Map((accts ?? []).map((a) => [a.id, a.name]));
    const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
    const KIND: Record<string, string> = { expense: "Gasto", income: "Ingreso", investment: "Inversión", transfer: "Transferencia" };
    const header = ["Fecha", "Tipo", "Monto", "Moneda", "Cuenta", "Cuenta destino", "Categoría", "Descripción", "Origen"];
    const rows = (txs ?? []).map((t) =>
      [
        new Date(t.occurred_at).toISOString().slice(0, 10),
        KIND[t.kind] ?? t.kind,
        t.amount_minor,
        t.currency,
        accName.get(t.account_id) ?? "",
        t.transfer_account_id ? accName.get(t.transfer_account_id) ?? "" : "",
        t.category_id ? catName.get(t.category_id) ?? "" : "",
        t.description ?? "",
        t.source ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
    // BOM para que Excel respete los acentos (UTF-8).
    const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="platicapp-movimientos-${uid.slice(0, 8)}.csv"`,
      },
    });
  }

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
