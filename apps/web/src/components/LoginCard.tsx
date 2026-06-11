"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <div className="glass animate-float-in w-full overflow-hidden rounded-[var(--radius-card)] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
        <span className="traffic-light bg-[#ff5f57]" />
        <span className="traffic-light bg-[#febc2e]" />
        <span className="traffic-light bg-[#28c840]" />
        <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">PlaticApp · iniciar sesión</span>
      </div>

      <div className="p-6 sm:p-8">
        <h2 className="text-[22px] font-semibold tracking-tight">Crea tu cuenta o inicia sesión</h2>
        <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">Gratis. Sin tarjeta. En 30 segundos.</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={status === "loading"}
          className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-black/10 bg-white/80 py-2.5 text-[14px] font-medium text-[var(--color-ink)] transition hover:bg-white disabled:opacity-60"
        >
          <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
          </svg>
          Continuar con Google
        </button>

        <div className="my-4 flex items-center gap-3 text-[12px] text-[var(--color-ink-soft)]">
          <span className="h-px flex-1 bg-black/10" />o con tu correo<span className="h-px flex-1 bg-black/10" />
        </div>

        <form onSubmit={handlePassword} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            disabled={status === "loading"}
            className={inputBase}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
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
          <button type="submit" disabled={status === "loading"} className="btn-mac w-full py-2.5 text-[15px] font-medium disabled:opacity-70">
            {status === "loading" ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={status === "loading"}
          className="mt-3 w-full rounded-[var(--radius-control)] py-2 text-[13px] font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)] disabled:opacity-60"
        >
          ✉️ Prefiero un enlace mágico
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
  );
}
