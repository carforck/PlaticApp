import type { Account, Category } from "../domain/account";
import type { AccountType } from "../domain/types";
import type { Debt, DebtDraft, NewDebt } from "../domain/debt";
import type { NewTransaction, Transaction, TransactionDraft } from "../domain/transaction";

/**
 * Puertos (interfaces) que el dominio NECESITA. Los adaptadores de
 * infraestructura (Supabase, Gemini, Groq, Telegram) los implementan.
 * Así el dominio no conoce ningún framework: arquitectura hexagonal.
 */

// ── Persistencia ────────────────────────────────────────────────
export interface TransactionRepository {
  create(tx: NewTransaction): Promise<Transaction>;
  listByUser(userId: string, opts?: { from?: Date; to?: Date }): Promise<Transaction[]>;
}

export interface AccountRepository {
  listByUser(userId: string): Promise<Account[]>;
  findByNameHint(userId: string, hint: string): Promise<Account | null>;
  create(userId: string, name: string, type: AccountType): Promise<Account>;
}

export interface DebtRepository {
  create(debt: NewDebt): Promise<Debt>;
  listByUser(userId: string): Promise<Debt[]>;
}

export interface CategoryRepository {
  listByUser(userId: string): Promise<Category[]>;
  findByNameHint(userId: string, hint: string): Promise<Category | null>;
}

// ── IA: interpretación de lenguaje natural ──────────────────────
/** Resultado de interpretar un mensaje: movimientos y/o deudas. */
export interface ExtractResult {
  transactions: TransactionDraft[];
  debts: DebtDraft[];
}

/** Convierte texto libre en transacciones y/o deudas. (Adaptador: Gemini) */
export interface TextInterpreter {
  interpret(text: string, ctx: InterpretContext): Promise<ExtractResult>;
}

/** Transcribe audio a texto. (Adaptador: Groq Whisper) */
export interface AudioTranscriber {
  transcribe(audio: Uint8Array, mimeType: string): Promise<string>;
}

/** Extrae transacciones y/o deudas de una imagen/recibo. (Adaptador: Gemini Vision) */
export interface ImageInterpreter {
  interpret(image: Uint8Array, mimeType: string, ctx: InterpretContext): Promise<ExtractResult>;
}

/** Contexto que ayuda a la IA a clasificar mejor (categorías y cuentas del usuario). */
export interface InterpretContext {
  defaultCurrency: string;
  timezone: string;
  now: Date;
  knownCategories: string[];
  knownAccounts: string[];
}

// ── Idempotencia ────────────────────────────────────────────────
/**
 * Garantiza procesar una vez cada update de Telegram (que reintenta).
 * Devuelve true si el evento es NUEVO (hay que procesarlo), false si ya se vio.
 */
export interface IdempotencyStore {
  claim(key: string): Promise<boolean>;
}
