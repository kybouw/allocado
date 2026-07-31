import { StackedBar } from "@allocado/components/allocation/StackedBar";
import { Card, CardContent, CardHeader } from "@allocado/components/ui/card";
import { ACCOUNT_TYPE_LABELS, TAX_ADVANTAGED_TYPES } from "@allocado/lib/account-types";
import { formatPercent, formatUSD, sumMoney } from "@allocado/lib/money";
import Link from "next/link";
import type { ReactNode } from "react";
import { assignAssetColors } from "./asset-colors";

export function AccountCard({
  account,
  holdings,
  actions,
}: {
  account: {
    id: string;
    name: string;
    accountType: string;
    institution: string | null;
    goalName: string | null;
  };
  holdings: Array<{ ticker: string; assetName: string; value: string }>;
  actions?: ReactNode;
}) {
  const total = Number(sumMoney(holdings.map((h) => h.value)));
  const isTaxAdvantaged = TAX_ADVANTAGED_TYPES.has(account.accountType);
  const colors = assignAssetColors(holdings.map((h) => h.ticker));
  const ranked = [...holdings].sort((a, b) => Number(b.value) - Number(a.value));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/accounts/${account.id}`}
              className="text-xl font-semibold text-avocado-900 hover:underline"
            >
              {account.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-avocado-600">
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                  isTaxAdvantaged ? "bg-amber-50 text-pit" : "bg-avocado-50 text-avocado-500"
                }`}
              >
                {ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType}
              </span>
              {account.institution && <span>{account.institution}</span>}
              {account.goalName && <span>Goal: {account.goalName}</span>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-avocado-600">Total</div>
              <div className="text-2xl font-semibold text-avocado-900">{formatUSD(total)}</div>
            </div>
            {actions}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {holdings.length === 0 || total === 0 ? (
          <p className="text-sm text-avocado-700">
            No holdings yet.{" "}
            <Link href={`/accounts/${account.id}`} className="underline">
              Add holdings →
            </Link>
          </p>
        ) : (
          <>
            <div className="flex">
              <StackedBar
                separated
                slices={ranked.map((h) => ({
                  key: h.ticker,
                  pct: Number(h.value) / total,
                  colorClass: colors.get(h.ticker) ?? "bg-avocado-100",
                }))}
              />
            </div>
            <div className="flex flex-col divide-y divide-avocado-100">
              {ranked.map((h) => (
                <div key={h.ticker} className="flex items-center gap-2 py-1.5">
                  <div
                    className={`h-2.5 w-2.5 shrink-0 rounded-sm ${colors.get(h.ticker) ?? "bg-avocado-100"}`}
                  />
                  <span className="text-sm font-medium text-avocado-900">{h.ticker}</span>
                  <span className="min-w-0 truncate text-xs text-avocado-600">{h.assetName}</span>
                  <span className="ml-auto shrink-0 text-sm text-avocado-700">
                    {formatUSD(h.value)}
                  </span>
                  <span className="w-14 shrink-0 text-right text-sm font-medium text-avocado-900">
                    {formatPercent(Number(h.value) / total)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
