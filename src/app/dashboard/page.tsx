import { requireUserId } from "@allocado/db/auth";
import { listAccounts } from "@allocado/db/queries/accounts";
import {
  listAssetClassAllocationsForUser,
  listAssetClassesForUser,
  listAssetsForUser,
} from "@allocado/db/queries/assets";
import { listGoals } from "@allocado/db/queries/goals";
import { listHoldingsForGoal } from "@allocado/db/queries/holdings";
import { listTargetsForGoal } from "@allocado/db/queries/targets";
import {
  computeClassDollars,
  computeClassFractions,
  computeGoalTotal,
  computeWeightedBondDuration,
  resolveActiveTargets,
} from "@allocado/lib/allocation";
import { formatPercent, formatUSD } from "@allocado/lib/money";
import Link from "next/link";

// Targeted categories: have goal-level targets and show drift
const TARGETED = ["Stocks", "Bonds", "Cash"] as const;
type TargetedName = (typeof TARGETED)[number];

// Informational category: never has a target, only shown when current > 0
const OTHER_NAME = "Other" as const;

type AggregateName = TargetedName | typeof OTHER_NAME;

const COLORS: Record<AggregateName, string> = {
  Stocks: "bg-avocado-500",
  Bonds: "bg-coin",
  Cash: "bg-avocado-200",
  Other: "bg-purple-300",
};

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [goals, accounts, assetClasses, classAllocs, assets] = await Promise.all([
    listGoals(userId),
    listAccounts(userId),
    listAssetClassesForUser(userId),
    listAssetClassAllocationsForUser(userId),
    listAssetsForUser(userId),
  ]);

  // Map aggregate class names → IDs
  const aggregateIds = new Map<AggregateName, string>(
    ([...TARGETED, OTHER_NAME] as AggregateName[]).map((name) => {
      const cls = assetClasses.find((c) => c.name === name);
      return [name, cls?.id ?? ""];
    }),
  );

  const aggregateIdSet = new Set(aggregateIds.values());
  const aggregateAllocs = classAllocs.filter((a) => aggregateIdSet.has(a.assetClassId));

  const goalCards = await Promise.all(
    goals.map(async (g) => {
      const [holdings, targets] = await Promise.all([
        listHoldingsForGoal(userId, g.id),
        listTargetsForGoal(g.id),
      ]);

      const total = computeGoalTotal(holdings);
      const classDollars = computeClassDollars(holdings, aggregateAllocs);
      const current = computeClassFractions(classDollars, total);
      const activeTargets = resolveActiveTargets(targets);

      const targeted = TARGETED.map((name) => {
        const id = aggregateIds.get(name) ?? "";
        return { name, current: current.get(id) ?? 0, target: activeTargets.get(id) ?? 0 };
      });

      const otherId = aggregateIds.get(OTHER_NAME) ?? "";
      const otherCurrent = current.get(otherId) ?? 0;

      const duration = computeWeightedBondDuration(holdings, assets);
      const accountCount = accounts.filter((a) => a.goalId === g.id).length;

      return {
        goal: g,
        total,
        targeted,
        otherCurrent,
        duration,
        accountCount,
        hasHoldings: holdings.length > 0,
      };
    }),
  );

  const portfolioTotal = goalCards.reduce((acc, c) => acc + Number(c.total), 0);

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-avocado-900">Welcome to Allocado</h1>
        <p className="max-w-md text-sm text-avocado-700">
          Start by creating a goal (Retirement, House, Car, etc.). Then add accounts, record
          holdings, and set allocation targets.
        </p>
        <Link href="/goals" className="btn-primary">
          Create your first goal
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-avocado-600">Total portfolio value</p>
        <h1 className="text-4xl font-semibold text-avocado-900">{formatUSD(portfolioTotal)}</h1>
      </header>

      <div className="flex flex-col gap-6">
        {goalCards.map(
          ({ goal, total, targeted, otherCurrent, duration, accountCount, hasHoldings }) => {
            const hasTargets = targeted.some((b) => b.target > 0);

            return (
              <section key={goal.id} className="card flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/goals/${goal.id}`}
                      className="text-xl font-semibold text-avocado-900 hover:underline"
                    >
                      {goal.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-avocado-600">
                      <span>
                        {accountCount} account{accountCount === 1 ? "" : "s"}
                      </span>
                      {goal.targetDate && <span>target {goal.targetDate}</span>}
                      {duration != null && <span>avg bond dur. {duration.toFixed(2)} yr</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-avocado-600">Total</div>
                    <div className="text-2xl font-semibold text-avocado-900">
                      {formatUSD(total)}
                    </div>
                  </div>
                </div>

                {!hasHoldings ? (
                  <p className="text-sm text-avocado-700">
                    No holdings yet.{" "}
                    <Link href="/accounts" className="underline">
                      Add holdings →
                    </Link>
                  </p>
                ) : (
                  <AllocationBars
                    targeted={targeted}
                    otherCurrent={otherCurrent}
                    hasTargets={hasTargets}
                    goalId={goal.id}
                  />
                )}
              </section>
            );
          },
        )}
      </div>
    </div>
  );
}

