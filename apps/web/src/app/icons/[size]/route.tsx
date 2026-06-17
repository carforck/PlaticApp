import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/**
 * Ícono de la PWA (el que se ancla en la pantalla de inicio): igual que el ícono de
 * logo.svg — 💸 en un cuadro redondeado con el gradiente de la marca. Se sirve en 192 y 512.
 *   - 192 / 512:    cuadro redondeado (tal cual logo.svg) → purpose "any".
 *   - 192m / 512m:  full-bleed sin redondeo → purpose "maskable" (el recorte del sistema no corta nada).
 */
export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }, { size: "192m" }, { size: "512m" }];
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const maskable = size.endsWith("m");
  const s = size.startsWith("512") ? 512 : 192;
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
            fontSize: Math.round(s * (maskable ? 0.42 : 0.54)),
            borderRadius: maskable ? 0 : Math.round(s * 0.264),
            background: "linear-gradient(135deg, #0a84ff, #bf5af2)",
          }}
        >
          💸
        </div>
      </div>
    ),
    { width: s, height: s, emoji: "twemoji" },
  );
}
