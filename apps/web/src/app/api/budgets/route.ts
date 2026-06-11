import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Crea (o actualiza) el presupuesto de una categoría. */
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { categoryId?: string | null; amount?: number };
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });

  // Si ya existe para esa categoría, actualiza; si no, crea.
  const categoryId = b.categoryId || null;
  let query = supabase.from("budgets").select("id").eq("user_id", user.id);
  query = categoryId ? query.eq("category_id", categoryId) : query.is("category_id", null);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { error } = await supabase.from("budgets").update({ amount_minor: Math.round(amount) }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("budgets")
      .insert({ user_id: user.id, category_id: categoryId, amount_minor: Math.round(amount) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Elimina un presupuesto. */
export async function DELETE(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
