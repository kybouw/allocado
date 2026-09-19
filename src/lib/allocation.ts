import { sumMoney } from "./money";

export type HoldingRow = {
  assetId: string;
  value: string; // numeric as string
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
): { stock: number; bond: number; cash: number } {
  const asOfStr = asOf.toISOString().slice(0, 10);
  const dated = targets
    .filter((r) => r.effectiveDate != null && r.effectiveDate <= asOfStr)
    // biome-ignore lint/style/noNonNullAssertion: filtered to non-null above
    .sort((a, b) => (a.effectiveDate! < b.effectiveDate! ? 1 : -1));
  const pick = dated[0] ?? targets.find((r) => r.effectiveDate == null);
  if (!pick) return { stock: 0, bond: 0, cash: 0 };
  return {
    stock: Number(pick.stockTargetPct) / 100,
    bond: Number(pick.bondTargetPct) / 100,
    cash: Number(pick.cashTargetPct) / 100,
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

export type ProvenanceHolding = {
  accountId: string;
  assetId: string;
  ticker: string;
  assetName: string;
  value: string;
};

export type ProvenanceEntry = {
  accountId: string;
  assetId: string;
  ticker: string;
  assetName: string;
  /** Dollars this holding contributes to this asset class, after its class ratio. */
  dollars: number;
  /** Share of the class this holding accounts for (0..1). */
  shareOfClass: number;
};

/**
 * Break each asset class down into the holdings that produced it.
 *
 * A fund tagged 60% stocks / 40% bonds contributes to both, so one holding can
 * appear under more than one class with a different dollar amount each time —
 * which is exactly the question "where did this cash come from?" needs answered.
 */
export function computeTypeProvenance(
  holdings: ProvenanceHolding[],
  assetTypes: AssetTypeRow[],
): Map<AssetType, ProvenanceEntry[]> {
  const byId = new Map(assetTypes.map((a) => [a.id, a]));
  const out = new Map<AssetType, ProvenanceEntry[]>([
    ["stock", []],
    ["bond", []],
    ["cash", []],
    ["other", []],
  ]);

  for (const h of holdings) {
    const value = Number(h.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    const a = byId.get(h.assetId);
    if (!a) continue;

    const ratios: Array<[AssetType, string]> = [
      ["stock", a.stockPct],
      ["bond", a.bondPct],
      ["cash", a.cashPct],
      ["other", a.otherPct],
    ];

    for (const [type, pct] of ratios) {
      const dollars = value * (Number(pct) / 100);
      if (!Number.isFinite(dollars) || dollars <= 0.005) continue;
      out.get(type)?.push({
        accountId: h.accountId,
        assetId: h.assetId,
        ticker: h.ticker,
        assetName: h.assetName,
        dollars,
        shareOfClass: 0,
      });
    }
  }

  // Second pass: shares are only knowable once each class total is known.
  for (const [, entries] of out) {
    const classTotal = entries.reduce((acc, e) => acc + e.dollars, 0);
    for (const e of entries) {
      e.shareOfClass = classTotal > 0 ? e.dollars / classTotal : 0;
    }
    entries.sort((a, b) => b.dollars - a.dollars);
  }

  return out;
}

/**
 * Whole years from today until a goal's target date. Null when undated,
 * clamped at zero for dates that have already passed.
 */
export function yearsUntil(targetDate: string | null, asOf: Date = new Date()): number | null {
  if (!targetDate) return null;
  const target = new Date(`${targetDate}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - asOf.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 365.25));
}
