import type { Metadata } from "next";
import "./globals.css";
import { LiquidBackground } from "@/components/LiquidBackground";

export const metadata: Metadata = {
  metadataBase: new URL("https://platicapp-web.vercel.app"),
  title: "PlaticApp! — tu dinero, tan fácil como un mensaje",
  description:
    "Registra gastos, ingresos e inversiones hablándole a un bot de Telegram (texto, audio o foto) y míralo todo en un dashboard en tiempo real.",
  applicationName: "PlaticApp",
  openGraph: {
    type: "website",
    siteName: "PlaticApp",
    title: "PlaticApp! — tu control financiero por Telegram",
    description:
      "Registra tu plata hablando con un bot de Telegram y míralo en tiempo real: patrimonio, gráficos, presupuestos y más.",
    url: "https://platicapp-web.vercel.app",
    locale: "es_CO",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaticApp! — tu control financiero por Telegram",
    description: "Registra tu plata hablando con un bot de Telegram y míralo en tiempo real.",
  },
};

// Aplica el tema guardado antes de pintar (evita parpadeo claro→oscuro).
const themeScript = `(function(){try{var t=localStorage.getItem('platica-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="app-wallpaper min-h-screen antialiased">
        <LiquidBackground />
        {children}
      </body>
    </html>
  );
}
