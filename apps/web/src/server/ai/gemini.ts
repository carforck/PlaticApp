import { Money } from "@platica/core";
import type {
  AccountType,
  DebtDraft,
  ExtractResult,
  Frequency,
  ImageInterpreter,
  InterpretContext,
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
          account: { type: "string", description: "Cuenta/medio: efectivo, tarjeta de crédito, Nequi, banco…" },
          accountType: { type: "string", enum: ["bank", "cash", "investment", "wallet", "credit"] },
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
  },
  required: ["items"],
} as const;

function buildPrompt(ctx: InterpretContext): string {
  return [
    "Eres el motor de un asistente financiero personal en español (Colombia).",
    "Extrae TODOS los movimientos/deudas que mencione el usuario; si hay varios, uno por cada uno.",
    `Moneda por defecto: ${ctx.defaultCurrency}. Si no se indica, usa esa.`,
    "Montos en lenguaje natural: '50 mil'=50000, '2 lucas'=2000, '1.5M'=1500000, '40k'=40000.",
    "Detecta el medio de pago en 'account' (efectivo, tarjeta de crédito, Nequi, Daviplata, banco…) y su 'accountType' (cash/credit/wallet/bank/investment).",
    "Asigna la categoría MÁS LÓGICA según el comercio o concepto. Reconoces marcas: Netflix/Spotify/Disney+/HBO/YouTube Premium → Entretenimiento; Uber/Didi/taxi/gasolina/bus/peaje → Transporte; Rappi/restaurante/almuerzo/mercado/café → Comida; arriendo/servicios/luz/agua/internet → Hogar; EPS/farmacia/médico → Salud; gimnasio → Salud; salario/nómina → Salario. Prefiere una categoría existente si encaja; si no, propón una nueva con nombre corto y su 'categoryEmoji'.",
    "Si alguien te prestó o tú prestaste plata, marca isDebt=true, pon 'counterparty' (la persona) y 'debtDirection' (i_owe si te prestaron, they_owe si tú prestaste).",
    "Si es un pago FIJO que se repite (arriendo, Netflix/suscripción, sueldo mensual, 'todos los meses', 'cada mes', 'fijo'), marca isRecurring=true con su 'frequency' (monthly por defecto) y 'dayOfMonth' si lo mencionan ('el día 5' → 5).",
    ctx.knownCategories.length ? `Categorías existentes (prefiere estas): ${ctx.knownCategories.join(", ")}.` : "",
    ctx.knownAccounts.length ? `Cuentas existentes: ${ctx.knownAccounts.join(", ")}.` : "",
    ctx.knownMerchants?.length
      ? `Conceptos ya registrados con su monto (formato concepto=monto): ${ctx.knownMerchants.join(", ")}. Si el usuario menciona uno de estos SIN decir el monto (ej. "el Netflix que ya sabes"), usa ese monto conocido.`
      : "",
    "Si no hay ningún movimiento ni deuda, devuelve items vacío.",
  ]
    .filter(Boolean)
    .join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

async function generate(body: Record<string, unknown>): Promise<RawItem[]> {
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
          if (text) return (JSON.parse(text).items ?? []) as RawItem[];
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
  description?: string;
  isDebt?: boolean;
  counterparty?: string;
  debtDirection?: "i_owe" | "they_owe";
  isRecurring?: boolean;
  frequency?: "weekly" | "biweekly" | "monthly" | "yearly";
  dayOfMonth?: number;
  confidence: number;
}

function split(raws: RawItem[], ctx: InterpretContext, source: TransactionDraft["source"]): ExtractResult {
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
        description: r.description || undefined,
        occurredAt: ctx.now,
        confidence: r.confidence ?? 0.5,
        source,
      });
    }
  }
  return { transactions, debts, recurrences };
}

export const geminiText: TextInterpreter = {
  async interpret(text, ctx) {
    const raws = await generate({
      contents: [{ role: "user", parts: [{ text: `${buildPrompt(ctx)}\n\nUsuario: ${text}` }] }],
    });
    return split(raws, ctx, "telegram_text");
  },
};

export const geminiImage: ImageInterpreter = {
  async interpret(image, mimeType, ctx) {
    const base64 = Buffer.from(image).toString("base64");
    const raws = await generate({
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
    return split(raws, ctx, "telegram_image");
  },
};
