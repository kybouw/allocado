export type StackedBarSlice = { key: string; pct: number; colorClass: string };

export function StackedBar({
  slices,
  muted = false,
  separated = false,
}: {
  slices: StackedBarSlice[];
  muted?: boolean;
  separated?: boolean;
}) {
  const total = slices.reduce((s, sl) => s + sl.pct, 0);
  if (total === 0) return <div className="h-6 flex-1 rounded bg-avocado-100" />;

  return (
    <div className={`flex h-6 min-w-0 flex-1 overflow-hidden rounded ${separated ? "gap-px" : ""}`}>
      {slices.map((sl) => {
        if (sl.pct <= 0) return null;
        return (
          <div
            key={sl.key}
            className={`${sl.colorClass} ${muted ? "opacity-40" : ""} transition-all`}
            style={{ width: `${(sl.pct / total) * 100}%` }}
          />
        );
      })}
    </div>
  );
}
