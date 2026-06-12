"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import type { TxRow } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { AddTransactionModal } from "./AddTransactionModal";

export function InversionesClient() {
  const { data, refresh } = useDashboard();
  const accById = useMemo(() => new Map(data.accounts.map((a) => [a.account_id, a])), [data.accounts]);
  const invs = data.transactions.filter((t) => t.kind === "investment");
  const total = invs.reduce((s, t) => s + t.amount_minor, 0);
  const investAccounts = data.accounts.filter((a) => a.type === "investment");

  const [adding, setAdding] = useState(false);
  const [editTx, setEditTx] = useState<TxRow | null>(null);

  return (
    <main className="flex-1 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Inversiones</h1>
            <p className="text-[13px] text-[var(--color-ink-soft)]">Aportes registrados y cuentas de inversión</p>
          </div>
          <button onClick={() => setAdding(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
            + Registrar inversión
          </button>
        </header>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="glass rounded-[var(--radius-card)] p-5">
            <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">Total aportado</p>
            <p className="mt-1 text-[24px] font-semibold tracking-tight text-[#bf5af2]">{fmtMoney(total)}</p>
          </div>
          {investAccounts.map((a) => (
            <div key={a.account_id} className="glass rounded-[var(--radius-card)] p-5">
              <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">📈 {a.name}</p>
              <p className="mt-1 text-[24px] font-semibold tracking-tight">{fmtMoney(a.balance_minor, a.currency)}</p>
            </div>
          ))}
        </section>

        <div className="glass overflow-hidden rounded-[var(--radius-card)]">
          {invs.length === 0 ? (
            <p className="p-8 text-center text-[14px] text-[var(--color-ink-soft)]">
              Aún no registras inversiones. Dile al bot «invertí 500 mil en el fondo», usa «+ Registrar inversión»
              o el botón de arriba.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {invs.map((t) => (
                <li
                  key={t.id}
                  onClick={() => setEditTx(t)}
                  className="flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-black/[0.03]"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">📈</span>
                    <span>
                      <span className="block text-[14px] font-medium">{t.description ?? "Aporte"}</span>
                      <span className="block text-[12px] text-[var(--color-ink-soft)]">
                        {accById.get(t.account_id)?.name ?? "—"} · {new Date(t.occurred_at).toLocaleDateString("es-CO")}
                      </span>
                    </span>
                  </span>
                  <span className="text-[14px] font-semibold text-[#bf5af2]">{fmtMoney(t.amount_minor, t.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(adding || editTx) && (
          <AddTransactionModal
            accounts={data.accounts}
            categories={data.categories}
            editTx={editTx}
            initialKind="investment"
            onClose={() => {
              setAdding(false);
              setEditTx(null);
            }}
            onSaved={refresh}
          />
        )}
    </main>
  );
}
