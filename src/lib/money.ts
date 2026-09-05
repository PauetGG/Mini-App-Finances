/** Utilitats de diners. Tot en cèntims sencers, mai floats. */

export function formatCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatSigned(cents: number, currency = "EUR"): string {
  const s = formatCents(Math.abs(cents), currency);
  return cents < 0 ? `\u2212${s}` : `+${s}`;
}

/**
 * Converteix el que escriu l'usuari a cèntims.
 * Accepta "12,50", "12.50", "1.234,56", "1,234.56", "12".
 * Retorna null si no és un import vàlid.
 */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim().replace(/\s|€/g, "");
  if (!raw) return null;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalised: string;

  if (lastComma > lastDot) {
    // coma decimal: els punts són separadors de milers
    normalised = raw.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalised = raw.replace(/,/g, "");
  } else {
    normalised = raw;
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalised)) return null;

  // Arrodonim sobre el valor ja escalat per evitar errors de coma flotant
  return Math.round(parseFloat(normalised) * 100);
}
