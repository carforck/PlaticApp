/**
 * Detecta el banco/billetera por el nombre de la cuenta para mostrar su logo oficial.
 * El logo se trae de un servicio de logos por dominio; si no carga, se usa color + inicial.
 */
export type BankBrand = { domain: string; bg: string; fg: string; label: string };

const BRANDS: { match: RegExp; brand: BankBrand }[] = [
  { match: /nequi/i, brand: { domain: "nequi.com.co", bg: "#200020", fg: "#fff", label: "N" } },
  { match: /bancolombia/i, brand: { domain: "bancolombia.com", bg: "#FDDA24", fg: "#1a1a1a", label: "B" } },
  { match: /daviplata/i, brand: { domain: "daviplata.com", bg: "#ED1C24", fg: "#fff", label: "D" } },
  { match: /davivienda/i, brand: { domain: "davivienda.com", bg: "#ED1C24", fg: "#fff", label: "D" } },
  { match: /\bnu\b|nubank|nu\s*bank/i, brand: { domain: "nu.com", bg: "#820AD1", fg: "#fff", label: "N" } },
  { match: /lulo/i, brand: { domain: "lulobank.com", bg: "#00E0B5", fg: "#0a1a1a", label: "L" } },
  { match: /bbva/i, brand: { domain: "bbva.com.co", bg: "#072146", fg: "#fff", label: "B" } },
  { match: /bogot[aá]/i, brand: { domain: "bancodebogota.com", bg: "#E40046", fg: "#fff", label: "B" } },
  { match: /occidente/i, brand: { domain: "bancodeoccidente.com.co", bg: "#E2231A", fg: "#fff", label: "O" } },
  { match: /av\.?\s*villas/i, brand: { domain: "avvillas.com.co", bg: "#E2001A", fg: "#fff", label: "A" } },
  { match: /scotiabank|colpatria/i, brand: { domain: "scotiabankcolpatria.com", bg: "#E2231A", fg: "#fff", label: "S" } },
  { match: /banco\s*popular/i, brand: { domain: "bancopopular.com.co", bg: "#E40521", fg: "#fff", label: "P" } },
  { match: /falabella/i, brand: { domain: "bancofalabella.com.co", bg: "#009A44", fg: "#fff", label: "F" } },
  { match: /rappi/i, brand: { domain: "rappi.com.co", bg: "#FF441F", fg: "#fff", label: "R" } },
  { match: /movii/i, brand: { domain: "movii.com.co", bg: "#00C2A8", fg: "#fff", label: "M" } },
  { match: /pibank/i, brand: { domain: "pibank.com.co", bg: "#0050FF", fg: "#fff", label: "P" } },
  { match: /banco\s*caja\s*social|bcs/i, brand: { domain: "bancocajasocial.com", bg: "#0033A0", fg: "#fff", label: "C" } },
  { match: /itau|itaú/i, brand: { domain: "itau.co", bg: "#EC7000", fg: "#fff", label: "I" } },
  { match: /agrario/i, brand: { domain: "bancoagrario.gov.co", bg: "#00843D", fg: "#fff", label: "A" } },
  { match: /banco\s*de\s*la\s*rep[uú]blica|banrep/i, brand: { domain: "banrep.gov.co", bg: "#003366", fg: "#fff", label: "R" } },
  { match: /paypal/i, brand: { domain: "paypal.com", bg: "#003087", fg: "#fff", label: "P" } },
];

export function bankBrand(name: string): BankBrand | null {
  const n = (name || "").trim();
  for (const b of BRANDS) if (b.match.test(n)) return b.brand;
  return null;
}

/** URL del logo oficial por dominio (servicio de logos de Clearbit). */
export const logoUrl = (domain: string) => `https://logo.clearbit.com/${domain}`;
