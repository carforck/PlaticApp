import Link from "next/link";

const ICON = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const POINTS = [
  {
    title: "Tus datos son tuyos",
    desc: "Puedes exportarlos o borrarlos cuando quieras. Nunca los vendemos ni los compartimos.",
    icon: (
      <svg {...ICON}>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  },
  {
    title: "Iniciar con Google es seguro",
    desc: "Solo recibimos tu nombre y correo para identificarte. No leemos tu correo ni accedemos a tu Gmail.",
    icon: (
      <svg {...ICON}>
        <path d="M4 6h16a1 1 0 0 1 1 1v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a1 1 0 0 1 1-1z" />
        <path d="M4 7l8 6 8-6" />
      </svg>
    ),
  },
  {
    title: "Aislado y protegido",
    desc: "Cada usuario solo ve lo suyo, con seguridad a nivel de base de datos. Conexión cifrada.",
    icon: (
      <svg {...ICON}>
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Cumplimos Habeas Data",
    desc: "Tratamos tus datos conforme a la Ley 1581 de 2012 de Colombia. Tú decides sobre ellos.",
    icon: (
      <svg {...ICON}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    ),
  },
];

/** Sección de confianza/privacidad: tranquiliza sobre datos, login de Google y Habeas Data. */
export function PrivacySection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="glass rounded-[var(--radius-card)] p-7 sm:p-9">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-[12px] font-medium text-[var(--color-accent)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Privacidad y protección de datos
          </span>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight">Tu privacidad es lo primero</h2>
          <p className="mx-auto mt-2 max-w-xl text-[14px] text-[var(--color-ink-soft)]">
            Tu información financiera es sensible y la tratamos como tal. Esto es lo que hacemos para cuidarla.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {POINTS.map((p) => (
            <div key={p.title} className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                {p.icon}
              </span>
              <div>
                <h3 className="text-[15px] font-semibold">{p.title}</h3>
                <p className="mt-1 text-[13px] leading-snug text-[var(--color-ink-soft)]">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 border-t border-black/5 pt-5 text-center">
          <Link
            href="/privacidad"
            className="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
          >
            Leer la Política de Privacidad y Tratamiento de Datos →
          </Link>
        </div>
      </div>
    </section>
  );
}
