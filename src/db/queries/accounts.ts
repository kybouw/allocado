import { and, asc, eq } from "drizzle-orm";
import { db } from "../index";
import { accounts, goals } from "../schema";

export async function listAccounts(userId: string) {
  return db
    .select({
      id: accounts.id,
      name: accounts.name,
      institution: accounts.institution,
      accountType: accounts.accountType,
      notes: accounts.notes,
      createdAt: accounts.createdAt,
      goalId: accounts.goalId,
      goalName: goals.name,
    })
    .from(accounts)
    .leftJoin(goals, eq(accounts.goalId, goals.id))
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.createdAt));
}

export async function listAccountsForGoal(userId: string, goalId: string) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.goalId, goalId)))
    .orderBy(asc(accounts.createdAt));
}

export async function getAccount(userId: string, accountId: string) {
  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)))
    .limit(1);
  return rows[0] ?? null;
}
