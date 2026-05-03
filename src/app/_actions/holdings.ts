"use server";

import { db } from "@allocado/db";
import { requireUserId } from "@allocado/db/auth";
import { accounts, assets, holdings } from "@allocado/db/schema";
import { parseMoneyInput } from "@allocado/lib/money";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export type HoldingInput = {
  assetId: string;
  value: string;
  shares: string | null;
};

async function assertAccountOwned(userId: string, accountId: string) {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)))
    .limit(1);
  if (!rows[0]) throw new Error("account not found");
}

export async function replaceHoldings(
  accountId: string,
  items: HoldingInput[],
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    if (!accountId) return { ok: false, error: "Account is required" };

    await assertAccountOwned(userId, accountId);

    const seen = new Set<string>();
    const normalized: { assetId: string; value: string; shares: string | null }[] = [];
    for (const item of items) {
      const assetId = String(item.assetId ?? "").trim();
      if (!assetId) return { ok: false, error: "Each row must have an asset selected" };
      if (seen.has(assetId)) return { ok: false, error: "Each asset may only appear once" };
      seen.add(assetId);

      const rawValue = String(item.value ?? "").trim();
      if (!rawValue) return { ok: false, error: "Value is required for every row" };
      let value: string;
      try {
        value = parseMoneyInput(rawValue);
      } catch {
        return { ok: false, error: `Invalid value: ${rawValue}` };
      }

      let shares: string | null = null;
      const rawShares = item.shares == null ? "" : String(item.shares).trim();
      if (rawShares !== "") {
        try {
          shares = parseMoneyInput(rawShares);
        } catch {
          return { ok: false, error: `Invalid share count: ${rawShares}` };
        }
      }

      normalized.push({ assetId, value, shares });
    }

    if (normalized.length > 0) {
      const assetIds = normalized.map((n) => n.assetId);
      const ownedAssets = await db
        .select({ id: assets.id })
        .from(assets)
        .where(
          and(inArray(assets.id, assetIds), or(isNull(assets.userId), eq(assets.userId, userId))),
        );
      if (ownedAssets.length !== assetIds.length) {
        return { ok: false, error: "One or more assets are unavailable" };
      }
    }

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ assetId: holdings.assetId })
        .from(holdings)
        .where(eq(holdings.accountId, accountId));
      const existingIds = new Set(existing.map((r) => r.assetId));
      const desiredIds = new Set(normalized.map((n) => n.assetId));

      const toDelete = [...existingIds].filter((id) => !desiredIds.has(id));
      if (toDelete.length > 0) {
        await tx
          .delete(holdings)
          .where(and(eq(holdings.accountId, accountId), inArray(holdings.assetId, toDelete)));
      }

      if (normalized.length > 0) {
        await tx
          .insert(holdings)
          .values(normalized.map((n) => ({ accountId, ...n })))
          .onConflictDoUpdate({
            target: [holdings.accountId, holdings.assetId],
            set: {
              value: sql`excluded.value`,
              shares: sql`excluded.shares`,
              updatedAt: new Date(),
            },
          });
      }
    });

    revalidatePath(`/accounts/${accountId}`);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
