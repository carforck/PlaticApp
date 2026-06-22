import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/server/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TgAuth {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Login con Telegram (gratis). Verifica la firma del widget oficial, crea/encuentra
 * el usuario en Supabase, lo vincula al bot y devuelve un token para abrir sesión.
 * Doc: https://core.telegram.org/widgets/login#checking-authorization
 */
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "bot no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as TgAuth | null;
  if (!body?.id || !body.hash || !body.auth_date) {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  // 1) Verificar la firma (HMAC-SHA256 con clave = SHA256(bot_token)).
  const { hash, ...fields } = body;
  const dataCheck = Object.keys(fields)
    .filter((k) => (fields as Record<string, unknown>)[k] !== undefined && (fields as Record<string, unknown>)[k] !== null)
    .sort()
    .map((k) => `${k}=${(fields as Record<string, unknown>)[k]}`)
    .join("\n");
  const secret = crypto.createHash("sha256").update(token).digest();
  const hmac = crypto.createHmac("sha256", secret).update(dataCheck).digest("hex");
  // Comparación de tiempo constante (evita timing attacks); longitudes distintas → inválido.
  const a = Buffer.from(hmac, "hex");
  const b = Buffer.from(String(hash), "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  // 2) Evitar reuso: la autorización debe ser reciente (< 1 día).
  if (Math.floor(Date.now() / 1000) - Number(body.auth_date) > 86400) {
    return NextResponse.json({ error: "autorización expirada" }, { status: 401 });
  }

  const db = createAdminClient();
  const telegramId = body.id;
  const fullName = [body.first_name, body.last_name].filter(Boolean).join(" ").trim();

  // 3) ¿Ya hay un usuario vinculado a este Telegram?
  const { data: link } = await db.from("telegram_links").select("user_id").eq("telegram_chat_id", telegramId).maybeSingle();

  let userId: string;
  let email: string;

  if (link?.user_id) {
    userId = link.user_id;
    const { data: existing } = await db.auth.admin.getUserById(userId);
    email = existing.user?.email ?? `tg${telegramId}@telegram.platicapp.app`;
    if (body.username) {
      await db.from("telegram_links").update({ telegram_username: body.username }).eq("user_id", userId);
    }
  } else {
    // Usuario nuevo: correo sintético (Telegram no entrega correo). El trigger crea
    // perfil + cuentas + categorías por defecto.
    email = `tg${telegramId}@telegram.platicapp.app`;
    const { data: created, error: cErr } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || (body.username ?? "Usuario Telegram"),
        avatar_url: body.photo_url ?? null,
        telegram_id: telegramId,
        provider: "telegram",
      },
    });
    if (cErr || !created.user) {
      return NextResponse.json({ error: cErr?.message ?? "no se pudo crear el usuario" }, { status: 500 });
    }
    userId = created.user.id;
    // Vincular el bot automáticamente.
    await db.from("telegram_links").upsert({
      user_id: userId,
      telegram_chat_id: telegramId,
      telegram_username: body.username ?? null,
    });
  }

  // 4) Generar un token de sesión (magiclink) que el cliente canjea sin correo.
  const { data: linkData, error: lErr } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (lErr || !linkData.properties?.hashed_token) {
    return NextResponse.json({ error: lErr?.message ?? "no se pudo iniciar sesión" }, { status: 500 });
  }

  return NextResponse.json({ token_hash: linkData.properties.hashed_token });
}
