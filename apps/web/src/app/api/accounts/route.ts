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
  };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "falta el nombre" }, { status: 400 });
  if (!body.type || !TYPES.includes(body.type))
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 });

  const { data, error } = await supabase
    .from("accounts")
    .insert({ user_id: user.id, name, type: body.type, currency: body.currency || "COP" })
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
    archived?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.archived === "boolean") patch.archived = body.archived;
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });

  // RLS garantiza que solo toque sus propias cuentas.
  const { error } = await supabase.from("accounts").update(patch).eq("id", body.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
