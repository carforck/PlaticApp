import { Money, RegisterTransaction, firstDueDate, nextOccurrence } from "@platica/core";
import type {
  AccountType,
  ExtractResult,
  Frequency,
  InterpretContext,
  QueryIntent,
  SavingsIntent,
  TransactionDraft,
  TransactionKind,
} from "@platica/core";
import { createAdminClient } from "./supabase-admin";
import { accountRepo, categoryRepo, debtRepo, idempotencyStore, transactionRepo } from "./repos";
import { telegram } from "./telegram";
import { geminiText, geminiImage } from "./ai/gemini";
import { groqAudio } from "./ai/groq";
import { ACCOUNT_EMOJI } from "@/lib/labels";

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
  transferToHint: string | null;
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

async function handleLinkCode(chatId: number, code: string, username?: string, firstName?: string): Promise<void> {
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

  await telegram.sendMessage(chatId, welcomeText(firstNameOf(firstName)));
}

const APP_URL = "https://platicapp-web.vercel.app";

// Frases cálidas que rotan al saludar (se elige una al azar).
const WARM_PHRASES = [
  "Nos encanta tenerte por aquí. 🙌",
  "Felices de que seas parte de esto. 💜",
  "Encantados de contar con tu presencia. ✨",
  "Qué alegría verte por acá. 😄",
  "Tu plata y tú, en buenas manos. 💪",
  "Gracias por confiar en PlaticApp. 🤝",
  "Estamos para hacerte la vida más fácil. 🚀",
];
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const firstNameOf = (s?: string) => (s ?? "").trim().split(/\s+/)[0] ?? "";
/** Saludo personalizado: «¡Hola, Carlos! <frase cálida>» */
const warmHello = (name?: string) => {
  const fn = firstNameOf(name);
  return `👋 <b>¡Hola${fn ? `, ${fn}` : ""}!</b> ${pick(WARM_PHRASES)}`;
};

const welcomeText = (firstName?: string) => `💸 <b>¡Listo, ya estamos conectados${firstName ? `, ${firstName}` : ""}!</b>
${pick(WARM_PHRASES)}
Soy PlaticApp, tu copiloto financiero 🤖

Cuéntame tu plata como le contarías a un amigo — por texto, audio 🎙️ o foto de un recibo 🖼️:

📝 <b>Registrar</b>
• «gasté 50 mil en el almuerzo con la tarjeta»
• «me pagaron el sueldo 1.500.000»
• «pasé 100 mil de Nequi a Bancolombia»
• «Juan me prestó 200 mil»
• «todos los meses pago arriendo 800 mil el día 5»

❓ <b>Preguntarme</b>
• «¿cuánto gasté este mes?» · «¿cuánto tengo?» · «¿en qué gasto más?»

📊 <b>Tus gráficos y métricas</b> viven en tu panel web:
${APP_URL}
Ahí ves tu patrimonio, la evolución, presupuestos y mucho más en tiempo real.

Escribe /ayuda cuando quieras. ¡Empecemos! 🚀`;

