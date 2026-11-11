// The currencies a visitor can view prices in. Listings keep the operator's own currency; this is
// only a display conversion, so converted prices are always marked as approximate.
export const CURRENCIES = [
  ["USD", "$"],
  ["GBP", "£"],
  ["EUR", "€"],
  ["AUD", "A$"],
  ["CAD", "C$"],
  ["CHF", "CHF"],
  ["NZD", "NZ$"],
  ["SGD", "S$"],
  ["INR", "₹"],
] as const;

// units of each currency per one euro
export type Rates = Record<string, number>;

// Daily European Central Bank reference rates (frankfurter.dev: free, no key), fetched at most once
// a day. Returns null when the service can't be reached; prices then stay in the listing's currency.
export async function getRates(): Promise<Rates | null> {
  try {
    const symbols = CURRENCIES.map(([code]) => code).filter((c) => c !== "EUR").join(",");
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${symbols}`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const { rates } = (await res.json()) as { rates?: Rates };
    return rates && Object.keys(rates).length ? { EUR: 1, ...rates } : null;
  } catch {
    return null;
  }
}

// null when either currency has no rate (an operator pricing in a currency the ECB doesn't publish)
export function convert(amount: number, from: string, to: string, rates: Rates | null) {
  if (from === to) return amount;
  if (!rates?.[from] || !rates[to]) return null;
  return (amount / rates[from]) * rates[to];
}
