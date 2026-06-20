import { deleteAsset, updateAsset } from "@allocado/app/_actions/assets";
import { DeleteButton } from "@allocado/components/ui/buttons/DeleteButton";
import { requireUserId } from "@allocado/db/auth";
import { getAssetWithClasses, listAssetClassesForUser } from "@allocado/db/queries/assets";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetClassEditor } from "./AssetClassEditor";

type AllocationRow = {
  classId: string;
  className: string;
  classType: string;
  ratio: string;
};

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const userId = await requireUserId();

  const [rows, allClasses] = await Promise.all([
    getAssetWithClasses(userId, assetId),
    listAssetClassesForUser(userId),
  ]);

  if (rows.length === 0) notFound();

  const first = rows[0];
  const isOwned = first.assetUserId === userId;

  const initialTypePcts = {
    stockPct: Number(first.stockPct ?? 0),
    bondPct: Number(first.bondPct ?? 0),
    cashPct: Number(first.cashPct ?? 0),
    otherPct: Number(first.otherPct ?? 0),
  };

  const seen = new Set<string>();
  const allocations: AllocationRow[] = [];
  for (const r of rows) {
    if (
      r.classId != null &&
      r.className != null &&
      r.classType != null &&
      r.ratio != null &&
      !seen.has(r.classId)
    ) {
      seen.add(r.classId);
      allocations.push({
        classId: r.classId,
        className: r.className,
        classType: r.classType,
        ratio: r.ratio,
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href="/assets"
          className="text-sm text-avocado-600 hover:text-avocado-900 hover:underline"
        >
          ← Asset library
        </Link>
        <div className="mt-2 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-avocado-900">
              <span className="font-mono">{first.ticker}</span>
              <span className="ml-3 text-lg font-normal text-avocado-700">{first.assetName}</span>
            </h1>
            {!isOwned && <p className="mt-1 text-xs text-avocado-500">System asset — read-only</p>}
          </div>
          {isOwned && (
            <DeleteButton
              action={deleteAsset.bind(null, assetId)}
              redirectPath="/assets"
              itemLabel="asset"
              itemName={first.ticker}
            />
          )}
        </div>
      </header>

      {isOwned ? (
        <>
          <section className="card flex flex-col gap-4">
            <h2 className="text-lg font-medium text-avocado-800">Edit asset</h2>
            <form
              action={async (fd) => {
                "use server";
                await updateAsset(assetId, fd);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-avocado-700">Ticker</label>
                <input
                  name="ticker"
                  type="text"
                  required
                  defaultValue={first.ticker}
                  className="input-field font-mono uppercase"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-avocado-700">Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={first.assetName}
                  className="input-field"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-avocado-700">Avg duration (years)</label>
                <input
                  name="avgDurationYears"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={first.avgDurationYears ?? ""}
                  placeholder="leave blank for equity / cash"
                  className="input-field"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-avocado-700">Notes</label>
                <input
                  name="notes"
                  type="text"
                  defaultValue={first.notes ?? ""}
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>
          </section>

          <section className="card flex flex-col gap-4">
            <h2 className="text-lg font-medium text-avocado-800">Asset class allocations</h2>
            <AssetClassEditor
              assetId={assetId}
              allClasses={allClasses.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
              initialTypePcts={initialTypePcts}
              initialAllocations={allocations.map((a) => ({
                assetClassId: a.classId,
                ratio: Number(a.ratio),
              }))}
            />
          </section>
        </>
      ) : (
        <section className="card flex flex-col gap-4">
          <h2 className="text-lg font-medium text-avocado-800">Asset class allocations</h2>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-avocado-500">
                Primary allocation
              </p>
              <ul className="flex flex-wrap gap-2">
                {(
                  [
                    { label: "Stocks", value: initialTypePcts.stockPct },
                    { label: "Bonds", value: initialTypePcts.bondPct },
                    { label: "Cash", value: initialTypePcts.cashPct },
                    { label: "Other", value: initialTypePcts.otherPct },
                  ] as const
                )
                  .filter((x) => x.value > 0)
                  .map((x) => (
                    <li
                      key={x.label}
                      className="rounded bg-avocado-100 px-3 py-1 text-sm text-avocado-800"
                    >
                      {x.label} {x.value.toFixed(0)}%
                    </li>
                  ))}
              </ul>
            </div>
            {allocations.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-avocado-500">
                  Subclasses
                </p>
                <ul className="flex flex-wrap gap-2">
                  {allocations.map((a) => (
                    <li
                      key={a.classId}
                      className="rounded bg-avocado-100 px-3 py-1 text-sm text-avocado-800"
                    >
                      {a.className} {Number(a.ratio).toFixed(0)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
