"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchDashboard, type DashboardData, type DebtRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { Sidebar } from "./Sidebar";

export function DeudasClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [creating, setCreating] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const refresh = useCallback(async () => setData(await fetchDashboard(supabase)), [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("platica-deudas")
      .on("postgres_changes", { event: "*", schema: "public", table: "debts" }, refresh)
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [supabase, refresh]);

  const debts = data.debts;
  const open = debts.filter((d) => d.status === "open");
  const theyOwe = open.filter((d) => d.direction === "they_owe").reduce((s, d) => s + d.amount_minor, 0);
  const iOwe = open.filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount_minor, 0);

  async function setStatus(id: string, status: "open" | "settled") {
    await fetch("/api/debts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    refresh();
  }

  return (
    <div className="flex min-h-screen gap-4 p-4">
      <Sidebar />

      <main className="flex-1 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Deudas</h1>
            <p className="text-[13px] text-[var(--color-ink-soft)]">{open.length} abiertas</p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
            + Nueva deuda
          </button>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className="glass rounded-[var(--radius-card)] p-5">
            <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">🤝 Te deben</p>
            <p className="mt-1 text-[24px] font-semibold tracking-tight text-[#30d158]">{fmtMoney(theyOwe)}</p>
          </div>
          <div className="glass rounded-[var(--radius-card)] p-5">
            <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">🫵 Debes</p>
            <p className="mt-1 text-[24px] font-semibold tracking-tight text-[#ff375f]">{fmtMoney(iOwe)}</p>
          </div>
        </section>

        <div className="glass overflow-hidden rounded-[var(--radius-card)]">
          {debts.length === 0 ? (
            <p className="p-8 text-center text-[14px] text-[var(--color-ink-soft)]">
              Sin deudas registradas. Dile al bot «Juan me prestó 200 mil» o créala aquí.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {debts.map((d) => (
                <DebtRowItem key={d.id} d={d} onSettle={setStatus} />
              ))}
            </ul>
          )}
        </div>
      </main>

      {creating && <NewDebtModal onClose={() => setCreating(false)} onSaved={refresh} />}
    </div>
  );
}

function DebtRowItem({ d, onSettle }: { d: DebtRow; onSettle: (id: string, s: "open" | "settled") => void }) {
  const settled = d.status === "settled";
  return (
    <li className={`flex items-center justify-between px-5 py-3 ${settled ? "opacity-50" : ""}`}>
      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">
          {d.direction === "they_owe" ? "📥" : "📤"}
        </span>
        <span>
          <span className="block text-[14px] font-medium">
            {d.direction === "they_owe" ? `${d.counterparty} te debe` : `Le debes a ${d.counterparty}`}
            {settled && " · saldada"}
          </span>
          {d.description && (
            <span className="block text-[12px] text-[var(--color-ink-soft)]">{d.description}</span>
          )}
        </span>
      </span>
      <span className="flex items-center gap-3">
        <span className={`text-[14px] font-semibold ${d.direction === "they_owe" ? "text-[#30d158]" : "text-[#ff375f]"}`}>
          {fmtMoney(d.amount_minor, d.currency)}
        </span>
        <button
          onClick={() => onSettle(d.id, settled ? "open" : "settled")}
          className="rounded-[8px] border border-black/10 bg-white/60 px-2.5 py-1 text-[12px] font-medium transition hover:bg-white"
        >
          {settled ? "Reabrir" : "Saldar"}
        </button>
      </span>
    </li>
  );
}

function NewDebtModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [counterparty, setCounterparty] = useState("");
  const [direction, setDirection] = useState<"i_owe" | "they_owe">("they_owe");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/debts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ counterparty, direction, amount: Number(amount), description }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "No se pudo crear");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-sm overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Nueva deuda</span>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-black/[0.05] p-1">
            <button
              type="button"
              onClick={() => setDirection("they_owe")}
              className={`rounded-[7px] py-1.5 text-[13px] font-medium transition ${direction === "they_owe" ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}
            >
              📥 Me deben
            </button>
            <button
              type="button"
              onClick={() => setDirection("i_owe")}
              className={`rounded-[7px] py-1.5 text-[13px] font-medium transition ${direction === "i_owe" ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}
            >
              📤 Yo debo
            </button>
          </div>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Persona
            <input autoFocus required value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="Juan, María…" className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[var(--color-accent)] focus:ring-2" />
          </label>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Monto (COP)
            <input type="number" min="0" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200000" className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] font-semibold outline-none ring-[var(--color-accent)] focus:ring-2" />
          </label>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Nota (opcional)
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Soporte técnico" className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2" />
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
