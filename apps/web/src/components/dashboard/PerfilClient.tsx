"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDashboard } from "@/lib/dashboard-context";
import { fmtMoney } from "@/lib/format";
import { Avatar } from "./Avatar";
import { DevCredit } from "@/components/DevCredit";

export function PerfilClient() {
  const router = useRouter();
  const { data, profile, refresh } = useDashboard();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [defaultCurrency, setDefaultCurrency] = useState(profile.defaultCurrency);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [link, setLink] = useState<{ code: string; deepLink: string } | null>(null);
  const [resetting, setResetting] = useState(false);

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
  function exportData() {
    window.location.href = "/api/me/export";
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

      {/* Zona de datos */}
      <section className="glass rounded-[var(--radius-card)] p-6">
        <h2 className="text-[15px] font-semibold">🗂️ Tus datos</h2>
        <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
          Descarga una copia de todo lo que has registrado, o empieza de cero conservando tu cuenta.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={exportData}
            className="rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-4 py-2.5 text-[14px] font-medium transition hover:bg-white/90"
          >
            ⬇️ Exportar mis datos (JSON)
          </button>
          <button
            onClick={() => setResetting(true)}
            className="rounded-[var(--radius-control)] border border-[#ff375f]/30 bg-[#ff375f]/10 px-4 py-2.5 text-[14px] font-medium text-[#ff375f] transition hover:bg-[#ff375f]/20"
          >
            🧹 Empezar de nuevo
          </button>
        </div>
      </section>

      <button
        onClick={logout}
        className="rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-4 py-2.5 text-[14px] font-medium transition hover:bg-white/90"
      >
        Cerrar sesión
      </button>

      {resetting && <ResetDataModal onClose={() => setResetting(false)} onDone={refresh} accounts={data.accounts.length} transactions={data.transactions.length} />}

      <DevCredit className="pt-4" />
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

const CONFIRM_PHRASE = "EMPEZAR DE NUEVO";

function ResetDataModal({
  onClose,
  onDone,
  accounts,
  transactions,
}: {
  onClose: () => void;
  onDone: () => void | Promise<void>;
  accounts: number;
  transactions: number;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState("");
  const ok = text.trim().toUpperCase() === CONFIRM_PHRASE;

  async function confirm() {
    if (!ok) return;
    setStatus("working");
    setError("");
    const res = await fetch("/api/me/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: CONFIRM_PHRASE }),
    });
    if (res.ok) {
      setStatus("done");
      await onDone();
      setTimeout(onClose, 1200);
    } else {
      setStatus("idle");
      setError((await res.json().catch(() => ({}))).error ?? "No se pudo completar.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <span className="traffic-light bg-[#ff5f57]" />
          <span className="traffic-light bg-[#febc2e]" />
          <span className="traffic-light bg-[#28c840]" />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Empezar de nuevo</span>
        </div>
        <div className="space-y-4 p-6">
          {status === "done" ? (
            <p className="py-4 text-center text-[15px] font-medium text-[#1d8a3a]">✓ Listo, tu cuenta quedó en blanco.</p>
          ) : (
            <>
              <p className="text-[14px] text-[var(--color-ink)]">
                Esto borra <b>para siempre</b> todos tus movimientos, cuentas, categorías, deudas, pagos fijos,
                presupuestos y recibos. Tu usuario y el vínculo de Telegram se conservan.
              </p>
              <div className="rounded-[12px] bg-[#ff375f]/8 px-3 py-2.5 text-[13px] text-[#ff375f]">
                Se eliminarán {transactions} movimientos y {accounts} cuentas, entre otros datos. Esta acción no se puede deshacer.
              </div>
              <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
                Escribe <b className="text-[var(--color-ink)]">{CONFIRM_PHRASE}</b> para confirmar
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[#ff375f] focus:ring-2"
                />
              </label>
              {error && <p className="rounded-[10px] bg-[#ff375f]/10 px-3 py-2 text-[13px] text-[#ff375f]">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">
                  Cancelar
                </button>
                <button
                  onClick={confirm}
                  disabled={!ok || status === "working"}
                  className="flex-1 rounded-[var(--radius-control)] bg-[#ff375f] py-2.5 text-[14px] font-medium text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  {status === "working" ? "Borrando…" : "Borrar todo"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
