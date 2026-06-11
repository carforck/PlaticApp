import { assertValidNewTransaction } from "../domain/transaction";
import type { NewTransaction, Transaction } from "../domain/transaction";
import type { AccountRepository, CategoryRepository, TransactionRepository } from "../ports/index";

/**
 * Caso de uso: registrar una transacción ya CONFIRMADA por el usuario.
 * Resuelve hints (texto -> ids), valida invariantes y persiste.
 * Es agnóstico al canal (Telegram o web) y a la infraestructura.
 */
export class RegisterTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(input: RegisterTransactionInput): Promise<Transaction> {
    let account = input.accountHint
      ? await this.accounts.findByNameHint(input.userId, input.accountHint)
      : null;

    // Si mencionó una cuenta que no existe, se crea (cuentas intuitivas por chat).
    if (!account && input.accountHint) {
      account = await this.accounts.create(
        input.userId,
        titleCase(input.accountHint),
        input.accountType ?? "cash",
      );
    }

    // Sin hint: usa la primera cuenta del usuario como predeterminada.
    account ??= (await this.accounts.listByUser(input.userId))[0] ?? null;

    if (!account) throw new Error("El usuario no tiene ninguna cuenta configurada");

    const category = input.categoryHint
      ? await this.categories.findByNameHint(input.userId, input.categoryHint)
      : null;

    const newTx: NewTransaction = {
      userId: input.userId,
      kind: input.kind,
      amount: input.amount,
      accountId: account.id,
      categoryId: category?.id ?? null,
      description: input.description ?? null,
      occurredAt: input.occurredAt,
      source: input.source,
    };

    assertValidNewTransaction(newTx);
    return this.transactions.create(newTx);
  }
}

import type { Money } from "../domain/money";
import type { AccountType, SourceChannel, TransactionKind } from "../domain/types";

export interface RegisterTransactionInput {
  userId: string;
  kind: TransactionKind;
  amount: Money;
  accountHint?: string;
  accountType?: AccountType;
  categoryHint?: string;
  description?: string;
  occurredAt: Date;
  source: SourceChannel;
}

function titleCase(s: string): string {
  return s.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
