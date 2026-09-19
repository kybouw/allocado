import { deleteGoal } from "@allocado/app/_actions/goals";
import { AccountBreakdownTable } from "@allocado/components/allocation/AccountBreakdownTable";
import { AllocationBars } from "@allocado/components/allocation/AllocationBars";
import { ClassDriftTable, type ClassRow } from "@allocado/components/allocation/ClassDriftTable";
import {
  type AccountBreakdown,
  ALL_TYPE_KEYS,
  TYPE_DISPLAY,
} from "@allocado/components/allocation/constants";
import { HorizonNote } from "@allocado/components/allocation/HorizonNote";
import { TargetDialog } from "@allocado/components/allocation/TargetDialog";
import { GoalDialog } from "@allocado/components/goals/GoalDialog";
import { DeleteButton } from "@allocado/components/ui/buttons/DeleteButton";
import { requireUserId } from "@allocado/db/auth";
import { listAccountsForGoal } from "@allocado/db/queries/accounts";
import { listAssetsForUser } from "@allocado/db/queries/assets";
import { getGoal } from "@allocado/db/queries/goals";
import { listHoldingsForGoal } from "@allocado/db/queries/holdings";
import { listTargetsForGoal } from "@allocado/db/queries/targets";
import {
  computeGoalTotal,
  computeTypeDollars,
  computeTypeFractions,
  computeTypeProvenance,
  computeWeightedBondDuration,
  resolveActiveTargets,
  yearsUntil,
} from "@allocado/lib/allocation";
import { formatUSD } from "@allocado/lib/money";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TargetsEditor } from "./TargetsEditor";

