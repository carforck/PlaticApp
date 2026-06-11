import { Money, RegisterTransaction, firstDueDate, nextOccurrence } from "@platica/core";
import type {
  AccountType,
  ExtractResult,
  Frequency,
  InterpretContext,
  TransactionDraft,
  TransactionKind,
} from "@platica/core";
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
interface RecurrenceItem {
  name: string;
  kind: TransactionKind;
  amountMinor: number;
  currency: string;
  categoryHint: string | null;
  accountHint: string | null;
  frequency: Frequency;
  dayOfMonth: number | null;
}

const FREQ_LABEL: Record<Frequency, string> = {
  weekly: "semanal",
  biweekly: "quincenal",
  monthly: "mensual",
  yearly: "anual",
};

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

    if (result.transactions.length === 0 && result.debts.length === 0 && result.recurrences.length === 0) {
      await telegram.sendMessage(
        chatId,
        "🤔 No detecté ningún movimiento ni deuda ahí. Cuéntame un gasto, ingreso, inversión, préstamo o pago fijo.",
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
  const [{ data: profile }, cats, accs, { data: recentTx }, { data: recs }] = await Promise.all([
    db.from("profiles").select("default_currency, timezone").eq("id", userId).maybeSingle(),
    categoryRepo(db).listByUser(userId),
    accountRepo(db).listByUser(userId),
    db.from("transactions").select("description, amount_minor").not("description", "is", null).order("occurred_at", { ascending: false }).limit(50),
    db.from("recurrences").select("name, amount_minor").eq("active", true),
  ]);

  // Conceptos conocidos con su monto típico (último visto), para inferir "el Netflix que ya sabes".
  const merchants = new Map<string, number>();
  for (const r of recs ?? []) if (r.name) merchants.set(r.name, r.amount_minor);
  for (const t of recentTx ?? []) {
    const k = (t.description as string)?.trim();
    if (k && !merchants.has(k)) merchants.set(k, t.amount_minor);
  }
  const knownMerchants = [...merchants.entries()].slice(0, 25).map(([n, a]) => `${n}=${a}`);

  return {
    defaultCurrency: profile?.default_currency ?? "COP",
    timezone: profile?.timezone ?? "America/Bogota",
    now: new Date(),
    knownCategories: cats.map((c) => c.name),
    knownAccounts: accs.map((a) => a.name),
    knownMerchants,
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
  const recurrences: RecurrenceItem[] = result.recurrences.map((r) => ({
    name: r.name,
    kind: r.kind,
    amountMinor: r.amount.minorUnits,
    currency: r.amount.currency,
    categoryHint: r.categoryHint ?? null,
    accountHint: r.accountHint ?? null,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth ?? null,
  }));

  const { data, error } = await db
    .from("pending_drafts")
    .insert({ user_id: userId, draft: { items, debts, recurrences } })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const total = items.length + debts.length + recurrences.length;
  const txLines = result.transactions.map(
    (d) =>
      `${KIND_LABEL[d.kind]} · <b>${fmt(d.amount)}</b>` +
      `${d.categoryHint ? ` · ${d.categoryHint}` : ""}${d.accountHint ? ` · ${d.accountHint}` : ""}`,
  );
  const debtLines = result.debts.map((d) => debtLine(d.counterparty, d.direction, d.amount));
  const recLines = result.recurrences.map(
    (r) =>
      `🔁 <b>${fmt(r.amount)}</b> · ${r.name} (${FREQ_LABEL[r.frequency]}${r.dayOfMonth ? `, día ${r.dayOfMonth}` : ""})`,
  );

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
  } else if (total === 1 && result.recurrences.length === 1) {
    const r = result.recurrences[0]!;
    body = [
      `🔁 <b>Pago fijo ${FREQ_LABEL[r.frequency]}</b>`,
      `<b>${fmt(r.amount)}</b> · ${r.name}`,
      r.dayOfMonth ? `Día de pago: ${r.dayOfMonth}` : "",
      "\nTe recordaré 1 día antes. ¿Lo guardo?",
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    body = `Detecté <b>${total}</b>:\n` + [...txLines, ...debtLines, ...recLines].join("\n") + "\n\n¿Los registro todos?";
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

  // Recordatorio de un pago fijo: registrar o saltar este ciclo.
  if (action === "rok" || action === "rskip") {
    return handleReminderAction(cb, chatId, messageId, action, draftId);
  }

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

  const recurrences = (row.draft?.recurrences ?? []) as RecurrenceItem[];
  let recOk = 0;
  for (const r of recurrences) {
    try {
      await createRecurrence(db, row.user_id, r);
      recOk++;
    } catch {
      failed++;
    }
  }

  await db.from("pending_drafts").delete().eq("id", draftId);

  const parts: string[] = [];
  if (txOk) parts.push(`${txOk} movimiento${txOk > 1 ? "s" : ""}`);
  if (debtOk) parts.push(`${debtOk} deuda${debtOk > 1 ? "s" : ""}`);
  if (recOk) parts.push(`${recOk} pago fijo${recOk > 1 ? "s" : ""}`);
  const msg =
    parts.length === 0
      ? "⚠️ No pude registrar nada. Revisa que tengas una cuenta configurada."
      : `✅ <b>Registré ${parts.join(" y ")}</b>${failed ? ` (${failed} fallaron)` : ""}.\nYa aparece en tu dashboard 📊`;

  await telegram.editMessageText(chatId, messageId, msg);
  await telegram.answerCallbackQuery(cb.id, "¡Listo!");
}

const titleCase = (s: string) =>
  s.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Crea una recurrencia (plantilla de pago fijo), resolviendo cuenta y categoría. */
async function createRecurrence(db: ReturnType<typeof createAdminClient>, userId: string, r: RecurrenceItem) {
  const accounts = accountRepo(db);
  let account = r.accountHint ? await accounts.findByNameHint(userId, r.accountHint) : null;
  if (!account && r.accountHint) account = await accounts.create(userId, titleCase(r.accountHint), "cash");
  account ??= (await accounts.listByUser(userId))[0] ?? null;

  const cats = categoryRepo(db);
  let category = r.categoryHint ? await cats.findByNameHint(userId, r.categoryHint) : null;
  if (!category && r.categoryHint && (r.kind === "expense" || r.kind === "income")) {
    category = await cats.create(userId, titleCase(r.categoryHint), r.kind, null, null);
  }

  const nextDue = firstDueDate(r.frequency, r.dayOfMonth, new Date());
  const { error } = await db.from("recurrences").insert({
    user_id: userId,
    name: r.name,
    kind: r.kind,
    amount_minor: r.amountMinor,
    currency: r.currency,
    category_id: category?.id ?? null,
    account_id: account?.id ?? null,
    frequency: r.frequency,
    day_of_month: r.dayOfMonth,
    next_due: ymd(nextDue),
    remind_days_before: 1,
  });
  if (error) throw new Error(error.message);
}

/** Maneja el botón del recordatorio: registrar el pago o saltar este ciclo. */
async function handleReminderAction(
  cb: TgCallback,
  chatId: number,
  messageId: number,
  action: string,
  recId: string,
): Promise<void> {
  const db = createAdminClient();
  const { data: rec } = await db.from("recurrences").select("*").eq("id", recId).maybeSingle();
  if (!rec) {
    await telegram.answerCallbackQuery(cb.id, "Ese pago fijo ya no existe");
    return;
  }

  if (action === "rok") {
    let accountId = rec.account_id as string | null;
    if (!accountId) accountId = (await accountRepo(db).listByUser(rec.user_id))[0]?.id ?? null;
    if (accountId) {
      await db.from("transactions").insert({
        user_id: rec.user_id,
        kind: rec.kind,
        amount_minor: rec.amount_minor,
        currency: rec.currency,
        account_id: accountId,
        category_id: rec.category_id,
        description: rec.name,
        occurred_at: new Date().toISOString(),
        source: "web",
      });
    }
  }

  const next = nextOccurrence(new Date(`${rec.next_due}T00:00:00`), rec.frequency as Frequency);
  await db.from("recurrences").update({ next_due: ymd(next), last_reminded: null }).eq("id", recId);

  const money = Money.of(rec.amount_minor, rec.currency);
  await telegram.editMessageText(
    chatId,
    messageId,
    action === "rok"
      ? `✅ <b>Registrado</b> · ${fmt(money)} (${rec.name})\nPróximo: ${ymd(next)} 📅`
      : `⏭️ Saltado este ciclo · ${rec.name}\nPróximo: ${ymd(next)}`,
  );
  await telegram.answerCallbackQuery(cb.id, "¡Listo!");
}

/** Envía el recordatorio de un pago fijo (lo llama el cron). */
export async function sendRecurrenceReminder(chatId: number, recId: string, name: string, amountText: string, freqLabel: string) {
  await telegram.sendMessage(
    chatId,
    `🔔 <b>Recordatorio de pago fijo</b>\n${amountText} · ${name} (${freqLabel})\n¿Lo registro?`,
    [
      [
        { text: "✅ Registrar", callback_data: `rok:${recId}` },
        { text: "⏭️ Saltar", callback_data: `rskip:${recId}` },
      ],
    ],
  );
}
