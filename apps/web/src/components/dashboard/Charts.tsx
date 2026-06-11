"use client";

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney } from "@/lib/format";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.06)",
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(12px)",
} as const;

const fmtShort = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}k`;

export function NetWorthChart({ series }: { series: { mes: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={series} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a84ff" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#0a84ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#6e6e73", fontSize: 12 }} />
        <YAxis tickFormatter={fmtShort} axisLine={false} tickLine={false} tick={{ fill: "#6e6e73", fontSize: 12 }} width={48} />
        <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="valor" stroke="#0a84ff" strokeWidth={3} fill="url(#nw)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendingDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  if (data.length === 0) {
    return (
      <div className="grid h-[240px] place-items-center text-[13px] text-[var(--color-ink-soft)]">
        Aún no hay gastos este mes
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
          {data.map((s) => (
            <Cell key={s.name} fill={s.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
