"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboard } from "@/lib/dashboard-context";
import { ADMIN_EMAIL } from "@/lib/admin";
import { SECTION_DESC } from "@/lib/sections";
import { BrandLockup } from "@/components/BrandIcon";
import { Avatar } from "./Avatar";
import { ThemeToggle } from "./ThemeToggle";

const NAV_GROUPS = [
  {
    title: "Principal",
    items: [
      { label: "Resumen", icon: "🏠", href: "/dashboard" },
      { label: "Movimientos", icon: "💸", href: "/dashboard/movimientos" },
      { label: "Novedades", icon: "🔔", href: "/dashboard/novedades" },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { label: "Cuentas", icon: "🏦", href: "/dashboard/cuentas" },
      { label: "Deudas", icon: "🤝", href: "/dashboard/deudas" },
      { label: "Ahorros", icon: "🐷", href: "/dashboard/ahorros" },
      { label: "Inversiones", icon: "📈", href: "/dashboard/inversiones" },
      { label: "Presupuestos", icon: "🎯", href: "/dashboard/presupuestos" },
      { label: "Pagos fijos", icon: "🔁", href: "/dashboard/recurrentes" },
    ],
  },
  {
    title: "Registros",
    items: [
      { label: "Recibos", icon: "🧾", href: "/dashboard/recibos" },
      { label: "Categorías", icon: "🏷️", href: "/dashboard/categorias" },
    ],
  },
] as const;

export function Sidebar({ inDrawer = false }: { inDrawer?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, profile } = useDashboard();
  const [link, setLink] = useState<{ code: string; deepLink: string } | null>(null);

  const unread = data.announcements.filter(
    (a) => !profile.announcementsSeenAt || new Date(a.created_at) > new Date(profile.announcementsSeenAt),
  ).length;

  async function linkTelegram() {
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    if (res.ok) setLink(await res.json());
  }

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <aside
      className={
        inDrawer
          ? "glass flex h-full w-[82vw] max-w-[18rem] shrink-0 flex-col rounded-[var(--radius-card)] p-3"
          : "glass animate-float-in hidden w-60 shrink-0 flex-col rounded-[var(--radius-card)] p-3 md:flex md:sticky md:top-4 md:max-h-[calc(100vh-2rem)]"
      }
    >
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <span className="flex items-center gap-1.5">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
        </span>
        <BrandLockup size={20} />
      </div>
      <Link
        href="/dashboard/perfil"
        className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 transition hover:bg-black/5"
        title="Ver perfil"
      >
        <Avatar url={profile.avatarUrl} name={profile.displayName || profile.email} size={38} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold tracking-tight">
            {profile.displayName || "Mi cuenta"}
          </p>
          <p className="truncate text-[12px] text-[var(--color-ink-soft)]">{profile.email}</p>
        </div>
      </Link>

      <nav className="mt-1 flex-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-1">
            <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]/70">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((n) => (
                <NavLink key={n.href} href={n.href} icon={n.icon} label={n.label} active={pathname === n.href} badge={n.href === "/dashboard/novedades" ? unread : 0} />
              ))}
            </div>
          </div>
        ))}

        <div className="mb-1">
          <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]/70">
            Cuenta
          </p>
          <div className="space-y-0.5">
            <NavLink href="/dashboard/perfil" icon="👤" label="Perfil" active={pathname === "/dashboard/perfil"} badge={0} />
            {profile.email === ADMIN_EMAIL && (
              <NavLink href="/dashboard/admin" icon="🛡️" label="Admin" active={pathname === "/dashboard/admin"} badge={0} />
            )}
          </div>
        </div>
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
        <ThemeToggle />
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

function NavLink({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  badge: number;
}) {
  return (
    <Link
      href={href}
      title={SECTION_DESC[href] ?? label}
      className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[14px] transition ${
        active ? "bg-[var(--color-accent)] text-white shadow-sm" : "hover:bg-black/5"
      }`}
    >
      <span className="text-[15px]">{icon}</span>
      {label}
      {badge > 0 && (
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#ff375f] px-1 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
