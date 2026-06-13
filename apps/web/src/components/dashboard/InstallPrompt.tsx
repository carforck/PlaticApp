"use client";

import { useEffect, useState } from "react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const BOT_URL = "https://t.me/PlaticApp_bot";

/** Accesos directos: instalar la app web (PWA) y abrir el bot de Telegram. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
    } else if (isIOS) {
      setShowIOSHelp((v) => !v);
    }
  }

  return (
    <div className="glass rounded-[var(--radius-card)] p-6">
      <h2 className="text-[15px] font-semibold">📲 Accesos directos</h2>
      <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
        Ten PlaticApp a un toque: instala la app en tu pantalla de inicio y abre el bot de Telegram.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {!installed && (
          <button onClick={install} className="btn-mac flex-1 py-2.5 text-[14px] font-medium">
            {deferred ? "📲 Instalar app" : isIOS ? "📲 Cómo añadir a inicio" : "📲 Instalar app"}
          </button>
        )}
        <a href={BOT_URL} target="_blank" rel="noreferrer" className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-center text-[14px] font-medium transition hover:bg-white/90">
          🤖 Abrir el bot
        </a>
      </div>

      {installed && <p className="mt-3 text-[12px] text-[#1d8a3a]">✓ App instalada en este dispositivo.</p>}

      {showIOSHelp && (
        <div className="mt-3 rounded-[12px] bg-[var(--color-accent)]/8 px-3.5 py-3 text-[12.5px] leading-snug text-[var(--color-ink)]">
          En iPhone: toca el botón <b>Compartir</b> (cuadro con flecha ↑) en Safari y luego{" "}
          <b>«Añadir a pantalla de inicio»</b>. Listo, queda con el ícono de PlaticApp.
        </div>
      )}

      {!isIOS && !deferred && !installed && (
        <p className="mt-3 text-[12px] text-[var(--color-ink-soft)]">
          Si no aparece el botón de instalar, abre el menú del navegador (⋮) y elige «Instalar app» o «Agregar a pantalla de inicio».
        </p>
      )}
    </div>
  );
}
