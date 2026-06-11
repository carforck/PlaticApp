import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DIRECTIONS = ["i_owe", "they_owe"] as const;

/** Crea una deuda manualmente desde la web. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as {
    counterparty?: string;
    direction?: (typeof DIRECTIONS)[number];
    amount?: number;
    description?: string;
  };
  const counterparty = b.counterparty?.trim();
  const amount = Number(b.amount);
  if (!counterparty) return NextResponse.json({ error: "falta la persona" }, { status: 400 });
  if (!b.direction || !DIRECTIONS.includes(b.direction))
    return NextResponse.json({ error: "dirección inválida" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "monto inválido" }, { status: 400 });

  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    counterparty,
    direction: b.direction,
    amount_minor: Math.round(amount),
    currency: "COP",
    description: b.description?.trim() || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Marca una deuda como saldada (o reabierta). */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { id?: string; status?: "open" | "settled" };
  if (!b.id || (b.status !== "open" && b.status !== "settled"))
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

  const { error } = await supabase
    .from("debts")
    .update({ status: b.status })
    .eq("id", b.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
