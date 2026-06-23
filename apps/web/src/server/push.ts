import webpush from "web-push";
import { createAdminClient } from "./supabase-admin";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@platicapp.app", pub, priv);
  configured = true;
  return true;
}

type PushPayload = { title: string; body: string; url?: string };

/** Envía una notificación Web Push a todos los dispositivos de un usuario. Best-effort. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!configure()) return;
  const db = createAdminClient();
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
  if (!subs?.length) return;
  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
      } catch (e: unknown) {
        // 404/410 = suscripción vencida → la borramos.
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
}
