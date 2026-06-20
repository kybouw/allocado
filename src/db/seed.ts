import { eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { assetClassAllocations, assetClasses, assets } from "./schema";

type AssetClassType = "stock" | "bond" | "cash" | "other";

export const SYSTEM_CLASSES: Array<{
  name: string;
  type: AssetClassType;
  avgDurationYears?: string;
}> = [
  // ── Equity ───────────────────────────────────────────────────────────
  { name: "US Stocks", type: "stock" },
  { name: "Foreign Stocks", type: "stock" },
  { name: "Developed Markets", type: "stock" },
  { name: "Emerging Markets", type: "stock" },
  { name: "Large-Cap", type: "stock" },
  { name: "Mid-Cap", type: "stock" },
  { name: "Small-Cap", type: "stock" },
  // ── Fixed income ─────────────────────────────────────────────────────
  { name: "US Bonds", type: "bond" },
  { name: "Foreign Bonds", type: "bond" },
  { name: "Short-Term Bonds", type: "bond", avgDurationYears: "2.0" },
  { name: "Intermediate-Term Bonds", type: "bond", avgDurationYears: "5.5" },
  { name: "Long-Term Bonds", type: "bond", avgDurationYears: "15.0" },
  { name: "Treasury Bonds", type: "bond" },
  { name: "Muni Bonds (National)", type: "bond" },
  { name: "Muni Bonds (California)", type: "bond" },
  { name: "Taxable Bonds", type: "bond" },
  { name: "TIPS", type: "bond" },
  // ── Cash equivalents ─────────────────────────────────────────────────
  { name: "Money Market", type: "cash" },
  { name: "CDs", type: "cash" },
  // ── Other ────────────────────────────────────────────────────────────
  { name: "Crypto", type: "other" },
  { name: "Gold", type: "other" },
];

export type AssetSeed = {
  ticker: string;
  name: string;
  avgDurationYears?: string;
  stockPct: string;
  bondPct: string;
  cashPct: string;
  otherPct: string;
  classes: Array<[string, string]>; // [subclassName, ratio]
};

// Generic index archetypes — no fund family or provider implied.
// Use these as templates when a user's specific fund isn't listed.
export const SYSTEM_ASSETS: AssetSeed[] = [
  // ── Equity ───────────────────────────────────────────────────────────
  {
    ticker: "SP500",
    name: "S&P 500 Index",
    stockPct: "100",
    bondPct: "0",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Stocks", "100"],
      ["Large-Cap", "100"],
    ],
  },
  {
    ticker: "USMKT",
    name: "US Total Market Index",
    stockPct: "100",
    bondPct: "0",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Stocks", "100"],
      ["Large-Cap", "82"],
      ["Mid-Cap", "15"],
      ["Small-Cap", "3"],
    ],
  },
  {
    ticker: "USMID",
    name: "US Mid-Cap Index",
    stockPct: "100",
    bondPct: "0",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Stocks", "100"],
      ["Mid-Cap", "100"],
    ],
  },
  {
    ticker: "USSML",
    name: "US Small-Cap Index",
    stockPct: "100",
    bondPct: "0",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Stocks", "100"],
      ["Small-Cap", "100"],
    ],
  },
  {
    ticker: "INTL",
    name: "International Developed Markets Index",
    stockPct: "100",
    bondPct: "0",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["Foreign Stocks", "100"],
      ["Developed Markets", "100"],
    ],
  },
  {
    ticker: "EM",
    name: "Emerging Markets Index",
    stockPct: "100",
    bondPct: "0",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["Foreign Stocks", "100"],
      ["Emerging Markets", "100"],
    ],
  },
  {
    ticker: "WORLD",
    name: "Total World Stock Market Index",
    stockPct: "100",
    bondPct: "0",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Stocks", "60"],
      ["Foreign Stocks", "40"],
      ["Developed Markets", "88"],
      ["Emerging Markets", "12"],
    ],
  },
  // ── Fixed income ─────────────────────────────────────────────────────
  {
    ticker: "USBND",
    name: "US Total Bond Market Index",
    avgDurationYears: "6.5",
    stockPct: "0",
    bondPct: "100",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Bonds", "100"],
      ["Intermediate-Term Bonds", "100"],
      ["Taxable Bonds", "100"],
    ],
  },
  {
    ticker: "STSTRS",
    name: "US Short-Term Treasury Index",
    avgDurationYears: "2.0",
    stockPct: "0",
    bondPct: "100",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Bonds", "100"],
      ["Short-Term Bonds", "100"],
      ["Treasury Bonds", "100"],
    ],
  },
  {
    ticker: "ITTRS",
    name: "US Intermediate-Term Treasury Index",
    avgDurationYears: "5.5",
    stockPct: "0",
    bondPct: "100",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Bonds", "100"],
      ["Intermediate-Term Bonds", "100"],
      ["Treasury Bonds", "100"],
    ],
  },
  // ── Cash equivalents ─────────────────────────────────────────────────
  {
    ticker: "MMKT",
    name: "US Treasury Money Market",
    avgDurationYears: "0.1",
    stockPct: "0",
    bondPct: "0",
    cashPct: "100",
    otherPct: "0",
    classes: [["Money Market", "100"]],
  },
  {
    ticker: "CASH",
    name: "Cash",
    stockPct: "0",
    bondPct: "0",
    cashPct: "100",
    otherPct: "0",
    classes: [],
  },
  {
    ticker: "CD",
    name: "Brokered CD",
    stockPct: "0",
    bondPct: "100",
    cashPct: "0",
    otherPct: "0",
    classes: [
      ["US Bonds", "100"],
      ["Short-Term Bonds", "100"],
      ["CDs", "100"],
    ],
  },
  // ── Other ────────────────────────────────────────────────────────────
  {
    ticker: "CRYPTO",
    name: "Cryptocurrency (generic)",
    stockPct: "0",
    bondPct: "0",
    cashPct: "0",
    otherPct: "100",
    classes: [["Crypto", "100"]],
  },
  {
    ticker: "GOLD",
    name: "Gold (generic)",
    stockPct: "0",
    bondPct: "0",
    cashPct: "0",
    otherPct: "100",
    classes: [["Gold", "100"]],
  },
];

