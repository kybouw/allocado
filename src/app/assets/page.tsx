import { createAsset } from "@allocado/app/_actions/assets";
import { requireUserId } from "@allocado/db/auth";
import { listAssetsWithClasses } from "@allocado/db/queries/assets";
import { MyLibrarySection, SystemLibrarySection } from "./AssetsLibraryView";

export default async function AssetsPage() {
  const userId = await requireUserId();
  const rows = await listAssetsWithClasses(userId);

  type AssetEntry = {
    id: string;
    isOwned: boolean;
    ticker: string;
    name: string;
    avgDurationYears: string | null;
    stockPct: number;
    bondPct: number;
    cashPct: number;
    otherPct: number;
    classes: Array<{ name: string; type: string; ratio: string }>;
  };

  const byAsset = new Map<string, AssetEntry>();
  for (const r of rows) {
    if (!r.assetId) continue;
    const existing = byAsset.get(r.assetId) ?? {
      id: r.assetId,
      isOwned: r.assetUserId === userId,
      ticker: r.ticker,
      name: r.assetName,
      avgDurationYears: r.avgDurationYears,
      stockPct: Number(r.stockPct ?? 0),
      bondPct: Number(r.bondPct ?? 0),
      cashPct: Number(r.cashPct ?? 0),
      otherPct: Number(r.otherPct ?? 0),
      classes: [],
    };
    if (r.className && r.classType && r.ratio) {
      if (!existing.classes.find((c) => c.name === r.className)) {
        existing.classes.push({ name: r.className, type: r.classType, ratio: r.ratio });
      }
    }
    byAsset.set(r.assetId, existing);
  }

  const allAssets = Array.from(byAsset.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
  const systemAssets = allAssets.filter((a) => !a.isOwned);
  const userAssets = allAssets.filter((a) => a.isOwned);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold text-avocado-900">Asset library</h1>
        <p className="text-sm text-avocado-700">
          Tickers available to use in your holdings. Add custom assets for funds specific to your
          401k, HSA, or other accounts.
        </p>
      </header>

      <MyLibrarySection userAssets={userAssets} />

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">Add asset</h2>
        <form
          action={async (fd) => {
            "use server";
            await createAsset(fd);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Ticker / Symbol</label>
            <input
              name="ticker"
              type="text"
              required
              placeholder="FXAIX"
              className="input-field font-mono uppercase"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Name</label>
            <input
              name="name"
              type="text"
              required
              placeholder="Fidelity 500 Index Fund"
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">
              Avg duration (years, bonds only)
            </label>
            <input
              name="avgDurationYears"
              type="number"
              step="0.1"
              min="0"
              placeholder="leave blank for equity / cash"
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">Notes</label>
            <input name="notes" type="text" className="input-field" />
          </div>
          <div className="sm:col-span-2 text-xs text-avocado-600">
            After creating, open the asset to set its Stocks / Bonds / Cash / Other allocation.
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Add asset
            </button>
          </div>
        </form>
      </section>

      <SystemLibrarySection systemAssets={systemAssets} defaultOpen={userAssets.length === 0} />
    </div>
  );
}
