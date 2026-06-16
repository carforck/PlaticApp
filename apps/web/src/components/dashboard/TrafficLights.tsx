"use client";

/**
 * Semáforo estilo macOS para las cabeceras de los modales.
 * El rojo CIERRA de verdad (muestra una ✕ al pasar el cursor), que es lo que la
 * gente espera al ver estos puntos. Amarillo/verde son decorativos (un modal web
 * no se minimiza ni se maximiza), pero el rojo deja claro cómo salir.
 */
export function TrafficLights({ onClose }: { onClose: () => void }) {
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
      <span className="traffic-light bg-[#28c840]" />
    </span>
  );
}
