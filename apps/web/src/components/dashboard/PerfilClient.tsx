"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboard } from "@/lib/dashboard-context";
import { fmtMoney } from "@/lib/format";
import { Avatar } from "./Avatar";

export function PerfilClient() {
  const router = useRouter();
  const { data, profile } = useDashboard();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [defaultCurrency, setDefaultCurrency] = useState(profile.defaultCurrency);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [link, setLink] = useState<{ code: string; deepLink: string } | null>(null);

  const netWorth = data.accounts.reduce((s, a) => s + a.balance_minor, 0);
  const openDebts = data.debts.filter((d) => d.status === "open").length;
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    : "—";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName, defaultCurrency, timezone }),
    });
    setStatus(res.ok ? "saved" : "idle");
    if (res.ok) setTimeout(() => setStatus("idle"), 2000);
  }
  async function linkTelegram() {
    const res = await fetch("/api/telegram/link-code", { method: "POST" });
    if (res.ok) setLink(await res.json());
  }
  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const field =
    "mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[var(--color-accent)] focus:ring-2";

  return (
    <main className="flex-1 space-y-4">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight">Perfil</h1>
        <p className="text-[13px] text-[var(--color-ink-soft)]">Tus datos y la configuración de la cuenta</p>
      </header>

      {/* Identidad */}
      <section className="glass flex flex-col items-center gap-4 rounded-[var(--radius-card)] p-6 sm:flex-row sm:items-center">
        <Avatar url={profile.avatarUrl} name={profile.displayName || profile.email} size={72} />
        <div className="text-center sm:text-left">
          <p className="text-[20px] font-semibold tracking-tight">{profile.displayName || "Mi cuenta"}</p>
          <p className="text-[13px] text-[var(--color-ink-soft)]">{profile.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge>{profile.provider === "google" ? "🔵 Google" : "✉️ Correo"}</Badge>
            {profile.emailVerified && <Badge tone="green">✓ Verificado</Badge>}
            <Badge>📅 Desde {memberSince}</Badge>
            <Badge tone={profile.telegramLinked ? "green" : "rose"}>
              {profile.telegramLinked ? "🤖 Telegram vinculado" : "🤖 Sin vincular"}
            </Badge>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Patrimonio" value={fmtMoney(netWorth)} />
        <Stat label="Cuentas" value={`${data.accounts.length}`} />
        <Stat label="Pagos fijos" value={`${data.recurrences.filter((r) => r.active).length}`} />
        <Stat label="Deudas abiertas" value={`${openDebts}`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos editables */}
        <div className="glass rounded-[var(--radius-card)] p-6">
          <h2 className="mb-4 text-[15px] font-semibold">Datos personales</h2>
          <form onSubmit={save} className="space-y-4">
            <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
              Nombre
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tu nombre" className={field} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                Moneda
                <select value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} className={field}>
                  <option value="COP">COP — Peso colombiano</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="MXN">MXN — Peso mexicano</option>
                </select>
              </label>
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                Zona horaria
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={field}>
                  <option value="America/Bogota">America/Bogota</option>
                  <option value="America/Mexico_City">America/Mexico_City</option>
                  <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                </select>
              </label>
            </div>
            <button type="submit" disabled={status === "saving"} className="btn-mac w-full py-2.5 text-[15px] font-medium disabled:opacity-70">
              {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado ✓" : "Guardar cambios"}
            </button>
          </form>
        </div>

        {/* Telegram */}
        <div className="glass rounded-[var(--radius-card)] p-6">
          <h2 className="mb-4 text-[15px] font-semibold">Bot de Telegram</h2>
          {profile.telegramLinked ? (
            <p className="text-[14px] text-[var(--color-ink-soft)]">
              ✅ Tu cuenta está vinculada a <b>@PlaticApp_bot</b>. Escríbele para registrar movimientos por chat,
              audio o foto.
            </p>
          ) : link ? (
            <div>
              <p className="text-[13px] text-[var(--color-ink-soft)]">Envía este código al bot:</p>
              <p className="my-2 text-center text-[24px] font-bold tracking-[0.25em] text-[var(--color-accent)]">{link.code}</p>
              <a href={link.deepLink} target="_blank" rel="noreferrer" className="btn-mac block py-2.5 text-center text-[14px] font-medium">
                Abrir @PlaticApp_bot
              </a>
              <p className="mt-2 text-[12px] text-[var(--color-ink-soft)]">Vence en 15 minutos.</p>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-[14px] text-[var(--color-ink-soft)]">
                Vincula Telegram para registrar tus finanzas hablando con el bot.
              </p>
              <button onClick={linkTelegram} className="btn-mac w-full py-2.5 text-[14px] font-medium">
                🔗 Vincular Telegram
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={logout}
        className="rounded-[var(--radius-control)] border border-[#ff375f]/30 bg-[#ff375f]/10 px-4 py-2.5 text-[14px] font-medium text-[#ff375f] transition hover:bg-[#ff375f]/20"
      >
        Cerrar sesión
      </button>
    </main>
  );
}

function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "rose" }) {
  const tones = {
    gray: "bg-black/[0.05] text-[var(--color-ink-soft)]",
    green: "bg-[#30d158]/12 text-[#1d8a3a]",
    rose: "bg-[#ff375f]/12 text-[#ff375f]",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${tones[tone]}`}>{children}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}
