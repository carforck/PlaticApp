"use client";

import { useEffect, useState } from "react";
import { fmtMoney } from "@/lib/format";

/**
 * Widget "Plan del período": anillo radial animado que muestra, de tu saldo disponible,
 * cuánto debes apartar para los gastos fijos y cuánto te queda realmente para gastar.
 * Datos 100% reales (no decorativos).
 */
export function SpendingGauge({
  available,
  fixed,
  forSpending,
  periodUnit,
}: {
  available: number;
  fixed: number;
  forSpending: number;
  periodUnit: string; // "mes" | "quincena"
}) {
  const quincena = periodUnit === "quincena";
  const pct = available > 0 ? Math.max(0, Math.min(1, forSpending / available)) : 0;
  const neg = forSpending < 0;

  // Anillo: animamos el barrido al montar.
  const R = 52;
  const C = 2 * Math.PI * R;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);
  const offset = mounted ? C * (1 - pct) : C;

  return (
    <section className="glass flex items-center gap-5 rounded-[var(--radius-card)] p-5">
      <div className="relative shrink-0" style={{ width: 132, height: 132 }}>
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="12" />
          <circle
            cx="66"
            cy="66"
            r={R}
            fill="none"
            stroke={neg ? "#ff375f" : "url(#gauge-grad)"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 66 66)"
            style={{ transition: "stroke-dashoffset 950ms cubic-bezier(.22,1,.36,1)" }}
          />
          <defs>
            <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#30d158" />
              <stop offset="1" stopColor="#0a84ff" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[10px] font-medium text-[var(--color-ink-soft)]">Para gastar</p>
            <p className={`text-[17px] font-bold leading-tight ${neg ? "text-[#ff375f]" : "text-[var(--color-ink)]"}`}>{fmtMoney(forSpending)}</p>
            {available > 0 && !neg && <p className="text-[10px] text-[var(--color-ink-soft)]">{Math.round(pct * 100)}% libre</p>}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[14px] font-semibold tracking-tight">Plan {quincena ? "de la quincena" : "del mes"}</p>
        <ul className="mt-2.5 space-y-1.5 text-[13px]">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-black/15" />
            <span className="text-[var(--color-ink-soft)]">Disponible:</span> <b>{fmtMoney(available)}</b>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff9f0a]" />
            <span className="text-[var(--color-ink-soft)]">Apartar para fijos:</span> <b className="text-[#b86e00]">{fmtMoney(fixed)}</b>
            {quincena && <span className="text-[11px] text-[var(--color-ink-soft)]">(½ del mes)</span>}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#30d158]" />
            <span className="text-[var(--color-ink-soft)]">Para gastar:</span>{" "}
            <b className={neg ? "text-[#ff375f]" : "text-[#1d8a3a]"}>{fmtMoney(forSpending)}</b>
          </li>
        </ul>
        {neg && <p className="mt-2 text-[11.5px] text-[#ff375f]">Tus gastos fijos superan tu disponible este {periodUnit}.</p>}
      </div>
    </section>
  );
}
