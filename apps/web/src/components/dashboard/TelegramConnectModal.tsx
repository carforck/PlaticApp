"use client";

import { useEffect, useState } from "react";
import { TrafficLights } from "./TrafficLights";

export function TelegramConnectModal({ onClose, onLinked }: { onClose: () => void; onLinked: () => void }) {
  const [link, setLink] = useState<{ code: string; deepLink: string } | null>(null);
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState("");

  // Genera el código al abrir.
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/telegram/link-code", { method: "POST" });
      if (res.ok) setLink(await res.json());
      else setError("No se pudo generar el código. Reintenta.");
    })();
  }, []);

  // Detecta en vivo cuando el usuario vincula desde Telegram.
  useEffect(() => {
    if (linked) return;
    const id = setInterval(async () => {
      const res = await fetch("/api/telegram/status");
      if (res.ok && (await res.json()).linked) {
        setLinked(true);
        clearInterval(id);
        setTimeout(onLinked, 1600);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [linked, onLinked]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <TrafficLights onClose={onClose} />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Conectar Telegram</span>
        </div>

        {linked ? (
          <div className="p-8 text-center">
            <div className="mb-2 text-[40px]">✅</div>
            <p className="text-[18px] font-semibold">¡Conectado!</p>
            <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
              Ya puedes registrar tus finanzas hablándole al bot.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <p className="text-[14px] text-[var(--color-ink-soft)]">
              Conecta el bot para registrar gastos por <b>chat, audio o foto</b> y recibir recordatorios.
            </p>

            <ol className="space-y-3">
              <Step n={1} title="Abre el bot en Telegram">
                {link ? (
                  <a
                    href={link.deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-mac mt-1.5 inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium"
                  >
                    💬 Abrir @PlaticApp_bot
                  </a>
                ) : (
                  <span className="text-[13px] text-[var(--color-ink-soft)]">Generando enlace…</span>
                )}
              </Step>
              <Step n={2} title="Confirma con un toque">
                <span className="text-[13px] text-[var(--color-ink-soft)]">
                  El botón ya lleva tu código. Si te lo pide, envía este al bot:
                </span>
                <p className="my-1.5 text-center text-[22px] font-bold tracking-[0.25em] text-[var(--color-accent)]">
                  {link?.code ?? "······"}
                </p>
              </Step>
              <Step n={3} title="¡Listo!">
                <span className="flex items-center gap-2 text-[13px] text-[var(--color-ink-soft)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#30d158]" />
                  Esperando la conexión… (se detecta sola)
                </span>
              </Step>
            </ol>

            {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}

            <button onClick={onClose} className="w-full rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[12px] font-bold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}
