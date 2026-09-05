import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";
import { Venn } from "@/components/venn";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panell del concepte */}
      <section className="flex flex-col justify-between bg-ink px-8 py-10 text-paper lg:px-14 lg:py-14">
        <p className="text-sm tracking-wide">Comptes</p>

        <div className="my-10 lg:my-0">
          <Venn className="w-full max-w-md text-paper" />
          <p className="mt-8 max-w-sm text-lg leading-snug text-paper/85">
            Cadascú porta els seus diners. Les despeses de casa es reparteixen
            a mitges i sempre saps qui deu a qui.
          </p>
        </div>

        <p className="hidden text-sm text-paper/50 lg:block">
          Les vostres dades només les veieu vosaltres dos.
        </p>
      </section>

      {/* Panell del formulari */}
      <section className="flex items-center justify-center px-8 py-14">
        <AuthForm />
      </section>
    </main>
  );
}