// ── Mensajes ───────────────────────────────────────────────────
async function handleMessage(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() ?? "";

  const startMatch = text.match(/^\/(?:start|vincular)(?:@\w+)?\s+(\S+)/i);
  if (startMatch) return handleLinkCode(chatId, startMatch[1]!, msg.from?.username, msg.from?.first_name);

  if (/^\/start\b/i.test(text)) {
    const linked = await resolveUserId(chatId);
    if (linked) {
      await telegram.sendMessage(
        chatId,
        `${warmHello(msg.from?.first_name)}\nAquí sigo, listo para anotar tu plata. Cuéntame un gasto, mándame un audio 🎙️ o una foto de un recibo 🖼️.\n\n📊 Tus gráficos y métricas: ${APP_URL}\nEscribe /ayuda para ver todo lo que hago. 😉`,
      );
    } else {
      await telegram.sendMessage(
        chatId,
        `${warmHello(msg.from?.first_name)}\nSoy PlaticApp, tu copiloto financiero 💸\nPara empezar, vincula tu cuenta: abre la app web, genera tu código y mándamelo aquí (o usa el botón «Vincular Telegram»).\n\n¿Aún no tienes cuenta? Créala en ${APP_URL}`,
      );
    }
    return;
  }

  if (/^\/(ayuda|help)\b/i.test(text)) {
    await telegram.sendMessage(chatId, AYUDA_TEXT);
    return;
  }

  if (/^\/novedades\b/i.test(text)) {
    const db = createAdminClient();
    const { data: anns } = await db
      .from("announcements")
      .select("emoji, title, body")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(5);
    const list = (anns ?? []).map((a) => `${a.emoji} <b>${a.title}</b>\n${a.body}`).join("\n\n");
    await telegram.sendMessage(chatId, `🔔 <b>Novedades de PlaticApp</b>\n\n${list || "Sin novedades por ahora."}`);
    return;
  }

  const userId = await resolveUserId(chatId);
  if (!userId) {
    const maybeCode = text.replace(/\s+/g, "");
    if (/^[A-Za-z0-9]{6}$/.test(maybeCode)) return handleLinkCode(chatId, maybeCode, msg.from?.username, msg.from?.first_name);
    await telegram.sendMessage(
      chatId,
      `🔗 Me encantaría ayudarte, pero primero necesito que vinculemos tu cuenta 🙂\nAbre tu panel en ${APP_URL}, genera tu código de 6 dígitos y envíamelo aquí.`,
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
      await saveReceipt(userId, bytes, mimeHint, result, msg.caption); // guarda la foto en la galería
    } else if (text) {
      result = await geminiText.interpret(text, ctx);
    } else {
      return;
    }

    const nothingToRegister =
      result.transactions.length === 0 && result.debts.length === 0 && result.recurrences.length === 0;

    // Acción de ahorro (apartar / meta / consulta).
    if (result.savings) {
      await handleSavings(chatId, userId, result.savings);
      return;
    }

    // Si es una pregunta, la respondemos en vez de registrar.
    if (nothingToRegister && result.query) {
      await telegram.sendMessage(chatId, await answerQuery(userId, result.query));
      return;
    }

    // Conversación: el usuario solo charla/saluda. Respondemos humano.
    if (nothingToRegister && result.reply) {
      await telegram.sendMessage(chatId, result.reply);
      return;
    }

    if (nothingToRegister) {
      await telegram.sendMessage(
        chatId,
        "🤔 Hmm, no logré pillar un movimiento ahí. Cuéntame algo como «gasté 50 mil en el almuerzo» o pregúntame «¿cuánto gasté en comida este mes?». Si quieres ver todo lo que hago, escribe /ayuda 😉",
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
    transferToHint: d.transferToHint ?? null,
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

  // ── ¿Preguntar la cuenta? Solo si es UNA transacción (gasto/ingreso/inversión),
  //    y no se especificó medio (con 2+ cuentas) o se mencionó uno que no existe. ──
  const single = items.length === 1 && debts.length === 0 && recurrences.length === 0 ? items[0]! : null;
  if (single && (single.kind === "expense" || single.kind === "income" || single.kind === "investment")) {
    const accounts = await accountRepo(db).listByUser(userId);
    const matched = single.accountHint ? await accountRepo(db).findByNameHint(userId, single.accountHint) : null;
    const unknownHint = !!single.accountHint && !matched;
    const needAsk = (!single.accountHint && accounts.length >= 2) || unknownHint;

    if (needAsk && accounts.length > 0) {
      const verb =
        single.kind === "income" ? "¿A qué cuenta entró?" : single.kind === "investment" ? "¿Desde qué cuenta salió?" : "¿Con qué pagaste?";
      const head =
        `${KIND_LABEL[single.kind]} · <b>${pesos(single.amountMinor)}</b>` +
        `${single.description ? ` · ${single.description}` : ""}`;
      const note = unknownHint ? `\n🔎 No encontré «${single.accountHint}» entre tus cuentas.` : "";

      // El callback_data de Telegram está limitado a 64 bytes: referenciamos la
      // cuenta por índice y guardamos las opciones en el borrador.
      const choices = accounts.slice(0, 8);
      await db
        .from("pending_drafts")
        .update({ draft: { items, debts, recurrences, accountChoices: choices.map((a) => a.id) } })
        .eq("id", data.id);

      const accBtns = choices.map((a, i) => ({
        text: `${ACCOUNT_EMOJI[a.type] ?? "💼"} ${a.name}`,
        callback_data: `selacc:${data.id}:${i}`,
      }));
      const rows: { text: string; callback_data: string }[][] = [];
      for (let i = 0; i < accBtns.length; i += 2) rows.push(accBtns.slice(i, i + 2));
      if (unknownHint) rows.push([{ text: `➕ Crear «${titleCase(single.accountHint!)}»`, callback_data: `newacc:${data.id}` }]);
      rows.push([{ text: "✏️ Cancelar", callback_data: `no:${data.id}` }]);

      await telegram.sendMessage(chatId, `${head}${note}\n\n${verb}`, rows);
      return;
    }
  }

  const total = items.length + debts.length + recurrences.length;
  const txLines = result.transactions.map(
    (d) =>
      `${KIND_LABEL[d.kind]} · <b>${fmt(d.amount)}</b>` +
      `${d.categoryHint ? ` · ${d.categoryHint}` : ""}${d.accountHint ? ` · ${d.accountHint}` : ""}` +
      `${d.transferToHint ? ` → ${d.transferToHint}` : ""}`,
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

  const warnings = await detectWarnings(db, userId, result.transactions);
  if (warnings.length) body += `\n\n${warnings.join("\n")}`;

  await telegram.sendMessage(chatId, body, [
    [
      { text: total > 1 ? "✅ Registrar todo" : "✅ Sí, registrar", callback_data: `ok:${data.id}` },
      { text: "✏️ Cancelar", callback_data: `no:${data.id}` },
    ],
  ]);
}

/** Detecta posibles duplicados o gastos inusualmente altos para avisar antes de confirmar. */
async function detectWarnings(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  drafts: TransactionDraft[],
): Promise<string[]> {
  const expenses = drafts.filter((d) => d.kind === "expense");
  if (expenses.length === 0) return [];

  const warningsSavings: string[] = [];
  // Aviso si un gasto dejaría la cuenta por debajo de su ahorro apartado.
  const { data: balRows } = await db
    .from("account_balances")
    .select("account_id, name, balance_minor, reserved_minor")
    .eq("user_id", userId);
  const balById = new Map((balRows ?? []).map((b) => [b.account_id, b]));
  if ((balRows ?? []).some((b) => (b.reserved_minor ?? 0) > 0)) {
    for (const d of expenses) {
      if (!d.accountHint) continue;
      const acc = await accountRepo(db).findByNameHint(userId, d.accountHint);
      const b = acc ? balById.get(acc.id) : null;
      if (b && (b.reserved_minor ?? 0) > 0 && b.balance_minor - d.amount.minorUnits < b.reserved_minor) {
        warningsSavings.push(`🐷 Ojo: este gasto reduce tu ahorro apartado en ${b.name}.`);
      }
    }
  }

  const { data: recent } = await db
    .from("transactions")
    .select("amount_minor, occurred_at")
    .eq("user_id", userId)
    .eq("kind", "expense")
    .order("occurred_at", { ascending: false })
    .limit(40);
  const rows = recent ?? [];
  if (rows.length === 0) return [...new Set(warningsSavings)];

  const avg = rows.reduce((s, t) => s + t.amount_minor, 0) / rows.length;
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const warnings: string[] = [];

  for (const d of expenses) {
    const amt = d.amount.minorUnits;
    const dup = rows.some((t) => t.amount_minor === amt && new Date(t.occurred_at).getTime() > dayAgo);
    if (dup) {
      warnings.push(`👯 Registraste ${fmt(d.amount)} hace poco — ¿es un duplicado?`);
    } else if (avg > 0 && amt > avg * 3) {
      warnings.push(`📈 ${fmt(d.amount)} es inusualmente alto (tu promedio es ~${pesos(Math.round(avg))}).`);
    }
  }
  return [...new Set([...warningsSavings, ...warnings])];
}

// ── Confirmación ───────────────────────────────────────────────
async function handleCallback(cb: TgCallback): Promise<void> {
  const db = createAdminClient();
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  const seg = (cb.data ?? "").split(":");
  const action = seg[0];
  const draftId = seg[1];
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

  let draftRow = row;

  // El usuario eligió una cuenta existente: la fijamos en el borrador (por nombre,
  // así el caso de uso la resuelve sin crear nada). «newacc» deja el hint tal cual,
  // para que se cree la cuenta mencionada.
  if (action === "selacc") {
    const idx = Number(seg[2]);
    const accountId = ((row.draft?.accountChoices ?? []) as string[])[idx];
    const { data: acc } = await db
      .from("accounts")
      .select("name, type")
      .eq("id", accountId ?? "")
      .eq("user_id", row.user_id)
      .maybeSingle();
    const draftItems = (row.draft?.items ?? []) as DraftItem[];
    if (draftItems[0] && acc) {
      draftItems[0].accountHint = acc.name as string;
      draftItems[0].accountType = acc.type as AccountType;
    }
    await db.from("pending_drafts").update({ draft: { ...row.draft, items: draftItems } }).eq("id", draftId);
    const { data: refreshed } = await db.from("pending_drafts").select("*").eq("id", draftId).maybeSingle();
    if (refreshed) draftRow = refreshed;
  }

  const items = (draftRow.draft?.items ?? []) as DraftItem[];
  const debts = (draftRow.draft?.debts ?? []) as DebtItem[];
  const useCase = new RegisterTransaction(transactionRepo(db), accountRepo(db), categoryRepo(db));
  const debtsRepo = debtRepo(db);

  let txOk = 0;
  let debtOk = 0;
  let failed = 0;
  const touchedCategories = new Set<string>();

  for (const d of items) {
    try {
      const tx = await useCase.execute({
        userId: draftRow.user_id,
        kind: d.kind,
        amount: Money.of(d.amountMinor, d.currency),
        accountHint: d.accountHint ?? undefined,
        accountType: d.accountType ?? undefined,
        transferAccountHint: d.transferToHint ?? undefined,
        categoryHint: d.categoryHint ?? undefined,
        categoryEmoji: d.categoryEmoji ?? undefined,
        description: d.description ?? undefined,
        occurredAt: new Date(d.occurredAt),
        source: d.source,
      });
      if (tx.kind === "expense" && tx.categoryId) touchedCategories.add(tx.categoryId);
      txOk++;
    } catch {
      failed++;
    }
  }

  for (const d of debts) {
    try {
      await debtsRepo.create({
        userId: draftRow.user_id,
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

  const recurrences = (draftRow.draft?.recurrences ?? []) as RecurrenceItem[];
  let recOk = 0;
  for (const r of recurrences) {
    try {
      await createRecurrence(db, draftRow.user_id, r);
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
  let msg =
    parts.length === 0
      ? "⚠️ No pude registrar nada. Revisa que tengas una cuenta configurada."
      : `✅ <b>Registré ${parts.join(" y ")}</b>${failed ? ` (${failed} fallaron)` : ""}.\nYa aparece en tu dashboard 📊`;

  // Alertas de presupuesto para las categorías afectadas.
  const alerts = await budgetAlerts(db, draftRow.user_id, [...touchedCategories]);
  if (alerts.length) msg += `\n\n${alerts.join("\n")}`;

  await telegram.editMessageText(chatId, messageId, msg);
  await telegram.answerCallbackQuery(cb.id, "¡Listo!");
}

const AYUDA_TEXT = `🤖 <b>Soy PlaticApp y esto es lo que hago por ti:</b>

📝 <b>Registrar</b> (escríbeme, mándame audio 🎙️ o foto de un recibo 🖼️):
• «gasté 50 mil en el almuerzo»
• «me pagaron el sueldo 1.500.000»
• «invertí 200 mil»
• «pasé 100 mil de Nequi a Bancolombia»
• «Juan me prestó 200 mil»
• «todos los meses pago arriendo 800 mil el día 5»

🐷 <b>Ahorrar</b>:
• «aparta 100 mil en Bancolombia»
• «mueve 50 mil al ahorro desde Nequi»
• «mi meta de ahorro en Bancolombia es 5 millones»
• «¿cuánto tengo ahorrado?»

❓ <b>Preguntarme</b>:
• «¿cuánto gasté este mes?»
• «¿cuánto gasté en comida?»
• «¿cuánto debo?» · «¿cuánto tengo?»
• «¿en qué gasto más?» · «mis últimos movimientos»

🔔 /novedades — lo último de PlaticApp
🌐 Tu panel: https://platicapp-web.vercel.app`;

const titleCase = (s: string) =>
  s.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Sube la foto recibida al Storage y registra el recibo (galería). No rompe el flujo si falla. */
async function saveReceipt(
  userId: string,
  bytes: Uint8Array,
  mimeHint: string,
  result: ExtractResult,
  caption?: string,
): Promise<void> {
  try {
    const db = createAdminClient();

    // Optimiza: redimensiona y convierte a WebP (ahorra ~70-85% de espacio).
    let data: Buffer = Buffer.from(bytes);
    let contentType = mimeHint;
    let ext = mimeHint.includes("png") ? "png" : "jpg";
    try {
      const sharp = (await import("sharp")).default;
      data = await sharp(Buffer.from(bytes))
        .rotate() // respeta la orientación EXIF
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      contentType = "image/webp";
      ext = "webp";
    } catch {
      /* si sharp falla, sube el original */
    }

    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from("receipts").upload(path, data, { contentType, upsert: false });
    if (error) return;
    const summary =
      caption ||
      result.transactions.map((t) => `${fmt(t.amount)}${t.categoryHint ? ` · ${t.categoryHint}` : ""}`).join(", ") ||
      "Recibo";
    await db.from("receipts").insert({ user_id: userId, path, caption: summary.slice(0, 200) });
  } catch {
    /* la galería es secundaria; no interrumpe el registro */
  }
}

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

const pesos = (minor: number) => fmt(Money.of(minor, "COP"));

/** Alertas de presupuesto: avisa si una categoría llegó al 80% o se pasó este mes. */
async function budgetAlerts(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  categoryIds: string[],
): Promise<string[]> {
  if (categoryIds.length === 0) return [];
  const { data: budgets } = await db
    .from("budgets")
    .select("category_id, amount_minor")
    .eq("user_id", userId)
    .in("category_id", categoryIds);
  if (!budgets?.length) return [];

  const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: txs } = await db
    .from("transactions")
    .select("category_id, amount_minor")
    .eq("user_id", userId)
    .eq("kind", "expense")
    .gte("occurred_at", from)
    .in("category_id", categoryIds);
  const spent = new Map<string, number>();
  for (const t of txs ?? []) spent.set(t.category_id, (spent.get(t.category_id) ?? 0) + t.amount_minor);

  const { data: cats } = await db.from("categories").select("id, name").in("id", categoryIds);
  const name = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));

  const alerts: string[] = [];
  for (const b of budgets) {
    const s = spent.get(b.category_id) ?? 0;
    const pct = Math.round((s / b.amount_minor) * 100);
    const cat = name.get(b.category_id) ?? "esa categoría";
    if (pct >= 100) alerts.push(`🔴 Te pasaste del presupuesto de <b>${cat}</b>: ${pesos(s)} de ${pesos(b.amount_minor)}.`);
    else if (pct >= 80) alerts.push(`🟠 Vas en ${pct}% del presupuesto de <b>${cat}</b> (${pesos(s)} de ${pesos(b.amount_minor)}).`);
  }
  return alerts;
}

/** Responde una pregunta del usuario calculando desde la base de datos. */
/** Espacio disponible para apartar en una cuenta (saldo − apartado en otros sobres). */
async function savingsRoom(db: ReturnType<typeof createAdminClient>, userId: string, accountId: string, excludeId?: string): Promise<number> {
  const { data: bal } = await db.from("account_balances").select("balance_minor").eq("account_id", accountId).maybeSingle();
  const balance = bal?.balance_minor ?? 0;
  let q = db.from("savings").select("reserved_minor").eq("user_id", userId).eq("account_id", accountId);
  if (excludeId) q = q.neq("id", excludeId);
  const { data: others } = await q;
  const used = (others ?? []).reduce((s, r) => s + (r.reserved_minor ?? 0), 0);
  return Math.max(0, balance - used);
}

/** Maneja acciones de ahorro desde el bot: apartar, abonar, fijar meta o consultar. */
async function handleSavings(chatId: number, userId: string, s: SavingsIntent): Promise<void> {
  const db = createAdminClient();

  if (s.action === "query") {
    const { data: pots } = await db.from("savings").select("name, reserved_minor, goal_minor").eq("user_id", userId).order("created_at");
    const rows = pots ?? [];
    const total = rows.reduce((a, b) => a + (b.reserved_minor ?? 0), 0);
    if (!rows.length) {
      await telegram.sendMessage(chatId, "🐷 Aún no tienes ahorros. Dime algo como «aparta 100 mil para la casa en Bancolombia».");
      return;
    }
    const lines = rows
      .map((b) => `• ${b.name}: ${pesos(b.reserved_minor ?? 0)}${b.goal_minor ? ` / meta ${pesos(b.goal_minor)}` : ""}`)
      .join("\n");
    await telegram.sendMessage(chatId, `🐷 <b>Tus ahorros:</b> ${pesos(total)}\n${lines}`);
    return;
  }

  const acct = s.accountHint ? await accountRepo(db).findByNameHint(userId, s.accountHint) : null;
  if (!acct) {
    await telegram.sendMessage(chatId, "¿En qué cuenta? Dime por ejemplo «aparta 100 mil para la casa en Bancolombia». 🐷");
    return;
  }

  // Buscar el sobre por título (dentro de esa cuenta). Si no hay título, el primero de la cuenta.
  const { data: potRows } = await db.from("savings").select("id, name, reserved_minor, goal_minor").eq("user_id", userId).eq("account_id", acct.id);
  const pots = potRows ?? [];
  const match = s.name
    ? pots.find((p) => (p.name as string).toLowerCase().includes(s.name!.toLowerCase()) || s.name!.toLowerCase().includes((p.name as string).toLowerCase()))
    : pots[0];

  if (s.action === "goal") {
    const goalMinor = s.goal ? Money.of(Math.round(s.goal), "COP").minorUnits : 0;
    if (goalMinor <= 0) {
      await telegram.sendMessage(chatId, "¿De cuánto la meta? Ej. «la meta del ahorro de viaje es 5 millones».");
      return;
    }
    if (match) {
      await db.from("savings").update({ goal_minor: goalMinor }).eq("id", match.id).eq("user_id", userId);
      await telegram.sendMessage(chatId, `🎯 Meta de <b>${match.name}</b>: ${pesos(goalMinor)}. ¡A por ella!`);
    } else {
      await db.from("savings").insert({ user_id: userId, account_id: acct.id, name: titleCase(s.name || "Ahorro"), reserved_minor: 0, goal_minor: goalMinor });
      await telegram.sendMessage(chatId, `🎯 Creé el ahorro <b>${titleCase(s.name || "Ahorro")}</b> con meta de ${pesos(goalMinor)}.`);
    }
    return;
  }

  // action === "save" (apartar / abonar)
  const amountMinor = s.amount ? Money.of(Math.round(s.amount), "COP").minorUnits : 0;
  if (amountMinor <= 0) {
    await telegram.sendMessage(chatId, "¿Cuánto quieres apartar? Ej. «aparta 100 mil para la casa en " + acct.name + "».");
    return;
  }

  // Mover plata desde otra cuenta, si lo indicó.
  if (s.fromAccountHint) {
    const from = await accountRepo(db).findByNameHint(userId, s.fromAccountHint);
    if (from && from.id !== acct.id) {
      await db.from("transactions").insert({
        user_id: userId,
        kind: "transfer",
        amount_minor: amountMinor,
        currency: "COP",
        account_id: from.id,
        transfer_account_id: acct.id,
        description: "Movido al ahorro",
        occurred_at: new Date().toISOString(),
        source: "telegram_text",
      });
    }
  }

  const room = await savingsRoom(db, userId, acct.id, match?.id);
  const add = Math.min(amountMinor, room);
  const potName = titleCase(s.name || match?.name || "Ahorro");

  if (match) {
    const newReserved = (match.reserved_minor ?? 0) + add;
    await db.from("savings").update({ reserved_minor: newReserved }).eq("id", match.id).eq("user_id", userId);
    const goalNote = match.goal_minor
      ? `\n🎯 Vas en ${pesos(newReserved)} de ${pesos(match.goal_minor)} (${Math.round((newReserved / match.goal_minor) * 100)}%).`
      : "";
    await telegram.sendMessage(chatId, `🐷 Aboné <b>${pesos(add)}</b> a <b>${match.name}</b> (en ${acct.name}). Total: ${pesos(newReserved)}.${goalNote}`);
  } else {
    await db.from("savings").insert({ user_id: userId, account_id: acct.id, name: potName, reserved_minor: add, goal_minor: null });
    await telegram.sendMessage(chatId, `🐷 Creé el ahorro <b>${potName}</b> en ${acct.name} con ${pesos(add)}.`);
  }
}

async function answerQuery(userId: string, q: QueryIntent): Promise<string> {
  const db = createAdminClient();
  const now = new Date();

  // Rango temporal de la consulta.
  let from: Date | null = new Date(now.getFullYear(), now.getMonth(), 1);
  let to: Date | null = null;
  let periodLabel = "este mes";
  if (q.period === "all") {
    from = null;
    periodLabel = "en total";
  } else if (q.period === "last_month") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 1);
    periodLabel = "el mes pasado";
  }
  // Trae gastos/ingresos del usuario en el rango, sumados en JS (escala personal).
  async function sumByKind(kind: "expense" | "income"): Promise<{ amount_minor: number; category_id: string | null }[]> {
    let qb = db.from("transactions").select("amount_minor, category_id").eq("user_id", userId).eq("kind", kind);
    if (from) qb = qb.gte("occurred_at", from.toISOString());
    if (to) qb = qb.lt("occurred_at", to.toISOString());
    const { data } = await qb;
    return data ?? [];
  }

  try {
    if (q.type === "balance") {
      const { data } = await db.from("account_balances").select("name, type, balance_minor").eq("user_id", userId);
      const rows = data ?? [];
      let assets = 0;
      let creditDebt = 0;
      for (const a of rows) {
        if (a.type === "credit") creditDebt += Math.max(0, -a.balance_minor);
        else assets += a.balance_minor;
      }
      const net = assets - creditDebt;
      const lines = rows
        .map((a) =>
          a.type === "credit"
            ? `• ${a.name}: debes ${pesos(Math.max(0, -a.balance_minor))} 💳`
            : `• ${a.name}: ${pesos(a.balance_minor)}`,
        )
        .join("\n");
      const note = creditDebt > 0 ? `\n<i>(El crédito es deuda y no suma al patrimonio.)</i>` : "";
      return `💰 <b>Tu patrimonio:</b> ${pesos(net)}\n${lines}${note}`;
    }

    if (q.type === "debts") {
      const { data } = await db.from("debts").select("counterparty, direction, amount_minor").eq("user_id", userId).eq("status", "open");
      const owe = (data ?? []).filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount_minor, 0);
      const owed = (data ?? []).filter((d) => d.direction === "they_owe").reduce((s, d) => s + d.amount_minor, 0);
      const detail = (data ?? [])
        .map((d) => (d.direction === "i_owe" ? `• Le debes a ${d.counterparty}: ${pesos(d.amount_minor)}` : `• ${d.counterparty} te debe: ${pesos(d.amount_minor)}`))
        .join("\n");
      return `🤝 <b>Deudas</b>\nDebes: ${pesos(owe)} · Te deben: ${pesos(owed)}${detail ? `\n${detail}` : ""}`;
    }

    if (q.type === "recent") {
      const { data } = await db
        .from("transactions")
        .select("kind, amount_minor, description, occurred_at")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(5);
      if (!data?.length) return "No tienes movimientos aún.";
      const lines = data
        .map((t) => {
          const signed = t.kind === "income" ? "+" : "−";
          return `• ${signed}${pesos(t.amount_minor)} · ${t.description ?? t.kind} (${new Date(t.occurred_at).toLocaleDateString("es-CO")})`;
        })
        .join("\n");
      return `🧾 <b>Últimos movimientos</b>\n${lines}`;
    }

    if (q.type === "income") {
      const rows = await sumByKind("income");
      const total = rows.reduce((s, t) => s + t.amount_minor, 0);
      return `💵 <b>Ingresos ${periodLabel}:</b> ${pesos(total)}`;
    }

    // expenses + top_categories: traer gastos del periodo.
    const { data: cats } = await db.from("categories").select("id, name").eq("user_id", userId);
    const catName = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));
    const txs = await sumByKind("expense");

    if (q.type === "top_categories") {
      const byCat = new Map<string, number>();
      for (const t of txs) byCat.set(t.category_id ?? "otros", (byCat.get(t.category_id ?? "otros") ?? 0) + t.amount_minor);
      const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (!top.length) return `No registras gastos ${periodLabel}.`;
      const lines = top.map(([id, v]) => `• ${catName.get(id) ?? "Otros"}: ${pesos(v)}`).join("\n");
      return `📊 <b>En lo que más gastas ${periodLabel}:</b>\n${lines}`;
    }

    // expenses (opcional por categoría)
    let rows = txs;
    let catLabel = "";
    if (q.category) {
      const match = (cats ?? []).find((c) => (c.name as string).toLowerCase().includes(q.category!.toLowerCase()));
      if (match) {
        rows = rows.filter((t) => t.category_id === match.id);
        catLabel = ` en ${match.name}`;
      }
    }
    const total = rows.reduce((s, t) => s + t.amount_minor, 0);
    return `💸 <b>Gastos${catLabel} ${periodLabel}:</b> ${pesos(total)}`;
  } catch (e) {
    return `⚠️ No pude calcular eso: ${(e as Error).message}`;
  }
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
