import { formatPercent } from "@allocado/lib/money";
import Link from "next/link";
import { type AllocationSlice, ROW_H, TYPE_COLORS } from "./constants";
import { StackedBar } from "./StackedBar";

export function AllocationBars({
  targeted,
  hasTargets,
  goalId,
}: {
  targeted: AllocationSlice[];
  hasTargets: boolean;
  goalId: string;
}) {
  const other = targeted.find((b) => b.name === "Other");
  const showOther = (other?.current ?? 0) > 0.001 || (other?.target ?? 0) > 0.001;
  const visibleSlices = showOther ? targeted : targeted.filter((b) => b.name !== "Other");
  const colClass = showOther ? "grid-cols-4" : "grid-cols-3";
  const tableWidth = showOther ? "w-64" : "w-52";

  const currentSlices = visibleSlices.map((b) => ({
    key: b.name,
    pct: b.current,
    colorClass: TYPE_COLORS[b.name],
  }));
  const targetSlices = visibleSlices.map((b) => ({
    key: b.name,
    pct: b.target,
    colorClass: TYPE_COLORS[b.name],
  }));

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 h-5" />
        <div className={`${ROW_H} flex items-center gap-3`}>
          <span className="w-14 shrink-0 text-xs text-avocado-500">Current</span>
          <StackedBar slices={currentSlices} />
        </div>
        {hasTargets ? (
          <div className={`${ROW_H} flex items-center gap-3`}>
            <span className="w-14 shrink-0 text-xs text-avocado-500">Target</span>
            <StackedBar slices={targetSlices} muted />
          </div>
        ) : (
          <div className={`${ROW_H} flex items-center gap-3`}>
            <span className="w-14 shrink-0 text-xs text-avocado-500">Target</span>
            <Link href={`/goals/${goalId}`} className="text-xs text-avocado-600 underline">
              Set targets →
            </Link>
          </div>
        )}
        {hasTargets && (
          <div className={`${ROW_H} flex items-center gap-3`}>
            <span className="w-14 shrink-0 text-xs text-avocado-500">Drift</span>
          </div>
        )}
      </div>

      <div className={`${tableWidth} shrink-0`}>
        <div className={`mb-0.5 grid h-5 ${colClass} items-end text-center`}>
          {visibleSlices.map((b) => (
            <span
              key={b.name}
              className={`text-xs font-medium ${b.name === "Other" ? "text-purple-500" : "text-avocado-600"}`}
            >
              {b.name}
            </span>
          ))}
        </div>

        <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
          {visibleSlices.map((b) => (
            <span
              key={b.name}
              className={`font-medium ${b.name === "Other" ? "text-purple-700" : "text-avocado-900"}`}
            >
              {formatPercent(b.current)}
            </span>
          ))}
        </div>

        <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
          {visibleSlices.map((b) => (
            <span key={b.name} className="text-avocado-600">
              {hasTargets ? formatPercent(b.target) : "—"}
            </span>
          ))}
        </div>

        {hasTargets && (
          <div className={`${ROW_H} grid ${colClass} items-center text-center text-sm`}>
            {visibleSlices.map((b) => {
              const drift = b.current - b.target;
              return (
                <span
                  key={b.name}
                  className={`font-medium ${
                    Math.abs(drift) < 0.005
                      ? "text-avocado-500"
                      : drift > 0
                        ? "text-amber-700"
                        : "text-red-600"
                  }`}
                >
                  {drift > 0 ? "+" : ""}
                  {formatPercent(drift)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
