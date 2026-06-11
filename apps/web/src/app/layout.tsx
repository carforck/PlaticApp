import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platica — control financiero por Telegram",
  description:
    "Registra gastos, ingresos e inversiones conversando con un bot de Telegram. Dashboard en tiempo real.",
};

// Aplica el tema guardado antes de pintar (evita parpadeo claro→oscuro).
const themeScript = `(function(){try{var t=localStorage.getItem('platica-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="app-wallpaper min-h-screen antialiased">{children}</body>
    </html>
  );
}
