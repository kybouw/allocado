"use client";

import { setAssetAllocations } from "@allocado/app/_actions/assets";
import { useMemo, useState, useTransition } from "react";

type AssetClass = { id: string; name: string; type: "stock" | "bond" | "cash" | "other" };
type AllocRow = { assetClassId: string; ratio: number };

export function AssetClassEditor({
  assetId,
  allClasses,
  initialAllocations,
}: {
  assetId: string;
  allClasses: AssetClass[];
  initialAllocations: AllocRow[];
}) {
  const [rows, setRows] = useState<AllocRow[]>(initialAllocations);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const classById = useMemo(() => new Map(allClasses.map((c) => [c.id, c])), [allClasses]);
  const usedIds = new Set(rows.map((r) => r.assetClassId));
  const available = allClasses.filter((c) => !usedIds.has(c.id));

  function addRow(classId: string) {
    if (!classId || usedIds.has(classId)) return;
    setRows((prev) => [...prev, { assetClassId: classId, ratio: 100 }]);
  }

  function updateRatio(classId: string, ratio: number) {
    setRows((prev) => prev.map((r) => (r.assetClassId === classId ? { ...r, ratio } : r)));
  }

  function removeRow(classId: string) {
    setRows((prev) => prev.filter((r) => r.assetClassId !== classId));
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await setAssetAllocations(assetId, rows);
      setFeedback(res.ok ? "Saved." : `Error: ${res.error}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <p className="text-sm text-avocado-700">No classes assigned yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const cls = classById.get(r.assetClassId);
            return (
              <li
                key={r.assetClassId}
                className="flex items-center gap-3 rounded border border-avocado-100 bg-white px-3 py-2"
              >
                <span className="flex-1 text-sm font-medium text-avocado-800">
                  {cls?.name ?? "(unknown)"}
                  <span className="ml-2 text-xs font-normal text-avocado-500">{cls?.type}</span>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={r.ratio}
                    onChange={(e) => updateRatio(r.assetClassId, Number(e.target.value))}
                    className="input-field w-20 text-right"
                  />
                  <span className="text-sm text-avocado-600">%</span>
                  <button
                    type="button"
                    onClick={() => removeRow(r.assetClassId)}
                    className="ml-1 text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {available.length > 0 && (
        <div className="flex items-center gap-3 border-t border-avocado-100 pt-3">
          <label className="text-sm font-medium text-avocado-700">Add class</label>
          <select
            className="input-field flex-1"
            defaultValue=""
            onChange={(e) => {
              addRow(e.target.value);
              e.currentTarget.value = "";
            }}
          >
            <option value="" disabled>
              Select…
            </option>
            {(["stock", "bond", "cash"] as const).map((type) => {
              const opts = available.filter((c) => c.type === type);
              if (!opts.length) return null;
              return (
                <optgroup key={type} label={type}>
                  {opts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={isPending} className="btn-primary">
          {isPending ? "Saving…" : "Save allocations"}
        </button>
        {feedback && (
          <span
            className={
              feedback.startsWith("Error") ? "text-sm text-red-600" : "text-sm text-avocado-700"
            }
          >
            {feedback}
          </span>
        )}
      </div>
    </div>
  );
}
