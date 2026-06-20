"use client";

import { setAssetAllocations, updateAssetTypePcts } from "@allocado/app/_actions/assets";
import { RemoveRowButton } from "@allocado/components/ui/buttons/RemoveRowButton";
import { useMemo, useState, useTransition } from "react";

type AssetClass = { id: string; name: string; type: "stock" | "bond" | "cash" | "other" };
type AllocRow = { assetClassId: string; ratio: number };
type TypePcts = { stockPct: number; bondPct: number; cashPct: number; otherPct: number };

export function AssetClassEditor({
  assetId,
  allClasses,
  initialTypePcts,
  initialAllocations,
}: {
  assetId: string;
  allClasses: AssetClass[];
  initialTypePcts: TypePcts;
  initialAllocations: AllocRow[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <PrimaryAllocationSection assetId={assetId} initialTypePcts={initialTypePcts} />
      <SubclassSection
        assetId={assetId}
        allClasses={allClasses}
        initialAllocations={initialAllocations}
      />
    </div>
  );
}

function PrimaryAllocationSection({
  assetId,
  initialTypePcts,
}: {
  assetId: string;
  initialTypePcts: TypePcts;
}) {
  const [stock, setStock] = useState(initialTypePcts.stockPct);
  const [bond, setBond] = useState(initialTypePcts.bondPct);
  const [cash, setCash] = useState(initialTypePcts.cashPct);
  const [other, setOther] = useState(initialTypePcts.otherPct);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const sum = stock + bond + cash + other;
  const sumOk = Math.round(sum * 100) === 10000;

  function save() {
    if (!sumOk) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await updateAssetTypePcts(assetId, {
        stockPct: stock,
        bondPct: bond,
        cashPct: cash,
        otherPct: other,
      });
      setFeedback(res.ok ? "Saved." : `Error: ${res.error}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-medium text-avocado-800">Primary allocation</h3>
        <p className="mt-1 text-sm text-avocado-600">
          How this asset splits across the four superclasses. Must sum to exactly 100%.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            { label: "Stocks", value: stock, set: setStock },
            { label: "Bonds", value: bond, set: setBond },
            { label: "Cash", value: cash, set: setCash },
            { label: "Other", value: other, set: setOther },
          ] as const
        ).map(({ label, value, set }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-avocado-700">{label}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                className="input-field w-full text-right"
              />
              <span className="shrink-0 text-sm text-avocado-600">%</span>
            </div>
          </div>
        ))}
      </div>

      <SumChip value={sum} ok={sumOk} />

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={isPending || !sumOk} className="btn-primary">
          {isPending ? "Saving…" : "Save primary allocation"}
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

function SubclassSection({
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
      <div>
        <h3 className="text-base font-medium text-avocado-800">Subclasses</h3>
        <p className="mt-1 text-sm text-avocado-600">
          Optional granular tags (US Stocks, Short-Term Bonds, etc.). Multi-dimensional — ratios
          within a dimension should sum to 100%, but the total across all dimensions may exceed
          100%.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-avocado-700">No subclasses assigned yet.</p>
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
                  <RemoveRowButton onClick={() => removeRow(r.assetClassId)} label="Remove class" />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {available.length > 0 && (
        <div className="flex items-center gap-3 border-t border-avocado-100 pt-3">
          <label className="text-sm font-medium text-avocado-700">Add subclass</label>
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
            {(["stock", "bond", "cash", "other"] as const).map((type) => {
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
          {isPending ? "Saving…" : "Save subclasses"}
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

function SumChip({ value, ok }: { value: number; ok: boolean }) {
  const over = value > 100.005;
  return (
    <div
      className={`w-fit rounded border px-3 py-2 text-sm ${
        ok
          ? "border-avocado-300 bg-avocado-50"
          : over
            ? "border-red-300 bg-red-50"
            : "border-avocado-100 bg-white"
      }`}
    >
      <span className={ok ? "text-avocado-700" : over ? "text-red-700" : "text-avocado-600"}>
        Total: {value.toFixed(1)}%{ok ? " ✓" : over ? " — over 100%" : " — must equal 100%"}
      </span>
    </div>
  );
}
