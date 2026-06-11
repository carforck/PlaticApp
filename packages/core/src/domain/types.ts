/** Tipos de movimiento que el usuario puede registrar. */
export const TRANSACTION_KINDS = [
  "expense", // gasto
  "income", // ingreso
  "investment", // inversión (aporte)
  "transfer", // movimiento entre cuentas propias
] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

/** Tipos de cuenta / dónde vive el dinero. */
export const ACCOUNT_TYPES = [
  "bank", // cuenta bancaria
  "cash", // efectivo
  "investment", // cuenta de inversión / broker
  "wallet", // billetera digital (Nequi, Daviplata...)
  "credit", // tarjeta de crédito
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Origen del registro: por dónde entró el dato. */
export const SOURCE_CHANNELS = ["telegram_text", "telegram_audio", "telegram_image", "web"] as const;
export type SourceChannel = (typeof SOURCE_CHANNELS)[number];
