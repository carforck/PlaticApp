import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KINDS = ["expense", "income", "investment"] as const;
type Kind = (typeof KINDS)[number];

interface Body {
  kind: Kind;
  amount: number; // unidad mayor (pesos)
  accountId: string;
  categoryId?: string | null;
  description?: string | null;
  occurredAt?: string | null;
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

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      kind: body.kind,
      amount_minor: Math.round(amount), // COP no usa decimales
      currency: account.currency,
      account_id: account.id,
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
