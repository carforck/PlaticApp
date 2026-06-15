"use client";

import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";

/**
 * Modal de bienvenida para usuarios nuevos. Reutiliza la identidad de la landing
 * (ícono del billete 💸 con gradiente azul→morado + wordmark «PlaticApp!»).
 */
export function WelcomeModal({
  name,
  telegramLinked,
  onClose,
  onConnectTelegram,
}: {
  name: string;
  telegramLinked: boolean;
  onClose: () => void;
  onConnectTelegram: () => void;
}) {
  const firstName = (name || "").trim().split(/\s+/)[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass animate-float-in relative w-full max-w-md overflow-hidden rounded-[var(--radius-card)]">
        {/* Encabezado con la identidad de la app */}
        <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-[#0a84ff]/10 to-[#bf5af2]/10 px-6 pb-5 pt-8 text-center">
          <BrandIcon size={68} className="rounded-[22%] shadow-lg" />
          <div>
            <p className="bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text text-[24px] font-bold tracking-tight text-transparent">
              PlaticApp!
            </p>
            <p className="mt-1 text-[14px] text-[var(--color-ink-soft)]">
              {firstName ? `¡Bienvenido, ${firstName}! 👋` : "¡Bienvenido! 👋"}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-[14px] leading-snug text-[var(--color-ink)]">
            Tu dinero, tan fácil como mandar un mensaje. Registra tus finanzas <b>hablándole al bot de Telegram</b> 🤖
            por texto, audio 🎙️ o foto de un recibo 🖼️, y míralo todo aquí en tiempo real.
          </p>

          <ul className="space-y-2 text-[13px] text-[var(--color-ink-soft)]">
            <li className="flex items-start gap-2"><span>1️⃣</span> <b>Primero, registra cuánto tienes</b> en cada cuenta (en Cuentas), o tus ingresos. Cada gasto sale de una cuenta.</li>
            <li className="flex items-start gap-2"><span>📝</span> Luego «Gasté 50 mil en el almuerzo» → queda registrado al instante</li>
            <li className="flex items-start gap-2"><span>📊</span> Gráficos, patrimonio y métricas siempre a la mano</li>
            <li className="flex items-start gap-2"><span>🔁</span> Pagos fijos, deudas, presupuestos y ahorros con recordatorios</li>
          </ul>

          {!telegramLinked && (
            <div className="rounded-[12px] bg-[var(--color-accent)]/8 px-3.5 py-3 text-[13px] text-[var(--color-ink)]">
              👉 Primer paso: <b>vincula tu Telegram</b> para empezar a registrar hablando.
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            {!telegramLinked ? (
              <button
                onClick={() => {
                  onClose();
                  onConnectTelegram();
                }}
                className="btn-mac flex-1 py-2.5 text-[14px] font-medium"
              >
                🔗 Vincular Telegram
              </button>
            ) : (
              <Link href="/dashboard/movimientos" onClick={onClose} className="btn-mac flex-1 py-2.5 text-center text-[14px] font-medium">
                Ver mis movimientos
              </Link>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90"
            >
              Explorar el panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
