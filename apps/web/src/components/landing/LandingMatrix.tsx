const CHECK = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[#30d158]">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const FEATURES = [
  ["Registra por chat, voz o foto", "Háblale al bot por Telegram y la IA hace el resto."],
  ["Categorización automática", "La IA reconoce el comercio y asigna la categoría sola."],
  ["Varias cuentas con su logo", "Banco, efectivo, billetera y tarjetas — con el logo de cada banco."],
  ["Dashboard en tiempo real", "Patrimonio, saldo disponible y gráficos al instante."],
  ["Ahorros con metas", "Aparta plata en «sobres» con objetivos por cuenta."],
  ["Deudas y préstamos", "Lleva quién te debe y a quién le debes; la plata se mueve al pagar."],
  ["Pagos fijos con recordatorio", "Te avisa el día del cobro; tú eliges con qué cuenta pagar."],
  ["Presupuestos con alertas", "Límites por categoría y aviso al llegar al 80%."],
  ["Transferencias entre cuentas", "«Pasa 100 mil de Nequi a Bancolombia» y listo."],
  ["Exporta a Excel y JSON", "Llévate tus datos cuando quieras."],
  ["Recibos guardados", "Tus fotos de facturas, a la mano."],
  ["Privacidad y Habeas Data", "Tus datos son tuyos; no leemos tu correo."],
];

/** Matriz de funciones: comunica que PlaticApp es un sistema completo, no solo un registrador de gastos. */
export function LandingMatrix() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <h2 className="text-center text-[26px] font-semibold tracking-tight">Todo lo que necesitas para tu plata</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-[14px] text-[var(--color-ink-soft)]">
        No es solo un registrador de gastos: es tu sistema de finanzas completo.
      </p>
      <div className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {FEATURES.map(([title, desc]) => (
          <div key={title} className="flex items-start gap-2.5">
            {CHECK}
            <div>
              <p className="text-[14.5px] font-semibold">{title}</p>
              <p className="text-[13px] leading-snug text-[var(--color-ink-soft)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
