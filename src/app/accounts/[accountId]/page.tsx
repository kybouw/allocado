import { deleteAccount } from "@allocado/app/_actions/accounts";
import { AccountDialog } from "@allocado/components/accounts/AccountDialog";
import { formatRelativeTime } from "@allocado/components/plaid/relative-time";
import { DeleteButton } from "@allocado/components/ui/buttons/DeleteButton";
import { requireUserId } from "@allocado/db/auth";
import { getAccount } from "@allocado/db/queries/accounts";
import { listAssetsForUser } from "@allocado/db/queries/assets";
import { getGoal, listGoals } from "@allocado/db/queries/goals";
import { listHoldingsForAccount } from "@allocado/db/queries/holdings";
import {
  getPlaidLinkForAccount,
  getPlaidManagedAssetIdsForAccount,
  listPositionsForPlaidAccount,
  listUnlinkedPlaidAccounts,
} from "@allocado/db/queries/plaid";
import { ACCOUNT_TYPE_LABELS } from "@allocado/lib/account-types";
import { formatPercent, formatUSD } from "@allocado/lib/money";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HoldingsEditor } from "./HoldingsEditor";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const userId = await requireUserId();
  const account = await getAccount(userId, accountId);
  if (!account) notFound();

  const [holdings, assets, goals, goal, plaidLink, managedAssetIds, unlinkedPlaidAccounts] =
    await Promise.all([
      listHoldingsForAccount(userId, accountId),
      listAssetsForUser(userId),
      listGoals(userId),
      getGoal(userId, account.goalId),
      getPlaidLinkForAccount(userId, accountId),
      getPlaidManagedAssetIdsForAccount(accountId),
      listUnlinkedPlaidAccounts(userId),
    ]);
  const positions = plaidLink
    ? await listPositionsForPlaidAccount(plaidLink.plaidAccountRowId)
    : [];

  const total = holdings.reduce((acc, h) => acc + Number(h.value), 0);
  const assetOptions = assets.map((a) => ({ id: a.id, ticker: a.ticker, name: a.name }));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href="/accounts"
          className="text-sm text-avocado-600 hover:text-avocado-900 hover:underline"
        >
          ← All accounts
        </Link>
        <div className="mt-2 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-avocado-900">{account.name}</h1>
            <p className="text-sm text-avocado-700">
              {ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType}
              {account.institution ? ` · ${account.institution}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-avocado-600">Total</div>
              <div className="text-2xl font-semibold text-avocado-900">{formatUSD(total)}</div>
            </div>
            <AccountDialog
              account={{
                id: account.id,
                name: account.name,
                goalId: account.goalId,
                accountType: account.accountType,
                institution: account.institution,
                minimumCashBalance: account.minimumCashBalance,
                notes: account.notes,
              }}
              goals={goals.map((g) => ({ id: g.id, name: g.name }))}
              sync={{
                accountId,
                link: plaidLink,
                unlinkedPlaidAccounts,
                positions,
                assets: assetOptions,
              }}
              holdingsEditor={
                <HoldingsEditor
                  accountId={accountId}
                  assets={assetOptions}
                  holdings={holdings.map((h) => ({
                    id: h.id,
                    assetId: h.assetId,
                    ticker: h.ticker,
                    assetName: h.assetName,
                    value: h.value,
                  }))}
                  managedAssetIds={managedAssetIds}
                />
              }
            />
            <DeleteButton
              action={deleteAccount.bind(null, accountId)}
              redirectPath="/accounts"
              itemLabel="account"
              itemName={account.name}
            />
          </div>
        </div>
      </header>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">Details</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Detail label="Goal">
            {goal ? (
              <Link href={`/goals/${goal.id}`} className="hover:underline">
                {goal.name}
              </Link>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Type">
            {ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType}
          </Detail>
          <Detail label="Institution">{account.institution || "—"}</Detail>
          <Detail label="Required cash balance">
            {account.minimumCashBalance != null ? (
              <span title="Cash this account forces you to keep, and which is not free to rebalance">
                {formatUSD(account.minimumCashBalance)}
              </span>
            ) : (
              "None"
            )}
          </Detail>
          <Detail label="Automatic sync">
            {plaidLink ? (
              <>
                {plaidLink.status === "ok" ? "Connected" : "Needs attention"}
                {plaidLink.lastSyncedAt && (
                  <span className="text-avocado-600">
                    {" "}
                    · synced {formatRelativeTime(plaidLink.lastSyncedAt)}
                  </span>
                )}
              </>
            ) : (
              "Not connected"
            )}
          </Detail>
          <Detail label="Notes">{account.notes || "—"}</Detail>
        </dl>
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-medium text-avocado-800">Holdings</h2>
          <span className="text-xs text-avocado-600">
            {holdings.length} {holdings.length === 1 ? "position" : "positions"}
          </span>
        </div>

        {holdings.length === 0 ? (
          <p className="text-sm text-avocado-700">
            Nothing here yet. Add holdings from the Holdings tab of Edit account.
          </p>
        ) : (
          <ul className="divide-y divide-avocado-100">
            {holdings.map((h) => {
              const value = Number(h.value);
              const share = total > 0 ? value / total : 0;
              return (
                <li key={h.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/assets/${h.assetId}`}
                      className="font-medium text-avocado-900 hover:underline"
                    >
                      {h.ticker}
                    </Link>
                    <span className="ml-2 text-sm text-avocado-600">{h.assetName}</span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-4">
                    <span className="text-sm text-avocado-900">{formatUSD(value)}</span>
                    <span className="w-14 text-right text-sm text-avocado-600">
                      {formatPercent(share)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-avocado-600">{label}</dt>
      <dd className="text-sm text-avocado-900">{children}</dd>
    </div>
  );
}
