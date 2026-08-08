"use server";

import { db } from "@allocado/db";
import { requireUserId } from "@allocado/db/auth";
import {
  accounts,
  assets,
  holdings,
  plaidAccounts,
  plaidHoldings,
  plaidItems,
  plaidSecurities,
} from "@allocado/db/schema";
import { moneyFromNumber } from "@allocado/lib/money";
import { plaidClient } from "@allocado/lib/plaid";
import { and, eq, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CountryCode, Products } from "plaid";

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function assertPlaidItemOwned(userId: string, itemId: string) {
  const rows = await db
    .select({ id: plaidItems.id, accessToken: plaidItems.accessToken })
    .from(plaidItems)
    .where(and(eq(plaidItems.userId, userId), eq(plaidItems.id, itemId)))
    .limit(1);
  if (!rows[0]) throw new Error("connection not found");
  return rows[0];
}

function plaidErrorCode(e: unknown): string | null {
  const data = (e as { response?: { data?: { error_code?: string } } }).response?.data;
  return data?.error_code ?? null;
}

export async function createPlaidLinkToken(
  itemId?: string,
): Promise<ActionResult<{ linkToken: string }>> {
  try {
    const userId = await requireUserId();

    let accessToken: string | undefined;
    if (itemId) {
      const item = await assertPlaidItemOwned(userId, itemId);
      accessToken = item.accessToken;
    }

    const res = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Allocado",
      language: "en",
      country_codes: [CountryCode.Us],
      // Update mode (re-auth): pass the access token and omit products.
      ...(accessToken ? { access_token: accessToken } : { products: [Products.Investments] }),
    });
    return { ok: true, data: { linkToken: res.data.link_token } };
  } catch (e) {
    return { ok: false, error: plaidErrorCode(e) ?? (e as Error).message };
  }
}

export async function exchangePlaidPublicToken(
  publicToken: string,
  metadata: { institutionId: string | null; institutionName: string | null },
): Promise<ActionResult<{ itemId: string }>> {
  try {
    const userId = await requireUserId();
    if (!publicToken) return { ok: false, error: "Missing public token" };

    if (metadata.institutionId) {
      const existing = await db
        .select({ id: plaidItems.id })
        .from(plaidItems)
        .where(
          and(eq(plaidItems.userId, userId), eq(plaidItems.institutionId, metadata.institutionId)),
        )
        .limit(1);
      if (existing[0]) {
        return {
          ok: false,
          error: "This institution is already connected. Remove it first to reconnect.",
        };
      }
    }

    const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });

    const [item] = await db
      .insert(plaidItems)
      .values({
        userId,
        plaidItemId: exchange.data.item_id,
        accessToken: exchange.data.access_token,
        institutionId: metadata.institutionId,
        institutionName: metadata.institutionName,
      })
      .returning({ id: plaidItems.id });

    await syncItemInternal(userId, item.id);

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true, data: { itemId: item.id } };
  } catch (e) {
    return { ok: false, error: plaidErrorCode(e) ?? (e as Error).message };
  }
}

