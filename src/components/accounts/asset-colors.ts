/**
 * Palette for per-asset bar slices. Classes must stay plain string literals so
 * Tailwind's scanner picks them up. Ordered so early picks contrast well.
 */
const ASSET_PALETTE = [
  "bg-avocado-500",
  "bg-coin",
  "bg-purple-300",
  "bg-sky-400",
  "bg-rose-300",
  "bg-teal-400",
  "bg-amber-300",
  "bg-indigo-300",
  "bg-lime-300",
  "bg-orange-400",
  "bg-stone-300",
  "bg-avocado-200",
];

function hashTicker(ticker: string) {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) {
    h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministic color per ticker: each ticker hashes to a preferred palette
 * index, so the same ticker gets the same color on every card and across
 * reloads. Within one account, tickers are assigned in alphabetical order and
 * linear-probe to the next free index to avoid collisions. With more tickers
 * than palette entries, colors repeat (the bar's separator gaps keep repeated
 * colors readable).
 */
export function assignAssetColors(tickers: string[]): Map<string, string> {
  const sorted = [...tickers].sort();
  const used = new Set<number>();
  const colors = new Map<string, string>();

  for (const ticker of sorted) {
    let idx = hashTicker(ticker) % ASSET_PALETTE.length;
    if (used.size < ASSET_PALETTE.length) {
      while (used.has(idx)) idx = (idx + 1) % ASSET_PALETTE.length;
    }
    used.add(idx);
    colors.set(ticker, ASSET_PALETTE[idx]);
  }
  return colors;
}
