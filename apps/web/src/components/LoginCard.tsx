"use client";

import { useState } from "react";
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import anim from "@/app/login-anim.json";

type Status = "idle" | "loading" | "sent" | "error";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
      <path d="M6.06 6.06A13.2 13.2 0 0 0 2 11s3.5 7 10 7a9.12 9.12 0 0 0 3.42-.66" />
      <path d="m9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

const FEATURES = [
  { icon: "💬", title: "Registra hablando", desc: "Texto, audio o foto en Telegram" },
  { icon: "🧠", title: "IA que entiende", desc: "Categoriza y detecta deudas sola" },
  { icon: "⚡", title: "En tiempo real", desc: "Tu dashboard se actualiza al vuelo" },
];

export function LoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setMessage(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setStatus("error");
      setMessage("Escribe tu correo primero.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const { error } = await createClient().auth.signInWithOtp({
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

  const inputBase =
    "w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] text-[var(--color-ink)] outline-none ring-[var(--color-accent)] transition focus:border-[var(--color-accent)] focus:ring-2 disabled:opacity-60";

  return (
    <div className="glass animate-float-in w-full max-w-5xl overflow-hidden rounded-[var(--radius-card)] shadow-2xl">
      {/* Barra de ventana macOS */}
      <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
        <span className="traffic-light bg-[#ff5f57]" />
        <span className="traffic-light bg-[#febc2e]" />
        <span className="traffic-light bg-[#28c840]" />
        <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Platica · iniciar sesión</span>
      </div>

      <div className="grid md:grid-cols-[1.1fr_1fr]">
        {/* Hero — solo desktop */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0a84ff] via-[#5e5ce6] to-[#bf5af2] p-8 text-white md:flex">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/70">Platica</p>
            <h2 className="mt-2 max-w-xs text-[26px] font-semibold leading-tight tracking-tight">
              Tus finanzas, en una conversación.
            </h2>
          </div>

          <div className="relative mx-auto w-full max-w-[300px]">
            <Lottie animationData={anim} loop autoplay />
          </div>

          <ul className="relative space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white/15 text-[16px] backdrop-blur">
                  {f.icon}
                </span>
                <span>
                  <span className="block text-[14px] font-medium">{f.title}</span>
                  <span className="block text-[12px] text-white/70">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Formulario */}
        <div className="flex flex-col justify-center p-6 sm:p-10">
          {/* Animación compacta en móvil */}
          <div className="mx-auto -mb-2 w-40 md:hidden">
            <Lottie animationData={anim} loop autoplay />
          </div>

          <div className="mb-5 hidden items-center gap-3 md:flex">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#0a84ff] to-[#bf5af2] text-[20px] text-white shadow-[0_8px_20px_-8px_rgba(10,132,255,0.8)]">
              💸
            </span>
          </div>

          <h1 className="text-center text-[26px] font-semibold tracking-tight sm:text-left sm:text-[28px]">
            Bienvenido
          </h1>
          <p className="mt-1 text-center text-[14px] text-[var(--color-ink-soft)] sm:text-left">
            Ingresa con tu correo y contraseña.
          </p>

          <form onSubmit={handlePassword} className="mt-6 space-y-3">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Correo electrónico
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                disabled={status === "loading"}
                className={`mt-1.5 ${inputBase}`}
              />
            </label>

            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Contraseña
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={status === "loading"}
                  className={`${inputBase} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[8px] text-[var(--color-ink-soft)] transition hover:bg-black/5 hover:text-[var(--color-ink)]"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
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
            ✉️ Enviarme un enlace mágico
          </button>

          {message && (
            <p
              className={`mt-4 rounded-[10px] px-3 py-2.5 text-[13px] ${
                status === "error" ? "bg-[#ff375f]/10 text-[#ff375f]" : "bg-[#30d158]/10 text-[#1d8a3a]"
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
