/**
 * Set de íconos de línea (outline, monocromáticos) para navegación y acciones.
 * Un solo estilo consistente — reemplaza los emojis del chrome de la app.
 */
export function NavIcon({ name, size = 20 }: { name: string; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "home":
      return (<svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
    case "movimientos":
      return (<svg {...p}><path d="M7 7h13" /><path d="m16 3 4 4-4 4" /><path d="M17 17H4" /><path d="m8 21-4-4 4-4" /></svg>);
    case "novedades":
      return (<svg {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>);
    case "cuentas":
      return (<svg {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M16 14h2" /></svg>);
    case "deudas":
      return (<svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 6" /><path d="M18.5 20a5.5 5.5 0 0 0-3.5-5.1" /></svg>);
    case "ahorros":
      return (<svg {...p}><path d="M19 10c0-3.3-3.1-6-7-6s-7 2.7-7 6c0 1.7.8 3.2 2 4.3V18h3v-2h4v2h3v-3.7c1.2-1.1 2-2.6 2-4.3z" /><path d="M16 9h.01" /><path d="M5 11H3.5" /></svg>);
    case "inversiones":
      return (<svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M16 7h5v5" /></svg>);
    case "presupuestos":
      return (<svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.6" /></svg>);
    case "recurrentes":
      return (<svg {...p}><path d="M17 2.5 21 6l-4 3.5" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 21.5 3 18l4-3.5" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>);
    case "recibos":
      return (<svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6" /><path d="M9 11h6" /></svg>);
    case "categorias":
      return (<svg {...p}><path d="M3 7a2 2 0 0 1 2-2h6l9 9-7 7-9-9V7z" /><circle cx="8" cy="10" r="1.4" /></svg>);
    case "perfil":
      return (<svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>);
    case "admin":
      return (<svg {...p}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9.5 12l1.8 1.8L15 10" /></svg>);
    case "salir":
      return (<svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h12" /></svg>);
    case "telegram":
      return (<svg {...p}><path d="M21.5 4.5 2.5 12l5.5 1.5L10 20l3-4 5 3 3-14.5z" /><path d="m8 13.5 8-6" /></svg>);
    case "back":
      return (<svg {...p}><path d="M15 18l-6-6 6-6" /></svg>);
    case "add":
      return (<svg {...p}><path d="M12 5v14M5 12h14" /></svg>);
    case "menu":
      return (<svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
    default:
      return null;
  }
}
