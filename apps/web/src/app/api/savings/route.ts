import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Apartar al ahorro. Si llega `fromAccountId`, primero transfiere el dinero a la
 * cuenta de ahorro (mover plata) y luego lo marca como apartado. Si no, solo
 * aparta de la misma cuenta. El apartado nunca supera el saldo de la cuenta.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { toAccountId?: string; amount?: number; fromAccountId?: string | null };
  const amount = Math.round(Number(b.amount));
  if (!b.toAccountId) return NextResponse.json({ error: "falta la cuenta de ahorro" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });

  const { data: acc } = await supabase.from("accounts").select("id, currency, reserved_minor").eq("id", b.toAccountId).maybeSingle();
  if (!acc) return NextResponse.json({ error: "cuenta no encontrada" }, { status: 404 });

  // Mover plata desde otra cuenta (transferencia) antes de apartar.
  if (b.fromAccountId && b.fromAccountId !== b.toAccountId) {
    const { data: from } = await supabase.from("accounts").select("id, currency").eq("id", b.fromAccountId).maybeSingle();
    if (!from) return NextResponse.json({ error: "cuenta origen no encontrada" }, { status: 404 });
    const { error: tErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      kind: "transfer",
      amount_minor: amount,
      currency: from.currency,
      account_id: from.id,
      transfer_account_id: acc.id,
      description: "Movido al ahorro",
      occurred_at: new Date().toISOString(),
      source: "web",
    });
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  // El apartado no puede superar el saldo actual de la cuenta.
  const { data: bal } = await supabase.from("account_balances").select("balance_minor").eq("account_id", acc.id).maybeSingle();
  const balance = bal?.balance_minor ?? 0;
  const newReserved = Math.min((acc.reserved_minor ?? 0) + amount, balance);

  const { error } = await supabase.from("accounts").update({ reserved_minor: newReserved }).eq("id", acc.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, reserved: newReserved });
}

/** Ajusta el apartado (liberar/fijar) o la meta de ahorro de una cuenta. */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { accountId?: string; reserved?: number; goal?: number | null };
  if (!b.accountId) return NextResponse.json({ error: "falta la cuenta" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (b.reserved !== undefined) {
    const r = Math.round(Number(b.reserved));
    if (!Number.isFinite(r) || r < 0) return NextResponse.json({ error: "apartado inválido" }, { status: 400 });
    patch.reserved_minor = r;
  }
  if (b.goal !== undefined) {
    if (b.goal === null) patch.savings_goal_minor = null;
    else {
      const g = Math.round(Number(b.goal));
      if (!Number.isFinite(g) || g <= 0) return NextResponse.json({ error: "meta inválida" }, { status: 400 });
      patch.savings_goal_minor = g;
    }
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });

  const { error } = await supabase.from("accounts").update(patch).eq("id", b.accountId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
