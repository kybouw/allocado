import { eq } from "drizzle-orm";
import { db } from "../index";
import { allocationTargets } from "../schema";

export async function listTargetsForGoal(goalId: string) {
  return db
    .select({
      id: allocationTargets.id,
      stockTargetPct: allocationTargets.stockTargetPct,
      bondTargetPct: allocationTargets.bondTargetPct,
      cashTargetPct: allocationTargets.cashTargetPct,
      effectiveDate: allocationTargets.effectiveDate,
    })
    .from(allocationTargets)
    .where(eq(allocationTargets.goalId, goalId));
}
