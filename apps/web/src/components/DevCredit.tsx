/* eslint-disable @next/next/no-img-element */
/* Créditos de desarrollo · Carlos Carranza */

const DEV = {
  name: "Carlos Carranza",
  role: "Desarrollador de Software · Cartagena, CO",
  bio: "Desarrollador de software apasionado por crear productos digitales útiles. Combino desarrollo web, apps e inteligencia artificial para resolver problemas reales del día a día. Detrás de Vanttage Tech y creador de PlaticApp.",
  photo: "/carlos-carranza.webp",
  website: "https://vanttagetech.com",
  github: "https://github.com/carforck",
  linkedin: "https://www.linkedin.com/in/carloscarranzavillera/",
  email: "carforck@gmail.com",
  whatsapp: "https://wa.me/573105080356",
};

function DevLinks() {
  return (
    <div className="flex items-center gap-3.5">
      <a href={DEV.website} target="_blank" rel="noreferrer" className="transition hover:text-[var(--color-accent)]" title="vanttagetech.com">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
        </svg>
      </a>
      <a href={DEV.github} target="_blank" rel="noreferrer" className="transition hover:text-[var(--color-ink)]" title="GitHub">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.57.1.78-.25.78-.55v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
        </svg>
      </a>
      <a href={DEV.linkedin} target="_blank" rel="noreferrer" className="transition hover:text-[var(--color-ink)]" title="LinkedIn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
        </svg>
      </a>
      <a href={DEV.whatsapp} target="_blank" rel="noreferrer" className="transition hover:text-[#25d366]" title="WhatsApp · +57 310 5080356">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.82c2.16 0 4.19.84 5.72 2.37a8.06 8.06 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.06 8.06 0 0 1-1.24-4.32c0-4.46 3.63-8.09 8.1-8.09Zm-3.6 4.13c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.43 1.03 2.6.13.17 1.77 2.7 4.3 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.38-1.73-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.55-1.36-.77-1.86-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01Z" />
        </svg>
      </a>
      <a href={`mailto:${DEV.email}`} className="transition hover:text-[var(--color-ink)]" title="Correo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m2 6 10 7 10-7" />
        </svg>
      </a>
    </div>
  );
}

export function DevCredit({ className = "", withPhoto = false }: { className?: string; withPhoto?: boolean }) {
  // Variante destacada (con foto + bio) — pensada para la landing.
  if (withPhoto) {
    return (
      <div className={`glass mx-auto flex max-w-xl flex-col items-center gap-4 rounded-[var(--radius-card)] p-6 text-center sm:flex-row sm:text-left ${className}`}>
        <img
          src={DEV.photo}
          alt={DEV.name}
          width={176}
          height={176}
          className="h-36 w-36 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-accent)]/30 sm:h-44 sm:w-44"
        />
        <div className="flex flex-col items-center gap-1.5 sm:items-start">
          <div>
            <p className="text-[17px] font-semibold tracking-tight text-[var(--color-ink)]">{DEV.name}</p>
            <p className="text-[12px] text-[var(--color-ink-soft)]">{DEV.role}</p>
          </div>
          <p className="text-[13px] leading-snug text-[var(--color-ink-soft)]">{DEV.bio}</p>
          <div className="mt-1.5 text-[var(--color-ink-soft)]">
            <DevLinks />
          </div>
        </div>
      </div>
    );
  }

  // Variante compacta (login, perfil, footer).
  return (
    <div className={`flex flex-col items-center gap-1 text-[12px] text-[var(--color-ink-soft)] ${className}`}>
      <span>
        Desarrollado por{" "}
        <a href={DEV.website} target="_blank" rel="noreferrer" className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
          {DEV.name}
        </a>
      </span>
      <span className="text-[11px]">{DEV.role}</span>
      <div className="mt-1">
        <DevLinks />
      </div>
    </div>
  );
}
