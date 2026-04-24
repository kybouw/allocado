import { eq } from "drizzle-orm";
import { db } from "../index";
import { allocationTargets, assetClasses } from "../schema";

export async function listTargetsForGoal(goalId: string) {
  return db
    .select({
      id: allocationTargets.id,
      assetClassId: allocationTargets.assetClassId,
      className: assetClasses.name,
      classType: assetClasses.type,
      targetPct: allocationTargets.targetPct,
      effectiveDate: allocationTargets.effectiveDate,
    })
    .from(allocationTargets)
    .innerJoin(assetClasses, eq(allocationTargets.assetClassId, assetClasses.id))
    .where(eq(allocationTargets.goalId, goalId));
}
