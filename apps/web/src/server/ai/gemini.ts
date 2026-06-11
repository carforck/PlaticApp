import { Money } from "@platica/core";
import type {
  AccountType,
  DebtDraft,
  ExtractResult,
  ImageInterpreter,
  InterpretContext,
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
          category: { type: "string", description: "Categoría sugerida" },
          account: { type: "string", description: "Cuenta/medio: efectivo, tarjeta de crédito, Nequi, banco…" },
          accountType: { type: "string", enum: ["bank", "cash", "investment", "wallet", "credit"] },
          description: { type: "string" },
          isDebt: { type: "boolean", description: "true si es préstamo/deuda con una persona" },
          counterparty: { type: "string", description: "Persona involucrada en la deuda" },
          debtDirection: { type: "string", enum: ["i_owe", "they_owe"], description: "i_owe: me prestaron; they_owe: yo presté" },
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
    "Si alguien te prestó o tú prestaste plata, marca isDebt=true, pon 'counterparty' (la persona) y 'debtDirection' (i_owe si te prestaron, they_owe si tú prestaste).",
    ctx.knownCategories.length ? `Categorías existentes (prefiere estas): ${ctx.knownCategories.join(", ")}.` : "",
    ctx.knownAccounts.length ? `Cuentas existentes: ${ctx.knownAccounts.join(", ")}.` : "",
    "Si no hay ningún movimiento ni deuda, devuelve items vacío.",
  ]
    .filter(Boolean)
    .join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generate(body: Record<string, unknown>): Promise<RawItem[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...body,
        generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini no devolvió contenido");
      return (JSON.parse(text).items ?? []) as RawItem[];
    }

    lastErr = `${res.status}`;
    if (res.status === 503 || res.status === 429 || res.status === 500) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  throw new Error(`SATURADO (${lastErr})`);
}

interface RawItem {
  kind: TransactionKind;
  amount: number;
  currency: string;
  category?: string;
  account?: string;
  accountType?: string;
  description?: string;
  isDebt?: boolean;
  counterparty?: string;
  debtDirection?: "i_owe" | "they_owe";
  confidence: number;
}

function split(raws: RawItem[], ctx: InterpretContext, source: TransactionDraft["source"]): ExtractResult {
  const transactions: TransactionDraft[] = [];
  const debts: DebtDraft[] = [];

  for (const r of raws) {
    const amount = Money.fromMajor(r.amount, r.currency || ctx.defaultCurrency);
    if (r.isDebt && r.counterparty) {
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
        accountHint: r.account || undefined,
        accountTypeHint: accountType,
        description: r.description || undefined,
        occurredAt: ctx.now,
        confidence: r.confidence ?? 0.5,
        source,
      });
    }
  }
  return { transactions, debts };
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
