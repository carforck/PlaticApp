"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import type { TxRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { KIND_EMOJI, KIND_LABEL, SOURCE_EMOJI } from "@/lib/labels";
import { AddTransactionModal } from "./AddTransactionModal";
import { MonthCalendar, dayKey } from "./MonthCalendar";
import { Paginator, usePagination } from "./Paginator";

const compact = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "+";
  if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1000) return `${s}$${Math.round(a / 1000)}k`;
  return `${s}$${a}`;
};

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
  const [editTx, setEditTx] = useState<TxRow | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  // Neto por día (para el calendario), respetando el filtro.
  const byDay = useMemo(() => {
    const m = new Map<string, { net: number; count: number }>();
    for (const t of rows) {
      const k = dayKey(new Date(t.occurred_at));
      const signed = t.kind === "income" ? t.amount_minor : -t.amount_minor;
      const e = m.get(k) ?? { net: 0, count: 0 };
      e.net += signed;
      e.count += 1;
      m.set(k, e);
    }
    return m;
  }, [rows]);

  const dayRows = selectedDay ? rows.filter((t) => dayKey(new Date(t.occurred_at)) === selectedDay) : [];

  const pg = usePagination(rows, 20);

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
          className="min-w-[160px] flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2"
        />
        <div className="flex gap-1 rounded-[10px] bg-black/[0.05] p-1">
          {(["list", "calendar"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition ${
                view === v ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"
              }`}
            >
              {v === "list" ? "☰ Lista" : "📅 Calendario"}
            </button>
          ))}
        </div>
      </div>

      {view === "calendar" && (
        <>
          <MonthCalendar
            month={month}
            onMonthChange={(d) => {
              setMonth(d);
              setSelectedDay(null);
            }}
            renderDay={(date) => {
              const e = byDay.get(dayKey(date));
              if (!e) return null;
              const k = dayKey(date);
              return (
                <button
                  onClick={() => setSelectedDay(selectedDay === k ? null : k)}
                  className={`w-full rounded-[6px] px-1 py-0.5 text-left ${selectedDay === k ? "bg-[var(--color-accent)]/15" : ""}`}
                >
                  <span className={`block text-[11px] font-semibold ${e.net >= 0 ? "text-[#30d158]" : "text-[#ff375f]"}`}>
                    {compact(e.net)}
                  </span>
                  <span className="block text-[10px] text-[var(--color-ink-soft)]">{e.count} mov</span>
                </button>
              );
            }}
          />
          {selectedDay && (
            <div className="glass rounded-[var(--radius-card)] p-4">
              <h3 className="mb-2 text-[14px] font-semibold">
                {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              {dayRows.length === 0 ? (
                <p className="text-[13px] text-[var(--color-ink-soft)]">Sin movimientos.</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {dayRows.map((t) => {
                    const cat = catById.get(t.category_id ?? "");
                    const signed = t.kind === "income" ? t.amount_minor : -t.amount_minor;
                    return (
                      <li key={t.id} onClick={() => setEditTx(t)} className="flex cursor-pointer items-center justify-between rounded-[8px] py-2 hover:bg-black/[0.03]">
                        <span className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-black/[0.05] text-[15px]">
                            {cat?.emoji ?? KIND_EMOJI[t.kind] ?? "🧾"}
                          </span>
                          <span className="text-[14px]">{t.description ?? cat?.name ?? KIND_LABEL[t.kind]}</span>
                        </span>
                        <span className={`text-[14px] font-semibold ${signed > 0 ? "text-[#30d158]" : "text-[var(--color-ink)]"}`}>
                          {signed > 0 ? "+" : ""}
                          {fmtMoney(signed, t.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {view === "list" && (
      <div className="glass overflow-hidden rounded-[var(--radius-card)]">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-[14px] text-[var(--color-ink-soft)]">No hay movimientos que coincidan.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-black/5 text-left text-[12px] text-[var(--color-ink-soft)]">
                <th className="px-4 py-3 font-medium sm:px-5">Concepto</th>
                <th className="hidden px-3 py-3 font-medium sm:table-cell">Cuenta</th>
                <th className="hidden px-3 py-3 font-medium sm:table-cell">Fecha</th>
                <th className="px-4 py-3 text-right font-medium sm:px-5">Monto</th>
              </tr>
            </thead>
            <tbody>
              {pg.pageItems.map((t) => {
                const cat = catById.get(t.category_id ?? "");
                const acc = accById.get(t.account_id);
                const signed = t.kind === "income" ? t.amount_minor : -t.amount_minor;
                return (
                  <tr key={t.id} onClick={() => setEditTx(t)} className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-black/[0.03]">
                    <td className="px-4 py-3 sm:px-5">
                      <span className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">
                          {cat?.emoji ?? KIND_EMOJI[t.kind] ?? "🧾"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{t.description ?? cat?.name ?? KIND_LABEL[t.kind]}</span>
                          <span className="block text-[12px] text-[var(--color-ink-soft)]">
                            {cat?.name ?? KIND_LABEL[t.kind]} · {SOURCE_EMOJI[t.source] ?? "•"}
                            <span className="sm:hidden"> · {new Date(t.occurred_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</span>
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-[var(--color-ink-soft)] sm:table-cell">{acc?.name ?? "—"}</td>
                    <td className="hidden px-3 py-3 text-[var(--color-ink-soft)] sm:table-cell">
                      {new Date(t.occurred_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold sm:px-5 ${signed > 0 ? "text-[#30d158]" : "text-[var(--color-ink)]"}`}>
                      {signed > 0 ? "+" : ""}
                      {fmtMoney(signed, t.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
        <Paginator page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} onPage={pg.setPage} noun="movimientos" />
      </div>
      )}

      {(adding || editTx) && (
        <AddTransactionModal
          accounts={data.accounts}
          categories={data.categories}
          editTx={editTx}
          onClose={() => {
            setAdding(false);
            setEditTx(null);
          }}
          onSaved={refresh}
        />
      )}
    </main>
  );
}
