"use client";

type Feature = { icon: string; title: string; desc: string };

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
            key={`${f.title}-${i}`}
            className="glass w-[260px] shrink-0 rounded-[var(--radius-card)] p-5 transition hover:-translate-y-1 hover:brightness-[1.02]"
          >
            <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--color-accent)]/10 text-[22px]">
              {f.icon}
            </div>
            <h3 className="mt-3 text-[16px] font-semibold">{f.title}</h3>
            <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink-soft)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
