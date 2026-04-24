import { eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { assetClassAllocations, assetClasses, assets } from "./schema";

type AssetClassType = "stock" | "bond" | "cash" | "other";

const CLASSES: Array<{
  name: string;
  type: AssetClassType;
  avgDurationYears?: string;
}> = [
  // ── Aggregate (used for goal targets and dashboard) ──────────────────
  { name: "Stocks", type: "stock" },
  { name: "Bonds", type: "bond" },
  { name: "Cash", type: "cash" },
  { name: "Other", type: "other" }, // no target — purely informational on dashboard
  // ── Other granular ───────────────────────────────────────────────────
  { name: "Crypto", type: "other" },
  { name: "Gold", type: "other" },
  // ── Granular (used for holdings analysis, later features) ────────────
  { name: "US Stocks", type: "stock" },
  { name: "Foreign Stocks", type: "stock" },
  { name: "Developed Markets", type: "stock" },
  { name: "Emerging Markets", type: "stock" },
  { name: "Large-Cap", type: "stock" },
  { name: "Mid-Cap", type: "stock" },
  { name: "Small-Cap", type: "stock" },
  { name: "Short-Term Bonds", type: "bond", avgDurationYears: "2.0" },
  { name: "Intermediate-Term Bonds", type: "bond", avgDurationYears: "5.5" },
  { name: "Long-Term Bonds", type: "bond", avgDurationYears: "15.0" },
  { name: "US Bonds", type: "bond" },
  { name: "Foreign Bonds", type: "bond" },
  { name: "Treasury Bonds", type: "bond" },
  { name: "Muni Bonds (National)", type: "bond" },
  { name: "Muni Bonds (California)", type: "bond" },
  { name: "Taxable Bonds", type: "bond" },
  { name: "TIPS", type: "bond" },
  { name: "Money Market", type: "cash" },
  { name: "CDs", type: "cash" },
];

type AssetSeed = {
  ticker: string;
  name: string;
  avgDurationYears?: string;
  classes: Array<[string, string]>; // [className, ratio]
};

const ASSETS: AssetSeed[] = [
  {
    ticker: "VTI",
    name: "Vanguard Total US Stock Market ETF",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "100"],
      ["Large-Cap", "82"],
      ["Mid-Cap", "15"],
      ["Small-Cap", "3"],
    ],
  },
  {
    ticker: "VEA",
    name: "Vanguard FTSE Developed Markets ETF",
    classes: [
      ["Stocks", "100"],
      ["Foreign Stocks", "100"],
      ["Developed Markets", "100"],
      ["Large-Cap", "85"],
      ["Mid-Cap", "13"],
      ["Small-Cap", "2"],
    ],
  },
  {
    ticker: "VXUS",
    name: "Vanguard Total International Stock ETF",
    classes: [
      ["Stocks", "100"],
      ["Foreign Stocks", "100"],
      ["Developed Markets", "75"],
      ["Emerging Markets", "25"],
    ],
  },
  {
    ticker: "VT",
    name: "Vanguard Total World Stock ETF",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "60"],
      ["Foreign Stocks", "40"],
      ["Developed Markets", "90"],
      ["Emerging Markets", "10"],
    ],
  },
  {
    ticker: "VTWAX",
    name: "Vanguard Total World Stock Index Admiral",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "60"],
      ["Foreign Stocks", "40"],
      ["Developed Markets", "90"],
      ["Emerging Markets", "10"],
    ],
  },
  {
    ticker: "VLXVX",
    name: "Vanguard Target Retirement 2065",
    classes: [
      ["Stocks", "90"],
      ["Bonds", "10"],
      ["US Stocks", "54"],
      ["Foreign Stocks", "36"],
      ["Intermediate-Term Bonds", "10"],
    ],
  },
  {
    ticker: "VGSH",
    name: "Vanguard Short-Term Treasury ETF",
    avgDurationYears: "1.9",
    classes: [
      ["Bonds", "100"],
      ["Short-Term Bonds", "100"],
      ["Treasury Bonds", "100"],
    ],
  },
  {
    ticker: "VGIT",
    name: "Vanguard Intermediate-Term Treasury ETF",
    avgDurationYears: "5.2",
    classes: [
      ["Bonds", "100"],
      ["Intermediate-Term Bonds", "100"],
      ["Treasury Bonds", "100"],
    ],
  },
  {
    ticker: "VUSXX",
    name: "Vanguard Treasury Money Market Fund",
    avgDurationYears: "0.1",
    classes: [
      ["Cash", "100"],
      ["Money Market", "100"],
    ],
  },
  {
    ticker: "VTEB",
    name: "Vanguard Tax-Exempt Bond ETF",
    avgDurationYears: "6.1",
    classes: [
      ["Bonds", "100"],
      ["Intermediate-Term Bonds", "100"],
      ["Muni Bonds (National)", "100"],
    ],
  },
  {
    ticker: "VTEC",
    name: "Vanguard California Tax-Exempt Bond ETF",
    avgDurationYears: "6.0",
    classes: [
      ["Bonds", "100"],
      ["Intermediate-Term Bonds", "100"],
      ["Muni Bonds (California)", "100"],
    ],
  },
  {
    ticker: "BND",
    name: "Vanguard Total Bond Market ETF",
    avgDurationYears: "6.5",
    classes: [
      ["Bonds", "100"],
      ["Intermediate-Term Bonds", "100"],
      ["Taxable Bonds", "100"],
    ],
  },
  {
    ticker: "BSV",
    name: "Vanguard Short-Term Bond ETF",
    avgDurationYears: "2.6",
    classes: [
      ["Bonds", "100"],
      ["Short-Term Bonds", "100"],
      ["Taxable Bonds", "100"],
    ],
  },
  {
    ticker: "BIV",
    name: "Vanguard Intermediate-Term Bond ETF",
    avgDurationYears: "5.5",
    classes: [
      ["Bonds", "100"],
      ["Intermediate-Term Bonds", "100"],
      ["Taxable Bonds", "100"],
    ],
  },
  {
    // Brokered CDs behave like short-term bonds; classify as Bonds by default.
    // Avg duration will vary — update per-holding or create additional assets as needed.
    ticker: "CD",
    name: "Brokered CD",
    classes: [
      ["Bonds", "100"],
      ["US Bonds", "100"],
      ["Short-Term Bonds", "100"],
      ["CDs", "100"],
    ],
  },
  {
    ticker: "CASH",
    name: "Cash",
    classes: [
      ["Cash", "100"],
    ],
  },
  // ── Fidelity / iShares / Other ──────────────────────────────────────
  {
    ticker: "FBTC",
    name: "Fidelity Wise Origin Bitcoin ETF",
    classes: [
      ["Other", "100"],
      ["Crypto", "100"],
    ],
  },
  {
    ticker: "IAU",
    name: "iShares Gold Trust ETF",
    classes: [
      ["Other", "100"],
      ["Gold", "100"],
    ],
  },
  {
    ticker: "FSMDX",
    name: "Fidelity Mid Cap Index Fund",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "100"],
      ["Mid-Cap", "100"],
    ],
  },
  {
    ticker: "FSPSX",
    name: "Fidelity International Index Fund",
    classes: [
      ["Stocks", "100"],
      ["Foreign Stocks", "100"],
    ],
  },
  // ── Vanguard Institutional / Admiral ────────────────────────────────
  {
    ticker: "VFIAX",
    name: "Vanguard 500 Index Fund Admiral Shares",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "100"],
      ["Large-Cap", "100"],
    ],
  },
  {
    ticker: "VMCIX",
    name: "Vanguard Mid-Cap Index Fund Institutional Shares",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "100"],
      ["Mid-Cap", "100"],
    ],
  },
  {
    ticker: "VSCIX",
    name: "Vanguard Small-Cap Index Fund Institutional Shares",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "100"],
      ["Small-Cap", "100"],
    ],
  },
  {
    ticker: "VSMAX",
    name: "Vanguard Small Cap Index Fund Admiral Shares",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "100"],
      ["Small-Cap", "100"],
    ],
  },
  {
    ticker: "VTSNX",
    name: "Vanguard Total International Stock Index Fund Institutional Shares",
    classes: [
      ["Stocks", "100"],
      ["Foreign Stocks", "100"],
    ],
  },
  // ── Bond funds ───────────────────────────────────────────────────────
  {
    ticker: "TBIIX",
    name: "Nuveen Bond Index Fund R6",
    classes: [
      ["Bonds", "100"],
      ["US Bonds", "100"],
    ],
  },
  // ── Other providers ──────────────────────────────────────────────────
  {
    ticker: "WFSPX",
    name: "iShares S&P 500 Index Fund Class K",
    classes: [
      ["Stocks", "100"],
      ["US Stocks", "100"],
      ["Large-Cap", "100"],
    ],
  },
];

