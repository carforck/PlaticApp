"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied" | "working";

/** Activa/desactiva las notificaciones push del dispositivo (PWA). */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    void navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, []);

  async function enable() {
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setState("off");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "unsupported") return null;

  return (
    <section className="glass rounded-[var(--radius-card)] p-6">
      <h2 className="text-[15px] font-semibold">🔔 Notificaciones</h2>
      <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
        Recibe avisos en este dispositivo (recordatorios, novedades y respuestas) aunque no tengas la app abierta.
      </p>
      {state === "denied" ? (
        <p className="mt-3 rounded-[10px] bg-[#ff9f0a]/12 px-3 py-2 text-[13px] text-[#b86e00]">
          Las bloqueaste en tu navegador. Actívalas desde los ajustes del sitio para recibirlas.
        </p>
      ) : (
        <button
          onClick={state === "on" ? disable : enable}
          disabled={state === "loading" || state === "working"}
          className={`mt-3 rounded-[var(--radius-control)] px-4 py-2.5 text-[14px] font-medium transition disabled:opacity-60 ${
            state === "on" ? "border border-black/10 bg-white/60 hover:bg-white/90" : "btn-mac"
          }`}
        >
          {state === "working" ? "Un momento…" : state === "on" ? "Desactivar notificaciones" : "Activar notificaciones"}
        </button>
      )}
      {state === "on" && (
        <div className="mt-2 flex items-center gap-3">
          <p className="text-[12px] text-[#1d8a3a]">✓ Activadas en este dispositivo.</p>
          <button onClick={() => void fetch("/api/push/test", { method: "POST" })} className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
            Enviar prueba
          </button>
        </div>
      )}
    </section>
  );
}
