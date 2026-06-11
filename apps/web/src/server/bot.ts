import { Money, RegisterTransaction } from "@platica/core";
import type { InterpretContext, TransactionDraft, TransactionKind } from "@platica/core";
import { createAdminClient } from "./supabase-admin";
import { accountRepo, categoryRepo, idempotencyStore, transactionRepo } from "./repos";
import { telegram } from "./telegram";
import { geminiText, geminiImage } from "./ai/gemini";
import { groqAudio } from "./ai/groq";

// ── Tipos mínimos del Update de Telegram ───────────────────────
interface TgUser { id: number; username?: string; first_name?: string }
interface TgVoice { file_id: string }
interface TgPhoto { file_id: string; file_size?: number }
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number };
  text?: string;
  caption?: string;
  voice?: TgVoice;
  audio?: TgVoice;
  photo?: TgPhoto[];
}
interface TgCallback {
  id: string;
  from: TgUser;
  message?: { message_id: number; chat: { id: number } };
  data?: string;
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallback;
}

const KIND_LABEL: Record<TransactionKind, string> = {
  expense: "💸 Gasto",
  income: "💰 Ingreso",
  investment: "📈 Inversión",
  transfer: "🔄 Transferencia",
};

const fmt = (m: Money) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: m.currency, maximumFractionDigits: 0 }).format(
    m.minorUnits,
  );

/** Punto de entrada: procesa un update ya validado. Idempotente. */
export async function processUpdate(update: TgUpdate): Promise<void> {
  const db = createAdminClient();

  // 1) Idempotencia: Telegram reintenta; procesamos cada update una sola vez.
  const isNew = await idempotencyStore(db).claim(String(update.update_id));
  if (!isNew) return;

  if (update.callback_query) return handleCallback(update.callback_query);
  if (update.message) return handleMessage(update.message);
}

// ── Vinculación de cuenta ──────────────────────────────────────
async function resolveUserId(chatId: number): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function handleLinkCode(chatId: number, code: string, username?: string): Promise<void> {
  const db = createAdminClient();
  const { data: lc } = await db
    .from("link_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!lc) {
    await telegram.sendMessage(chatId, "❌ Código inválido o vencido. Genera uno nuevo desde la app web.");
    return;
  }

  await db.from("telegram_links").upsert({
    user_id: lc.user_id,
    telegram_chat_id: chatId,
    telegram_username: username ?? null,
  });
  await db.from("link_codes").update({ used_at: new Date().toISOString() }).eq("code", lc.code);

  await telegram.sendMessage(
    chatId,
    "✅ <b>¡Cuenta vinculada!</b>\nYa puedes registrar movimientos. Escríbeme algo como:\n<i>«gasté 50 mil en el almuerzo»</i> 🍽️",
  );
}

// ── Mensajes ───────────────────────────────────────────────────
async function handleMessage(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() ?? "";

  // Comandos de arranque/vinculación: /start CODE  o  /vincular CODE
  const startMatch = text.match(/^\/(?:start|vincular)(?:@\w+)?\s+(\S+)/i);
  if (startMatch) return handleLinkCode(chatId, startMatch[1]!, msg.from?.username);

  if (/^\/start\b/i.test(text)) {
    await telegram.sendMessage(
      chatId,
      "👋 <b>Hola, soy Platica.</b>\nPara empezar, vincula tu cuenta: abre la app web, genera tu código y mándamelo aquí, o entra desde el botón «Vincular Telegram».",
    );
    return;
  }

  const userId = await resolveUserId(chatId);
  if (!userId) {
    // Quizás escribió el código de vinculación pelado (sin /vincular).
    const maybeCode = text.replace(/\s+/g, "");
    if (/^[A-Za-z0-9]{6}$/.test(maybeCode)) {
      return handleLinkCode(chatId, maybeCode, msg.from?.username);
    }
    await telegram.sendMessage(
      chatId,
      "🔗 Aún no vinculas tu cuenta. Abre la app web, genera tu código y envíamelo aquí (o usa el botón «Vincular Telegram»).",
    );
    return;
  }

  try {
    const ctx = await buildContext(userId);
    let draft: TransactionDraft;

    if (msg.voice || msg.audio) {
      const fileId = (msg.voice ?? msg.audio)!.file_id;
      const { bytes, mimeHint } = await telegram.downloadFile(fileId);
      const transcript = await groqAudio.transcribe(bytes, mimeHint);
      await telegram.sendMessage(chatId, `🎙️ Te entendí: <i>«${transcript}»</i>`);
      draft = { ...(await geminiText.interpret(transcript, ctx)), source: "telegram_audio" };
    } else if (msg.photo?.length) {
      const largest = msg.photo[msg.photo.length - 1]!;
      const { bytes, mimeHint } = await telegram.downloadFile(largest.file_id);
      draft = await geminiImage.interpret(bytes, mimeHint, ctx);
      if (msg.caption) draft.description ??= msg.caption;
    } else if (text) {
      draft = await geminiText.interpret(text, ctx);
    } else {
      return;
    }

    await proposeDraft(chatId, userId, draft);
  } catch (err) {
    await telegram.sendMessage(chatId, `⚠️ Algo falló procesando eso: ${(err as Error).message}`);
  }
}

