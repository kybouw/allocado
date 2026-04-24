"use server";

import { db } from "@allocado/db";
import { requireUserId } from "@allocado/db/auth";
import { allocationTargets, goals } from "@allocado/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function assertGoalOwned(userId: string, goalId: string) {
  const rows = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId)))
    .limit(1);
  if (!rows[0]) throw new Error("goal not found");
}

export type TargetInput = {
  assetClassId: string;
  targetPct: number;
  effectiveDate: string | null;
};

/**
 * Replace all static (effectiveDate = null) targets for a goal with the given set.
 * This is the most common case for MVP — glide-path dated rows are managed separately.
 */
export async function setStaticTargets(
  goalId: string,
  inputs: TargetInput[],
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await assertGoalOwned(userId, goalId);

    for (const t of inputs) {
      if (!(t.targetPct >= 0 && t.targetPct <= 100)) {
        return { ok: false, error: `Target ${t.targetPct} out of range 0–100` };
      }
    }

    // Use neon-serverless WebSocket transaction to make the replace atomic.
    await db.transaction(async (tx) => {
      await tx
        .delete(allocationTargets)
        .where(and(eq(allocationTargets.goalId, goalId), isNull(allocationTargets.effectiveDate)));
      if (inputs.length > 0) {
        await tx.insert(allocationTargets).values(
          inputs.map((t) => ({
            goalId,
            assetClassId: t.assetClassId,
            targetPct: t.targetPct.toFixed(2),
            effectiveDate: null,
          })),
        );
      }
    });

    revalidatePath(`/goals/${goalId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
