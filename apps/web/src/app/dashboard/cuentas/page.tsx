import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboard } from "@/lib/queries";
import { CuentasClient } from "@/components/dashboard/CuentasClient";

export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const initialData = await fetchDashboard(supabase);
  return <CuentasClient initialData={initialData} />;
}
