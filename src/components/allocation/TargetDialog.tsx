"use client";

import { Button } from "@allocado/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@allocado/components/ui/dialog";
import { SlidersHorizontal } from "lucide-react";
import type { ReactElement } from "react";
import { cloneElement, useState } from "react";

/**
 * Target allocation, edited over the goal page.
 *
 * The editor itself is passed in rather than imported so this shell does not
 * care whether it is holding the numeric form or, later, the slider tuner.
 * `editor` comes from a Server Component, so it must stay a plain element —
 * the `onSaved` close callback is injected here, client-side, via cloneElement
 * rather than threaded through as a prop (functions can't cross that boundary).
 */
export function TargetDialog({
  editor,
  hasTargets,
}: {
  editor: ReactElement<{ onSaved?: () => void }>;
  hasTargets: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={hasTargets ? "outline" : "default"}>
          <SlidersHorizontal className="size-4" />
          {hasTargets ? "Adjust target" : "Set a target"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Target allocation</DialogTitle>
          <DialogDescription>
            How you want this goal split across stocks, bonds, and cash.
          </DialogDescription>
        </DialogHeader>
        {cloneElement(editor, { onSaved: () => setOpen(false) })}
      </DialogContent>
    </Dialog>
  );
}
