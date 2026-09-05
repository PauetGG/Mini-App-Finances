import { formatCents } from "@/lib/money";

/**
 * Els imports són l'únic lloc de l'app on hi ha color saturat.
 * Verd = entra diners. Vermell = en surten.
 */
export function Amount({
  cents,
  currency = "EUR",
  showSign = true,
  className = "",
}: {
  cents: number;
  currency?: string;
  showSign?: boolean;
  className?: string;
}) {
  const tone =
    cents > 0 ? "text-income" : cents < 0 ? "text-expense" : "text-muted";

  const body = showSign
    ? `${cents > 0 ? "+" : cents < 0 ? "\u2212" : ""}${formatCents(Math.abs(cents), currency)}`
    : formatCents(cents, currency);

  return <span className={`tnum ${tone} ${className}`}>{body}</span>;
}

/** Saldos: sense signe positiu, però en vermell si estan en negatiu. */
export function Balance({
  cents,
  currency = "EUR",
  className = "",
}: {
  cents: number;
  currency?: string;
  className?: string;
}) {
  return (
    <span
      className={`tnum ${cents < 0 ? "text-expense" : "text-ink"} ${className}`}
    >
      {formatCents(cents, currency)}
    </span>
  );
}
