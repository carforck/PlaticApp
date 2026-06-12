"use client";

import { useMemo, useState } from "react";
import type { AccountRow, CategoryRow, TxRow } from "@/lib/queries";

const KINDS = [
  { value: "expense", label: "Gasto", emoji: "💸" },
  { value: "income", label: "Ingreso", emoji: "💰" },
  { value: "investment", label: "Inversión", emoji: "📈" },
] as const;
type Kind = (typeof KINDS)[number]["value"];

export function AddTransactionModal({
  accounts,
  categories,
  editTx,
  onClose,
  onSaved,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  editTx?: TxRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editTx;
  const [kind, setKind] = useState<Kind>(
    editTx && editTx.kind !== "transfer" ? (editTx.kind as Kind) : "expense",
  );
  const [amount, setAmount] = useState(editTx ? String(editTx.amount_minor) : "");
  const [accountId, setAccountId] = useState(editTx?.account_id ?? accounts[0]?.account_id ?? "");
  const [categoryId, setCategoryId] = useState(editTx?.category_id ?? "");
  const [description, setDescription] = useState(editTx?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    const payload = {
      kind,
      amount: Number(amount),
      accountId,
      categoryId: categoryId || null,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass animate-float-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">
            {isEdit ? "Editar movimiento" : "Registrar movimiento"}
          </span>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {/* Segmented control de tipo */}
          <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-black/[0.05] p-1">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={`rounded-[7px] py-1.5 text-[13px] font-medium transition ${
                  kind === k.value ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"
                }`}
              >
                {k.emoji} {k.label}
              </button>
            ))}
          </div>

          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Monto (COP)
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000"
              className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[17px] font-semibold text-[var(--color-ink)] outline-none ring-[var(--color-accent)] transition focus:ring-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Cuenta
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
              </select>
            </label>

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
          </div>

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
              disabled={saving || !accountId}
              className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70"
            >
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
