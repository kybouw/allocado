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
import { ACCOUNT_TYPES } from "@allocado/lib/account-types";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type AccountFormValues = {
  id: string;
  name: string;
  goalId: string;
  accountType: string;
  institution: string | null;
  notes: string | null;
};

export function AccountFormDialog({
  account,
  goals,
  onCreated,
}: {
  account?: AccountFormValues;
  goals: Array<{ id: string; name: string }>;
  onCreated?: (id: string) => void;
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
        if (!isEdit && res.data && onCreated) onCreated(res.data.id);
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
          <div className="flex flex-col gap-1">
            <label htmlFor="account-name" className="text-sm font-medium text-avocado-700">
              Name
            </label>
            <input
              id="account-name"
              name="name"
              type="text"
              required
              placeholder="Vanguard Roth IRA"
              defaultValue={account?.name ?? ""}
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="account-goal" className="text-sm font-medium text-avocado-700">
              Goal
            </label>
            <select
              id="account-goal"
              name="goalId"
              required
              defaultValue={account?.goalId}
              className="input-field"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="account-type" className="text-sm font-medium text-avocado-700">
              Type
            </label>
            <select
              id="account-type"
              name="accountType"
              required
              defaultValue={account?.accountType}
              className="input-field"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="account-institution" className="text-sm font-medium text-avocado-700">
              Institution
            </label>
            <input
              id="account-institution"
              name="institution"
              type="text"
              placeholder="Vanguard"
              defaultValue={account?.institution ?? ""}
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="account-notes" className="text-sm font-medium text-avocado-700">
              Notes
            </label>
            <input
              id="account-notes"
              name="notes"
              type="text"
              defaultValue={account?.notes ?? ""}
              className="input-field"
            />
          </div>
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
