"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";

/**
 * Tour de bienvenida paso a paso. Le enseña al usuario la ruta para empezar:
 * registrar cuentas y saldos, cómo registrar movimientos, y qué hace cada sección.
 * Aparece una sola vez (flag welcomed_at); al cerrarlo se marca como visto.
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
  const [step, setStep] = useState(0);

  const steps: {
    emoji: string;
    title: string;
    body: React.ReactNode;
  }[] = [
    {
      emoji: "👋",
      title: firstName ? `¡Hola, ${firstName}!` : "¡Bienvenido!",
      body: (
        <p className="text-[14px] leading-relaxed text-[var(--color-ink)]">
          Soy <b>PlaticApp</b>: tu dinero, tan fácil como mandar un mensaje. Registra tus finanzas
          aquí o <b>hablándole al bot de Telegram</b> 🤖 (texto, audio 🎙️ o foto de un recibo 🖼️) y
          míralo todo en tiempo real. Te muestro en 4 pasos cómo empezar 👇
        </p>
      ),
    },
    {
      emoji: "🏦",
      title: "Paso 1 · Crea tus cuentas y pon su saldo",
      body: (
        <div className="space-y-2.5 text-[14px] leading-relaxed text-[var(--color-ink)]">
          <p>
            Ve a <b>Cuentas</b> y crea tus bancos, efectivo o billeteras (Nequi, Bancolombia…).
            Pon el <b>saldo real</b> que tienes hoy en cada una.
          </p>
          <p className="rounded-[10px] bg-[var(--color-accent)]/8 px-3 py-2 text-[13px]">
            💡 Es el paso más importante: <b>cada gasto sale de una cuenta</b>. Sin saldo, todo
            quedaría en negativo. Las <b>tarjetas de crédito</b> son deuda (no suman al patrimonio).
          </p>
        </div>
      ),
    },
    {
      emoji: "📝",
      title: "Paso 2 · Registra tus movimientos",
      body: (
        <div className="space-y-2.5 text-[14px] leading-relaxed text-[var(--color-ink)]">
          <p>
            Toca el botón <b>Registrar</b> (o háblale al bot): «gasté 50 mil en el almuerzo»,
            «me pagaron 1.500.000», «pasé 100 mil de Nequi a Bancolombia».
          </p>
          <p>
            Aparece al instante en tu <b>Resumen</b>: saldo disponible, gráficos, racha y tu
            próximo pago. 📊
          </p>
        </div>
      ),
    },
    {
      emoji: "🧰",
      title: "Paso 3 · Tus herramientas",
      body: (
        <ul className="space-y-2 text-[13.5px] leading-snug text-[var(--color-ink)]">
          <li className="flex gap-2"><span>🐷</span> <span><b>Ahorros</b>: aparta plata en «sobres» con metas, dentro de una cuenta.</span></li>
          <li className="flex gap-2"><span>🤝</span> <span><b>Deudas</b>: quién te debe o a quién le debes; la plata se mueve de una cuenta.</span></li>
          <li className="flex gap-2"><span>🔁</span> <span><b>Pagos fijos</b>: te recuerdo el día del cobro (no debito solo; tú eliges la cuenta).</span></li>
          <li className="flex gap-2"><span>🎯</span> <span><b>Presupuestos</b>: pon límites por categoría y te aviso si te pasas.</span></li>
        </ul>
      ),
    },
    {
      emoji: "🤖",
      title: "Paso 4 · Conecta el bot de Telegram",
      body: (
        <div className="space-y-2.5 text-[14px] leading-relaxed text-[var(--color-ink)]">
          <p>
            Vincula tu Telegram para registrar <b>hablando</b>, desde donde estés. Es la forma más
            rápida y cómoda de usar PlaticApp.
          </p>
          {telegramLinked ? (
            <p className="rounded-[10px] bg-[#30d158]/12 px-3 py-2 text-[13px] text-[#1a7f37]">
              ✅ ¡Ya tienes tu Telegram conectado! Escríbele cuando quieras.
            </p>
          ) : (
            <p className="rounded-[10px] bg-[var(--color-accent)]/8 px-3 py-2 text-[13px]">
              👉 Aún no lo has vinculado. Es gratis y toma 10 segundos.
            </p>
          )}
        </div>
      ),
    },
    {
      emoji: "🔒",
      title: "Tus datos están seguros",
      body: (
        <div className="space-y-2.5 text-[14px] leading-relaxed text-[var(--color-ink)]">
          <p>
            Tu información es <b>tuya</b>: puedes exportarla o borrarla cuando quieras, y nunca la
            vendemos. Cada usuario solo ve lo suyo.
          </p>
          <p className="rounded-[10px] bg-[#30d158]/12 px-3 py-2 text-[13px] text-[#1a7f37]">
            Si entras con Google, solo usamos tu nombre y correo para identificarte. No leemos tu
            correo ni accedemos a tu Gmail.
          </p>
          <p className="text-[12.5px] text-[var(--color-ink-soft)]">
            Cumplimos la Ley 1581 de 2012 (Habeas Data).{" "}
            <Link href="/privacidad" onClick={onClose} className="font-medium text-[var(--color-accent)] hover:underline">
              Ver la política
            </Link>
            .
          </p>
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;
  const cur = steps[step]!;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass animate-float-in relative w-full max-w-md overflow-hidden rounded-[var(--radius-card)]">
        {/* Encabezado con la identidad de la app */}
        <div className="relative flex flex-col items-center gap-3 bg-gradient-to-br from-[#0a84ff]/10 to-[#bf5af2]/10 px-6 pb-5 pt-8 text-center">
          <button
            onClick={onClose}
            aria-label="Saltar"
            className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[12px] font-medium text-[var(--color-ink-soft)] transition hover:bg-black/5"
          >
            Saltar ✕
          </button>
          <BrandIcon size={60} className="rounded-[22%] shadow-lg" />
          <p className="bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text text-[22px] font-bold tracking-tight text-transparent">
            PlaticApp!
          </p>
        </div>

        <div className="space-y-4 p-6">
          {/* Contenido del paso */}
          <div className="min-h-[188px] space-y-3">
            <p className="flex items-center gap-2 text-[16px] font-semibold tracking-tight">
              <span className="text-[22px]">{cur.emoji}</span> {cur.title}
            </p>
            {cur.body}
          </div>

          {/* Puntos de progreso */}
          <div className="flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-[var(--color-accent)]" : "w-1.5 bg-black/15"}`}
              />
            ))}
          </div>

          {/* Navegación */}
          <div className="flex gap-2 pt-1">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-4 py-2.5 text-[14px] font-medium transition hover:bg-white/90"
              >
                Atrás
              </button>
            )}
            {!isLast ? (
              <button onClick={() => setStep((s) => s + 1)} className="btn-mac flex-1 py-2.5 text-[14px] font-medium">
                Siguiente
              </button>
            ) : !telegramLinked ? (
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
              <Link
                href="/dashboard/cuentas"
                onClick={onClose}
                className="btn-mac flex-1 py-2.5 text-center text-[14px] font-medium"
              >
                🏦 Crear mi primera cuenta
              </Link>
            )}
          </div>

          {isLast && (
            <Link
              href="/dashboard/cuentas"
              onClick={onClose}
              className="block text-center text-[12.5px] font-medium text-[var(--color-ink-soft)] underline-offset-2 hover:underline"
            >
              {telegramLinked ? "Empezar por mis cuentas →" : "Prefiero empezar sin el bot →"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
