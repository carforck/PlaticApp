"use client";

import { useCallback, useEffect, useState } from "react";

interface LogRow {
  id: number;
  created_at: string;
  level: "info" | "warn" | "error";
  source: string;
  event: string;
  detail: string | null;
  actor: string | null;
}
interface LogsData {
  logs: LogRow[];
  webhook: { pending: number; lastError: string | null; lastErrorAt: string | null } | null;
}

const LEVEL_COLOR = { info: "#0a84ff", warn: "#ff9f0a", error: "#ff375f" } as const;
const SOURCE_BADGE: Record<string, string> = {
  telegram: "✈️ Telegram",
  app: "🖥️ App",
  auth: "🔑 Auth",
  cron: "⏰ Cron",
};
const SOURCES = ["all", "telegram", "app", "auth", "cron"];
const LEVELS = ["all", "info", "warn", "error"];

const timeText = (iso: string) => {
  const d = new Date(iso);
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  const hhmm = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  if (m < 1440) return hhmm;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) + " " + hhmm;
};

export function LogsPanel() {
  const [data, setData] = useState<LogsData | null>(null);
  const [source, setSource] = useState("all");
  const [level, setLevel] = useState("all");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/logs?source=${source}&level=${level}`);
    if (r.ok) {
      setData(await r.json());
      setErr("");
    } else setErr("No se pudieron cargar los logs.");
  }, [source, level]);

  useEffect(() => {
    void load();
    const id = setInterval(load, 20000);
    const onF = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onF);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onF); };
  }, [load]);

  const chip = (active: boolean) =>
    `rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition ${active ? "bg-white shadow-sm" : "text-[var(--color-ink-soft)]"}`;

  return (
    <section className="space-y-3">
      {data?.webhook && (data.webhook.lastError || data.webhook.pending > 0) && (
        <div className="rounded-[var(--radius-control)] border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 px-3.5 py-2.5 text-[12.5px] text-[#b86e00]">
          ⚠️ Webhook de Telegram: {data.webhook.pending} en cola
          {data.webhook.lastError ? ` · último error: ${data.webhook.lastError}` : ""}
        </div>
      )}

      <div className="glass flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] p-3">
        <div className="flex gap-1 rounded-[10px] bg-black/[0.05] p-1">
          {SOURCES.map((s) => (
            <button key={s} onClick={() => setSource(s)} className={chip(source === s)}>
              {s === "all" ? "Todo" : SOURCE_BADGE[s]?.split(" ")[1] ?? s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-[10px] bg-black/[0.05] p-1">
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={chip(level === l)}>
              {l === "all" ? "Nivel" : l}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-[var(--color-ink-soft)]">se refresca cada 20s</span>
      </div>

      <div className="glass overflow-hidden rounded-[var(--radius-card)]">
        {err && !data ? (
          <p className="p-6 text-center text-[13px] text-[#ff375f]">{err}</p>
        ) : !data ? (
          <p className="p-6 text-center text-[13px] text-[var(--color-ink-soft)]">Cargando…</p>
        ) : data.logs.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-[var(--color-ink-soft)]">Sin eventos para este filtro.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {data.logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 px-4 py-2.5 text-[13px]">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: LEVEL_COLOR[l.level] }} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium">{l.event}</span>
                    <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-soft)]">
                      {SOURCE_BADGE[l.source] ?? l.source}
                    </span>
                    {l.actor && <span className="text-[11px] text-[var(--color-ink-soft)]">{l.actor}</span>}
                  </span>
                  {l.detail && <span className="block truncate text-[12px] text-[var(--color-ink-soft)]">{l.detail}</span>}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--color-ink-soft)]">{timeText(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
