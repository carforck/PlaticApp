"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { Paginator, usePagination } from "./Paginator";

const TAG = {
  nuevo: { label: "Nuevo", cls: "bg-[#0a84ff]/12 text-[#0a84ff]", accent: "#0a84ff" },
  mejora: { label: "Mejora", cls: "bg-[#30d158]/14 text-[#1d8a3a]", accent: "#30d158" },
  arreglo: { label: "Arreglo", cls: "bg-[#ff9f0a]/15 text-[#b86e00]", accent: "#ff9f0a" },
} as const;

export function NovedadesClient() {
  const router = useRouter();
  const { data } = useDashboard();
  const pg = usePagination(data.announcements, 10);

  // Al abrir, marca todo como visto y refresca para limpiar el badge.
  useEffect(() => {
    void (async () => {
      await fetch("/api/announcements/seen", { method: "POST" });
      router.refresh();
    })();
  }, [router]);

  return (
    <main className="flex-1 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Novedades</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">Todo lo que PlaticApp puede hacer y lo que vamos lanzando</p>
        </div>
        {data.announcements.length > 0 && (
          <span className="rounded-full bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
            {data.announcements.length} {data.announcements.length === 1 ? "novedad" : "novedades"}
          </span>
        )}
      </header>

      <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-[2px] before:rounded-full before:bg-gradient-to-b before:from-[#0a84ff]/40 before:via-[#bf5af2]/30 before:to-transparent">
        {pg.pageItems.map((a, i) => {
          const tag = TAG[a.tag] ?? TAG.nuevo;
          return (
            <div
              key={a.id}
              className="animate-float-in relative flex gap-3"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span
                className="glass z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[18px]"
                style={{ boxShadow: `0 0 0 2px ${tag.accent}55` }}
              >
                {a.emoji}
              </span>
              <div
                className="glass flex-1 overflow-hidden rounded-[var(--radius-card)] border-l-[3px] p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderLeftColor: tag.accent }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold">{a.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tag.cls}`}>{tag.label}</span>
                  {i === 0 && pg.page === 1 && (
                    <span className="rounded-full bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Reciente
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink-soft)]">{a.body}</p>
                <p className="mt-1.5 text-[11px] text-[var(--color-ink-soft)]">
                  {new Date(a.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          );
        })}
        {data.announcements.length === 0 && (
          <div className="glass rounded-[var(--radius-card)] p-10 text-center">
            <p className="text-[32px]">📣</p>
            <p className="mt-2 text-[14px] text-[var(--color-ink-soft)]">Aún no hay novedades. ¡Pronto verás aquí lo nuevo!</p>
          </div>
        )}
      </div>
      {pg.needed && (
        <div className="glass overflow-hidden rounded-[var(--radius-card)]">
          <Paginator page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} onPage={pg.setPage} noun="novedades" />
        </div>
      )}
    </main>
  );
}
