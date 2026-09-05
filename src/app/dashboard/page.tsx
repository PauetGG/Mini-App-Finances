import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getContext, nameOf } from "@/lib/household";
import { Amount, Balance } from "@/components/amount";
import { formatCents } from "@/lib/money";

type TxRow = {
  amount_cents: number;
  accounts: { owner_id: string | null } | null;
};

export default async function SummaryPage() {
  const { householdId, currency, members, user, accounts } = await getContext();
  const supabase = await createClient();

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [txRes, balancesRes, settlement, rules, generated] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount_cents, accounts!inner(owner_id)")
      .eq("household_id", householdId)
      .gte("occurred_on", month)
      .lte("occurred_on", monthEnd),
    supabase
      .from("account_balances")
      .select("balance_cents, owner_id")
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

  const txs = (txRes.data ?? []) as unknown as TxRow[];

  /** Suma entrades i sortides d'un subconjunt de moviments. */
  const totals = (rows: TxRow[]) => {
    const income = rows
      .filter((t) => t.amount_cents > 0)
      .reduce((s, t) => s + t.amount_cents, 0);
    const expense = rows
      .filter((t) => t.amount_cents < 0)
      .reduce((s, t) => s + t.amount_cents, 0);
    return { income, expense, net: income + expense };
  };

  const joint = totals(txs.filter((t) => t.accounts?.owner_id === null));
  const mine = totals(txs.filter((t) => t.accounts?.owner_id === user.id));

  const balances = (balancesRes.data ?? []) as {
    balance_cents: number;
    owner_id: string | null;
  }[];
  const jointBalance = balances
    .filter((b) => b.owner_id === null)
    .reduce((s, b) => s + Number(b.balance_cents), 0);
  const myBalance = balances
    .filter((b) => b.owner_id === user.id)
    .reduce((s, b) => s + Number(b.balance_cents), 0);

  const hasPersonal = accounts.some((a) => a.owner_id === user.id);
  const hasJoint = accounts.some((a) => a.owner_id === null);

  const monthName = new Intl.DateTimeFormat("ca-ES", {
    month: "long",
    year: "numeric",
  }).format(now);

  const done = new Set(
    (generated.data ?? []).map((t) => t.recurring_rule_id as string),
  );
  const pendingRules = (rules.data ?? []).filter((r) => !done.has(r.id)).length;

  const settlementRows = settlement.data ?? [];
  const creditor = settlementRows.find((r) => Number(r.balance_cents) > 0);
  const debtor = settlementRows.find((r) => Number(r.balance_cents) < 0);
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

      <h1 className="text-xl first-letter:uppercase">{monthName}</h1>

      {hasJoint && (
        <Block
          title="De casa"
          hint="Els comptes que feu servir tots dos"
          income={joint.income}
          expense={joint.expense}
          net={joint.net}
          balance={jointBalance}
          currency={currency}
        />
      )}

      {hasPersonal && (
        <Block
          title="Els teus"
          hint="Només els teus comptes personals"
          income={mine.income}
          expense={mine.expense}
          net={mine.net}
          balance={myBalance}
          currency={currency}
        />
      )}

      {!hasJoint && !hasPersonal && (
        <p className="text-sm text-muted">
          Els teus comptes són de la teva parella. Mira el resum des del seu
          compte.
        </p>
      )}

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

function Block({
  title,
  hint,
  income,
  expense,
  net,
  balance,
  currency,
}: {
  title: string;
  hint: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
  currency: string;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>
          {title}
          <span className="ml-2 text-sm text-muted">{hint}</span>
        </h2>
        <p className="text-sm text-muted">
          Saldo <Balance cents={balance} currency={currency} />
        </p>
      </div>

      <div className="mt-3 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
        <Cell label="Ha entrat">
          <Amount cents={income} currency={currency} className="text-2xl" />
        </Cell>
        <Cell label="Ha sortit">
          <Amount cents={expense} currency={currency} className="text-2xl" />
        </Cell>
        <Cell label="Queda del mes">
          <Balance cents={net} currency={currency} className="text-2xl" />
        </Cell>
      </div>
    </section>
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