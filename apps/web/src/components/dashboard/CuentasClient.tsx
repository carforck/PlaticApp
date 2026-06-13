"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import type { AccountRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { accountFinance, isCreditAccount } from "@/lib/finance";
import { ACCOUNT_EMOJI, ACCOUNT_TYPE_LABEL } from "@/lib/labels";
import { MoneyInput } from "./MoneyInput";

const TYPES = [
  { value: "bank", label: "Banco" },
  { value: "cash", label: "Efectivo" },
  { value: "wallet", label: "Billetera" },
  { value: "investment", label: "Inversión" },
  { value: "credit", label: "Tarjeta de crédito / Crédito" },
] as const;

export function CuentasClient() {
  const { data, refresh } = useDashboard();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [detail, setDetail] = useState<AccountRow | null>(null);

  const { assets, creditDebt, netWorth } = accountFinance(data.accounts);

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Cuentas</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">
            Patrimonio: <span className="font-semibold text-[var(--color-ink)]">{fmtMoney(netWorth)}</span>
            {creditDebt > 0 && (
              <span className="text-[var(--color-ink-soft)]"> · activos {fmtMoney(assets)} − deuda de crédito {fmtMoney(creditDebt)}</span>
            )}
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
          + Nueva cuenta
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.accounts.map((a) => (
          <button
            key={a.account_id}
            onClick={() => setDetail(a)}
            className="glass rounded-[var(--radius-card)] p-5 text-left transition hover:brightness-[1.02]"
          >
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
            {isCreditAccount(a.type) ? (
              <>
                <p className="mt-4 text-[24px] font-semibold tracking-tight text-[#ff375f]">
                  {a.balance_minor < 0 ? `Debes ${fmtMoney(-a.balance_minor, a.currency)}` : fmtMoney(a.balance_minor, a.currency)}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">Deuda · no suma al patrimonio</p>
              </>
            ) : (
              <>
                <p className="mt-4 text-[24px] font-semibold tracking-tight">{fmtMoney(a.balance_minor, a.currency)}</p>
                {a.reserved_minor > 0 ? (
                  <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">
                    Disponible {fmtMoney(a.balance_minor - a.reserved_minor, a.currency)} · 🐷 Ahorrado {fmtMoney(a.reserved_minor, a.currency)}
                  </p>
                ) : (
                  a.opening_minor !== a.balance_minor && (
                    <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">Saldo inicial: {fmtMoney(a.opening_minor, a.currency)}</p>
                  )
                )}
              </>
            )}
          </button>
        ))}

        {data.accounts.length === 0 && (
          <p className="text-[14px] text-[var(--color-ink-soft)]">Aún no tienes cuentas. Crea la primera.</p>
        )}
      </section>

      {detail && (
        <AccountDetailModal
          account={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail);
            setDetail(null);
          }}
          onSaved={refresh}
        />
      )}

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

