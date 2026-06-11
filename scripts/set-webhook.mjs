// Registra (o elimina) el webhook del bot en Telegram.
//   Uso:  node scripts/set-webhook.mjs https://TU-APP.vercel.app
//   Borrar:  node scripts/set-webhook.mjs --delete
// Lee TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET de apps/web/.env.local

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, "apps/web/.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const token = env.TELEGRAM_BOT_TOKEN;
const secret = env.TELEGRAM_WEBHOOK_SECRET;
if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN en apps/web/.env.local");

const arg = process.argv[2];

if (arg === "--delete") {
  const r = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`).then((r) => r.json());
  console.log("deleteWebhook:", r);
} else if (arg === "--info") {
  const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json());
  console.log(JSON.stringify(r, null, 2));
} else if (arg?.startsWith("http")) {
  const url = `${arg.replace(/\/$/, "")}/api/telegram/webhook`;
  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message", "callback_query"] }),
  }).then((r) => r.json());
  console.log("setWebhook ->", url, "\n", r);
} else {
  console.log("Uso: node scripts/set-webhook.mjs <https://url> | --delete | --info");
}
