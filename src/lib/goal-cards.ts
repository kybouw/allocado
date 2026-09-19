import {
  type AccountBreakdown,
  ALL_TYPE_KEYS,
  TYPE_DISPLAY,
} from "@allocado/components/allocation/constants";
import { listAccounts } from "@allocado/db/queries/accounts";
import { listAssetsForUser } from "@allocado/db/queries/assets";
import { listGoals } from "@allocado/db/queries/goals";
import { listHoldingsForGoal } from "@allocado/db/queries/holdings";
import { listTargetsForGoal } from "@allocado/db/queries/targets";
import {
  computeGoalTotal,
  computeTypeDollars,
  computeTypeFractions,
  resolveActiveTargets,
} from "@allocado/lib/allocation";

export async function buildGoalCards(userId: string) {
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
        target: key === "other" ? null : activeTargets[key],
      }));

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
              const acctSlices = ALL_TYPE_KEYS.map((key) => ({
                name: TYPE_DISPLAY[key],
                current: acctCurrent.get(key) ?? 0,
              }));
              return {
                accountId: acct.id,
                accountName: acct.name,
                accountType: acct.accountType,
                total: acctTotal,
                slices: acctSlices,
              };
            })
          : [];

      return {
        goal: g,
        total,
        typeDollars,
        holdings,
        targeted,
        accountCount,
        accountBreakdowns,
        hasHoldings: holdings.length > 0,
      };
    }),
  );

  return { goals, accounts, assets, goalCards };
}
