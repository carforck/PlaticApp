"use client";

import { useMemo, useRef, useState } from "react";
import { ENTITY_NAMES } from "@/lib/bank-brands";
import { AccountIcon } from "./AccountIcon";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Campo con autocompletado del directorio de entidades financieras.
 * Escribes y salen sugerencias; eliges una (y avisa con onPick para fijar tipo/logo),
 * o escribes una que no esté y se agrega igual (texto libre).
 */
export function EntityCombobox({
  value,
  onChange,
  onPick,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick?: (name: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = norm(value.trim());
    const list = q ? ENTITY_NAMES.filter((n) => norm(n).includes(q)) : ENTITY_NAMES;
    return list.slice(0, 8);
  }, [value]);

  const exact = ENTITY_NAMES.some((n) => norm(n) === norm(value.trim()));

  function pick(name: string) {
    onChange(name);
    onPick?.(name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Pequeño delay para que el click en una sugerencia alcance a registrarse.
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
          style={{ paddingRight: value.trim() ? 44 : undefined }}
        />
        {value.trim() && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <AccountIcon name={value} type="bank" size={26} />
          </span>
        )}
      </div>

      {open && matches.length > 0 && (
        <ul
          className="glass absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-[12px] border border-black/10 p-1 shadow-lg"
          onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
        >
          {matches.map((n) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => pick(n)}
                className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[14px] transition hover:bg-black/[0.05]"
              >
                <AccountIcon name={n} type="bank" size={26} />
                {n}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.trim() && !exact && (
        <p className="mt-1 text-[11px] text-[var(--color-ink-soft)]">
          ¿No está en la lista? Déjalo escrito así y se agrega igual.
        </p>
      )}
    </div>
  );
}
