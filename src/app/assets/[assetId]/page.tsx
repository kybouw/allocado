import { deleteAsset, updateAsset } from "@allocado/app/_actions/assets";
import { requireUserId } from "@allocado/db/auth";
import { getAssetWithClasses, listAssetClassesForUser } from "@allocado/db/queries/assets";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AssetClassEditor } from "./AssetClassEditor";

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

  // Deduplicate allocations
  const allocations = rows
    .filter((r) => r.classId != null)
    .reduce(
      (acc, r) => {
        if (!acc.find((a) => a.classId === r.classId)) {
          acc.push({
            classId: r.classId!,
            className: r.className!,
            classType: r.classType!,
            ratio: r.ratio!,
          });
        }
        return acc;
      },
      [] as Array<{ classId: string; className: string; classType: string; ratio: string }>,
    );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href="/assets"
          className="text-sm text-avocado-600 hover:text-avocado-900 hover:underline"
        >
          ← Asset library
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-avocado-900">
          <span className="font-mono">{first.ticker}</span>
          <span className="ml-3 text-lg font-normal text-avocado-700">{first.assetName}</span>
        </h1>
        {!isOwned && <p className="mt-1 text-xs text-avocado-500">System asset — read-only</p>}
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
            <p className="text-sm text-avocado-700">
              Tag this asset with the classes it belongs to. Include <strong>Stocks</strong>,{" "}
              <strong>Bonds</strong>, or <strong>Cash</strong> at the aggregate level so it rolls up
              correctly on the dashboard.
            </p>
            <AssetClassEditor
              assetId={assetId}
              allClasses={allClasses.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
              initialAllocations={allocations.map((a) => ({
                assetClassId: a.classId,
                ratio: Number(a.ratio),
              }))}
            />
          </section>

          <section className="card flex flex-col gap-4 border-red-200">
            <h2 className="text-lg font-medium text-red-700">Danger zone</h2>
            <form
              action={async () => {
                "use server";
                const res = await deleteAsset(assetId);
                if (res.ok) redirect("/assets");
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete asset
              </button>
            </form>
          </section>
        </>
      ) : (
        <section className="card">
          <h2 className="mb-4 text-lg font-medium text-avocado-800">Asset class allocations</h2>
          {allocations.length === 0 ? (
            <p className="text-sm text-avocado-700">No class mappings.</p>
          ) : (
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
          )}
        </section>
      )}
    </div>
  );
}
