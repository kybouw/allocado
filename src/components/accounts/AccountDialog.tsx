"use client";

import { updateAccount } from "@allocado/app/_actions/accounts";
import {
  type AccountPlaidLink,
  AccountSyncCard,
  type PlaidPosition,
} from "@allocado/components/plaid/AccountSyncCard";
import { Button } from "@allocado/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@allocado/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@allocado/components/ui/tabs";
import { Loader2, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { type AccountFormValues, AccountGeneralForm } from "./AccountGeneralForm";

/**
 * Everything you can change about an account, in one dialog over the detail page.
 *
 * The three tabs are deliberately not symmetric: General is a form with its own
 * Save, holdings save themselves through HoldingsEditor, and the sync controls
 * fire as soon as you touch them. So the dialog has no shared footer Save — each
 * tab keeps the save affordance it already had, and nothing implies that
 * switching tabs preserves unsaved work.
 */
export function AccountDialog({
  account,
  goals,
  sync,
  holdingsEditor,
}: {
  account: AccountFormValues;
  goals: Array<{ id: string; name: string }>;
  sync: {
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
  };
  holdingsEditor: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // AccountSyncCard renders nothing when there is no link and nothing to link.
  // That is fine as a hidden card, but an empty tab is not — so drop the tab.
  const showSync = sync.link != null || sync.unlinkedPlaidAccounts.length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateAccount(account.id, formData);
      if (res.ok) toast.success("Account updated.");
      else toast.error(res.error ?? "Something went wrong.");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="size-3.5" />
          Edit account
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{account.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="min-h-0">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            {showSync && <TabsTrigger value="sync">Automatic sync</TabsTrigger>}
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
          </TabsList>

          {/* Only the panel scrolls, so the tab bar stays put. */}
          <TabsContent value="general" className="max-h-[60vh] overflow-y-auto px-1 pt-2">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AccountGeneralForm account={account} goals={goals} idPrefix="account-dialog" />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          </TabsContent>

          {showSync && (
            <TabsContent value="sync" className="max-h-[60vh] overflow-y-auto px-1 pt-2">
              <AccountSyncCard
                accountId={sync.accountId}
                link={sync.link}
                unlinkedPlaidAccounts={sync.unlinkedPlaidAccounts}
                positions={sync.positions}
                assets={sync.assets}
                variant="plain"
              />
            </TabsContent>
          )}

          <TabsContent value="holdings" className="max-h-[60vh] overflow-y-auto px-1 pt-2">
            {holdingsEditor}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
