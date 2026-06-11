import { Money } from "./money";
import type { AccountType } from "./types";

/** Account — dónde vive el dinero (banco, efectivo, inversión, billetera...). */
export interface Account {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly type: AccountType;
  readonly currency: string;
  /** Saldo calculado a partir de las transacciones. */
  readonly balance: Money;
  readonly archived: boolean;
}

/** Categoría de clasificación (Comida, Transporte, Salario...). */
export interface Category {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  /** Para qué tipo de movimiento aplica (gasto/ingreso). null = ambos. */
  readonly appliesTo: "expense" | "income" | null;
  readonly emoji: string | null;
  readonly color: string | null;
}