export default async function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const userId = await requireUserId();
  const goal = await getGoal(userId, goalId);
  if (!goal) notFound();

  const [accountsInGoal, targets, holdings, assets] = await Promise.all([
    listAccountsForGoal(userId, goalId),
    listTargetsForGoal(goalId),
    listHoldingsForGoal(userId, goalId),
    listAssetsForUser(userId),
  ]);

  const total = computeGoalTotal(holdings);
  const typeDollars = computeTypeDollars(holdings, assets);
  const current = computeTypeFractions(typeDollars, total);

  // One path to the active target, the same one the dashboard uses.
  const activeTargets = resolveActiveTargets(targets);
  const hasTargets = activeTargets.stock > 0 || activeTargets.bond > 0 || activeTargets.cash > 0;

  const targeted = ALL_TYPE_KEYS.map((key) => ({
    name: TYPE_DISPLAY[key],
    current: current.get(key) ?? 0,
    target: key === "other" ? null : activeTargets[key],
  }));

  const duration = computeWeightedBondDuration(holdings, assets);
  const years = yearsUntil(goal.targetDate);

  const accountNames = new Map(accountsInGoal.map((a) => [a.id, a.name]));
  const provenance = computeTypeProvenance(holdings, assets);

  // "Other" only earns a row when something is actually in it.
  const classRows: ClassRow[] = ALL_TYPE_KEYS.filter(
    (key) => key !== "other" || (typeDollars.get(key) ?? 0) > 0.005,
  ).map((key) => ({
    name: TYPE_DISPLAY[key],
    dollars: typeDollars.get(key) ?? 0,
    current: current.get(key) ?? 0,
    target: key === "other" ? null : activeTargets[key],
    sources: (provenance.get(key) ?? []).map((s) => ({
      ...s,
      accountName: accountNames.get(s.accountId) ?? "Unknown account",
    })),
  }));

  const holdingsByAccount = new Map<string, typeof holdings>();
  for (const h of holdings) {
    const list = holdingsByAccount.get(h.accountId) ?? [];
    list.push(h);
    holdingsByAccount.set(h.accountId, list);
  }

  // Current allocation only. A goal's target describes the goal, not any one
  // account inside it — placing bonds and stocks by tax treatment makes each
  // account deliberately lopsided (KB-34).
  const accountBreakdowns: AccountBreakdown[] = accountsInGoal
    .filter((a) => holdingsByAccount.has(a.id))
    .map((acct) => {
      const acctHoldings = holdingsByAccount.get(acct.id) ?? [];
      const acctTotal = computeGoalTotal(acctHoldings);
      const acctCurrent = computeTypeFractions(computeTypeDollars(acctHoldings, assets), acctTotal);
      return {
        accountId: acct.id,
        accountName: acct.name,
        accountType: acct.accountType,
        total: acctTotal,
        slices: ALL_TYPE_KEYS.map((key) => ({
          name: TYPE_DISPLAY[key],
          current: acctCurrent.get(key) ?? 0,
        })),
      };
    });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href="/goals"
          className="text-sm text-avocado-600 hover:text-avocado-900 hover:underline"
        >
          ← All goals
        </Link>
        <div className="mt-2 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-avocado-900">{goal.name}</h1>
            <p className="text-sm text-avocado-700">
              {accountsInGoal.length} {accountsInGoal.length === 1 ? "account" : "accounts"}
              {years != null &&
                ` · ${years < 1 ? "under a year" : `${Math.round(years)} years`} to target`}
              {goal.notes ? ` · ${goal.notes}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-avocado-600">Total</div>
              <div className="text-2xl font-semibold text-avocado-900">{formatUSD(total)}</div>
            </div>
            <GoalDialog
              goal={{
                id: goal.id,
                name: goal.name,
                targetDate: goal.targetDate,
                notes: goal.notes,
              }}
            />
            <DeleteButton
              action={deleteGoal.bind(null, goalId)}
              redirectPath="/goals"
              itemLabel="goal"
              itemName={goal.name}
            />
          </div>
        </div>
      </header>

      {/* ---------- What you chose ---------- */}
      <section className="card flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs uppercase tracking-wide text-avocado-600">What you chose</span>
            <h2 className="text-lg font-medium text-avocado-800">Target allocation</h2>
          </div>
          <TargetDialog
            hasTargets={hasTargets}
            editor={
              <TargetsEditor
                goalId={goalId}
                initialTargets={{
                  stockTargetPct: activeTargets.stock * 100,
                  bondTargetPct: activeTargets.bond * 100,
                  cashTargetPct: activeTargets.cash * 100,
                }}
              />
            }
          />
        </div>

        {hasTargets ? (
          <div className="flex flex-col gap-2">
            <div className="flex h-7 overflow-hidden rounded-md">
              <div className="bg-avocado-500" style={{ width: `${activeTargets.stock * 100}%` }} />
              <div className="bg-coin" style={{ width: `${activeTargets.bond * 100}%` }} />
              <div className="bg-avocado-200" style={{ width: `${activeTargets.cash * 100}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-avocado-800">
              <LegendItem color="bg-avocado-500" label="Stocks" pct={activeTargets.stock} />
              <LegendItem color="bg-coin" label="Bonds" pct={activeTargets.bond} />
              <LegendItem color="bg-avocado-200" label="Cash" pct={activeTargets.cash} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-avocado-700">
            No target yet. Setting one is what turns this page from a list of holdings into a
            question you can answer: are you invested the way you meant to be?
          </p>
        )}
      </section>

      {/* ---------- What you have ---------- */}
      <section className="card flex flex-col gap-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wide text-avocado-600">What you have</span>
          <h2 className="text-lg font-medium text-avocado-800">Current allocation</h2>
        </div>

        {holdings.length === 0 ? (
          <p className="text-sm text-avocado-700">
            No holdings yet. Add them from an account in this goal.
          </p>
        ) : (
          <>
            <AllocationBars targeted={targeted} hasTargets={hasTargets} goalId={goalId} />
            <ClassDriftTable rows={classRows} />
            <p className="text-xs text-avocado-600">
              Expand a class to see which accounts and funds produced it.
            </p>
          </>
        )}

        {/*
          Duration is measured from the holdings, so this is a verdict on what you
          actually hold — not on the target you picked. The target date only supplies
          the yardstick.
        */}
        <HorizonNote years={years} duration={duration} />
      </section>

      {/* ---------- Where it lives ---------- */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-medium text-avocado-800">Where it lives</h2>
          <Link
            href="/accounts"
            className="text-sm font-medium text-avocado-700 hover:text-avocado-900"
          >
            Manage accounts →
          </Link>
        </div>

        {accountsInGoal.length === 0 ? (
          <p className="text-sm text-avocado-700">
            No accounts assigned yet. Create one in{" "}
            <Link href="/accounts" className="underline">
              Accounts
            </Link>
            .
          </p>
        ) : (
          <>
            <ul className="divide-y divide-avocado-100">
              {accountsInGoal.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <Link
                    href={`/accounts/${a.id}`}
                    className="font-medium text-avocado-900 hover:underline"
                  >
                    {a.name}
                  </Link>
                  <span className="text-sm text-avocado-700">
                    {formatUSD(computeGoalTotal(holdingsByAccount.get(a.id) ?? []))}
                  </span>
                </li>
              ))}
            </ul>
            {accountBreakdowns.length >= 2 && (
              <>
                <AccountBreakdownTable accounts={accountBreakdowns} />
                <p className="text-xs text-avocado-600">
                  Accounts are deliberately lopsided when you place bonds and stocks by tax
                  treatment, so these show what each one holds — not drift against the goal&apos;s
                  target.
                </p>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function LegendItem({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${color}`} />
      {label} <strong className="font-semibold">{Math.round(pct * 100)}%</strong>
    </span>
  );
}
