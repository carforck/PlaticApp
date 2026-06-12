"use client";

import { useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import type { AccountRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { ACCOUNT_EMOJI, ACCOUNT_TYPE_LABEL } from "@/lib/labels";

const TYPES = [
  { value: "bank", label: "Banco" },
  { value: "cash", label: "Efectivo" },
  { value: "wallet", label: "Billetera" },
  { value: "investment", label: "Inversión" },
  { value: "credit", label: "Crédito" },
] as const;

export function CuentasClient() {
  const { data, refresh } = useDashboard();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);

  const total = data.accounts.reduce((s, a) => s + a.balance_minor, 0);

  async function archive(id: string) {
    await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, archived: true }),
    });
    refresh();
  }

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Cuentas</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">
            Patrimonio total: <span className="font-semibold text-[var(--color-ink)]">{fmtMoney(total)}</span>
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
          + Nueva cuenta
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.accounts.map((a) => (
          <div key={a.account_id} className="glass group relative rounded-[var(--radius-card)] p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-black/[0.05] text-[20px]">
                {ACCOUNT_EMOJI[a.type] ?? "💼"}
              </span>
              <div>
                <p className="text-[15px] font-semibold">{a.name}</p>
                <p className="text-[12px] text-[var(--color-ink-soft)]">
                  {ACCOUNT_TYPE_LABEL[a.type] ?? a.type} · {a.currency}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[24px] font-semibold tracking-tight">{fmtMoney(a.balance_minor, a.currency)}</p>
            {a.opening_minor !== a.balance_minor && (
              <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">Saldo inicial: {fmtMoney(a.opening_minor, a.currency)}</p>
            )}
            <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => setEditing(a)} className="rounded-[8px] px-2 py-1 text-[12px] hover:bg-black/5" title="Editar">✏️</button>
              <button onClick={() => archive(a.account_id)} className="rounded-[8px] px-2 py-1 text-[12px] hover:bg-[#ff375f]/10" title="Archivar">🗑️</button>
            </div>
          </div>
        ))}

        {data.accounts.length === 0 && (
          <p className="text-[14px] text-[var(--color-ink-soft)]">Aún no tienes cuentas. Crea la primera.</p>
        )}
      </section>

      {(creating || editing) && (
        <AccountModal
          account={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={refresh}
        />
      )}
    </main>
  );
}

function AccountModal({ account, onClose, onSaved }: { account: AccountRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!account;
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<string>(account?.type ?? "bank");
  const [opening, setOpening] = useState(account ? String(account.opening_minor) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const openingBalance = opening === "" ? 0 : Number(opening);
    const res = isEdit
      ? await fetch("/api/accounts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: account!.account_id, name, openingBalance }) })
      : await fetch("/api/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, type, openingBalance }) });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "No se pudo guardar");
    }
  }

  const field = "mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[var(--color-accent)] focus:ring-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-sm overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">{isEdit ? "Editar cuenta" : "Nueva cuenta"}</span>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Nombre
            <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Bancolombia, Nequi, Efectivo…" className={field} />
          </label>
          {!isEdit && (
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Tipo
              <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            {isEdit ? "Saldo inicial (COP)" : "¿Cuánto tienes ahí ahora? (COP)"}
            <input type="number" step="any" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" className={field} />
            <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]">Es tu saldo de arranque, no cuenta como ingreso.</span>
          </label>
          {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">{saving ? "Guardando…" : isEdit ? "Guardar" : "Crear cuenta"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
