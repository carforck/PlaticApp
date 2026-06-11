import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** ¿El usuario ya vinculó su Telegram? (para el onboarding en vivo). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ linked: false }, { status: 401 });

  const { data } = await supabase.from("telegram_links").select("user_id").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ linked: !!data });
}
