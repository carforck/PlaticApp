import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KINDS = ["expense", "income", "investment", "transfer"] as const;
type Kind = (typeof KINDS)[number];

interface Body {
  kind: Kind;
  amount: number; // unidad mayor (pesos)
  accountId: string;
  transferAccountId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  occurredAt?: string | null;
}

/** Para transferencias/inversiones: resuelve la cuenta destino (crea "Inversiones" si hace falta). */
async function resolveTransferAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  kind: Kind,
  accountId: string,
  provided?: string | null,
): Promise<string | null> {
  let dest = provided || null;
  // Si llega una cuenta destino, verificamos explícitamente que sea del usuario (defensa en profundidad).
  if (dest) {
    const { data: own } = await supabase.from("accounts").select("id").eq("id", dest).eq("user_id", userId).maybeSingle();
    if (!own) dest = null;
  }
  if (kind === "investment" && !dest) {
    const { data: inv } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "investment")
      .eq("archived", false)
      .limit(1)
      .maybeSingle();
    if (inv) dest = inv.id;
    else {
      const { data: created } = await supabase
        .from("accounts")
        .insert({ user_id: userId, name: "Inversiones", type: "investment" })
        .select("id")
        .single();
      dest = created?.id ?? null;
    }
  }
  return dest && dest !== accountId ? dest : null;
}

/** Registra un movimiento manual desde la web. Respeta RLS (sesión del usuario). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }

  if (!KINDS.includes(body.kind)) return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  if (!body.accountId) return NextResponse.json({ error: "falta la cuenta" }, { status: 400 });
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "monto inválido" }, { status: 400 });

  // La cuenta debe ser del usuario (RLS lo garantiza) y nos da la moneda.
  const { data: account } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("id", body.accountId)
    .maybeSingle();
  if (!account) return NextResponse.json({ error: "cuenta no encontrada" }, { status: 404 });

  if (body.kind === "transfer" && !body.transferAccountId)
    return NextResponse.json({ error: "falta la cuenta destino" }, { status: 400 });
  const transferAccountId = await resolveTransferAccount(supabase, user.id, body.kind, account.id, body.transferAccountId);

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      kind: body.kind,
      amount_minor: Math.round(amount), // COP no usa decimales
      currency: account.currency,
      account_id: account.id,
      transfer_account_id: transferAccountId,
      category_id: body.categoryId || null,
      description: body.description?.trim() || null,
      occurred_at: body.occurredAt || new Date().toISOString(),
      source: "web",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

/** Edita un movimiento existente. */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Partial<Body> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (b.kind && KINDS.includes(b.kind)) patch.kind = b.kind;
  if (b.amount !== undefined) {
    const amt = Number(b.amount);
    if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });
    patch.amount_minor = Math.round(amt);
  }
  if (b.categoryId !== undefined) patch.category_id = b.categoryId || null;
  if (b.transferAccountId !== undefined) patch.transfer_account_id = b.transferAccountId || null;
  if (b.description !== undefined) patch.description = b.description?.trim() || null;
  if (b.occurredAt) patch.occurred_at = b.occurredAt;
  if (b.accountId) {
    const { data: acc } = await supabase.from("accounts").select("id, currency").eq("id", b.accountId).maybeSingle();
    if (!acc) return NextResponse.json({ error: "cuenta no encontrada" }, { status: 404 });
    patch.account_id = acc.id;
    patch.currency = acc.currency;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });

  const { error } = await supabase.from("transactions").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Elimina un movimiento. */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
