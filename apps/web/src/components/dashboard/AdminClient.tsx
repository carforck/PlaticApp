"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { ADMIN_EMAIL } from "@/lib/admin";
import { fmtMoney } from "@/lib/format";
import { Avatar } from "./Avatar";
import { Paginator, usePagination } from "./Paginator";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  provider: string;
  createdAt: string;
  lastSignIn: string | null;
  lastSeen: string | null;
  online: boolean;
  telegram: string | null;
  transactions: number;
  accounts: number;
  netWorth: number;
  openDebts: number;
  storageBytes: number;
}

const fmtBytes = (b: number) => {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b >= 1000) return `${Math.round(b / 1000)} KB`;
  return `${b} B`;
};
const sinceText = (iso: string | null) => {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  if (m < 1440) return `hace ${Math.floor(m / 60)} h`;
  return `hace ${Math.floor(m / 1440)} d`;
};

export function AdminClient() {
  const { profile, refresh } = useDashboard();
  const [data, setData] = useState<{ total: number; linked: number; online: number; storageTotal: number; users: AdminUser[] } | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    const f = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    setToday(f.charAt(0).toUpperCase() + f.slice(1));
    void (async () => {
      const res = await fetch("/api/admin/users");
      if (res.ok) setData(await res.json());
      else setError("No autorizado.");
    })();
  }, []);

  const pg = usePagination(data?.users ?? [], 15);

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
        <p className="text-[13px] text-[var(--color-ink-soft)]">{today ? `📅 ${today} · ` : ""}usuarios registrados y su actividad</p>
      </header>

      <PublishAnnouncement onPublished={refresh} />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Usuarios" value={`${data?.total ?? "—"}`} />
        <Stat label="Con Telegram" value={`${data?.linked ?? "—"}`} />
        <Stat label="En línea" value={`${data?.online ?? "—"}`} />
        <Stat label="Almacenamiento" value={data ? fmtBytes(data.storageTotal) : "—"} />
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
                  <th className="px-3 py-3 font-medium">Actividad</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell">Telegram</th>
                  <th className="px-3 py-3 text-right font-medium">Mov.</th>
                  <th className="px-3 py-3 text-right font-medium">Espacio</th>
                  <th className="px-4 py-3 text-right font-medium">Patrimonio</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u)}
                    className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-black/[0.03]"
                  >
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <span className="relative shrink-0">
                          <Avatar url={u.avatar} name={u.name || u.email} size={30} />
                          {u.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#30d158]" title="En línea" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{u.name || "—"}</span>
                          <span className="block truncate text-[11px] text-[var(--color-ink-soft)]">{u.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.online ? (
                        <span className="font-medium text-[#30d158]">En línea</span>
                      ) : (
                        <span className="text-[var(--color-ink-soft)]">{sinceText(u.lastSeen)}</span>
                      )}
                      <span className="block text-[11px] text-[var(--color-ink-soft)]">alta {fmtDate(u.createdAt)}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      {u.telegram ? <span className="text-[#30d158]">✓ {u.telegram}</span> : <span className="text-[var(--color-ink-soft)]">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">{u.transactions}</td>
                    <td className="px-3 py-2.5 text-right text-[var(--color-ink-soft)]">{fmtBytes(u.storageBytes)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmtMoney(u.netWorth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Paginator page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} onPage={pg.setPage} noun="usuarios" />
          </div>
        )}
      </div>

      {selected && <UserDetailModal user={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

interface UserDetail {
  netWorth: number;
  accounts: { name: string; type: string; balance_minor: number }[];
  recent: { kind: string; amount: number; description: string | null; category: string | null; emoji: string | null; when: string }[];
  debtOwe: number;
  debtOwed: number;
}

function UserDetailModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/user?id=${user.id}`);
      if (res.ok) setDetail(await res.json());
      else setError("No se pudo cargar el detalle.");
    })();
  }, [user.id]);

  const kindColor = (k: string) =>
    k === "income" ? "text-[#30d158]" : k === "expense" ? "text-[#ff375f]" : "text-[var(--color-ink-soft)]";
  const kindSign = (k: string) => (k === "income" ? "+" : k === "expense" ? "−" : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] p-6"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">✕</button>

        <div className="flex items-center gap-3">
          <span className="relative shrink-0">
            <Avatar url={user.avatar} name={user.name || user.email} size={48} />
            {user.online && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#30d158]" />}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold">{user.name || "Sin nombre"}</h2>
            <p className="truncate text-[12px] text-[var(--color-ink-soft)]">{user.email}</p>
            <p className="text-[11px] text-[var(--color-ink-soft)]">
              {user.online ? "En línea ahora" : `Última actividad ${sinceText(user.lastSeen)}`} · {fmtBytes(user.storageBytes)} en recibos
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-6 text-center text-[13px] text-[#ff375f]">{error}</p>
        ) : !detail ? (
          <p className="mt-6 text-center text-[13px] text-[var(--color-ink-soft)]">Cargando…</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[var(--radius-control)] bg-black/[0.03] p-3">
                <p className="text-[11px] text-[var(--color-ink-soft)]">Patrimonio</p>
                <p className="mt-0.5 text-[15px] font-semibold">{fmtMoney(detail.netWorth)}</p>
              </div>
              <div className="rounded-[var(--radius-control)] bg-black/[0.03] p-3">
                <p className="text-[11px] text-[var(--color-ink-soft)]">Debo</p>
                <p className="mt-0.5 text-[15px] font-semibold text-[#ff375f]">{fmtMoney(detail.debtOwe)}</p>
              </div>
              <div className="rounded-[var(--radius-control)] bg-black/[0.03] p-3">
                <p className="text-[11px] text-[var(--color-ink-soft)]">Me deben</p>
                <p className="mt-0.5 text-[15px] font-semibold text-[#30d158]">{fmtMoney(detail.debtOwed)}</p>
              </div>
            </div>

            {detail.accounts.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">Cuentas</h3>
                <div className="space-y-1.5">
                  {detail.accounts.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-[13px]">
                      <span className="truncate">{a.name}</span>
                      <span className="font-medium">{fmtMoney(a.balance_minor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">Movimientos recientes</h3>
              {detail.recent.length === 0 ? (
                <p className="text-[13px] text-[var(--color-ink-soft)]">Sin movimientos aún.</p>
              ) : (
                <div className="space-y-1.5">
                  {detail.recent.map((t, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span>{t.emoji ?? "•"}</span>
                        <span className="min-w-0">
                          <span className="block truncate">{t.description || t.category || "Movimiento"}</span>
                          <span className="block text-[11px] text-[var(--color-ink-soft)]">
                            {new Date(t.when).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                          </span>
                        </span>
                      </span>
                      <span className={`shrink-0 font-medium ${kindColor(t.kind)}`}>
                        {kindSign(t.kind)}{fmtMoney(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
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
