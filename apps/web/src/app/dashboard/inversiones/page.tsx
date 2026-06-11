import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboard } from "@/lib/queries";
import { InversionesClient } from "@/components/dashboard/InversionesClient";

export const dynamic = "force-dynamic";

export default async function InversionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const initialData = await fetchDashboard(supabase);
  return <InversionesClient initialData={initialData} />;
}
