import { Money } from "@platica/core";
import type {
  AccountType,
  DebtDraft,
  ExtractResult,
  Frequency,
  ImageInterpreter,
  InterpretContext,
  QueryIntent,
  RecurrenceDraft,
  TextInterpreter,
  TransactionDraft,
  TransactionKind,
} from "@platica/core";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const ACCOUNT_TYPES: AccountType[] = ["bank", "cash", "investment", "wallet", "credit"];

/** Esquema: lista de ítems; cada uno es un movimiento o una deuda. */
const responseSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["expense", "income", "investment", "transfer"] },
          amount: { type: "number", description: "Monto en la moneda local, positivo" },
          currency: { type: "string" },
          category: { type: "string", description: "Categoría lógica del gasto/ingreso" },
          categoryEmoji: { type: "string", description: "Un emoji que represente la categoría" },
          account: { type: "string", description: "Cuenta/medio de ORIGEN: efectivo, tarjeta de crédito, Nequi, banco…" },
          accountType: { type: "string", enum: ["bank", "cash", "investment", "wallet", "credit"] },
          transferTo: { type: "string", description: "Cuenta DESTINO si es transferencia entre cuentas (pasé de A a B → B)" },
          description: { type: "string" },
          isDebt: { type: "boolean", description: "true si es préstamo/deuda con una persona" },
          counterparty: { type: "string", description: "Persona involucrada en la deuda" },
          debtDirection: { type: "string", enum: ["i_owe", "they_owe"], description: "i_owe: me prestaron; they_owe: yo presté" },
          isRecurring: { type: "boolean", description: "true si es un pago fijo que se repite (arriendo, suscripción, sueldo mensual)" },
          frequency: { type: "string", enum: ["weekly", "biweekly", "monthly", "yearly"] },
          dayOfMonth: { type: "number", description: "Día del mes en que se paga (1-31), si aplica" },
          confidence: { type: "number" },
        },
        required: ["kind", "amount", "currency", "confidence"],
      },
    },
    query: {
      type: "object",
      description: "Si el usuario hace una PREGUNTA sobre sus finanzas (no registra nada)",
      properties: {
        type: {
          type: "string",
          enum: ["balance", "expenses", "income", "debts", "top_categories", "recent"],
        },
        category: { type: "string" },
        period: { type: "string", enum: ["this_month", "last_month", "all"] },
      },
    },
    savings: {
      type: "object",
      description:
        "Si el usuario habla de AHORRO: apartar/guardar plata, mover al ahorro, fijar una meta de ahorro, o preguntar cuánto tiene ahorrado. NO uses 'items' en ese caso.",
      properties: {
        action: { type: "string", enum: ["save", "goal", "query"], description: "save=apartar/guardar/mover al ahorro; goal=fijar meta; query=cuánto tengo ahorrado" },
        name: { type: "string", description: "Título del ahorro si lo menciona (ej. «para la casa» → Casa, «celular», «ropa», «regalo»)" },
        account: { type: "string", description: "Cuenta donde se ahorra o de la meta (ej. Bancolombia)" },
        fromAccount: { type: "string", description: "Cuenta de DONDE sale la plata, si la menciona (ej. «desde Nequi»)" },
        amount: { type: "number", description: "Monto a apartar/ahorrar" },
        goal: { type: "number", description: "Monto objetivo de la meta" },
      },
    },
    reply: {
      type: "string",
      description:
        "Si el usuario SOLO conversa (saluda, agradece, hace una broma, pregunta cómo estás o qué puedes hacer) y NO registra ni consulta datos, responde aquí de forma breve, cálida y humana. Vacío si hay items o query.",
    },
  },
  required: ["items"],
} as const;

