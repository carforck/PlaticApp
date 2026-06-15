"use client";

import { useMemo, useState } from "react";
import type { AccountRow, CategoryRow, TxRow } from "@/lib/queries";
import { Sheet } from "./Sheet";
import { MoneyInput } from "./MoneyInput";

const KINDS = [
  { value: "expense", label: "Gasto", emoji: "💸" },
  { value: "income", label: "Ingreso", emoji: "💰" },
  { value: "investment", label: "Inversión", emoji: "📈" },
  { value: "transfer", label: "Transferir", emoji: "🔄" },
] as const;
type Kind = (typeof KINDS)[number]["value"];

const NEW = "__new__";
const ACCOUNT_TYPES = [
  { value: "bank", label: "Banco" },
  { value: "cash", label: "Efectivo" },
  { value: "wallet", label: "Billetera" },
  { value: "investment", label: "Inversión" },
  { value: "credit", label: "Crédito" },
] as const;

export function AddTransactionModal({
  accounts,
  categories,
  editTx,
  initialKind,
  onClose,
  onSaved,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  editTx?: TxRow | null;
  initialKind?: Kind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editTx;
  const [kind, setKind] = useState<Kind>(editTx ? (editTx.kind as Kind) : initialKind ?? "expense");
  const [amount, setAmount] = useState(editTx ? String(editTx.amount_minor) : "");
  const [accountId, setAccountId] = useState(editTx?.account_id ?? accounts[0]?.account_id ?? "");
  const [transferAccountId, setTransferAccountId] = useState(editTx?.transfer_account_id ?? "");
  const [categoryId, setCategoryId] = useState(editTx?.category_id ?? "");
  const [description, setDescription] = useState(editTx?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Crear cuenta nueva sin salir del formulario.
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<string>("bank");
  const creatingAccount = accountId === NEW;

  // Avisos al gastar: ¿toca el ahorro? ¿deja la cuenta en negativo (sobregiro)?
  const selAcc = accounts.find((a) => a.account_id === accountId);
  const after = selAcc && amount ? selAcc.balance_minor - Number(amount) : null;
  const touchesSavings =
    kind === "expense" && !!selAcc && selAcc.reserved_minor > 0 && after !== null && after < selAcc.reserved_minor;
  const wouldOverdraft =
    kind === "expense" && !!selAcc && selAcc.type !== "credit" && after !== null && after < 0;

  async function remove() {
    if (!editTx) return;
    setSaving(true);
    const res = await fetch(`/api/transactions?id=${editTx.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setError("No se pudo eliminar");
  }

  // Categorías aplicables al tipo elegido (income/expense; investment no filtra).
  const cats = useMemo(
    () =>
      categories.filter((c) => {
        if (kind === "investment") return true;
        return !c.applies_to || c.applies_to === kind;
      }),
    [categories, kind],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Si eligió «Crear cuenta nueva», la creamos primero y usamos su id.
    let resolvedAccountId = accountId;
    if (creatingAccount) {
      if (!newAccName.trim()) {
        setSaving(false);
        setError("Escribe el nombre de la cuenta nueva.");
        return;
      }
      const ar = await fetch("/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newAccName.trim(), type: newAccType, openingBalance: 0 }),
      });
      if (!ar.ok) {
        setSaving(false);
        setError((await ar.json().catch(() => ({}))).error ?? "No se pudo crear la cuenta.");
        return;
      }
      resolvedAccountId = (await ar.json()).id;
    }

    const payload = {
      kind,
      amount: Number(amount),
      accountId: resolvedAccountId,
      categoryId: kind === "transfer" ? null : categoryId || null,
      transferAccountId: kind === "transfer" ? transferAccountId || null : null,
      description: description || null,
    };
    const res = await fetch("/api/transactions", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isEdit ? { id: editTx!.id, ...payload } : payload),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "No se pudo registrar");
    }
  }

  return (
    <Sheet title={isEdit ? "Editar movimiento" : "Registrar movimiento"} onClose={onClose}>
        <form onSubmit={submit} className="space-y-4 p-6">
          {/* Segmented control de tipo */}
          <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-black/[0.05] p-1 sm:grid-cols-4">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={`rounded-[7px] py-1.5 text-[12px] font-medium transition ${
                  kind === k.value ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"
                }`}
              >
                {k.emoji} {k.label}
              </button>
            ))}
          </div>

          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Monto (COP)
            <MoneyInput
              required
              autoFocus
              value={amount}
              onChange={setAmount}
              placeholder="50.000"
              className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[17px] font-semibold text-[var(--color-ink)] outline-none ring-[var(--color-accent)] transition focus:ring-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              {kind === "transfer" ? "Desde" : "Cuenta"}
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2"
              >
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.name}
                  </option>
                ))}
                <option value={NEW}>➕ Crear cuenta nueva</option>
              </select>
            </label>

            {kind === "transfer" ? (
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                Hacia
                <select
                  value={transferAccountId}
                  onChange={(e) => setTransferAccountId(e.target.value)}
                  className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2"
                >
                  <option value="">— Cuenta destino —</option>
                  {accounts.filter((a) => a.account_id !== accountId).map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                Categoría
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2"
                >
                  <option value="">— Sin categoría —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji ? `${c.emoji} ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {creatingAccount && (
            <div className="grid grid-cols-2 gap-3 rounded-[12px] bg-[var(--color-accent)]/8 p-3">
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                Nombre de la cuenta
                <input
                  autoFocus
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="Nu, Lulo, Davivienda…"
                  className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2"
                />
              </label>
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                Tipo
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value)}
                  className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Descripción (opcional)
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Almuerzo con el equipo"
              className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2"
            />
          </label>

          {wouldOverdraft && (
            <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">
              🔴 Tu {selAcc!.name} quedaría en negativo. Cada gasto sale de una cuenta: registra primero
              cuánto tienes (Cuentas → editar saldo) o tus ingresos.
            </p>
          )}
          {touchesSavings && !wouldOverdraft && (
            <p className="rounded-[10px] bg-[#ff9f0a]/12 px-3 py-2 text-[13px] text-[#b86e00]">
              🐷 Este gasto reduce tu ahorro apartado en {selAcc!.name}.
            </p>
          )}

          {error && (
            <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            {isEdit ? (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="rounded-[var(--radius-control)] border border-[#ff375f]/30 bg-[#ff375f]/10 px-4 py-2.5 text-[14px] font-medium text-[#ff375f] transition hover:bg-[#ff375f]/20"
                title="Eliminar"
              >
                🗑️
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !accountId || (creatingAccount && !newAccName.trim()) || (kind === "transfer" && !transferAccountId)}
              className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70"
            >
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </form>
    </Sheet>
  );
}
