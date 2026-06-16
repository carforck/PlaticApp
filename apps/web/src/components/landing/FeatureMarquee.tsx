"use client";

type Feature = { id: string; title: string; desc: string };

/** Íconos de línea (sobrios, sin emoji) para cada función. */
function FeatureIcon({ id }: { id: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "talk":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.9-.9L3 21l1.9-5.1A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        </svg>
      );
    case "voice":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <line x1="12" y1="18" x2="12" y2="22" />
        </svg>
      );
    case "photo":
      return (
        <svg {...common}>
          <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...common}>
          <line x1="3" y1="21" x2="21" y2="21" />
          <rect x="5" y="11" width="3.5" height="7" rx="1" />
          <rect x="10.25" y="6" width="3.5" height="12" rx="1" />
          <rect x="15.5" y="14" width="3.5" height="4" rx="1" />
        </svg>
      );
    case "debts":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.5a3 3 0 0 1 0 6" />
          <path d="M18.5 20a5.5 5.5 0 0 0-3.5-5.1" />
        </svg>
      );
    case "budget":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="0.6" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Carrusel horizontal de funciones en movimiento continuo (marquee).
 * Se pausa al pasar el cursor; degradados en los bordes para que «entre y salga» suave.
 */
export function FeatureMarquee({ features }: { features: Feature[] }) {
  // Duplicamos la lista para que el bucle sea perfecto (translateX -50%).
  const loop = [...features, ...features];
  return (
    <div className="group relative overflow-hidden">
      {/* Degradados en los bordes */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--color-canvas)] to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--color-canvas)] to-transparent sm:w-24" />

      <div className="flex w-max animate-marquee gap-4 py-2 group-hover:[animation-play-state:paused]">
        {loop.map((f, i) => (
          <div
            key={`${f.id}-${i}`}
            className="glass w-[260px] shrink-0 rounded-[var(--radius-card)] p-5 transition hover:-translate-y-1 hover:brightness-[1.02]"
          >
            <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <FeatureIcon id={f.id} />
            </div>
            <h3 className="mt-3 text-[16px] font-semibold">{f.title}</h3>
            <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink-soft)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
