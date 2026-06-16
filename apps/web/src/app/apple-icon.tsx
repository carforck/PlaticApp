import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícono de inicio en iOS: igual que el ícono de logo.svg — 💸 en cuadro redondeado con el gradiente. */
export default function AppleIcon() {
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
            fontSize: 97,
            borderRadius: 48,
            background: "linear-gradient(135deg, #0a84ff, #bf5af2)",
          }}
        >
          💸
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
