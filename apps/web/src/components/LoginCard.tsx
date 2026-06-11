"use client";

import { useState } from "react";
import Lottie from "lottie-react";
import { createClient } from "@/lib/supabase/client";
import pulse from "@/app/login-pulse.json";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage(`Te enviamos un enlace mágico a ${email}. Revisa tu correo ✉️`);
    }
  }

  return (
    <div className="glass animate-float-in w-full max-w-4xl overflow-hidden rounded-[var(--radius-card)]">
      {/* Barra de ventana macOS */}
      <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
        <span className="traffic-light bg-[#ff5f57]" />
        <span className="traffic-light bg-[#febc2e]" />
        <span className="traffic-light bg-[#28c840]" />
        <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Platica</span>
      </div>

      <div className="grid md:grid-cols-2">
        {/* Hero con animación Lottie */}
        <div className="relative hidden items-center justify-center bg-gradient-to-br from-[#0a84ff]/10 to-[#bf5af2]/10 p-10 md:flex">
          <div className="w-64">
            <Lottie animationData={pulse} loop autoplay />
          </div>
          <div className="absolute bottom-8 left-8 right-8">
            <p className="text-[15px] font-medium text-[var(--color-ink)]">Háblale a tu plata.</p>
            <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink-soft)]">
              Registra gastos, ingresos e inversiones conversando con el bot de Telegram. Todo
              aquí, en tiempo real.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex flex-col justify-center p-10">
          <h1 className="text-[28px] font-semibold tracking-tight">Bienvenido</h1>
          <p className="mt-1 text-[14px] text-[var(--color-ink-soft)]">
            Ingresa con tu correo para continuar.
          </p>

          <form onSubmit={handleContinue} className="mt-7 space-y-3">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Correo electrónico
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                disabled={status === "sending"}
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] text-[var(--color-ink)] outline-none ring-[var(--color-accent)] transition focus:ring-2 disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={status === "sending" || status === "sent"}
              className="btn-mac mt-2 w-full py-2.5 text-[15px] font-medium disabled:opacity-70"
            >
              {status === "sending"
                ? "Enviando enlace…"
                : status === "sent"
                  ? "Enlace enviado ✓"
                  : "Enviar enlace mágico"}
            </button>
          </form>

          {message && (
            <p
              className={`mt-4 rounded-[10px] px-3 py-2.5 text-[13px] ${
                status === "error"
                  ? "bg-[#ff375f]/10 text-[#ff375f]"
                  : "bg-[#30d158]/10 text-[#1d8a3a]"
              }`}
            >
              {message}
            </p>
          )}

          <p className="mt-6 text-[12px] leading-snug text-[var(--color-ink-soft)]">
            Sin contraseñas: te mandamos un enlace de un solo uso a tu correo.
          </p>
        </div>
      </div>
    </div>
  );
}