function AccountDetailModal({
  account,
  onClose,
  onEdit,
  onSaved,
}: {
  account: AccountRow;
  onClose: () => void;
  onEdit: () => void;
  onSaved: () => void;
}) {
  const { data } = useDashboard();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const accById = useMemo(() => new Map(data.accounts.map((a) => [a.account_id, a])), [data.accounts]);
  const movements = useMemo(
    () =>
      data.transactions.filter((t) => t.account_id === account.account_id || t.transfer_account_id === account.account_id),
    [data.transactions, account.account_id],
  );

  async function archive() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: account.account_id, archived: true }),
    });
    setBusy(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError("No se pudo archivar.");
  }

  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/accounts?id=${account.account_id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "No se pudo eliminar.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="glass animate-float-in relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Detalle de la cuenta</span>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-black/[0.05] text-[24px]">
              {ACCOUNT_EMOJI[account.type] ?? "💼"}
            </span>
            <div>
              <p className="text-[18px] font-semibold">{account.name}</p>
              <p className="text-[12px] text-[var(--color-ink-soft)]">
                {ACCOUNT_TYPE_LABEL[account.type] ?? account.type} · {account.currency}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-[var(--radius-control)] bg-black/[0.03] p-3">
              <p className="text-[11px] text-[var(--color-ink-soft)]">Saldo actual</p>
              <p className="mt-0.5 text-[15px] font-semibold">{fmtMoney(account.balance_minor, account.currency)}</p>
            </div>
            <div className="rounded-[var(--radius-control)] bg-black/[0.03] p-3">
              <p className="text-[11px] text-[var(--color-ink-soft)]">Saldo inicial</p>
              <p className="mt-0.5 text-[15px] font-semibold">{fmtMoney(account.opening_minor, account.currency)}</p>
            </div>
            <div className="rounded-[var(--radius-control)] bg-black/[0.03] p-3">
              <p className="text-[11px] text-[var(--color-ink-soft)]">Movimientos</p>
              <p className="mt-0.5 text-[15px] font-semibold">{movements.length}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">Movimientos recientes</h3>
            {movements.length === 0 ? (
              <p className="text-[13px] text-[var(--color-ink-soft)]">Sin movimientos en esta cuenta.</p>
            ) : (
              <div className="space-y-1.5">
                {movements.slice(0, 10).map((t) => {
                  const cat = catById.get(t.category_id ?? "");
                  const isTransferIn = t.kind === "transfer" && t.transfer_account_id === account.account_id;
                  const signed = t.kind === "income" || isTransferIn ? t.amount_minor : -t.amount_minor;
                  const other = isTransferIn ? accById.get(t.account_id)?.name : null;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span>{cat?.emoji ?? (t.kind === "transfer" ? "🔄" : "🧾")}</span>
                        <span className="min-w-0">
                          <span className="block truncate">{t.description || cat?.name || (other ? `Transferencia de ${other}` : "Movimiento")}</span>
                          <span className="block text-[11px] text-[var(--color-ink-soft)]">
                            {new Date(t.occurred_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                          </span>
                        </span>
                      </span>
                      <span className={`shrink-0 font-medium ${signed > 0 ? "text-[#30d158]" : "text-[var(--color-ink)]"}`}>
                        {signed > 0 ? "+" : "−"}{fmtMoney(Math.abs(signed), t.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={onEdit} className="btn-mac px-4 py-2.5 text-[14px] font-medium">✏️ Editar</button>
            <button onClick={archive} disabled={busy} className="rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-4 py-2.5 text-[14px] font-medium transition hover:bg-white/90 disabled:opacity-60">
              📦 Archivar
            </button>
            <button onClick={remove} disabled={busy} className="rounded-[var(--radius-control)] border border-[#ff375f]/30 bg-[#ff375f]/10 px-4 py-2.5 text-[14px] font-medium text-[#ff375f] transition hover:bg-[#ff375f]/20 disabled:opacity-60">
              🗑️ Eliminar
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-ink-soft)]">
            «Eliminar» solo funciona si la cuenta no tiene movimientos. Si los tiene, usa «Archivar» para conservar el historial.
          </p>
        </div>
      </div>
    </div>
  );
}

function AccountModal({ account, onClose, onSaved }: { account: AccountRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!account;
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<string>(account?.type ?? "bank");
  const credit = isCreditAccount(type);
  const [opening, setOpening] = useState(
    account ? String(account.type === "credit" ? Math.abs(account.opening_minor) : account.opening_minor) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    // En crédito el saldo de arranque es una DEUDA: se guarda en negativo.
    const raw = opening === "" ? 0 : Number(opening);
    const openingBalance = credit ? -Math.abs(raw) : raw;
    const res = isEdit
      ? await fetch("/api/accounts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: account!.account_id, name, type, openingBalance }) })
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
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Tipo
            <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {isEdit && credit && account!.type !== "credit" && (
              <span className="mt-1 block text-[11px] text-[#b86e00]">
                ⚠️ Al pasarla a crédito, su saldo se tratará como deuda y dejará de sumar al patrimonio.
              </span>
            )}
          </label>
          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            {credit ? "¿Cuánto debes ahora? (COP)" : isEdit ? "Saldo inicial (COP)" : "¿Cuánto tienes ahí ahora? (COP)"}
            <MoneyInput value={opening} onChange={setOpening} placeholder="0" className={field} />
            <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]">
              {credit
                ? "Es tu deuda actual de la tarjeta/crédito. Cuenta como pasivo: resta del patrimonio, no suma."
                : "Es tu saldo de arranque, no cuenta como ingreso."}
            </span>
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
