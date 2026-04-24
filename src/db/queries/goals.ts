import { and, asc, eq } from "drizzle-orm";
import { db } from "../index";
import { goals } from "../schema";

export async function listGoals(userId: string) {
  return db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(asc(goals.sortOrder), asc(goals.createdAt));
}

export async function getGoal(userId: string, goalId: string) {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId)))
    .limit(1);
  return rows[0] ?? null;
}
