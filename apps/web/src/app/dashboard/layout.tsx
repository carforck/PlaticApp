import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboard } from "@/lib/queries";
import { DashboardProvider } from "@/lib/dashboard-context";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [initialData, { data: profile }, { data: link }] = await Promise.all([
    fetchDashboard(supabase),
    supabase.from("profiles").select("display_name, default_currency, timezone").eq("id", user.id).maybeSingle(),
    supabase.from("telegram_links").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <DashboardProvider
      initialData={initialData}
      profile={{
        email: user.email ?? "",
        displayName: profile?.display_name ?? "",
        defaultCurrency: profile?.default_currency ?? "COP",
        timezone: profile?.timezone ?? "America/Bogota",
        telegramLinked: !!link,
      }}
    >
      <div className="flex min-h-screen gap-4 p-4">
        <Sidebar />
        {children}
      </div>
    </DashboardProvider>
  );
}
