"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";

type Stats = { users: number; movimientos: number; cuentas: number };

/** Consulta /api/stats con polling para que las cifras «suban en vivo». */
function useStats(pollMs = 20000): Stats {
  const [stats, setStats] = useState<Stats>({ users: 0, movimientos: 0, cuentas: 0 });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/stats", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as Stats;
        if (alive) setStats(d);
      } catch {
        /* sin conexión: dejamos el último valor */
      }
    };
    load();
    const id = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);
  return stats;
}

const nf = (n: number) => Math.round(n).toLocaleString("es-CO");

/** Pastilla compacta para el hero: «🟢 N personas ya usan PlaticApp». */
export function LiveUsersPill() {
  const { users } = useStats();
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#30d158]/30 bg-[#30d158]/10 px-3 py-1 text-[12.5px] font-medium text-[#1a7f37]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#30d158] opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#30d158]" />
      </span>
      <span>
        <b className="animate-num-pop"><AnimatedNumber value={users} format={nf} /></b> personas ya usan PlaticApp
      </span>
    </span>
  );
}

/** Barra de social proof con 3 cifras vivas. */
export function LiveStatsBar() {
  const { users, movimientos, cuentas } = useStats();
  const items = [
    { label: "personas", value: users, emoji: "👥" },
    { label: "movimientos registrados", value: movimientos, emoji: "📝" },
    { label: "cuentas conectadas", value: cuentas, emoji: "🏦" },
  ];
  return (
    <section className="mx-auto max-w-4xl px-5 py-6">
      <div className="glass grid grid-cols-1 gap-4 rounded-[var(--radius-card)] p-6 sm:grid-cols-3">
        {items.map((it, i) => (
          <div key={it.label} className="text-center">
            <p className="text-[30px] font-bold tracking-tight">
              <span
                className="animate-num-pop bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text text-transparent"
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                <AnimatedNumber value={it.value} format={nf} />
              </span>
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--color-ink-soft)]">
              {it.emoji} {it.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
