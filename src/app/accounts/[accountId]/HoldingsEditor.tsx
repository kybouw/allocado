"use client";

import { type HoldingInput, replaceHoldings } from "@allocado/app/_actions/holdings";
import { RemoveRowButton } from "@allocado/components/ui/buttons/RemoveRowButton";
import { SecondaryButton } from "@allocado/components/ui/buttons/SecondaryButton";
import { SubmitButton } from "@allocado/components/ui/buttons/SubmitButton";
import { formatUSD } from "@allocado/lib/money";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type Asset = { id: string; ticker: string; name: string };
type Holding = {
  id: string;
  assetId: string;
  ticker: string;
  assetName: string;
  shares: string | null;
  value: string;
};

type Row = {
  key: string;
  existing: boolean;
  assetId: string;
  ticker: string;
  assetName: string;
  shares: string;
  value: string;
};

function rowsFromHoldings(holdings: Holding[]): Row[] {
  return holdings.map((h) => ({
    key: h.id,
    existing: true,
    assetId: h.assetId,
    ticker: h.ticker,
    assetName: h.assetName,
    shares: h.shares ?? "",
    value: h.value,
  }));
}

let newRowCounter = 0;
function makeNewRow(): Row {
  newRowCounter += 1;
  return {
    key: `new-${newRowCounter}`,
    existing: false,
    assetId: "",
    ticker: "",
    assetName: "",
    shares: "",
    value: "",
  };
}

export function HoldingsEditor({
  accountId,
  assets,
  holdings,
}: {
  accountId: string;
  assets: Asset[];
  holdings: Holding[];
}) {
  const initial = useMemo(() => rowsFromHoldings(holdings), [holdings]);
  const [rows, setRows] = useState<Row[]>(initial);
  const [isPending, startTransition] = useTransition();

  const total = rows.reduce((acc, r) => {
    const n = Number(r.value);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function addRow() {
    setRows((prev) => [...prev, makeNewRow()]);
  }

  function reset() {
    setRows(initial);
  }

  const usedAssetIds = new Set(rows.map((r) => r.assetId).filter(Boolean));
  const isDirty = useMemo(() => {
    if (rows.length !== initial.length) return true;
    const initialByAsset = new Map(initial.map((r) => [r.assetId, r]));
    for (const row of rows) {
      const prev = initialByAsset.get(row.assetId);
      if (!prev) return true;
      if (prev.value !== row.value) return true;
      if ((prev.shares ?? "") !== (row.shares ?? "")) return true;
    }
    return false;
  }, [rows, initial]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rows.some((r) => !r.assetId)) {
      toast.error("Choose an asset for every row");
      return;
    }
    if (rows.some((r) => r.value.trim() === "")) {
      toast.error("Every row needs a value");
      return;
    }
    const items: HoldingInput[] = rows.map((r) => ({
      assetId: r.assetId,
      value: r.value,
      shares: r.shares.trim() === "" ? null : r.shares,
    }));
    startTransition(async () => {
      const res = await replaceHoldings(accountId, items);
      if (res.ok) toast.success("Saved.");
      else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <p className="text-sm text-avocado-700">No holdings yet. Add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const availableAssets = assets.filter(
              (a) => a.id === row.assetId || !usedAssetIds.has(a.id),
            );
            return (
              <li
                key={row.key}
                className="grid grid-cols-1 sm:grid-cols-[1fr_110px_140px_auto] gap-3 items-end rounded border border-avocado-100 bg-white p-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-avocado-600">Asset</label>
                  {row.existing ? (
                    <div className="py-2 text-sm">
                      <span className="font-medium text-avocado-900">{row.ticker}</span>
                      <span className="ml-2 text-avocado-600">— {row.assetName}</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={row.assetId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const a = assets.find((x) => x.id === id);
                        updateRow(row.key, {
                          assetId: id,
                          ticker: a?.ticker ?? "",
                          assetName: a?.name ?? "",
                        });
                      }}
                      className="input-field"
                    >
                      <option value="" disabled>
                        Select an asset…
                      </option>
                      {availableAssets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.ticker} — {a.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`shares-${row.key}`} className="text-xs text-avocado-600">
                    Shares
                  </label>
                  <input
                    id={`shares-${row.key}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="optional"
                    value={row.shares}
                    onChange={(e) => updateRow(row.key, { shares: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`value-${row.key}`} className="text-xs text-avocado-600">
                    Value ($)
                  </label>
                  <input
                    id={`value-${row.key}`}
                    type="text"
                    inputMode="decimal"
                    required
                    value={row.value}
                    onChange={(e) => updateRow(row.key, { value: e.target.value })}
                    className="input-field"
                  />
                </div>
                <RemoveRowButton onClick={() => removeRow(row.key)} label="Remove holding" />
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-avocado-100 pt-3">
        <SecondaryButton
          type="button"
          onClick={addRow}
          disabled={assets.length === 0 || usedAssetIds.size >= assets.length}
        >
          + Add holding
        </SecondaryButton>
        <div className="text-sm">
          <span className="text-avocado-700">Account total </span>
          <span className="font-medium text-avocado-900">{formatUSD(total)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton isPending={isPending} disabled={!isDirty}>
          Save changes
        </SubmitButton>
        {isDirty && (
          <SecondaryButton type="button" onClick={reset} disabled={isPending}>
            Discard
          </SecondaryButton>
        )}
      </div>
    </form>
  );
}
