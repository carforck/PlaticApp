"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BOT_ID = Number(process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID || "8878963254");

interface TgAuthUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    Telegram?: {
      Login?: { auth: (opts: { bot_id: number; request_access?: string }, cb: (user: TgAuthUser | false) => void) => void };
    };
  }
}

/**
 * Botón propio (full-width, simétrico con los demás) que dispara el popup oficial
 * de Telegram. Verificamos la firma en el servidor y abrimos sesión en Supabase.
 * Requiere el dominio autorizado en BotFather (/setdomain).
 */
export function TelegramLoginButton({ onError, disabled }: { onError?: (m: string) => void; disabled?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (document.getElementById("tg-widget-script")) return;
    const s = document.createElement("script");
    s.id = "tg-widget-script";
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  async function onAuth(user: TgAuthUser) {
    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(user),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.token_hash) {
        onError?.(json.error ?? "No se pudo entrar con Telegram.");
        return;
      }
      const { error } = await createClient().auth.verifyOtp({ token_hash: json.token_hash, type: "magiclink" });
      if (error) {
        onError?.(error.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      onError?.("No se pudo entrar con Telegram.");
    }
  }

  function open() {
    const tg = window.Telegram?.Login;
    if (!tg) {
      onError?.("Telegram aún está cargando, intenta de nuevo en un segundo.");
      return;
    }
    tg.auth({ bot_id: BOT_ID, request_access: "write" }, (user) => {
      if (user) void onAuth(user);
      else onError?.("Se canceló el acceso con Telegram.");
    });
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-black/10 bg-white/80 py-2.5 text-[14px] font-medium text-[var(--color-ink)] transition hover:bg-white disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#229ED9" aria-hidden>
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.15-3.06-1.99 1.93c-.23.23-.42.42-.83.42z" />
      </svg>
      Continuar con Telegram
    </button>
  );
}
