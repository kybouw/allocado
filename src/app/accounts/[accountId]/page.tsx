import { deleteAccount, updateAccount } from "@allocado/app/_actions/accounts";
import { formatRelativeTime } from "@allocado/components/plaid/relative-time";
import { SyncNowButton } from "@allocado/components/plaid/SyncNowButton";
import { DeleteButton } from "@allocado/components/ui/buttons/DeleteButton";
import { requireUserId } from "@allocado/db/auth";
import { getAccount } from "@allocado/db/queries/accounts";
import { listAssetsForUser } from "@allocado/db/queries/assets";
import { listGoals } from "@allocado/db/queries/goals";
import { listHoldingsForAccount } from "@allocado/db/queries/holdings";
import {
  getPlaidLinkForAccount,
  getPlaidManagedAssetIdsForAccount,
} from "@allocado/db/queries/plaid";
import { ACCOUNT_TYPES } from "@allocado/lib/account-types";
import { formatUSD } from "@allocado/lib/money";
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

  const [holdings, assets, goals, plaidLink, managedAssetIds] = await Promise.all([
    listHoldingsForAccount(userId, accountId),
    listAssetsForUser(userId),
    listGoals(userId),
    getPlaidLinkForAccount(userId, accountId),
    getPlaidManagedAssetIdsForAccount(accountId),
  ]);

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
              {account.accountType}
              {account.institution ? ` · ${account.institution}` : ""}
            </p>
          </div>
          <DeleteButton
            action={deleteAccount.bind(null, accountId)}
            redirectPath="/accounts"
            itemLabel="account"
            itemName={account.name}
          />
        </div>
      </header>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">Edit account</h2>
        <form
          action={async (formData) => {
            "use server";
            await updateAccount(accountId, formData);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Name</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={account.name}
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Goal</label>
            <select name="goalId" required defaultValue={account.goalId} className="input-field">
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Type</label>
            <select
              name="accountType"
              required
              defaultValue={account.accountType}
              className="input-field"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Institution</label>
            <input
              name="institution"
              type="text"
              defaultValue={account.institution ?? ""}
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium text-avocado-700">Notes</label>
            <input
              name="notes"
              type="text"
              defaultValue={account.notes ?? ""}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-avocado-800">Holdings</h2>
          {plaidLink && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-avocado-600">
                Synced from {plaidLink.institutionName ?? "Plaid"}
                {plaidLink.lastSyncedAt
                  ? ` · last synced ${formatRelativeTime(plaidLink.lastSyncedAt)}`
                  : ""}
              </span>
              <SyncNowButton itemId={plaidLink.itemId} />
            </div>
          )}
        </div>
        {plaidLink?.unmappedValue && Number(plaidLink.unmappedValue) > 0 && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {formatUSD(plaidLink.unmappedValue)} from this account isn't counted yet —{" "}
            <Link href="/accounts" className="underline">
              map its securities
            </Link>{" "}
            to include it.
          </p>
        )}
        <HoldingsEditor
          accountId={accountId}
          assets={assets.map((a) => ({
            id: a.id,
            ticker: a.ticker,
            name: a.name,
          }))}
          holdings={holdings.map((h) => ({
            id: h.id,
            assetId: h.assetId,
            ticker: h.ticker,
            assetName: h.assetName,
            value: h.value,
          }))}
          managedAssetIds={managedAssetIds}
        />
      </section>
    </div>
  );
}
