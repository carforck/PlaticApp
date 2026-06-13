"use client";

import { useEffect } from "react";

/** Registra el service worker (necesario para instalar la PWA y badges del ícono). */
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
