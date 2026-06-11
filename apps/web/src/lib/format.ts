/** Formato de moneda. Por ahora COP sin decimales; se generaliza luego. */
export function fmtMoney(minor: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor);
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const monthLabel = (d: Date) => MESES[d.getMonth()]!;
