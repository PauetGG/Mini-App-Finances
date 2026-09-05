import { createClient } from "@/lib/supabase/server";
import { getContext, nameOf } from "@/lib/household";
import { Amount } from "@/components/amount";
import { formatCents } from "@/lib/money";
import { RecurringForm } from "@/components/recurring-form";
import { deleteRule, toggleRule, generateMonth } from "./actions";

type Rule = {
  id: string;
  description: string;
  amount_cents: number;
  day_of_month: number;
  active: boolean;
  shared: boolean;
  paid_by: string | null;
  accounts: { name: string } | null;
  categories: { name: string } | null;
};

export default async function RecurringPage() {
  const { householdId, currency, members, accounts, categories, user } =
    await getContext();
  const supabase = await createClient();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [rulesRes, generatedRes] = await Promise.all([
    supabase
      .from("recurring_rules")
      .select(
        "id, description, amount_cents, day_of_month, active, shared, paid_by, accounts(name), categories(name)",
      )
      .eq("household_id", householdId)
      .order("day_of_month"),
    supabase
      .from("transactions")
      .select("recurring_rule_id")
      .eq("household_id", householdId)
      .not("recurring_rule_id", "is", null)
      .gte("occurred_on", monthStart),
  ]);

  const rules = (rulesRes.data ?? []) as unknown as Rule[];
  const done = new Set(
    (generatedRes.data ?? []).map((t) => t.recurring_rule_id as string),
  );

  const active = rules.filter((r) => r.active);
  const pending = active.filter((r) => !done.has(r.id));

  const monthlyOut = active
    .filter((r) => r.amount_cents < 0)
    .reduce((s, r) => s + r.amount_cents, 0);
  const monthlyIn = active
    .filter((r) => r.amount_cents > 0)
    .reduce((s, r) => s + r.amount_cents, 0);

  const monthName = new Intl.DateTimeFormat("ca-ES", {
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl">Fixes de cada mes</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Aquí hi van el lloguer, les subscripcions i la nòmina. No són
          moviments: són la plantilla. Cada mes els converteixes en moviments
          reals i, si algun ve diferent, l&apos;edites sense tocar la
          plantilla.
        </p>
      </div>

      {active.length > 0 && (
        <section className="rounded-md border border-line bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Cada mes, abans de res</p>
              <p className="mt-1">
                <Amount cents={monthlyIn} currency={currency} className="text-xl" />
                <span className="mx-2 text-muted">·</span>
                <Amount cents={monthlyOut} currency={currency} className="text-xl" />
              </p>
            </div>

            <form action={generateMonth}>
              <input type="hidden" name="month" value={monthStart} />
              <button
                type="submit"
                disabled={pending.length === 0}
                className="rounded-sm bg-ink px-4 py-2.5 text-sm text-paper transition-colors hover:bg-ink-soft disabled:opacity-40"
              >
                {pending.length === 0
                  ? `${monthName} ja està generat`
                  : `Genera ${pending.length} de ${monthName}`}
              </button>
            </form>
          </div>
        </section>
      )}

      {rules.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {rules.map((r) => (
            <li
              key={r.id}
              className={`group flex items-center justify-between gap-4 px-5 py-4 ${
                r.active ? "" : "opacity-50"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {r.description}
                  {r.active && !done.has(r.id) && (
                    <span className="ml-2 rounded-sm bg-paper px-1.5 py-0.5 text-xs text-muted">
                      pendent
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {[
                    `dia ${r.day_of_month}`,
                    r.categories?.name,
                    r.accounts?.name,
                    r.paid_by ? nameOf(members, r.paid_by) : null,
                    r.amount_cents < 0 && !r.shared ? "personal" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Amount cents={r.amount_cents} currency={currency} />

                <form action={toggleRule}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={String(r.active)} />
                  <button
                    type="submit"
                    className="text-xs text-muted underline underline-offset-4 hover:text-ink"
                  >
                    {r.active ? "Pausa" : "Reprèn"}
                  </button>
                </form>

                <form action={deleteRule}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="text-xs text-muted underline underline-offset-4 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 hover:text-expense"
                  >
                    Esborra
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {accounts.length === 0 ? (
        <p className="text-sm text-muted">
          Necessites almenys un compte abans de crear fixes.
        </p>
      ) : (
        <RecurringForm
          accounts={accounts}
          categories={categories}
          members={members}
          currentUserId={user.id}
        />
      )}

      {active.length > 0 && (
        <p className="text-xs text-muted">
          Generar el mes dues vegades no duplica res: cada fixa només pot
          existir un cop per mes. Total fix del mes:{" "}
          <span className="tnum">{formatCents(Math.abs(monthlyOut), currency)}</span>.
        </p>
      )}
    </div>
  );
}
