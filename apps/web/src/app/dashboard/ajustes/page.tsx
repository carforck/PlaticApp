import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AjustesClient } from "@/components/dashboard/AjustesClient";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: link }] = await Promise.all([
    supabase.from("profiles").select("display_name, default_currency, timezone").eq("id", user.id).maybeSingle(),
    supabase.from("telegram_links").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <AjustesClient
      profile={{
        email: user.email ?? "",
        displayName: profile?.display_name ?? "",
        defaultCurrency: profile?.default_currency ?? "COP",
        timezone: profile?.timezone ?? "America/Bogota",
        telegramLinked: !!link,
      }}
    />
  );
}
