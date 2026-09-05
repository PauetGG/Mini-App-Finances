"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/household";
import { parseAmountToCents } from "@/lib/money";

export type TxState = { error?: string; ok?: boolean };

export async function createTransaction(
  _prev: TxState,
  formData: FormData,
): Promise<TxState> {
  const { supabase, householdId, user } = await getContext();

  const kind = String(formData.get("kind") ?? "expense");
  const amountRaw = String(formData.get("amount") ?? "");
  const accountId = String(formData.get("account_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const occurredOn = String(formData.get("occurred_on") ?? "");
  const paidBy = String(formData.get("paid_by") ?? user.id);
  const shared = formData.get("shared") === "on";

  const magnitude = parseAmountToCents(amountRaw);
  if (magnitude === null || magnitude === 0) {
    return { error: "Escriu un import, per exemple 12,50." };
  }
  if (!accountId) return { error: "Tria de quin compte surten els diners." };

  // El signe el decideix el tipus, no l'usuari.
  const amount = kind === "income" ? Math.abs(magnitude) : -Math.abs(magnitude);

  const { error } = await supabase.from("transactions").insert({
    household_id: householdId,
    account_id: accountId,
    category_id: categoryId || null,
    amount_cents: amount,
    occurred_on: occurredOn || new Date().toISOString().slice(0, 10),
    description: description || null,
    paid_by: paidBy || user.id,
    shared,
    created_by: user.id,
  });

  if (error) return { error: "No s'ha pogut desar el moviment." };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteTransaction(formData: FormData) {
  const { supabase } = await getContext();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/dashboard", "layout");
}
