"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { type DebtRow, type AccountRow, type DebtPaymentRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { Paginator, usePagination } from "./Paginator";
import { MoneyInput } from "./MoneyInput";
import { TrafficLights } from "./TrafficLights";
import { NavIcon } from "./NavIcon";

export function DeudasClient() {
  const { data, refresh } = useDashboard();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DebtRow | null>(null);
  const [abono, setAbono] = useState<DebtRow | null>(null);
  const [history, setHistory] = useState<DebtRow | null>(null);

  const debts = data.debts;
  const accName = new Map(data.accounts.map((a) => [a.account_id, a.name]));
  // Lo abonado por deuda (para calcular lo que falta y la barra de progreso).
  const paidByDebt = new Map<string, number>();
  for (const p of data.debtPayments ?? []) paidByDebt.set(p.debt_id, (paidByDebt.get(p.debt_id) ?? 0) + p.amount_minor);
  const outstandingOf = (d: DebtRow) => Math.max(0, d.amount_minor - (paidByDebt.get(d.id) ?? 0));

  const pg = usePagination(debts, 15);
  const open = debts.filter((d) => d.status === "open");
  // Los totales usan lo que FALTA (saldo pendiente), no el monto original.
  const theyOwe = open.filter((d) => d.direction === "they_owe").reduce((s, d) => s + outstandingOf(d), 0);
  const iOwe = open.filter((d) => d.direction === "i_owe").reduce((s, d) => s + outstandingOf(d), 0);
  // Préstamos abiertos que aún no salen/entran de ninguna cuenta (registrados antes de la mejora).
  const noAccountOpen = open.filter((d) => !d.account_id);

  return (
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

        {noAccountOpen.length > 0 && data.accounts.length > 0 && (
          <DebtBackfillBanner debts={noAccountOpen} accounts={data.accounts} onDone={refresh} />
        )}

        <div className="glass overflow-hidden rounded-[var(--radius-card)]">
          {debts.length === 0 ? (
            <p className="p-8 text-center text-[14px] text-[var(--color-ink-soft)]">
              Sin deudas registradas. Dile al bot «Juan me prestó 200 mil» o créala aquí.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {pg.pageItems.map((d) => (
                <DebtRowItem
                  key={d.id}
                  d={d}
                  paid={paidByDebt.get(d.id) ?? 0}
                  onAbonar={() => setAbono(d)}
                  onEdit={() => setEditing(d)}
                  onHistory={() => setHistory(d)}
                  accountName={d.account_id ? accName.get(d.account_id) : undefined}
                />
              ))}
            </ul>
          )}
          <Paginator page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} onPage={pg.setPage} noun="deudas" />
        </div>

      {(creating || editing) && (
        <DebtModal
          debt={editing}
          accounts={data.accounts}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={refresh}
        />
      )}

      {abono && (
        <AbonoModal
          debt={abono}
          paid={paidByDebt.get(abono.id) ?? 0}
          payments={(data.debtPayments ?? []).filter((p) => p.debt_id === abono.id)}
          accounts={data.accounts}
          accName={accName}
          onClose={() => setAbono(null)}
          onSaved={refresh}
        />
      )}

      {history && <DebtEventsModal debt={history} onClose={() => setHistory(null)} />}
    </main>
  );
}

/**
 * Abonos de una deuda: registra pagos parciales o totales. Cada abono mueve la cuenta elegida
 * (me deben → entra; yo debo → sale) y aparece en Movimientos. Muestra progreso y permite deshacer.
 */
