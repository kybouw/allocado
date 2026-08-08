"use client";

import { createAsset } from "@allocado/app/_actions/assets";
import { linkPlaidAccount, mapPlaidPosition, syncPlaidItem } from "@allocado/app/_actions/plaid";
import { formatRelativeTime } from "@allocado/components/plaid/relative-time";
import { Badge } from "@allocado/components/ui/badge";
import { SecondaryButton } from "@allocado/components/ui/buttons/SecondaryButton";
import { formatUSD } from "@allocado/lib/money";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export type AccountPlaidLink = {
  itemId: string;
  plaidAccountRowId: string;
  plaidAccountName: string;
  mask: string | null;
  institutionName: string | null;
  status: "ok" | "login_required" | "error";
  lastSyncedAt: Date | null;
};

export type UnmappedPosition = {
  securityRowId: string;
  ticker: string | null;
  name: string | null;
  value: string;
};

export function AccountSyncCard({
  accountId,
  link,
  unlinkedPlaidAccounts,
  unmappedPositions,
  assets,
}: {
  accountId: string;
  link: AccountPlaidLink | null;
  unlinkedPlaidAccounts: Array<{
    id: string;
    name: string;
    mask: string | null;
    institutionName: string | null;
  }>;
  unmappedPositions: UnmappedPosition[];
  assets: Array<{ id: string; ticker: string; name: string }>;
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  function setLink(plaidAccountRowId: string, target: string | null) {
    startTransition(async () => {
      const res = await linkPlaidAccount(plaidAccountRowId, target);
      if (res.ok) toast.success(target ? "Account connected." : "Account disconnected.");
      else toast.error(res.error);
    });
  }

  function sync(itemId: string) {
    startTransition(async () => {
      const res = await syncPlaidItem(itemId);
      if (res.ok) toast.success("Synced.");
      else toast.error(res.error);
    });
  }

  if (!link) {
    if (unlinkedPlaidAccounts.length === 0) return null;
    return (
      <section className="card flex flex-col gap-3">
        <h2 className="text-lg font-medium text-avocado-800">Automatic sync</h2>
        <p className="text-sm text-avocado-700">
          Feed this account from a connected brokerage account. Manage institutions in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="input-field"
            aria-label="Choose a connected brokerage account"
          >
            <option value="">Choose a brokerage account…</option>
            {unlinkedPlaidAccounts.map((pa) => (
              <option key={pa.id} value={pa.id}>
                {pa.institutionName ? `${pa.institutionName} — ` : ""}
                {pa.name}
                {pa.mask ? ` ····${pa.mask}` : ""}
              </option>
            ))}
          </select>
          <SecondaryButton
            type="button"
            onClick={() => setLink(selected, accountId)}
            disabled={isPending || !selected}
          >
            {isPending && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
            Connect
          </SecondaryButton>
        </div>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-avocado-800">Automatic sync</h2>
          {link.status === "ok" ? (
            <Badge variant="secondary">Connected</Badge>
          ) : (
            <Badge variant="destructive">
              {link.status === "login_required" ? "Reconnect needed" : "Error"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton type="button" onClick={() => sync(link.itemId)} disabled={isPending}>
            {isPending && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
            Sync now
          </SecondaryButton>
          <SecondaryButton
            type="button"
            onClick={() => setLink(link.plaidAccountRowId, null)}
            disabled={isPending}
          >
            Disconnect
          </SecondaryButton>
        </div>
      </div>
      <p className="text-sm text-avocado-700">
        Fed by <span className="font-medium text-avocado-900">{link.plaidAccountName}</span>
        {link.mask ? ` ····${link.mask}` : ""}
        {link.institutionName ? ` at ${link.institutionName}` : ""}
        {link.lastSyncedAt ? ` · last synced ${formatRelativeTime(link.lastSyncedAt)}` : ""}.
        {link.status === "login_required" && (
          <>
            {" "}
            Re-authenticate from{" "}
            <Link href="/settings" className="underline">
              Settings
            </Link>
            .
          </>
        )}
      </p>

      {unmappedPositions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            These synced positions aren&apos;t counted in this account yet. Map each to an asset to
            create its holding. If the asset already has a manual holding here, sync takes over its
            value.
          </p>
          <ul className="flex flex-col gap-2">
            {unmappedPositions.map((p) => (
              <UnmappedPositionRow
                key={p.securityRowId}
                plaidAccountRowId={link.plaidAccountRowId}
                position={p}
                assets={assets}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function UnmappedPositionRow({
  plaidAccountRowId,
  position,
  assets,
}: {
  plaidAccountRowId: string;
  position: UnmappedPosition;
  assets: Array<{ id: string; ticker: string; name: string }>;
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  function map(assetId: string) {
    startTransition(async () => {
      const res = await mapPlaidPosition(plaidAccountRowId, position.securityRowId, assetId);
      if (res.ok) toast.success("Position mapped.");
      else toast.error(res.error);
    });
  }

  function createAndMap() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("ticker", position.ticker ?? "");
      formData.set("name", position.name ?? position.ticker ?? "");
      const created = await createAsset(formData);
      if (!created.ok || !created.data) {
        toast.error(created.ok ? "Something went wrong." : created.error);
        return;
      }
      const res = await mapPlaidPosition(
        plaidAccountRowId,
        position.securityRowId,
        created.data.id,
      );
      if (res.ok) toast.success("Asset created and mapped. Set its allocation on the Assets page.");
      else toast.error(res.error);
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded border border-avocado-100 bg-white p-3">
      <div className="text-sm">
        {position.ticker && <span className="font-medium text-avocado-900">{position.ticker}</span>}
        <span
          className={position.ticker ? "ml-2 text-avocado-600" : "font-medium text-avocado-900"}
        >
          {position.name ?? "Unnamed security"}
        </span>
        <span className="ml-2 text-avocado-700">{formatUSD(position.value)}</span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input-field"
          aria-label={`Map ${position.ticker ?? position.name ?? "position"} to an asset`}
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
        {position.ticker && (
          <SecondaryButton type="button" onClick={createAndMap} disabled={isPending}>
            Create asset
          </SecondaryButton>
        )}
      </div>
    </li>
  );
}
