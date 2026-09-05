"use client";

import { useActionState, useEffect, useState } from "react";
import { createRule, type RuleState } from "@/app/dashboard/fixes/actions";
import type { Account, Category, Member } from "@/lib/household";

const empty: RuleState = {};

export function RecurringForm({
  accounts,
  categories,
  members,
  currentUserId,
}: {
  accounts: Account[];
  categories: Category[];
  members: Member[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [state, action, pending] = useActionState(createRule, empty);

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
        Afegeix una despesa fixa
      </button>
    );
  }

  const visible = categories.filter((c) => c.kind === kind);

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2>Nova fixa</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted underline underline-offset-4"
        >
          Cancel·la
        </button>
      </div>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="kind" value={kind} />

        <div className="grid grid-cols-2 gap-1 rounded-sm bg-paper p-1">
          <Toggle
            active={kind === "expense"}
            onClick={() => setKind("expense")}
            label="Surt cada mes"
          />
          <Toggle
            active={kind === "income"}
            onClick={() => setKind("income")}
            label="Entra cada mes"
          />
        </div>

        <label className="block">
          <span className="text-sm text-ink-soft">Què és</span>
          <input
            name="description"
            required
            autoFocus
            placeholder={kind === "expense" ? "Lloguer" : "Nòmina"}
            className="mt-1.5 w-full rounded-sm border border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-ink-soft">Quant</span>
            <input
              name="amount"
              inputMode="decimal"
              required
              placeholder="850"
              className="tnum mt-1.5 w-full rounded-sm border border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-ink-soft">Quin dia del mes</span>
            <input
              name="day_of_month"
              type="number"
              min={1}
              max={31}
              defaultValue={1}
              required
              className="tnum mt-1.5 w-full rounded-sm border border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Compte" name="account_id" required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>

          <Select label="Categoria" name="category_id">
            <option value="">Sense categoria</option>
            {visible.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <Select label="Qui ho paga" name="paid_by" defaultValue={currentUserId}>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.display_name || "Sense nom"}
            </option>
          ))}
        </Select>

        {kind === "expense" && (
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              name="shared"
              defaultChecked
              className="mt-0.5 accent-[var(--color-ink)]"
            />
            <span className="text-sm">
              És de casa
              <span className="block text-xs text-muted">
                Entra al repartiment a mitges cada mes.
              </span>
            </span>
          </label>
        )}

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
          {pending ? "Desant…" : "Desa la fixa"}
        </button>
      </form>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-sm py-2 text-sm transition-colors ${
        active ? "bg-surface text-ink shadow-sm" : "text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-soft">{label}</span>
      <select
        {...props}
        className="mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}
