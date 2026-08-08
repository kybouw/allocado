import { PlaidItemCard } from "@allocado/components/plaid/PlaidItemCard";
import { PlaidLinkLauncher } from "@allocado/components/plaid/PlaidLinkLauncher";
import { requireUserId } from "@allocado/db/auth";
import { listPlaidItemsForUser } from "@allocado/db/queries/plaid";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const plaidItems = await listPlaidItemsForUser(userId);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold text-avocado-900">Settings</h1>
        <p className="text-sm text-avocado-700">Connections and preferences.</p>
      </header>

      <section className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-avocado-900">Connected institutions</h2>
            <p className="text-sm text-avocado-700">
              Link a brokerage via Plaid, then feed its accounts into your accounts from each
              account&apos;s page.
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
              <PlaidItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
