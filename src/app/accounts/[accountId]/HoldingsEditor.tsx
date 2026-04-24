"use client";

import { deleteHolding, upsertHolding } from "@allocado/app/_actions/holdings";
import { formatUSD } from "@allocado/lib/money";
import { useState, useTransition } from "react";

type Asset = { id: string; ticker: string; name: string };
type Holding = {
  id: string;
  assetId: string;
  ticker: string;
  assetName: string;
  shares: string | null;
  value: string;
};

export function HoldingsEditor({
  accountId,
  assets,
  holdings,
}: {
  accountId: string;
  assets: Asset[];
  holdings: Holding[];
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submitForm(form: HTMLFormElement) {
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await upsertHolding(fd);
      if (res.ok) {
        setFeedback("Saved.");
        form.reset();
      } else {
        setFeedback(`Error: ${res.error}`);
      }
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitForm(e.currentTarget);
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitForm(e.currentTarget);
  }

  async function handleDelete(holdingId: string) {
    if (!confirm("Delete this holding?")) return;
    startTransition(async () => {
      const res = await deleteHolding(holdingId);
      setFeedback(res.ok ? "Deleted." : `Error: ${res.error}`);
    });
  }

  const heldAssetIds = new Set(holdings.map((h) => h.assetId));
  const unheldAssets = assets.filter((a) => !heldAssetIds.has(a.id));

  const total = holdings.reduce((acc, h) => acc + Number(h.value), 0);

  return (
    <div className="flex flex-col gap-4">
      {holdings.length === 0 ? (
        <p className="text-sm text-avocado-700">No holdings yet. Add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {holdings.map((h) => (
            <li
              key={h.id}
              className="flex flex-col gap-2 rounded border border-avocado-100 bg-white p-3"
            >
              <form
                onSubmit={handleUpdate}
                className="grid grid-cols-1 sm:grid-cols-[1fr_110px_140px_auto] gap-3 items-end"
              >
                <input type="hidden" name="accountId" value={accountId} />
                <input type="hidden" name="assetId" value={h.assetId} />
                <div>
                  <div className="font-medium text-avocado-900">
                    {h.ticker}{" "}
                    <span className="text-sm font-normal text-avocado-600">— {h.assetName}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-avocado-600">Shares</label>
                  <input
                    name="shares"
                    type="text"
                    inputMode="decimal"
                    defaultValue={h.shares ?? ""}
                    placeholder="optional"
                    className="input-field"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-avocado-600">Value ($)</label>
                  <input
                    name="value"
                    type="text"
                    inputMode="decimal"
                    required
                    defaultValue={h.value}
                    className="input-field"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={isPending} className="btn-primary">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(h.id)}
                    disabled={isPending}
                    className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-avocado-100 pt-3 text-sm">
        <span className="text-avocado-700">Account total</span>
        <span className="font-medium text-avocado-900">{formatUSD(total)}</span>
      </div>

      {unheldAssets.length > 0 && (
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 sm:grid-cols-[1fr_110px_140px_auto] gap-3 items-end border-t border-avocado-100 pt-4"
        >
          <input type="hidden" name="accountId" value={accountId} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-avocado-600">Asset</label>
            <select name="assetId" required className="input-field">
              <option value="" disabled>
                Select an asset…
              </option>
              {unheldAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ticker} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-avocado-600">Shares</label>
            <input name="shares" type="text" inputMode="decimal" className="input-field" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-avocado-600">Value ($)</label>
            <input name="value" type="text" inputMode="decimal" required className="input-field" />
          </div>
          <button type="submit" disabled={isPending} className="btn-primary">
            Add
          </button>
        </form>
      )}

      {feedback && (
        <div
          className={
            feedback.startsWith("Error") ? "text-sm text-red-600" : "text-sm text-avocado-700"
          }
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
