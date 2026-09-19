const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const PCT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatUSD(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return USD.format(n);
}

export function formatPercent(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  return PCT.format(fraction);
}

/** Normalize user input like "1,234.56" or "$1,234.56" → "1234.56" suitable for numeric(19,4). */
export function parseMoneyInput(input: string): string {
  const cleaned = input.replace(/[,$\s]/g, "");
  if (cleaned === "" || Number.isNaN(Number(cleaned))) {
    throw new Error(`invalid money input: ${input}`);
  }
  return cleaned;
}

/**
 * Clamp a raw text-field value to at most `maxDecimals` fraction digits as the
 * user types (dollar amounts don't need the sub-cent precision the DB keeps
 * around for aggregation). Keeps a trailing "." while mid-edit and drops any
 * non-numeric characters.
 */
export function limitDecimalInput(raw: string, maxDecimals = 2): string {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replaceAll(".", "");
  }
  const [whole, frac] = cleaned.split(".");
  return frac === undefined ? cleaned : `${whole}.${frac.slice(0, maxDecimals)}`;
}

/** Format a numeric(19,4) DB string down to 2 decimals for a plain money input field. */
export function formatMoneyForInput(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : value;
}

/** Convert an API-provided float (e.g. Plaid) to a string suitable for numeric(19,4). */
export function moneyFromNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new Error(`invalid money value: ${n}`);
  }
  return n.toFixed(4);
}

/** Sum an array of decimal-string amounts without losing precision for typical portfolio sizes. */
export function sumMoney(values: Array<string | null | undefined>): string {
  let total = 0;
  for (const v of values) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) total += n;
  }
  return total.toFixed(4);
}
