"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";

export function RecibosClient() {
  const { data } = useDashboard();
  const supabase = useMemo(() => createClient(), []);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);

  // Genera URLs firmadas (el bucket es privado; RLS permite solo lo propio).
  useEffect(() => {
    let cancelled = false;
    const paths = data.receipts.map((r) => r.path);
    if (paths.length === 0) {
      setUrls({});
      return;
    }
    void (async () => {
      const { data: signed } = await supabase.storage.from("receipts").createSignedUrls(paths, 3600);
      if (cancelled || !signed) return;
      const map: Record<string, string> = {};
      signed.forEach((s, i) => {
        if (s.signedUrl) map[paths[i]!] = s.signedUrl;
      });
      setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [data.receipts, supabase]);

  return (
    <main className="flex-1 space-y-4">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight">Recibos</h1>
        <p className="text-[13px] text-[var(--color-ink-soft)]">
          {data.receipts.length} fotos enviadas al bot
        </p>
      </header>

      {data.receipts.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-10 text-center text-[14px] text-[var(--color-ink-soft)]">
          Aún no has enviado fotos. Mándale una foto de un recibo al bot 🧾 y aparecerá aquí, con lo que
          detectó.
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.receipts.map((r) => (
            <button
              key={r.id}
              onClick={() => urls[r.path] && setZoom(urls[r.path]!)}
              className="glass group overflow-hidden rounded-[var(--radius-card)] text-left transition hover:brightness-[1.02]"
            >
              <div className="aspect-square overflow-hidden bg-black/[0.05]">
                {urls[r.path] ? (
                  <img
                    src={urls[r.path]}
                    alt={r.caption ?? "Recibo"}
                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-[24px] opacity-40">🧾</div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-[13px] font-medium">{r.caption ?? "Recibo"}</p>
                <p className="text-[11px] text-[var(--color-ink-soft)]">
                  {new Date(r.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </button>
          ))}
        </section>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="Recibo" className="max-h-[90vh] max-w-[90vw] rounded-[var(--radius-card)] object-contain shadow-2xl" />
        </div>
      )}
    </main>
  );
}
