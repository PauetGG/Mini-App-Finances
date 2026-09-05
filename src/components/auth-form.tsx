"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/login/actions";

const empty: AuthState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, empty);

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl leading-tight">
        {mode === "in" ? "Entra als comptes" : "Crea el teu compte"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "in"
          ? "Cada persona entra amb el seu correu."
          : "Després podràs crear una llar o unir-te a la de la teva parella."}
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        {mode === "up" && (
          <Field
            label="Com et dius"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Felipe"
          />
        )}

        <Field
          label="Correu"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correu.com"
        />

        <Field
          label="Contrasenya"
          name="password"
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          hint={mode === "up" ? "Mínim 8 caràcters" : undefined}
        />

        {state.error && (
          <p className="rounded-sm bg-expense-bg px-3 py-2 text-sm text-expense">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p className="rounded-sm bg-income-bg px-3 py-2 text-sm text-income">
            {state.notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-sm bg-ink px-4 py-2.5 text-sm text-paper transition-colors hover:bg-ink-soft disabled:opacity-50"
        >
          {pending
            ? "Un moment…"
            : mode === "in"
              ? "Entra"
              : "Crea el compte"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {mode === "in" ? "Encara no tens compte?" : "Ja en tens un?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="text-ink underline underline-offset-4"
        >
          {mode === "in" ? "Crea'n un" : "Entra"}
        </button>
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-ink-soft">{label}</span>
      <input
        {...props}
        required
        className="mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-sm placeholder:text-muted/60 focus:border-ink focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
