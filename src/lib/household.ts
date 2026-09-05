import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Member, Account, Category } from "@/lib/constants";

// Reexportem tipus i constants perquè les pàgines de servidor puguin seguir
// important-los des d'aquí. Els clients han d'anar a @/lib/constants.
export * from "@/lib/constants";

/**
 * Context compartit per tot el dashboard: usuari, llar, membres,
 * comptes i categories. Una sola tanda de consultes.
 */
export async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, households(name, join_code, currency)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const householdId = membership.household_id as string;
  const household = membership.households as unknown as {
    name: string;
    join_code: string;
    currency: string;
  };

  const [members, accounts, categories] = await Promise.all([
    supabase
      .from("household_members")
      .select("user_id, display_name")
      .eq("household_id", householdId),
    supabase
      .from("accounts")
      .select("id, name, type, owner_id, is_private, opening_balance_cents, archived")
      .eq("household_id", householdId)
      .eq("archived", false)
      .order("name"),
    supabase
      .from("categories")
      .select("id, name, kind, color")
      .eq("household_id", householdId)
      .eq("archived", false)
      .order("name"),
  ]);

  return {
    supabase,
    user,
    householdId,
    household,
    currency: household.currency,
    members: (members.data ?? []) as Member[],
    accounts: (accounts.data ?? []) as Account[],
    categories: (categories.data ?? []) as Category[],
  };
}