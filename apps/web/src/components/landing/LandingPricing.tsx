import Link from "next/link";

const INCLUDES = [
  "Movimientos ilimitados",
  "Bot de Telegram (texto, voz y foto)",
  "Dashboard en tiempo real",
  "Cuentas, ahorros, deudas y presupuestos",
  "Exporta tus datos cuando quieras",
];

/** Sección de precio: el mayor diferencial de PlaticApp es que es gratis. */
export function LandingPricing() {
  return (
    <section id="precio" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-10">
      <h2 className="text-center text-[26px] font-semibold tracking-tight">Un precio fácil de entender</h2>
      <p className="mx-auto mt-2 max-w-md text-center text-[14px] text-[var(--color-ink-soft)]">
        Sin letra pequeña. Empieza hoy sin pagar nada.
      </p>

      <div className="mx-auto mt-8 max-w-sm">
        <div className="glass relative overflow-hidden rounded-[var(--radius-card)] p-7 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#30d158]/12 px-3 py-1 text-[12px] font-semibold text-[#1d8a3a]">
            Plan actual
          </span>
          <p className="mt-4 text-[52px] font-extrabold leading-none tracking-tight">
            <span className="bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text text-transparent">Gratis</span>
          </p>
          <p className="mt-2 text-[13px] text-[var(--color-ink-soft)]">Sin tarjeta · Sin costos ocultos</p>

          <ul className="mt-6 space-y-2.5 text-left">
            {INCLUDES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14px]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[#30d158]">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          <Link href="/login" className="btn-mac mt-7 inline-block w-full py-2.5 text-[15px] font-medium">
            Empieza gratis
          </Link>
        </div>
        <p className="mt-3 text-center text-[12px] text-[var(--color-ink-soft)]">
          Más adelante habrá planes con funciones avanzadas, pero lo esencial siempre será gratis.
        </p>
      </div>
    </section>
  );
}
