import { NextResponse } from "next/server";
import { firstDueDate, type Frequency } from "@platica/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FREQS = ["weekly", "biweekly", "monthly", "yearly"] as const;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Crea un pago fijo. */
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    name?: string;
    kind?: "expense" | "income" | "investment";
    amount?: number;
    accountId?: string | null;
    categoryId?: string | null;
    frequency?: Frequency;
    dayOfMonth?: number | null;
  };
  const name = b.name?.trim();
  const amount = Number(b.amount);
  if (!name) return NextResponse.json({ error: "falta el nombre" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });
  const frequency = (FREQS as readonly string[]).includes(b.frequency ?? "") ? b.frequency! : "monthly";
  const dayOfMonth = b.dayOfMonth ? Math.min(31, Math.max(1, Math.round(b.dayOfMonth))) : null;

  const { error } = await supabase.from("recurrences").insert({
    user_id: user.id,
    name,
    kind: b.kind ?? "expense",
    amount_minor: Math.round(amount),
    currency: "COP",
    account_id: b.accountId || null,
    category_id: b.categoryId || null,
    frequency,
    day_of_month: dayOfMonth,
    next_due: ymd(firstDueDate(frequency, dayOfMonth, new Date())),
    remind_days_before: 1,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Pausa/activa un pago fijo. */
export async function PATCH(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    id?: string;
    active?: boolean;
    name?: string;
    kind?: "expense" | "income" | "investment";
    amount?: number;
    accountId?: string | null;
    categoryId?: string | null;
    frequency?: Frequency;
    dayOfMonth?: number | null;
  };
  if (!b.id) return NextResponse.json({ error: "falta id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof b.active === "boolean") patch.active = b.active;
  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim();
  if (b.kind) patch.kind = b.kind;
  if (b.amount !== undefined) {
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "monto inválido" }, { status: 400 });
    patch.amount_minor = Math.round(amount);
  }
  if (b.accountId !== undefined) patch.account_id = b.accountId || null;
  if (b.categoryId !== undefined) patch.category_id = b.categoryId || null;
  if (b.frequency && (FREQS as readonly string[]).includes(b.frequency)) patch.frequency = b.frequency;
  if (b.dayOfMonth !== undefined) patch.day_of_month = b.dayOfMonth ? Math.min(31, Math.max(1, Math.round(b.dayOfMonth))) : null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });

  // Si cambió la frecuencia o el día, recalcula el próximo vencimiento.
  if (patch.frequency) {
    patch.next_due = ymd(firstDueDate(patch.frequency as Frequency, (patch.day_of_month as number | null) ?? null, new Date()));
  }

  const { error } = await supabase.from("recurrences").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Elimina un pago fijo. */
export async function DELETE(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const { error } = await supabase.from("recurrences").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
