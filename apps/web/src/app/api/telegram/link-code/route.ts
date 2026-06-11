import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BOT_USERNAME = "PlaticApp_bot";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin caracteres confusos

function genCode(len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Genera un código de un solo uso para vincular el Telegram del usuario. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const code = genCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("link_codes")
    .insert({ code, user_id: user.id, expires_at: expiresAt });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    code,
    deepLink: `https://t.me/${BOT_USERNAME}?start=${code}`,
    expiresInMinutes: 15,
  });
}
