import { Money } from "./money";

/** Dirección de una deuda: yo debo, o me deben. */
export type DebtDirection = "i_owe" | "they_owe";

/** Deuda/préstamo ya registrada, contra una persona (contraparte). */
export interface Debt {
  readonly id: string;
  readonly userId: string;
  readonly counterparty: string;
  readonly direction: DebtDirection;
  readonly amount: Money;
  readonly description: string | null;
  readonly status: "open" | "settled";
  readonly createdAt: Date;
}

/** Borrador de deuda que produce la IA, pendiente de confirmar. */
export interface DebtDraft {
  counterparty: string;
  direction: DebtDirection;
  amount: Money;
  description?: string;
  /** Cuenta de la que sale/entra la plata del préstamo (texto a resolver). */
  accountHint?: string;
}

export interface NewDebt {
  userId: string;
  counterparty: string;
  direction: DebtDirection;
  amount: Money;
  description?: string | null;
  /** Cuenta cuyo saldo se afecta por el préstamo (id ya resuelto). */
  accountId?: string | null;
}
