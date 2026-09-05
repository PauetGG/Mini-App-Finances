import { createClient } from "@/lib/supabase/server";
import { getContext, nameOf } from "@/lib/household";
import { Amount } from "@/components/amount";
import { deleteTransaction } from "./actions";

type Row = {
  id: string;
  amount_cents: number;
  occurred_on: string;
  description: string | null;
  shared: boolean;
  paid_by: string | null;
  accounts: { name: string } | null;
  categories: { name: string } | null;
};

export default async function MovementsPage() {
  const { householdId, currency, members } = await getContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("transactions")
    .select(
      "id, amount_cents, occurred_on, description, shared, paid_by, accounts(name), categories(name)",
    )
    .eq("household_id", householdId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];

  if (rows.length === 0) {
    return (
      <div>
        <h1 className="text-xl">Encara no heu apuntat res</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Fes servir el botó de baix a la dreta cada cop que pagueu alguna
          cosa. Amb dues setmanes de moviments ja començareu a veure on se
          n&apos;hi van.
        </p>
      </div>
    );
  }

  // Agrupats per dia
  const byDay = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byDay.get(r.occurred_on) ?? [];
    list.push(r);
    byDay.set(r.occurred_on, list);
  }

  return (
    <div>
      <h1 className="text-xl">Moviments</h1>

      <div className="mt-5 space-y-6">
        {[...byDay.entries()].map(([day, items]) => (
          <section key={day}>
            <h2 className="text-xs text-muted">{formatDay(day)}</h2>

            <ul className="mt-2 divide-y divide-line rounded-md border border-line bg-surface">
              {items.map((t) => (
                <li key={t.id} className="group flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {t.description || t.categories?.name || "Sense concepte"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[
                        t.categories?.name,
                        t.accounts?.name,
                        t.paid_by ? nameOf(members, t.paid_by) : null,
                        t.amount_cents < 0 && !t.shared ? "personal" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Amount cents={t.amount_cents} currency={currency} />
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        aria-label="Esborra el moviment"
                        className="text-xs text-muted underline underline-offset-4 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 hover:text-expense"
                      >
                        Esborra
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (same(d, today)) return "Avui";
  if (same(d, yesterday)) return "Ahir";

  return new Intl.DateTimeFormat("ca-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}
