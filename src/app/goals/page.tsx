import { reorderGoals } from "@allocado/app/_actions/goals";
import { GoalAllocationCard } from "@allocado/components/allocation/GoalAllocationCard";
import { GoalFormDialog } from "@allocado/components/goals/GoalFormDialog";
import { SortableCardList } from "@allocado/components/SortableCardList";
import { requireUserId } from "@allocado/db/auth";
import { buildGoalCards } from "@allocado/lib/goal-cards";

export default async function GoalsPage() {
  const userId = await requireUserId();
  const { goalCards } = await buildGoalCards(userId);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-avocado-900">Goals</h1>
          <p className="text-sm text-avocado-700">
            Group your accounts under a savings goal to track allocation independently.
          </p>
        </div>
        <GoalFormDialog />
      </header>

      {goalCards.length === 0 ? (
        <p className="text-sm text-avocado-700">
          No goals yet. Create one with the + button above.
        </p>
      ) : (
        <SortableCardList
          onReorder={reorderGoals}
          items={goalCards.map((card) => ({
            id: card.goal.id,
            node: (
              <GoalAllocationCard
                goal={card.goal}
                total={card.total}
                targeted={card.targeted}
                duration={card.duration}
                accountCount={card.accountCount}
                accountBreakdowns={card.accountBreakdowns}
                hasHoldings={card.hasHoldings}
                actions={
                  <GoalFormDialog
                    goal={{
                      id: card.goal.id,
                      name: card.goal.name,
                      targetDate: card.goal.targetDate,
                      notes: card.goal.notes,
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
