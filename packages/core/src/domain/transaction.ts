import { Money } from "./money";
import type { SourceChannel, TransactionKind } from "./types";

/**
 * Borrador de transacción: lo que la IA produce a partir de lo que el usuario
 * dijo/escribió/fotografió. Aún NO está confirmado ni persistido.
 * El bot lo muestra al usuario para confirmar antes de crear la Transaction real.
 */
export interface TransactionDraft {
  kind: TransactionKind;
  amount: Money;
  /** Texto crudo de la categoría sugerida por la IA (se resuelve a un id luego). */
  categoryHint?: string;
  /** Cuenta sugerida (ej. "efectivo", "Nequi"). Se resuelve a un id luego. */
  accountHint?: string;
  description?: string;
  occurredAt: Date;
  /** Confianza 0..1 de la interpretación de la IA. */
  confidence: number;
  source: SourceChannel;
}

/**
 * Transaction — entidad de dominio ya confirmada y válida.
 * Las invariantes se garantizan en la creación.
 */
export interface Transaction {
  readonly id: string;
  readonly userId: string;
  readonly kind: TransactionKind;
  readonly amount: Money;
  readonly accountId: string;
  readonly categoryId: string | null;
  readonly description: string | null;
  readonly occurredAt: Date;
  readonly source: SourceChannel;
  readonly createdAt: Date;
}

export interface NewTransaction {
  userId: string;
  kind: TransactionKind;
  amount: Money;
  accountId: string;
  categoryId?: string | null;
  description?: string | null;
  occurredAt: Date;
  source: SourceChannel;
}

/** Valida invariantes de negocio antes de persistir. Lanza si algo no cuadra. */
export function assertValidNewTransaction(t: NewTransaction): void {
  if (t.amount.isZero) throw new Error("El monto no puede ser cero");
  if (t.amount.minorUnits < 0) throw new Error("Usa el 'kind' para el signo, el monto es positivo");
  if (!t.accountId) throw new Error("Toda transacción necesita una cuenta");
}

/** Efecto de una transacción sobre el saldo de su cuenta (signo incluido). */
export function balanceEffect(kind: TransactionKind, amount: Money): Money {
  switch (kind) {
    case "income":
      return amount;
    case "expense":
    case "investment":
      return amount.negate();
    case "transfer":
      return amount.negate(); // la contraparte suma en la otra cuenta
  }
}
