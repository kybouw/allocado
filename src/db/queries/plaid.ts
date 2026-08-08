import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../index";
import {
  accounts,
  plaidAccountSecurities,
  plaidAccounts,
  plaidHoldings,
  plaidItems,
  plaidSecurities,
} from "../schema";

/** Institution connections with their Plaid accounts, for the settings page. */
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

/** The Plaid connection feeding an app account, or null. */
export async function getPlaidLinkForAccount(userId: string, accountId: string) {
  const rows = await db
    .select({
      itemId: plaidItems.id,
      plaidAccountRowId: plaidAccounts.id,
      plaidAccountName: plaidAccounts.name,
      mask: plaidAccounts.mask,
      institutionName: plaidItems.institutionName,
      status: plaidItems.status,
      lastSyncedAt: plaidItems.lastSyncedAt,
    })
    .from(plaidAccounts)
    .innerJoin(plaidItems, eq(plaidAccounts.itemId, plaidItems.id))
    .where(and(eq(plaidItems.userId, userId), eq(plaidAccounts.accountId, accountId)))
    .limit(1);
  return rows[0] ?? null;
}

/** All current positions in a Plaid account with their mapping (assetId null = unmapped). */
export async function listPositionsForPlaidAccount(plaidAccountRowId: string) {
  return db
    .select({
      securityRowId: plaidSecurities.id,
      ticker: plaidSecurities.ticker,
      name: plaidSecurities.name,
      value: plaidHoldings.institutionValue,
      assetId: plaidAccountSecurities.assetId,
    })
    .from(plaidHoldings)
    .innerJoin(plaidSecurities, eq(plaidHoldings.plaidSecurityId, plaidSecurities.id))
    .leftJoin(
      plaidAccountSecurities,
      and(
        eq(plaidAccountSecurities.plaidAccountId, plaidHoldings.plaidAccountId),
        eq(plaidAccountSecurities.plaidSecurityId, plaidHoldings.plaidSecurityId),
      ),
    )
    .where(eq(plaidHoldings.plaidAccountId, plaidAccountRowId))
    .orderBy(asc(plaidSecurities.ticker), asc(plaidSecurities.name));
}

/** Asset ids whose holdings in this app account are managed by Plaid sync (current positions only). */
export async function getPlaidManagedAssetIdsForAccount(accountId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ assetId: plaidAccountSecurities.assetId })
    .from(plaidAccountSecurities)
    .innerJoin(plaidAccounts, eq(plaidAccountSecurities.plaidAccountId, plaidAccounts.id))
    .innerJoin(
      plaidHoldings,
      and(
        eq(plaidHoldings.plaidAccountId, plaidAccountSecurities.plaidAccountId),
        eq(plaidHoldings.plaidSecurityId, plaidAccountSecurities.plaidSecurityId),
      ),
    )
    .where(eq(plaidAccounts.accountId, accountId));
  return rows.map((r) => r.assetId);
}

/** Plaid accounts not yet linked to any app account, for the account-detail link dropdown. */
export async function listUnlinkedPlaidAccounts(userId: string) {
  return db
    .select({
      id: plaidAccounts.id,
      name: plaidAccounts.name,
      mask: plaidAccounts.mask,
      institutionName: plaidItems.institutionName,
    })
    .from(plaidAccounts)
    .innerJoin(plaidItems, eq(plaidAccounts.itemId, plaidItems.id))
    .where(and(eq(plaidItems.userId, userId), isNull(plaidAccounts.accountId)))
    .orderBy(asc(plaidItems.institutionName), asc(plaidAccounts.name));
}