type TargetedSlice = { name: TargetedName; current: number; target: number };

const ROW_H = "h-9";

function AllocationBars({
  targeted,
  otherCurrent,
  hasTargets,
  goalId,
}: {
  targeted: TargetedSlice[];
  otherCurrent: number;
  hasTargets: boolean;
  goalId: string;
}) {
  const showOther = otherCurrent > 0.001;

  // Current bar includes Other if present
  const currentSlices: Array<{ name: AggregateName; pct: number }> = [
    ...targeted.map((b) => ({ name: b.name as AggregateName, pct: b.current })),
    ...(showOther ? [{ name: OTHER_NAME as AggregateName, pct: otherCurrent }] : []),
  ];

  // Target bar is targeted-only (Other target is always 0)
  const targetSlices = targeted.map((b) => ({
    name: b.name as AggregateName,
    pct: b.target,
  }));

  // Extra column when Other is present
  const colClass = showOther ? "grid-cols-4" : "grid-cols-3";
  const tableWidth = showOther ? "w-64" : "w-52";

  return (
    <div className="flex items-start gap-6">
      {/* ── Left: labeled bars ───────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 h-5" />

        <div className={`${ROW_H} flex items-center gap-3`}>
          <span className="w-14 shrink-0 text-xs text-avocado-500">Current</span>
          <StackedBar slices={currentSlices} />
        </div>

        {hasTargets ? (
          <div className={`${ROW_H} flex items-center gap-3`}>
            <span className="w-14 shrink-0 text-xs text-avocado-500">Target</span>
            <StackedBar slices={targetSlices} muted />
          </div>
        ) : (
          <div className={`${ROW_H} flex items-center gap-3`}>
            <span className="w-14 shrink-0 text-xs text-avocado-500">Target</span>
            <Link href={`/goals/${goalId}`} className="text-xs text-avocado-600 underline">
              Set targets →
            </Link>
          </div>
        )}

        {hasTargets && (
          <div className={`${ROW_H} flex items-center gap-3`}>
            <span className="w-14 shrink-0 text-xs text-avocado-500">Drift</span>
          </div>
        )}
      </div>

      {/* ── Right: numbers table ─────────────────────────────────────── */}
      <div className={`${tableWidth} shrink-0`}>
        {/* Column headers */}
        <div className={`mb-0.5 grid h-5 ${colClass} items-end text-center`}>
          {targeted.map((b) => (
            <span key={b.name} className="text-xs font-medium text-avocado-600">
              {b.name}
            </span>
          ))}
          {showOther && <span className="text-xs font-medium text-purple-500">Other</span>}
        </div>

        {/* Current */}
        <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
          {targeted.map((b) => (
            <span key={b.name} className="font-medium text-avocado-900">
              {formatPercent(b.current)}
            </span>
          ))}
          {showOther && (
            <span className="font-medium text-purple-700">{formatPercent(otherCurrent)}</span>
          )}
        </div>

        {/* Target */}
        <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
          {targeted.map((b) => (
            <span key={b.name} className="text-avocado-600">
              {hasTargets ? formatPercent(b.target) : "—"}
            </span>
          ))}
          {showOther && <span className="text-avocado-400">—</span>}
        </div>

        {/* Drift */}
        {hasTargets && (
          <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
            {targeted.map((b) => {
              const drift = b.current - b.target;
              return (
                <span
                  key={b.name}
                  className={`font-medium ${
                    Math.abs(drift) < 0.005
                      ? "text-avocado-500"
                      : drift > 0
                        ? "text-amber-700"
                        : "text-red-600"
                  }`}
                >
                  {drift > 0 ? "+" : ""}
                  {formatPercent(drift)}
                </span>
              );
            })}
            {showOther && <span className="text-avocado-400">—</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function StackedBar({
  slices,
  muted = false,
}: {
  slices: Array<{ name: AggregateName; pct: number }>;
  muted?: boolean;
}) {
  const total = slices.reduce((s, sl) => s + sl.pct, 0);
  if (total === 0) return <div className="h-6 flex-1 rounded bg-avocado-100" />;

  return (
    <div className="flex h-6 min-w-0 flex-1 overflow-hidden rounded">
      {slices.map((sl) => {
        if (sl.pct <= 0) return null;
        return (
          <div
            key={sl.name}
            className={`${COLORS[sl.name]} ${muted ? "opacity-40" : ""} transition-all`}
            style={{ width: `${(sl.pct / total) * 100}%` }}
          />
        );
      })}
    </div>
  );
}
