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
import type { ReactNode } from "react";
import { useState } from "react";

/**
 * Target allocation, edited over the goal page.
 *
 * The editor itself is passed in rather than imported so this shell does not
 * care whether it is holding the numeric form or, later, the slider tuner.
 */
export function TargetDialog({ editor, hasTargets }: { editor: ReactNode; hasTargets: boolean }) {
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
            How you want this goal invested. Stocks, bonds and cash must add to 100%. Gold, crypto
            and commodities are never targeted — they share no place on a risk scale, so Allocado
            reports what you hold without forming an opinion about it.
          </DialogDescription>
        </DialogHeader>
        {editor}
      </DialogContent>
    </Dialog>
  );
}