function buildPrompt(ctx: InterpretContext): string {
  return [
    "Eres PlaticApp, un asistente financiero personal con personalidad cercana, cálida y colombiana. Tuteas, eres breve y usas uno o dos emojis con naturalidad. Animas a la persona a llevar sus finanzas sin sonar robótico.",
    "Tu trabajo principal es registrar y consultar finanzas, PERO también puedes conversar como un amigo dentro del ecosistema PlaticApp.",
    "Extrae TODOS los movimientos/deudas que mencione el usuario; si hay varios, uno por cada uno.",
    `Moneda por defecto: ${ctx.defaultCurrency}. Si no se indica, usa esa.`,
    "Montos en lenguaje natural: '50 mil'=50000, '2 lucas'=2000, '1.5M'=1500000, '40k'=40000.",
    "Detecta el medio de pago en 'account' (efectivo, tarjeta de crédito, Nequi, Daviplata, banco…) y su 'accountType' (cash/credit/wallet/bank/investment).",
    "Si mueve plata entre SUS propias cuentas (ej. «pasé 100 mil de Nequi a Bancolombia», «retiré del banco a efectivo»), kind=transfer, account=ORIGEN y transferTo=DESTINO. No es gasto ni ingreso.",
    "Asigna la categoría MÁS LÓGICA según el comercio o concepto. Reconoces marcas: Netflix/Spotify/Disney+/HBO/YouTube Premium → Entretenimiento; Uber/Didi/taxi/gasolina/bus/peaje → Transporte; Rappi/restaurante/almuerzo/mercado/café → Comida; arriendo/servicios/luz/agua/internet → Hogar; EPS/farmacia/médico → Salud; gimnasio → Salud; salario/nómina → Salario. Prefiere una categoría existente si encaja; si no, propón una nueva con nombre corto y su 'categoryEmoji'.",
    "Si alguien te prestó o tú prestaste plata, marca isDebt=true, pon 'counterparty' (la persona) y 'debtDirection' (i_owe si te prestaron, they_owe si tú prestaste).",
    "Si es un pago FIJO que se repite (arriendo, Netflix/suscripción, sueldo mensual, 'todos los meses', 'cada mes', 'fijo'), marca isRecurring=true con su 'frequency' (monthly por defecto) y 'dayOfMonth' si lo mencionan ('el día 5' → 5).",
    ctx.knownCategories.length ? `Categorías existentes (prefiere estas): ${ctx.knownCategories.join(", ")}.` : "",
    ctx.knownAccounts.length ? `Cuentas existentes: ${ctx.knownAccounts.join(", ")}.` : "",
    ctx.knownMerchants?.length
      ? `Conceptos ya registrados con su monto (formato concepto=monto): ${ctx.knownMerchants.join(", ")}. Si el usuario menciona uno de estos SIN decir el monto (ej. "el Netflix que ya sabes"), usa ese monto conocido.`
      : "",
    "Si no hay ningún movimiento ni deuda, devuelve items vacío.",
    "Si el usuario PREGUNTA por sus finanzas (ej. «¿cuánto debo?», «¿cuánto gasté en comida este mes?», «¿cuánto tengo?», «¿en qué gasto más?», «mis últimos movimientos»), NO registres nada: llena 'query' con type (balance=cuánto tengo, expenses=gastos, income=ingresos, debts=deudas, top_categories=en qué gasto más, recent=últimos), 'category' si menciona una, y 'period' (this_month por defecto, last_month, all).",
    "Puede venir un «Contexto reciente» con los últimos turnos de la charla. Úsalo SOLO para entender referencias y seguimientos del «Mensaje actual» (ej. «y otros 20 en taxi», «no, eran 30 mil», «con Nequi», «¿y el mes pasado?»). Registra o consulta ÚNICAMENTE lo del mensaje actual; NO repitas lo que ya estaba en el contexto.",
    "Si el usuario habla de AHORRO (ej. «aparta 200 mil para la casa en Bancolombia», «guarda 100 mil para el celular», «mueve 50 mil al ahorro de ropa desde Nequi», «la meta del ahorro de viaje es 5 millones», «¿cuánto tengo ahorrado?»), llena 'savings' (action save/goal/query, name=título del ahorro si lo dice, account, fromAccount si lo dice, amount, goal) y NO uses items. 'save'=apartar/abonar o mover al ahorro; 'goal'=fijar meta; 'query'=consultar lo ahorrado.",
    "Si el usuario SOLO conversa o saluda (ej. «hola», «gracias», «¿cómo estás?», «¿qué puedes hacer?», «buenos días») y NO hay nada que registrar ni consultar, deja items vacío y responde en 'reply' de forma humana y breve, recordándole con naturalidad que puede contarte un gasto/ingreso o preguntarte por sus finanzas, y que en la app web ve sus gráficos y métricas. No inventes cifras.",
  ]
    .filter(Boolean)
    .join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

interface RawSavings {
  action?: "save" | "goal" | "query";
  name?: string;
  account?: string;
  fromAccount?: string;
  amount?: number;
  goal?: number;
}

interface GenResult {
  items: RawItem[];
  query: QueryIntent | null;
  savings: RawSavings | null;
  reply: string | null;
}

async function generate(body: Record<string, unknown>): Promise<GenResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");

  // Cadena de modelos: si el principal está saturado (503), cae al siguiente.
  const primary = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const models = [...new Set([primary, "gemini-2.5-flash-lite", "gemini-flash-latest"])];
  const payload = JSON.stringify({
    ...body,
    generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
  });

  let lastErr = "";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${ENDPOINT}/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
        });
        if (res.ok) {
          const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text) as { items?: RawItem[]; query?: QueryIntent; savings?: RawSavings; reply?: string };
            const query = parsed.query && parsed.query.type ? parsed.query : null;
            const savings = parsed.savings && parsed.savings.action ? parsed.savings : null;
            const reply = parsed.reply?.trim() ? parsed.reply.trim() : null;
            return { items: parsed.items ?? [], query, savings, reply };
          }
          lastErr = "vacío";
        } else {
          lastErr = `${res.status}`;
          if (!RETRYABLE.has(res.status)) break; // error del modelo => probar el siguiente
        }
      } catch (e) {
        lastErr = (e as Error).message;
      }
      await sleep(400 * (attempt + 1));
    }
  }
  throw new Error(`SATURADO (${lastErr})`);
}

