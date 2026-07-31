import { Card, CardContent, CardHeader } from "@allocado/components/ui/card";
import { formatUSD } from "@allocado/lib/money";
import Link from "next/link";
import type { ReactNode } from "react";
import { AccountBreakdownTable } from "./AccountBreakdownTable";
import { AllocationBars } from "./AllocationBars";
import type { AccountBreakdown, AllocationSlice } from "./constants";

export function GoalAllocationCard({
  goal,
  total,
  targeted,
  duration,
  accountCount,
  accountBreakdowns,
  hasHoldings,
  actions,
}: {
  goal: { id: string; name: string; targetDate: string | null };
  total: string | number;
  targeted: AllocationSlice[];
  duration: number | null;
  accountCount: number;
  accountBreakdowns: AccountBreakdown[];
  hasHoldings: boolean;
  actions?: ReactNode;
}) {
  const hasTargets = targeted.some((b) => b.target > 0);

  return (
    <Card>
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
          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-avocado-600">Total</div>
              <div className="text-2xl font-semibold text-avocado-900">{formatUSD(total)}</div>
            </div>
            {actions}
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
            <AllocationBars targeted={targeted} hasTargets={hasTargets} goalId={goal.id} />
            {accountBreakdowns.length >= 2 && (
              <AccountBreakdownTable accounts={accountBreakdowns} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
