"use client";

import { usePathname } from "next/navigation";
import { SECTION_DESC } from "@/lib/sections";

/** Banner informativo: explica de forma sencilla para qué sirve la sección actual. */
export function SectionDescription() {
  const pathname = usePathname();
  const desc = SECTION_DESC[pathname];
  if (!desc) return null;
  return (
    <div className="mb-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-accent)]/15 bg-[var(--color-accent)]/[0.06] px-3.5 py-2.5 text-[12.5px] leading-snug text-[var(--color-ink-soft)]">
      <span className="mt-px shrink-0">ℹ️</span>
      <span>{desc}</span>
    </div>
  );
}
