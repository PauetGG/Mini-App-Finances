import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getContext, nameOf } from "@/lib/household";
import { Amount, Balance } from "@/components/amount";
import { formatCents } from "@/lib/money";

export default async function SummaryPage() {
  const { householdId, currency, members, user, accounts } = await getContext();
  const supabase = await createClient();

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [summary, balances, settlement, rules, generated] = await Promise.all([
    supabase
      .from("monthly_summary")
      .select("income_cents, expense_cents, net_cents")
      .eq("household_id", householdId)
      .eq("month", month)
      .maybeSingle(),
    supabase
      .from("account_balances")
      .select("balance_cents")
      .eq("household_id", householdId)
      .eq("archived", false),
    supabase
      .from("current_settlement")
      .select("user_id, paid_cents, balance_cents")
      .eq("household_id", householdId),
    supabase
      .from("recurring_rules")
      .select("id")
      .eq("household_id", householdId)
      .eq("active", true),
    supabase
      .from("transactions")
      .select("recurring_rule_id")
      .eq("household_id", householdId)
      .not("recurring_rule_id", "is", null)
      .gte("occurred_on", month),
  ]);

  if (accounts.length === 0) {
    return (
      <div>
        <h1 className="text-xl">Encara no hi ha res a resumir</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Crea el primer compte i ja podràs començar a apuntar moviments.
        </p>
        <Link
          href="/dashboard/comptes"
          className="mt-4 inline-block rounded-sm bg-ink px-4 py-2.5 text-sm text-paper"
        >
          Ves als comptes
        </Link>
      </div>
    );
  }

  const income = Number(summary.data?.income_cents ?? 0);
  const expense = Number(summary.data?.expense_cents ?? 0);
  const net = Number(summary.data?.net_cents ?? 0);
  const total = (balances.data ?? []).reduce(
    (s, r) => s + Number(r.balance_cents),
    0,
  );

  const monthName = new Intl.DateTimeFormat("ca-ES", {
    month: "long",
    year: "numeric",
  }).format(now);

  // Fixes actives que encara no s'han convertit en moviments d'aquest mes
  const done = new Set(
    (generated.data ?? []).map((t) => t.recurring_rule_id as string),
  );
  const pendingRules = (rules.data ?? []).filter((r) => !done.has(r.id)).length;

  // Amb el 50/50, qui té el balanç positiu ha posat de més.
  const rows = settlement.data ?? [];
  const creditor = rows.find((r) => Number(r.balance_cents) > 0);
  const debtor = rows.find((r) => Number(r.balance_cents) < 0);
  const owed = creditor ? Number(creditor.balance_cents) : 0;

  return (
    <div className="space-y-8">
      {pendingRules > 0 && (
        <Link
          href="/dashboard/fixes"
          className="block rounded-md border border-line bg-surface px-5 py-4 transition-colors hover:border-line-strong"
        >
          <p className="text-sm">
            Tens {pendingRules}{" "}
            {pendingRules === 1 ? "fixa pendent" : "fixes pendents"} de generar
            aquest mes
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Fins que no les generis, el resum no compta el lloguer ni les
            subscripcions.
          </p>
        </Link>
      )}

      <section>
        <h1 className="text-xl first-letter:uppercase">{monthName}</h1>

        <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
          <Cell label="Ha entrat">
            <Amount cents={income} currency={currency} className="text-2xl" />
          </Cell>
          <Cell label="Ha sortit">
            <Amount cents={-expense} currency={currency} className="text-2xl" />
          </Cell>
          <Cell label="Queda del mes">
            <Balance cents={net} currency={currency} className="text-2xl" />
          </Cell>
        </div>
      </section>

      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm text-muted">Teniu ara mateix</h2>
        <p className="mt-1">
          <Balance cents={total} currency={currency} className="text-3xl" />
        </p>
      </section>

      {members.length > 1 && (
        <section className="rounded-md border border-line bg-surface p-5">
          <h2>Entre vosaltres</h2>
          {owed === 0 || !creditor || !debtor ? (
            <p className="mt-1 text-sm text-muted">
              Esteu en paus. Cadascú ha posat el mateix a les despeses de casa.
            </p>
          ) : (
            <p className="mt-1 text-sm">
              {nameOf(members, debtor.user_id)} deu{" "}
              <span className="tnum">{formatCents(owed, currency)}</span> a{" "}
              {creditor.user_id === user.id
                ? "tu"
                : nameOf(members, creditor.user_id)}
              .
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
