import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboard } from "@/lib/queries";
import { DeudasClient } from "@/components/dashboard/DeudasClient";

export const dynamic = "force-dynamic";

export default async function DeudasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const initialData = await fetchDashboard(supabase);
  return <DeudasClient initialData={initialData} />;
}
