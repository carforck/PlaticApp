"use client";

import { fmtMoney } from "@/lib/format";
import { CashflowChart, SpendingDonut } from "@/components/dashboard/Charts";
import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";

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
const CHAT = [
  { me: true, text: "gasté 50 mil en el almuerzo con la tarjeta" },
  { me: false, text: "💸 Gasto · $50.000 · Comida · Tarjeta de crédito\n¿Lo registro?" },
  { me: true, text: "✅ sí" },
  { me: false, text: "✅ Registrado. Ya aparece en tu dashboard 📊" },
  { me: true, text: "¿cuánto gasté este mes?" },
  { me: false, text: "💸 Gastos este mes: $2.050.000" },
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

        {/* Chat de Telegram */}
        <div className="glass animate-float-in rounded-[var(--radius-card)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#229ED9] text-[15px]">✈️</span>
            <span className="text-[14px] font-semibold">@PlaticApp_bot</span>
          </div>
          <div className="space-y-2">
            {CHAT.map((m, i) => (
              <div key={i} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
                <span
                  className={`max-w-[85%] whitespace-pre-line rounded-[14px] px-3 py-2 text-[12.5px] ${
                    m.me ? "bg-[var(--color-accent)] text-white" : "bg-black/[0.06] text-[var(--color-ink)]"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
          </div>
        </div>
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
