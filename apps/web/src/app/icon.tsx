import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: igual que el ícono de logo.svg — 💸 en un cuadro redondeado con el gradiente de la marca. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 35,
            borderRadius: 17,
            background: "linear-gradient(135deg, #0a84ff, #bf5af2)",
          }}
        >
          💸
        </div>
      </div>
    ),
    { ...size, emoji: "fluent" },
  );
}