async function seedAssetClasses() {
  await db
    .insert(assetClasses)
    .values(
      CLASSES.map((c) => ({
        name: c.name,
        type: c.type,
        avgDurationYears: c.avgDurationYears,
        userId: null,
      })),
    )
    .onConflictDoNothing();
}

async function findSystemAssetClassIds() {
  const rows = await db.select().from(assetClasses).where(isNull(assetClasses.userId));
  return new Map(rows.map((r) => [r.name, r.id] as const));
}

async function seedAssets() {
  const classIdByName = await findSystemAssetClassIds();

  for (const a of ASSETS) {
    const [inserted] = await db
      .insert(assets)
      .values({
        ticker: a.ticker,
        name: a.name,
        avgDurationYears: a.avgDurationYears,
        userId: null,
      })
      .onConflictDoNothing()
      .returning();

    // If the asset already existed, look it up
    let assetId: string | undefined = inserted?.id;
    if (!assetId) {
      const existing = await db.select().from(assets).where(eq(assets.ticker, a.ticker));
      assetId = existing.find((r) => r.userId === null)?.id;
    }
    if (!assetId) {
      console.warn(`seed: could not find existing asset for ${a.ticker}, skipping`);
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
  console.log("Seeding assets and allocations…");
  await seedAssets();
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
