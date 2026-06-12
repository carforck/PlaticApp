/* Logo de PlaticApp: billete con "$" sobre cuadro con gradiente azul→morado. */

export function BrandIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="PlaticApp"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pa-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a84ff" />
          <stop offset="1" stopColor="#bf5af2" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#pa-grad)" />
      <g transform="rotate(-8 256 256)">
        <rect x="80" y="178" width="352" height="156" rx="28" fill="#ffffff" />
        <circle cx="142" cy="256" r="14" fill="#0a84ff" opacity="0.25" />
        <circle cx="370" cy="256" r="14" fill="#bf5af2" opacity="0.3" />
        <text
          x="256"
          y="264"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
          fontWeight="800"
          fontSize="156"
          fill="url(#pa-grad)"
        >
          $
        </text>
      </g>
    </svg>
  );
}

/** Lockup completo: ícono + wordmark «PlaticApp!». */
export function BrandLockup({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <BrandIcon size={size} className="rounded-[28%]" />
      <span
        className="bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text font-bold tracking-tight text-transparent"
        style={{ fontSize: size * 0.66 }}
      >
        PlaticApp!
      </span>
    </span>
  );
}
