"use client";

import Lottie from "lottie-react";
import Link from "next/link";
import anim from "@/app/login-anim.json";
import { RotatingWord } from "@/components/RotatingWord";
import { DevCredit } from "@/components/DevCredit";
import { LandingShowcase } from "@/components/landing/LandingShowcase";
import { LandingNews } from "@/components/landing/LandingNews";
import { FeatureMarquee } from "@/components/landing/FeatureMarquee";
import { LiveUsersPill, LiveStatsBar } from "@/components/landing/LiveStats";
import { BrandIcon } from "@/components/BrandIcon";

const FEATURES = [
  { id: "talk", title: "Habla y listo", desc: "«gasté 50 mil en el almuerzo» y queda registrado. Sin formularios." },
  { id: "voice", title: "Notas de voz", desc: "Manda un audio y la IA lo transcribe y lo entiende." },
  { id: "photo", title: "Foto del recibo", desc: "Tómale foto a la factura y la IA extrae el monto y la categoría." },
  { id: "dashboard", title: "Dashboard en vivo", desc: "Patrimonio, flujo y gráficos que se actualizan en tiempo real." },
  { id: "debts", title: "Deudas y préstamos", desc: "Lleva el registro de quién te debe y a quién le debes." },
  { id: "budget", title: "Presupuestos y recordatorios", desc: "Límites por categoría y avisos de tus pagos fijos por Telegram." },
];

const STEPS = [
  { n: 1, title: "Crea tu cuenta", desc: "Con Google o tu correo. Gratis y en segundos." },
  { n: 2, title: "Vincula Telegram", desc: "Un código y un toque conectan el bot a tu cuenta." },
  { n: 3, title: "Háblale al bot", desc: "Registra hablando y mira todo en tu dashboard." },
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30">
        <div className="glass mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-[var(--radius-card)] px-4 py-2.5 sm:px-5">
          <span className="flex items-center gap-2">
            <BrandIcon size={32} className="rounded-[26%]" />
            <span className="bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text text-[18px] font-bold tracking-tight text-transparent">PlaticApp!</span>
          </span>
          <Link href="/login" className="btn-mac px-4 py-2 text-[13px] font-medium">Entrar</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-6 px-5 py-10 lg:grid-cols-2 lg:py-16">
        <div className="animate-float-in text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-[12px] font-medium text-[var(--color-accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            Tu control financiero por Telegram
          </span>
          <h1 className="mt-4 text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[44px]">
            Controla tus <RotatingWord words={["gastos", "ingresos", "deudas", "inversiones", "ahorros"]} />
            <br className="hidden sm:block" /> hablando con un bot.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-[var(--color-ink-soft)] lg:mx-0">
            Registra por <b>chat, voz o foto</b>. La IA categoriza solo, lleva tus deudas y presupuestos, y tu
            dashboard se actualiza <b>en tiempo real</b>.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href="/login" className="btn-mac px-5 py-2.5 text-[15px] font-medium">Empieza gratis</Link>
            <a href="#features" className="rounded-[var(--radius-control)] border border-black/10 bg-white/60 px-5 py-2.5 text-[15px] font-medium transition hover:bg-white/90">
              Ver funciones
            </a>
          </div>
          <div className="mt-4 flex justify-center lg:justify-start">
            <LiveUsersPill />
          </div>
          <p className="mt-3 text-[12px] text-[var(--color-ink-soft)]">✓ Gratis &nbsp;·&nbsp; ✓ Sin tarjeta &nbsp;·&nbsp; ✓ Listo en 30 segundos</p>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <Lottie animationData={anim} loop autoplay />
        </div>
      </section>

      {/* Social proof en vivo */}
      <LiveStatsBar />

      {/* Showcase dinámico (gráficas + chat) */}
      <LandingShowcase />

      {/* Funcionalidades */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-10">
        <h2 className="text-center text-[26px] font-semibold tracking-tight">Todo tu dinero, en una conversación</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-[14px] text-[var(--color-ink-soft)]">
          Olvídate de planillas. Le hablas a PlaticApp como a una persona y él hace el resto.
        </p>
      </section>

      {/* Carrusel de funciones (ancho completo, en movimiento) */}
      <div className="mt-2 pb-4">
        <FeatureMarquee features={FEATURES} />
      </div>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <h2 className="text-center text-[26px] font-semibold tracking-tight">Empieza en 3 pasos</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="glass rounded-[var(--radius-card)] p-5 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#0a84ff] to-[#bf5af2] text-[16px] font-bold text-white">{s.n}</div>
              <h3 className="mt-3 text-[15px] font-semibold">{s.title}</h3>
              <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lo último (novedades reales) */}
      <LandingNews />

      {/* CTA final */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <div className="glass rounded-[var(--radius-card)] bg-gradient-to-br from-[#0a84ff]/10 to-[#bf5af2]/10 p-8 text-center">
          <h2 className="text-[24px] font-semibold tracking-tight">¿Listo para ordenar tu plata?</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-[var(--color-ink-soft)]">
            Crea tu cuenta gratis y empieza a registrar hablando hoy mismo.
          </p>
          <Link href="/login" className="btn-mac mt-5 inline-block px-6 py-2.5 text-[15px] font-medium">
            Empieza gratis
          </Link>
        </div>
      </section>

      {/* Quién está detrás */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <h2 className="mb-4 text-center text-[14px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-soft)]">
          Quién está detrás
        </h2>
        <DevCredit withPhoto />
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 py-8">
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-[var(--color-ink-soft)]">
          <Link href="/privacidad" className="hover:text-[var(--color-ink)]">Política de Privacidad</Link>
          <span>·</span>
          <Link href="/login" className="hover:text-[var(--color-ink)]">Iniciar sesión</Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} PlaticApp</span>
        </div>
      </footer>
    </main>
  );
}
