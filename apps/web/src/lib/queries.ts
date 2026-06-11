import type { SupabaseClient } from "@supabase/supabase-js";

export interface AccountRow {
  account_id: string;
  name: string;
  type: string;
  currency: string;
  balance_minor: number;
}

export interface TxRow {
  id: string;
  kind: "expense" | "income" | "investment" | "transfer";
  amount_minor: number;
  currency: string;
  account_id: string;
  category_id: string | null;
  description: string | null;
  occurred_at: string;
  source: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  applies_to: string | null;
}

export interface DashboardData {
  accounts: AccountRow[];
  transactions: TxRow[];
  categories: CategoryRow[];
}

/** Trae todo lo que el dashboard necesita. Sirve para server y browser client. */
export async function fetchDashboard(supabase: SupabaseClient): Promise<DashboardData> {
  const [accounts, transactions, categories] = await Promise.all([
    supabase.from("account_balances").select("*"),
    supabase
      .from("transactions")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase.from("categories").select("*"),
  ]);

  return {
    accounts: (accounts.data as AccountRow[]) ?? [],
    transactions: (transactions.data as TxRow[]) ?? [],
    categories: (categories.data as CategoryRow[]) ?? [],
  };
}
