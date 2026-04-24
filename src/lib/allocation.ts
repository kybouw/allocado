import { sumMoney } from "./money";

export type HoldingRow = {
  assetId: string;
  value: string; // numeric as string
  shares: string | null;
};

export type ClassAllocationRow = {
  assetId: string;
  assetClassId: string;
  ratio: string; // 0–100 as string
};

export type AssetRow = {
  id: string;
  avgDurationYears: string | null;
};

export type TargetRow = {
  assetClassId: string;
  targetPct: string; // 0–100 as string
  effectiveDate: string | null;
};

export function computeGoalTotal(holdings: HoldingRow[]): string {
  return sumMoney(holdings.map((h) => h.value));
}

/**
 * Roll holdings up to asset-class dollar amounts via the allocation ratio table.
 * Returns a Map from assetClassId → dollar amount contributed.
 *
 * Note: since classes are many-to-many (VTI tagged US 100 + Large-Cap 82 + Mid-Cap 15),
 * dollar totals across all classes can sum to more than the goal total. Compare within
 * a "dimension" (e.g., US vs Foreign) for meaningful percentages.
 */
export function computeClassDollars(
  holdings: HoldingRow[],
  allocations: ClassAllocationRow[],
): Map<string, number> {
  const byAsset = new Map<string, Array<{ classId: string; ratio: number }>>();
  for (const a of allocations) {
    const list = byAsset.get(a.assetId) ?? [];
    list.push({ classId: a.assetClassId, ratio: Number(a.ratio) });
    byAsset.set(a.assetId, list);
  }

  const out = new Map<string, number>();
  for (const h of holdings) {
    const value = Number(h.value);
    if (!Number.isFinite(value)) continue;
    const classes = byAsset.get(h.assetId) ?? [];
    for (const { classId, ratio } of classes) {
      const contribution = value * (ratio / 100);
      out.set(classId, (out.get(classId) ?? 0) + contribution);
    }
  }
  return out;
}

/**
 * Convert class-dollar totals into fractions (0..1) of the goal total.
 */
export function computeClassFractions(
  classDollars: Map<string, number>,
  goalTotal: string,
): Map<string, number> {
  const total = Number(goalTotal);
  const out = new Map<string, number>();
  if (!Number.isFinite(total) || total === 0) return out;
  for (const [classId, dollars] of classDollars) {
    out.set(classId, dollars / total);
  }
  return out;
}

/**
 * For each target, returns { target, current, drift } where drift = current - target (in fractions).
 */
export function computeDrift(
  current: Map<string, number>,
  targets: TargetRow[],
  asOf: Date = new Date(),
): Map<string, { target: number; current: number; drift: number }> {
  const active = resolveActiveTargets(targets, asOf);
  const out = new Map<string, { target: number; current: number; drift: number }>();
  const classIds = new Set<string>([...active.keys(), ...current.keys()]);
  for (const classId of classIds) {
    const target = active.get(classId) ?? 0;
    const curr = current.get(classId) ?? 0;
    out.set(classId, { target, current: curr, drift: curr - target });
  }
  return out;
}

/** For a given asset class, pick the most recent target row with effective_date <= asOf,
 * falling back to the row with effective_date = null. Returns fractions (0..1). */
export function resolveActiveTargets(
  targets: TargetRow[],
  asOf: Date = new Date(),
): Map<string, number> {
  const asOfStr = asOf.toISOString().slice(0, 10);

  const byClass = new Map<string, TargetRow[]>();
  for (const t of targets) {
    const list = byClass.get(t.assetClassId) ?? [];
    list.push(t);
    byClass.set(t.assetClassId, list);
  }

  const out = new Map<string, number>();
  for (const [classId, rows] of byClass) {
    const dated = rows
      .filter((r) => r.effectiveDate != null && r.effectiveDate <= asOfStr)
      // biome-ignore lint/style/noNonNullAssertion: filtered to non-null above
      .sort((a, b) => (a.effectiveDate! < b.effectiveDate! ? 1 : -1));
    const pick = dated[0] ?? rows.find((r) => r.effectiveDate == null);
    if (pick) out.set(classId, Number(pick.targetPct) / 100);
  }
  return out;
}

/**
 * Weighted average bond duration across a goal's holdings.
 * Uses asset.avgDurationYears directly (falls back to 0 for equities/cash).
 * Weight = holding value. Returns years or null if no bond exposure.
 */
export function computeWeightedBondDuration(
  holdings: HoldingRow[],
  assets: AssetRow[],
): number | null {
  const byId = new Map(assets.map((a) => [a.id, a.avgDurationYears] as const));
  let weightedSum = 0;
  let totalWeight = 0;
  for (const h of holdings) {
    const dur = byId.get(h.assetId);
    if (dur == null) continue;
    const d = Number(dur);
    const v = Number(h.value);
    if (!Number.isFinite(d) || !Number.isFinite(v) || d === 0) continue;
    weightedSum += d * v;
    totalWeight += v;
  }
  return totalWeight === 0 ? null : weightedSum / totalWeight;
}
