import type { AccountRow } from "./queries";

/** Una tarjeta de crédito o línea de crédito es un pasivo (deuda), no un activo. */
export const isCreditAccount = (type: string) => type === "credit";

/**
 * Separa activos y deuda de tarjetas/crédito.
 *  - Activos: bancos, efectivo, billeteras, inversión (suman al patrimonio).
 *  - Deuda de crédito: saldo negativo de las cuentas de crédito (lo que debes).
 *  - Patrimonio neto = activos − deuda de crédito.
 * Así una tarjeta de crédito NO suma al patrimonio: lo resta, porque es deuda.
 */
export function accountFinance(accounts: AccountRow[]) {
  let assets = 0;
  let creditDebt = 0;
  let reserved = 0; // apartado en ahorros (no es gastable)
  for (const a of accounts) {
    if (isCreditAccount(a.type)) creditDebt += Math.max(0, -a.balance_minor);
    else assets += a.balance_minor;
    reserved += a.reserved_minor ?? 0;
  }
  const netWorth = assets - creditDebt; // patrimonio total (incluye ahorros)
  const available = netWorth - reserved; // saldo disponible: lo que puedes gastar hoy
  return { assets, creditDebt, reserved, netWorth, available };
}