interface RawItem {
  kind: TransactionKind;
  amount: number;
  currency: string;
  category?: string;
  categoryEmoji?: string;
  account?: string;
  accountType?: string;
  transferTo?: string;
  description?: string;
  isDebt?: boolean;
  counterparty?: string;
  debtDirection?: "i_owe" | "they_owe";
  isRecurring?: boolean;
  frequency?: "weekly" | "biweekly" | "monthly" | "yearly";
  dayOfMonth?: number;
  confidence: number;
}

function split(
  raws: RawItem[],
  query: QueryIntent | null,
  savingsRaw: RawSavings | null,
  reply: string | null,
  ctx: InterpretContext,
  source: TransactionDraft["source"],
): ExtractResult {
  const transactions: TransactionDraft[] = [];
  const debts: DebtDraft[] = [];
  const recurrences: RecurrenceDraft[] = [];

  for (const r of raws) {
    const amount = Money.fromMajor(r.amount, r.currency || ctx.defaultCurrency);
    if (r.isRecurring) {
      recurrences.push({
        name: r.description || r.category || "Pago fijo",
        kind: r.kind,
        amount,
        categoryHint: r.category || undefined,
        accountHint: r.account || undefined,
        frequency: (r.frequency as Frequency) || "monthly",
        dayOfMonth: r.dayOfMonth || undefined,
      });
    } else if (r.isDebt && r.counterparty) {
      debts.push({
        counterparty: r.counterparty,
        // Si la IA no da dirección, se infiere: ingreso => me prestaron; gasto => yo presté.
        direction: r.debtDirection ?? (r.kind === "income" ? "i_owe" : "they_owe"),
        amount,
        description: r.description || undefined,
      });
    } else {
      const accountType = ACCOUNT_TYPES.includes(r.accountType as AccountType)
        ? (r.accountType as AccountType)
        : undefined;
      transactions.push({
        kind: r.kind,
        amount,
        categoryHint: r.category || undefined,
        categoryEmojiHint: r.categoryEmoji || undefined,
        accountHint: r.account || undefined,
        accountTypeHint: accountType,
        transferToHint: r.transferTo || undefined,
        description: r.description || undefined,
        occurredAt: ctx.now,
        confidence: r.confidence ?? 0.5,
        source,
      });
    }
  }
  // Ahorro solo si no hay movimientos que registrar (evita doble interpretación).
  const savings =
    savingsRaw && savingsRaw.action && transactions.length === 0
      ? {
          action: savingsRaw.action,
          name: savingsRaw.name || undefined,
          accountHint: savingsRaw.account || undefined,
          fromAccountHint: savingsRaw.fromAccount || undefined,
          amount: typeof savingsRaw.amount === "number" ? savingsRaw.amount : undefined,
          goal: typeof savingsRaw.goal === "number" ? savingsRaw.goal : undefined,
        }
      : null;

  // Si hay algo que registrar/consultar/ahorrar, ignoramos la charla.
  const finalReply =
    transactions.length || debts.length || recurrences.length || query || savings ? null : reply;
  return { transactions, debts, recurrences, query, savings, reply: finalReply };
}

