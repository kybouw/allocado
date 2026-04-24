import { createAsset } from "@allocado/app/_actions/assets";
import { requireUserId } from "@allocado/db/auth";
import { listAssetsWithClasses } from "@allocado/db/queries/assets";
import Link from "next/link";

export default async function AssetsPage() {
  const userId = await requireUserId();
  const rows = await listAssetsWithClasses(userId);

  // Group by asset, tracking ownership
  type AssetEntry = {
    id: string;
    isOwned: boolean;
    ticker: string;
    name: string;
    avgDurationYears: string | null;
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

      {userAssets.length > 0 && (
        <section className="card flex flex-col gap-4">
          <h2 className="text-lg font-medium text-avocado-800">My assets</h2>
          <AssetTable assets={userAssets} editable />
        </section>
      )}

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
            After creating, open the asset to assign its Stocks / Bonds / Cash classification.
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Add asset
            </button>
          </div>
        </form>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-medium text-avocado-800">System library</h2>
        <AssetTable assets={systemAssets} editable={false} />
      </section>
    </div>
  );
}

function AssetTable({
  assets,
  editable,
}: {
  assets: Array<{
    id: string;
    ticker: string;
    name: string;
    avgDurationYears: string | null;
    classes: Array<{ name: string; type: string; ratio: string }>;
  }>;
  editable: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-avocado-600">
            <th className="pb-2 pr-4">Ticker</th>
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Duration</th>
            <th className="pb-2">Classes</th>
            {editable && <th className="pb-2" />}
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id} className="border-t border-avocado-100 align-top">
              <td className="py-3 pr-4 font-mono font-medium text-avocado-900">
                {editable ? (
                  <Link href={`/assets/${a.id}`} className="hover:underline">
                    {a.ticker}
                  </Link>
                ) : (
                  a.ticker
                )}
              </td>
              <td className="py-3 pr-4 text-avocado-800">{a.name}</td>
              <td className="py-3 pr-4 text-avocado-600">
                {a.avgDurationYears ? `${Number(a.avgDurationYears).toFixed(1)} yr` : "—"}
              </td>
              <td className="py-3">
                <ul className="flex flex-wrap gap-1">
                  {a.classes.map((c) => (
                    <li
                      key={`${a.id}-${c.name}`}
                      className="rounded bg-avocado-100 px-2 py-0.5 text-xs text-avocado-800"
                    >
                      {c.name} {Number(c.ratio).toFixed(0)}%
                    </li>
                  ))}
                </ul>
              </td>
              {editable && (
                <td className="py-3 pl-4">
                  <Link
                    href={`/assets/${a.id}`}
                    className="text-xs font-medium text-avocado-600 hover:text-avocado-900 hover:underline"
                  >
                    Edit →
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
