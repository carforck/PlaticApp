"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";

const TAG = {
  nuevo: { label: "Nuevo", cls: "bg-[#0a84ff]/12 text-[#0a84ff]" },
  mejora: { label: "Mejora", cls: "bg-[#30d158]/12 text-[#1d8a3a]" },
  arreglo: { label: "Arreglo", cls: "bg-[#ff9f0a]/15 text-[#b86e00]" },
} as const;

export function NovedadesClient() {
  const router = useRouter();
  const { data } = useDashboard();

  // Al abrir, marca todo como visto y refresca para limpiar el badge.
  useEffect(() => {
    void (async () => {
      await fetch("/api/announcements/seen", { method: "POST" });
      router.refresh();
    })();
  }, [router]);

  return (
    <main className="flex-1 space-y-4">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight">Novedades</h1>
        <p className="text-[13px] text-[var(--color-ink-soft)]">Todo lo que PlaticApp puede hacer y lo que vamos lanzando</p>
      </header>

      <div className="relative space-y-3 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-px before:bg-black/10">
        {data.announcements.map((a) => {
          const tag = TAG[a.tag] ?? TAG.nuevo;
          return (
            <div key={a.id} className="relative flex gap-3">
              <span className="glass z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[18px]">{a.emoji}</span>
              <div className="glass flex-1 rounded-[var(--radius-card)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold">{a.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tag.cls}`}>{tag.label}</span>
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
          <p className="text-[14px] text-[var(--color-ink-soft)]">Aún no hay novedades.</p>
        )}
      </div>
    </main>
  );
}
