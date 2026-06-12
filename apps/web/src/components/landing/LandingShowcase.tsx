"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtMoney } from "@/lib/format";
import { CashflowChart, SpendingDonut } from "@/components/dashboard/Charts";
import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";
import { AnimatedChat } from "./AnimatedChat";

const BASE_CASHFLOW = [
  { mes: "Ene", ingresos: 3200000, gastos: 2100000 },
  { mes: "Feb", ingresos: 3400000, gastos: 2600000 },
  { mes: "Mar", ingresos: 3300000, gastos: 1900000 },
  { mes: "Abr", ingresos: 3800000, gastos: 2400000 },
  { mes: "May", ingresos: 3600000, gastos: 2200000 },
  { mes: "Jun", ingresos: 3900000, gastos: 2050000 },
];

// Snapshots que se van alternando para simular datos llegando en vivo.
const FRAMES = [
  { patrimonio: 10420000, ingresos: 3900000, gastos: 2050000, comida: 720000 },
  { patrimonio: 10610000, ingresos: 3900000, gastos: 2240000, comida: 910000 },
  { patrimonio: 10980000, ingresos: 4250000, gastos: 2240000, comida: 760000 },
];

export function LandingShowcase() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 3500);
    return () => clearInterval(id);
  }, []);

  const f = FRAMES[frame]!;

  const cashflow = useMemo(() => {
    const c = BASE_CASHFLOW.map((m) => ({ ...m, balance: m.ingresos - m.gastos }));
    c[c.length - 1] = { mes: "Jun", ingresos: f.ingresos, gastos: f.gastos, balance: f.ingresos - f.gastos };
    return c;
  }, [f]);

  const donut = useMemo(
    () => [
      { name: "Comida", value: f.comida, color: "#ff9f0a" },
      { name: "Transporte", value: 380000, color: "#0a84ff" },
      { name: "Hogar", value: 600000, color: "#bf5af2" },
      { name: "Ocio", value: 250000, color: "#30d158" },
      { name: "Otros", value: 100000, color: "#8e8e93" },
    ],
    [f],
  );

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <h2 className="text-center text-[26px] font-semibold tracking-tight">Míralo en acción</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-[14px] text-[var(--color-ink-soft)]">
        Le hablas al bot y tu panel cobra vida: gráficos y números en tiempo real.
      </p>

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-3">
        {/* Preview del dashboard (activo) */}
        <div className="glass animate-float-in overflow-hidden rounded-[var(--radius-card)] lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
            <span className="traffic-light bg-[#ff5f57]" />
            <span className="traffic-light bg-[#febc2e]" />
            <span className="traffic-light bg-[#28c840]" />
            <span className="ml-3 text-[12px] font-medium text-[var(--color-ink-soft)]">PlaticApp · Resumen</span>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-[#30d158]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#30d158]" /> en vivo
            </span>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-3 gap-3">
              <Kpi label="Patrimonio" amount={f.patrimonio} accent="text-[var(--color-ink)]" />
              <Kpi label="Ingresos" amount={f.ingresos} accent="text-[#30d158]" />
              <Kpi label="Gastos" amount={f.gastos} accent="text-[#ff375f]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] bg-black/[0.03] p-3">
                <p className="mb-1 text-[12px] font-medium text-[var(--color-ink-soft)]">Flujo (6 meses)</p>
                <CashflowChart data={cashflow} />
              </div>
              <div className="rounded-[14px] bg-black/[0.03] p-3">
                <p className="mb-1 text-[12px] font-medium text-[var(--color-ink-soft)]">Gastos por categoría</p>
                <SpendingDonut data={donut} />
              </div>
            </div>
          </div>
        </div>

        {/* Chat de Telegram (animado) */}
        <AnimatedChat />
      </div>
    </section>
  );
}

function Kpi({ label, amount, accent }: { label: string; amount: number; accent: string }) {
  return (
    <div className="rounded-[12px] bg-black/[0.03] p-3">
      <p className="text-[11px] font-medium text-[var(--color-ink-soft)]">{label}</p>
      <p className={`mt-0.5 text-[16px] font-semibold tracking-tight ${accent}`}>
        <AnimatedNumber value={amount} format={fmtMoney} />
      </p>
    </div>
  );
}
