import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboard } from "@/lib/queries";
import { DashboardProvider } from "@/lib/dashboard-context";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";

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

  const meta = user.user_metadata ?? {};
  const avatarUrl = (meta.avatar_url as string) ?? (meta.picture as string) ?? null;
  const metaName = (meta.full_name as string) ?? (meta.name as string) ?? "";

  return (
    <DashboardProvider
      initialData={initialData}
      profile={{
        email: user.email ?? "",
        displayName: profile?.display_name || metaName,
        avatarUrl,
        defaultCurrency: profile?.default_currency ?? "COP",
        timezone: profile?.timezone ?? "America/Bogota",
        telegramLinked: !!link,
      }}
    >
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardProvider>
  );
}
