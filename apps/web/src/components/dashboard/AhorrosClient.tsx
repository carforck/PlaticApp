"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import type { AccountRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { ACCOUNT_EMOJI } from "@/lib/labels";
import { Sheet } from "./Sheet";

export function AhorrosClient() {
  const { data, refresh } = useDashboard();
  const [moving, setMoving] = useState<AccountRow | null | "new">(null); // "new" = elegir cuenta
  const [editing, setEditing] = useState<AccountRow | null>(null);

  const savings = useMemo(
    () => data.accounts.filter((a) => a.reserved_minor > 0 || a.goal_minor),
    [data.accounts],
  );
  const totalSaved = data.accounts.reduce((s, a) => s + (a.reserved_minor || 0), 0);
  const totalGoal = data.accounts.reduce((s, a) => s + (a.goal_minor || 0), 0);

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Ahorros</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">
            Tienes apartado <span className="font-semibold text-[var(--color-ink)]">{fmtMoney(totalSaved)}</span>
            {totalGoal > 0 && <span> de una meta de {fmtMoney(totalGoal)}</span>}
          </p>
        </div>
        <button onClick={() => setMoving("new")} className="btn-mac px-4 py-2 text-[13px] font-medium">
          + Mover al ahorro
        </button>
      </header>

      {totalGoal > 0 && (
        <div className="glass rounded-[var(--radius-card)] p-5">
          <div className="mb-1 flex items-center justify-between text-[13px]">
            <span className="font-medium">Progreso total de tus metas</span>
            <span className="text-[var(--color-ink-soft)]">{fmtMoney(totalSaved)} / {fmtMoney(totalGoal)}</span>
          </div>
          <Progress pct={totalGoal > 0 ? Math.round((totalSaved / totalGoal) * 100) : 0} />
        </div>
      )}

      {savings.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-10 text-center">
          <p className="text-[32px]">🐷</p>
          <p className="mt-2 text-[14px] text-[var(--color-ink-soft)]">
            Aún no apartas ahorros. Aparta una parte de una cuenta (o muévela desde otra) y, si quieres, ponle una meta.
          </p>
          <button onClick={() => setMoving("new")} className="btn-mac mt-4 px-4 py-2 text-[13px] font-medium">
            + Empezar a ahorrar
          </button>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {savings.map((a) => {
            const pct = a.goal_minor ? Math.round((a.reserved_minor / a.goal_minor) * 100) : null;
            const available = a.balance_minor - a.reserved_minor;
            return (
              <div key={a.account_id} className="glass rounded-[var(--radius-card)] p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-black/[0.05] text-[18px]">
                    {ACCOUNT_EMOJI[a.type] ?? "💼"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">Ahorro en {a.name}</p>
                    <p className="text-[12px] text-[var(--color-ink-soft)]">
                      Disponible para gastar: {fmtMoney(available, a.currency)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-[22px] font-semibold tracking-tight text-[#30d158]">{fmtMoney(a.reserved_minor, a.currency)}</p>
                {a.goal_minor ? (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--color-ink-soft)]">
                      <span>Meta: {fmtMoney(a.goal_minor, a.currency)}</span>
                      <span><b style={{ color: pct! >= 100 ? "#30d158" : "var(--color-ink)" }}>{pct}%</b></span>
                    </div>
                    <Progress pct={pct!} />
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">Sin meta · ponle un objetivo</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setMoving(a)} className="btn-mac px-3 py-1.5 text-[13px] font-medium">+ Apartar</button>
                  <button onClick={() => setEditing(a)} className="rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-3 py-1.5 text-[13px] font-medium transition hover:bg-white/90">
                    Ajustar / meta
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {moving !== null && (
        <MoveModal preset={moving === "new" ? null : moving} accounts={data.accounts} onClose={() => setMoving(null)} onSaved={refresh} />
      )}
      {editing && <EditModal account={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
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

function MoveModal({
  preset,
  accounts,
  onClose,
  onSaved,
}: {
  preset: AccountRow | null;
  accounts: AccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [toAccountId, setToAccountId] = useState(preset?.account_id ?? accounts[0]?.account_id ?? "");
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState(""); // "" = de esta misma cuenta
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toAccountId, amount: Number(amount), fromAccountId: fromAccountId || null }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError((await res.json().catch(() => ({}))).error ?? "No se pudo guardar");
  }

  return (
    <Sheet title="Mover al ahorro" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Ahorrar en
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={field}>
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Monto (COP)
          <input type="number" min="0" step="any" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200000" className={`${field} font-semibold`} />
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          ¿De dónde sale?
          <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={field}>
            <option value="">Apartar de esta misma cuenta</option>
            {accounts.filter((a) => a.account_id !== toAccountId).map((a) => (
              <option key={a.account_id} value={a.account_id}>Mover desde {a.name}</option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]">Si eliges otra cuenta, movemos la plata y la apartamos como ahorro.</span>
        </label>
        {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">{saving ? "Guardando…" : "Apartar"}</button>
        </div>
      </form>
    </Sheet>
  );
}

function EditModal({ account, onClose, onSaved }: { account: AccountRow; onClose: () => void; onSaved: () => void }) {
  const [reserved, setReserved] = useState(String(account.reserved_minor));
  const [goal, setGoal] = useState(account.goal_minor ? String(account.goal_minor) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/savings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.account_id, reserved: Number(reserved || 0), goal: goal ? Number(goal) : null }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError((await res.json().catch(() => ({}))).error ?? "No se pudo guardar");
  }

  return (
    <Sheet title={`Ahorro en ${account.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Monto apartado (COP)
          <input type="number" min="0" step="any" value={reserved} onChange={(e) => setReserved(e.target.value)} className={`${field} font-semibold`} />
          <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]">Bájalo para liberar parte del ahorro. Saldo de la cuenta: {fmtMoney(account.balance_minor, account.currency)}.</span>
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Meta (opcional)
          <input type="number" min="0" step="any" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ej. 5000000" className={field} />
          <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]">Déjalo vacío si no quieres meta.</span>
        </label>
        {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Sheet>
  );
}
