import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platica — control financiero por Telegram",
  description:
    "Registra gastos, ingresos e inversiones conversando con un bot de Telegram. Dashboard en tiempo real.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="app-wallpaper min-h-screen antialiased">{children}</body>
    </html>
  );
}
