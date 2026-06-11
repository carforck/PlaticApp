"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchDashboard, type DashboardData } from "@/lib/queries";

export interface DashboardProfile {
  email: string;
  displayName: string;
  defaultCurrency: string;
  timezone: string;
  telegramLinked: boolean;
}

interface DashboardCtx {
  data: DashboardData;
  profile: DashboardProfile;
  userEmail: string;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DashboardCtx | null>(null);

/**
 * Carga los datos del dashboard UNA vez y los comparte con todas las vistas.
 * Una sola suscripción Realtime (websocket) mantiene todo al día, así cambiar
 * de vista es instantáneo y no requiere recargar ni volver a consultar.
 */
export function DashboardProvider({
  initialData,
  profile,
  children,
}: {
  initialData: DashboardData;
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  const [data, setData] = useState(initialData);
  const supabase = useMemo(() => createClient(), []);

  const refresh = useCallback(async () => {
    setData(await fetchDashboard(supabase));
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("platica-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "debts" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  return (
    <Ctx.Provider value={{ data, profile, userEmail: profile.email, refresh }}>{children}</Ctx.Provider>
  );
}

export function useDashboard(): DashboardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard debe usarse dentro de DashboardProvider");
  return ctx;
}
