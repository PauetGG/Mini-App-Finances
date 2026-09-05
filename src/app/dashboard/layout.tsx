import Link from "next/link";
import { getContext } from "@/lib/household";
import { signOut } from "@/app/login/actions";
import { QuickAdd } from "@/components/quick-add";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, household, accounts, categories, members } = await getContext();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg">
            {household.name}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-muted underline underline-offset-4"
            >
              Surt
            </button>
          </form>
        </div>

        <nav className="mx-auto flex max-w-3xl gap-6 px-6">
          <Tab href="/dashboard">Resum</Tab>
          <Tab href="/dashboard/moviments">Moviments</Tab>
          <Tab href="/dashboard/fixes">Fixes</Tab>
          <Tab href="/dashboard/comptes">Comptes</Tab>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 pb-28">{children}</main>

      <QuickAdd
        accounts={accounts}
        categories={categories}
        members={members}
        currentUserId={user.id}
      />
    </div>
  );
}

function Tab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-mb-px border-b-2 border-transparent py-2.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {children}
    </Link>
  );
}
