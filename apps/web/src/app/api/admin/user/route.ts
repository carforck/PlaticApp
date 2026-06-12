import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resumen de un usuario (solo admin): cuentas, deudas y últimos movimientos. */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "no autorizado" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const db = createAdminClient();
  const [accounts, cats, txs, debts] = await Promise.all([
    db.from("account_balances").select("name, type, balance_minor").eq("user_id", id),
    db.from("categories").select("id, name, emoji").eq("user_id", id),
    db.from("transactions").select("kind, amount_minor, description, category_id, occurred_at").eq("user_id", id).order("occurred_at", { ascending: false }).limit(12),
    db.from("debts").select("counterparty, direction, amount_minor, status").eq("user_id", id),
  ]);

  const catName = new Map((cats.data ?? []).map((c) => [c.id as string, { name: c.name as string, emoji: c.emoji as string | null }]));
  const recent = (txs.data ?? []).map((t) => ({
    kind: t.kind,
    amount: t.amount_minor,
    description: t.description,
    category: catName.get(t.category_id ?? "")?.name ?? null,
    emoji: catName.get(t.category_id ?? "")?.emoji ?? null,
    when: t.occurred_at,
  }));
  const open = (debts.data ?? []).filter((d) => d.status === "open");

  return NextResponse.json({
    netWorth: (accounts.data ?? []).reduce((s, a) => s + a.balance_minor, 0),
    accounts: accounts.data ?? [],
    recent,
    debtOwe: open.filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount_minor, 0),
    debtOwed: open.filter((d) => d.direction === "they_owe").reduce((s, d) => s + d.amount_minor, 0),
  });
}
