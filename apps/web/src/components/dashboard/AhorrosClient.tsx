"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import type { AccountRow, SavingRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { Sheet } from "./Sheet";

export function AhorrosClient() {
  const { data, refresh } = useDashboard();
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<SavingRow | null>(null);
  const [editing, setEditing] = useState<SavingRow | null>(null);

  const accById = useMemo(() => new Map(data.accounts.map((a) => [a.account_id, a])), [data.accounts]);
  const totalSaved = data.savings.reduce((s, x) => s + x.reserved_minor, 0);
  const totalGoal = data.savings.reduce((s, x) => s + (x.goal_minor || 0), 0);

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Ahorros</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">
            Tienes apartado <span className="font-semibold text-[var(--color-ink)]">{fmtMoney(totalSaved)}</span>
            {totalGoal > 0 && <span> de {fmtMoney(totalGoal)} en metas</span>}
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
          + Nuevo ahorro
        </button>
      </header>

      {data.savings.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-10 text-center">
          <p className="text-[32px]">🐷</p>
          <p className="mt-2 text-[14px] text-[var(--color-ink-soft)]">
            Crea tu primer ahorro con un título (ej. «Casa», «Celular», «Viaje»), elige en qué cuenta vive y ponle una meta si quieres.
          </p>
          <button onClick={() => setCreating(true)} className="btn-mac mt-4 px-4 py-2 text-[13px] font-medium">
            + Crear ahorro
          </button>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {data.savings.map((s) => {
            const acc = accById.get(s.account_id);
            const pct = s.goal_minor ? Math.round((s.reserved_minor / s.goal_minor) * 100) : null;
            return (
              <div key={s.id} className="glass rounded-[var(--radius-card)] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">🐷 {s.name}</p>
                    <p className="text-[12px] text-[var(--color-ink-soft)]">en {acc?.name ?? "—"}</p>
                  </div>
                  <button onClick={() => setEditing(s)} className="shrink-0 rounded-[8px] px-2 py-1 text-[12px] hover:bg-black/5" title="Editar">✏️</button>
                </div>

                <p className="mt-3 text-[22px] font-semibold tracking-tight text-[#30d158]">{fmtMoney(s.reserved_minor)}</p>
                {s.goal_minor ? (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--color-ink-soft)]">
                      <span>Meta: {fmtMoney(s.goal_minor)}</span>
                      <b style={{ color: pct! >= 100 ? "#30d158" : "var(--color-ink)" }}>{pct}%</b>
                    </div>
                    <Progress pct={pct!} />
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">Sin meta</p>
                )}

                <button onClick={() => setAdding(s)} className="btn-mac mt-4 w-full py-2 text-[13px] font-medium">+ Abonar</button>
              </div>
            );
          })}
        </section>
      )}

      {creating && <SavingModal accounts={data.accounts} onClose={() => setCreating(false)} onSaved={refresh} />}
      {adding && <AddModal saving={adding} accounts={data.accounts} onClose={() => setAdding(null)} onSaved={refresh} />}
      {editing && <EditModal saving={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </main>
  );
}

function Progress({ pct }: { pct: number }) {
  const color = pct >= 100 ? "#30d158" : pct >= 60 ? "#0a84ff" : "#ff9f0a";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(3, pct))}%`, background: color }} />
    </div>
  );
}

const field = "mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[var(--color-accent)] focus:ring-2";

/** Crear un ahorro nuevo con título. */
function SavingModal({ accounts, onClose, onSaved }: { accounts: AccountRow[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.account_id ?? "");
  const [amount, setAmount] = useState("");
  const [goal, setGoal] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, accountId, amount: Number(amount), goal: goal ? Number(goal) : null, fromAccountId: fromAccountId || null }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError((await res.json().catch(() => ({}))).error ?? "No se pudo crear");
  }

  return (
    <Sheet title="Nuevo ahorro" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Título
          <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Casa, Celular, Ropa, Regalo…" className={field} />
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          ¿En qué cuenta vive?
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
            {accounts.map((a) => (<option key={a.account_id} value={a.account_id}>{a.name}</option>))}
          </select>
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Monto inicial (COP)
          <input type="number" min="0" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200000" className={`${field} font-semibold`} />
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Meta (opcional)
          <input type="number" min="0" step="any" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ej. 2000000" className={field} />
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          ¿De dónde sale?
          <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={field}>
            <option value="">Apartar de esta misma cuenta</option>
            {accounts.filter((a) => a.account_id !== accountId).map((a) => (<option key={a.account_id} value={a.account_id}>Mover desde {a.name}</option>))}
          </select>
        </label>
        {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">{saving ? "Guardando…" : "Crear"}</button>
        </div>
      </form>
    </Sheet>
  );
}

/** Abonar a un ahorro existente. */
function AddModal({ saving, accounts, onClose, onSaved }: { saving: SavingRow; accounts: AccountRow[]; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ savingId: saving.id, amount: Number(amount), fromAccountId: fromAccountId || null }),
    });
    setBusy(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError((await res.json().catch(() => ({}))).error ?? "No se pudo abonar");
  }

  return (
    <Sheet title={`Abonar a ${saving.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Monto (COP)
          <input type="number" min="0" step="any" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" className={`${field} font-semibold`} />
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          ¿De dónde sale?
          <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={field}>
            <option value="">Apartar de la misma cuenta</option>
            {accounts.filter((a) => a.account_id !== saving.account_id).map((a) => (<option key={a.account_id} value={a.account_id}>Mover desde {a.name}</option>))}
          </select>
        </label>
        {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">Cancelar</button>
          <button type="submit" disabled={busy} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">{busy ? "Guardando…" : "Abonar"}</button>
        </div>
      </form>
    </Sheet>
  );
}

/** Editar título, monto apartado y meta — o eliminar el ahorro. */
function EditModal({ saving, onClose, onSaved }: { saving: SavingRow; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(saving.name);
  const [reserved, setReserved] = useState(String(saving.reserved_minor));
  const [goal, setGoal] = useState(saving.goal_minor ? String(saving.goal_minor) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/savings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ savingId: saving.id, name, reserved: Number(reserved || 0), goal: goal ? Number(goal) : null }),
    });
    setBusy(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError((await res.json().catch(() => ({}))).error ?? "No se pudo guardar");
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/savings?id=${saving.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError("No se pudo eliminar");
  }

  return (
    <Sheet title={`Editar ${saving.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Título
          <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Monto apartado (COP)
          <input type="number" min="0" step="any" value={reserved} onChange={(e) => setReserved(e.target.value)} className={`${field} font-semibold`} />
          <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]">Bájalo para liberar parte de este ahorro.</span>
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Meta (opcional)
          <input type="number" min="0" step="any" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Sin meta" className={field} />
        </label>
        {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={remove} disabled={busy} className="rounded-[var(--radius-control)] border border-[#ff375f]/30 bg-[#ff375f]/10 px-4 py-2.5 text-[14px] font-medium text-[#ff375f] transition hover:bg-[#ff375f]/20" title="Eliminar ahorro">🗑️</button>
          <button type="submit" disabled={busy} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Sheet>
  );
}
