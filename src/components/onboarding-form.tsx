"use client";

import { useActionState, useState } from "react";
import {
  createHousehold,
  joinHousehold,
  type OnboardState,
} from "@/app/onboarding/actions";

const empty: OnboardState = {};

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [choice, setChoice] = useState<"create" | "join" | null>(null);

  if (!choice) {
    return (
      <div className="space-y-3">
        <Choice
          title="Comença una llar nova"
          body="Crea l'espai compartit i convida la teva parella amb un codi."
          onClick={() => setChoice("create")}
        />
        <Choice
          title="Uneix-te a una llar"
          body="La teva parella ja n'ha creat una i t'ha passat un codi."
          onClick={() => setChoice("join")}
        />
      </div>
    );
  }

  return choice === "create" ? (
    <CreateForm defaultName={defaultName} onBack={() => setChoice(null)} />
  ) : (
    <JoinForm defaultName={defaultName} onBack={() => setChoice(null)} />
  );
}

function CreateForm({
  defaultName,
  onBack,
}: {
  defaultName: string;
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState(createHousehold, empty);

  return (
    <Wrapper
      title="Comença una llar nova"
      onBack={onBack}
      action={action}
      state={state}
      pending={pending}
      submitLabel="Crea la llar"
    >
      <Field
        label="Com es diu la llar"
        name="name"
        placeholder="Casa nostra"
        defaultValue=""
      />
      <Field
        label="Com vols que et vegi ella"
        name="display_name"
        defaultValue={defaultName}
        required={false}
      />
    </Wrapper>
  );
}

function JoinForm({
  defaultName,
  onBack,
}: {
  defaultName: string;
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState(joinHousehold, empty);

  return (
    <Wrapper
      title="Uneix-te a una llar"
      onBack={onBack}
      action={action}
      state={state}
      pending={pending}
      submitLabel="Entra a la llar"
    >
      <Field
        label="Codi de la llar"
        name="code"
        placeholder="a1b2c3d4"
        className="tnum tracking-widest"
      />
      <Field
        label="Com vols que et vegi"
        name="display_name"
        defaultValue={defaultName}
        required={false}
      />
    </Wrapper>
  );
}

function Wrapper({
  title,
  onBack,
  action,
  state,
  pending,
  submitLabel,
  children,
}: {
  title: string;
  onBack: () => void;
  action: (fd: FormData) => void;
  state: OnboardState;
  pending: boolean;
  submitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted underline underline-offset-4"
      >
        Enrere
      </button>

      <h2 className="mt-4 text-xl">{title}</h2>

      <form action={action} className="mt-6 space-y-4">
        {children}

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
          {pending ? "Un moment…" : submitLabel}
        </button>
      </form>
    </div>
  );
}

function Choice({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md border border-line bg-surface p-5 text-left transition-colors hover:border-line-strong"
    >
      <span className="block">{title}</span>
      <span className="mt-1 block text-sm text-muted">{body}</span>
    </button>
  );
}

function Field({
  label,
  className = "",
  required = true,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-soft">{label}</span>
      <input
        {...props}
        required={required}
        className={`mt-1.5 w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-sm placeholder:text-muted/60 focus:border-ink focus:outline-none ${className}`}
      />
    </label>
  );
}
