import { deleteGoal, updateGoal } from "@allocado/app/_actions/goals";
import { DeleteButton } from "@allocado/components/ui/buttons/DeleteButton";
import { requireUserId } from "@allocado/db/auth";
import { listAccountsForGoal } from "@allocado/db/queries/accounts";
import { getGoal } from "@allocado/db/queries/goals";
import { listTargetsForGoal } from "@allocado/db/queries/targets";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TargetsEditor } from "./TargetsEditor";

export default async function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const userId = await requireUserId();
  const goal = await getGoal(userId, goalId);
  if (!goal) notFound();

  const [accountsInGoal, targets] = await Promise.all([
    listAccountsForGoal(userId, goalId),
    listTargetsForGoal(goalId),
  ]);

  const staticTarget = targets.find((t) => t.effectiveDate == null);
  const initialTargets = {
    stockTargetPct: Number(staticTarget?.stockTargetPct ?? 0),
    bondTargetPct: Number(staticTarget?.bondTargetPct ?? 0),
    cashTargetPct: Number(staticTarget?.cashTargetPct ?? 0),
    otherTargetPct: Number(staticTarget?.otherTargetPct ?? 0),
  };

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
            {goal.targetDate && (
              <p className="text-sm text-avocado-700">Target date: {goal.targetDate}</p>
            )}
          </div>
          <DeleteButton
            action={deleteGoal.bind(null, goalId)}
            redirectPath="/goals"
            itemLabel="goal"
            itemName={goal.name}
          />
        </div>
      </header>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">Edit goal</h2>
        <form
          action={async (formData) => {
            "use server";
            await updateGoal(goalId, formData);
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Name</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={goal.name}
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Target date</label>
            <input
              name="targetDate"
              type="date"
              defaultValue={goal.targetDate ?? ""}
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Notes</label>
            <input
              name="notes"
              type="text"
              defaultValue={goal.notes ?? ""}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-3 flex gap-3">
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">Allocation targets</h2>
        <p className="text-sm text-avocado-700">
          Set your Stocks / Bonds / Cash / Other target allocation. All four must sum to 100%.
        </p>
        <TargetsEditor goalId={goalId} initialTargets={initialTargets} />
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-avocado-800">Accounts in this goal</h2>
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
          <ul className="divide-y divide-avocado-100">
            {accountsInGoal.map((a) => (
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
