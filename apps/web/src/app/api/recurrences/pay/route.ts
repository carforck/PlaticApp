import { NextResponse } from "next/server";
import { nextOccurrence, type Frequency } from "@platica/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Registra el pago de un ciclo de un pago fijo (o lo salta).
 * Al pagar: crea la transacción (mueve la cuenta, aparece en Movimientos), guarda el historial y
 * avanza al próximo vencimiento. Admite abono parcial (amount menor al total) sin avanzar la fecha.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { id?: string; accountId?: string | null; amount?: number; skip?: boolean };
  if (!b.id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const { data: rec } = await supabase
    .from("recurrences")
    .select("id, name, kind, amount_minor, currency, category_id, account_id, frequency, next_due")
    .eq("id", b.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!rec) return NextResponse.json({ error: "pago fijo no encontrado" }, { status: 404 });

  const next = ymd(nextOccurrence(new Date(`${rec.next_due}T00:00:00`), rec.frequency as Frequency));

  // Saltar este ciclo: no mueve dinero, solo avanza la fecha y lo deja en el historial.
  if (b.skip) {
    await supabase.from("recurrences").update({ next_due: next }).eq("id", rec.id).eq("user_id", user.id);
    await supabase.from("recurrence_payments").insert({ user_id: user.id, recurrence_id: rec.id, amount_minor: rec.amount_minor, account_id: null, status: "skipped", paid_for: rec.next_due });
    return NextResponse.json({ ok: true, skipped: true, next });
  }

  // Monto a pagar: total del pago fijo, o un abono parcial si viene 'amount'.
  const amount = b.amount !== undefined ? Math.round(Number(b.amount)) : rec.amount_minor;
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });
  const partial = amount < rec.amount_minor;

  // La cuenta (si llega) debe ser del usuario.
  let accountId = b.accountId || rec.account_id || null;
  if (accountId) {
    const { data: own } = await supabase.from("accounts").select("id").eq("id", accountId).eq("user_id", user.id).maybeSingle();
    if (!own) accountId = null;
  }
  if (!accountId) return NextResponse.json({ error: "elige una cuenta para registrar el pago" }, { status: 400 });

  // La transacción: mueve la cuenta y aparece en Movimientos (igual que el bot al pagar el recordatorio).
  const { error: txErr } = await supabase.from("transactions").insert({
    user_id: user.id,
    kind: rec.kind,
    amount_minor: amount,
    currency: rec.currency,
    account_id: accountId,
    category_id: rec.category_id,
    description: rec.name,
    occurred_at: new Date().toISOString(),
    source: "web",
  });
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  await supabase.from("recurrence_payments").insert({
    user_id: user.id,
    recurrence_id: rec.id,
    amount_minor: amount,
    account_id: accountId,
    status: "paid",
    paid_for: rec.next_due,
  });

  // Un abono parcial NO avanza la fecha (aún queda por pagar este ciclo); un pago completo sí.
  if (!partial) await supabase.from("recurrences").update({ next_due: next }).eq("id", rec.id).eq("user_id", user.id);

  return NextResponse.json({ ok: true, partial, next: partial ? rec.next_due : next });
}
