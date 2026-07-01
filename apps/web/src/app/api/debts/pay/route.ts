import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Registra un abono (pago parcial o total) de una deuda: mueve la cuenta elegida y reduce lo pendiente. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { debtId?: string; amount?: number; accountId?: string | null; note?: string };
  if (!b.debtId) return NextResponse.json({ error: "falta la deuda" }, { status: 400 });
  const amount = Math.round(Number(b.amount));
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });

  // La deuda debe ser del usuario.
  const { data: debt } = await supabase
    .from("debts")
    .select("id, amount_minor, direction, status")
    .eq("id", b.debtId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!debt) return NextResponse.json({ error: "deuda no encontrada" }, { status: 404 });

  // La cuenta (si llega) debe ser del usuario. Es la que recibe/paga el abono.
  let accountId = b.accountId || null;
  if (accountId) {
    const { data: own } = await supabase.from("accounts").select("id").eq("id", accountId).eq("user_id", user.id).maybeSingle();
    if (!own) accountId = null;
  }

  // Cuánto se ha abonado ya y cuánto falta.
  const { data: prev } = await supabase.from("debt_payments").select("amount_minor").eq("debt_id", debt.id);
  const paid = (prev ?? []).reduce((s, p) => s + p.amount_minor, 0);
  const outstanding = debt.amount_minor - paid;
  if (outstanding <= 0) return NextResponse.json({ error: "esta deuda ya está saldada" }, { status: 400 });

  // No dejamos abonar de más: se topa a lo que falta.
  const applied = Math.min(amount, outstanding);

  const { error } = await supabase.from("debt_payments").insert({
    user_id: user.id,
    debt_id: debt.id,
    amount_minor: applied,
    account_id: accountId,
    note: b.note?.trim() || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const newPaid = paid + applied;
  const nowSettled = newPaid >= debt.amount_minor;
  // Mantenemos 'status' sincronizado (lo usan filtros y exportaciones).
  if (nowSettled && debt.status !== "settled") await supabase.from("debts").update({ status: "settled" }).eq("id", debt.id).eq("user_id", user.id);
  if (!nowSettled && debt.status !== "open") await supabase.from("debts").update({ status: "open" }).eq("id", debt.id).eq("user_id", user.id);

  await supabase.from("debt_events").insert({
    user_id: user.id,
    debt_id: debt.id,
    event: nowSettled ? "settled" : "abono",
    detail: nowSettled ? `abono final · saldada` : `abono de ${applied}`,
  });

  return NextResponse.json({ ok: true, applied, outstanding: debt.amount_minor - newPaid, settled: nowSettled });
}

/** Deshace un abono (lo elimina). Recalcula si la deuda vuelve a quedar abierta. */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const paymentId = new URL(req.url).searchParams.get("id");
  if (!paymentId) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const { data: pay } = await supabase.from("debt_payments").select("id, debt_id").eq("id", paymentId).eq("user_id", user.id).maybeSingle();
  if (!pay) return NextResponse.json({ error: "abono no encontrado" }, { status: 404 });

  const { error } = await supabase.from("debt_payments").delete().eq("id", paymentId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalcular estado de la deuda tras quitar el abono.
  const { data: debt } = await supabase.from("debts").select("amount_minor, status").eq("id", pay.debt_id).eq("user_id", user.id).maybeSingle();
  if (debt) {
    const { data: rest } = await supabase.from("debt_payments").select("amount_minor").eq("debt_id", pay.debt_id);
    const paid = (rest ?? []).reduce((s, p) => s + p.amount_minor, 0);
    const settled = paid >= debt.amount_minor;
    if (settled !== (debt.status === "settled")) {
      await supabase.from("debts").update({ status: settled ? "settled" : "open" }).eq("id", pay.debt_id).eq("user_id", user.id);
    }
    await supabase.from("debt_events").insert({ user_id: user.id, debt_id: pay.debt_id, event: "edited", detail: "abono eliminado" });
  }

  return NextResponse.json({ ok: true });
}
