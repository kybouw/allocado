import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { accounts, assets, holdings } from "../schema";

export async function listHoldingsForAccount(userId: string, accountId: string) {
  return db
    .select({
      id: holdings.id,
      assetId: holdings.assetId,
      ticker: assets.ticker,
      assetName: assets.name,
      value: holdings.value,
      updatedAt: holdings.updatedAt,
    })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .innerJoin(assets, eq(holdings.assetId, assets.id))
    .where(and(eq(accounts.userId, userId), eq(holdings.accountId, accountId)))
    .orderBy(asc(assets.ticker));
}

export async function listHoldingsForGoal(userId: string, goalId: string) {
  return db
    .select({
      id: holdings.id,
      accountId: holdings.accountId,
      assetId: holdings.assetId,
      ticker: assets.ticker,
      assetName: assets.name,
      value: holdings.value,
    })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .innerJoin(assets, eq(holdings.assetId, assets.id))
    .where(and(eq(accounts.userId, userId), eq(accounts.goalId, goalId)));
}

export async function listHoldingsForUser(userId: string) {
  return db
    .select({
      id: holdings.id,
      accountId: holdings.accountId,
      goalId: accounts.goalId,
      assetId: holdings.assetId,
      value: holdings.value,
    })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(eq(accounts.userId, userId));
}

export async function listHoldingsWithAssetsForUser(userId: string) {
  return db
    .select({
      id: holdings.id,
      accountId: holdings.accountId,
      ticker: assets.ticker,
      assetName: assets.name,
      value: holdings.value,
    })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .innerJoin(assets, eq(holdings.assetId, assets.id))
    .where(eq(accounts.userId, userId))
    .orderBy(asc(assets.ticker));
}

export async function assertAccountOwnership(userId: string, accountId: string) {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)))
    .limit(1);
  if (!rows[0]) throw new Error("account not found");
}

export async function assertHoldingsOwnership(userId: string, holdingIds: string[]) {
  if (holdingIds.length === 0) return;
  const rows = await db
    .select({ id: holdings.id })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(and(eq(accounts.userId, userId), inArray(holdings.id, holdingIds)));
  if (rows.length !== holdingIds.length) throw new Error("holding not found");
}
