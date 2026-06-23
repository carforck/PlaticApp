"use client";

import { useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { type CategoryRow } from "@/lib/queries";
import { Paginator, usePagination } from "./Paginator";
import { TrafficLights } from "./TrafficLights";
import { TxHistoryModal } from "./TxHistoryModal";

const APPLIES_LABEL: Record<string, string> = { expense: "Gasto", income: "Ingreso" };
const EMOJIS = ["🍽️", "🚕", "🏠", "🎬", "🩺", "💰", "🛒", "✈️", "🎁", "📚", "👕", "🐶", "💡", "📱", "🏷️", "🍻"];
const COLORS = ["#ff9f0a", "#0a84ff", "#bf5af2", "#30d158", "#ff375f", "#5e5ce6", "#ff6482", "#64d2ff", "#8e8e93"];

export function CategoriasClient() {
  const { data, refresh } = useDashboard();
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [history, setHistory] = useState<CategoryRow | null>(null);

  async function remove(id: string) {
    await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    refresh();
  }

  const cats = [...data.categories].sort((a, b) => a.name.localeCompare(b.name));
  const pg = usePagination(cats, 18);

  return (
    <main className="flex-1 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Categorías</h1>
            <p className="text-[13px] text-[var(--color-ink-soft)]">{cats.length} categorías</p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-mac px-4 py-2 text-[13px] font-medium">
            + Nueva categoría
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pg.pageItems.map((c) => (
            <div key={c.id} className="glass group relative flex items-center gap-3 rounded-[var(--radius-card)] p-4">
              <span
                className="grid h-11 w-11 place-items-center rounded-[12px] text-[20px]"
                style={{ background: (c.color ?? "#8e8e93") + "22" }}
              >
                {c.emoji ?? "🏷️"}
              </span>
              <div className="flex-1">
                <p className="text-[15px] font-medium">{c.name}</p>
                <p className="text-[12px] text-[var(--color-ink-soft)]">
                  {c.applies_to ? APPLIES_LABEL[c.applies_to] : "Gasto e ingreso"}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => setHistory(c)} className="rounded-[8px] px-2 py-1 text-[12px] hover:bg-black/5" title="Movimientos">
                  🕘
                </button>
                <button onClick={() => setEditing(c)} className="rounded-[8px] px-2 py-1 text-[12px] hover:bg-black/5" title="Editar">
                  ✏️
                </button>
                <button onClick={() => remove(c.id)} className="rounded-[8px] px-2 py-1 text-[12px] hover:bg-[#ff375f]/10" title="Eliminar">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </section>
        {pg.needed && (
          <div className="glass overflow-hidden rounded-[var(--radius-card)]">
            <Paginator page={pg.page} pageCount={pg.pageCount} from={pg.from} to={pg.to} total={pg.total} onPage={pg.setPage} noun="categorías" />
          </div>
        )}

      {(creating || editing) && (
        <CategoryModal
          cat={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={refresh}
        />
      )}

      {history && <TxHistoryModal title={history.name} mode="category" id={history.id} onClose={() => setHistory(null)} />}
    </main>
  );
}

function CategoryModal({ cat, onClose, onSaved }: { cat: CategoryRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [emoji, setEmoji] = useState(cat?.emoji ?? "🏷️");
  const [color, setColor] = useState(cat?.color ?? COLORS[0]!);
  const [appliesTo, setAppliesTo] = useState<"expense" | "income" | "">(
    (cat?.applies_to as "expense" | "income" | null) ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { name, emoji, color, appliesTo: appliesTo || null };
    const res = cat
      ? await fetch("/api/categories", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: cat.id, ...payload }) })
      : await fetch("/api/categories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass animate-float-in w-full max-w-md overflow-hidden rounded-[var(--radius-card)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <TrafficLights onClose={onClose} />
          <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">{cat ? "Editar categoría" : "Nueva categoría"}</span>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-[12px] text-[24px]" style={{ background: color + "22" }}>
              {emoji}
            </span>
            <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3.5 py-2.5 text-[15px] outline-none ring-[var(--color-accent)] focus:ring-2" />
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[var(--color-ink-soft)]">Emoji</p>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setEmoji(e)} className={`grid h-9 w-9 place-items-center rounded-[8px] text-[18px] transition ${emoji === e ? "bg-[var(--color-accent)]/15 ring-2 ring-[var(--color-accent)]" : "hover:bg-black/5"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[var(--color-ink-soft)]">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className={`h-7 w-7 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-[var(--color-ink)]" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </div>

          <label className="block text-[13px] font-medium text-[var(--color-ink-soft)]">
            Aplica a
            <select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value as "expense" | "income" | "")} className="mt-1.5 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5 text-[14px] outline-none ring-[var(--color-accent)] focus:ring-2">
              <option value="">Gasto e ingreso</option>
              <option value="expense">Solo gastos</option>
              <option value="income">Solo ingresos</option>
            </select>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-[var(--radius-control)] border border-black/10 bg-white/60 py-2.5 text-[14px] font-medium transition hover:bg-white/90">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-mac flex-1 py-2.5 text-[14px] font-medium disabled:opacity-70">
              {saving ? "Guardando…" : cat ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
