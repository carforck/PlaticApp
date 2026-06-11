"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./Sidebar";

export interface ProfileData {
  email: string;
  displayName: string;
  defaultCurrency: string;
  timezone: string;
  telegramLinked: boolean;
}

export function AjustesClient({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [defaultCurrency, setDefaultCurrency] = useState(profile.defaultCurrency);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

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

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const field = "mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[var(--color-accent)] focus:ring-2";

  return (
    <div className="flex min-h-screen gap-4 p-4">
      <Sidebar />
      <main className="flex-1 space-y-4">
        <header>
          <h1 className="text-[26px] font-semibold tracking-tight">Ajustes</h1>
          <p className="text-[13px] text-[var(--color-ink-soft)]">{profile.email}</p>
        </header>

        <div className="glass max-w-lg rounded-[var(--radius-card)] p-6">
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

        <div className="glass max-w-lg rounded-[var(--radius-card)] p-6">
          <p className="text-[14px] font-semibold">Telegram</p>
          <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
            {profile.telegramLinked ? "✅ Vinculado a @PlaticApp_bot" : "🔗 No vinculado — usa «Vincular Telegram» en el menú."}
          </p>
        </div>

        <button
          onClick={logout}
          className="rounded-[var(--radius-control)] border border-[#ff375f]/30 bg-[#ff375f]/10 px-4 py-2.5 text-[14px] font-medium text-[#ff375f] transition hover:bg-[#ff375f]/20"
        >
          Cerrar sesión
        </button>
      </main>
    </div>
  );
}
