import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboard } from "@/lib/queries";
import { MovimientosClient } from "@/components/dashboard/MovimientosClient";

export const dynamic = "force-dynamic";

export default async function MovimientosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const initialData = await fetchDashboard(supabase);
  return <MovimientosClient initialData={initialData} />;
}
