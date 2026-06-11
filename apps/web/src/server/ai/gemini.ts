import { Money } from "@platica/core";
import type {
  ImageInterpreter,
  InterpretContext,
  TextInterpreter,
  TransactionDraft,
  TransactionKind,
} from "@platica/core";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Esquema: una LISTA de transacciones (un mensaje puede tener varias). */
const responseSchema = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["expense", "income", "investment", "transfer"] },
          amount: { type: "number", description: "Monto en la moneda local, número positivo" },
          currency: { type: "string" },
          category: { type: "string", description: "Categoría sugerida" },
          account: { type: "string", description: "Cuenta/medio de pago sugerido" },
          description: { type: "string" },
          confidence: { type: "number", description: "0 a 1" },
        },
        required: ["kind", "amount", "currency", "confidence"],
      },
    },
  },
  required: ["transactions"],
} as const;

function buildPrompt(ctx: InterpretContext): string {
  return [
    "Eres el motor de un asistente financiero personal en español (Colombia).",
    "Extrae TODAS las transacciones que mencione el usuario; si menciona varias, devuelve una por cada una.",
    `Moneda por defecto: ${ctx.defaultCurrency}. Si no se indica moneda, usa esa.`,
    "Interpreta montos en lenguaje natural: '50 mil' = 50000, '2 lucas' = 2000, '1.5M' = 1500000, '40k' = 40000.",
    "Cada transacción: gasto (expense), ingreso (income), inversión (investment) o transferencia (transfer).",
    ctx.knownCategories.length ? `Categorías existentes (prefiere estas): ${ctx.knownCategories.join(", ")}.` : "",
    ctx.knownAccounts.length ? `Cuentas existentes: ${ctx.knownAccounts.join(", ")}.` : "",
    "Si el mensaje no menciona ningún movimiento de dinero, devuelve una lista vacía.",
    "'confidence' refleja qué tan seguro estás de cada una.",
  ]
    .filter(Boolean)
    .join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generate(body: Record<string, unknown>): Promise<RawDraft[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let lastErr = "";
  // Reintenta ante saturación (503) o rate-limit transitorio (429/500).
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
      return (JSON.parse(text).transactions ?? []) as RawDraft[];
    }

    lastErr = `${res.status}`;
    if (res.status === 503 || res.status === 429 || res.status === 500) {
      await sleep(800 * (attempt + 1)); // backoff: 0.8s, 1.6s, 2.4s
      continue;
    }
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  throw new Error(`SATURADO (${lastErr})`);
}

interface RawDraft {
  kind: TransactionKind;
  amount: number;
  currency: string;
  category?: string;
  account?: string;
  description?: string;
  confidence: number;
}

function toDraft(raw: RawDraft, ctx: InterpretContext, source: TransactionDraft["source"]): TransactionDraft {
  return {
    kind: raw.kind,
    amount: Money.fromMajor(raw.amount, raw.currency || ctx.defaultCurrency),
    categoryHint: raw.category || undefined,
    accountHint: raw.account || undefined,
    description: raw.description || undefined,
    occurredAt: ctx.now,
    confidence: raw.confidence ?? 0.5,
    source,
  };
}

/** Adaptador Gemini: interpreta texto y devuelve TODAS las transacciones. */
export const geminiText: TextInterpreter = {
  async interpret(text, ctx) {
    const raws = await generate({
      contents: [{ role: "user", parts: [{ text: `${buildPrompt(ctx)}\n\nUsuario: ${text}` }] }],
    });
    return raws.map((r) => toDraft(r, ctx, "telegram_text"));
  },
};

/** Adaptador Gemini Vision: lee recibos/imágenes (puede haber varios ítems). */
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
    return raws.map((r) => toDraft(r, ctx, "telegram_image"));
  },
};
