import { Money } from "@platica/core";
import type {
  Account,
  AccountRepository,
  AccountType,
  Category,
  CategoryRepository,
  Debt,
  DebtRepository,
  IdempotencyStore,
  NewDebt,
  NewTransaction,
  Transaction,
  TransactionRepository,
} from "@platica/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Repos de Supabase. Filtran por user_id a mano porque el admin se salta RLS. */

export function transactionRepo(db: SupabaseClient): TransactionRepository {
  return {
    async create(tx: NewTransaction): Promise<Transaction> {
      const { data, error } = await db
        .from("transactions")
        .insert({
          user_id: tx.userId,
          kind: tx.kind,
          amount_minor: tx.amount.minorUnits,
          currency: tx.amount.currency,
          account_id: tx.accountId,
          transfer_account_id: tx.transferAccountId ?? null,
          category_id: tx.categoryId ?? null,
          description: tx.description ?? null,
          occurred_at: tx.occurredAt.toISOString(),
          source: tx.source,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        userId: data.user_id,
        kind: data.kind,
        amount: Money.of(data.amount_minor, data.currency),
        accountId: data.account_id,
        categoryId: data.category_id,
        description: data.description,
        occurredAt: new Date(data.occurred_at),
        source: data.source,
        createdAt: new Date(data.created_at),
      };
    },

    async listByUser(userId, opts) {
      let q = db.from("transactions").select("*").eq("user_id", userId);
      if (opts?.from) q = q.gte("occurred_at", opts.from.toISOString());
      if (opts?.to) q = q.lte("occurred_at", opts.to.toISOString());
      const { data, error } = await q.order("occurred_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((d) => ({
        id: d.id,
        userId: d.user_id,
        kind: d.kind,
        amount: Money.of(d.amount_minor, d.currency),
        accountId: d.account_id,
        categoryId: d.category_id,
        description: d.description,
        occurredAt: new Date(d.occurred_at),
        source: d.source,
        createdAt: new Date(d.created_at),
      }));
    },
  };
}

export function accountRepo(db: SupabaseClient): AccountRepository {
  const map = (d: Record<string, unknown>): Account => ({
    id: d.id as string,
    userId: d.user_id as string,
    name: d.name as string,
    type: d.type as Account["type"],
    currency: d.currency as string,
    balance: Money.of(0, d.currency as string), // saldo se calcula aparte (vista)
    archived: d.archived as boolean,
  });
  return {
    async listByUser(userId) {
      const { data, error } = await db
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []).map(map);
    },
    async findByNameHint(userId, hint) {
      const { data } = await db
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .ilike("name", `%${hint}%`)
        .limit(1)
        .maybeSingle();
      return data ? map(data) : null;
    },
    async create(userId, name, type: AccountType) {
      const { data, error } = await db
        .from("accounts")
        .insert({ user_id: userId, name, type })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return map(data);
    },
  };
}

export function debtRepo(db: SupabaseClient): DebtRepository {
  const map = (d: Record<string, unknown>): Debt => ({
    id: d.id as string,
    userId: d.user_id as string,
    counterparty: d.counterparty as string,
    direction: d.direction as Debt["direction"],
    amount: Money.of(d.amount_minor as number, d.currency as string),
    description: (d.description as string) ?? null,
    status: d.status as Debt["status"],
    createdAt: new Date(d.created_at as string),
  });
  return {
    async create(debt: NewDebt) {
      const { data, error } = await db
        .from("debts")
        .insert({
          user_id: debt.userId,
          counterparty: debt.counterparty,
          direction: debt.direction,
          amount_minor: debt.amount.minorUnits,
          currency: debt.amount.currency,
          description: debt.description ?? null,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return map(data);
    },
    async listByUser(userId) {
      const { data, error } = await db
        .from("debts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(map);
    },
  };
}

export function categoryRepo(db: SupabaseClient): CategoryRepository {
  const map = (d: Record<string, unknown>): Category => ({
    id: d.id as string,
    userId: d.user_id as string,
    name: d.name as string,
    appliesTo: (d.applies_to as Category["appliesTo"]) ?? null,
    emoji: (d.emoji as string) ?? null,
    color: (d.color as string) ?? null,
  });
  return {
    async listByUser(userId) {
      const { data, error } = await db.from("categories").select("*").eq("user_id", userId);
      if (error) throw new Error(error.message);
      return (data ?? []).map(map);
    },
    async findByNameHint(userId, hint) {
      const { data } = await db
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .ilike("name", `%${hint}%`)
        .limit(1)
        .maybeSingle();
      return data ? map(data) : null;
    },
    async create(userId, name, appliesTo, emoji, color) {
      const { data, error } = await db
        .from("categories")
        .insert({ user_id: userId, name, applies_to: appliesTo, emoji, color })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return map(data);
    },
  };
}

/** Idempotencia: inserta el update_id; si ya existía, no es nuevo. */
export function idempotencyStore(db: SupabaseClient): IdempotencyStore {
  return {
    async claim(key: string): Promise<boolean> {
      const { error } = await db.from("processed_updates").insert({ update_id: Number(key) });
      if (!error) return true; // insertado => nuevo
      if (error.code === "23505") return false; // duplicado => ya procesado
      throw new Error(error.message);
    },
  };
}
