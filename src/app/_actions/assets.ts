"use server";

import { db } from "@allocado/db";
import { requireUserId } from "@allocado/db/auth";
import { assetClassAllocations, assets } from "@allocado/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export async function createAsset(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const ticker = String(formData.get("ticker") ?? "")
      .trim()
      .toUpperCase();
    const name = String(formData.get("name") ?? "").trim();
    const avgDurationYears = String(formData.get("avgDurationYears") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!ticker) return { ok: false, error: "Ticker is required" };
    if (!name) return { ok: false, error: "Name is required" };

    const [row] = await db
      .insert(assets)
      .values({ userId, ticker, name, avgDurationYears, notes, otherPct: "100" })
      .returning({ id: assets.id });

    revalidatePath("/assets");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("unique"))
      return { ok: false, error: "You already have an asset with that ticker" };
    return { ok: false, error: msg };
  }
}

export async function updateAsset(assetId: string, formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const ticker = String(formData.get("ticker") ?? "")
      .trim()
      .toUpperCase();
    const name = String(formData.get("name") ?? "").trim();
    const avgDurationYears = String(formData.get("avgDurationYears") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!ticker) return { ok: false, error: "Ticker is required" };
    if (!name) return { ok: false, error: "Name is required" };

    await db
      .update(assets)
      .set({ ticker, name, avgDurationYears, notes })
      .where(and(eq(assets.id, assetId), eq(assets.userId, userId)));

    revalidatePath("/assets");
    revalidatePath(`/assets/${assetId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteAsset(assetId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.delete(assets).where(and(eq(assets.id, assetId), eq(assets.userId, userId)));
    revalidatePath("/assets");
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("foreign key") || msg.includes("violates"))
      return { ok: false, error: "Cannot delete — this asset is used in holdings" };
    return { ok: false, error: msg };
  }
}

export async function updateAssetTypePcts(
  assetId: string,
  pcts: { stockPct: number; bondPct: number; cashPct: number; otherPct: number },
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const sum = pcts.stockPct + pcts.bondPct + pcts.cashPct + pcts.otherPct;
    if (Math.round(sum * 100) !== 10000) {
      return { ok: false, error: `Percentages must sum to 100% (got ${sum.toFixed(2)}%)` };
    }

    const updated = await db
      .update(assets)
      .set({
        stockPct: pcts.stockPct.toFixed(2),
        bondPct: pcts.bondPct.toFixed(2),
        cashPct: pcts.cashPct.toFixed(2),
        otherPct: pcts.otherPct.toFixed(2),
      })
      .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
      .returning({ id: assets.id });

    if (updated.length === 0) return { ok: false, error: "Asset not found" };

    revalidatePath("/assets");
    revalidatePath(`/assets/${assetId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export type ClassAllocInput = { assetClassId: string; ratio: number };

export async function setAssetAllocations(
  assetId: string,
  inputs: ClassAllocInput[],
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    // Verify ownership
    const [owner] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
      .limit(1);
    if (!owner) return { ok: false, error: "Asset not found" };

    for (const i of inputs) {
      if (!(i.ratio >= 0 && i.ratio <= 100))
        return { ok: false, error: `Ratio ${i.ratio} out of range 0–100` };
    }

    await db.transaction(async (tx) => {
      await tx.delete(assetClassAllocations).where(eq(assetClassAllocations.assetId, assetId));
      if (inputs.length > 0) {
        await tx.insert(assetClassAllocations).values(
          inputs.map((i) => ({
            assetId,
            assetClassId: i.assetClassId,
            ratio: i.ratio.toFixed(2),
          })),
        );
      }
    });

    revalidatePath("/assets");
    revalidatePath(`/assets/${assetId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
