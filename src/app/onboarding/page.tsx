import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding-form";
import { signOut } from "@/app/login/actions";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership) redirect("/dashboard");

  const defaultName =
    (user.user_metadata?.display_name as string | undefined) ?? "";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-14">
      <header className="mb-8">
        <h1 className="text-2xl leading-tight">Una última cosa</h1>
        <p className="mt-2 text-sm text-muted">
          Els comptes viuen en una llar compartida. Crea'n una o entra a la
          que ja existeix.
        </p>
      </header>

      <OnboardingForm defaultName={defaultName} />

      <form action={signOut} className="mt-10">
        <button type="submit" className="text-sm text-muted underline underline-offset-4">
          Surt de {user.email}
        </button>
      </form>
    </main>
  );
}
