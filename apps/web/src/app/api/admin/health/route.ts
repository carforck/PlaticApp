import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/supabase-admin";
import { ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Límites del plan gratis de Supabase (para los semáforos).
const DB_LIMIT = 500 * 1024 * 1024; // 500 MB
const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1 GB

type Status = "ok" | "warn" | "fail";
interface Check { key: string; label: string; status: Status; detail: string }

const pctStatus = (pct: number): Status => (pct >= 90 ? "fail" : pct >= 70 ? "warn" : "ok");

/** Doctor / chequeo de salud del sistema. Solo admin. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "no autorizado" }, { status: 403 });

  const db = createAdminClient();
  const checks: Check[] = [];

  // 1) Métricas de la base (función SECURITY DEFINER).
  let h: Record<string, number> = {};
  try {
    const { data, error } = await db.rpc("platica_health");
    if (error) throw error;
    h = (data ?? {}) as Record<string, number>;
    checks.push({ key: "db_conn", label: "Conexión a la base de datos", status: "ok", detail: "Respondiendo" });
  } catch (e) {
    checks.push({ key: "db_conn", label: "Conexión a la base de datos", status: "fail", detail: (e as Error).message });
  }

  const dbSize = h.db_size ?? 0;
  const storageBytes = h.storage_bytes ?? 0;
  const dbPct = Math.round((dbSize / DB_LIMIT) * 100);
  const storagePct = Math.round((storageBytes / STORAGE_LIMIT) * 100);

  checks.push({
    key: "db_size",
    label: "Espacio de la base de datos",
    status: pctStatus(dbPct),
    detail: `${(dbSize / 1_048_576).toFixed(1)} MB de 500 MB (${dbPct}%)`,
  });
  checks.push({
    key: "storage",
    label: "Almacenamiento de recibos",
    status: pctStatus(storagePct),
    detail: `${(storageBytes / 1_048_576).toFixed(1)} MB de 1024 MB (${storagePct}%)`,
  });

  // 2) Webhook de Telegram.
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let telegram: { url: string; pending: number; lastError: string | null; lastErrorAt: string | null } = {
    url: "",
    pending: 0,
    lastError: null,
    lastErrorAt: null,
  };
  if (!token) {
    checks.push({ key: "tg", label: "Bot de Telegram", status: "fail", detail: "Falta TELEGRAM_BOT_TOKEN" });
  } else {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((x) => x.json());
      const info = r.result ?? {};
      telegram = {
        url: info.url ?? "",
        pending: info.pending_update_count ?? 0,
        lastError: info.last_error_message ?? null,
        lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
      };
      let st: Status = "ok";
      let detail = "Webhook activo, sin errores";
      if (!telegram.url) { st = "fail"; detail = "Webhook NO configurado"; }
      else if (telegram.lastError) { st = "warn"; detail = `Último error: ${telegram.lastError}`; }
      else if (telegram.pending > 20) { st = "warn"; detail = `${telegram.pending} updates en cola`; }
      checks.push({ key: "tg", label: "Bot de Telegram (webhook)", status: st, detail });
    } catch (e) {
      checks.push({ key: "tg", label: "Bot de Telegram (webhook)", status: "fail", detail: (e as Error).message });
    }
  }

  // 3) IA configurada.
  const gemini = !!process.env.GEMINI_API_KEY;
  const groq = !!process.env.GROQ_API_KEY;
  checks.push({
    key: "ai",
    label: "Inteligencia artificial",
    status: gemini && groq ? "ok" : gemini || groq ? "warn" : "fail",
    detail: `Gemini ${gemini ? "✓" : "✗"} · Groq ${groq ? "✓" : "✗"}`,
  });

  // 4) Secretos críticos.
  const missing = ["SUPABASE_SECRET_KEY", "TELEGRAM_WEBHOOK_SECRET", "CRON_SECRET", "NEXT_PUBLIC_SUPABASE_URL"].filter(
    (k) => !process.env[k],
  );
  checks.push({
    key: "secrets",
    label: "Variables de entorno",
    status: missing.length ? "fail" : "ok",
    detail: missing.length ? `Faltan: ${missing.join(", ")}` : "Todas presentes",
  });

  // 5) Borradores atascados (flujos sin confirmar > 1 día).
  const stuck = h.stuck_drafts ?? 0;
  checks.push({
    key: "drafts",
    label: "Borradores sin confirmar",
    status: stuck > 0 ? "warn" : "ok",
    detail: stuck > 0 ? `${stuck} llevan más de 1 día` : "Sin borradores viejos",
  });

  // 6) Idempotencia (tabla de updates procesados — crece con el tiempo).
  const processed = h.processed_updates ?? 0;
  checks.push({
    key: "idempotency",
    label: "Registro de mensajes (idempotencia)",
    status: processed > 50000 ? "warn" : "ok",
    detail: `${processed} updates registrados${processed > 50000 ? " · conviene limpiar" : ""}`,
  });

  const worst: Status = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "ok";

  return NextResponse.json({
    overall: worst,
    checkedAt: new Date().toISOString(),
    metrics: {
      dbSize,
      dbLimit: DB_LIMIT,
      dbPct,
      storageBytes,
      storageLimit: STORAGE_LIMIT,
      storagePct,
      users: h.users ?? 0,
      transactions: h.transactions ?? 0,
      accounts: h.accounts ?? 0,
      receipts: h.receipts ?? 0,
      activeToday: h.active_today ?? 0,
      pendingDrafts: h.pending_drafts ?? 0,
      processedUpdates: processed,
    },
    telegram,
    checks,
  });
}
