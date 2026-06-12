"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { me: boolean; kind?: "text" | "voice" | "image"; text?: string };

const CHAT: Msg[] = [
  { me: true, text: "gasté 50 mil en el almuerzo con la tarjeta" },
  { me: false, text: "💸 Gasto · $50.000 · Comida · Tarjeta de crédito\n¿Lo registro?" },
  { me: true, text: "✅ sí" },
  { me: false, text: "✅ Registrado. Ya aparece en tu dashboard 📊" },
  { me: true, kind: "voice" },
  { me: false, text: "🎙️ Te entendí: «Uber 18 mil»\n💸 Gasto · $18.000 · Transporte" },
  { me: true, kind: "image" },
  { me: false, text: "🖼️ Leí tu recibo:\n💸 $230.000 · Mercado · Comida" },
  { me: true, text: "Pedro me prestó 100 mil" },
  { me: false, text: "🤝 Le debes a Pedro: $100.000\n¿Lo registro?" },
  { me: true, text: "pasé 200 mil de Nequi a Bancolombia" },
  { me: false, text: "🔄 Transferencia · $200.000\nNequi → Bancolombia ✅" },
  { me: true, text: "todos los meses pago arriendo 800 mil el 5" },
  { me: false, text: "🔁 Pago fijo mensual · $800.000 · día 5\nTe recuerdo 1 día antes 🔔" },
  { me: true, text: "¿cuánto gasté este mes?" },
  { me: false, text: "💸 Gastos este mes: $2.050.000\n📊 Top: Comida $720k · Hogar $600k" },
];

export function AnimatedChat() {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(() => !cancelled && fn(), ms));

    function run() {
      setShown(0);
      setTyping(false);
      let t = 700;
      CHAT.forEach((m, i) => {
        if (m.me) {
          at(t, () => setShown(i + 1));
          t += m.kind ? 1400 : 1100;
        } else {
          at(t, () => setTyping(true));
          t += 1000;
          at(t, () => {
            setTyping(false);
            setShown(i + 1);
          });
          t += 850;
        }
      });
      at(t + 3000, run);
    }
    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [shown, typing]);

  return (
    <div className="glass animate-float-in rounded-[var(--radius-card)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#229ED9] text-[15px]">✈️</span>
        <span>
          <span className="block text-[14px] font-semibold leading-tight">@PlaticApp_bot</span>
          <span className="block text-[11px] text-[#30d158]">en línea</span>
        </span>
      </div>

      <div ref={scrollRef} className="flex h-[320px] flex-col gap-2 overflow-hidden">
        {CHAT.slice(0, shown).map((m, i) => (
          <div key={i} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
            <Bubble m={m} />
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <span className="flex items-center gap-1 rounded-[14px] bg-black/[0.06] px-3 py-2.5">
              <Dot d={0} />
              <Dot d={150} />
              <Dot d={300} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ m }: { m: Msg }) {
  if (m.kind === "voice") {
    return (
      <span className="animate-float-in flex items-center gap-2 rounded-[14px] bg-[var(--color-accent)] px-3 py-2 text-white">
        <span className="text-[14px]">🎙️</span>
        <span className="flex items-end gap-0.5">
          {[6, 11, 8, 14, 9, 13, 7, 12, 6].map((h, i) => (
            <span key={i} className="w-0.5 rounded-full bg-white/80" style={{ height: h }} />
          ))}
        </span>
        <span className="text-[11px] text-white/80">0:05</span>
      </span>
    );
  }
  if (m.kind === "image") {
    return (
      <span className="animate-float-in block overflow-hidden rounded-[14px] bg-[var(--color-accent)] p-1">
        <span className="flex h-24 w-36 flex-col items-center justify-center rounded-[10px] bg-gradient-to-br from-white/30 to-white/10 text-white">
          <span className="text-[28px]">🧾</span>
          <span className="mt-1 text-[10px] text-white/80">recibo.jpg</span>
        </span>
      </span>
    );
  }
  return (
    <span
      className={`animate-float-in max-w-[85%] whitespace-pre-line rounded-[14px] px-3 py-2 text-[12.5px] ${
        m.me ? "bg-[var(--color-accent)] text-white" : "bg-black/[0.06] text-[var(--color-ink)]"
      }`}
    >
      {m.text}
    </span>
  );
}

function Dot({ d }: { d: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-ink-soft)]"
      style={{ animationDelay: `${d}ms`, animationDuration: "1s" }}
    />
  );
}
