"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/household";
import { parseAmountToCents } from "@/lib/money";

export type AccountState = { error?: string; ok?: boolean };

export async function createAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const { supabase, householdId, user } = await getContext();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "checking");
  const scope = String(formData.get("scope") ?? "joint"); // joint | mine | private
  const openingRaw = String(formData.get("opening") ?? "0");

  if (!name) return { error: "Posa-li un nom al compte." };

  const opening = parseAmountToCents(openingRaw || "0");
  if (opening === null) {
    return { error: "El saldo inicial no és un import vàlid." };
  }

  const { error } = await supabase.from("accounts").insert({
    household_id: householdId,
    name,
    type,
    owner_id: scope === "joint" ? null : user.id,
    is_private: scope === "private",
    opening_balance_cents: opening,
  });

  if (error) return { error: "No s'ha pogut desar el compte." };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function archiveAccount(formData: FormData) {
  const { supabase } = await getContext();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("accounts").update({ archived: true }).eq("id", id);
  revalidatePath("/dashboard", "layout");
}
