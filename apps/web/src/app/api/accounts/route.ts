import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPES = ["bank", "cash", "investment", "wallet", "credit"] as const;
type AccountType = (typeof TYPES)[number];

/** Crea una cuenta del usuario. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    type?: AccountType;
    currency?: string;
    openingBalance?: number;
  };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "falta el nombre" }, { status: 400 });
  if (!body.type || !TYPES.includes(body.type))
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  const opening = Number(body.openingBalance);

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name,
      type: body.type,
      currency: body.currency || "COP",
      opening_balance_minor: Number.isFinite(opening) ? Math.round(opening) : 0,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

/** Renombra o archiva una cuenta. */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    type?: AccountType;
    archived?: boolean;
    openingBalance?: number;
  };
  if (!body.id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body.type && TYPES.includes(body.type)) patch.type = body.type;
  if (typeof body.archived === "boolean") patch.archived = body.archived;
  if (body.openingBalance !== undefined && Number.isFinite(Number(body.openingBalance)))
    patch.opening_balance_minor = Math.round(Number(body.openingBalance));
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });

  // RLS garantiza que solo toque sus propias cuentas.
  const { error } = await supabase.from("accounts").update(patch).eq("id", body.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * Elimina una cuenta. Solo si no tiene movimientos (ni de origen ni como destino
 * de transferencias); si los tiene, hay que archivarla para no romper el historial.
 */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const [{ count: asSource }, { count: asTarget }] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("account_id", id),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("transfer_account_id", id),
  ]);
  if ((asSource ?? 0) > 0 || (asTarget ?? 0) > 0) {
    return NextResponse.json(
      { error: "Esta cuenta tiene movimientos. Archívala para conservar el historial." },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
