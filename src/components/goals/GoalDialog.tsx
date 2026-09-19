"use client";

import { updateGoal } from "@allocado/app/_actions/goals";
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
import { Loader2, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export type GoalFormValues = {
  id: string;
  name: string;
  targetDate: string | null;
  notes: string | null;
};

/** Goal metadata, edited over the page rather than on it. */
export function GoalDialog({ goal }: { goal: GoalFormValues }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateGoal(goal.id, formData);
      if (res.ok) {
        toast.success("Goal updated.");
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
            <Button variant="outline" size="icon" aria-label="Edit goal">
              <Pencil className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Edit goal</TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit goal</DialogTitle>
        </DialogHeader>

        <form key={String(open)} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="goal-name" className="text-sm font-medium text-avocado-700">
              Name
            </label>
            <input
              id="goal-name"
              name="name"
              type="text"
              required
              defaultValue={goal.name}
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="goal-target-date" className="text-sm font-medium text-avocado-700">
              Target date
            </label>
            <input
              id="goal-target-date"
              name="targetDate"
              type="date"
              defaultValue={goal.targetDate ?? ""}
              className="input-field"
            />
            <p className="text-xs text-avocado-600">
              When you expect to spend this money. Allocado uses it to judge whether the risk you
              are holding has time to recover.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="goal-notes" className="text-sm font-medium text-avocado-700">
              Notes
            </label>
            <input
              id="goal-notes"
              name="notes"
              type="text"
              defaultValue={goal.notes ?? ""}
              className="input-field"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
