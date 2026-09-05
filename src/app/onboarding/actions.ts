"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type OnboardState = { error?: string };

export async function createHousehold(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!name) return { error: "Posa-li un nom a la llar." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: name,
    p_display_name: displayName || null,
  });

  if (error) return { error: "No s'ha pogut crear la llar. Torna-ho a provar." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function joinHousehold(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const code = String(formData.get("code") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!code) return { error: "Enganxa el codi que t'ha passat la teva parella." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", {
    p_code: code,
    p_display_name: displayName || null,
  });

  if (error) {
    return { error: "Aquest codi no existeix. Comprova'l amb la teva parella." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
