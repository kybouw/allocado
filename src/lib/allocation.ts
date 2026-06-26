import { sumMoney } from "./money";

export type HoldingRow = {
  assetId: string;
  value: string; // numeric as string
  shares: string | null;
};

export type AssetTypeRow = {
  id: string;
  stockPct: string;
  bondPct: string;
  cashPct: string;
  otherPct: string;
};

export type AssetRow = {
  id: string;
  avgDurationYears: string | null;
};

export type TargetRow = {
  stockTargetPct: string;
  bondTargetPct: string;
  cashTargetPct: string;
  otherTargetPct: string;
  effectiveDate: string | null;
};

export type AssetType = "stock" | "bond" | "cash" | "other";

export function computeGoalTotal(holdings: HoldingRow[]): string {
  return sumMoney(holdings.map((h) => h.value));
}

/**
 * Roll holdings up to superclass dollar amounts using the 4 pct columns on each asset.
 * Returns a Map from AssetType → dollar amount.
 */
export function computeTypeDollars(
  holdings: HoldingRow[],
  assetTypes: AssetTypeRow[],
): Map<AssetType, number> {
  const byId = new Map(assetTypes.map((a) => [a.id, a]));
  const out = new Map<AssetType, number>([
    ["stock", 0],
    ["bond", 0],
    ["cash", 0],
    ["other", 0],
  ]);
  for (const h of holdings) {
    const value = Number(h.value);
    if (!Number.isFinite(value)) continue;
    const a = byId.get(h.assetId);
    if (!a) continue;
    out.set("stock", (out.get("stock") ?? 0) + value * (Number(a.stockPct) / 100));
    out.set("bond", (out.get("bond") ?? 0) + value * (Number(a.bondPct) / 100));
    out.set("cash", (out.get("cash") ?? 0) + value * (Number(a.cashPct) / 100));
    out.set("other", (out.get("other") ?? 0) + value * (Number(a.otherPct) / 100));
  }
  return out;
}

/**
 * Convert type-dollar totals into fractions (0..1) of the goal total.
 */
export function computeTypeFractions(
  typeDollars: Map<AssetType, number>,
  goalTotal: string,
): Map<AssetType, number> {
  const total = Number(goalTotal);
  const out = new Map<AssetType, number>();
  if (!Number.isFinite(total) || total === 0) return out;
  for (const [type, dollars] of typeDollars) {
    out.set(type, dollars / total);
  }
  return out;
}

/**
 * Pick the most recent active target row (effectiveDate <= asOf, or null as fallback).
 * Returns fractions (0..1) for each type.
 */
export function resolveActiveTargets(
  targets: TargetRow[],
  asOf: Date = new Date(),
): { stock: number; bond: number; cash: number; other: number } {
  const asOfStr = asOf.toISOString().slice(0, 10);
  const dated = targets
    .filter((r) => r.effectiveDate != null && r.effectiveDate <= asOfStr)
    // biome-ignore lint/style/noNonNullAssertion: filtered to non-null above
    .sort((a, b) => (a.effectiveDate! < b.effectiveDate! ? 1 : -1));
  const pick = dated[0] ?? targets.find((r) => r.effectiveDate == null);
  if (!pick) return { stock: 0, bond: 0, cash: 0, other: 0 };
  return {
    stock: Number(pick.stockTargetPct) / 100,
    bond: Number(pick.bondTargetPct) / 100,
    cash: Number(pick.cashTargetPct) / 100,
    other: Number(pick.otherTargetPct) / 100,
  };
}

/**
 * Weighted average duration across all of a goal's holdings.
 * Bonds use their avgDurationYears; cash and equity count as 0.
 * Weight = holding value. Returns null when no bond exposure exists.
 */
export function computeWeightedBondDuration(
  holdings: HoldingRow[],
  assets: AssetRow[],
): number | null {
  const byId = new Map(assets.map((a) => [a.id, a.avgDurationYears] as const));
  let weightedSum = 0;
  let totalValue = 0;
  let hasBonds = false;
  for (const h of holdings) {
    const v = Number(h.value);
    if (!Number.isFinite(v) || v <= 0) continue;
    totalValue += v;
    const dur = byId.get(h.assetId);
    if (dur == null) continue;
    const d = Number(dur);
    if (!Number.isFinite(d) || d === 0) continue;
    weightedSum += d * v;
    hasBonds = true;
  }
  return hasBonds && totalValue > 0 ? weightedSum / totalValue : null;
}
