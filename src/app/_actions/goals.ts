"use server";

import { db } from "@allocado/db";
import { requireUserId } from "@allocado/db/auth";
import { goals } from "@allocado/db/schema";
import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export async function createGoal(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const name = String(formData.get("name") ?? "").trim();
    const targetDate = String(formData.get("targetDate") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;
    if (!name) return { ok: false, error: "Name is required" };

    const [{ maxOrder }] = await db
      .select({ maxOrder: max(goals.sortOrder) })
      .from(goals)
      .where(eq(goals.userId, userId));

    const [row] = await db
      .insert(goals)
      .values({ userId, name, targetDate, notes, sortOrder: (maxOrder ?? -1) + 1 })
      .returning({ id: goals.id });

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateGoal(goalId: string, formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const name = String(formData.get("name") ?? "").trim();
    const targetDate = String(formData.get("targetDate") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;
    if (!name) return { ok: false, error: "Name is required" };

    await db
      .update(goals)
      .set({ name, targetDate, notes })
      .where(and(eq(goals.userId, userId), eq(goals.id, goalId)));

    revalidatePath("/goals");
    revalidatePath(`/goals/${goalId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.delete(goals).where(and(eq(goals.userId, userId), eq(goals.id, goalId)));
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Persist a new ordering given the full ordered list of goal IDs. */
export async function reorderGoals(orderedIds: string[]): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(goals)
          .set({ sortOrder: i })
          .where(and(eq(goals.id, orderedIds[i]), eq(goals.userId, userId)));
      }
    });
    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function moveGoal(goalId: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const allGoals = await db
      .select({ id: goals.id, sortOrder: goals.sortOrder })
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(goals.sortOrder, goals.createdAt);

    const idx = allGoals.findIndex((g) => g.id === goalId);
    if (idx === -1) return { ok: false, error: "Goal not found" };

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allGoals.length) return { ok: true }; // already at boundary

    const a = allGoals[idx];
    const b = allGoals[swapIdx];

    await db.transaction(async (tx) => {
      await tx.update(goals).set({ sortOrder: b.sortOrder }).where(eq(goals.id, a.id));
      await tx.update(goals).set({ sortOrder: a.sortOrder }).where(eq(goals.id, b.id));
    });

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
