"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { ADMIN_EMAIL } from "@/lib/admin";
import { fmtMoney } from "@/lib/format";
import { Avatar } from "./Avatar";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  provider: string;
  createdAt: string;
  lastSignIn: string | null;
  telegram: string | null;
  transactions: number;
  accounts: number;
  netWorth: number;
  openDebts: number;
}

export function AdminClient() {
  const { profile, refresh } = useDashboard();
  const [data, setData] = useState<{ total: number; linked: number; users: AdminUser[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/users");
      if (res.ok) setData(await res.json());
      else setError("No autorizado.");
    })();
  }, []);

  if (profile.email !== ADMIN_EMAIL) {
    return (
      <main className="flex-1">
        <div className="glass rounded-[var(--radius-card)] p-10 text-center text-[14px] text-[var(--color-ink-soft)]">
          🔒 Esta sección es solo para administradores.
        </div>
      </main>
    );
  }

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

  return (
    <main className="flex-1 space-y-4">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight">Admin</h1>
        <p className="text-[13px] text-[var(--color-ink-soft)]">Usuarios registrados y su actividad</p>
      </header>

      <PublishAnnouncement onPublished={refresh} />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Usuarios" value={`${data?.total ?? "—"}`} />
        <Stat label="Con Telegram" value={`${data?.linked ?? "—"}`} />
        <Stat label="Activos hoy" value={`${data?.users.filter((u) => u.lastSignIn && new Date(u.lastSignIn).toDateString() === new Date().toDateString()).length ?? "—"}`} />
      </section>

      <div className="glass overflow-hidden rounded-[var(--radius-card)]">
        {error ? (
          <p className="p-8 text-center text-[14px] text-[#ff375f]">{error}</p>
        ) : !data ? (
          <p className="p-8 text-center text-[14px] text-[var(--color-ink-soft)]">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/5 text-left text-[12px] text-[var(--color-ink-soft)]">
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-3 py-3 font-medium">Registro</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell">Acceso</th>
                  <th className="px-3 py-3 font-medium">Telegram</th>
                  <th className="px-3 py-3 text-right font-medium">Mov.</th>
                  <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Cuentas</th>
                  <th className="px-4 py-3 text-right font-medium">Patrimonio</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <Avatar url={u.avatar} name={u.name || u.email} size={30} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{u.name || "—"}</span>
                          <span className="block truncate text-[11px] text-[var(--color-ink-soft)]">{u.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-ink-soft)]">{fmtDate(u.createdAt)}</td>
                    <td className="hidden px-3 py-2.5 text-[var(--color-ink-soft)] sm:table-cell">{fmtDate(u.lastSignIn)}</td>
                    <td className="px-3 py-2.5">
                      {u.telegram ? <span className="text-[#30d158]">✓ {u.telegram}</span> : <span className="text-[var(--color-ink-soft)]">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">{u.transactions}</td>
                    <td className="hidden px-3 py-2.5 text-right sm:table-cell">{u.accounts}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmtMoney(u.netWorth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function PublishAnnouncement({ onPublished }: { onPublished: () => void }) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("🚀");
  const [tag, setTag] = useState("nuevo");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notify, setNotify] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emoji, tag, title, body, notify }),
    });
    if (res.ok) {
      const j = await res.json();
      setStatus("done");
      setMsg(`Publicada${notify ? ` · enviada a ${j.notified} usuarios` : ""}.`);
      setTitle("");
      setBody("");
      onPublished();
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setStatus("idle");
      setMsg((await res.json().catch(() => ({}))).error ?? "Error");
    }
  }

  const field = "w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2";

  return (
    <div className="glass rounded-[var(--radius-card)] p-5">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-[15px] font-semibold">
        📢 Publicar novedad
        <span className="text-[var(--color-ink-soft)]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className={`${field} w-16 text-center`} />
            <select value={tag} onChange={(e) => setTag(e.target.value)} className={field}>
              <option value="nuevo">Nuevo</option>
              <option value="mejora">Mejora</option>
              <option value="arreglo">Arreglo</option>
            </select>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Título" className={field} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} required placeholder="Mensaje…" rows={3} className={field} />
          <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-soft)]">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notificar a todos por Telegram
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={status === "saving"} className="btn-mac px-4 py-2 text-[14px] font-medium disabled:opacity-70">
              {status === "saving" ? "Publicando…" : "Publicar"}
            </button>
            {msg && <span className="text-[12px] text-[var(--color-ink-soft)]">{msg}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <p className="text-[12px] font-medium text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}
