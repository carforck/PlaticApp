"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchDashboard, type DashboardData } from "@/lib/queries";
import { fmtMoney, monthLabel } from "@/lib/format";
import { NetWorthChart, SpendingDonut } from "./Charts";

const ACCOUNT_EMOJI: Record<string, string> = {
  bank: "🏦",
  cash: "💵",
  wallet: "📱",
  investment: "📈",
  credit: "💳",
};
const SOURCE_EMOJI: Record<string, string> = {
  telegram_text: "💬",
  telegram_audio: "🎙️",
  telegram_image: "🖼️",
  web: "🖥️",
};

const nav = [
  { label: "Resumen", icon: "🏠", active: true },
  { label: "Movimientos", icon: "💸", active: false },
  { label: "Cuentas", icon: "🏦", active: false },
  { label: "Inversiones", icon: "📈", active: false },
  { label: "Categorías", icon: "🏷️", active: false },
  { label: "Ajustes", icon: "⚙️", active: false },
];

export function DashboardClient({
  initialData,
  userEmail,
}: {
  initialData: DashboardData;
  userEmail: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [link, setLink] = useState<{ code: string; deepLink: string } | null>(null);
  const supabase = useMemo(() => createClient(), []);

  async function linkTelegram() {
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    if (res.ok) setLink(await res.json());
  }

  const refresh = useCallback(async () => {
    setData(await fetchDashboard(supabase));
  }, [supabase]);

  // Realtime: cualquier cambio en transactions/accounts refresca el dashboard.
  useEffect(() => {
    const channel = supabase
      .channel("platica-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  const d = useDerived(data);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen gap-4 p-4">
      {/* Sidebar */}
      <aside className="glass animate-float-in hidden w-60 shrink-0 flex-col rounded-[var(--radius-card)] p-3 md:flex">
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
        </div>
        <div className="px-2 py-3">
          <p className="text-[15px] font-semibold tracking-tight">Platica</p>
          <p className="text-[12px] text-[var(--color-ink-soft)]">Control financiero</p>
        </div>
        <nav className="mt-2 space-y-0.5">
          {nav.map((n) => (
            <button
              key={n.label}
              className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[14px] transition ${
                n.active ? "bg-[var(--color-accent)] text-white shadow-sm" : "hover:bg-black/5"
              }`}
            >
              <span className="text-[15px]">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-[12px] bg-black/[0.04] p-3">
          <p className="text-[12px] font-medium">Bot de Telegram</p>
          {link ? (
            <div className="mt-1.5">
              <p className="text-[11px] text-[var(--color-ink-soft)]">Envía este código al bot:</p>
              <p className="my-1 text-center text-[18px] font-bold tracking-[0.2em] text-[var(--color-accent)]">
                {link.code}
              </p>
              <a
                href={link.deepLink}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[8px] bg-[var(--color-accent)] py-1.5 text-center text-[12px] font-medium text-white"
              >
                Abrir @PlaticApp_bot
              </a>
              <p className="mt-1 text-[10px] text-[var(--color-ink-soft)]">Vence en 15 min</p>
            </div>
          ) : (
            <button
              onClick={linkTelegram}
              className="mt-1.5 w-full rounded-[8px] border border-black/10 bg-white/70 py-1.5 text-[12px] font-medium transition hover:bg-white"
            >
              🔗 Vincular Telegram
            </button>
          )}
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Resumen</h1>
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              {userEmail} · actualizado en tiempo real
            </p>
          </div>
          <button onClick={logout} className="text-[13px] text-[var(--color-accent)] hover:underline">
            Salir
          </button>
        </header>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Patrimonio neto" value={fmtMoney(d.netWorth)} accent="text-[var(--color-ink)]" hint="Saldo total" />
          <StatCard label="Ingresos" value={fmtMoney(d.income)} accent="text-[#30d158]" hint="Este mes" />
          <StatCard label="Gastos" value={fmtMoney(d.expense)} accent="text-[#ff375f]" hint="Este mes" />
          <StatCard label="Invertido" value={fmtMoney(d.invested)} accent="text-[#bf5af2]" hint="Este mes" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-[var(--radius-card)] p-5 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Evolución del patrimonio</h2>
              <span className="text-[12px] text-[var(--color-ink-soft)]">Últimos 6 meses</span>
            </div>
            <NetWorthChart series={d.netWorthSeries} />
          </div>
          <div className="glass rounded-[var(--radius-card)] p-5">
            <h2 className="mb-2 text-[15px] font-semibold">Gastos por categoría</h2>
            <SpendingDonut data={d.spendingByCategory} />
            <ul className="mt-3 space-y-1.5">
              {d.spendingByCategory.map((s) => (
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
                Aún no hay movimientos. Háblale al bot de Telegram para registrar el primero.
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
                          <span className="block text-[14px] font-medium">
                            {t.description ?? cat?.name ?? "Movimiento"}
                          </span>
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
      </main>
    </div>
  );
}

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tracking-tight ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">{hint}</p>
    </div>
  );
}

/** Deriva totales, serie de patrimonio y gastos por categoría de los datos crudos. */
function useDerived(data: DashboardData) {
  return useMemo(() => {
    const catById = new Map(data.categories.map((c) => [c.id, c]));
    const netWorth = data.accounts.reduce((s, a) => s + a.balance_minor, 0);

    const now = new Date();
    const isThisMonth = (iso: string) => {
      const dt = new Date(iso);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    };

    let income = 0,
      expense = 0,
      invested = 0;
    const byCat = new Map<string, number>();

    for (const t of data.transactions) {
      if (!isThisMonth(t.occurred_at)) continue;
      if (t.kind === "income") income += t.amount_minor;
      else if (t.kind === "expense") {
        expense += t.amount_minor;
        const key = t.category_id ?? "otros";
        byCat.set(key, (byCat.get(key) ?? 0) + t.amount_minor);
      } else if (t.kind === "investment") invested += t.amount_minor;
    }

    const spendingByCategory = [...byCat.entries()]
      .map(([id, value]) => {
        const c = catById.get(id);
        return { name: c?.name ?? "Otros", value, color: c?.color ?? "#8e8e93" };
      })
      .sort((a, b) => b.value - a.value);

    // Serie de patrimonio: balance actual y reconstrucción hacia atrás por mes.
    const months: { mes: string; valor: number }[] = [];
    const deltaByMonthKey = new Map<string, number>();
    for (const t of data.transactions) {
      const dt = new Date(t.occurred_at);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const delta = t.kind === "income" ? t.amount_minor : -t.amount_minor;
      deltaByMonthKey.set(key, (deltaByMonthKey.get(key) ?? 0) + delta);
    }
    let running = netWorth;
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    const tmp: { mes: string; valor: number }[] = [];
    for (let i = 0; i < 6; i++) {
      tmp.push({ mes: monthLabel(cursor), valor: running });
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      running -= deltaByMonthKey.get(key) ?? 0;
      cursor.setMonth(cursor.getMonth() - 1);
    }
    months.push(...tmp.reverse());

    return { catById, netWorth, income, expense, invested, spendingByCategory, netWorthSeries: months };
  }, [data]);
}
