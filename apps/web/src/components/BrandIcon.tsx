/* Logo de PlaticApp: emoji del billete con alas 💸 sobre cuadro con gradiente azul→morado. */

export function BrandIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-label="PlaticApp"
      role="img"
      className={`inline-grid shrink-0 place-items-center bg-gradient-to-br from-[#0a84ff] to-[#bf5af2] ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        fontSize: Math.round(size * 0.52),
        lineHeight: 1,
      }}
    >
      💸
    </span>
  );
}

/** Lockup completo: ícono + wordmark «PlaticApp!». */
export function BrandLockup({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <BrandIcon size={size} />
      <span
        className="bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text font-bold tracking-tight text-transparent"
        style={{ fontSize: size * 0.66 }}
      >
        PlaticApp!
      </span>
    </span>
  );
}
