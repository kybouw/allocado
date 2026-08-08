"use client";

import { syncPlaidItem } from "@allocado/app/_actions/plaid";
import { SecondaryButton } from "@allocado/components/ui/buttons/SecondaryButton";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

export function SyncNowButton({ itemId }: { itemId: string }) {
  const [isPending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const res = await syncPlaidItem(itemId);
      if (res.ok) {
        const unmapped = res.data?.unmappedCount ?? 0;
        toast.success(unmapped > 0 ? `Synced. ${unmapped} unmapped securities.` : "Synced.");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <SecondaryButton type="button" onClick={sync} disabled={isPending}>
      {isPending && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
      Sync now
    </SecondaryButton>
  );
}
