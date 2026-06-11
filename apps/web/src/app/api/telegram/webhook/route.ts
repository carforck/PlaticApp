import { NextResponse, type NextRequest } from "next/server";
import { processUpdate, type TgUpdate } from "@/server/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Telegram. Telegram manda un header secreto que validamos.
 * Respondemos 200 siempre (los errores se notifican en el chat) para que
 * Telegram no reintente en bucle; la idempotencia evita duplicados.
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

  try {
    await processUpdate(update);
  } catch (err) {
    console.error("[telegram] processUpdate falló:", err);
  }

  return NextResponse.json({ ok: true });
}
