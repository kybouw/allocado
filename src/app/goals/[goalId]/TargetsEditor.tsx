"use client";

import { setStaticTargets } from "@allocado/app/_actions/targets";
import { useState, useTransition } from "react";

type InitialTargets = {
  stockTargetPct: number;
  bondTargetPct: number;
  cashTargetPct: number;
  otherTargetPct: number;
};

export function TargetsEditor({
  goalId,
  initialTargets,
}: {
  goalId: string;
  initialTargets: InitialTargets;
}) {
  const [stock, setStock] = useState(initialTargets.stockTargetPct);
  const [bond, setBond] = useState(initialTargets.bondTargetPct);
  const [cash, setCash] = useState(initialTargets.cashTargetPct);
  const [other, setOther] = useState(initialTargets.otherTargetPct);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const sum = stock + bond + cash + other;
  const sumOk = Math.round(sum * 100) === 10000;

  function save() {
    if (!sumOk) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await setStaticTargets(goalId, {
        stockTargetPct: stock,
        bondTargetPct: bond,
        cashTargetPct: cash,
        otherTargetPct: other,
        effectiveDate: null,
      });
      setFeedback(res.ok ? "Saved." : `Error: ${res.error}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
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
