"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@allocado/components/ui/collapsible";
import { formatPercent, formatUSD } from "@allocado/lib/money";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { TYPE_COLORS, type TypeName } from "./constants";

export type ClassRow = {
  name: TypeName;
  dollars: number;
  current: number;
  /** Null for classes that are never targeted — "Other" today. */
  target: number | null;
  sources: Array<{
    accountId: string;
    accountName: string;
    assetId: string;
    ticker: string;
    assetName: string;
    dollars: number;
    shareOfClass: number;
  }>;
};

/**
 * Current allocation per asset class, and where each class came from.
 *
 * Expanding a row answers "why do I hold this?" by naming the accounts and funds
 * behind it — the cash sliver you did not put there is usually one account's doing.
 */
export function ClassDriftTable({ rows }: { rows: ClassRow[] }) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-avocado-100 px-3 pb-2">
        <span className="text-xs font-medium text-avocado-600">Asset class</span>
        <span className="text-right text-xs font-medium text-avocado-600">Value</span>
        <span className="text-right text-xs font-medium text-avocado-600">Current</span>
        <span className="text-right text-xs font-medium text-avocado-600">vs target</span>
      </div>

      {rows.map((row) => {
        const drift = row.target == null ? null : row.current - row.target;
        const onTarget = drift != null && Math.abs(drift) < 0.005;

        return (
          <Collapsible key={row.name} className="border-b border-avocado-50 last:border-b-0">
            <CollapsibleTrigger
              className="group grid w-full grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 rounded px-3 py-3 text-left hover:bg-avocado-50/60"
              aria-label={`Show what makes up ${row.name}`}
            >
              <span className="flex items-center gap-2.5">
                <ChevronRight className="size-3.5 shrink-0 text-avocado-500 transition-transform group-data-[state=open]:rotate-90" />
                <span className={`size-2.5 shrink-0 rounded-sm ${TYPE_COLORS[row.name]}`} />
                <span className="text-sm font-medium text-avocado-900">{row.name}</span>
              </span>
              <span className="text-right text-sm text-avocado-900">{formatUSD(row.dollars)}</span>
              <span className="text-right text-sm text-avocado-900">
                {formatPercent(row.current)}
              </span>
              <span
                className={`text-right text-sm ${
                  drift == null
                    ? "text-avocado-500"
                    : onTarget
                      ? "text-avocado-500"
                      : drift > 0
                        ? "text-amber-700"
                        : "text-red-600"
                }`}
              >
                {drift == null ? "—" : `${drift > 0 ? "+" : ""}${formatPercent(drift)}`}
              </span>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="flex flex-col gap-2 rounded-b bg-avocado-50/60 px-3 pb-3 pl-11">
                {row.sources.length === 0 ? (
                  <p className="py-1 text-xs text-avocado-600">Nothing in this class yet.</p>
                ) : (
                  row.sources.map((s) => (
                    <div
                      key={`${s.accountId}-${s.assetId}`}
                      className="grid grid-cols-[2fr_1fr_1fr] items-center gap-4"
                    >
                      <span className="min-w-0 truncate text-xs text-avocado-700">
                        <Link href={`/accounts/${s.accountId}`} className="hover:underline">
                          {s.accountName}
                        </Link>
                        <span className="text-avocado-500"> · </span>
                        <Link href={`/assets/${s.assetId}`} className="hover:underline">
                          {s.ticker}
                        </Link>
                      </span>
                      <span className="text-right text-xs text-avocado-700">
                        {formatUSD(s.dollars)}
                      </span>
                      <span className="text-right text-xs text-avocado-600">
                        {formatPercent(s.shareOfClass)} of class
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
