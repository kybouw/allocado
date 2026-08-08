import { reorderAccounts } from "@allocado/app/_actions/accounts";
import { AccountCard } from "@allocado/components/accounts/AccountCard";
import { AccountFormDialog } from "@allocado/components/accounts/AccountFormDialog";
import { PlaidItemCard } from "@allocado/components/plaid/PlaidItemCard";
import { PlaidLinkLauncher } from "@allocado/components/plaid/PlaidLinkLauncher";
import { UnmappedSecuritiesCard } from "@allocado/components/plaid/UnmappedSecuritiesCard";
import { SortableCardList } from "@allocado/components/SortableCardList";
import { requireUserId } from "@allocado/db/auth";
import { listAccounts } from "@allocado/db/queries/accounts";
import { listAssetsForUser } from "@allocado/db/queries/assets";
import { listGoals } from "@allocado/db/queries/goals";
import { listHoldingsWithAssetsForUser } from "@allocado/db/queries/holdings";
import {
  listLinkableAccounts,
  listPlaidItemsForUser,
  listUnmappedSecuritiesForUser,
} from "@allocado/db/queries/plaid";
import Link from "next/link";

export default async function AccountsPage() {
  const userId = await requireUserId();
  const [accounts, goals, holdings, plaidItems, unmappedSecurities, linkableAccounts, assets] =
    await Promise.all([
      listAccounts(userId),
      listGoals(userId),
      listHoldingsWithAssetsForUser(userId),
      listPlaidItemsForUser(userId),
      listUnmappedSecuritiesForUser(userId),
      listLinkableAccounts(userId),
      listAssetsForUser(userId),
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

      <section className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-avocado-900">Connected institutions</h2>
            <p className="text-sm text-avocado-700">
              Link a brokerage via Plaid to keep holdings values up to date automatically.
            </p>
          </div>
          <PlaidLinkLauncher>Connect institution</PlaidLinkLauncher>
        </header>

        {plaidItems.length === 0 ? (
          <p className="text-sm text-avocado-700">
            No institutions connected yet. Holdings stay manual until you connect one.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {plaidItems.map((item) => (
              <PlaidItemCard
                key={item.id}
                item={item}
                linkableAccounts={linkableAccounts}
                goals={goalOptions}
              />
            ))}
          </div>
        )}

        <UnmappedSecuritiesCard
          securities={unmappedSecurities}
          assets={assets.map((a) => ({ id: a.id, ticker: a.ticker, name: a.name }))}
        />
      </section>
    </div>
  );
}