/** Genera texto libre (sin esquema), con la misma cadena de modelos y reintentos. */
export async function summarize(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");
  const models = [...new Set([process.env.GEMINI_MODEL || "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"])];
  const payload = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5 },
  });
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${ENDPOINT}/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
        });
        if (res.ok) {
          const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } else if (!RETRYABLE.has(res.status)) break;
      } catch {
        /* reintenta */
      }
      await sleep(400 * (attempt + 1));
    }
  }
  throw new Error("SATURADO");
}

/**
 * Conversación libre con persona + memoria multi-turno + instrucción de sistema.
 * Para charla, consejos y preguntas que no son registro/consulta estructurada.
 */
export async function chat(
  system: string,
  history: { role: "user" | "model"; text: string }[],
  userText: string,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");
  const models = [...new Set([process.env.GEMINI_MODEL || "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"])];
  const contents = [
    ...history.map((h) => ({ role: h.role === "model" ? "model" : "user", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 320 },
  });
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${ENDPOINT}/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
        });
        if (res.ok) {
          const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } else if (!RETRYABLE.has(res.status)) break;
      } catch {
        /* reintenta */
      }
      await sleep(400 * (attempt + 1));
    }
  }
  throw new Error("SATURADO");
}

export const geminiText: TextInterpreter = {
  async interpret(text, ctx, history) {
    const ctxBlock =
      history && history.length
        ? `Contexto reciente:\n${history.map((h) => `${h.role === "user" ? "Usuario" : "PlaticApp"}: ${h.text}`).join("\n")}\n\n`
        : "";
    const { items, query, savings, reply } = await generate({
      contents: [{ role: "user", parts: [{ text: `${buildPrompt(ctx)}\n\n${ctxBlock}Mensaje actual del usuario: ${text}` }] }],
    });
    return split(items, query, savings, reply, ctx, "telegram_text");
  },
};

export const geminiImage: ImageInterpreter = {
  async interpret(image, mimeType, ctx) {
    const base64 = Buffer.from(image).toString("base64");
    const { items, query, savings, reply } = await generate({
      contents: [
        {
          role: "user",
          parts: [
            { text: `${buildPrompt(ctx)}\n\nExtrae la(s) transacción(es) de este recibo/imagen.` },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
    });
    return split(items, query, savings, reply, ctx, "telegram_image");
  },
};
