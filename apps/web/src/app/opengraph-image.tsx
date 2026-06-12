import { ImageResponse } from "next/og";

export const alt = "PlaticApp — tu control financiero por Telegram";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen que se ve al compartir el enlace (WhatsApp, Telegram, redes). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #0b1020 0%, #131a33 55%, #1a1430 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Marca */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div
            style={{
              width: 168,
              height: 168,
              borderRadius: 42,
              background: "linear-gradient(135deg, #0a84ff, #bf5af2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 96,
            }}
          >
            💸
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 800,
              letterSpacing: -2,
              backgroundImage: "linear-gradient(90deg, #4aa3ff, #c98cff)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            PlaticApp!
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 48, fontSize: 44, lineHeight: 1.25, color: "#dbe2f0", maxWidth: 1000 }}>
          Tu control financiero por Telegram. Registra gastos hablando y míralo en tiempo real.
        </div>

        <div style={{ display: "flex", marginTop: 36, fontSize: 30, color: "#8b96b3" }}>
          Bot de Telegram  ·  Dashboard en vivo  ·  platicapp-web.vercel.app
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
