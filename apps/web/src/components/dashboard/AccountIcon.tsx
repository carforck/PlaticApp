"use client";

import { useState } from "react";
import { bankBrand, logoUrl } from "@/lib/bank-brands";
import { ACCOUNT_EMOJI } from "@/lib/labels";

/**
 * Ícono de una cuenta: si el nombre coincide con un banco/billetera conocido, muestra su
 * logo oficial; si el logo no carga, usa el color de la marca + inicial; si no es un banco
 * conocido, usa el emoji del tipo de cuenta (banco/efectivo/billetera…).
 */
export function AccountIcon({ name, type, size = 40 }: { name: string; type: string; size?: number }) {
  const brand = bankBrand(name);
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.28);

  if (brand && !failed) {
    return (
      <img
        // eslint-disable-next-line @next/next/no-img-element
        src={logoUrl(brand.domain)}
        alt={name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "contain", background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
      />
    );
  }

  if (brand) {
    return (
      <span
        style={{ width: size, height: size, borderRadius: radius, background: brand.bg, color: brand.fg, fontSize: size * 0.45 }}
        className="grid place-items-center font-bold leading-none"
      >
        {brand.label}
      </span>
    );
  }

  return (
    <span style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.42 }} className="grid place-items-center bg-black/[0.05]">
      {ACCOUNT_EMOJI[type] ?? "💼"}
    </span>
  );
}
