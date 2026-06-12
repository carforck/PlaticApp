"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "PlaticApp_bot";

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
    onTelegramAuth?: (user: TgAuthUser) => void;
  }
}

/**
 * Botón oficial «Log in with Telegram». Al autorizar, verificamos la firma en el
 * servidor, creamos/encontramos al usuario y abrimos sesión en Supabase.
 * Requiere que el dominio esté autorizado en BotFather (/setdomain).
 */
export function TelegramLoginButton({ onError }: { onError?: (msg: string) => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = async (user: TgAuthUser) => {
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
    };

    const el = ref.current;
    if (el && !el.querySelector("script")) {
      const s = document.createElement("script");
      s.src = "https://telegram.org/js/telegram-widget.js?22";
      s.async = true;
      s.setAttribute("data-telegram-login", BOT_USERNAME);
      s.setAttribute("data-size", "large");
      s.setAttribute("data-radius", "10");
      s.setAttribute("data-onauth", "onTelegramAuth(user)");
      s.setAttribute("data-request-access", "write");
      el.appendChild(s);
    }
    return () => {
      delete window.onTelegramAuth;
    };
  }, [router, onError]);

  return <div ref={ref} className="flex justify-center sm:justify-start" />;
}
