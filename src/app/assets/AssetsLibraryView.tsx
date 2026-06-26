"use client";

import { Badge } from "@allocado/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@allocado/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@allocado/components/ui/tabs";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type AssetEntry = {
  id: string;
  isOwned: boolean;
  ticker: string;
  name: string;
  avgDurationYears: string | null;
  stockPct: number;
  bondPct: number;
  cashPct: number;
  otherPct: number;
  classes: Array<{ name: string; type: string; ratio: string }>;
};

type TabKey = "stock" | "bond" | "cash" | "other";
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "stock", label: "Stocks" },
  { key: "bond", label: "Bonds" },
  { key: "cash", label: "Cash" },
  { key: "other", label: "Other" },
];
const PCT_KEY: Record<TabKey, keyof AssetEntry> = {
  stock: "stockPct",
  bond: "bondPct",
  cash: "cashPct",
  other: "otherPct",
};

export function MyLibrarySection({ userAssets }: { userAssets: AssetEntry[] }) {
  return (
    <section className="card flex flex-col gap-4">
      <h2 className="text-lg font-medium text-avocado-800">My library</h2>
      {userAssets.length === 0 ? (
        <p className="text-sm text-avocado-600">
          Your custom asset library is empty — add a fund below to get started.
        </p>
      ) : (
        <AssetTabs assets={userAssets} editable />
      )}
    </section>
  );
}

export function SystemLibrarySection({
  systemAssets,
  defaultOpen,
}: {
  systemAssets: AssetEntry[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card flex flex-col gap-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-avocado-800">System library</h2>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-avocado-600 hover:text-avocado-900"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              {open ? "Hide" : "Show"}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-4">
          <AssetTabs assets={systemAssets} editable={false} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function AssetTabs({ assets, editable }: { assets: AssetEntry[]; editable: boolean }) {
  return (
    <Tabs defaultValue="stock">
      <TabsList>
        {TABS.map(({ key, label }) => (
          <TabsTrigger key={key} value={key}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map(({ key }) => {
        const filtered = assets.filter((a) => (a[PCT_KEY[key]] as number) > 0);
        return (
          <TabsContent key={key} value={key} className="mt-4">
            {filtered.length === 0 ? (
              <p className="text-sm text-avocado-600">No assets in this category.</p>
            ) : (
              <AssetTable assets={filtered} editable={editable} showDuration={key === "bond"} />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function AssetTable({
  assets,
  editable,
  showDuration,
}: {
  assets: AssetEntry[];
  editable: boolean;
  showDuration: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-avocado-600">
            <th className="pb-2 pr-4">Ticker</th>
            <th className="pb-2 pr-4">Name</th>
            {showDuration && <th className="pb-2 pr-4">Duration</th>}
            <th className="pb-2">Subclasses</th>
            {editable && <th className="pb-2" />}
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id} className="border-t border-avocado-100 align-top">
              <td className="py-3 pr-4 font-mono font-medium text-avocado-900">
                {editable ? (
                  <Link href={`/assets/${a.id}`} className="hover:underline">
                    {a.ticker}
                  </Link>
                ) : (
                  a.ticker
                )}
              </td>
              <td className="py-3 pr-4 text-avocado-800">{a.name}</td>
              {showDuration && (
                <td className="py-3 pr-4 text-avocado-600">
                  {a.avgDurationYears ? `${Number(a.avgDurationYears).toFixed(1)} yr` : "—"}
                </td>
              )}
              <td className="py-3">
                <div className="flex flex-wrap gap-1">
                  {a.classes.map((c) => (
                    <Badge key={`${a.id}-${c.name}`} variant="secondary">
                      {c.name} {Number(c.ratio).toFixed(0)}%
                    </Badge>
                  ))}
                  {a.classes.length === 0 && <span className="text-xs text-avocado-400">—</span>}
                </div>
              </td>
              {editable && (
                <td className="py-3 pl-4">
                  <Link
                    href={`/assets/${a.id}`}
                    className="text-xs font-medium text-avocado-600 hover:text-avocado-900 hover:underline"
                  >
                    Edit →
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
