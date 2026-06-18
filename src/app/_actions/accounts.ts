"use server";

import { db } from "@allocado/db";
import { requireUserId } from "@allocado/db/auth";
import { maxAccountSortOrder } from "@allocado/db/queries/accounts";
import { accounts, goals } from "@allocado/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

type AccountType = "taxable" | "ira" | "roth_ira" | "401k" | "hsa" | "other";
const ACCOUNT_TYPES: AccountType[] = ["taxable", "ira", "roth_ira", "401k", "hsa", "other"];

export async function createAccount(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const name = String(formData.get("name") ?? "").trim();
    const goalId = String(formData.get("goalId") ?? "").trim();
    const institution = String(formData.get("institution") ?? "").trim() || null;
    const accountType = String(formData.get("accountType") ?? "") as AccountType;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!name) return { ok: false, error: "Name is required" };
    if (!goalId) return { ok: false, error: "Goal is required" };
    if (!ACCOUNT_TYPES.includes(accountType)) return { ok: false, error: "Invalid account type" };

    const goal = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.id, goalId)))
      .limit(1);
    if (!goal[0]) return { ok: false, error: "Goal not found" };

    const sortOrder = (await maxAccountSortOrder(userId)) + 1;

    const [row] = await db
      .insert(accounts)
      .values({ userId, goalId, name, institution, accountType, notes, sortOrder })
      .returning({ id: accounts.id });

    revalidatePath("/accounts");
    revalidatePath(`/goals/${goalId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateAccount(accountId: string, formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const name = String(formData.get("name") ?? "").trim();
    const goalId = String(formData.get("goalId") ?? "").trim();
    const institution = String(formData.get("institution") ?? "").trim() || null;
    const accountType = String(formData.get("accountType") ?? "") as AccountType;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!name) return { ok: false, error: "Name is required" };
    if (!ACCOUNT_TYPES.includes(accountType)) return { ok: false, error: "Invalid account type" };

    await db
      .update(accounts)
      .set({ name, goalId, institution, accountType, notes })
      .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));

    revalidatePath("/accounts");
    revalidatePath(`/accounts/${accountId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteAccount(accountId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function reorderAccounts(orderedIds: string[]): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(accounts)
          .set({ sortOrder: i })
          .where(and(eq(accounts.id, orderedIds[i]), eq(accounts.userId, userId)));
      }
    });
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
