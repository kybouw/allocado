"use client";

import { setStaticTargets } from "@allocado/app/_actions/targets";
import { RemoveRowButton } from "@allocado/components/ui/buttons/RemoveRowButton";
import { useMemo, useState, useTransition } from "react";

type AssetClass = {
  id: string;
  name: string;
  type: "stock" | "bond" | "cash" | "other";
};

type InitialTarget = {
  assetClassId: string;
  targetPct: number;
};

export function TargetsEditor({
  goalId,
  assetClasses,
  initialTargets,
}: {
  goalId: string;
  assetClasses: AssetClass[];
  initialTargets: InitialTarget[];
}) {
  const [rows, setRows] = useState(() =>
    initialTargets.map((t) => ({
      assetClassId: t.assetClassId,
      targetPct: t.targetPct,
    })),
  );
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const usedClassIds = new Set(rows.map((r) => r.assetClassId));
  const availableClasses = useMemo(
    () => assetClasses.filter((c) => !usedClassIds.has(c.id)),
    [assetClasses, usedClassIds],
  );

  const classById = useMemo(() => new Map(assetClasses.map((c) => [c.id, c])), [assetClasses]);

  const totalSum = rows.reduce((acc, r) => acc + r.targetPct, 0);

  function updatePct(assetClassId: string, value: number) {
    setRows((prev) =>
      prev.map((r) => (r.assetClassId === assetClassId ? { ...r, targetPct: value } : r)),
    );
  }

  function removeRow(assetClassId: string) {
    setRows((prev) => prev.filter((r) => r.assetClassId !== assetClassId));
  }

  function addClass(assetClassId: string) {
    if (!assetClassId) return;
    if (usedClassIds.has(assetClassId)) return;
    setRows((prev) => [...prev, { assetClassId, targetPct: 0 }]);
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await setStaticTargets(
        goalId,
        rows.map((r) => ({
          assetClassId: r.assetClassId,
          targetPct: r.targetPct,
          effectiveDate: null,
        })),
      );
      if (res.ok) {
        setFeedback("Saved.");
      } else {
        setFeedback(`Error: ${res.error}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <p className="text-sm text-avocado-700">
          No targets yet. Add an asset class below to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const cls = classById.get(r.assetClassId);
            return (
              <li
                key={r.assetClassId}
                className="flex items-center gap-3 rounded border border-avocado-100 bg-white px-3 py-2"
              >
                <span className="flex-1 font-medium text-avocado-800">
                  {cls?.name ?? "(unknown)"}
                  <span className="ml-2 text-xs font-normal text-avocado-600">{cls?.type}</span>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={r.targetPct}
                    onChange={(e) => updatePct(r.assetClassId, Number(e.target.value))}
                    className="input-field w-24"
                  />
                  <span className="text-sm text-avocado-700">%</span>
                  <RemoveRowButton
                    onClick={() => removeRow(r.assetClassId)}
                    label="Remove target"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-avocado-100 pt-4">
        {availableClasses.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-avocado-700">Add class</label>
            <select
              className="input-field flex-1"
              onChange={(e) => {
                addClass(e.target.value);
                e.currentTarget.value = "";
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Select an asset class…
              </option>
              {["stock", "bond", "cash"].map((type) => {
                const opts = availableClasses.filter((c) => c.type === type);
                if (opts.length === 0) return null;
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

        <div
          className={`grid gap-3 text-sm ${totalSum > 100 ? "text-red-600" : totalSum === 100 ? "text-avocado-700" : "text-avocado-700"}`}
        >
          <SumChip label="Total" value={totalSum} warn={totalSum > 100} ok={totalSum === 100} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={isPending} className="btn-primary">
          {isPending ? "Saving…" : "Save targets"}
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

function SumChip({
  label,
  value,
  warn,
  ok,
}: {
  label: string;
  value: number;
  warn?: boolean;
  ok?: boolean;
}) {
  return (
    <div
      className={`rounded border px-3 py-2 ${warn ? "border-red-300 bg-red-50" : ok ? "border-avocado-300 bg-avocado-50" : "border-avocado-100 bg-white"}`}
    >
      <div className="text-xs text-avocado-600">{label}</div>
      <div
        className={`font-medium ${warn ? "text-red-700" : ok ? "text-avocado-700" : "text-avocado-900"}`}
      >
        {value.toFixed(1)}%{ok ? " ✓" : warn ? " — over 100%" : ""}
      </div>
    </div>
  );
}
