"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Ann {
  id: string;
  title: string;
  body: string;
  emoji: string;
  tag: string;
  created_at: string;
}

const TAG: Record<string, string> = {
  nuevo: "bg-[#0a84ff]/12 text-[#0a84ff]",
  mejora: "bg-[#30d158]/12 text-[#1d8a3a]",
  arreglo: "bg-[#ff9f0a]/15 text-[#b86e00]",
};

export function LandingNews() {
  const [items, setItems] = useState<Ann[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await createClient()
        .from("announcements")
        .select("id, title, body, emoji, tag, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setItems(data as Ann[]);
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <h2 className="text-center text-[26px] font-semibold tracking-tight">Lo último en PlaticApp</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-[14px] text-[var(--color-ink-soft)]">
        Mejoramos constantemente. Esto es lo que acabamos de lanzar.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <div key={a.id} className="glass rounded-[var(--radius-card)] p-5 transition hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-black/[0.05] text-[20px]">{a.emoji}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TAG[a.tag] ?? TAG.nuevo}`}>
                {a.tag === "mejora" ? "Mejora" : a.tag === "arreglo" ? "Arreglo" : "Nuevo"}
              </span>
            </div>
            <h3 className="mt-3 text-[15px] font-semibold">{a.title}</h3>
            <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink-soft)]">{a.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
