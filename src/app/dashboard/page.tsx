import { Card, CardContent, CardHeader } from "@allocado/components/ui/card";
import { requireUserId } from "@allocado/db/auth";
import { listAccounts } from "@allocado/db/queries/accounts";
import { listAssetsForUser } from "@allocado/db/queries/assets";
import { listGoals } from "@allocado/db/queries/goals";
import { listHoldingsForGoal } from "@allocado/db/queries/holdings";
import { listTargetsForGoal } from "@allocado/db/queries/targets";
import {
  computeGoalTotal,
  computeTypeDollars,
  computeTypeFractions,
  computeWeightedBondDuration,
  resolveActiveTargets,
} from "@allocado/lib/allocation";
import { formatPercent, formatUSD } from "@allocado/lib/money";
import Link from "next/link";

type TypeName = "Stocks" | "Bonds" | "Cash" | "Other";
type TypeKey = "stock" | "bond" | "cash" | "other";
const ALL_TYPE_KEYS = ["stock", "bond", "cash", "other"] as const satisfies TypeKey[];
const TYPE_DISPLAY: Record<TypeKey, TypeName> = {
  stock: "Stocks",
  bond: "Bonds",
  cash: "Cash",
  other: "Other",
};

const COLORS: Record<TypeName, string> = {
  Stocks: "bg-avocado-500",
  Bonds: "bg-coin",
  Cash: "bg-avocado-200",
  Other: "bg-purple-300",
};

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [goals, accounts, assets] = await Promise.all([
    listGoals(userId),
    listAccounts(userId),
    listAssetsForUser(userId),
  ]);

  const goalCards = await Promise.all(
    goals.map(async (g) => {
      const [holdings, targets] = await Promise.all([
        listHoldingsForGoal(userId, g.id),
        listTargetsForGoal(g.id),
      ]);

      const total = computeGoalTotal(holdings);
      const typeDollars = computeTypeDollars(holdings, assets);
      const current = computeTypeFractions(typeDollars, total);
      const activeTargets = resolveActiveTargets(targets);

      const targeted = ALL_TYPE_KEYS.map((key) => ({
        name: TYPE_DISPLAY[key],
        current: current.get(key) ?? 0,
        target: activeTargets[key],
      }));

      const duration = computeWeightedBondDuration(holdings, assets);
      const goalAccts = accounts.filter((a) => a.goalId === g.id);
      const accountCount = goalAccts.length;

      const holdingsByAccount = new Map<string, typeof holdings>();
      for (const h of holdings) {
        const list = holdingsByAccount.get(h.accountId) ?? [];
        list.push(h);
        holdingsByAccount.set(h.accountId, list);
      }
      const fundedAccounts = goalAccts.filter((a) => holdingsByAccount.has(a.id));

      const accountBreakdowns: AccountBreakdown[] =
        fundedAccounts.length >= 2
          ? fundedAccounts.map((acct) => {
              const acctHoldings = holdingsByAccount.get(acct.id) ?? [];
              const acctTotal = computeGoalTotal(acctHoldings);
              const acctDollars = computeTypeDollars(acctHoldings, assets);
              const acctCurrent = computeTypeFractions(acctDollars, acctTotal);
              const acctTargeted = ALL_TYPE_KEYS.map((key) => ({
                name: TYPE_DISPLAY[key],
                current: acctCurrent.get(key) ?? 0,
                target: activeTargets[key],
              }));
              return {
                accountId: acct.id,
                accountName: acct.name,
                accountType: acct.accountType,
                total: acctTotal,
                targeted: acctTargeted,
              };
            })
          : [];

      return {
        goal: g,
        total,
        typeDollars,
        holdings,
        targeted,
        duration,
        accountCount,
        accountBreakdowns,
        hasHoldings: holdings.length > 0,
      };
    }),
  );

  const portfolioTotal = goalCards.reduce((acc, c) => acc + Number(c.total), 0);

  const totalTypeDollars = new Map<TypeKey, number>([
    ["stock", 0],
    ["bond", 0],
    ["cash", 0],
    ["other", 0],
  ]);
  for (const card of goalCards) {
    for (const [type, dollars] of card.typeDollars) {
      totalTypeDollars.set(type as TypeKey, (totalTypeDollars.get(type as TypeKey) ?? 0) + dollars);
    }
  }
  const portfolioFractions = computeTypeFractions(totalTypeDollars, String(portfolioTotal));
  const portfolioTargeted = ALL_TYPE_KEYS.map((key) => ({
    name: TYPE_DISPLAY[key],
    current: portfolioFractions.get(key) ?? 0,
  }));
  const portfolioHasAllocation = portfolioTargeted.some((b) => b.current > 0);

  const allHoldings = goalCards.flatMap((c) => c.holdings);
  const portfolioDuration = computeWeightedBondDuration(allHoldings, assets);

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
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-avocado-600">Total portfolio value</p>
          <h1 className="text-4xl font-semibold text-avocado-900">{formatUSD(portfolioTotal)}</h1>
          {portfolioDuration != null && (
            <p
              className="text-xs text-avocado-600"
              title="Weighted average duration across all holdings"
            >
              avg duration {portfolioDuration.toFixed(2)} yr
            </p>
          )}
        </div>
        {portfolioHasAllocation && <PortfolioAllocationBars targeted={portfolioTargeted} />}
      </header>

      <div className="flex flex-col gap-6">
        {goalCards.map(
          ({ goal, total, targeted, duration, accountCount, accountBreakdowns, hasHoldings }) => {
            const hasTargets = targeted.some((b) => b.target > 0);

            return (
              <Card key={goal.id}>
                <CardHeader>
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
                        {duration != null && (
                          <span title="Weighted average duration across all holdings — bonds at their duration, cash and equity counted as 0 years">
                            avg duration {duration.toFixed(2)} yr
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-avocado-600">Total</div>
                      <div className="text-2xl font-semibold text-avocado-900">
                        {formatUSD(total)}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {!hasHoldings ? (
                    <p className="text-sm text-avocado-700">
                      No holdings yet.{" "}
                      <Link href="/accounts" className="underline">
                        Add holdings →
                      </Link>
                    </p>
                  ) : (
                    <>
                      <AllocationBars
                        targeted={targeted}
                        hasTargets={hasTargets}
                        goalId={goal.id}
                      />
                      {accountBreakdowns.length >= 2 && (
                        <AccountBreakdownTable accounts={accountBreakdowns} />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          },
        )}
      </div>
    </div>
  );
}

type AllocationSlice = { name: TypeName; current: number; target: number };
type PortfolioSlice = { name: TypeName; current: number };

type AccountBreakdown = {
  accountId: string;
  accountName: string;
  accountType: string;
  total: string;
  targeted: AllocationSlice[];
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  taxable: "Taxable",
  ira: "IRA",
  roth_ira: "Roth IRA",
  "401k": "401(k)",
  hsa: "HSA",
  other: "Other",
};

const ROW_H = "h-9";

function PortfolioAllocationBars({ targeted }: { targeted: PortfolioSlice[] }) {
  const slices = targeted.map((b) => ({ name: b.name, pct: b.current }));
  const legendItems = slices.filter((s) => s.pct > 0.001);

  return (
    <div className="flex flex-col gap-2">
      <StackedBar slices={slices} />
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm ${COLORS[item.name]}`} />
            <span className="text-xs text-avocado-700">
              {item.name} {formatPercent(item.pct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllocationBars({
  targeted,
  hasTargets,
  goalId,
}: {
  targeted: AllocationSlice[];
  hasTargets: boolean;
  goalId: string;
}) {
  const other = targeted.find((b) => b.name === "Other");
  const showOther = (other?.current ?? 0) > 0.001 || (other?.target ?? 0) > 0.001;
  const visibleSlices = showOther ? targeted : targeted.filter((b) => b.name !== "Other");
  const colClass = showOther ? "grid-cols-4" : "grid-cols-3";
  const tableWidth = showOther ? "w-64" : "w-52";

  const currentSlices = visibleSlices.map((b) => ({ name: b.name, pct: b.current }));
  const targetSlices = visibleSlices.map((b) => ({ name: b.name, pct: b.target }));

  return (
    <div className="flex items-start gap-6">
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

      <div className={`${tableWidth} shrink-0`}>
        <div className={`mb-0.5 grid h-5 ${colClass} items-end text-center`}>
          {visibleSlices.map((b) => (
            <span
              key={b.name}
              className={`text-xs font-medium ${b.name === "Other" ? "text-purple-500" : "text-avocado-600"}`}
            >
              {b.name}
            </span>
          ))}
        </div>

        <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
          {visibleSlices.map((b) => (
            <span
              key={b.name}
              className={`font-medium ${b.name === "Other" ? "text-purple-700" : "text-avocado-900"}`}
            >
              {formatPercent(b.current)}
            </span>
          ))}
        </div>

        <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
          {visibleSlices.map((b) => (
            <span key={b.name} className="text-avocado-600">
              {hasTargets ? formatPercent(b.target) : "—"}
            </span>
          ))}
        </div>

        {hasTargets && (
          <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
            {visibleSlices.map((b) => {
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
  slices: Array<{ name: TypeName; pct: number }>;
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

function AccountBreakdownTable({ accounts }: { accounts: AccountBreakdown[] }) {
  const showOther = accounts.some((a) =>
    a.targeted.find((b) => b.name === "Other" && b.current > 0.001),
  );
  const colClass = showOther ? "grid-cols-4" : "grid-cols-3";
  const tableWidth = showOther ? "w-64" : "w-52";
  const headerNames = showOther
    ? (["Stocks", "Bonds", "Cash", "Other"] as TypeName[])
    : (["Stocks", "Bonds", "Cash"] as TypeName[]);

  return (
    <details className="group mt-1">
      <summary className="flex cursor-pointer select-none list-none items-center gap-1 text-xs text-avocado-500 hover:text-avocado-700">
        <span className="transition-transform group-open:rotate-90">▸</span>
        Breakdown by account
      </summary>

      <div className="mt-3 flex flex-col divide-y divide-avocado-100">
        <div className="flex items-end gap-6 pb-1">
          <div className="min-w-0 flex-1" />
          <div className={`${tableWidth} shrink-0`}>
            <div className={`grid ${colClass} text-center`}>
              {headerNames.map((name) => (
                <span
                  key={name}
                  className={`text-xs font-medium ${name === "Other" ? "text-purple-500" : "text-avocado-600"}`}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {accounts.map((acct) => {
          const isTaxAdvantaged = ["ira", "roth_ira", "401k", "hsa"].includes(acct.accountType);
          const visibleSlices = showOther
            ? acct.targeted
            : acct.targeted.filter((b) => b.name !== "Other");
          const currentSlices = visibleSlices.map((b) => ({ name: b.name, pct: b.current }));

          return (
            <div key={acct.accountId} className="flex items-center gap-6 py-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/accounts/${acct.accountId}`}
                    className="truncate text-xs font-medium text-avocado-800 hover:underline"
                  >
                    {acct.accountName}
                  </Link>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${
                      isTaxAdvantaged ? "bg-amber-50 text-pit" : "bg-avocado-50 text-avocado-500"
                    }`}
                  >
                    {ACCOUNT_TYPE_LABELS[acct.accountType] ?? acct.accountType}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-avocado-700">
                    {formatUSD(acct.total)}
                  </span>
                </div>
                <StackedBar slices={currentSlices} />
              </div>

              <div className={`${tableWidth} shrink-0`}>
                <div className={`grid ${colClass} items-center text-center text-xs`}>
                  {visibleSlices.map((b) => (
                    <span
                      key={b.name}
                      className={b.name === "Other" ? "text-purple-600" : "text-avocado-800"}
                    >
                      {b.current > 0.001 ? formatPercent(b.current) : "—"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
