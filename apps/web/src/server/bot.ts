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

/** Forma serializable de un borrador (lo que guardamos en pending_drafts.draft.items). */
interface DraftItem {
  kind: TransactionKind;
  amountMinor: number;
  currency: string;
  categoryHint: string | null;
  accountHint: string | null;
  description: string | null;
  occurredAt: string;
  source: TransactionDraft["source"];
}

/** Punto de entrada: procesa un update ya validado. Idempotente. */
export async function processUpdate(update: TgUpdate): Promise<void> {
  const db = createAdminClient();
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
    let drafts: TransactionDraft[];

    if (msg.voice || msg.audio) {
      const fileId = (msg.voice ?? msg.audio)!.file_id;
      const { bytes, mimeHint } = await telegram.downloadFile(fileId);
      const transcript = await groqAudio.transcribe(bytes, mimeHint);
      await telegram.sendMessage(chatId, `🎙️ Te entendí: <i>«${transcript}»</i>`);
      drafts = (await geminiText.interpret(transcript, ctx)).map((d) => ({ ...d, source: "telegram_audio" as const }));
    } else if (msg.photo?.length) {
      const largest = msg.photo[msg.photo.length - 1]!;
      const { bytes, mimeHint } = await telegram.downloadFile(largest.file_id);
      drafts = await geminiImage.interpret(bytes, mimeHint, ctx);
      if (msg.caption && drafts[0]) drafts[0].description ??= msg.caption;
    } else if (text) {
      drafts = await geminiText.interpret(text, ctx);
    } else {
      return;
    }

    if (drafts.length === 0) {
      await telegram.sendMessage(
        chatId,
        "🤔 No detecté ningún movimiento ahí. Cuéntame un gasto, ingreso o inversión (ej. «taxi 12 mil»).",
      );
      return;
    }

    await proposeDrafts(chatId, userId, drafts);
  } catch (err) {
    const m = (err as Error).message;
    const friendly = m.includes("SATURADO")
      ? "😵‍💫 El modelo de IA está saturado en este momento. Reintenta en unos segundos."
      : `⚠️ Algo falló procesando eso: ${m}`;
    await telegram.sendMessage(chatId, friendly);
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

/** Guarda los borradores y pide confirmación (uno o varios) con botones. */
async function proposeDrafts(chatId: number, userId: string, drafts: TransactionDraft[]): Promise<void> {
  const db = createAdminClient();
  const items: DraftItem[] = drafts.map((d) => ({
    kind: d.kind,
    amountMinor: d.amount.minorUnits,
    currency: d.amount.currency,
    categoryHint: d.categoryHint ?? null,
    accountHint: d.accountHint ?? null,
    description: d.description ?? null,
    occurredAt: d.occurredAt.toISOString(),
    source: d.source,
  }));

  const { data, error } = await db
    .from("pending_drafts")
    .insert({ user_id: userId, draft: { items } })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  let body: string;
  if (drafts.length === 1) {
    const d = drafts[0]!;
    body = [
      KIND_LABEL[d.kind],
      `<b>${fmt(d.amount)}</b>${d.categoryHint ? ` · ${d.categoryHint}` : ""}`,
      d.description ? `“${d.description}”` : "",
      d.accountHint ? `Cuenta: ${d.accountHint}` : "",
      d.confidence < 0.5 ? "\n🤔 No estoy muy seguro, revisa los datos." : "",
      "\n¿Lo registro?",
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    const lines = drafts.map(
      (d) => `${KIND_LABEL[d.kind]} · <b>${fmt(d.amount)}</b>${d.categoryHint ? ` · ${d.categoryHint}` : ""}`,
    );
    body = `Detecté <b>${drafts.length} movimientos</b>:\n${lines.join("\n")}\n\n¿Los registro todos?`;
  }

  await telegram.sendMessage(chatId, body, [
    [
      { text: drafts.length > 1 ? "✅ Registrar todos" : "✅ Sí, registrar", callback_data: `ok:${data.id}` },
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

  // Confirmar => registrar todos los ítems vía el caso de uso del dominio.
  const items = (row.draft?.items ?? []) as DraftItem[];
  const useCase = new RegisterTransaction(transactionRepo(db), accountRepo(db), categoryRepo(db));
  const registered: Money[] = [];
  let failed = 0;

  for (const d of items) {
    try {
      const tx = await useCase.execute({
        userId: row.user_id,
        kind: d.kind,
        amount: Money.of(d.amountMinor, d.currency),
        accountHint: d.accountHint ?? undefined,
        categoryHint: d.categoryHint ?? undefined,
        description: d.description ?? undefined,
        occurredAt: new Date(d.occurredAt),
        source: d.source,
      });
      registered.push(tx.amount);
    } catch {
      failed++;
    }
  }

  await db.from("pending_drafts").delete().eq("id", draftId);

  let msg: string;
  if (registered.length === 0) {
    msg = "⚠️ No pude registrar los movimientos. Revisa que tengas una cuenta configurada.";
  } else if (registered.length === 1) {
    msg = `✅ <b>Registrado</b> · ${fmt(registered[0]!)}\nYa aparece en tu dashboard 📊`;
  } else {
    msg = `✅ <b>Registré ${registered.length} movimientos</b>${failed ? ` (${failed} fallaron)` : ""}.\nYa aparecen en tu dashboard 📊`;
  }

  await telegram.editMessageText(chatId, messageId, msg);
  await telegram.answerCallbackQuery(cb.id, "¡Listo!");
}
