"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { fmtMoney } from "@/lib/format";
import { KIND_EMOJI } from "@/lib/labels";
import type { RecurrenceRow } from "@/lib/queries";
import { MonthCalendar, dayKey } from "./MonthCalendar";
import { Paginator, usePagination } from "./Paginator";
import { MoneyInput } from "./MoneyInput";
import { TrafficLights } from "./TrafficLights";
import { NavIcon } from "./NavIcon";

const FREQ_LABEL: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  yearly: "Anual",
};

export function RecurrentesClient() {
  const { data, refresh } = useDashboard();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RecurrenceRow | null>(null);
  const [history, setHistory] = useState<RecurrenceRow | null>(null);
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
              <li
                key={r.id}
                onClick={() => setEditing(r)}
                className={`flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-black/[0.03] ${r.active ? "" : "opacity-50"}`}
              >
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
                  <button onClick={(e) => { e.stopPropagation(); setHistory(r); }} className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--color-ink-soft)] hover:bg-black/5" title="Historial de pagos">
                    <NavIcon name="history" size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggle(r.id, !r.active); }}
                    className="rounded-[8px] border border-black/10 bg-white/60 px-2.5 py-1 text-[12px] font-medium transition hover:bg-white"
                  >
                    {r.active ? "Pausar" : "Activar"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); remove(r.id); }} className="grid h-7 w-7 place-items-center rounded-[8px] text-[#ff375f] hover:bg-[#ff375f]/10" title="Eliminar">
                    <NavIcon name="trash" size={16} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Paginator page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} onPage={pg.setPage} noun="pagos fijos" />
      </div>
      )}

      {(creating || editing) && (
        <RecurrenceModal
          rec={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={refresh}
        />
      )}

      {history && <RecPaymentsModal rec={history} onClose={() => setHistory(null)} />}
    </main>
  );
}

interface RecPayment {
  id: string;
  amount_minor: number;
  status: string;
  paid_for: string | null;
  created_at: string;
}

/** Historial de pagos de un pago fijo (pagados y saltados). */
function RecPaymentsModal({ rec, onClose }: { rec: RecurrenceRow; onClose: () => void }) {
  const [rows, setRows] = useState<RecPayment[] | null>(null);
  useEffect(() => {
    void (async () => {
      const { data } = await createClient()
        .from("recurrence_payments")
        .select("id, amount_minor, status, paid_for, created_at")
        .eq("recurrence_id", rec.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as RecPayment[]) ?? []);
    })();
  }, [rec.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-sm overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <TrafficLights onClose={onClose} />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Historial · {rec.name}</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {rows === null ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-ink-soft)]">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-ink-soft)]">
              Aún no hay pagos registrados. Cuando pagues o saltes este pago fijo (desde el recordatorio del bot), aparecerá aquí.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {rows.map((p) => {
                const skipped = p.status === "skipped";
                return (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <span>
                      <span className="block text-[14px] font-medium">{skipped ? "⏭️ Saltado" : "✅ Pagado"}</span>
                      <span className="block text-[11px] text-[var(--color-ink-soft)]">
                        {new Date(p.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })}
                        {p.paid_for ? ` · ciclo ${p.paid_for}` : ""}
                      </span>
                    </span>
                    <span className={`text-[14px] font-semibold ${skipped ? "text-[var(--color-ink-soft)]" : "text-[var(--color-ink)]"}`}>
                      {skipped ? "—" : fmtMoney(p.amount_minor, rec.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function monthlyEquivalent(minor: number, freq: string): number {
  if (freq === "weekly") return minor * 4.33;
  if (freq === "biweekly") return minor * 2;
  if (freq === "yearly") return minor / 12;
  return minor;
}

function RecurrenceModal({ rec, onClose, onSaved }: { rec: RecurrenceRow | null; onClose: () => void; onSaved: () => void }) {
  const { data } = useDashboard();
  const isEdit = !!rec;
  const [name, setName] = useState(rec?.name ?? "");
  const [kind, setKind] = useState<"expense" | "income" | "investment">(rec?.kind === "transfer" ? "expense" : rec?.kind ?? "expense");
  const [amount, setAmount] = useState(rec ? String(rec.amount_minor) : "");
  const [frequency, setFrequency] = useState<string>(rec?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState(rec?.day_of_month ? String(rec.day_of_month) : "");
  const [accountId, setAccountId] = useState(rec?.account_id ?? data.accounts[0]?.account_id ?? "");
  const [categoryId, setCategoryId] = useState(rec?.category_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name,
      kind,
      amount: Number(amount),
      frequency,
      dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
      accountId: accountId || null,
      categoryId: categoryId || null,
    };
    const res = await fetch("/api/recurrences", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isEdit ? { id: rec!.id, ...payload } : payload),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "No se pudo guardar");
    }
  }

  const field =
    "mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <TrafficLights onClose={onClose} />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">{isEdit ? "Editar pago fijo" : "Nuevo pago fijo"}</span>
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
              <MoneyInput required value={amount} onChange={setAmount} placeholder="1.000.000" className={field} />
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
              {saving ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
