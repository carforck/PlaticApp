"use client";

import { useState } from "react";
import Lottie from "lottie-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DevCredit } from "@/components/DevCredit";
import { BrandIcon } from "@/components/BrandIcon";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message.includes("already registered") ? "Ese correo ya tiene cuenta. Inicia sesión." : error.message);
      } else if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setStatus("sent");
        setMessage(`¡Cuenta creada! Te enviamos un correo a ${email} para confirmarla ✉️`);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setMessage(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setStatus("idle");
    setMessage("");
  }

  async function handleGoogle() {
    setStatus("loading");
    setMessage("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message.includes("provider is not enabled") ? "Google aún no está activado." : error.message);
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
    <div className="glass animate-float-in w-full max-w-4xl overflow-hidden rounded-[var(--radius-card)] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
        <span className="traffic-light bg-[#ff5f57]" />
        <span className="traffic-light bg-[#febc2e]" />
        <span className="traffic-light bg-[#28c840]" />
        <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">PlaticApp · iniciar sesión</span>
      </div>

      <div className="grid md:grid-cols-2">
        {/* Hero con animación — solo desktop */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0a84ff] via-[#5e5ce6] to-[#bf5af2] p-8 text-white md:flex">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/70">PlaticApp</p>
            <h2 className="mt-2 max-w-xs text-[26px] font-semibold leading-tight tracking-tight">
              Háblale a tu plata.
            </h2>
          </div>
          <div className="relative mx-auto w-full max-w-[280px]">
            <Lottie animationData={anim} loop autoplay />
          </div>
          <ul className="relative space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white/15 text-[16px] backdrop-blur">{f.icon}</span>
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
          <div className="mb-3 flex items-center justify-center gap-2.5 sm:justify-start">
            <BrandIcon size={40} className="shrink-0 rounded-[28%] shadow-[0_8px_20px_-8px_rgba(10,132,255,0.8)]" />
            <span className="bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text text-[26px] font-bold tracking-tight text-transparent sm:text-[28px]">PlaticApp!</span>
          </div>

          <h1 className="text-center text-[22px] font-semibold tracking-tight sm:text-left sm:text-[24px]">
            {mode === "signup" ? "Crea tu cuenta" : "Bienvenido"}
          </h1>
          <p className="mt-1 text-center text-[14px] text-[var(--color-ink-soft)] sm:text-left">
            {mode === "signup" ? "Regístrate con tu correo y una contraseña." : "Ingresa con tu correo y contraseña."}
          </p>

          <form onSubmit={handleEmailAuth} className="mt-6 space-y-3">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Correo electrónico
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" disabled={status === "loading"} className={`mt-1.5 ${inputBase}`} />
            </label>
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Contraseña
              <div className="relative mt-1.5">
                <input type={showPassword ? "text" : "password"} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={status === "loading"} className={`${inputBase} pr-11`} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[8px] text-[var(--color-ink-soft)] transition hover:bg-black/5 hover:text-[var(--color-ink)]">
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </label>
            <button type="submit" disabled={status === "loading"} className="btn-mac mt-2 w-full py-2.5 text-[15px] font-medium disabled:opacity-70">
              {status === "loading" ? (mode === "signup" ? "Creando…" : "Entrando…") : mode === "signup" ? "Crear cuenta" : "Entrar"}
            </button>
          </form>

          <p className="mt-3 text-center text-[13px] text-[var(--color-ink-soft)] sm:text-left">
            {mode === "signin" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button type="button" onClick={toggleMode} className="font-medium text-[var(--color-accent)] hover:underline">
              {mode === "signin" ? "Crear una" : "Inicia sesión"}
            </button>
          </p>

          <div className="my-5 flex items-center gap-3 text-[12px] text-[var(--color-ink-soft)]">
            <span className="h-px flex-1 bg-black/10" />o<span className="h-px flex-1 bg-black/10" />
          </div>

          <div className="space-y-2.5">
            <button type="button" onClick={handleGoogle} disabled={status === "loading"} className="flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-black/10 bg-white/80 py-2.5 text-[14px] font-medium text-[var(--color-ink)] transition hover:bg-white disabled:opacity-60">
              <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
              </svg>
              Continuar con Google
            </button>

            {/* Telegram, justo debajo de Google */}
            <TelegramLoginButton disabled={status === "loading"} onError={(m) => { setStatus("error"); setMessage(m); }} />

            <button type="button" onClick={handleMagicLink} disabled={status === "loading"} className="w-full rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium text-[var(--color-ink)] transition hover:bg-white/90 disabled:opacity-60">
              ✉️ Enviarme un enlace mágico
            </button>
            <p className="text-center text-[11px] text-[var(--color-ink-soft)]">
              Con Telegram entras sin contraseña y tu bot queda vinculado al instante.
            </p>
          </div>

          <p className="mt-4 flex items-start justify-center gap-2 rounded-[10px] bg-[#30d158]/10 px-3 py-2 text-[11.5px] leading-snug text-[#1d8a3a] sm:justify-start">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <span>Con Google solo usamos tu <b>nombre y correo</b> para identificarte. No leemos tu correo ni accedemos a tu Gmail.</span>
          </p>

          {message && (
            <p className={`mt-4 rounded-[10px] px-3 py-2.5 text-[13px] ${status === "error" ? "bg-[#ff375f]/10 text-[#ff375f]" : "bg-[#30d158]/10 text-[#1d8a3a]"}`}>
              {message}
            </p>
          )}

          <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--color-ink-soft)] sm:text-left">
            Al continuar autorizas el tratamiento de tus datos según la{" "}
            <a href="/privacidad" className="text-[var(--color-accent)] hover:underline">Política de Privacidad</a> (Ley 1581/2012).
          </p>

          <DevCredit className="mt-5 border-t border-black/5 pt-4" />
        </div>
      </div>
    </div>
  );
}
