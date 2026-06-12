"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { Sidebar } from "./Sidebar";
import { Avatar } from "./Avatar";
import { TelegramConnectModal } from "./TelegramConnectModal";
import { WelcomeModal } from "./WelcomeModal";
import { SectionDescription } from "./SectionDescription";
import { AddTransactionModal } from "./AddTransactionModal";

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
  const { data, profile, refresh } = useDashboard();
  const unread = data.announcements.filter(
    (a) => !profile.announcementsSeenAt || new Date(a.created_at) > new Date(profile.announcementsSeenAt),
  ).length;
  const [open, setOpen] = useState(false);
  const [connect, setConnect] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);

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

  // Gestos táctiles: deslizar desde el borde izquierdo abre el menú; deslizar a la
  // izquierda lo cierra. Solo afecta al táctil (móvil); el desktop no se toca.
  useEffect(() => {
    let sx = 0, sy = 0, fromEdge = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      sx = t.clientX;
      sy = t.clientY;
      fromEdge = t.clientX < 24;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return; // ignora scroll vertical
      if (!open && fromEdge && dx > 0) setOpen(true);
      else if (open && dx < 0) setOpen(false);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [open]);

  // Pull-to-refresh: estando arriba del todo, jalar hacia abajo refresca los datos.
  useEffect(() => {
    let sy = 0, active = false;
    const setP = (v: number) => { pullRef.current = v; setPullPx(v); };
    const onStart = (e: TouchEvent) => {
      active = window.scrollY <= 0 && !open;
      sy = e.touches[0]?.clientY ?? 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = (e.touches[0]?.clientY ?? 0) - sy;
      if (dy > 0 && window.scrollY <= 0) setP(Math.min(80, dy * 0.5));
      else { active = false; setP(0); }
    };
    const onEnd = async () => {
      if (!active) return;
      active = false;
      if (pullRef.current > 45) {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
      }
      setP(0);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [open, refresh]);

  const title = TITLES[pathname] ?? "PlaticApp";

  return (
    <div className="flex min-h-screen gap-4 p-3 sm:p-4">
      {/* Indicador de pull-to-refresh (móvil) */}
      {(pullPx > 0 || refreshing) && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center md:hidden"
          style={{ transform: `translateY(${refreshing ? 12 : Math.max(0, pullPx - 20)}px)`, opacity: refreshing ? 1 : Math.min(1, pullPx / 45) }}
        >
          <span className={`glass grid h-9 w-9 place-items-center rounded-full text-[16px] shadow-md ${refreshing ? "animate-spin" : ""}`}>
            ↻
          </span>
        </div>
      )}

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
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
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

        <SectionDescription />
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

      {/* Botón flotante de registro rápido — solo móvil */}
      <button
        onClick={() => setAdding(true)}
        aria-label="Registrar movimiento"
        className="btn-mac fixed bottom-[4.6rem] right-4 z-40 grid h-14 w-14 place-items-center rounded-full text-[26px] leading-none shadow-xl md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        +
      </button>

      {adding && (
        <AddTransactionModal
          accounts={data.accounts}
          categories={data.categories}
          onClose={() => setAdding(false)}
          onSaved={refresh}
        />
      )}

      {/* Navegación inferior — solo móvil, al alcance del pulgar */}
      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-white/15 px-1 pt-1 md:hidden"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      >
        {[
          { label: "Inicio", icon: "🏠", href: "/dashboard" },
          { label: "Movs", icon: "💸", href: "/dashboard/movimientos" },
          { label: "Cuentas", icon: "🏦", href: "/dashboard/cuentas" },
          { label: "Novedades", icon: "🔔", href: "/dashboard/novedades" },
        ].map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-[10px] py-1.5 text-[10px] font-medium transition ${
                active ? "text-[var(--color-accent)]" : "text-[var(--color-ink-soft)]"
              }`}
            >
              <span className="text-[19px] leading-none">{it.icon}</span>
              {it.label}
              {it.href === "/dashboard/novedades" && unread > 0 && (
                <span className="absolute right-[24%] top-1 h-2 w-2 rounded-full bg-[#ff375f]" />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-[10px] py-1.5 text-[10px] font-medium text-[var(--color-ink-soft)]"
        >
          <span className="text-[19px] leading-none">☰</span>
          Más
        </button>
      </nav>
    </div>
  );
}
