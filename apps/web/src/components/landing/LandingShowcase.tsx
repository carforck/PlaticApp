"use client";

import { fmtMoney } from "@/lib/format";
import { CashflowChart, SpendingDonut } from "@/components/dashboard/Charts";
import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";
import { AnimatedChat } from "./AnimatedChat";

const CASHFLOW = [
  { mes: "Ene", ingresos: 3200000, gastos: 2100000, balance: 1100000 },
  { mes: "Feb", ingresos: 3400000, gastos: 2600000, balance: 800000 },
  { mes: "Mar", ingresos: 3300000, gastos: 1900000, balance: 1400000 },
  { mes: "Abr", ingresos: 3800000, gastos: 2400000, balance: 1400000 },
  { mes: "May", ingresos: 3600000, gastos: 2200000, balance: 1400000 },
  { mes: "Jun", ingresos: 3900000, gastos: 2050000, balance: 1850000 },
];
const DONUT = [
  { name: "Comida", value: 720000, color: "#ff9f0a" },
  { name: "Transporte", value: 380000, color: "#0a84ff" },
  { name: "Hogar", value: 600000, color: "#bf5af2" },
  { name: "Ocio", value: 250000, color: "#30d158" },
  { name: "Otros", value: 100000, color: "#8e8e93" },
];
export function LandingShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <h2 className="text-center text-[26px] font-semibold tracking-tight">Míralo en acción</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-[14px] text-[var(--color-ink-soft)]">
        Le hablas al bot y tu panel cobra vida: gráficos y números en tiempo real.
      </p>

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-3">
        {/* Preview del dashboard */}
        <div className="glass animate-float-in overflow-hidden rounded-[var(--radius-card)] lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
            <span className="traffic-light bg-[#ff5f57]" />
            <span className="traffic-light bg-[#febc2e]" />
            <span className="traffic-light bg-[#28c840]" />
            <span className="ml-3 text-[12px] font-medium text-[var(--color-ink-soft)]">PlaticApp · Resumen</span>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-3 gap-3">
              <Kpi label="Patrimonio" amount={10420000} accent="text-[var(--color-ink)]" />
              <Kpi label="Ingresos" amount={3900000} accent="text-[#30d158]" />
              <Kpi label="Gastos" amount={2050000} accent="text-[#ff375f]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] bg-black/[0.03] p-3">
                <p className="mb-1 text-[12px] font-medium text-[var(--color-ink-soft)]">Flujo (6 meses)</p>
                <CashflowChart data={CASHFLOW} />
              </div>
              <div className="rounded-[14px] bg-black/[0.03] p-3">
                <p className="mb-1 text-[12px] font-medium text-[var(--color-ink-soft)]">Gastos por categoría</p>
                <SpendingDonut data={DONUT} />
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
