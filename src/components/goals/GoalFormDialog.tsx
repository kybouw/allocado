"use client";

import { createGoal, updateGoal } from "@allocado/app/_actions/goals";
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

type GoalFormValues = {
  id: string;
  name: string;
  targetDate: string | null;
  notes: string | null;
};

export function GoalFormDialog({ goal }: { goal?: GoalFormValues }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = goal != null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = isEdit ? await updateGoal(goal.id, formData) : await createGoal(formData);
      if (res.ok) {
        toast.success(isEdit ? "Goal updated." : "Goal created.");
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
              <Button variant="outline" size="icon-sm" aria-label={`Edit goal ${goal.name}`}>
                <Pencil className="size-3.5" />
              </Button>
            ) : (
              <Button size="icon" aria-label="New goal">
                <Plus className="size-4" />
              </Button>
            )}
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{isEdit ? "Edit goal" : "New goal"}</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit goal" : "New goal"}</DialogTitle>
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
              placeholder="Retirement"
              defaultValue={goal?.name ?? ""}
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
              defaultValue={goal?.targetDate ?? ""}
              className="input-field"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="goal-notes" className="text-sm font-medium text-avocado-700">
              Notes
            </label>
            <input
              id="goal-notes"
              name="notes"
              type="text"
              defaultValue={goal?.notes ?? ""}
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
              {isEdit ? "Save" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
