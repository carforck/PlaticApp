"use client";

import { useRef, useState } from "react";

/**
 * Contenedor de modal responsivo:
 *  - Móvil: hoja inferior (bottom sheet) que sube desde abajo y se cierra deslizando hacia abajo.
 *  - Desktop: tarjeta centrada.
 * El contenido (formulario, etc.) se pasa como children.
 */
export function Sheet({
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0]?.clientY ?? null;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
    setDragY(Math.max(0, dy)); // solo hacia abajo
  }
  function onTouchEnd() {
    if (dragY > 110) onClose();
    setDragY(0);
    startY.current = null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="animate-fade-in absolute inset-0 bg-black/35 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        className={`glass animate-slide-up sm:animate-float-in relative max-h-[92vh] w-full overflow-y-auto rounded-t-[22px] sm:max-h-[88vh] sm:rounded-[var(--radius-card)] ${maxWidth} sm:w-full`}
      >
        {/* Agarradera + título (la zona de arrastre para cerrar en móvil) */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="sticky top-0 z-10 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2 border-b border-white/40 bg-white/40 px-4 py-3 backdrop-blur sm:bg-transparent">
            <span className="traffic-light bg-[#ff5f57]" />
            <span className="traffic-light bg-[#febc2e]" />
            <span className="traffic-light bg-[#28c840]" />
            {title && <span className="ml-3 text-[13px] font-medium text-[var(--color-ink-soft)]">{title}</span>}
            <span className="mx-auto h-1.5 w-10 rounded-full bg-black/15 sm:hidden" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