export async function linkPlaidAccount(
  plaidAccountRowId: string,
  accountId: string | null,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select({ id: plaidAccounts.id })
      .from(plaidAccounts)
      .innerJoin(plaidItems, eq(plaidAccounts.itemId, plaidItems.id))
      .where(and(eq(plaidItems.userId, userId), eq(plaidAccounts.id, plaidAccountRowId)))
      .limit(1);
    if (!rows[0]) return { ok: false, error: "connected account not found" };

    if (accountId) {
      const owned = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)))
        .limit(1);
      if (!owned[0]) return { ok: false, error: "account not found" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(plaidAccounts)
        .set({ accountId })
        .where(eq(plaidAccounts.id, plaidAccountRowId));
      if (accountId) {
        await applyMappedHoldings(tx, plaidAccountRowId, accountId);
      }
      // Unlinking leaves existing holdings in place — they simply become manual.
    });

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    if (accountId) revalidatePath(`/accounts/${accountId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function mapPlaidSecurity(
  securityRowId: string,
  assetId: string | null,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select({ id: plaidSecurities.id, prevAssetId: plaidSecurities.assetId })
      .from(plaidSecurities)
      .where(and(eq(plaidSecurities.userId, userId), eq(plaidSecurities.id, securityRowId)))
      .limit(1);
    const security = rows[0];
    if (!security) return { ok: false, error: "security not found" };

    if (assetId) {
      const visible = await db
        .select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.id, assetId), or(isNull(assets.userId), eq(assets.userId, userId))))
        .limit(1);
      if (!visible[0]) return { ok: false, error: "asset not found" };
    }

    // Linked app accounts that hold this security — their holdings need re-deriving.
    const affected = await db
      .select({ plaidAccountRowId: plaidAccounts.id, accountId: plaidAccounts.accountId })
      .from(plaidHoldings)
      .innerJoin(plaidAccounts, eq(plaidHoldings.plaidAccountId, plaidAccounts.id))
      .where(
        and(eq(plaidHoldings.plaidSecurityId, securityRowId), isNotNull(plaidAccounts.accountId)),
      );

    await db.transaction(async (tx) => {
      await tx
        .update(plaidSecurities)
        .set({ assetId })
        .where(eq(plaidSecurities.id, securityRowId));
      const stale = security.prevAssetId ? new Set([security.prevAssetId]) : undefined;
      for (const a of affected) {
        if (a.accountId) await applyMappedHoldings(tx, a.plaidAccountRowId, a.accountId, stale);
      }
    });

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    for (const a of affected) {
      if (a.accountId) revalidatePath(`/accounts/${a.accountId}`);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function syncPlaidItem(
  itemId: string,
): Promise<ActionResult<{ unmappedCount: number }>> {
  try {
    const userId = await requireUserId();
    await assertPlaidItemOwned(userId, itemId);
    const unmappedCount = await syncItemInternal(userId, itemId);

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    const linked = await db
      .select({ accountId: plaidAccounts.accountId })
      .from(plaidAccounts)
      .where(and(eq(plaidAccounts.itemId, itemId), isNotNull(plaidAccounts.accountId)));
    for (const row of linked) {
      if (row.accountId) revalidatePath(`/accounts/${row.accountId}`);
    }
    return { ok: true, data: { unmappedCount } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removePlaidItem(itemId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const item = await assertPlaidItemOwned(userId, itemId);

    try {
      await plaidClient.itemRemove({ access_token: item.accessToken });
    } catch {
      // Item may already be dead at Plaid; still remove it locally.
    }

    // Cascade removes plaid_accounts + plaid_holdings. Security mappings and app
    // holdings are kept — previously synced holdings simply become manual.
    await db.delete(plaidItems).where(eq(plaidItems.id, itemId));

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Re-derive app holdings for a linked account from the Plaid snapshot: sum
 * institution values grouped by mapped asset, upsert those holdings, and delete
 * holdings for `staleAssetIds` that are no longer derivable. Holdings for assets
 * never touched by sync are left alone.
 */
async function applyMappedHoldings(
  tx: Tx,
  plaidAccountRowId: string,
  accountId: string,
  staleAssetIds?: Set<string>,
) {
  const sums = await tx
    .select({
      assetId: plaidSecurities.assetId,
      total: sql<string>`sum(${plaidHoldings.institutionValue})`,
    })
    .from(plaidHoldings)
    .innerJoin(plaidSecurities, eq(plaidHoldings.plaidSecurityId, plaidSecurities.id))
    .where(
      and(eq(plaidHoldings.plaidAccountId, plaidAccountRowId), isNotNull(plaidSecurities.assetId)),
    )
    .groupBy(plaidSecurities.assetId);

  const mapped = sums.filter((s): s is { assetId: string; total: string } => s.assetId != null);

  if (mapped.length > 0) {
    await tx
      .insert(holdings)
      .values(mapped.map((s) => ({ accountId, assetId: s.assetId, value: s.total })))
      .onConflictDoUpdate({
        target: [holdings.accountId, holdings.assetId],
        set: { value: sql`excluded.value`, updatedAt: new Date() },
      });
  }

  if (staleAssetIds && staleAssetIds.size > 0) {
    const current = new Set(mapped.map((s) => s.assetId));
    const toDelete = [...staleAssetIds].filter((id) => !current.has(id));
    if (toDelete.length > 0) {
      await tx
        .delete(holdings)
        .where(and(eq(holdings.accountId, accountId), inArray(holdings.assetId, toDelete)));
    }
  }
}

/** Fetch holdings from Plaid and refresh snapshots + derived app holdings. Returns unmapped security count. */
async function syncItemInternal(userId: string, itemId: string): Promise<number> {
  const [item] = await db
    .select()
    .from(plaidItems)
    .where(and(eq(plaidItems.userId, userId), eq(plaidItems.id, itemId)))
    .limit(1);
  if (!item) throw new Error("connection not found");

  let response: Awaited<ReturnType<typeof plaidClient.investmentsHoldingsGet>>;
  try {
    response = await plaidClient.investmentsHoldingsGet({ access_token: item.accessToken });
  } catch (e) {
    const code = plaidErrorCode(e);
    await db
      .update(plaidItems)
      .set({
        status: code === "ITEM_LOGIN_REQUIRED" ? "login_required" : "error",
        lastErrorCode: code,
      })
      .where(eq(plaidItems.id, itemId));
    throw new Error(
      code === "ITEM_LOGIN_REQUIRED"
        ? "This connection needs to be re-authenticated. Use Reconnect."
        : `Plaid sync failed${code ? ` (${code})` : ""}`,
    );
  }

  const { accounts: plaidAccountList, securities, holdings: holdingList } = response.data;

  // Upsert the item's Plaid accounts (names/masks can change; new accounts can appear).
  const accountRowIdByPlaidId = new Map<string, string>();
  for (const a of plaidAccountList) {
    const [row] = await db
      .insert(plaidAccounts)
      .values({
        itemId,
        plaidAccountId: a.account_id,
        name: a.name,
        mask: a.mask,
        plaidType: a.type,
        plaidSubtype: a.subtype,
      })
      .onConflictDoUpdate({
        target: [plaidAccounts.plaidAccountId],
        set: { name: a.name, mask: a.mask },
      })
      .returning({ id: plaidAccounts.id });
    accountRowIdByPlaidId.set(a.account_id, row.id);
  }

  // Upsert securities; auto-match by ticker on first insert only, preferring the
  // user's own asset over a system asset when both share a ticker.
  const securityRowIdByPlaidId = new Map<string, string>();
  const existingSecurities = await db
    .select({ id: plaidSecurities.id, plaidSecurityId: plaidSecurities.plaidSecurityId })
    .from(plaidSecurities)
    .where(eq(plaidSecurities.userId, userId));
  const existingByPlaidId = new Map(existingSecurities.map((s) => [s.plaidSecurityId, s.id]));

  const visibleAssets = await db
    .select({ id: assets.id, ticker: assets.ticker, userId: assets.userId })
    .from(assets)
    .where(or(isNull(assets.userId), eq(assets.userId, userId)));
  const assetIdByTicker = new Map<string, string>();
  for (const a of visibleAssets) {
    const key = a.ticker.toUpperCase();
    if (a.userId != null || !assetIdByTicker.has(key)) assetIdByTicker.set(key, a.id);
  }

  for (const s of securities) {
    const existingId = existingByPlaidId.get(s.security_id);
    if (existingId) {
      await db
        .update(plaidSecurities)
        .set({ ticker: s.ticker_symbol, name: s.name })
        .where(eq(plaidSecurities.id, existingId));
      securityRowIdByPlaidId.set(s.security_id, existingId);
    } else {
      const autoAssetId = s.ticker_symbol
        ? (assetIdByTicker.get(s.ticker_symbol.toUpperCase()) ?? null)
        : null;
      const [row] = await db
        .insert(plaidSecurities)
        .values({
          userId,
          plaidSecurityId: s.security_id,
          ticker: s.ticker_symbol,
          name: s.name,
          assetId: autoAssetId,
        })
        .returning({ id: plaidSecurities.id });
      securityRowIdByPlaidId.set(s.security_id, row.id);
    }
  }

  // Group holdings by Plaid account and refresh each snapshot + derived holdings.
  const closePriceBySecurityRowId = new Map<string, number | null>();
  for (const s of securities) {
    const rowId = securityRowIdByPlaidId.get(s.security_id);
    if (rowId) closePriceBySecurityRowId.set(rowId, s.close_price ?? null);
  }

  for (const [plaidAccountId, accountRowId] of accountRowIdByPlaidId) {
    const rows = holdingList.filter((h) => h.account_id === plaidAccountId);

    const snapshot: { securityRowId: string; value: string; price: string | null }[] = [];
    for (const h of rows) {
      const securityRowId = securityRowIdByPlaidId.get(h.security_id);
      if (!securityRowId) continue;
      const rawValue =
        h.institution_value ??
        (h.institution_price != null ? h.quantity * h.institution_price : null);
      if (rawValue == null || !Number.isFinite(rawValue)) continue;
      const price = h.institution_price ?? closePriceBySecurityRowId.get(securityRowId) ?? null;
      snapshot.push({
        securityRowId,
        value: moneyFromNumber(rawValue),
        price: price != null ? moneyFromNumber(price) : null,
      });
    }

    const [linkRow] = await db
      .select({ accountId: plaidAccounts.accountId })
      .from(plaidAccounts)
      .where(eq(plaidAccounts.id, accountRowId))
      .limit(1);

    await db.transaction(async (tx) => {
      // Mapped assets derivable from the snapshot BEFORE replacing it — sync owns
      // (old ∪ new); anything else in the account is manual and untouched.
      const oldMapped = await tx
        .selectDistinct({ assetId: plaidSecurities.assetId })
        .from(plaidHoldings)
        .innerJoin(plaidSecurities, eq(plaidHoldings.plaidSecurityId, plaidSecurities.id))
        .where(
          and(eq(plaidHoldings.plaidAccountId, accountRowId), isNotNull(plaidSecurities.assetId)),
        );
      const staleAssetIds = new Set(
        oldMapped.map((r) => r.assetId).filter((id): id is string => id != null),
      );

      const keepIds = snapshot.map((s) => s.securityRowId);
      await tx
        .delete(plaidHoldings)
        .where(
          keepIds.length > 0
            ? and(
                eq(plaidHoldings.plaidAccountId, accountRowId),
                notInArray(plaidHoldings.plaidSecurityId, keepIds),
              )
            : eq(plaidHoldings.plaidAccountId, accountRowId),
        );
      if (snapshot.length > 0) {
        await tx
          .insert(plaidHoldings)
          .values(
            snapshot.map((s) => ({
              plaidAccountId: accountRowId,
              plaidSecurityId: s.securityRowId,
              institutionValue: s.value,
              institutionPrice: s.price,
            })),
          )
          .onConflictDoUpdate({
            target: [plaidHoldings.plaidAccountId, plaidHoldings.plaidSecurityId],
            set: {
              institutionValue: sql`excluded.institution_value`,
              institutionPrice: sql`excluded.institution_price`,
              updatedAt: new Date(),
            },
          });
      }

      if (linkRow?.accountId) {
        await applyMappedHoldings(tx, accountRowId, linkRow.accountId, staleAssetIds);
      }
    });
  }

  // Refresh prices on the user's own assets (system assets are never touched).
  const mappedSecurities = await db
    .select({ assetId: plaidSecurities.assetId, plaidSecurityId: plaidSecurities.plaidSecurityId })
    .from(plaidSecurities)
    .where(and(eq(plaidSecurities.userId, userId), isNotNull(plaidSecurities.assetId)));
  const priceByPlaidSecurityId = new Map<string, number>();
  for (const s of securities) {
    const price =
      holdingList.find((h) => h.security_id === s.security_id)?.institution_price ??
      s.close_price ??
      null;
    if (price != null && Number.isFinite(price)) priceByPlaidSecurityId.set(s.security_id, price);
  }
  for (const m of mappedSecurities) {
    const price = priceByPlaidSecurityId.get(m.plaidSecurityId);
    if (price == null || !m.assetId) continue;
    await db
      .update(assets)
      .set({ price: moneyFromNumber(price), priceUpdatedAt: new Date() })
      .where(and(eq(assets.id, m.assetId), eq(assets.userId, userId)));
  }

  await db
    .update(plaidItems)
    .set({ status: "ok", lastErrorCode: null, lastSyncedAt: new Date() })
    .where(eq(plaidItems.id, itemId));

  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${plaidSecurities.id})::int` })
    .from(plaidSecurities)
    .innerJoin(plaidHoldings, eq(plaidHoldings.plaidSecurityId, plaidSecurities.id))
    .where(and(eq(plaidSecurities.userId, userId), isNull(plaidSecurities.assetId)));
  return count;
}