export async function seedAssetClasses(classList: typeof SYSTEM_CLASSES = SYSTEM_CLASSES) {
  await db
    .insert(assetClasses)
    .values(
      classList.map((c) => ({
        name: c.name,
        type: c.type,
        avgDurationYears: c.avgDurationYears,
        userId: null,
      })),
    )
    .onConflictDoNothing();
}

export async function getSystemClassIds() {
  const rows = await db.select().from(assetClasses).where(isNull(assetClasses.userId));
  return new Map(rows.map((r) => [r.name, r.id] as const));
}

export async function seedAssets(
  assetList: AssetSeed[],
  classIdByName: Map<string, string>,
  userId: string | null = null,
) {
  for (const a of assetList) {
    const [inserted] = await db
      .insert(assets)
      .values({
        ticker: a.ticker,
        name: a.name,
        avgDurationYears: a.avgDurationYears,
        stockPct: a.stockPct,
        bondPct: a.bondPct,
        cashPct: a.cashPct,
        otherPct: a.otherPct,
        userId,
      })
      .onConflictDoNothing()
      .returning();

    let assetId: string | undefined = inserted?.id;
    if (!assetId) {
      const existing = await db.select().from(assets).where(eq(assets.ticker, a.ticker));
      assetId = existing.find((r) => r.userId === userId)?.id;
    }
    if (!assetId) {
      console.warn(`seed: could not find asset for ${a.ticker}, skipping`);
      continue;
    }

    for (const [className, ratio] of a.classes) {
      const classId = classIdByName.get(className);
      if (!classId) {
        console.warn(`seed: unknown class "${className}" for ${a.ticker}`);
        continue;
      }
      await db
        .insert(assetClassAllocations)
        .values({ assetId, assetClassId: classId, ratio })
        .onConflictDoNothing();
    }
  }
}

async function main() {
  console.log("Seeding asset classes…");
  await seedAssetClasses();
  const classIds = await getSystemClassIds();
  console.log("Seeding system assets…");
  await seedAssets(SYSTEM_ASSETS, classIds);
  console.log("Done.");
  process.exit(0);
}

if ((import.meta as { main?: boolean }).main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
