import { deleteAccount, updateAccount } from "@allocado/app/_actions/accounts";
import { DestructiveButton } from "@allocado/components/ui/buttons/DestructiveButton";
import { requireUserId } from "@allocado/db/auth";
import { getAccount } from "@allocado/db/queries/accounts";
import { listAssetsForUser } from "@allocado/db/queries/assets";
import { listGoals } from "@allocado/db/queries/goals";
import { listHoldingsForAccount } from "@allocado/db/queries/holdings";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HoldingsEditor } from "./HoldingsEditor";

const ACCOUNT_TYPES = [
  { value: "taxable", label: "Taxable brokerage" },
  { value: "ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "401k", label: "401(k)" },
  { value: "hsa", label: "HSA" },
  { value: "other", label: "Other" },
];

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const userId = await requireUserId();
  const account = await getAccount(userId, accountId);
  if (!account) notFound();

  const [holdings, assets, goals] = await Promise.all([
    listHoldingsForAccount(userId, accountId),
    listAssetsForUser(userId),
    listGoals(userId),
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
        <h1 className="mt-2 text-2xl font-semibold text-avocado-900">{account.name}</h1>
        <p className="text-sm text-avocado-700">
          {account.accountType}
          {account.institution ? ` · ${account.institution}` : ""}
        </p>
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
        <h2 className="text-lg font-medium text-avocado-800">Holdings</h2>
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
            shares: h.shares,
            value: h.value,
          }))}
        />
      </section>

      <section className="card flex flex-col gap-4 border-red-200">
        <h2 className="text-lg font-medium text-red-700">Danger zone</h2>
        <form
          action={async () => {
            "use server";
            const res = await deleteAccount(accountId);
            if (res.ok) redirect("/accounts");
          }}
        >
          <DestructiveButton type="submit">Delete account (and all its holdings)</DestructiveButton>
        </form>
      </section>
    </div>
  );
}
