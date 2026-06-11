import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboard } from "@/lib/queries";
import { CategoriasClient } from "@/components/dashboard/CategoriasClient";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const initialData = await fetchDashboard(supabase);
  return <CategoriasClient initialData={initialData} />;
}
