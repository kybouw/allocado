import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "../index";
import { assetClassAllocations, assetClasses, assets } from "../schema";

/** List assets available to a user: system library + their own. */
export async function listAssetsForUser(userId: string) {
  return db
    .select()
    .from(assets)
    .where(or(isNull(assets.userId), eq(assets.userId, userId)))
    .orderBy(asc(assets.ticker));
}

/** List asset classes available to a user: system library + their own. */
export async function listAssetClassesForUser(userId: string) {
  return db
    .select()
    .from(assetClasses)
    .where(or(isNull(assetClasses.userId), eq(assetClasses.userId, userId)))
    .orderBy(asc(assetClasses.type), asc(assetClasses.name));
}

/** Class mapping rows for all accessible assets. Needed for drift math. */
export async function listAssetClassAllocationsForUser(userId: string) {
  return db
    .select({
      assetId: assetClassAllocations.assetId,
      assetClassId: assetClassAllocations.assetClassId,
      ratio: assetClassAllocations.ratio,
    })
    .from(assetClassAllocations)
    .innerJoin(assets, eq(assetClassAllocations.assetId, assets.id))
    .where(or(isNull(assets.userId), eq(assets.userId, userId)));
}

export async function listAssetsWithClasses(userId: string) {
  const rows = await db
    .select({
      assetId: assets.id,
      assetUserId: assets.userId,
      ticker: assets.ticker,
      assetName: assets.name,
      avgDurationYears: assets.avgDurationYears,
      notes: assets.notes,
      classId: assetClasses.id,
      className: assetClasses.name,
      classType: assetClasses.type,
      ratio: assetClassAllocations.ratio,
    })
    .from(assets)
    .leftJoin(assetClassAllocations, eq(assetClassAllocations.assetId, assets.id))
    .leftJoin(assetClasses, eq(assetClasses.id, assetClassAllocations.assetClassId))
    .where(or(isNull(assets.userId), eq(assets.userId, userId)))
    .orderBy(asc(assets.ticker));
  return rows;
}

export async function getAssetWithClasses(userId: string, assetId: string) {
  const rows = await db
    .select({
      assetId: assets.id,
      assetUserId: assets.userId,
      ticker: assets.ticker,
      assetName: assets.name,
      avgDurationYears: assets.avgDurationYears,
      notes: assets.notes,
      classAllocId: assetClassAllocations.id,
      classId: assetClasses.id,
      className: assetClasses.name,
      classType: assetClasses.type,
      ratio: assetClassAllocations.ratio,
    })
    .from(assets)
    .leftJoin(assetClassAllocations, eq(assetClassAllocations.assetId, assets.id))
    .leftJoin(assetClasses, eq(assetClasses.id, assetClassAllocations.assetClassId))
    .where(and(eq(assets.id, assetId), or(isNull(assets.userId), eq(assets.userId, userId))));
  return rows;
}
