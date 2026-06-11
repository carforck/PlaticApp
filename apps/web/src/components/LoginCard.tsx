"use client";

import { useState } from "react";
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import pulse from "@/app/login-pulse.json";

type Status = "idle" | "loading" | "sent" | "error";

export function LoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  // Entrar con email + contraseña
  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  // Alternativa: enlace mágico (sin contraseña)
  async function handleMagicLink() {
    if (!email) {
      setStatus("error");
      setMessage("Escribe tu correo primero.");
      return;
    }
    setStatus("loading");
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
            Ingresa con tu correo y contraseña.
          </p>

          <form onSubmit={handlePassword} className="mt-7 space-y-3">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Correo electrónico
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                disabled={status === "loading"}
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] text-[var(--color-ink)] outline-none ring-[var(--color-accent)] transition focus:ring-2 disabled:opacity-60"
              />
            </label>

            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Contraseña
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={status === "loading"}
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] text-[var(--color-ink)] outline-none ring-[var(--color-accent)] transition focus:ring-2 disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-mac mt-2 w-full py-2.5 text-[15px] font-medium disabled:opacity-70"
            >
              {status === "loading" ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[12px] text-[var(--color-ink-soft)]">
            <span className="h-px flex-1 bg-black/10" />o<span className="h-px flex-1 bg-black/10" />
          </div>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={status === "loading"}
            className="w-full rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium text-[var(--color-ink)] transition hover:bg-white/90 disabled:opacity-60"
          >
            Enviarme un enlace mágico
          </button>

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
        </div>
      </div>
    </div>
  );
}
