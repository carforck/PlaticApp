import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlaticApp",
    short_name: "PlaticApp",
    description: "Tu control financiero por Telegram, en tiempo real.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#0a84ff",
    lang: "es",
    // Ícono igual al de logo.svg (cuadro redondeado + 💸). El ?v fuerza a quienes ya
    // anclaron la app a re-descargar el ícono nuevo. «m» = variante maskable (full-bleed).
    icons: [
      { src: "/icons/192?v=5", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512?v=5", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/192m?v=5", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512m?v=5", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
