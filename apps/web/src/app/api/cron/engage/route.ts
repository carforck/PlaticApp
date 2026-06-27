import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/server/supabase-admin";
import { telegram } from "@/server/telegram";
import { sendPushToUser } from "@/server/push";
import { logEvent } from "@/server/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP = "https://platicapp-web.vercel.app/dashboard";

// Recordatorio de ingreso en días de pago típicos (quincena).
const PAYDAY_DAYS = [14, 15, 29, 30];
const PAYDAY = {
  tg: "💰 <b>¿Ya te pagaron?</b>\nSi te entró plata, regístrala para mantener tu saldo al día: dime «me pagaron 1.500.000» o agrégalo en la app. Y si aún no, ¡no la olvides cuando llegue! 😉",
  title: "💰 ¿Ya te pagaron?",
  body: "Registra tu ingreso para mantener tu saldo al día.",
};

// Mensajes que rotan cada día (educan + animan a usar la app).
const DAILY = [
  { tg: "📝 ¿Registraste tus gastos de hoy? Toma 5 segundos: «gasté 20 mil en el almuerzo» 🍽️", title: "📝 Registra tus gastos de hoy", body: "Toma 5 segundos. «gasté 20 mil en el almuerzo»" },
  { tg: "🔔 Activa las notificaciones en <b>Perfil → Notificaciones</b> para no perder tus recordatorios.", title: "🔔 Activa tus notificaciones", body: "En Perfil → Notificaciones, para no perder avisos." },
  { tg: "📱 Ten PlaticApp a un toque: ábrela en el navegador → <b>Compartir/⋮ → Agregar a pantalla de inicio</b>.", title: "📱 Agrega PlaticApp a tu inicio", body: "Compartir/⋮ → Agregar a pantalla de inicio." },
  { tg: "🐷 Aparta algo para tus metas: «aparta 50 mil para el viaje». Tu yo del futuro lo agradece.", title: "🐷 Aparta para tus metas", body: "«aparta 50 mil para el viaje»" },
  { tg: "📊 Mira cuánto te queda <b>para gastar</b> este mes en tu panel.", title: "📊 ¿Cuánto te queda para gastar?", body: "Revisa tu plan del mes en el panel." },
  { tg: "🎯 Revisa tus presupuestos para no pasarte este mes.", title: "🎯 Cuida tus presupuestos", body: "Revisa que no te estés pasando este mes." },
  { tg: "🎙️ ¿Sin tiempo de escribir? Mándame un <b>audio</b> o una <b>foto del recibo</b> y yo lo registro.", title: "🎙️ Registra por voz o foto", body: "Mándame un audio o foto del recibo." },
];

/** Cron diario: mensajes de engagement por bot (Telegram) y Web Push. Protegido con CRON_SECRET. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("forbidden", { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date();
  const day = now.getDate();
  const isPayday = PAYDAY_DAYS.includes(day);

  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const daily = DAILY[dayOfYear % DAILY.length]!;
  const tgText = isPayday ? PAYDAY.tg : daily.tg;
  const push = isPayday ? { title: PAYDAY.title, body: PAYDAY.body, url: APP } : { title: daily.title, body: daily.body, url: APP };

  // En días normales, no molestamos a quien ya registró algo hoy (solo recordamos a los inactivos).
  // En día de pago, le llega a todos.
  const skip = new Set<string>();
  if (!isPayday) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const { data: actives } = await db.from("transactions").select("user_id").gte("occurred_at", start);
    for (const t of actives ?? []) skip.add(t.user_id);
  }

  // Telegram a los vinculados (que no hayan registrado hoy, si es día normal).
  const { data: links } = await db.from("telegram_links").select("telegram_chat_id, user_id");
  let tg = 0;
  for (const l of links ?? []) {
    if (skip.has(l.user_id)) continue;
    try {
      await telegram.sendMessage(l.telegram_chat_id, tgText, [[{ text: "🌐 Abrir mi panel", url: APP }]]);
      tg++;
    } catch {
      /* sigue con los demás */
    }
  }

  // Web Push a quienes tengan suscripción (mismo criterio).
  const { data: subs } = await db.from("push_subscriptions").select("user_id");
  const pushUsers = [...new Set((subs ?? []).map((s) => s.user_id))].filter((u) => !skip.has(u));
  let pushed = 0;
  for (const uid of pushUsers) {
    await sendPushToUser(uid, push);
    pushed++;
  }

  void logEvent({ source: "cron", event: "engage", detail: `${isPayday ? "payday" : "daily"} · tg ${tg} · push ${pushed}` });
  return NextResponse.json({ ok: true, kind: isPayday ? "payday" : "daily", telegram: tg, push: pushed });
}
