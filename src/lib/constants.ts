/** Tipus i constants compartides. Sense codi de servidor: ho importa el client. */

export type Member = { user_id: string; display_name: string | null };

export type Account = {
  id: string;
  name: string;
  type: string;
  owner_id: string | null;
  is_private: boolean;
  opening_balance_cents: number;
  archived: boolean;
};

export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
};

export const ACCOUNT_TYPES = [
  { value: "checking", label: "Compte corrent" },
  { value: "savings", label: "Estalvi" },
  { value: "card", label: "Targeta" },
  { value: "cash", label: "Efectiu" },
  { value: "investment", label: "Inversió" },
] as const;

export function accountTypeLabel(v: string) {
  return ACCOUNT_TYPES.find((t) => t.value === v)?.label ?? v;
}

/** Nom curt per ensenyar a la interfície. */
export function nameOf(members: Member[], id: string | null, fallback = "—") {
  if (!id) return fallback;
  const m = members.find((x) => x.user_id === id);
  return m?.display_name || "Sense nom";
}