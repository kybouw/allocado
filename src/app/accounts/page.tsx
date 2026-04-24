import { createAccount } from "@allocado/app/_actions/accounts";
import { requireUserId } from "@allocado/db/auth";
import { listAccounts } from "@allocado/db/queries/accounts";
import { listGoals } from "@allocado/db/queries/goals";
import Link from "next/link";

const ACCOUNT_TYPES = [
  { value: "taxable", label: "Taxable brokerage" },
  { value: "ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "401k", label: "401(k)" },
  { value: "hsa", label: "HSA" },
  { value: "other", label: "Other" },
];

export default async function AccountsPage() {
  const userId = await requireUserId();
  const [accounts, goals] = await Promise.all([listAccounts(userId), listGoals(userId)]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold text-avocado-900">Accounts</h1>
        <p className="text-sm text-avocado-700">
          Brokerage or retirement accounts, each assigned to one goal.
        </p>
      </header>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">Your accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-avocado-700">No accounts yet.</p>
        ) : (
          <ul className="divide-y divide-avocado-100">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/accounts/${a.id}`}
                    className="font-medium text-avocado-900 hover:underline"
                  >
                    {a.name}
                  </Link>
                  <span className="ml-3 text-xs text-avocado-600">{a.accountType}</span>
                  {a.institution && (
                    <span className="ml-2 text-xs text-avocado-600">· {a.institution}</span>
                  )}
                  <p className="mt-1 text-xs text-avocado-600">Goal: {a.goalName ?? "(none)"}</p>
                </div>
                <Link
                  href={`/accounts/${a.id}`}
                  className="text-sm font-medium text-avocado-700 hover:text-avocado-900"
                >
                  Holdings →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">New account</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-avocado-700">
            Create a{" "}
            <Link href="/goals" className="underline">
              goal
            </Link>{" "}
            first — accounts must belong to one.
          </p>
        ) : (
          <form
            action={async (formData) => {
              "use server";
              await createAccount(formData);
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-avocado-700">Name</label>
              <input
                name="name"
                type="text"
                required
                placeholder="Vanguard Roth IRA"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-avocado-700">Goal</label>
              <select name="goalId" required className="input-field">
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-avocado-700">Type</label>
              <select name="accountType" required className="input-field">
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
                placeholder="Vanguard"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium text-avocado-700">Notes</label>
              <input name="notes" type="text" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">
                Create account
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
