import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SB = Awaited<ReturnType<typeof createClient>>;

/** Cuánto se puede apartar más en una cuenta (saldo − ya apartado en otros sobres). */
async function roomToReserve(supabase: SB, userId: string, accountId: string, excludeSavingId?: string): Promise<number> {
  const { data: bal } = await supabase.from("account_balances").select("balance_minor").eq("account_id", accountId).maybeSingle();
  const balance = bal?.balance_minor ?? 0;
  let q = supabase.from("savings").select("reserved_minor").eq("user_id", userId).eq("account_id", accountId);
  if (excludeSavingId) q = q.neq("id", excludeSavingId);
  const { data: others } = await q;
  const otherReserved = (others ?? []).reduce((s, r) => s + (r.reserved_minor ?? 0), 0);
  return Math.max(0, balance - otherReserved);
}

/** Crea un ahorro nuevo (con título) o abona a uno existente. Mueve plata si llega fromAccountId. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as {
    savingId?: string;
    accountId?: string;
    name?: string;
    amount?: number;
    goal?: number | null;
    fromAccountId?: string | null;
  };
  const amount = Math.round(Number(b.amount));
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });

  // Determinar la cuenta destino del ahorro.
  let accountId = b.accountId;
  let existing: { id: string; reserved_minor: number; account_id: string } | null = null;
  if (b.savingId) {
    const { data } = await supabase.from("savings").select("id, reserved_minor, account_id").eq("id", b.savingId).maybeSingle();
    if (!data) return NextResponse.json({ error: "ahorro no encontrado" }, { status: 404 });
    existing = data;
    accountId = data.account_id;
  }
  if (!accountId) return NextResponse.json({ error: "falta la cuenta" }, { status: 400 });
  if (!existing && !b.name?.trim()) return NextResponse.json({ error: "falta el título del ahorro" }, { status: 400 });

  // Mover plata desde otra cuenta (transferencia) antes de apartar.
  if (b.fromAccountId && b.fromAccountId !== accountId) {
    const { data: from } = await supabase.from("accounts").select("id, currency").eq("id", b.fromAccountId).maybeSingle();
    if (!from) return NextResponse.json({ error: "cuenta origen no encontrada" }, { status: 404 });
    const { error: tErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      kind: "transfer",
      amount_minor: amount,
      currency: from.currency,
      account_id: from.id,
      transfer_account_id: accountId,
      description: "Movido al ahorro",
      occurred_at: new Date().toISOString(),
      source: "web",
    });
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  const room = await roomToReserve(supabase, user.id, accountId, existing?.id);
  const add = Math.min(amount, room);

  let savingId = existing?.id;
  if (existing) {
    const { error } = await supabase.from("savings").update({ reserved_minor: existing.reserved_minor + add }).eq("id", existing.id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const goal = b.goal != null && Number(b.goal) > 0 ? Math.round(Number(b.goal)) : null;
    const { data: created, error } = await supabase.from("savings").insert({ user_id: user.id, account_id: accountId, name: b.name!.trim(), reserved_minor: add, goal_minor: goal }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    savingId = created?.id;
  }
  // Registrar el abono en el historial del ahorro.
  if (savingId && add > 0) {
    await supabase.from("savings_moves").insert({ user_id: user.id, saving_id: savingId, delta_minor: add, reason: "deposit" });
  }
  // capped=true cuando se apartó menos de lo pedido (no cabía en el saldo de la cuenta).
  return NextResponse.json({ ok: true, reserved: add, requested: amount, capped: add < amount });
}

/** Edita un ahorro: renombrar, ajustar lo apartado o la meta. */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { savingId?: string; name?: string; reserved?: number; goal?: number | null };
  if (!b.savingId) return NextResponse.json({ error: "falta el ahorro" }, { status: 400 });

  const { data: pot } = await supabase.from("savings").select("id, account_id, reserved_minor").eq("id", b.savingId).eq("user_id", user.id).maybeSingle();
  if (!pot) return NextResponse.json({ error: "ahorro no encontrado" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  let capped = false;
  let newReserved: number | null = null;
  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim();
  if (b.reserved !== undefined) {
    const r = Math.round(Number(b.reserved));
    if (!Number.isFinite(r) || r < 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });
    const room = await roomToReserve(supabase, user.id, pot.account_id, pot.id);
    newReserved = Math.min(r, room);
    capped = newReserved < r;
    patch.reserved_minor = newReserved;
  }
  if (b.goal !== undefined) {
    if (b.goal === null) patch.goal_minor = null;
    else {
      const g = Math.round(Number(b.goal));
      if (!Number.isFinite(g) || g <= 0) return NextResponse.json({ error: "meta inválida" }, { status: 400 });
      patch.goal_minor = g;
    }
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });

  const { error } = await supabase.from("savings").update(patch).eq("id", b.savingId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Registrar el ajuste (diferencia) en el historial.
  if (newReserved !== null) {
    const delta = newReserved - (pot.reserved_minor as number);
    if (delta !== 0) {
      await supabase.from("savings_moves").insert({ user_id: user.id, saving_id: b.savingId, delta_minor: delta, reason: delta > 0 ? "deposit" : "withdraw" });
    }
  }
  return NextResponse.json({ ok: true, reserved: newReserved ?? undefined, capped });
}

/** Elimina un ahorro (libera lo apartado). */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const { error } = await supabase.from("savings").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