async function buildContext(userId: string): Promise<InterpretContext> {
  const db = createAdminClient();
  const [{ data: profile }, cats, accs] = await Promise.all([
    db.from("profiles").select("default_currency, timezone").eq("id", userId).maybeSingle(),
    categoryRepo(db).listByUser(userId),
    accountRepo(db).listByUser(userId),
  ]);
  return {
    defaultCurrency: profile?.default_currency ?? "COP",
    timezone: profile?.timezone ?? "America/Bogota",
    now: new Date(),
    knownCategories: cats.map((c) => c.name),
    knownAccounts: accs.map((a) => a.name),
  };
}

/** Guarda el borrador y pide confirmación con botones. */
async function proposeDraft(chatId: number, userId: string, draft: TransactionDraft): Promise<void> {
  const db = createAdminClient();
  const draftJson = {
    kind: draft.kind,
    amountMinor: draft.amount.minorUnits,
    currency: draft.amount.currency,
    categoryHint: draft.categoryHint ?? null,
    accountHint: draft.accountHint ?? null,
    description: draft.description ?? null,
    occurredAt: draft.occurredAt.toISOString(),
    source: draft.source,
  };
  const { data, error } = await db
    .from("pending_drafts")
    .insert({ user_id: userId, draft: draftJson })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const lines = [
    KIND_LABEL[draft.kind],
    `<b>${fmt(draft.amount)}</b>${draft.categoryHint ? ` · ${draft.categoryHint}` : ""}`,
    draft.description ? `“${draft.description}”` : "",
    draft.accountHint ? `Cuenta: ${draft.accountHint}` : "",
    draft.confidence < 0.5 ? "\n🤔 No estoy muy seguro, revisa los datos." : "",
    "\n¿Lo registro?",
  ].filter(Boolean);

  await telegram.sendMessage(chatId, lines.join("\n"), [
    [
      { text: "✅ Sí, registrar", callback_data: `ok:${data.id}` },
      { text: "✏️ Cancelar", callback_data: `no:${data.id}` },
    ],
  ]);
}

// ── Confirmación (callback de los botones) ─────────────────────
async function handleCallback(cb: TgCallback): Promise<void> {
  const db = createAdminClient();
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  const [action, draftId] = (cb.data ?? "").split(":");
  if (!chatId || !messageId || !draftId) return void telegram.answerCallbackQuery(cb.id);

  const { data: row } = await db.from("pending_drafts").select("*").eq("id", draftId).maybeSingle();
  if (!row) {
    await telegram.answerCallbackQuery(cb.id, "Ese borrador ya no existe");
    return;
  }

  if (action === "no") {
    await db.from("pending_drafts").delete().eq("id", draftId);
    await telegram.editMessageText(chatId, messageId, "✏️ Cancelado. No registré nada.");
    await telegram.answerCallbackQuery(cb.id);
    return;
  }

  // Confirmar => ejecutar el caso de uso del dominio.
  const d = row.draft as Record<string, unknown>;
  const useCase = new RegisterTransaction(transactionRepo(db), accountRepo(db), categoryRepo(db));
  try {
    const tx = await useCase.execute({
      userId: row.user_id,
      kind: d.kind as TransactionKind,
      amount: Money.of(d.amountMinor as number, d.currency as string),
      accountHint: (d.accountHint as string) ?? undefined,
      categoryHint: (d.categoryHint as string) ?? undefined,
      description: (d.description as string) ?? undefined,
      occurredAt: new Date(d.occurredAt as string),
      source: d.source as TransactionDraft["source"],
    });
    await db.from("pending_drafts").delete().eq("id", draftId);
    await telegram.editMessageText(
      chatId,
      messageId,
      `✅ <b>Registrado</b> · ${fmt(tx.amount)}\nYa aparece en tu dashboard 📊`,
    );
    await telegram.answerCallbackQuery(cb.id, "¡Listo!");
  } catch (err) {
    await telegram.answerCallbackQuery(cb.id, "Error al registrar");
    await telegram.editMessageText(chatId, messageId, `⚠️ No pude registrar: ${(err as Error).message}`);
  }
}
