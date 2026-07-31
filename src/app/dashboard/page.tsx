import {
  ALL_TYPE_KEYS,
  TYPE_COLORS,
  TYPE_DISPLAY,
  type TypeKey,
  type TypeName,
} from "@allocado/components/allocation/constants";
import { GoalAllocationCard } from "@allocado/components/allocation/GoalAllocationCard";
import { StackedBar } from "@allocado/components/allocation/StackedBar";
import { requireUserId } from "@allocado/db/auth";
import { computeTypeFractions, computeWeightedBondDuration } from "@allocado/lib/allocation";
import { buildGoalCards } from "@allocado/lib/goal-cards";
import { formatPercent, formatUSD } from "@allocado/lib/money";
import Link from "next/link";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const { goals, assets, goalCards } = await buildGoalCards(userId);

  const portfolioTotal = goalCards.reduce((acc, c) => acc + Number(c.total), 0);

  const totalTypeDollars = new Map<TypeKey, number>([
    ["stock", 0],
    ["bond", 0],
    ["cash", 0],
    ["other", 0],
  ]);
  for (const card of goalCards) {
    for (const [type, dollars] of card.typeDollars) {
      totalTypeDollars.set(type as TypeKey, (totalTypeDollars.get(type as TypeKey) ?? 0) + dollars);
    }
  }
  const portfolioFractions = computeTypeFractions(totalTypeDollars, String(portfolioTotal));
  const portfolioTargeted = ALL_TYPE_KEYS.map((key) => ({
    name: TYPE_DISPLAY[key],
    current: portfolioFractions.get(key) ?? 0,
  }));
  const portfolioHasAllocation = portfolioTargeted.some((b) => b.current > 0);

  const allHoldings = goalCards.flatMap((c) => c.holdings);
  const portfolioDuration = computeWeightedBondDuration(allHoldings, assets);

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-avocado-900">Welcome to Allocado</h1>
        <p className="max-w-md text-sm text-avocado-700">
          Start by creating a goal (Retirement, House, Car, etc.). Then add accounts, record
          holdings, and set allocation targets.
        </p>
        <Link href="/goals" className="btn-primary">
          Create your first goal
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-avocado-600">Total portfolio value</p>
          <h1 className="text-4xl font-semibold text-avocado-900">{formatUSD(portfolioTotal)}</h1>
          {portfolioDuration != null && (
            <p
              className="text-xs text-avocado-600"
              title="Weighted average duration across all holdings"
            >
              avg duration {portfolioDuration.toFixed(2)} yr
            </p>
          )}
        </div>
        {portfolioHasAllocation && <PortfolioAllocationBars targeted={portfolioTargeted} />}
      </header>

      <div className="flex flex-col gap-6">
        {goalCards.map((card) => (
          <GoalAllocationCard
            key={card.goal.id}
            goal={card.goal}
            total={card.total}
            targeted={card.targeted}
            duration={card.duration}
            accountCount={card.accountCount}
            accountBreakdowns={card.accountBreakdowns}
            hasHoldings={card.hasHoldings}
          />
        ))}
      </div>
    </div>
  );
}

type PortfolioSlice = { name: TypeName; current: number };

function PortfolioAllocationBars({ targeted }: { targeted: PortfolioSlice[] }) {
  const slices = targeted.map((b) => ({ name: b.name, pct: b.current }));
  const legendItems = slices.filter((s) => s.pct > 0.001);

  return (
    <div className="flex flex-col gap-2">
      <StackedBar
        slices={slices.map((s) => ({ key: s.name, pct: s.pct, colorClass: TYPE_COLORS[s.name] }))}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm ${TYPE_COLORS[item.name]}`} />
            <span className="text-xs text-avocado-700">
              {item.name} {formatPercent(item.pct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
