import { createAdminClient } from "./supabase-admin";

type Level = "info" | "warn" | "error";

/**
 * Registra un evento en la bitácora (auditoría del Admin). Nunca lanza:
 * si falla el log, no debe romper el flujo principal.
 */
export async function logEvent(opts: {
  source: "telegram" | "app" | "cron" | "auth";
  event: string;
  detail?: string;
  actor?: string | number | null;
  level?: Level;
}): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from("event_log").insert({
      source: opts.source,
      event: opts.event,
      detail: opts.detail ? String(opts.detail).slice(0, 500) : null,
      actor: opts.actor != null ? String(opts.actor).slice(0, 120) : null,
      level: opts.level ?? "info",
    });
  } catch {
    /* el logging nunca debe interrumpir */
  }
}
