import { reorderAccounts } from "@allocado/app/_actions/accounts";
import { AccountCard } from "@allocado/components/accounts/AccountCard";
import { AccountFormDialog } from "@allocado/components/accounts/AccountFormDialog";
import { SortableCardList } from "@allocado/components/SortableCardList";
import { requireUserId } from "@allocado/db/auth";
import { listAccounts } from "@allocado/db/queries/accounts";
import { listGoals } from "@allocado/db/queries/goals";
import { listHoldingsWithAssetsForUser } from "@allocado/db/queries/holdings";
import Link from "next/link";

export default async function AccountsPage() {
  const userId = await requireUserId();
  const [accounts, goals, holdings] = await Promise.all([
    listAccounts(userId),
    listGoals(userId),
    listHoldingsWithAssetsForUser(userId),
  ]);

  const holdingsByAccount = new Map<string, typeof holdings>();
  for (const h of holdings) {
    const list = holdingsByAccount.get(h.accountId) ?? [];
    list.push(h);
    holdingsByAccount.set(h.accountId, list);
  }

  const goalOptions = goals.map((g) => ({ id: g.id, name: g.name }));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-avocado-900">Accounts</h1>
          <p className="text-sm text-avocado-700">
            Brokerage or retirement accounts, each assigned to one goal.
          </p>
        </div>
        {goals.length > 0 && <AccountFormDialog goals={goalOptions} />}
      </header>

      {goals.length === 0 ? (
        <p className="text-sm text-avocado-700">
          Create a{" "}
          <Link href="/goals" className="underline">
            goal
          </Link>{" "}
          first — accounts must belong to one.
        </p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-avocado-700">
          No accounts yet. Create one with the + button above.
        </p>
      ) : (
        <SortableCardList
          onReorder={reorderAccounts}
          items={accounts.map((account) => ({
            id: account.id,
            node: (
              <AccountCard
                account={account}
                holdings={holdingsByAccount.get(account.id) ?? []}
                actions={
                  <AccountFormDialog
                    goals={goalOptions}
                    account={{
                      id: account.id,
                      name: account.name,
                      goalId: account.goalId,
                      accountType: account.accountType,
                      institution: account.institution,
                      notes: account.notes,
                    }}
                  />
                }
              />
            ),
          }))}
        />
      )}
    </div>
  );
}
