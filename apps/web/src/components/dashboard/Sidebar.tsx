"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Resumen", icon: "🏠", href: "/dashboard" },
  { label: "Movimientos", icon: "💸", href: "/dashboard/movimientos" },
  { label: "Cuentas", icon: "🏦", href: "/dashboard/cuentas" },
  { label: "Deudas", icon: "🤝", href: "/dashboard/deudas" },
] as const;

const SOON = [
  { label: "Inversiones", icon: "📈" },
  { label: "Categorías", icon: "🏷️" },
  { label: "Ajustes", icon: "⚙️" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [link, setLink] = useState<{ code: string; deepLink: string } | null>(null);

  async function linkTelegram() {
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    if (res.ok) setLink(await res.json());
  }

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <aside className="glass animate-float-in hidden w-60 shrink-0 flex-col rounded-[var(--radius-card)] p-3 md:flex">
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="traffic-light bg-[#ff5f57]" />
        <span className="traffic-light bg-[#febc2e]" />
        <span className="traffic-light bg-[#28c840]" />
      </div>
      <div className="px-2 py-3">
        <p className="text-[15px] font-semibold tracking-tight">Platica</p>
        <p className="text-[12px] text-[var(--color-ink-soft)]">Control financiero</p>
      </div>

      <nav className="mt-2 space-y-0.5">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[14px] transition ${
                active ? "bg-[var(--color-accent)] text-white shadow-sm" : "hover:bg-black/5"
              }`}
            >
              <span className="text-[15px]">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
        {SOON.map((n) => (
          <span
            key={n.label}
            className="flex w-full cursor-default items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[14px] text-[var(--color-ink-soft)] opacity-50"
            title="Próximamente"
          >
            <span className="text-[15px]">{n.icon}</span>
            {n.label}
          </span>
        ))}
      </nav>

      <div className="mt-auto space-y-2">
        <div className="rounded-[12px] bg-black/[0.04] p-3">
          <p className="text-[12px] font-medium">Bot de Telegram</p>
          {link ? (
            <div className="mt-1.5">
              <p className="text-[11px] text-[var(--color-ink-soft)]">Envía este código al bot:</p>
              <p className="my-1 text-center text-[18px] font-bold tracking-[0.2em] text-[var(--color-accent)]">
                {link.code}
              </p>
              <a
                href={link.deepLink}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[8px] bg-[var(--color-accent)] py-1.5 text-center text-[12px] font-medium text-white"
              >
                Abrir @PlaticApp_bot
              </a>
              <p className="mt-1 text-[10px] text-[var(--color-ink-soft)]">Vence en 15 min</p>
            </div>
          ) : (
            <button
              onClick={linkTelegram}
              className="mt-1.5 w-full rounded-[8px] border border-black/10 bg-white/70 py-1.5 text-[12px] font-medium transition hover:bg-white"
            >
              🔗 Vincular Telegram
            </button>
          )}
        </div>
        <button
          onClick={logout}
          className="w-full rounded-[8px] px-2.5 py-2 text-left text-[13px] text-[var(--color-ink-soft)] transition hover:bg-black/5"
        >
          ⏏︎ Salir
        </button>
      </div>
    </aside>
  );
}