function AbonoModal({
  debt,
  paid,
  payments,
  accounts,
  accName,
  onClose,
  onSaved,
}: {
  debt: DebtRow;
  paid: number;
  payments: DebtPaymentRow[];
  accounts: AccountRow[];
  accName: Map<string, string | undefined>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isTheyOwe = debt.direction === "they_owe";
  const outstanding = Math.max(0, debt.amount_minor - paid);
  const [amount, setAmount] = useState(String(outstanding));
  const [accountId, setAccountId] = useState(debt.account_id ?? accounts[0]?.account_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const amountNum = Number(amount);
  const pct = debt.amount_minor > 0 ? Math.min(100, Math.round((paid / debt.amount_minor) * 100)) : 0;

  async function confirm() {
    if (!Number.isFinite(amountNum) || amountNum <= 0) return setError("Escribe un monto válido");
    setSaving(true);
    setError("");
    const res = await fetch("/api/debts/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ debtId: debt.id, amount: amountNum, accountId: accountId || null }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError((await res.json().catch(() => ({}))).error ?? "No se pudo registrar el abono");
  }

  async function undo(paymentId: string) {
    setSaving(true);
    await fetch(`/api/debts/pay?id=${paymentId}`, { method: "DELETE" });
    setSaving(false);
    onSaved();
    onClose();
  }

  const field = "w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[var(--color-accent)] focus:ring-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-sm overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <TrafficLights onClose={onClose} />
          <span className="ml-3 truncate text-[13px] font-medium text-[var(--color-ink-soft)]">
            {isTheyOwe ? `Cobrar a ${debt.counterparty}` : `Pagar a ${debt.counterparty}`}
          </span>
        </div>
        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
          {/* Progreso */}
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[var(--color-ink-soft)]">Abonado</span>
              <span className="text-[13px] font-medium">{fmtMoney(paid, debt.currency)} de {fmtMoney(debt.amount_minor, debt.currency)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.08]">
              <div className={`h-full rounded-full ${isTheyOwe ? "bg-[#30d158]" : "bg-[#ff375f]"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] font-medium">
              {outstanding > 0 ? <>Falta <b>{fmtMoney(outstanding, debt.currency)}</b></> : "✅ Saldada por completo"}
            </p>
          </div>

          {outstanding > 0 && (
            <>
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                Monto del abono
                <MoneyInput value={amount} onChange={setAmount} placeholder={String(outstanding)} className={`${field} mt-1.5 font-semibold`} />
                <span className="mt-1 flex gap-2">
                  <button type="button" onClick={() => setAmount(String(outstanding))} className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">
                    Abonar todo ({fmtMoney(outstanding, debt.currency)})
                  </button>
                </span>
              </label>
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                {isTheyOwe ? "¿A qué cuenta entra?" : "¿De qué cuenta sale?"}
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${field} mt-1.5`}>
                  <option value="">— No mover ninguna cuenta —</option>
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>{a.name}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]">
                  {accountId
                    ? isTheyOwe
                      ? "Sumaremos el abono a esa cuenta y aparecerá en Movimientos."
                      : "Restaremos el abono de esa cuenta y aparecerá en Movimientos."
                    : "Sin cuenta el abono no mueve ningún saldo (solo lleva la cuenta de lo pagado)."}
                </span>
              </label>
              {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
              <button onClick={confirm} disabled={saving} className="btn-mac w-full py-2.5 text-[14px] font-medium disabled:opacity-70">
                {saving ? "Guardando…" : amountNum >= outstanding ? "Registrar y saldar" : "Registrar abono"}
              </button>
            </>
          )}

          {/* Historial de abonos con deshacer */}
          {payments.length > 0 && (
            <div className="border-t border-black/5 pt-3">
              <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">Abonos ({payments.length})</p>
              <ul className="mt-1.5 divide-y divide-black/5">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span>
                      <span className="block text-[13px] font-medium">{fmtMoney(p.amount_minor, debt.currency)}</span>
                      <span className="block text-[11px] text-[var(--color-ink-soft)]">
                        {p.account_id ? accName.get(p.account_id) ?? "cuenta" : "sin cuenta"} ·{" "}
                        {new Date(p.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                      </span>
                    </span>
                    <button onClick={() => undo(p.id)} disabled={saving} className="rounded-[8px] border border-black/10 bg-white/60 px-2.5 py-1 text-[12px] font-medium transition hover:bg-white disabled:opacity-60">
                      Deshacer
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Aviso (solo para quien tenga préstamos viejos sin cuenta): explica en simple qué pasó
 * y deja que el usuario decida — asignarlos a una cuenta él mismo, o dejarlos como registro.
 */
function DebtBackfillBanner({ debts, accounts, onDone }: { debts: DebtRow[]; accounts: AccountRow[]; onDone: () => void }) {
  const STORAGE_KEY = "platica-debt-backfill-dismissed";
  const [dismissed, setDismissed] = useState(true); // se decide tras leer localStorage
  const [accountId, setAccountId] = useState(accounts[0]?.account_id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (dismissed) return null;

  function leaveAsIs() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  async function assignAll() {
    if (!accountId) return;
    setSaving(true);
    await Promise.all(
      debts.map((d) =>
        fetch("/api/debts", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          // Modo «al pagar»: no mueve tu saldo ahora, solo cuando la deuda se salde.
          body: JSON.stringify({ id: d.id, accountId, movesAt: "settlement" }),
        }),
      ),
    );
    setSaving(false);
    onDone();
  }

  return (
    <div className="glass rounded-[var(--radius-card)] border border-[#ff9f0a]/30 bg-[#ff9f0a]/[0.06] p-5">
      <p className="text-[14px] font-semibold">💡 Tienes {debts.length} préstamo{debts.length > 1 ? "s" : ""} sin cuenta asociada</p>
      <p className="mt-1.5 text-[13px] leading-snug text-[var(--color-ink-soft)]">
        Por ahora son <b>solo un registro</b> y no afectan tus saldos. Si quieres, asóciales una cuenta:
        cuando marques cada deuda como <b>pagada</b>, la plata <b>entrará o saldrá</b> de esa cuenta
        (no se mueve nada ahora, así no se descuadra tu saldo).
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2 text-[13px] outline-none ring-[var(--color-accent)] focus:ring-2"
        >
          {accounts.map((a) => (
            <option key={a.account_id} value={a.account_id}>{a.name}</option>
          ))}
        </select>
        <button onClick={assignAll} disabled={saving || !accountId} className="btn-mac px-4 py-2 text-[13px] font-medium disabled:opacity-70">
          {saving ? "Asignando…" : "Asociar cuenta (se mueve al pagar)"}
        </button>
        <button onClick={leaveAsIs} className="rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-4 py-2 text-[13px] font-medium transition hover:bg-white/90">
          Dejarlos como registro
        </button>
      </div>
    </div>
  );
}

function DebtRowItem({
  d,
  paid,
  onAbonar,
  onEdit,
  onHistory,
  accountName,
}: {
  d: DebtRow;
  paid: number;
  onAbonar: () => void;
  onEdit: () => void;
  onHistory: () => void;
  accountName?: string;
}) {
  const settled = d.status === "settled";
  const outstanding = Math.max(0, d.amount_minor - paid);
  const partial = paid > 0 && !settled;
  const pct = d.amount_minor > 0 ? Math.min(100, Math.round((paid / d.amount_minor) * 100)) : 0;
  return (
    <li
      onClick={onEdit}
      className={`flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-black/[0.03] ${settled ? "opacity-50" : ""}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">
          {d.direction === "they_owe" ? "📥" : "📤"}
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-medium">
            {d.direction === "they_owe" ? `${d.counterparty} te debe` : `Le debes a ${d.counterparty}`}
            {settled && " · saldada"}
          </span>
          <span className="block truncate text-[12px] text-[var(--color-ink-soft)]">
            {d.description ? `${d.description} · ` : ""}
            {accountName ?? "sin cuenta"}
          </span>
          {partial && (
            <span className="mt-1 flex w-40 max-w-[45vw] items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.08]">
                <span className={`block h-full rounded-full ${d.direction === "they_owe" ? "bg-[#30d158]" : "bg-[#ff375f]"}`} style={{ width: `${pct}%` }} />
              </span>
              <span className="text-[10px] text-[var(--color-ink-soft)]">{pct}%</span>
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="text-right">
          <span className={`block text-[14px] font-semibold ${d.direction === "they_owe" ? "text-[#30d158]" : "text-[#ff375f]"}`}>
            {fmtMoney(outstanding, d.currency)}
          </span>
          {partial && <span className="block text-[10px] text-[var(--color-ink-soft)]">de {fmtMoney(d.amount_minor, d.currency)}</span>}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onHistory(); }} className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--color-ink-soft)] hover:bg-black/5" title="Historial">
          <NavIcon name="history" size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAbonar();
          }}
          className="rounded-[8px] border border-black/10 bg-white/60 px-2.5 py-1 text-[12px] font-medium transition hover:bg-white"
        >
          {settled ? "Ver" : "Abonar"}
        </button>
      </span>
    </li>
  );
}

function DebtModal({
  debt,
  accounts,
  onClose,
  onSaved,
}: {
  debt: DebtRow | null;
  accounts: AccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!debt;
  const [counterparty, setCounterparty] = useState(debt?.counterparty ?? "");
  const [direction, setDirection] = useState<"i_owe" | "they_owe">(debt?.direction ?? "they_owe");
  const [amount, setAmount] = useState(debt ? String(debt.amount_minor) : "");
  const [description, setDescription] = useState(debt?.description ?? "");
  const [accountId, setAccountId] = useState(debt?.account_id ?? "");
  const [movesAt, setMovesAt] = useState<"creation" | "settlement">(debt?.moves_at ?? "settlement");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = { counterparty, direction, amount: Number(amount), description, accountId: accountId || null, movesAt };
    const res = await fetch("/api/debts", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isEdit ? { id: debt!.id, ...payload } : payload),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "No se pudo guardar");
    }
  }

  async function remove() {
    if (!debt) return;
    setSaving(true);
    const res = await fetch(`/api/debts?id=${debt.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError("No se pudo eliminar");
  }

  const field =
    "mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[var(--color-accent)] focus:ring-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-sm overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <TrafficLights onClose={onClose} />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">{isEdit ? "Editar deuda" : "Nueva deuda"}</span>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-black/[0.05] p-1">
            <button type="button" onClick={() => setDirection("they_owe")} className={`rounded-[7px] py-1.5 text-[13px] font-medium transition ${direction === "they_owe" ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}>
              📥 Me deben
            </button>
            <button type="button" onClick={() => setDirection("i_owe")} className={`rounded-[7px] py-1.5 text-[13px] font-medium transition ${direction === "i_owe" ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}>
              📤 Yo debo
            </button>
          </div>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Persona
            <input autoFocus required value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="Juan, María…" className={field} />
          </label>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Monto (COP)
            <MoneyInput required value={amount} onChange={setAmount} placeholder="200.000" className={`${field} font-semibold`} />
          </label>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Cuenta relacionada (opcional)
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
              <option value="">— No mover ninguna cuenta (solo registro) —</option>
              {accounts.map((a) => (
                <option key={a.account_id} value={a.account_id}>{a.name}</option>
              ))}
            </select>
          </label>

          {accountId && (
            <div>
              <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">¿Cuándo se mueve la plata?</p>
              <div className="mt-1.5 grid grid-cols-1 gap-1 rounded-[10px] bg-black/[0.05] p-1 sm:grid-cols-2">
                <button type="button" onClick={() => setMovesAt("settlement")} className={`rounded-[7px] px-2 py-1.5 text-[12.5px] font-medium transition ${movesAt === "settlement" ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}>
                  {direction === "they_owe" ? "Entra cuando me paguen" : "Sale cuando la pague"}
                </button>
                <button type="button" onClick={() => setMovesAt("creation")} className={`rounded-[7px] px-2 py-1.5 text-[12.5px] font-medium transition ${movesAt === "creation" ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`}>
                  {direction === "they_owe" ? "Ya salió (presté efectivo)" : "Ya entró (recibí efectivo)"}
                </button>
              </div>
              <span className="mt-1.5 block text-[11px] text-[var(--color-ink-soft)]">
                {movesAt === "settlement"
                  ? "Tu saldo no cambia ahora; se mueve cuando marques la deuda como pagada."
                  : direction === "they_owe"
                    ? "Tu saldo baja ahora (prestaste); vuelve al saldar."
                    : "Tu saldo sube ahora (recibiste); baja al saldar."}
              </span>
            </div>
          )}
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Nota (opcional)
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Soporte técnico" className={field} />
          </label>
          {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
          <div className="flex gap-2 pt-1">
            {isEdit ? (
              <button type="button" onClick={remove} disabled={saving} className="grid place-items-center rounded-[var(--radius-control)] border border-[#ff375f]/30 bg-[#ff375f]/10 px-4 py-2.5 text-[#ff375f] transition hover:bg-[#ff375f]/20" title="Eliminar">
                <NavIcon name="trash" size={17} />
              </button>
            ) : (
              <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={saving} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">
              {saving ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DebtEvent {
  id: string;
  event: string;
  detail: string | null;
  created_at: string;
}
const DEBT_EVENT_LABEL: Record<string, string> = {
  created: "📝 Creada",
  abono: "💵 Abono",
  settled: "✅ Saldada",
  reopened: "↩️ Reabierta",
  edited: "✏️ Editada",
};

/** Historial de estado de una deuda (creada, saldada, reabierta, editada). */
function DebtEventsModal({ debt, onClose }: { debt: DebtRow; onClose: () => void }) {
  const [rows, setRows] = useState<DebtEvent[] | null>(null);
  useEffect(() => {
    void (async () => {
      const { data } = await createClient()
        .from("debt_events")
        .select("id, event, detail, created_at")
        .eq("debt_id", debt.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as DebtEvent[]) ?? []);
    })();
  }, [debt.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-sm overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <TrafficLights onClose={onClose} />
          <span className="ml-3 truncate text-[13px] font-medium text-[var(--color-ink-soft)]">Historial · {debt.counterparty}</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {rows === null ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-ink-soft)]">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-ink-soft)]">
              Sin eventos registrados todavía. Los cambios (saldar, reabrir, editar) que hagas desde ahora aparecerán aquí.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {rows.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <span>
                    <span className="block text-[14px] font-medium">{DEBT_EVENT_LABEL[e.event] ?? e.event}</span>
                    {e.detail && <span className="block text-[11px] text-[var(--color-ink-soft)]">{e.detail}</span>}
                  </span>
                  <span className="text-[11px] text-[var(--color-ink-soft)]">
                    {new Date(e.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
