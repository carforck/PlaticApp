import { Money, RegisterTransaction } from "@platica/core";
import type { AccountType, ExtractResult, InterpretContext, TransactionDraft, TransactionKind } from "@platica/core";
import { createAdminClient } from "./supabase-admin";
import { accountRepo, categoryRepo, debtRepo, idempotencyStore, transactionRepo } from "./repos";
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

const debtLine = (counterparty: string, direction: "i_owe" | "they_owe", m: Money) =>
  direction === "i_owe"
    ? `🤝 Le debes a <b>${counterparty}</b>: ${fmt(m)}`
    : `🤝 <b>${counterparty}</b> te debe: ${fmt(m)}`;

interface DraftItem {
  kind: TransactionKind;
  amountMinor: number;
  currency: string;
  categoryHint: string | null;
  categoryEmoji: string | null;
  accountHint: string | null;
  accountType: AccountType | null;
  description: string | null;
  occurredAt: string;
  source: TransactionDraft["source"];
}
interface DebtItem {
  counterparty: string;
  direction: "i_owe" | "they_owe";
  amountMinor: number;
  currency: string;
  description: string | null;
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
  const { data } = await db.from("telegram_links").select("user_id").eq("telegram_chat_id", chatId).maybeSingle();
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
    "✅ <b>¡Cuenta vinculada!</b>\nYa puedes registrar movimientos. Escríbeme algo como:\n<i>«gasté 50 mil en el almuerzo con la tarjeta»</i> 🍽️",
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
      "👋 <b>Hola, soy Platica.</b>\nVincula tu cuenta: abre la app web, genera tu código y mándamelo aquí, o usa el botón «Vincular Telegram».",
    );
    return;
  }

  const userId = await resolveUserId(chatId);
  if (!userId) {
    const maybeCode = text.replace(/\s+/g, "");
    if (/^[A-Za-z0-9]{6}$/.test(maybeCode)) return handleLinkCode(chatId, maybeCode, msg.from?.username);
    await telegram.sendMessage(
      chatId,
      "🔗 Aún no vinculas tu cuenta. Abre la app web, genera tu código y envíamelo aquí (o usa el botón «Vincular Telegram»).",
    );
    return;
  }

  try {
    const ctx = await buildContext(userId);
    let result: ExtractResult;

    if (msg.voice || msg.audio) {
      const fileId = (msg.voice ?? msg.audio)!.file_id;
      const { bytes, mimeHint } = await telegram.downloadFile(fileId);
      const transcript = await groqAudio.transcribe(bytes, mimeHint);
      await telegram.sendMessage(chatId, `🎙️ Te entendí: <i>«${transcript}»</i>`);
      result = await geminiText.interpret(transcript, ctx);
      result.transactions = result.transactions.map((d) => ({ ...d, source: "telegram_audio" as const }));
    } else if (msg.photo?.length) {
      const largest = msg.photo[msg.photo.length - 1]!;
      const { bytes, mimeHint } = await telegram.downloadFile(largest.file_id);
      result = await geminiImage.interpret(bytes, mimeHint, ctx);
      if (msg.caption && result.transactions[0]) result.transactions[0].description ??= msg.caption;
    } else if (text) {
      result = await geminiText.interpret(text, ctx);
    } else {
      return;
    }

    if (result.transactions.length === 0 && result.debts.length === 0) {
      await telegram.sendMessage(
        chatId,
        "🤔 No detecté ningún movimiento ni deuda ahí. Cuéntame un gasto, ingreso, inversión o préstamo.",
      );
      return;
    }

    await proposeDrafts(chatId, userId, result);
  } catch (err) {
    const m = (err as Error).message;
    const friendly = m.includes("SATURADO")
      ? "😵‍💫 El modelo de IA está saturado ahora mismo. Reintenta en unos segundos."
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

/** Guarda los borradores (movimientos + deudas) y pide confirmación. */
async function proposeDrafts(chatId: number, userId: string, result: ExtractResult): Promise<void> {
  const db = createAdminClient();
  const items: DraftItem[] = result.transactions.map((d) => ({
    kind: d.kind,
    amountMinor: d.amount.minorUnits,
    currency: d.amount.currency,
    categoryHint: d.categoryHint ?? null,
    categoryEmoji: d.categoryEmojiHint ?? null,
    accountHint: d.accountHint ?? null,
    accountType: d.accountTypeHint ?? null,
    description: d.description ?? null,
    occurredAt: d.occurredAt.toISOString(),
    source: d.source,
  }));
  const debts: DebtItem[] = result.debts.map((d) => ({
    counterparty: d.counterparty,
    direction: d.direction,
    amountMinor: d.amount.minorUnits,
    currency: d.amount.currency,
    description: d.description ?? null,
  }));

  const { data, error } = await db
    .from("pending_drafts")
    .insert({ user_id: userId, draft: { items, debts } })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const total = items.length + debts.length;
  const txLines = result.transactions.map(
    (d) =>
      `${KIND_LABEL[d.kind]} · <b>${fmt(d.amount)}</b>` +
      `${d.categoryHint ? ` · ${d.categoryHint}` : ""}${d.accountHint ? ` · ${d.accountHint}` : ""}`,
  );
  const debtLines = result.debts.map((d) => debtLine(d.counterparty, d.direction, d.amount));

  let body: string;
  if (total === 1 && result.transactions.length === 1) {
    const d = result.transactions[0]!;
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
    body =
      `Detecté <b>${total}</b>:\n` +
      [...txLines, ...debtLines].join("\n") +
      "\n\n¿Los registro todos?";
  }

  await telegram.sendMessage(chatId, body, [
    [
      { text: total > 1 ? "✅ Registrar todo" : "✅ Sí, registrar", callback_data: `ok:${data.id}` },
      { text: "✏️ Cancelar", callback_data: `no:${data.id}` },
    ],
  ]);
}

// ── Confirmación ───────────────────────────────────────────────
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

  const items = (row.draft?.items ?? []) as DraftItem[];
  const debts = (row.draft?.debts ?? []) as DebtItem[];
  const useCase = new RegisterTransaction(transactionRepo(db), accountRepo(db), categoryRepo(db));
  const debtsRepo = debtRepo(db);

  let txOk = 0;
  let debtOk = 0;
  let failed = 0;

  for (const d of items) {
    try {
      await useCase.execute({
        userId: row.user_id,
        kind: d.kind,
        amount: Money.of(d.amountMinor, d.currency),
        accountHint: d.accountHint ?? undefined,
        accountType: d.accountType ?? undefined,
        categoryHint: d.categoryHint ?? undefined,
        categoryEmoji: d.categoryEmoji ?? undefined,
        description: d.description ?? undefined,
        occurredAt: new Date(d.occurredAt),
        source: d.source,
      });
      txOk++;
    } catch {
      failed++;
    }
  }

  for (const d of debts) {
    try {
      await debtsRepo.create({
        userId: row.user_id,
        counterparty: d.counterparty,
        direction: d.direction,
        amount: Money.of(d.amountMinor, d.currency),
        description: d.description ?? undefined,
      });
      debtOk++;
    } catch {
      failed++;
    }
  }

  await db.from("pending_drafts").delete().eq("id", draftId);

  const parts: string[] = [];
  if (txOk) parts.push(`${txOk} movimiento${txOk > 1 ? "s" : ""}`);
  if (debtOk) parts.push(`${debtOk} deuda${debtOk > 1 ? "s" : ""}`);
  const msg =
    parts.length === 0
      ? "⚠️ No pude registrar nada. Revisa que tengas una cuenta configurada."
      : `✅ <b>Registré ${parts.join(" y ")}</b>${failed ? ` (${failed} fallaron)` : ""}.\nYa aparece en tu dashboard 📊`;

  await telegram.editMessageText(chatId, messageId, msg);
  await telegram.answerCallbackQuery(cb.id, "¡Listo!");
}
