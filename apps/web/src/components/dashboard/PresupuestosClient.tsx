"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { fmtMoney } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";

interface Row {
  id: string | null;
  categoryId: string | null;
  name: string;
  emoji: string | null;
  budget: number;
  spent: number;
}

function barColor(pct: number) {
  if (pct >= 100) return "#ff375f";
  if (pct >= 80) return "#ff9f0a";
  return "#30d158";
}

export function PresupuestosClient() {
  const { data, refresh } = useDashboard();
  const [editing, setEditing] = useState<Row | null>(null);

  // Gasto del mes por categoría.
  const spentByCat = useMemo(() => {
    const now = new Date();
    const m = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.kind !== "expense") continue;
      const dt = new Date(t.occurred_at);
      if (dt.getFullYear() !== now.getFullYear() || dt.getMonth() !== now.getMonth()) continue;
      const k = t.category_id ?? "otros";
      m.set(k, (m.get(k) ?? 0) + t.amount_minor);
    }
    return m;
  }, [data.transactions]);

  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);

  // Filas con presupuesto + categorías de gasto sin presupuesto (para añadir).
  const rows: Row[] = useMemo(() => {
    const withBudget: Row[] = data.budgets
      .filter((b) => b.category_id)
      .map((b) => {
        const c = catById.get(b.category_id!);
        return {
          id: b.id,
          categoryId: b.category_id,
          name: c?.name ?? "Categoría",
          emoji: c?.emoji ?? "🏷️",
          budget: b.amount_minor,
          spent: spentByCat.get(b.category_id!) ?? 0,
        };
      });
    return withBudget.sort((a, b) => b.spent / b.budget - a.spent / a.budget);
  }, [data.budgets, catById, spentByCat]);

  const sinPresupuesto = data.categories.filter(
    (c) => c.applies_to !== "income" && !data.budgets.some((b) => b.category_id === c.id),
  );

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);

  async function remove(id: string) {
    await fetch(`/api/budgets?id=${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Presupuestos</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">
            {rows.length ? `${fmtMoney(totalSpent)} de ${fmtMoney(totalBudget)} este mes` : "Define límites por categoría"}
          </p>
        </div>
        <button onClick={() => setEditing({ id: null, categoryId: null, name: "", emoji: null, budget: 0, spent: 0 })} className="btn-mac px-4 py-2 text-[13px] font-medium">
          + Presupuesto
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-10 text-center text-[14px] text-[var(--color-ink-soft)]">
          Aún no tienes presupuestos. Crea uno por categoría (ej. Comida $600.000/mes) y te avisaré —en la app y
          por Telegram— cuando te acerques al límite. 🎯
        </div>
      ) : (
        <section className="space-y-3">
          {rows.map((r) => {
            const pct = Math.round((r.spent / r.budget) * 100);
            const color = barColor(pct);
            return (
              <div key={r.id} className="glass rounded-[var(--radius-card)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">{r.emoji}</span>
                    <span>
                      <span className="block text-[14px] font-medium">{r.name}</span>
                      <span className="block text-[12px] text-[var(--color-ink-soft)]">
                        {fmtMoney(r.spent)} de {fmtMoney(r.budget)}
                        {pct >= 100 ? " · 🔴 excedido" : pct >= 80 ? " · 🟠 cerca del límite" : ""}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold" style={{ color }}>{pct}%</span>
                    <button onClick={() => setEditing(r)} className="rounded-[8px] px-2 py-1 text-[12px] hover:bg-black/5" title="Editar">✏️</button>
                    {r.id && <button onClick={() => remove(r.id!)} className="rounded-[8px] px-2 py-1 text-[12px] hover:bg-[#ff375f]/10" title="Eliminar">🗑️</button>}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {editing && (
        <BudgetModal
          row={editing}
          categories={sinPresupuesto}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </main>
  );
}

function BudgetModal({
  row,
  categories,
  onClose,
  onSaved,
}: {
  row: Row;
  categories: { id: string; name: string; emoji: string | null }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !row.id;
  const [categoryId, setCategoryId] = useState(row.categoryId ?? categories[0]?.id ?? "");
  const [amount, setAmount] = useState(row.budget ? String(row.budget) : "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoryId: row.categoryId ?? categoryId, amount: Number(amount) }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-sm overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">
            {isNew ? "Nuevo presupuesto" : `Presupuesto · ${row.name}`}
          </span>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {isNew && (
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Categoría
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2">
                {categories.length === 0 && <option value="">(todas ya tienen presupuesto)</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Límite mensual (COP)
            <MoneyInput required autoFocus value={amount} onChange={setAmount} placeholder="600.000" className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[17px] font-semibold outline-none ring-[var(--color-accent)] focus:ring-2" />
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">Cancelar</button>
            <button type="submit" disabled={saving || (isNew && !categoryId)} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
