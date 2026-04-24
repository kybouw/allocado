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
