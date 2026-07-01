import type { SupabaseClient } from "@supabase/supabase-js";

export interface AccountRow {
  account_id: string;
  name: string;
  type: string;
  currency: string;
  balance_minor: number;
  opening_minor: number;
  reserved_minor: number;
}

export interface SavingRow {
  id: string;
  account_id: string;
  name: string;
  reserved_minor: number;
  goal_minor: number | null;
}

export interface TxRow {
  id: string;
  kind: "expense" | "income" | "investment" | "transfer";
  amount_minor: number;
  currency: string;
  account_id: string;
  transfer_account_id: string | null;
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

export interface DebtRow {
  id: string;
  counterparty: string;
  direction: "i_owe" | "they_owe";
  amount_minor: number;
  currency: string;
  description: string | null;
  status: "open" | "settled";
  created_at: string;
  account_id: string | null;
  moves_at: "creation" | "settlement";
  settle_account_id: string | null;
}

export interface DebtPaymentRow {
  id: string;
  debt_id: string;
  amount_minor: number;
  account_id: string | null;
  note: string | null;
  created_at: string;
}

export interface RecurrenceRow {
  id: string;
  name: string;
  kind: "expense" | "income" | "investment" | "transfer";
  amount_minor: number;
  currency: string;
  category_id: string | null;
  account_id: string | null;
  frequency: "weekly" | "biweekly" | "monthly" | "yearly";
  day_of_month: number | null;
  next_due: string;
  active: boolean;
}

export interface ReceiptRow {
  id: string;
  path: string;
  caption: string | null;
  created_at: string;
}

export interface BudgetRow {
  id: string;
  category_id: string | null;
  amount_minor: number;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  emoji: string;
  tag: "nuevo" | "mejora" | "arreglo";
  created_at: string;
}

export interface DashboardData {
  accounts: AccountRow[];
  transactions: TxRow[];
  categories: CategoryRow[];
  debts: DebtRow[];
  debtPayments: DebtPaymentRow[];
  recurrences: RecurrenceRow[];
  receipts: ReceiptRow[];
  budgets: BudgetRow[];
  announcements: AnnouncementRow[];
  savings: SavingRow[];
}

/** Trae todo lo que el dashboard necesita. Sirve para server y browser client. */
export async function fetchDashboard(supabase: SupabaseClient): Promise<DashboardData> {
  const [accounts, transactions, categories, debts, debtPayments, recurrences, receipts, budgets, announcements, savings] = await Promise.all([
    supabase.from("account_balances").select("*"),
    supabase
      .from("transactions")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase.from("categories").select("*"),
    supabase.from("debts").select("*").order("created_at", { ascending: false }),
    supabase.from("debt_payments").select("id, debt_id, amount_minor, account_id, note, created_at").order("created_at", { ascending: false }),
    supabase.from("recurrences").select("*").order("next_due", { ascending: true }),
    supabase.from("receipts").select("id, path, caption, created_at").order("created_at", { ascending: false }).limit(60),
    supabase.from("budgets").select("id, category_id, amount_minor"),
    supabase.from("announcements").select("id, title, body, emoji, tag, created_at").eq("published", true).order("created_at", { ascending: false }).limit(50),
    supabase.from("savings").select("id, account_id, name, reserved_minor, goal_minor").order("created_at", { ascending: true }),
  ]);

  return {
    accounts: (accounts.data as AccountRow[]) ?? [],
    transactions: (transactions.data as TxRow[]) ?? [],
    categories: (categories.data as CategoryRow[]) ?? [],
    debts: (debts.data as DebtRow[]) ?? [],
    debtPayments: (debtPayments.data as DebtPaymentRow[]) ?? [],
    recurrences: (recurrences.data as RecurrenceRow[]) ?? [],
    receipts: (receipts.data as ReceiptRow[]) ?? [],
    budgets: (budgets.data as BudgetRow[]) ?? [],
    announcements: (announcements.data as AnnouncementRow[]) ?? [],
    savings: (savings.data as SavingRow[]) ?? [],
  };
}
