"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/household";
import { parseAmountToCents } from "@/lib/money";

export type RuleState = { error?: string; ok?: boolean };

export async function createRule(
  _prev: RuleState,
  formData: FormData,
): Promise<RuleState> {
  const { supabase, householdId, user } = await getContext();

  const kind = String(formData.get("kind") ?? "expense");
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const day = Number(formData.get("day_of_month") ?? 1);
  const accountId = String(formData.get("account_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const paidBy = String(formData.get("paid_by") ?? user.id);
  const shared = formData.get("shared") === "on";

  if (!description) return { error: "Posa-li un nom, per exemple Lloguer." };

  const magnitude = parseAmountToCents(amountRaw);
  if (magnitude === null || magnitude === 0) {
    return { error: "Escriu un import, per exemple 850." };
  }
  if (!accountId) return { error: "Tria de quin compte surt." };
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { error: "El dia ha de ser entre 1 i 31." };
  }

  const amount = kind === "income" ? Math.abs(magnitude) : -Math.abs(magnitude);

  const { error } = await supabase.from("recurring_rules").insert({
    household_id: householdId,
    account_id: accountId,
    category_id: categoryId || null,
    description,
    amount_cents: amount,
    day_of_month: day,
    paid_by: paidBy || user.id,
    shared,
  });

  if (error) return { error: "No s'ha pogut desar la despesa fixa." };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function toggleRule(formData: FormData) {
  const { supabase } = await getContext();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  await supabase
    .from("recurring_rules")
    .update({ active: !active })
    .eq("id", id);

  revalidatePath("/dashboard", "layout");
}

export async function deleteRule(formData: FormData) {
  const { supabase } = await getContext();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Els moviments ja generats es queden: són història real.
  // El seu recurring_rule_id passa a null pel ON DELETE SET NULL.
  await supabase.from("recurring_rules").delete().eq("id", id);
  revalidatePath("/dashboard", "layout");
}

/** Converteix les regles actives en moviments reals del mes indicat. */
export async function generateMonth(formData: FormData) {
  const { supabase, householdId } = await getContext();
  const month = String(formData.get("month") ?? "");

  await supabase.rpc("materialize_recurring", {
    p_household_id: householdId,
    p_month: month || new Date().toISOString().slice(0, 10),
  });

  revalidatePath("/dashboard", "layout");
}
