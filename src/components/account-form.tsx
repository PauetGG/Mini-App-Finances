"use client";

import { useActionState, useEffect, useState } from "react";
import { createAccount, type AccountState } from "@/app/dashboard/comptes/actions";
import { ACCOUNT_TYPES } from "@/lib/constants";

const empty: AccountState = {};

export function AccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createAccount, empty);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-line-strong px-4 py-4 text-sm text-muted transition-colors hover:border-ink hover:text-ink"
      >
        Afegeix un compte
      </button>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2>Nou compte</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted underline underline-offset-4"
        >
          Cancel·la
        </button>
      </div>

      <form action={action} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm text-ink-soft">Nom</span>
          <input
            name="name"
            required
            autoFocus
            placeholder="CaixaBank corrent"
            className="mt-1.5 w-full rounded-sm border border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-ink-soft">Tipus</span>
            <select
              name="type"
              className="mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-ink-soft">Saldo d&apos;avui</span>
            <input
              name="opening"
              inputMode="decimal"
              defaultValue="0"
              className="tnum mt-1.5 w-full rounded-sm border border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm text-ink-soft">De qui és</legend>
          <div className="mt-1.5 space-y-2">
            <Radio
              name="scope"
              value="joint"
              defaultChecked
              title="Conjunt"
              hint="El veieu i el feu servir tots dos."
            />
            <Radio
              name="scope"
              value="mine"
              title="Meu"
              hint="És teu, però ella el veu."
            />
            <Radio
              name="scope"
              value="private"
              title="Meu i privat"
              hint="Ella no el veu ni sap que existeix."
            />
          </div>
        </fieldset>

        {state.error && (
          <p className="rounded-sm bg-expense-bg px-3 py-2 text-sm text-expense">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-sm bg-ink px-4 py-2.5 text-sm text-paper transition-colors hover:bg-ink-soft disabled:opacity-50"
        >
          {pending ? "Desant…" : "Crea el compte"}
        </button>
      </form>
    </div>
  );
}

function Radio({
  title,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  title: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input
        type="radio"
        {...props}
        className="mt-0.5 accent-[var(--color-ink)]"
      />
      <span className="text-sm">
        {title}
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}
