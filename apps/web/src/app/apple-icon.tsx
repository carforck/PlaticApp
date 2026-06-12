import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícono para la pantalla de inicio en iOS (homescreen). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a84ff, #bf5af2)",
        }}
      >
        <div
          style={{
            width: 124,
            height: 78,
            borderRadius: 16,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-8deg)",
          }}
        >
          <div style={{ fontSize: 66, fontWeight: 800, color: "#0a84ff" }}>$</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
