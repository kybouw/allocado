"use client";

import { createAsset } from "@allocado/app/_actions/assets";
import { mapPlaidSecurity } from "@allocado/app/_actions/plaid";
import { SecondaryButton } from "@allocado/components/ui/buttons/SecondaryButton";
import { formatUSD } from "@allocado/lib/money";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type UnmappedSecurity = {
  id: string;
  ticker: string | null;
  name: string | null;
  totalValue: string;
  accountCount: number;
};

export function UnmappedSecuritiesCard({
  securities,
  assets,
}: {
  securities: UnmappedSecurity[];
  assets: Array<{ id: string; ticker: string; name: string }>;
}) {
  if (securities.length === 0) return null;

  return (
    <div className="card flex flex-col gap-4 border-amber-200">
      <div>
        <h3 className="text-base font-medium text-avocado-900">Unmapped securities</h3>
        <p className="text-sm text-avocado-700">
          These synced positions aren't counted yet. Map each to an asset to include its value. If
          an asset is already held manually in the linked account, syncing takes over its value.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {securities.map((s) => (
          <UnmappedSecurityRow key={s.id} security={s} assets={assets} />
        ))}
      </ul>
    </div>
  );
}

function UnmappedSecurityRow({
  security,
  assets,
}: {
  security: UnmappedSecurity;
  assets: Array<{ id: string; ticker: string; name: string }>;
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  function map(assetId: string) {
    startTransition(async () => {
      const res = await mapPlaidSecurity(security.id, assetId);
      if (res.ok) toast.success("Security mapped.");
      else toast.error(res.error);
    });
  }

  function createAndMap() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("ticker", security.ticker ?? "");
      formData.set("name", security.name ?? security.ticker ?? "");
      const created = await createAsset(formData);
      if (!created.ok || !created.data) {
        toast.error(created.ok ? "Something went wrong." : created.error);
        return;
      }
      const res = await mapPlaidSecurity(security.id, created.data.id);
      if (res.ok) toast.success("Asset created and mapped. Set its allocation on the Assets page.");
      else toast.error(res.error);
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded border border-avocado-100 bg-white p-3">
      <div className="text-sm">
        {security.ticker && <span className="font-medium text-avocado-900">{security.ticker}</span>}
        <span
          className={security.ticker ? "ml-2 text-avocado-600" : "font-medium text-avocado-900"}
        >
          {security.name ?? "Unnamed security"}
        </span>
        <span className="ml-2 text-avocado-700">
          {formatUSD(security.totalValue)}
          {security.accountCount > 1 ? ` across ${security.accountCount} accounts` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input-field"
          aria-label={`Map ${security.ticker ?? security.name ?? "security"} to an asset`}
        >
          <option value="">Map to asset…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.ticker} — {a.name}
            </option>
          ))}
        </select>
        <SecondaryButton
          type="button"
          onClick={() => map(selected)}
          disabled={isPending || !selected}
        >
          {isPending && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
          Map
        </SecondaryButton>
        {security.ticker && (
          <SecondaryButton type="button" onClick={createAndMap} disabled={isPending}>
            Create asset
          </SecondaryButton>
        )}
      </div>
    </li>
  );
}
