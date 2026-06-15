import { NextResponse, after, type NextRequest } from "next/server";
import { processUpdate, type TgUpdate } from "@/server/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // margen para audio + IA + reintentos

/**
 * Webhook de Telegram. Validamos el header secreto y respondemos 200 de
 * inmediato (Telegram solo necesita el ACK); el procesamiento —que puede tardar
 * por audio/IA— corre en segundo plano con after(), evitando timeouts (504).
 * La idempotencia (processed_updates) previene duplicados ante reintentos.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("forbidden", { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  // Procesa después de responder, sin bloquear el ACK a Telegram.
  after(async () => {
    try {
      await processUpdate(update);
    } catch (err) {
      console.error("[telegram] processUpdate falló:", err);
    }
  });

  return NextResponse.json({ ok: true });
}
