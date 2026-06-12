import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: 💸 sobre cuadro con gradiente de la marca. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38,
          background: "linear-gradient(135deg, #0a84ff, #bf5af2)",
        }}
      >
        💸
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
