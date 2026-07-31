import { ACCOUNT_TYPE_LABELS, TAX_ADVANTAGED_TYPES } from "@allocado/lib/account-types";
import { formatPercent, formatUSD } from "@allocado/lib/money";
import Link from "next/link";
import { type AccountBreakdown, TYPE_COLORS, type TypeName } from "./constants";
import { StackedBar } from "./StackedBar";

export function AccountBreakdownTable({ accounts }: { accounts: AccountBreakdown[] }) {
  const showOther = accounts.some((a) =>
    a.targeted.find((b) => b.name === "Other" && b.current > 0.001),
  );
  const colClass = showOther ? "grid-cols-4" : "grid-cols-3";
  const tableWidth = showOther ? "w-64" : "w-52";
  const headerNames = showOther
    ? (["Stocks", "Bonds", "Cash", "Other"] as TypeName[])
    : (["Stocks", "Bonds", "Cash"] as TypeName[]);

  return (
    <details className="group mt-1">
      <summary className="flex cursor-pointer select-none list-none items-center gap-1 text-xs text-avocado-500 hover:text-avocado-700">
        <span className="transition-transform group-open:rotate-90">▸</span>
        Breakdown by account
      </summary>

      <div className="mt-3 flex flex-col divide-y divide-avocado-100">
        <div className="flex items-end gap-6 pb-1">
          <div className="min-w-0 flex-1" />
          <div className={`${tableWidth} shrink-0`}>
            <div className={`grid ${colClass} text-center`}>
              {headerNames.map((name) => (
                <span
                  key={name}
                  className={`text-xs font-medium ${name === "Other" ? "text-purple-500" : "text-avocado-600"}`}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {accounts.map((acct) => {
          const isTaxAdvantaged = TAX_ADVANTAGED_TYPES.has(acct.accountType);
          const visibleSlices = showOther
            ? acct.targeted
            : acct.targeted.filter((b) => b.name !== "Other");
          const currentSlices = visibleSlices.map((b) => ({
            key: b.name,
            pct: b.current,
            colorClass: TYPE_COLORS[b.name],
          }));

          return (
            <div key={acct.accountId} className="flex items-center gap-6 py-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/accounts/${acct.accountId}`}
                    className="truncate text-xs font-medium text-avocado-800 hover:underline"
                  >
                    {acct.accountName}
                  </Link>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${
                      isTaxAdvantaged ? "bg-amber-50 text-pit" : "bg-avocado-50 text-avocado-500"
                    }`}
                  >
                    {ACCOUNT_TYPE_LABELS[acct.accountType] ?? acct.accountType}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-avocado-700">
                    {formatUSD(acct.total)}
                  </span>
                </div>
                <StackedBar slices={currentSlices} />
              </div>

              <div className={`${tableWidth} shrink-0`}>
                <div className={`grid ${colClass} items-center text-center text-xs`}>
                  {visibleSlices.map((b) => (
                    <span
                      key={b.name}
                      className={b.name === "Other" ? "text-purple-600" : "text-avocado-800"}
                    >
                      {b.current > 0.001 ? formatPercent(b.current) : "—"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
