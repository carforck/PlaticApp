"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Metrics {
  totalUsers: number;
  withTelegram: number;
  activeWeek: number;
  newThisWeek: number;
  weeks: { label: string; signups: number; cumulative: number; movimientos: number }[];
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.06)",
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(12px)",
  fontSize: 12,
} as const;

export function AdminMetrics() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    const load = async () => {
      const r = await fetch("/api/admin/metrics");
      if (r.ok) setM(await r.json());
    };
    void load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  if (!m) {
    return (
      <section className="glass rounded-[var(--radius-card)] p-5">
        <h2 className="text-[15px] font-semibold">📈 Métricas de usuarios</h2>
        <p className="mt-2 text-[13px] text-[var(--color-ink-soft)]">Cargando gráficas…</p>
      </section>
    );
  }

  return (
    <section className="glass rounded-[var(--radius-card)] p-5">
      <h2 className="mb-3 text-[15px] font-semibold">📈 Métricas de usuarios</h2>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Usuarios" value={m.totalUsers} />
        <Kpi label="Nuevos (7 días)" value={m.newThisWeek} accent="#0a84ff" />
        <Kpi label="Activos (7 días)" value={m.activeWeek} accent="#30d158" />
        <Kpi label="Con Telegram" value={m.withTelegram} accent="#bf5af2" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-[12px] font-medium text-[var(--color-ink-soft)]">Crecimiento de usuarios (acumulado)</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={m.weeks} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="grow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0a84ff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0a84ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="cumulative" name="Usuarios" stroke="#0a84ff" strokeWidth={2} fill="url(#grow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="mb-1 text-[12px] font-medium text-[var(--color-ink-soft)]">Registros y actividad por semana</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={m.weeks} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="signups" name="Nuevos" fill="#0a84ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="movimientos" name="Movimientos" fill="#bf5af2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-[var(--radius-control)] bg-black/[0.03] p-3">
      <p className="text-[11px] text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}
