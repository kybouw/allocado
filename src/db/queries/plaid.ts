import { and, asc, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "../index";
import { accounts, plaidAccounts, plaidHoldings, plaidItems, plaidSecurities } from "../schema";

export async function listPlaidItemsForUser(userId: string) {
  const items = await db
    .select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
      status: plaidItems.status,
      lastErrorCode: plaidItems.lastErrorCode,
      lastSyncedAt: plaidItems.lastSyncedAt,
      createdAt: plaidItems.createdAt,
    })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId))
    .orderBy(asc(plaidItems.createdAt));

  if (items.length === 0) return [];

  const accountRows = await db
    .select({
      id: plaidAccounts.id,
      itemId: plaidAccounts.itemId,
      name: plaidAccounts.name,
      mask: plaidAccounts.mask,
      plaidSubtype: plaidAccounts.plaidSubtype,
      accountId: plaidAccounts.accountId,
      linkedAccountName: accounts.name,
    })
    .from(plaidAccounts)
    .innerJoin(plaidItems, eq(plaidAccounts.itemId, plaidItems.id))
    .leftJoin(accounts, eq(plaidAccounts.accountId, accounts.id))
    .where(eq(plaidItems.userId, userId))
    .orderBy(asc(plaidAccounts.name));

  return items.map((item) => ({
    ...item,
    plaidAccounts: accountRows.filter((a) => a.itemId === item.id),
  }));
}

export async function listUnmappedSecuritiesForUser(userId: string) {
  return db
    .select({
      id: plaidSecurities.id,
      ticker: plaidSecurities.ticker,
      name: plaidSecurities.name,
      totalValue: sql<string>`sum(${plaidHoldings.institutionValue})`,
      accountCount: sql<number>`count(distinct ${plaidHoldings.plaidAccountId})::int`,
    })
    .from(plaidSecurities)
    .innerJoin(plaidHoldings, eq(plaidHoldings.plaidSecurityId, plaidSecurities.id))
    .where(and(eq(plaidSecurities.userId, userId), isNull(plaidSecurities.assetId)))
    .groupBy(plaidSecurities.id)
    .orderBy(asc(plaidSecurities.ticker), asc(plaidSecurities.name));
}

export async function getPlaidLinkForAccount(userId: string, accountId: string) {
  const rows = await db
    .select({
      itemId: plaidItems.id,
      plaidAccountId: plaidAccounts.id,
      institutionName: plaidItems.institutionName,
      status: plaidItems.status,
      lastSyncedAt: plaidItems.lastSyncedAt,
    })
    .from(plaidAccounts)
    .innerJoin(plaidItems, eq(plaidAccounts.itemId, plaidItems.id))
    .where(and(eq(plaidItems.userId, userId), eq(plaidAccounts.accountId, accountId)))
    .limit(1);
  const link = rows[0];
  if (!link) return null;

  const [{ unmappedValue }] = await db
    .select({ unmappedValue: sql<string | null>`sum(${plaidHoldings.institutionValue})` })
    .from(plaidHoldings)
    .innerJoin(plaidSecurities, eq(plaidHoldings.plaidSecurityId, plaidSecurities.id))
    .where(
      and(eq(plaidHoldings.plaidAccountId, link.plaidAccountId), isNull(plaidSecurities.assetId)),
    );

  return { ...link, unmappedValue };
}

/** Asset ids whose holdings in this app account are managed by Plaid sync. */
export async function getPlaidManagedAssetIdsForAccount(accountId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ assetId: plaidSecurities.assetId })
    .from(plaidHoldings)
    .innerJoin(plaidAccounts, eq(plaidHoldings.plaidAccountId, plaidAccounts.id))
    .innerJoin(plaidSecurities, eq(plaidHoldings.plaidSecurityId, plaidSecurities.id))
    .where(and(eq(plaidAccounts.accountId, accountId), isNotNull(plaidSecurities.assetId)));
  return rows.map((r) => r.assetId).filter((id): id is string => id != null);
}

/** App accounts not yet linked to any Plaid account, for the link dropdown. */
export async function listLinkableAccounts(userId: string) {
  const linked = db
    .select({ accountId: plaidAccounts.accountId })
    .from(plaidAccounts)
    .where(isNotNull(plaidAccounts.accountId));
  return db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), notInArray(accounts.id, linked)))
    .orderBy(asc(accounts.sortOrder), asc(accounts.createdAt));
}
