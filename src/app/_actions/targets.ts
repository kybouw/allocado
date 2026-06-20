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
  stockTargetPct: number;
  bondTargetPct: number;
  cashTargetPct: number;
  otherTargetPct: number;
  effectiveDate: string | null;
};

/**
 * Replace the static (effectiveDate = null) target for a goal with the given values.
 */
export async function setStaticTargets(goalId: string, input: TargetInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await assertGoalOwned(userId, goalId);

    const sum =
      input.stockTargetPct + input.bondTargetPct + input.cashTargetPct + input.otherTargetPct;
    if (Math.round(sum * 100) !== 10000) {
      return { ok: false, error: `Targets must sum to 100% (got ${sum.toFixed(2)}%)` };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(allocationTargets)
        .where(and(eq(allocationTargets.goalId, goalId), isNull(allocationTargets.effectiveDate)));
      await tx.insert(allocationTargets).values({
        goalId,
        stockTargetPct: input.stockTargetPct.toFixed(2),
        bondTargetPct: input.bondTargetPct.toFixed(2),
        cashTargetPct: input.cashTargetPct.toFixed(2),
        otherTargetPct: input.otherTargetPct.toFixed(2),
        effectiveDate: null,
      });
    });

    revalidatePath(`/goals/${goalId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
