"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import type { DashboardData } from "@/lib/queries";
import { fmtMoney, monthLabel } from "@/lib/format";
import { ACCOUNT_EMOJI, SOURCE_EMOJI } from "@/lib/labels";
import { accountFinance } from "@/lib/finance";
import { CashflowChart, NetWorthChart, SpendingDonut } from "./Charts";
import { AddTransactionModal } from "./AddTransactionModal";
import { AnimatedNumber } from "./AnimatedNumber";

export function DashboardClient() {
  const { data, profile, refresh } = useDashboard();
  const [adding, setAdding] = useState(false);
  const d = useDerived(data);
  const firstName = (profile.displayName || "").trim().split(/\s+/)[0];

  // Fecha de hoy y saludo (se fijan tras montar para evitar desajustes de hidratación).
  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState("Hola");
  useEffect(() => {
    const now = new Date();
    const fmt = now.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    setToday(fmt.charAt(0).toUpperCase() + fmt.slice(1));
    const h = now.getHours();
    setGreeting(h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches");
  }, []);

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">
            👋 {greeting}{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="text-[26px] font-semibold tracking-tight">Resumen</h1>
          <p className="text-[12px] text-[var(--color-ink-soft)]">
            {today ? `📅 ${today}` : profile.email} · en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://t.me/PlaticApp_bot"
            target="_blank"
            rel="noreferrer"
            title="Abrir el bot de Telegram"
            className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-3.5 py-2 text-[13px] font-medium transition hover:bg-white/90"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#229ED9" aria-hidden>
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.15-3.06-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
            Bot
          </a>
          <button onClick={() => setAdding(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
            + Registrar
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Patrimonio neto"
          amount={d.netWorth}
          format={fmtMoney}
          accent="text-[var(--color-ink)]"
          hint={
            d.netWorthAdjusted !== d.netWorth
              ? `Si saldas lo pendiente: ${fmtMoney(d.netWorthAdjusted)}`
              : "Tu plata disponible hoy"
          }
        />
        <StatCard label="Ingresos" amount={d.income} format={fmtMoney} accent="text-[#30d158]" hint={trendHint(d.incomeChange)} />
        <StatCard label="Gastos" amount={d.expense} format={fmtMoney} accent="text-[#ff375f]" hint={trendHint(d.expenseChange)} />
        <StatCard
          label="Balance del mes"
          amount={d.balance}
          format={fmtMoney}
          accent={d.balance >= 0 ? "text-[#30d158]" : "text-[#ff375f]"}
          hint="Ingresos − gastos"
        />
        <StatCard label="Tasa de ahorro" amount={d.savingsRate} format={(n) => `${n}%`} accent="text-[#0a84ff]" hint="Del ingreso" />
        <StatCard label="Invertido" amount={d.invested} format={fmtMoney} accent="text-[#bf5af2]" hint="Este mes" />
      </section>

      {/* Pistas del mes: racha y próximo pago */}
      <section className="grid gap-3 sm:grid-cols-2">
        <InsightPill
          icon="🔥"
          title="Racha de registro"
          value={d.streak > 0 ? `${d.streak} ${d.streak === 1 ? "día" : "días"}` : "Sin racha"}
          sub={d.streak > 0 ? "días seguidos registrando · ¡no la rompas!" : "registra hoy para empezar una"}
        />
        {d.nextPayment ? (
          <InsightPill
            icon="🔔"
            title="Próximo pago fijo"
            value={fmtMoney(d.nextPayment.amount_minor, d.nextPayment.currency)}
            sub={`${d.nextPayment.name} · ${dueText(d.nextPayment.due)}`}
            href="/dashboard/recurrentes"
          />
        ) : (
          <InsightPill icon="🔁" title="Pagos fijos" value="Ninguno" sub="agrega tus pagos recurrentes" href="/dashboard/recurrentes" />
        )}
      </section>

      {d.budgetsAtRisk.length > 0 && (
        <Link
          href="/dashboard/presupuestos"
          className="flex items-center justify-between rounded-[var(--radius-card)] border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 p-4 transition hover:brightness-[1.02]"
        >
          <span className="text-[13px] font-medium text-[#b86e00]">
            ⚠️ {d.budgetsAtRisk.length} {d.budgetsAtRisk.length === 1 ? "presupuesto" : "presupuestos"} en riesgo este mes
          </span>
          <span className="flex items-center gap-3 text-[13px] text-[#b86e00]">
            {d.budgetsAtRisk.slice(0, 2).map((b) => (
              <span key={b.id}>{b.emoji} {b.name} {b.pct}%</span>
            ))}
            <span>→</span>
          </span>
        </Link>
      )}

      {(d.theyOwe > 0 || d.iOwe > 0) && (
        <Link
          href="/dashboard/deudas"
          className="glass flex items-center justify-between rounded-[var(--radius-card)] p-4 transition hover:brightness-[1.02]"
        >
          <span className="text-[13px] font-medium text-[var(--color-ink-soft)]">🤝 Deudas</span>
          <span className="flex items-center gap-5 text-[14px]">
            <span>Te deben <b className="text-[#30d158]">{fmtMoney(d.theyOwe)}</b></span>
            <span>Debes <b className="text-[#ff375f]">{fmtMoney(d.iOwe)}</b></span>
            <span className="text-[var(--color-accent)]">→</span>
          </span>
        </Link>
      )}

      {data.recurrences.filter((r) => r.active).length > 0 && (
        <section className="glass rounded-[var(--radius-card)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">🔁 Próximos pagos fijos</h2>
            <Link href="/dashboard/recurrentes" className="text-[12px] text-[var(--color-accent)] hover:underline">
              Ver todos →
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.recurrences
              .filter((r) => r.active)
              .slice(0, 6)
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-[12px] bg-black/[0.04] px-3 py-2">
                  <span>
                    <span className="block text-[13px] font-medium">{r.name}</span>
                    <span className="block text-[11px] text-[var(--color-ink-soft)]">vence {r.next_due}</span>
                  </span>
                  <span className={`text-[13px] font-semibold ${r.kind === "income" ? "text-[#30d158]" : "text-[var(--color-ink)]"}`}>
                    {fmtMoney(r.amount_minor, r.currency)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {d.budgetsProgress.length > 0 && (
        <section className="glass rounded-[var(--radius-card)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">🎯 Presupuestos del mes</h2>
            <Link href="/dashboard/presupuestos" className="text-[12px] text-[var(--color-accent)] hover:underline">
              Ver todos →
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.budgetsProgress.map((b) => {
              const color = b.pct >= 100 ? "#ff375f" : b.pct >= 80 ? "#ff9f0a" : "#30d158";
              return (
                <li key={b.id}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-medium">{b.emoji} {b.name}</span>
                    <span className="text-[var(--color-ink-soft)]">
                      {fmtMoney(b.spent)} / {fmtMoney(b.budget)} · <b style={{ color }}>{b.pct}%</b>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, b.pct)}%`, background: color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Flujo + categorías */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-[var(--radius-card)] p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Flujo: ingresos vs gastos</h2>
            <span className="text-[12px] text-[var(--color-ink-soft)]">Últimos 6 meses</span>
          </div>
          <CashflowChart data={d.cashflow} />
        </div>
        <div className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="mb-2 text-[15px] font-semibold">Gastos por categoría</h2>
          <SpendingDonut data={d.spendingByCategory} />
          <ul className="mt-3 space-y-1.5">
            {d.spendingByCategory.slice(0, 6).map((s) => (
              <li key={s.name} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="text-[var(--color-ink-soft)]">{fmtMoney(s.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Patrimonio (ancho completo) */}
      <section className="glass rounded-[var(--radius-card)] p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Evolución del patrimonio</h2>
          <span className="text-[12px] text-[var(--color-ink-soft)]">Últimos 6 meses</span>
        </div>
        <NetWorthChart series={d.netWorthSeries} />
      </section>

      {/* Cuentas + movimientos */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-[var(--radius-card)] p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Cuentas</h2>
          {data.accounts.length === 0 ? (
            <p className="text-[13px] text-[var(--color-ink-soft)]">Aún no tienes cuentas.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.accounts.map((a) => (
                <li key={a.account_id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">
                      {ACCOUNT_EMOJI[a.type] ?? "💼"}
                    </span>
                    <span className="text-[14px] font-medium">{a.name}</span>
                  </span>
                  <span className="text-[14px] font-semibold">{fmtMoney(a.balance_minor, a.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-[var(--radius-card)] p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Movimientos recientes</h2>
            <span className="text-[12px] text-[var(--color-ink-soft)]">vía Telegram 🎙️ 💬 🖼️</span>
          </div>
          {data.transactions.length === 0 ? (
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              Aún no hay movimientos. Háblale al bot de Telegram o usa “+ Registrar”.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {data.transactions.slice(0, 8).map((t) => {
                const cat = d.catById.get(t.category_id ?? "");
                const signed = t.kind === "income" ? t.amount_minor : -t.amount_minor;
                return (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-black/[0.05] text-[16px]">
                        {cat?.emoji ?? "🧾"}
                      </span>
                      <span>
                        <span className="block text-[14px] font-medium">{t.description ?? cat?.name ?? "Movimiento"}</span>
                        <span className="block text-[12px] text-[var(--color-ink-soft)]">
                          {cat?.name ?? t.kind} · {new Date(t.occurred_at).toLocaleDateString("es-CO")} ·{" "}
                          {SOURCE_EMOJI[t.source] ?? "•"}
                        </span>
                      </span>
                    </span>
                    <span className={`text-[14px] font-semibold ${signed > 0 ? "text-[#30d158]" : "text-[var(--color-ink)]"}`}>
                      {signed > 0 ? "+" : ""}
                      {fmtMoney(signed, t.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {adding && (
        <AddTransactionModal
          accounts={data.accounts}
          categories={data.categories}
          onClose={() => setAdding(false)}
          onSaved={refresh}
        />
      )}
    </main>
  );
}

function trendHint(change: number | null): string {
  if (change === null) return "Este mes";
  if (change === 0) return "Igual que el mes pasado";
  return `${change > 0 ? "▲" : "▼"} ${Math.abs(change)}% vs. mes anterior`;
}

function dueText(due: Date): string {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (days <= 0) return "vence hoy";
  if (days === 1) return "vence mañana";
  return `vence en ${days} días`;
}

function InsightPill({
  icon,
  title,
  value,
  sub,
  href,
}: {
  icon: string;
  title: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const inner = (
    <div className="glass h-full rounded-[var(--radius-card)] p-4 transition hover:brightness-[1.02]">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-soft)]">
        <span>{icon}</span> {title}
      </p>
      <p className="mt-1 text-[18px] font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-ink-soft)]">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatCard({
  label,
  amount,
  format,
  hint,
  accent,
}: {
  label: string;
  amount: number;
  format: (n: number) => string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">{label}</p>
      <p className={`mt-1 text-[20px] font-semibold tracking-tight ${accent}`}>
        <AnimatedNumber value={amount} format={format} />
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">{hint}</p>
    </div>
  );
}

/** Deriva KPIs y series temporales de los datos crudos. */
function useDerived(data: DashboardData) {
  return useMemo(() => {
    const catById = new Map(data.categories.map((c) => [c.id, c]));
    const netWorth = accountFinance(data.accounts).netWorth;

    const now = new Date();
    const monthKey = (dt: Date) => `${dt.getFullYear()}-${dt.getMonth()}`;
    const dayKeyOf = (dt: Date) => `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    const thisKey = monthKey(now);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = monthKey(prevDate);

    let income = 0;
    let expense = 0;
    let invested = 0;
    let prevIncome = 0;
    let prevExpense = 0;
    const byCat = new Map<string, number>();
    const daysWithTx = new Set<string>();
    // Acumuladores por mes para la serie de flujo.
    const monthAgg = new Map<string, { ingresos: number; gastos: number }>();

    for (const t of data.transactions) {
      const dt = new Date(t.occurred_at);
      const k = monthKey(dt);
      daysWithTx.add(dayKeyOf(dt));
      const agg = monthAgg.get(k) ?? { ingresos: 0, gastos: 0 };
      if (t.kind === "income") agg.ingresos += t.amount_minor;
      else agg.gastos += t.amount_minor; // gasto/inversión/transfer cuentan como salida
      monthAgg.set(k, agg);

      if (k === prevKey) {
        if (t.kind === "income") prevIncome += t.amount_minor;
        else if (t.kind === "expense") prevExpense += t.amount_minor;
      }
      if (k !== thisKey) continue;
      if (t.kind === "income") income += t.amount_minor;
      else if (t.kind === "expense") {
        expense += t.amount_minor;
        byCat.set(t.category_id ?? "otros", (byCat.get(t.category_id ?? "otros") ?? 0) + t.amount_minor);
      } else if (t.kind === "investment") invested += t.amount_minor;
    }

    // Variación vs. mes anterior (porcentaje).
    const pctChange = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
    const incomeChange = pctChange(income, prevIncome);
    const expenseChange = pctChange(expense, prevExpense);

    // Ritmo de gasto del mes y proyección al cierre.
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - dayOfMonth;
    const projectedExpense = dayOfMonth > 0 ? Math.round((expense / dayOfMonth) * daysInMonth) : expense;

    // Racha de días consecutivos registrando (termina hoy o ayer).
    let streak = 0;
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!daysWithTx.has(dayKeyOf(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (daysWithTx.has(dayKeyOf(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const spendingByCategory = [...byCat.entries()]
      .map(([id, value]) => {
        const c = catById.get(id);
        return { name: c?.name ?? "Otros", value, color: c?.color ?? "#8e8e93" };
      })
      .sort((a, b) => b.value - a.value);

    // Series de los últimos 6 meses (flujo + patrimonio).
    const cashflow: { mes: string; ingresos: number; gastos: number; balance: number }[] = [];
    const netWorthSeries: { mes: string; valor: number }[] = [];
    let running = netWorth;
    const cur = new Date(now.getFullYear(), now.getMonth(), 1);
    const tmpNW: { mes: string; valor: number }[] = [];
    const tmpCF: typeof cashflow = [];
    for (let i = 0; i < 6; i++) {
      const k = `${cur.getFullYear()}-${cur.getMonth()}`;
      const agg = monthAgg.get(k) ?? { ingresos: 0, gastos: 0 };
      tmpCF.push({ mes: monthLabel(cur), ingresos: agg.ingresos, gastos: agg.gastos, balance: agg.ingresos - agg.gastos });
      tmpNW.push({ mes: monthLabel(cur), valor: running });
      running -= agg.ingresos - agg.gastos;
      cur.setMonth(cur.getMonth() - 1);
    }
    cashflow.push(...tmpCF.reverse());
    netWorthSeries.push(...tmpNW.reverse());

    const balance = income - expense;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    const openDebts = data.debts.filter((x) => x.status === "open");
    const theyOwe = openDebts.filter((x) => x.direction === "they_owe").reduce((s, x) => s + x.amount_minor, 0);
    const iOwe = openDebts.filter((x) => x.direction === "i_owe").reduce((s, x) => s + x.amount_minor, 0);

    const budgetsProgress = data.budgets
      .filter((b) => b.category_id)
      .map((b) => {
        const c = catById.get(b.category_id!);
        const spent = byCat.get(b.category_id!) ?? 0;
        return {
          id: b.id,
          name: c?.name ?? "Categoría",
          emoji: c?.emoji ?? "🏷️",
          budget: b.amount_minor,
          spent,
          pct: Math.round((spent / b.amount_minor) * 100),
        };
      })
      .sort((a, b) => b.pct - a.pct);

    const budgetsAtRisk = budgetsProgress.filter((b) => b.pct >= 80);

    // Colchón financiero (runway): dinero líquido ÷ gasto mensual promedio.
    // Líquido = banco + efectivo + billetera (no crédito ni inversión).
    const liquid = data.accounts
      .filter((a) => a.type === "bank" || a.type === "cash" || a.type === "wallet")
      .reduce((s, a) => s + a.balance_minor, 0);
    const outMonths = cashflow.map((c) => c.gastos).filter((g) => g > 0);
    const avgOut = outMonths.length ? outMonths.reduce((a, b) => a + b, 0) / outMonths.length : expense;
    const runwayMonths = avgOut > 0 ? liquid / avgOut : null;
    const runwayLabel =
      liquid <= 0
        ? "Sin saldo"
        : runwayMonths === null
          ? "Sin gastos aún"
          : runwayMonths >= 12
            ? "12+ meses"
            : runwayMonths >= 1
              ? `${runwayMonths.toFixed(1)} meses`
              : `${Math.max(1, Math.round(runwayMonths * 30))} días`;

    // Próximo pago fijo (la recurrencia activa con vencimiento más cercano, de hoy en adelante).
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextPayment = data.recurrences
      .filter((r) => r.active && r.next_due)
      .map((r) => ({ ...r, due: new Date(`${r.next_due}T12:00:00`) }))
      .filter((r) => r.due >= startOfToday)
      .sort((a, b) => a.due.getTime() - b.due.getTime())[0] ?? null;

    return {
      catById,
      netWorth,
      income,
      expense,
      invested,
      balance,
      savingsRate,
      spendingByCategory,
      cashflow,
      netWorthSeries,
      runwayLabel,
      theyOwe,
      iOwe,
      netWorthAdjusted: netWorth + theyOwe - iOwe,
      budgetsProgress: budgetsProgress.slice(0, 4),
      incomeChange,
      expenseChange,
      daysLeft,
      projectedExpense,
      streak,
      budgetsAtRisk,
      nextPayment,
    };
  }, [data]);
}
