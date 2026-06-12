"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { fmtMoney } from "@/lib/format";
import { KIND_EMOJI } from "@/lib/labels";
import { MonthCalendar, dayKey } from "./MonthCalendar";
import { Paginator, usePagination } from "./Paginator";

const FREQ_LABEL: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  yearly: "Anual",
};

export function RecurrentesClient() {
  const { data, refresh } = useDashboard();
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const recs = data.recurrences;
  const pg = usePagination(recs, 15);

  // Pagos por día del mes visible.
  const byDay = useMemo(() => {
    const m = new Map<string, typeof recs>();
    const year = month.getFullYear();
    const mo = month.getMonth();
    const daysInMonth = new Date(year, mo + 1, 0).getDate();
    for (const r of recs) {
      if (!r.active) continue;
      let key: string | null = null;
      if (r.frequency === "monthly" && r.day_of_month) {
        key = dayKey(new Date(year, mo, Math.min(r.day_of_month, daysInMonth)));
      } else {
        const due = new Date(`${r.next_due}T12:00:00`);
        if (due.getFullYear() === year && due.getMonth() === mo) key = dayKey(due);
      }
      if (!key) continue;
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    }
    return m;
  }, [recs, month]);
  const monthlyOut = recs
    .filter((r) => r.active && r.kind !== "income")
    .reduce((s, r) => s + monthlyEquivalent(r.amount_minor, r.frequency), 0);

  async function toggle(id: string, active: boolean) {
    await fetch("/api/recurrences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    refresh();
  }
  async function remove(id: string) {
    await fetch(`/api/recurrences?id=${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Pagos fijos</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">
            ~{fmtMoney(monthlyOut)} al mes en pagos recurrentes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-[10px] bg-black/[0.05] p-1">
            {(["list", "calendar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-[7px] px-2.5 py-1.5 text-[13px] font-medium transition ${view === v ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}
              >
                {v === "list" ? "☰" : "📅"}
              </button>
            ))}
          </div>
          <button onClick={() => setCreating(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
            + Nuevo
          </button>
        </div>
      </header>

      {view === "calendar" && (
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          renderDay={(date) => {
            const items = byDay.get(dayKey(date));
            if (!items?.length) return null;
            return (
              <div className="space-y-0.5">
                {items.slice(0, 2).map((r) => (
                  <div key={r.id} className="truncate rounded-[5px] bg-[var(--color-accent)]/12 px-1 text-[10px] font-medium text-[var(--color-accent)]">
                    🔁 {r.name}
                  </div>
                ))}
                {items.length > 2 && <div className="text-[10px] text-[var(--color-ink-soft)]">+{items.length - 2}</div>}
              </div>
            );
          }}
        />
      )}

      {view === "list" && (
      <div className="glass overflow-hidden rounded-[var(--radius-card)]">
        {recs.length === 0 ? (
          <p className="p-8 text-center text-[14px] text-[var(--color-ink-soft)]">
            Sin pagos fijos. Dile al bot «todos los meses pago arriendo 1 millón el día 5» o créalo aquí.
            Te recuerdo 1 día antes por Telegram. 🔔
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {pg.pageItems.map((r) => (
              <li key={r.id} className={`flex items-center justify-between px-5 py-3 ${r.active ? "" : "opacity-50"}`}>
                <span className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">
                    {KIND_EMOJI[r.kind] ?? "🔁"}
                  </span>
                  <span>
                    <span className="block text-[14px] font-medium">{r.name}</span>
                    <span className="block text-[12px] text-[var(--color-ink-soft)]">
                      {FREQ_LABEL[r.frequency]}
                      {r.day_of_month ? ` · día ${r.day_of_month}` : ""} · próximo {r.next_due}
                      {!r.active ? " · pausado" : ""}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className={`text-[14px] font-semibold ${r.kind === "income" ? "text-[#30d158]" : "text-[var(--color-ink)]"}`}>
                    {fmtMoney(r.amount_minor, r.currency)}
                  </span>
                  <button
                    onClick={() => toggle(r.id, !r.active)}
                    className="rounded-[8px] border border-black/10 bg-white/60 px-2.5 py-1 text-[12px] font-medium transition hover:bg-white"
                  >
                    {r.active ? "Pausar" : "Activar"}
                  </button>
                  <button onClick={() => remove(r.id)} className="rounded-[8px] px-2 py-1 text-[12px] hover:bg-[#ff375f]/10" title="Eliminar">
                    🗑️
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Paginator page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} onPage={pg.setPage} noun="pagos fijos" />
      </div>
      )}

      {creating && <NewRecurrenceModal onClose={() => setCreating(false)} onSaved={refresh} />}
    </main>
  );
}

function monthlyEquivalent(minor: number, freq: string): number {
  if (freq === "weekly") return minor * 4.33;
  if (freq === "biweekly") return minor * 2;
  if (freq === "yearly") return minor / 12;
  return minor;
}

function NewRecurrenceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data } = useDashboard();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [accountId, setAccountId] = useState(data.accounts[0]?.account_id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/recurrences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        kind,
        amount: Number(amount),
        frequency,
        dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
        accountId: accountId || null,
        categoryId: categoryId || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "No se pudo crear");
    }
  }

  const field =
    "mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Nuevo pago fijo</span>
        </div>
        <form onSubmit={submit} className="space-y-3 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-black/[0.05] p-1">
            <button type="button" onClick={() => setKind("expense")} className={`rounded-[7px] py-1.5 text-[13px] font-medium transition ${kind === "expense" ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}>
              💸 Gasto fijo
            </button>
            <button type="button" onClick={() => setKind("income")} className={`rounded-[7px] py-1.5 text-[13px] font-medium transition ${kind === "income" ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}>
              💰 Ingreso fijo
            </button>
          </div>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Nombre
            <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Arriendo, Netflix, Sueldo…" className={field} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Monto (COP)
              <input type="number" min="0" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000000" className={field} />
            </label>
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Día del mes
              <input type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} placeholder="5" className={field} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Frecuencia
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={field}>
                <option value="monthly">Mensual</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="yearly">Anual</option>
              </select>
            </label>
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Cuenta
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
                {data.accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>{a.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Categoría
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
              <option value="">— Sin categoría —</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>
              ))}
            </select>
          </label>
          {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">
              {saving ? "Guardando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
