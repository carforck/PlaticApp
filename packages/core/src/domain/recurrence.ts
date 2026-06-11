import { Money } from "./money";
import type { TransactionKind } from "./types";

export const FREQUENCIES = ["weekly", "biweekly", "monthly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** Plantilla de gasto/ingreso fijo que se repite. */
export interface Recurrence {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly kind: TransactionKind;
  readonly amount: Money;
  readonly categoryId: string | null;
  readonly accountId: string | null;
  readonly frequency: Frequency;
  readonly dayOfMonth: number | null;
  readonly nextDue: Date;
  readonly active: boolean;
}

/** Borrador de recurrencia detectado por la IA, pendiente de confirmar. */
export interface RecurrenceDraft {
  name: string;
  kind: TransactionKind;
  amount: Money;
  categoryHint?: string;
  accountHint?: string;
  frequency: Frequency;
  dayOfMonth?: number;
}

/** Primera fecha de vencimiento al crear una recurrencia. */
export function firstDueDate(frequency: Frequency, dayOfMonth: number | null, today: Date): Date {
  if (frequency === "monthly" && dayOfMonth) {
    const cand = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (cand <= today) cand.setMonth(cand.getMonth() + 1);
    return cand;
  }
  return nextOccurrence(today, frequency);
}

/** Calcula la siguiente fecha de vencimiento según la frecuencia. */
export function nextOccurrence(from: Date, frequency: Frequency): Date {
  const d = new Date(from);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}
