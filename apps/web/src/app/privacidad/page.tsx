import Link from "next/link";

export const metadata = {
  title: "Política de Privacidad y Tratamiento de Datos — PlaticApp",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/" className="text-[13px] text-[var(--color-accent)] hover:underline">
        ← Volver
      </Link>

      <div className="glass mt-4 rounded-[var(--radius-card)] p-6 sm:p-9">
        <h1 className="text-[26px] font-semibold tracking-tight">Política de Privacidad y Tratamiento de Datos</h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
          PlaticApp · Conforme a la Ley 1581 de 2012 (Habeas Data) y el Decreto 1377 de 2013 — Colombia.
        </p>

        <div className="mt-6 space-y-6 text-[14px] leading-relaxed text-[var(--color-ink)]">
          <Section title="1. Responsable del tratamiento">
            <p>
              Carlos Carranza (PlaticApp), Cartagena, Colombia. Contacto:{" "}
              <a className="text-[var(--color-accent)] hover:underline" href="mailto:carforck@gmail.com">carforck@gmail.com</a>{" "}
              · <a className="text-[var(--color-accent)] hover:underline" href="https://vanttagetech.com" target="_blank" rel="noreferrer">vanttagetech.com</a>.
            </p>
          </Section>

          <Section title="2. Datos que recolectamos">
            <ul className="list-disc space-y-1 pl-5 text-[var(--color-ink-soft)]">
              <li><b className="text-[var(--color-ink)]">Identificación:</b> nombre, correo y foto de perfil (si entras con Google).</li>
              <li><b className="text-[var(--color-ink)]">Financieros que tú registras:</b> movimientos, cuentas, deudas, presupuestos, pagos fijos.</li>
              <li><b className="text-[var(--color-ink)]">Telegram:</b> el identificador de tu chat, solo para vincular el bot a tu cuenta.</li>
              <li><b className="text-[var(--color-ink)]">Contenido que envías al bot:</b> textos, audios e imágenes de recibos.</li>
            </ul>
          </Section>

          <Section title="3. Finalidad">
            <p className="text-[var(--color-ink-soft)]">
              Usamos tus datos únicamente para prestarte el servicio: registrar e interpretar tus finanzas, mostrarte
              tu dashboard, enviarte recordatorios y resúmenes, y mantener tu sesión segura. No vendemos tus datos.
            </p>
          </Section>

          <Section title="4. Tus derechos como titular">
            <p className="text-[var(--color-ink-soft)]">
              Puedes <b className="text-[var(--color-ink)]">conocer, actualizar, rectificar y suprimir</b> tus datos, y{" "}
              <b className="text-[var(--color-ink)]">revocar la autorización</b> en cualquier momento. Para ejercerlos,
              escríbenos a <a className="text-[var(--color-accent)] hover:underline" href="mailto:carforck@gmail.com">carforck@gmail.com</a>.
              También puedes eliminar tu cuenta y con ella todos tus datos.
            </p>
          </Section>

          <Section title="5. Seguridad y encargados">
            <p className="text-[var(--color-ink-soft)]">
              Tus datos se almacenan con aislamiento por usuario (Row Level Security) en infraestructura de{" "}
              <b className="text-[var(--color-ink)]">Supabase</b> y se sirven desde <b className="text-[var(--color-ink)]">Vercel</b>.
              Para autenticación usamos Google; para interpretar tus mensajes, modelos de IA de Google (Gemini) y Groq;
              y Telegram para el bot. Estos proveedores actúan como encargados del tratamiento.
            </p>
          </Section>

          <Section title="6. Conservación">
            <p className="text-[var(--color-ink-soft)]">
              Conservamos tus datos mientras tu cuenta esté activa. Si la eliminas o revocas la autorización, los
              borramos salvo obligación legal de conservarlos.
            </p>
          </Section>

          <Section title="7. Autorización">
            <p className="text-[var(--color-ink-soft)]">
              Al crear tu cuenta y usar PlaticApp, autorizas de manera libre, previa, expresa e informada el tratamiento
              de tus datos personales conforme a esta política.
            </p>
          </Section>

          <p className="text-[12px] text-[var(--color-ink-soft)]">
            Última actualización: {new Date().getFullYear()}. Este documento es una base; te recomendamos revisarlo con
            un asesor legal antes de operar comercialmente.
          </p>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[16px] font-semibold">{title}</h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}
