"use client";

import { useEffect, useRef, useState } from "react";

const CHAT: { me: boolean; text: string }[] = [
  { me: true, text: "gasté 50 mil en el almuerzo con la tarjeta" },
  { me: false, text: "💸 Gasto · $50.000 · Comida · Tarjeta de crédito\n¿Lo registro?" },
  { me: true, text: "✅ sí" },
  { me: false, text: "✅ Registrado. Ya aparece en tu dashboard 📊" },
  { me: true, text: "🎙️ nota de voz" },
  { me: false, text: "🎙️ Te entendí: «Uber 18 mil»\n💸 Gasto · $18.000 · Transporte" },
  { me: true, text: "¿cuánto gasté este mes?" },
  { me: false, text: "💸 Gastos este mes: $2.050.000\n📊 Top: Comida $720k, Hogar $600k" },
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
          t += 1200;
        } else {
          at(t, () => setTyping(true)); // bot "escribiendo…"
          t += 1000;
          at(t, () => {
            setTyping(false);
            setShown(i + 1);
          });
          t += 900;
        }
      });
      at(t + 2800, run); // reinicia el bucle
    }
    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  // Auto-scroll al fondo cuando entra un mensaje o el "escribiendo".
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

      <div ref={scrollRef} className="flex h-[280px] flex-col gap-2 overflow-hidden">
        {CHAT.slice(0, shown).map((m, i) => (
          <div key={i} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
            <span
              className={`animate-float-in max-w-[85%] whitespace-pre-line rounded-[14px] px-3 py-2 text-[12.5px] ${
                m.me ? "bg-[var(--color-accent)] text-white" : "bg-black/[0.06] text-[var(--color-ink)]"
              }`}
            >
              {m.text}
            </span>
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

function Dot({ d }: { d: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-ink-soft)]"
      style={{ animationDelay: `${d}ms`, animationDuration: "1s" }}
    />
  );
}
