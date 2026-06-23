"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import type { AccountRow, SavingRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { ACCOUNT_EMOJI } from "@/lib/labels";
import { Sheet } from "./Sheet";
import { MoneyInput } from "./MoneyInput";
import { NavIcon } from "./NavIcon";

export function AhorrosClient() {
  const { data, refresh } = useDashboard();
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<SavingRow | null>(null);
  const [editing, setEditing] = useState<SavingRow | null>(null);
  const [history, setHistory] = useState<SavingRow | null>(null);

  const accById = useMemo(() => new Map(data.accounts.map((a) => [a.account_id, a])), [data.accounts]);
  const savedByAccount = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.savings) m.set(s.account_id, (m.get(s.account_id) ?? 0) + s.reserved_minor);
    return m;
  }, [data.savings]);
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

      {data.savings.length > 0 && (
        <section className="grid grid-cols-3 gap-4">
          <div className="glass rounded-[var(--radius-card)] p-4">
            <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">Total ahorrado</p>
            <p className="mt-1 text-[20px] font-semibold tracking-tight text-[#30d158]">{fmtMoney(totalSaved)}</p>
          </div>
          <div className="glass rounded-[var(--radius-card)] p-4">
            <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">Ahorros</p>
            <p className="mt-1 text-[20px] font-semibold tracking-tight">{data.savings.length}</p>
          </div>
          <div className="glass rounded-[var(--radius-card)] p-4">
            <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">Meta total</p>
            <p className="mt-1 text-[20px] font-semibold tracking-tight">{totalGoal > 0 ? `${Math.round((totalSaved / totalGoal) * 100)}%` : "—"}</p>
          </div>
        </section>
      )}

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
            const overBalance = acc ? (savedByAccount.get(s.account_id) ?? 0) > acc.balance_minor : false;
            return (
              <div key={s.id} className="glass rounded-[var(--radius-card)] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">
                      {acc ? ACCOUNT_EMOJI[acc.type] ?? "💼" : "🐷"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{s.name}</p>
                      <p className="truncate text-[12px] text-[var(--color-ink-soft)]">en {acc?.name ?? "—"}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditing(s)} className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-[var(--color-ink-soft)] hover:bg-black/5" title="Editar"><NavIcon name="edit" size={16} /></button>
                </div>

                <p className="mt-3 text-[22px] font-semibold tracking-tight text-[#30d158]">{fmtMoney(s.reserved_minor)}</p>
                {acc && (
                  <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">
                    Disponible en {acc.name}: {fmtMoney(Math.max(0, acc.balance_minor - acc.reserved_minor), acc.currency)}
                  </p>
                )}
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

                {overBalance && (
                  <p className="mt-2 rounded-[10px] bg-[#ff9f0a]/12 px-2.5 py-1.5 text-[11px] leading-snug text-[#b86e00]">
                    ⚠️ Tu ahorro en {acc?.name} supera el saldo de la cuenta ({fmtMoney(acc?.balance_minor ?? 0)}). Gastaste parte de lo apartado; ajústalo.
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setAdding(s)} className="btn-mac flex-1 py-2 text-[13px] font-medium">+ Abonar</button>
                  <button onClick={() => setHistory(s)} className="grid place-items-center rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-3 py-2 text-[var(--color-ink-soft)] transition hover:bg-white/90" title="Ver historial"><NavIcon name="history" size={17} /></button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {creating && <SavingModal accounts={data.accounts} onClose={() => setCreating(false)} onSaved={refresh} />}
      {adding && <AddModal saving={adding} accounts={data.accounts} onClose={() => setAdding(null)} onSaved={refresh} />}
      {editing && <EditModal saving={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {history && <HistoryModal saving={history} onClose={() => setHistory(null)} />}
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
          <MoneyInput required value={amount} onChange={setAmount} placeholder="200.000" className={`${field} font-semibold`} />
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Meta (opcional)
          <MoneyInput value={goal} onChange={setGoal} placeholder="Ej. 2.000.000" className={field} />
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
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ savingId: saving.id, amount: Number(amount), fromAccountId: fromAccountId || null }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      onSaved();
      // Si se apartó menos de lo pedido (no cabía en el saldo), avisamos y dejamos el modal abierto.
      if (j.capped) {
        setNotice(`Solo aparté ${fmtMoney(j.reserved ?? 0)} (es lo que cabía en el saldo de la cuenta).`);
        setAmount("");
      } else {
        onClose();
      }
    } else setError(j.error ?? "No se pudo abonar");
  }

  return (
    <Sheet title={`Abonar a ${saving.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Monto (COP)
          <MoneyInput required autoFocus value={amount} onChange={setAmount} placeholder="100.000" className={`${field} font-semibold`} />
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          ¿De dónde sale?
          <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={field}>
            <option value="">Apartar de la misma cuenta</option>
            {accounts.filter((a) => a.account_id !== saving.account_id).map((a) => (<option key={a.account_id} value={a.account_id}>Mover desde {a.name}</option>))}
          </select>
        </label>
        {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
        {notice && <p className="rounded-[10px] bg-[#ff9f0a]/12 px-3 py-2 text-[13px] text-[#b86e00]">🐷 {notice}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">{notice ? "Cerrar" : "Cancelar"}</button>
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
          <MoneyInput value={reserved} onChange={setReserved} className={`${field} font-semibold`} />
          <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]">Bájalo para liberar parte de este ahorro.</span>
        </label>
        <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
          Meta (opcional)
          <MoneyInput value={goal} onChange={setGoal} placeholder="Sin meta" className={field} />
        </label>
        {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={remove} disabled={busy} className="grid place-items-center rounded-[var(--radius-control)] border border-[#ff375f]/30 bg-[#ff375f]/10 px-4 py-2.5 text-[#ff375f] transition hover:bg-[#ff375f]/20" title="Eliminar ahorro"><NavIcon name="trash" size={17} /></button>
          <button type="submit" disabled={busy} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Sheet>
  );
}

interface Move {
  id: string;
  delta_minor: number;
  reason: string;
  created_at: string;
}
const REASON_LABEL: Record<string, string> = {
  deposit: "Abono",
  withdraw: "Retiro",
  spent: "Gasto desde el ahorro",
  goal: "Meta",
  adjust: "Ajuste",
};

/** Historial de movimientos de un ahorro (abonos, retiros, gastos). */
function HistoryModal({ saving, onClose }: { saving: SavingRow; onClose: () => void }) {
  const [moves, setMoves] = useState<Move[] | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await createClient()
        .from("savings_moves")
        .select("id, delta_minor, reason, created_at")
        .eq("saving_id", saving.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setMoves((data as Move[]) ?? []);
    })();
  }, [saving.id]);

  return (
    <Sheet title={`Historial · ${saving.name}`} onClose={onClose}>
      <div className="p-6">
        {moves === null ? (
          <p className="py-8 text-center text-[14px] text-[var(--color-ink-soft)]">Cargando…</p>
        ) : moves.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-[var(--color-ink-soft)]">
            Aún no hay movimientos en este ahorro. Los abonos y retiros que hagas desde ahora aparecerán aquí.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {moves.map((m) => {
              const pos = m.delta_minor >= 0;
              return (
                <li key={m.id} className="flex items-center justify-between py-2.5">
                  <span>
                    <span className="block text-[14px] font-medium">{REASON_LABEL[m.reason] ?? m.reason}</span>
                    <span className="block text-[11px] text-[var(--color-ink-soft)]">
                      {new Date(m.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  <span className={`text-[14px] font-semibold ${pos ? "text-[#30d158]" : "text-[#ff375f]"}`}>
                    {pos ? "+" : "−"}{fmtMoney(Math.abs(m.delta_minor))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
