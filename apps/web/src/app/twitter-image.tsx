import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PlaticApp! — tu control financiero por Telegram";

/** Miniatura para Twitter/X: el mismo logo de la marca (ícono + wordmark de logo.svg). */
export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          background: "radial-gradient(circle at 30% 20%, #16203a 0%, #0b1020 60%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <div
            style={{
              width: 168,
              height: 168,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 96,
              borderRadius: 44,
              background: "linear-gradient(135deg, #0a84ff, #bf5af2)",
            }}
          >
            💸
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 132,
              fontWeight: 800,
              backgroundImage: "linear-gradient(90deg, #0a84ff, #bf5af2)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            PlaticApp!
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 38, color: "#c7d0e0" }}>
          Tu dinero, tan fácil como un mensaje.
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#7c879b", marginTop: 10 }}>
          Desarrollado por Carlos Carranza
        </div>
      </div>
    ),
    { ...size, emoji: "fluent" },
  );
}
