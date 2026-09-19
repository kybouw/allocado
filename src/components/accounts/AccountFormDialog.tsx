"use client";

import { createAccount, updateAccount } from "@allocado/app/_actions/accounts";
import { Button } from "@allocado/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@allocado/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@allocado/components/ui/tooltip";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { type AccountFormValues, AccountGeneralForm } from "./AccountGeneralForm";

export type { AccountFormValues };

export function AccountFormDialog({
  account,
  goals,
}: {
  account?: AccountFormValues;
  goals: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = account != null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = isEdit
        ? await updateAccount(account.id, formData)
        : await createAccount(formData);
      if (res.ok) {
        toast.success(isEdit ? "Account updated." : "Account created.");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) setOpen(v);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            {isEdit ? (
              <Button variant="outline" size="icon-sm" aria-label={`Edit account ${account.name}`}>
                <Pencil className="size-3.5" />
              </Button>
            ) : (
              <Button size="icon" aria-label="New account">
                <Plus className="size-4" />
              </Button>
            )}
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{isEdit ? "Edit account" : "New account"}</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit account" : "New account"}</DialogTitle>
        </DialogHeader>
        <form
          key={String(open)}
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <AccountGeneralForm account={account} goals={goals} />
          <DialogFooter className="sm:col-span-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
