"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { fmtMoney } from "@/lib/format";
import { KIND_EMOJI, KIND_LABEL, SOURCE_EMOJI } from "@/lib/labels";
import { AddTransactionModal } from "./AddTransactionModal";

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "expense", label: "Gastos" },
  { value: "income", label: "Ingresos" },
  { value: "investment", label: "Inversiones" },
] as const;

export function MovimientosClient() {
  const { data, refresh } = useDashboard();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const accById = useMemo(() => new Map(data.accounts.map((a) => [a.account_id, a])), [data.accounts]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.transactions.filter((t) => {
      if (filter !== "all" && t.kind !== filter) return false;
      if (!q) return true;
      const cat = catById.get(t.category_id ?? "")?.name ?? "";
      return (t.description ?? "").toLowerCase().includes(q) || cat.toLowerCase().includes(q);
    });
  }, [data.transactions, filter, search, catById]);

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Movimientos</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">{rows.length} movimientos</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
          + Registrar
        </button>
      </header>

      <div className="glass flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] p-3">
        <div className="flex gap-1 rounded-[10px] bg-black/[0.05] p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition ${
                filter === f.value ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descripción o categoría…"
          className="min-w-[220px] flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2"
        />
      </div>

      <div className="glass overflow-hidden rounded-[var(--radius-card)]">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-[14px] text-[var(--color-ink-soft)]">No hay movimientos que coincidan.</p>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-black/5 text-left text-[12px] text-[var(--color-ink-soft)]">
                <th className="px-5 py-3 font-medium">Concepto</th>
                <th className="px-3 py-3 font-medium">Cuenta</th>
                <th className="px-3 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const cat = catById.get(t.category_id ?? "");
                const acc = accById.get(t.account_id);
                const signed = t.kind === "income" ? t.amount_minor : -t.amount_minor;
                return (
                  <tr key={t.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">
                          {cat?.emoji ?? KIND_EMOJI[t.kind] ?? "🧾"}
                        </span>
                        <span>
                          <span className="block font-medium">{t.description ?? cat?.name ?? KIND_LABEL[t.kind]}</span>
                          <span className="block text-[12px] text-[var(--color-ink-soft)]">
                            {cat?.name ?? KIND_LABEL[t.kind]} · {SOURCE_EMOJI[t.source] ?? "•"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--color-ink-soft)]">{acc?.name ?? "—"}</td>
                    <td className="px-3 py-3 text-[var(--color-ink-soft)]">
                      {new Date(t.occurred_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${signed > 0 ? "text-[#30d158]" : "text-[var(--color-ink)]"}`}>
                      {signed > 0 ? "+" : ""}
                      {fmtMoney(signed, t.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <AddTransactionModal
          accounts={data.accounts}
          categories={data.categories}
          onClose={() => setAdding(false)}
          onSaved={refresh}
        />
      )}
    </main>
  );
}
