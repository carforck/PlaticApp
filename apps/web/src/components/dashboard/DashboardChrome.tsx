"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { Sidebar } from "./Sidebar";
import { Avatar } from "./Avatar";
import { TelegramConnectModal } from "./TelegramConnectModal";
import { WelcomeModal } from "./WelcomeModal";

const TITLES: Record<string, string> = {
  "/dashboard": "Resumen",
  "/dashboard/novedades": "Novedades",
  "/dashboard/movimientos": "Movimientos",
  "/dashboard/cuentas": "Cuentas",
  "/dashboard/deudas": "Deudas",
  "/dashboard/presupuestos": "Presupuestos",
  "/dashboard/recurrentes": "Pagos fijos",
  "/dashboard/recibos": "Recibos",
  "/dashboard/inversiones": "Inversiones",
  "/dashboard/categorias": "Categorías",
  "/dashboard/perfil": "Perfil",
  "/dashboard/admin": "Admin",
};

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, profile } = useDashboard();
  const unread = data.announcements.filter(
    (a) => !profile.announcementsSeenAt || new Date(a.created_at) > new Date(profile.announcementsSeenAt),
  ).length;
  const [open, setOpen] = useState(false);
  const [connect, setConnect] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [welcome, setWelcome] = useState(false);

  // Muestra el modal de bienvenida una sola vez para usuarios nuevos.
  useEffect(() => {
    if (!profile.welcomedAt) setWelcome(true);
  }, [profile.welcomedAt]);

  function closeWelcome() {
    setWelcome(false);
    void fetch("/api/me/welcomed", { method: "POST" });
  }

  // Cierra el drawer al navegar.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquea el scroll del fondo cuando el drawer está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const title = TITLES[pathname] ?? "PlaticApp";

  return (
    <div className="flex min-h-screen gap-4 p-3 sm:p-4">
      {/* Sidebar fijo en desktop */}
      <Sidebar />

      {/* Drawer en móvil */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="animate-slide-in absolute inset-y-3 left-3">
            <Sidebar inDrawer />
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar solo en móvil */}
        <div className="glass mb-3 flex items-center justify-between rounded-[var(--radius-card)] px-3 py-2.5 md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="grid h-9 w-9 place-items-center rounded-[10px] hover:bg-black/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <span className="text-[15px] font-semibold tracking-tight">{title}</span>
          <span className="flex items-center gap-1.5">
            <Link href="/dashboard/novedades" aria-label="Novedades" className="relative grid h-9 w-9 place-items-center rounded-[10px] hover:bg-black/5">
              🔔
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff375f]" />}
            </Link>
            <Link href="/dashboard/perfil" aria-label="Ver perfil">
              <Avatar url={profile.avatarUrl} name={profile.displayName || profile.email} size={32} />
            </Link>
          </span>
        </div>

        {/* Onboarding: conectar Telegram */}
        {!profile.telegramLinked && !dismissed && (
          <div className="glass mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] p-3 ring-1 ring-[var(--color-accent)]/25">
            <span className="flex items-center gap-2.5 text-[13px]">
              <span className="text-[20px]">🤖</span>
              <span>Conecta el bot de Telegram para registrar tus finanzas hablando, por audio o foto.</span>
            </span>
            <span className="flex items-center gap-2">
              <button onClick={() => setConnect(true)} className="btn-mac px-3.5 py-1.5 text-[13px] font-medium">
                Conectar
              </button>
              <button
                onClick={() => setDismissed(true)}
                aria-label="Descartar"
                className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--color-ink-soft)] hover:bg-black/5"
              >
                ✕
              </button>
            </span>
          </div>
        )}

        {children}
      </div>

      {welcome && (
        <WelcomeModal
          name={profile.displayName}
          telegramLinked={profile.telegramLinked}
          onClose={closeWelcome}
          onConnectTelegram={() => setConnect(true)}
        />
      )}

      {connect && (
        <TelegramConnectModal
          onClose={() => setConnect(false)}
          onLinked={() => {
            setConnect(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
