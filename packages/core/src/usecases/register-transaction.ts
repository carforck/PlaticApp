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
    const account =
      (input.accountHint && (await this.accounts.findByNameHint(input.userId, input.accountHint))) ||
      (await this.accounts.listByUser(input.userId))[0];

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
import type { SourceChannel, TransactionKind } from "../domain/types";

export interface RegisterTransactionInput {
  userId: string;
  kind: TransactionKind;
  amount: Money;
  accountHint?: string;
  categoryHint?: string;
  description?: string;
  occurredAt: Date;
  source: SourceChannel;
}
