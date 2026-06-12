"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Pagina una lista en el cliente. Devuelve la página actual de items y los
 * controles. Si hay menos items que `pageSize`, no hace falta paginar.
 * Resetea a la página 1 cuando cambia el total (p. ej. al filtrar/buscar).
 */
export function usePagination<T>(items: T[], pageSize = 15) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);

  // Si el conjunto cambia de tamaño (filtro nuevo), volvemos al inicio.
  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    pageCount,
    pageItems,
    setPage,
    total: items.length,
    from: items.length === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, items.length),
    needed: items.length > pageSize,
  };
}

export function Paginator({
  page,
  pageCount,
  from,
  to,
  total,
  onPage,
  noun = "registros",
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onPage: (p: number) => void;
  noun?: string;
}) {
  if (pageCount <= 1) return null;

  // Ventana de páginas alrededor de la actual.
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, start + 4);
  for (let i = Math.max(1, end - 4); i <= end; i++) pages.push(i);
  const first = pages[0] ?? 1;
  const last = pages[pages.length - 1] ?? pageCount;

  const btn =
    "grid h-8 min-w-8 place-items-center rounded-[8px] px-2 text-[13px] font-medium transition disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-4 py-3">
      <span className="text-[12px] text-[var(--color-ink-soft)]">
        {from}–{to} de {total} {noun}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className={`${btn} hover:bg-black/[0.05]`} aria-label="Anterior">
          ‹
        </button>
        {first > 1 && (
          <>
            <button onClick={() => onPage(1)} className={`${btn} hover:bg-black/[0.05]`}>1</button>
            {first > 2 && <span className="px-1 text-[var(--color-ink-soft)]">…</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`${btn} ${p === page ? "bg-[var(--color-accent)] text-white" : "hover:bg-black/[0.05]"}`}
          >
            {p}
          </button>
        ))}
        {last < pageCount && (
          <>
            {last < pageCount - 1 && <span className="px-1 text-[var(--color-ink-soft)]">…</span>}
            <button onClick={() => onPage(pageCount)} className={`${btn} hover:bg-black/[0.05]`}>{pageCount}</button>
          </>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= pageCount} className={`${btn} hover:bg-black/[0.05]`} aria-label="Siguiente">
          ›
        </button>
      </div>
    </div>
  );
}
