import { createClient } from "@/lib/supabase/server";
import { getContext, accountTypeLabel, nameOf } from "@/lib/household";
import { Balance } from "@/components/amount";
import { AccountForm } from "@/components/account-form";
import { archiveAccount } from "./actions";

export default async function AccountsPage() {
  const { householdId, currency, members, user, household } = await getContext();
  const supabase = await createClient();

  const { data: balances } = await supabase
    .from("account_balances")
    .select("account_id, name, type, owner_id, is_private, balance_cents")
    .eq("household_id", householdId)
    .eq("archived", false)
    .order("name");

  const rows = balances ?? [];
  const total = rows.reduce((s, r) => s + Number(r.balance_cents), 0);
  const alone = members.length < 2;

  return (
    <div className="space-y-6">
      {alone && (
        <section className="rounded-md border border-line bg-surface p-5">
          <h2>Convida la teva parella</h2>
          <p className="mt-1 text-sm text-muted">
            Que es creï un compte i enganxi aquest codi per entrar a la llar.
          </p>
          <p className="tnum mt-4 rounded-sm bg-paper px-3 py-2.5 text-lg tracking-widest">
            {household.join_code}
          </p>
        </section>
      )}

      {rows.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl">Comptes</h1>
            <p className="text-sm text-muted">
              Total <Balance cents={total} currency={currency} />
            </p>
          </div>

          <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-surface">
            {rows.map((a) => (
              <li
                key={a.account_id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate">{a.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {accountTypeLabel(a.type)}
                    {" · "}
                    {a.owner_id === null
                      ? "Conjunt"
                      : a.owner_id === user.id
                        ? a.is_private
                          ? "Teu i privat"
                          : "Teu"
                        : `De ${nameOf(members, a.owner_id)}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <Balance cents={Number(a.balance_cents)} currency={currency} />
                  <form action={archiveAccount}>
                    <input type="hidden" name="id" value={a.account_id} />
                    <button
                      type="submit"
                      className="text-xs text-muted underline underline-offset-4 hover:text-expense"
                    >
                      Arxiva
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.length === 0 && (
        <div>
          <h1 className="text-xl">Comença pels comptes</h1>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Un compte és cada lloc on teniu diners: el banc, la targeta, el que
            porteu a sobre. Els moviments sempre surten o entren d&apos;un
            compte, així que aquest és el primer pas.
          </p>
        </div>
      )}

      <AccountForm />
    </div>
  );
}
