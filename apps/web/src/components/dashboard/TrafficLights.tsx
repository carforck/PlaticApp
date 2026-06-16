"use client";

/**
 * Semáforo estilo macOS para las cabeceras de los modales.
 *  - Rojo: CIERRA de verdad (muestra una ✕ al pasar el cursor).
 *  - Verde: expande/contrae el modal (cuando el contenedor lo soporta).
 *  - Amarillo: decorativo (un modal web no se minimiza).
 * Los glifos aparecen al pasar el cursor, como en macOS.
 */
export function TrafficLights({
  onClose,
  onToggleExpand,
  expanded,
}: {
  onClose: () => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
}) {
  return (
    <span className="group/tl flex items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        title="Cerrar"
        className="traffic-light grid place-items-center bg-[#ff5f57] text-[8px] font-bold leading-none text-black/55 transition hover:brightness-95"
      >
        <span className="opacity-0 transition group-hover/tl:opacity-100">✕</span>
      </button>
      <span className="traffic-light bg-[#febc2e]" />
      {onToggleExpand ? (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? "Contraer" : "Expandir"}
          title={expanded ? "Contraer" : "Expandir"}
          className="traffic-light grid place-items-center bg-[#28c840] text-[7px] font-bold leading-none text-black/55 transition hover:brightness-95"
        >
          <span className="opacity-0 transition group-hover/tl:opacity-100">{expanded ? "–" : "+"}</span>
        </button>
      ) : (
        <span className="traffic-light bg-[#28c840]" />
      )}
    </span>
  );
}
