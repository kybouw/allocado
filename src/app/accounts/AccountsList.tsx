"use client";

import { reorderAccounts } from "@allocado/app/_actions/accounts";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";

type Account = {
  id: string;
  name: string;
  institution: string | null;
  accountType: string;
  notes: string | null;
  goalName: string | null;
};

export function AccountsList({ accounts }: { accounts: Account[] }) {
  const [optimisticAccounts, setOptimisticAccounts] = useOptimistic(accounts);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = optimisticAccounts.findIndex((a) => a.id === active.id);
    const newIndex = optimisticAccounts.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...optimisticAccounts];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    startTransition(async () => {
      setOptimisticAccounts(reordered);
      await reorderAccounts(reordered.map((a) => a.id));
    });
  }

  if (optimisticAccounts.length === 0) {
    return <p className="text-sm text-avocado-700">No accounts yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={optimisticAccounts.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="divide-y divide-avocado-100">
          {optimisticAccounts.map((a) => (
            <SortableAccountRow key={a.id} account={a} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableAccountRow({ account }: { account: Account }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 py-3 ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab touch-none text-avocado-300 hover:text-avocado-600 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripIcon />
      </button>

      <div className="flex-1">
        <Link
          href={`/accounts/${account.id}`}
          className="font-medium text-avocado-900 hover:underline"
        >
          {account.name}
        </Link>
        <span className="ml-3 text-xs text-avocado-600">{account.accountType}</span>
        {account.institution && (
          <span className="ml-2 text-xs text-avocado-600">· {account.institution}</span>
        )}
        <p className="mt-1 text-xs text-avocado-600">Goal: {account.goalName ?? "(none)"}</p>
      </div>

      <Link
        href={`/accounts/${account.id}`}
        className="text-sm font-medium text-avocado-700 hover:text-avocado-900"
      >
        Holdings →
      </Link>
    </li>
  );
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
    </svg>
  );
}
