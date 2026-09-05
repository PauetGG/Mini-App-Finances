import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Punt d'entrada: decideix on va l'usuari segons si ja té llar.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  redirect(membership ? "/dashboard" : "/onboarding");
}
