"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTransaction, type TxState } from "@/app/dashboard/moviments/actions";
import type { Account, Category, Member } from "@/lib/constants";

const empty: TxState = {};

export function QuickAdd({
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

  const noAccounts = accounts.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={noAccounts}
        title={noAccounts ? "Primer crea un compte" : undefined}
        className="fixed bottom-6 right-6 z-30 rounded-full bg-ink px-5 py-3.5 text-sm text-paper shadow-lg transition-colors hover:bg-ink-soft disabled:opacity-40 sm:bottom-8 sm:right-8"
      >
        Apunta una despesa
      </button>

      {open && (
        <Sheet
          onClose={() => setOpen(false)}
          accounts={accounts}
          categories={categories}
          members={members}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

function Sheet({
  onClose,
  accounts,
  categories,
  members,
  currentUserId,
}: {
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  members: Member[];
  currentUserId: string;
}) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [state, action, pending] = useActionState(createTransaction, empty);
  const formRef = useRef<HTMLFormElement>(null);

  // Tanca sol quan el moviment s'ha desat
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const visible = categories.filter((c) => c.kind === kind);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Apuntar un moviment"
        className="relative w-full max-w-md rounded-t-lg bg-surface p-6 sm:rounded-lg"
        style={{ animation: "fade-up 180ms ease-out both" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg">Nou moviment</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted underline underline-offset-4"
          >
            Tanca
          </button>
        </div>

        <form ref={formRef} action={action} className="mt-5 space-y-4">
          <input type="hidden" name="kind" value={kind} />

          {/* Despesa o ingrés: canvia el signe i les categories */}
          <div className="grid grid-cols-2 gap-1 rounded-sm bg-paper p-1">
            <Toggle
              active={kind === "expense"}
              onClick={() => setKind("expense")}
              label="Despesa"
            />
            <Toggle
              active={kind === "income"}
              onClick={() => setKind("income")}
              label="Ingrés"
            />
          </div>

          <label className="block">
            <span className="text-sm text-ink-soft">Quant</span>
            <input
              name="amount"
              inputMode="decimal"
              autoFocus
              required
              placeholder="0,00"
              className="tnum mt-1.5 w-full rounded-sm border border-line px-3 py-3 text-2xl focus:border-ink focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-ink-soft">En què</span>
            <input
              name="description"
              placeholder={kind === "expense" ? "Compra setmanal" : "Nòmina"}
              className="mt-1.5 w-full rounded-sm border border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
            />
          </label>

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

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-ink-soft">Quan</span>
              <input
                type="date"
                name="occurred_on"
                defaultValue={today}
                className="tnum mt-1.5 w-full rounded-sm border border-line px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
              />
            </label>

            <Select label="Qui ho paga" name="paid_by" defaultValue={currentUserId}>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name || "Sense nom"}
                </option>
              ))}
            </Select>
          </div>

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
                  Entra al repartiment a mitges. Desmarca-ho si és teva i prou.
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
            className="w-full rounded-sm bg-ink px-4 py-3 text-sm text-paper transition-colors hover:bg-ink-soft disabled:opacity-50"
          >
            {pending ? "Desant…" : "Apunta-ho"}
          </button>
        </form>
      </div>
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
