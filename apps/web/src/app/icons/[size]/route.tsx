import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/**
 * Ícono de la PWA (el que se ancla en la pantalla de inicio): el mismo 💸 sobre el
 * gradiente de la marca que usamos en favicon/apple-icon, no el PNG plano de antes.
 * Se sirve en 192 y 512. El gradiente llena el cuadro → sirve también como «maskable».
 */
export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const s = size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(s * 0.6),
          background: "linear-gradient(135deg, #0a84ff, #bf5af2)",
        }}
      >
        💸
      </div>
    ),
    { width: s, height: s, emoji: "twemoji" },
  );
}
