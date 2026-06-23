"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtMoney } from "@/lib/format";
import { KIND_EMOJI, KIND_LABEL } from "@/lib/labels";
import { TrafficLights } from "./TrafficLights";

interface Tx {
  id: string;
  kind: "expense" | "income" | "investment" | "transfer";
  amount_minor: number;
  currency: string;
  description: string | null;
  occurred_at: string;
}

/**
 * Historial de movimientos de una cuenta o categoría (datos reales de transactions).
 * mode="account" incluye lo que entra y sale (origen y destino de transferencias).
 */
export function TxHistoryModal({
  title,
  mode,
  id,
  onClose,
}: {
  title: string;
  mode: "account" | "category";
  id: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Tx[] | null>(null);

  useEffect(() => {
    void (async () => {
      const db = createClient();
      let q = db.from("transactions").select("id, kind, amount_minor, currency, description, occurred_at, account_id, transfer_account_id, category_id");
      q = mode === "account" ? q.or(`account_id.eq.${id},transfer_account_id.eq.${id}`) : q.eq("category_id", id);
      const { data } = await q.order("occurred_at", { ascending: false }).limit(100);
      setRows((data as Tx[]) ?? []);
    })();
  }, [mode, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-sm overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <TrafficLights onClose={onClose} />
          <span className="ml-3 truncate text-[13px] font-medium text-[var(--color-ink-soft)]">Movimientos · {title}</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {rows === null ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-ink-soft)]">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[var(--color-ink-soft)]">Aún no hay movimientos aquí.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {rows.map((t) => {
                const signed = t.kind === "income" ? t.amount_minor : -t.amount_minor;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-black/[0.05] text-[14px]">{KIND_EMOJI[t.kind] ?? "🧾"}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px]">{t.description ?? KIND_LABEL[t.kind]}</span>
                        <span className="block text-[11px] text-[var(--color-ink-soft)]">
                          {new Date(t.occurred_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })}
                        </span>
                      </span>
                    </span>
                    <span className={`shrink-0 text-[14px] font-semibold ${signed > 0 ? "text-[#30d158]" : "text-[var(--color-ink)]"}`}>
                      {signed > 0 ? "+" : ""}{fmtMoney(signed, t.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
