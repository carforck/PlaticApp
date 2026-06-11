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

/** Crea una categoría. */
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    name?: string;
    appliesTo?: "expense" | "income" | null;
    emoji?: string;
    color?: string;
  };
  const name = b.name?.trim();
  if (!name) return NextResponse.json({ error: "falta el nombre" }, { status: 400 });
  const appliesTo = b.appliesTo === "expense" || b.appliesTo === "income" ? b.appliesTo : null;
  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, applies_to: appliesTo, emoji: b.emoji || null, color: b.color || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Edita una categoría (nombre, emoji, color, aplica a). */
export async function PATCH(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    emoji?: string;
    color?: string;
    appliesTo?: "expense" | "income" | null;
  };
  if (!b.id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim();
  if (typeof b.emoji === "string") patch.emoji = b.emoji || null;
  if (typeof b.color === "string") patch.color = b.color || null;
  if (b.appliesTo === "expense" || b.appliesTo === "income" || b.appliesTo === null) patch.applies_to = b.appliesTo;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  const { error } = await supabase.from("categories").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Elimina una categoría (las transacciones quedan sin categoría por la FK). */
export async function DELETE(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
