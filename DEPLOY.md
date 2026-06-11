# 🚀 Despliegue de PlaticApp

## 0. Subir el código a GitHub (desde TU terminal)

En este entorno no hay credenciales de GitHub, así que corre tú:

```bash
git push -u origin main
```

(Te pedirá tu usuario + un Personal Access Token, o usará tu llavero de macOS.)

---

## 1. Conectar el repo a Vercel

1. Entra a https://vercel.com/new e importa `carforck/PlaticApp`.
2. **MUY IMPORTANTE — Root Directory:** selecciona `apps/web`.
   (Es un monorepo pnpm; Vercel debe construir desde ahí pero instala
   las dependencias del workspace automáticamente.)
3. Framework Preset: **Next.js** (se autodetecta).
4. Build Command / Install Command: deja los de por defecto.

---

## 2. Variables de entorno en Vercel

En el proyecto → Settings → Environment Variables, agrega estas
(las mismas de `apps/web/.env.local`, con los valores REALES):

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uyvllqluauszrkqvelcx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` (publishable key) |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` (Settings → API Keys) |
| `TELEGRAM_BOT_TOKEN` | el token de BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | el secreto generado (ver `.env.local`) |
| `GEMINI_API_KEY` | de aistudio.google.com |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `GROQ_API_KEY` | de console.groq.com |
| `GROQ_WHISPER_MODEL` | `whisper-large-v3-turbo` |
| `APP_TIMEZONE` | `America/Bogota` |
| `APP_DEFAULT_CURRENCY` | `COP` |

Despliega. Vercel te dará una URL tipo `https://platic-app.vercel.app`.

---

## 3. Configurar Supabase para producción

En Supabase → Authentication → URL Configuration:
- **Site URL:** `https://TU-APP.vercel.app`
- **Redirect URLs:** agrega `https://TU-APP.vercel.app/auth/callback`

(Y corre la migración `supabase/migrations/0001_init.sql` en el SQL Editor
si aún no lo hiciste.)

---

## 4. Registrar el webhook del bot

Con la URL pública de Vercel ya viva:

```bash
node scripts/set-webhook.mjs https://TU-APP.vercel.app
# verificar:
node scripts/set-webhook.mjs --info
```

¡Listo! Escríbele a **@PlaticApp_bot** en Telegram, vincula tu cuenta
con el código de la app web, y registra tu primer gasto hablando. 🎉

---

## Probar en local (alternativa sin desplegar)

Telegram exige HTTPS público. Usa un túnel:

```bash
# terminal 1: la app
cd apps/web && node node_modules/next/dist/bin/next dev

# terminal 2: el túnel (cloudflared o ngrok)
cloudflared tunnel --url http://localhost:3000

# terminal 3: registrar el webhook con la URL del túnel
node scripts/set-webhook.mjs https://xxxx.trycloudflare.com
```
