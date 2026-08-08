"use client";

import {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  syncPlaidItem,
} from "@allocado/app/_actions/plaid";
import { PrimaryButton } from "@allocado/components/ui/buttons/PrimaryButton";
import { SecondaryButton } from "@allocado/components/ui/buttons/SecondaryButton";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

/**
 * Opens Plaid Link. Without `itemId` it connects a new institution; with `itemId`
 * it runs update-mode re-authentication for an existing connection.
 */
export function PlaidLinkLauncher({
  itemId,
  children,
  variant = "primary",
}: {
  itemId?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      setLinkToken(null);
      const toastId = toast.loading(
        itemId ? "Re-authenticating…" : "Connecting — pulling your accounts from Plaid…",
      );
      startTransition(async () => {
        const res = itemId
          ? await syncPlaidItem(itemId)
          : await exchangePlaidPublicToken(publicToken ?? "", {
              institutionId: metadata.institution?.institution_id ?? null,
              institutionName: metadata.institution?.name ?? null,
            });
        if (res.ok) {
          toast.success(itemId ? "Reconnected." : "Institution connected.", { id: toastId });
          router.refresh();
        } else {
          toast.error(res.error, { id: toastId });
        }
      });
    },
    onExit: () => setLinkToken(null),
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  function launch() {
    startTransition(async () => {
      const res = await createPlaidLinkToken(itemId);
      if (res.ok && res.data) setLinkToken(res.data.linkToken);
      else if (!res.ok) toast.error(res.error);
    });
  }

  const busy = isPending || linkToken != null;
  const Button = variant === "primary" ? PrimaryButton : SecondaryButton;
  return (
    <Button type="button" onClick={launch} disabled={busy}>
      {busy && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
      {children}
    </Button>
  );
}
