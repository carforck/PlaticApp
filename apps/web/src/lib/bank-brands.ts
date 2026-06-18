/**
 * Directorio de entidades financieras de Colombia (estilo PSE) para:
 *  - sugerir al crear una cuenta (autocompletado),
 *  - y mostrar el logo oficial según la entidad elegida (por su dominio).
 * Si la entidad no está, el usuario igual puede escribir un nombre libre.
 */
export type BankBrand = { domain: string; bg: string; fg: string; label: string };

type Entity = BankBrand & {
  name: string; // nombre canónico que se muestra y guarda
  match: RegExp; // para detectar la entidad desde texto libre
  type: "bank" | "wallet" | "credit"; // tipo sugerido al elegirla
};

const ENTITIES: Entity[] = [
  { name: "Nequi", match: /nequi/i, domain: "nequi.com.co", bg: "#200020", fg: "#fff", label: "N", type: "wallet" },
  { name: "Bancolombia", match: /bancolombia/i, domain: "bancolombia.com", bg: "#FDDA24", fg: "#1a1a1a", label: "B", type: "bank" },
  { name: "DaviPlata", match: /daviplata/i, domain: "daviplata.com", bg: "#ED1C24", fg: "#fff", label: "D", type: "wallet" },
  { name: "Davivienda", match: /davivienda/i, domain: "davivienda.com", bg: "#ED1C24", fg: "#fff", label: "D", type: "bank" },
  { name: "Nu", match: /\bnu\b|nubank|nu\s*bank/i, domain: "nu.com", bg: "#820AD1", fg: "#fff", label: "N", type: "wallet" },
  { name: "Lulo Bank", match: /lulo/i, domain: "lulobank.com", bg: "#00E0B5", fg: "#0a1a1a", label: "L", type: "bank" },
  { name: "RappiPay", match: /rappi/i, domain: "rappipay.com.co", bg: "#FF441F", fg: "#fff", label: "R", type: "wallet" },
  { name: "dale!", match: /\bdale\b/i, domain: "dale.com.co", bg: "#00B2A9", fg: "#fff", label: "D", type: "wallet" },
  { name: "Movii", match: /movii/i, domain: "movii.com.co", bg: "#00C2A8", fg: "#fff", label: "M", type: "wallet" },
  { name: "BBVA", match: /bbva/i, domain: "bbva.com.co", bg: "#072146", fg: "#fff", label: "B", type: "bank" },
  { name: "Banco de Bogotá", match: /bogot[aá]/i, domain: "bancodebogota.com", bg: "#E40046", fg: "#fff", label: "B", type: "bank" },
  { name: "Banco de Occidente", match: /occidente/i, domain: "bancodeoccidente.com.co", bg: "#E2231A", fg: "#fff", label: "O", type: "bank" },
  { name: "Banco AV Villas", match: /av\.?\s*villas/i, domain: "avvillas.com.co", bg: "#E2001A", fg: "#fff", label: "A", type: "bank" },
  { name: "Scotiabank Colpatria", match: /scotiabank|colpatria/i, domain: "scotiabankcolpatria.com", bg: "#E2231A", fg: "#fff", label: "S", type: "bank" },
  { name: "Banco Popular", match: /banco\s*popular/i, domain: "bancopopular.com.co", bg: "#E40521", fg: "#fff", label: "P", type: "bank" },
  { name: "Banco Caja Social", match: /caja\s*social/i, domain: "bancocajasocial.com", bg: "#0033A0", fg: "#fff", label: "C", type: "bank" },
  { name: "Banco Itaú", match: /ita[uú]/i, domain: "itau.co", bg: "#EC7000", fg: "#fff", label: "I", type: "bank" },
  { name: "Banco Falabella", match: /falabella/i, domain: "bancofalabella.com.co", bg: "#009A44", fg: "#fff", label: "F", type: "bank" },
  { name: "Banco Agrario", match: /agrario/i, domain: "bancoagrario.gov.co", bg: "#00843D", fg: "#fff", label: "A", type: "bank" },
  { name: "Bancoomeva", match: /bancoomeva|coomeva/i, domain: "bancoomeva.com.co", bg: "#E2001A", fg: "#fff", label: "B", type: "bank" },
  { name: "Confiar", match: /confiar/i, domain: "confiar.coop", bg: "#E2001A", fg: "#fff", label: "C", type: "bank" },
  { name: "Coopcentral", match: /coopcentral/i, domain: "coopcentral.com.co", bg: "#0050A0", fg: "#fff", label: "C", type: "bank" },
  { name: "Banco W", match: /banco\s*w\b/i, domain: "bancow.com.co", bg: "#E2001A", fg: "#fff", label: "W", type: "bank" },
  { name: "Banco Pichincha", match: /pichincha/i, domain: "bancopichincha.com.co", bg: "#FFD200", fg: "#1a1a1a", label: "P", type: "bank" },
  { name: "Banco GNB Sudameris", match: /gnb|sudameris/i, domain: "gnbsudameris.com.co", bg: "#0033A0", fg: "#fff", label: "G", type: "bank" },
  { name: "Banco Caja Social", match: /bcsc/i, domain: "bancocajasocial.com", bg: "#0033A0", fg: "#fff", label: "C", type: "bank" },
  { name: "Efectivo", match: /efectivo|cash|billetera/i, domain: "", bg: "#8E8E93", fg: "#fff", label: "💵", type: "bank" },
];

export function bankBrand(name: string): BankBrand | null {
  const n = (name || "").trim();
  if (!n) return null;
  for (const e of ENTITIES) {
    if (!e.domain) continue; // «Efectivo» no tiene logo de banco
    if (e.match.test(n)) return { domain: e.domain, bg: e.bg, fg: e.fg, label: e.label };
  }
  return null;
}

/** Tipo de cuenta sugerido para una entidad (al elegirla del directorio). */
export function entityType(name: string): "bank" | "wallet" | "credit" | null {
  const n = (name || "").trim();
  for (const e of ENTITIES) if (e.match.test(n)) return e.type;
  return null;
}

/** Nombres del directorio para el autocompletado (sin «Efectivo», que es genérico). */
export const ENTITY_NAMES: string[] = ENTITIES.filter((e) => e.domain).map((e) => e.name);
