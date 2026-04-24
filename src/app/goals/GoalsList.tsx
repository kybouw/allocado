"use client";

import { reorderGoals } from "@allocado/app/_actions/goals";
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

type Goal = {
  id: string;
  name: string;
  targetDate: string | null;
  notes: string | null;
};

export function GoalsList({ goals }: { goals: Goal[] }) {
  const [optimisticGoals, setOptimisticGoals] = useOptimistic(goals);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = optimisticGoals.findIndex((g) => g.id === active.id);
    const newIndex = optimisticGoals.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...optimisticGoals];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    startTransition(async () => {
      setOptimisticGoals(reordered);
      await reorderGoals(reordered.map((g) => g.id));
    });
  }

  if (optimisticGoals.length === 0) {
    return <p className="text-sm text-avocado-700">No goals yet. Create one below.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={optimisticGoals.map((g) => g.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="divide-y divide-avocado-100">
          {optimisticGoals.map((g) => (
            <SortableGoalRow key={g.id} goal={g} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableGoalRow({ goal }: { goal: Goal }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 py-3 ${isDragging ? "opacity-50" : ""}`}
    >
      {/* Drag handle */}
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

      {/* Goal info */}
      <div className="flex-1">
        <Link href={`/goals/${goal.id}`} className="font-medium text-avocado-900 hover:underline">
          {goal.name}
        </Link>
        {goal.targetDate && (
          <span className="ml-3 text-xs text-avocado-600">target {goal.targetDate}</span>
        )}
        {goal.notes && <p className="mt-1 text-xs text-avocado-600">{goal.notes}</p>}
      </div>

      <Link
        href={`/goals/${goal.id}`}
        className="text-sm font-medium text-avocado-700 hover:text-avocado-900"
      >
        Edit →
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
