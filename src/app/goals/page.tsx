import { createGoal } from "@allocado/app/_actions/goals";
import { requireUserId } from "@allocado/db/auth";
import { listGoals } from "@allocado/db/queries/goals";
import { GoalsList } from "./GoalsList";

export default async function GoalsPage() {
  const userId = await requireUserId();
  const goals = await listGoals(userId);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold text-avocado-900">Goals</h1>
        <p className="text-sm text-avocado-700">
          Group your accounts under a savings goal to track allocation independently.
        </p>
      </header>

      <section className="card flex flex-col gap-6">
        <h2 className="text-lg font-medium text-avocado-800">Your goals</h2>
        <GoalsList
          goals={goals.map((g) => ({
            id: g.id,
            name: g.name,
            targetDate: g.targetDate,
            notes: g.notes,
          }))}
        />
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">New goal</h2>
        <form
          action={async (formData) => {
            "use server";
            await createGoal(formData);
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-avocado-700">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Retirement"
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="targetDate" className="text-sm font-medium text-avocado-700">
              Target date (optional)
            </label>
            <input id="targetDate" name="targetDate" type="date" className="input-field" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium text-avocado-700">
              Notes (optional)
            </label>
            <input id="notes" name="notes" type="text" className="input-field" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              Create goal
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
