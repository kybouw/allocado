"use client";

import { createAsset } from "@allocado/app/_actions/assets";
import { linkPlaidAccount, mapPlaidPosition, syncPlaidItem } from "@allocado/app/_actions/plaid";
import { formatRelativeTime } from "@allocado/components/plaid/relative-time";
import { Badge } from "@allocado/components/ui/badge";
import { SecondaryButton } from "@allocado/components/ui/buttons/SecondaryButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allocado/components/ui/select";
import { formatUSD } from "@allocado/lib/money";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
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

export type PlaidPosition = {
  securityRowId: string;
  ticker: string | null;
  name: string | null;
  value: string;
  assetId: string | null;
};

const UNMAPPED = "__unmapped__";

export function AccountSyncCard({
  accountId,
  link,
  unlinkedPlaidAccounts,
  positions,
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
  positions: PlaidPosition[];
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
          <Select value={selected} onValueChange={setSelected} disabled={isPending}>
            <SelectTrigger className="min-w-[260px]">
              <SelectValue placeholder="Choose a brokerage account…" />
            </SelectTrigger>
            <SelectContent>
              {unlinkedPlaidAccounts.map((pa) => (
                <SelectItem key={pa.id} value={pa.id}>
                  {pa.institutionName ? `${pa.institutionName} — ` : ""}
                  {pa.name}
                  {pa.mask ? ` ····${pa.mask}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {positions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-avocado-800">Synced positions</h3>
          <ul className="flex flex-col gap-2">
            {positions.map((p) => (
              <PositionRow
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

function PositionRow({
  plaidAccountRowId,
  position,
  assets,
}: {
  plaidAccountRowId: string;
  position: PlaidPosition;
  assets: Array<{ id: string; ticker: string; name: string }>;
}) {
  const [selected, setSelected] = useState(position.assetId ?? UNMAPPED);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelected(position.assetId ?? UNMAPPED);
  }, [position.assetId]);

  function handleChange(value: string) {
    const previous = selected;
    setSelected(value);
    startTransition(async () => {
      const assetId = value === UNMAPPED ? null : value;
      const res = await mapPlaidPosition(plaidAccountRowId, position.securityRowId, assetId);
      if (res.ok) {
        toast.success(assetId ? "Position mapped." : "Position unmapped.");
      } else {
        setSelected(previous);
        toast.error(res.error);
      }
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
      if (res.ok) {
        setSelected(created.data.id);
        toast.success("Asset created and mapped. Set its allocation on the Assets page.");
      } else {
        toast.error(res.error);
      }
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
        {isPending && <Loader2 className="size-3.5 animate-spin text-avocado-600" />}
        <Select value={selected} onValueChange={handleChange} disabled={isPending}>
          <SelectTrigger
            className="min-w-[220px]"
            aria-label={`Map ${position.ticker ?? position.name ?? "position"} to an asset`}
          >
            <SelectValue placeholder="Map to asset…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNMAPPED}>Not mapped</SelectItem>
            {assets.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.ticker} — {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected === UNMAPPED && position.ticker && (
          <SecondaryButton type="button" onClick={createAndMap} disabled={isPending}>
            Create asset
          </SecondaryButton>
        )}
      </div>
    </li>
  );
}
