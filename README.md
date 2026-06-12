<div align="center">

# 💸 PlaticApp!

**Tu control financiero por Telegram — registra tu plata hablando y míralo en tiempo real.**

[platicapp-web.vercel.app](https://platicapp-web.vercel.app)

</div>

---

## ✈️ Plan de vuelo

Este README es el mapa completo del proyecto: qué es, cómo está construido, cómo se
despliega, sus límites y hacia dónde va. Si llegas nuevo al código, empieza aquí.

---

## 🎯 Qué es

PlaticApp es una app de finanzas personales donde el usuario **registra su dinero
conversando con un bot de Telegram** (texto, audio 🎙️ o foto de un recibo 🖼️). Una IA
interpreta el mensaje, pide confirmación y lo guarda. Todo se refleja al instante en un
**dashboard web** con estética macOS (glassmorphism, modo oscuro por defecto).

- **Sin fricción**: «gasté 50 mil en el almuerzo» y listo.
- **Multiusuario** con aislamiento total (RLS de Postgres).
- **Tiempo real**: el panel se actualiza solo vía websocket.
- **Gratis de operar**: Supabase + Vercel + IA gratuita (Gemini + Groq).

---

## 📊 Estado del proyecto (auditoría · 2026-06-12)

| Área | Estado |
|---|---|
| Typecheck (core + web) | ✅ sin errores |
| Build de producción | ✅ compila |
| Deploy en Vercel | ✅ READY |
| RLS en todas las tablas | ✅ activo (13/13) |
| Endpoints protegidos (cron/admin/me) | ✅ 401/403 sin auth |
| Bucket de recibos | ✅ privado |
| Webhook de Telegram | ✅ sano (0 pendientes, sin errores) |
| Variables de entorno en Vercel | ✅ 12/12 |
| Secretos fuera del repo | ✅ solo `.env.example` versionado |

**Uso actual** (≈1% de los límites del plan gratis): 9 usuarios · 35 movimientos ·
12,3 MB de DB · 0,25 MB de recibos.

---

## 🧩 Funcionalidades

**Registro por el bot**
- Gastos, ingresos, inversiones, transferencias entre cuentas propias.
- Deudas («Juan me prestó 200 mil»).
- Pagos fijos / recurrentes con recordatorio 1 día antes.
- Texto, **audio** (transcrito con Groq Whisper) e **imagen** de recibos (Gemini Vision).
- Confirmación antes de guardar; aviso de posibles duplicados o gastos inusuales.
- Conversa de forma humana (saludos, «¿qué puedes hacer?») y responde preguntas
  («¿cuánto gasté en comida este mes?»).

**Dashboard web**
- Resumen con KPIs, comparativo vs. mes anterior, proyección de gasto, racha de
  registro, próximo pago fijo y alertas de presupuesto.
- Vistas: Movimientos (lista + calendario), Cuentas, Deudas, Inversiones, Categorías,
  Presupuestos, Pagos fijos, Recibos (galería), Novedades.
- Saldos iniciales por cuenta, editar/eliminar movimientos.
- Paginación en todas las listas largas.
- Centro de Novedades (changelog) con publicación desde Admin + broadcast por Telegram.
- Perfil: vinculación de Telegram, **exportar datos (JSON)** y **empezar de nuevo**.
- **Admin** (solo el dueño): usuarios, espacio por usuario, estado «en línea»,
  detalle de movimientos por usuario.

---

## 🏛️ Arquitectura (hexagonal + SOLID)

```
PlaticApp/
├─ packages/core/          # Dominio puro (sin dependencias de infraestructura)
│  └─ src/
│     ├─ domain/           # Money, Transaction, Debt, Recurrence, Account…
│     ├─ ports/            # Interfaces: TextInterpreter, repos, idempotencia…
│     └─ usecases/         # RegisterTransaction (resuelve cuentas/categorías)
│
├─ apps/web/               # Next.js 15 (App Router) + adaptadores
│  ├─ src/server/          # Adaptadores: bot.ts, ai/gemini.ts, telegram.ts,
│  │                       #   repos.ts, supabase-admin.ts
│  ├─ src/app/             # Rutas (UI + API), iconos, og:image
│  ├─ src/components/      # UI (dashboard, landing, marca)
│  └─ src/lib/             # Cliente Supabase, queries, contexto, formato
│
└─ supabase/migrations/    # Esquema SQL versionado (0001 … 0008)
```

**Principio**: `packages/core` no sabe nada de Supabase ni Telegram; define **puertos**
(interfaces) y la capa `apps/web/src/server` los implementa con **adaptadores**.

---

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind v4, TypeScript strict |
| Backend | Route Handlers de Next (runtime nodejs) |
| Base de datos | Supabase Postgres + RLS + Realtime |
| Auth | Supabase Auth (Google OAuth, magic link, email/clave) |
| Archivos | Supabase Storage (bucket `receipts` privado, imágenes en WebP) |
| IA texto/visión | Google Gemini 2.5 Flash (con cadena de fallback) |
| IA audio | Groq Whisper `large-v3-turbo` |
| Bot | Telegram Bot API (webhook con secret token) |
| Hosting / Cron | Vercel |
| Monorepo | pnpm workspaces |

---

## 🗃️ Modelo de datos

Tablas en `public` (todas con **RLS por `user_id`**, salvo donde se indica):

`profiles` · `accounts` · `categories` · `transactions` · `debts` · `recurrences` ·
`budgets` · `receipts` · `announcements` · `telegram_links` · `link_codes` ·
`pending_drafts` · `processed_updates` (idempotencia, sin policy → solo service-role).

- Vista **`account_balances`** = `opening_balance_minor` + suma de movimientos
  (los `transfer`/`investment` acreditan la cuenta destino, preservando el patrimonio).
- Montos en **unidades menores** (enteros) para evitar errores de coma flotante.

Migraciones: `supabase/migrations/0001_init` → `0008_announcements` (+ columnas
ad-hoc `profiles.last_seen` y `profiles.welcomed_at`).

---

## 🤖 Flujo del bot

1. Usuario vincula su cuenta (código de 6 dígitos generado en la web).
2. Manda un mensaje → webhook valida el secret y la **idempotencia** (`processed_updates`).
3. Se transcribe el audio (Groq) o se lee la imagen, y **Gemini** extrae movimientos /
   deudas / recurrencias / pregunta / respuesta conversacional.
4. El bot muestra un borrador y pide confirmación (botones inline).
5. Al confirmar se guardan los registros; el dashboard se actualiza por Realtime.

La IA usa **cadena de modelos con reintentos** (`gemini-2.5-flash` →
`gemini-2.5-flash-lite` → `gemini-flash-latest`) para tolerar saturación (429/503).

---

## 🔌 Rutas API

```
api/telegram/webhook      # entrada del bot (POST, secret token)
api/telegram/link-code    # genera código de vinculación
api/telegram/status       # estado de vinculación
api/transactions  accounts  categories  debts  recurrences  budgets  profile
api/announcements/seen     # marca novedades como vistas
api/admin/users  admin/user  admin/announcements   # solo dueño (403 si no)
api/me/export  me/reset  me/heartbeat  me/welcomed  # datos del usuario
api/cron/keepalive  cron/reminders  cron/monthly    # crons (Bearer CRON_SECRET)
```

---

## ⏰ Crons (Vercel · `apps/web/vercel.json`)

| Ruta | Horario (UTC) | Función |
|---|---|---|
| `/api/cron/keepalive` | `0 6 * * *` (diario) | Mantiene Supabase activo (evita pausa por inactividad) |
| `/api/cron/reminders` | `0 13 * * *` (diario) | Recordatorios de pagos fijos |
| `/api/cron/monthly` | `0 13 1 * *` (mensual) | Resumen mensual |

Protegidos con `CRON_SECRET` (Vercel envía el header automáticamente).

---

## 🔐 Variables de entorno

Ver `.env.example`. En producción están las 12 configuradas en Vercel:

```
NEXT_PUBLIC_SUPABASE_URL          GEMINI_API_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY     GEMINI_MODEL
SUPABASE_SECRET_KEY               GROQ_API_KEY
TELEGRAM_BOT_TOKEN                GROQ_WHISPER_MODEL
TELEGRAM_WEBHOOK_SECRET           APP_DEFAULT_CURRENCY
CRON_SECRET                       APP_TIMEZONE
```

> `SUPABASE_SECRET_KEY` (service role) **solo** se usa en el servidor
> (`apps/web/src/server/supabase-admin.ts`), nunca en el cliente.

---

## 🛡️ Seguridad

- **RLS activo** en todas las tablas; cada usuario solo ve lo suyo.
- Bucket de recibos **privado** (URLs firmadas temporales para mostrarlos).
- Webhook de Telegram validado por **secret token**; updates **idempotentes**.
- Endpoints de admin restringidos al correo dueño; cron protegidos por secret.
- Cumplimiento de **Habeas Data**: exportación y borrado de datos por el usuario.

---

## 🚀 Desarrollo local

```bash
pnpm install
cp .env.example apps/web/.env.local   # completa las claves
pnpm -C apps/web dev                   # http://localhost:3000

# Calidad
pnpm -C packages/core exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web build
```

**Despliegue**: `git push origin main` → Vercel construye y publica automáticamente.

---

## 📈 Escalabilidad

En el **plan gratis** de Supabase, cómodo para **~200–500 usuarios activos**. El primer
recurso en toparse no es la cantidad de cuentas, sino:

1. **Realtime**: 200 conexiones simultáneas (paneles abiertos a la vez).
2. **Storage**: 1 GB → ~12.000 recibos en WebP (~85 KB c/u).
3. **Base de datos**: 500 MB → cientos de miles de movimientos (no es el límite real).

**Para crecer**: Supabase Pro ($25/mes) → 8 GB DB, 100 GB storage, 500 conexiones
Realtime → decenas de miles de usuarios.

---

## 🗺️ Próximos pasos (ideas)

- [ ] Panel «uso vs. límites» en Admin para vigilar capacidad.
- [ ] Favicon / apple-icon con el billete de Apple (hoy usan Twemoji).
- [ ] Exportar datos también en CSV; borrado selectivo / papelera recuperable.
- [ ] Más insights y metas de ahorro.
- [ ] Limpieza/compresión automática de recibos antiguos.

---

## 👤 Créditos

Desarrollado por **Carlos Carranza** · [vanttagetech.com](https://vanttagetech.com)
[GitHub](https://github.com/carforck) · [LinkedIn](https://www.linkedin.com/in/carloscarranzavillera/) · WhatsApp +57 310 5080356

<div align="center"><sub>Hecho con 💸 en Cartagena, Colombia.</sub></div>
