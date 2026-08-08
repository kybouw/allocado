"use client";

import { linkPlaidAccount, removePlaidItem, syncPlaidItem } from "@allocado/app/_actions/plaid";
import { AccountFormDialog } from "@allocado/components/accounts/AccountFormDialog";
import { PlaidLinkLauncher } from "@allocado/components/plaid/PlaidLinkLauncher";
import { formatRelativeTime } from "@allocado/components/plaid/relative-time";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@allocado/components/ui/alert-dialog";
import { Badge } from "@allocado/components/ui/badge";
import { SecondaryButton } from "@allocado/components/ui/buttons/SecondaryButton";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type PlaidAccountRow = {
  id: string;
  name: string;
  mask: string | null;
  plaidSubtype: string | null;
  accountId: string | null;
  linkedAccountName: string | null;
};

export type PlaidItem = {
  id: string;
  institutionName: string | null;
  status: "ok" | "login_required" | "error";
  lastErrorCode: string | null;
  lastSyncedAt: Date | null;
  plaidAccounts: PlaidAccountRow[];
};

export function PlaidItemCard({
  item,
  linkableAccounts,
  goals,
}: {
  item: PlaidItem;
  linkableAccounts: Array<{ id: string; name: string }>;
  goals: Array<{ id: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const res = await syncPlaidItem(item.id);
      if (res.ok) {
        const unmapped = res.data?.unmappedCount ?? 0;
        toast.success(unmapped > 0 ? `Synced. ${unmapped} unmapped securities.` : "Synced.");
      } else {
        toast.error(res.error);
      }
    });
  }

  function disconnect() {
    startTransition(async () => {
      const res = await removePlaidItem(item.id);
      if (res.ok) toast.success("Institution disconnected. Holdings were kept.");
      else toast.error(res.error);
    });
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-medium text-avocado-900">
            {item.institutionName ?? "Institution"}
          </h3>
          {item.status === "ok" ? (
            <Badge variant="secondary">Connected</Badge>
          ) : item.status === "login_required" ? (
            <Badge variant="destructive">Reconnect needed</Badge>
          ) : (
            <Badge variant="destructive">
              Error{item.lastErrorCode ? `: ${item.lastErrorCode}` : ""}
            </Badge>
          )}
          <span className="text-xs text-avocado-600">
            {item.lastSyncedAt
              ? `Last synced ${formatRelativeTime(item.lastSyncedAt)}`
              : "Never synced"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {item.status === "login_required" && (
            <PlaidLinkLauncher itemId={item.id} variant="secondary">
              Reconnect
            </PlaidLinkLauncher>
          )}
          <SecondaryButton type="button" onClick={sync} disabled={isPending}>
            {isPending && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
            Sync now
          </SecondaryButton>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <SecondaryButton type="button" disabled={isPending}>
                Disconnect
              </SecondaryButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Disconnect {item.institutionName ?? "this institution"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Automatic updates stop. Your current holdings are kept and become
                  manually-editable again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={disconnect}>Disconnect</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {item.plaidAccounts.map((pa) => (
          <PlaidAccountRowView
            key={pa.id}
            row={pa}
            linkableAccounts={linkableAccounts}
            goals={goals}
          />
        ))}
      </ul>
    </div>
  );
}

function PlaidAccountRowView({
  row,
  linkableAccounts,
  goals,
}: {
  row: PlaidAccountRow;
  linkableAccounts: Array<{ id: string; name: string }>;
  goals: Array<{ id: string; name: string }>;
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  function setLink(accountId: string | null) {
    startTransition(async () => {
      const res = await linkPlaidAccount(row.id, accountId);
      if (res.ok) toast.success(accountId ? "Account linked." : "Account unlinked.");
      else toast.error(res.error);
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded border border-avocado-100 bg-white p-3">
      <div className="text-sm">
        <span className="font-medium text-avocado-900">{row.name}</span>
        {row.mask && <span className="ml-2 text-avocado-600">····{row.mask}</span>}
        {row.plaidSubtype && (
          <span className="ml-2 text-xs text-avocado-600">{row.plaidSubtype}</span>
        )}
      </div>
      {row.accountId ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-avocado-700">
            → <span className="font-medium text-avocado-900">{row.linkedAccountName}</span>
          </span>
          <SecondaryButton type="button" onClick={() => setLink(null)} disabled={isPending}>
            Unlink
          </SecondaryButton>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="input-field"
            aria-label={`Link ${row.name} to an account`}
          >
            <option value="">Link to account…</option>
            {linkableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <SecondaryButton
            type="button"
            onClick={() => setLink(selected)}
            disabled={isPending || !selected}
          >
            {isPending && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
            Link
          </SecondaryButton>
          {goals.length > 0 && <AccountFormDialog goals={goals} onCreated={(id) => setLink(id)} />}
        </div>
      )}
    </li>
  );
}
