import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Actualiza el perfil (nombre, moneda, zona horaria). */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as {
    displayName?: string;
    defaultCurrency?: string;
    timezone?: string;
  };
  const patch: Record<string, unknown> = {};
  if (typeof b.displayName === "string") patch.display_name = b.displayName.trim() || null;
  if (typeof b.defaultCurrency === "string" && b.defaultCurrency.trim()) patch.default_currency = b.defaultCurrency.trim().toUpperCase();
  if (typeof b.timezone === "string" && b.timezone.trim()) patch.timezone = b.timezone.trim();
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
