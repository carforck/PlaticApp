"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("platica-theme", next ? "dark" : "light");
    } catch {
      /* noop */
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[13px] text-[var(--color-ink-soft)] transition hover:bg-black/5"
      aria-label="Cambiar tema"
    >
      <span>{dark ? "🌙 Modo oscuro" : "☀️ Modo claro"}</span>
      <span className="relative h-5 w-9 rounded-full bg-black/10 transition">
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${dark ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
