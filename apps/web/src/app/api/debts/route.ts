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
    accountId?: string | null;
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
    account_id: b.accountId || null,
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

  const b = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: "open" | "settled";
    counterparty?: string;
    direction?: (typeof DIRECTIONS)[number];
    amount?: number;
    description?: string;
    accountId?: string | null;
  };
  if (!b.id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (b.status === "open" || b.status === "settled") patch.status = b.status;
  if (typeof b.counterparty === "string" && b.counterparty.trim()) patch.counterparty = b.counterparty.trim();
  if (b.direction && DIRECTIONS.includes(b.direction)) patch.direction = b.direction;
  if (b.accountId !== undefined) patch.account_id = b.accountId || null;
  if (b.amount !== undefined) {
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });
    patch.amount_minor = Math.round(amount);
  }
  if (b.description !== undefined) patch.description = b.description?.trim() || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });

  const { error } = await supabase.from("debts").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Elimina una deuda. */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
