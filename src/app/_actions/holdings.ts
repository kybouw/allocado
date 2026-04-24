"use server";

import { db } from "@allocado/db";
import { requireUserId } from "@allocado/db/auth";
import { accounts, holdings } from "@allocado/db/schema";
import { parseMoneyInput } from "@allocado/lib/money";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function assertAccountOwned(userId: string, accountId: string) {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)))
    .limit(1);
  if (!rows[0]) throw new Error("account not found");
}

async function assertHoldingOwned(userId: string, holdingId: string) {
  const rows = await db
    .select({ id: holdings.id })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(and(eq(accounts.userId, userId), eq(holdings.id, holdingId)))
    .limit(1);
  if (!rows[0]) throw new Error("holding not found");
}

export async function upsertHolding(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const accountId = String(formData.get("accountId") ?? "").trim();
    const assetId = String(formData.get("assetId") ?? "").trim();
    const rawValue = String(formData.get("value") ?? "").trim();
    const rawShares = String(formData.get("shares") ?? "").trim();

    if (!accountId || !assetId) return { ok: false, error: "Account and asset are required" };
    if (!rawValue) return { ok: false, error: "Value is required" };

    await assertAccountOwned(userId, accountId);

    let value: string;
    try {
      value = parseMoneyInput(rawValue);
    } catch {
      return { ok: false, error: "Invalid value" };
    }

    let shares: string | null = null;
    if (rawShares !== "") {
      try {
        shares = parseMoneyInput(rawShares);
      } catch {
        return { ok: false, error: "Invalid share count" };
      }
    }

    // Upsert on (account_id, asset_id)
    const [row] = await db
      .insert(holdings)
      .values({ accountId, assetId, value, shares })
      .onConflictDoUpdate({
        target: [holdings.accountId, holdings.assetId],
        set: { value, shares, updatedAt: new Date() },
      })
      .returning({ id: holdings.id });

    revalidatePath(`/accounts/${accountId}`);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteHolding(holdingId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await assertHoldingOwned(userId, holdingId);
    await db.delete(holdings).where(eq(holdings.id, holdingId));
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
