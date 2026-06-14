"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@allocado/components/ui/alert-dialog";
import { Button } from "@allocado/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface DeleteButtonProps {
  action: () => Promise<{ ok: boolean; error?: string }>;
  redirectPath: string;
  itemLabel: string;
}

export function DeleteButton({ action, redirectPath, itemLabel }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const res = await action();
      setOpen(false);
      if (res.ok) {
        toast.success("Deleted.");
        router.push(redirectPath);
      } else {
        toast.error(res.error ?? "Delete failed.");
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) setOpen(v);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" aria-label={`Delete ${itemLabel}`}>
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
