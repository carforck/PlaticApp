import type { Metadata } from "next";
import "./globals.css";
import { LiquidBackground } from "@/components/LiquidBackground";
import { RegisterSW } from "@/components/RegisterSW";

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
    // Imagen estática (.png, URL limpia): WhatsApp y otros la digieren mejor que la ruta dinámica.
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PlaticApp! — tu control financiero por Telegram" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaticApp! — tu control financiero por Telegram",
    description: "Registra tu plata hablando con un bot de Telegram y míralo en tiempo real.",
    images: ["/og.png"],
  },
};

// Tema oscuro por defecto; solo claro si el usuario lo eligió con el interruptor.
// Se aplica antes de pintar para evitar parpadeo.
const themeScript = `(function(){try{var t=localStorage.getItem('platica-theme');if(t!=='light'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="app-wallpaper min-h-screen antialiased">
        <LiquidBackground />
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
