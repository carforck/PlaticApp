"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { Sidebar } from "./Sidebar";
import { Avatar } from "./Avatar";

const TITLES: Record<string, string> = {
  "/dashboard": "Resumen",
  "/dashboard/movimientos": "Movimientos",
  "/dashboard/cuentas": "Cuentas",
  "/dashboard/deudas": "Deudas",
  "/dashboard/presupuestos": "Presupuestos",
  "/dashboard/recurrentes": "Pagos fijos",
  "/dashboard/recibos": "Recibos",
  "/dashboard/inversiones": "Inversiones",
  "/dashboard/categorias": "Categorías",
  "/dashboard/perfil": "Perfil",
};

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useDashboard();
  const [open, setOpen] = useState(false);

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
          <Link href="/dashboard/perfil" aria-label="Ver perfil">
            <Avatar url={profile.avatarUrl} name={profile.displayName || profile.email} size={32} />
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
