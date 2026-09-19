"use client";

import { setStaticTargets } from "@allocado/app/_actions/targets";
import { TYPE_COLORS } from "@allocado/components/allocation/constants";
import { Checkbox } from "@allocado/components/ui/checkbox";
import { Slider } from "@allocado/components/ui/slider";
import { useMemo, useRef, useState, useTransition } from "react";

type InitialTargets = {
  stockTargetPct: number;
  bondTargetPct: number;
  cashTargetPct: number;
};

const CLASSES = ["stock", "bond", "cash"] as const;
type ClassKey = (typeof CLASSES)[number];
type ClassPct = Record<ClassKey, number>;
type ClassChecked = Record<ClassKey, boolean>;

const CLASS_LABEL: Record<ClassKey, string> = { stock: "Stocks", bond: "Bonds", cash: "Cash" };
const CLASS_COLOR: Record<ClassKey, string> = {
  stock: TYPE_COLORS.Stocks,
  bond: TYPE_COLORS.Bonds,
  cash: TYPE_COLORS.Cash,
};

/** Rounds every active class to a cent and folds any leftover onto the largest one, so
 * checked classes always sum to exactly 100.00 — the DB's CHECK constraint requires it exactly. */
function roundAndReconcile(pct: ClassPct, activeKeys: ClassKey[]): ClassPct {
  const result: ClassPct = { ...pct };
  for (const key of activeKeys) result[key] = Math.round(result[key] * 100) / 100;
  for (const key of CLASSES) if (!activeKeys.includes(key)) result[key] = 0;

  if (activeKeys.length > 0) {
    const sum = activeKeys.reduce((s, key) => s + result[key], 0);
    const residual = Math.round((100 - sum) * 100) / 100;
    if (residual !== 0) {
      const largest = activeKeys.reduce((a, b) => (result[a] >= result[b] ? a : b));
      result[largest] = Math.round((result[largest] + residual) * 100) / 100;
    }
  }
  return result;
}

/** Sets `changedKey` to `rawNewValue` and scales the other active classes proportionally
 * so they still fill the remaining space — this is what makes typing and dragging behave
 * the same way, and what makes "must sum to 100%" impossible to violate. */
function redistribute(
  pct: ClassPct,
  activeKeys: ClassKey[],
  changedKey: ClassKey,
  rawNewValue: number,
): ClassPct {
  const newValue = Math.min(100, Math.max(0, rawNewValue));
  const others = activeKeys.filter((key) => key !== changedKey);

  if (others.length === 0) {
    return roundAndReconcile({ ...pct, [changedKey]: 100 }, activeKeys);
  }

  const targetOthersTotal = 100 - newValue;
  const othersTotal = others.reduce((s, key) => s + pct[key], 0);
  const next: ClassPct = { ...pct, [changedKey]: newValue };

  if (othersTotal > 0) {
    const scale = targetOthersTotal / othersTotal;
    for (const key of others) next[key] = pct[key] * scale;
  } else {
    const even = targetOthersTotal / others.length;
    for (const key of others) next[key] = even;
  }

  return roundAndReconcile(next, activeKeys);
}

/** Typing is different from dragging: once you've manually typed a value into a field, later
 * edits to OTHER fields must leave it alone — otherwise you can never dial in an exact split by
 * typing each field in turn. `recency` lists the other classes the user has already typed into,
 * most-recently-typed first. Exactly one untouched (or longest-untouched) class absorbs the whole
 * remainder; if it can't fit, the edit is rejected outright rather than disturbing a locked class. */
function redistributeTyped(
  pct: ClassPct,
  activeKeys: ClassKey[],
  changedKey: ClassKey,
  rawNewValue: number,
  recency: ClassKey[],
): ClassPct {
  const newValue = Math.min(100, Math.max(0, rawNewValue));
  const others = activeKeys.filter((key) => key !== changedKey);

  if (others.length === 0) {
    return roundAndReconcile({ ...pct, [changedKey]: 100 }, activeKeys);
  }

  if (!others.some((key) => recency.includes(key))) {
    // Nothing else has been explicitly typed yet — this is like the very first edit,
    // so spread the change proportionally instead of picking a class to favor.
    return redistribute(pct, activeKeys, changedKey, newValue);
  }

  const flexKey =
    others.find((key) => !recency.includes(key)) ??
    [...others].sort((a, b) => recency.indexOf(b) - recency.indexOf(a))[0];
  const heldTotal = others.filter((key) => key !== flexKey).reduce((sum, key) => sum + pct[key], 0);
  const flexTarget = 100 - newValue - heldTotal;

  if (flexTarget < -0.005 || flexTarget > 100.005) {
    return pct;
  }

  return roundAndReconcile(
    { ...pct, [changedKey]: newValue, [flexKey]: Math.min(100, Math.max(0, flexTarget)) },
    activeKeys,
  );
}

function boundariesToPct(boundaries: number[], activeKeys: ClassKey[]): ClassPct {
  const sorted = [...boundaries].sort((a, b) => a - b);
  const segments = [0, ...sorted, 100];
  const next: ClassPct = { stock: 0, bond: 0, cash: 0 };
  activeKeys.forEach((key, i) => {
    next[key] = segments[i + 1] - segments[i];
  });
  return roundAndReconcile(next, activeKeys);
}

function pctToBoundaries(pct: ClassPct, activeKeys: ClassKey[]): number[] {
  const boundaries: number[] = [];
  let acc = 0;
  for (let i = 0; i < activeKeys.length - 1; i++) {
    acc += pct[activeKeys[i]];
    boundaries.push(acc);
  }
  return boundaries;
}

function initialState(initialTargets: InitialTargets): { checked: ClassChecked; pct: ClassPct } {
  const raw: ClassPct = {
    stock: initialTargets.stockTargetPct,
    bond: initialTargets.bondTargetPct,
    cash: initialTargets.cashTargetPct,
  };

  if (CLASSES.every((key) => raw[key] <= 0)) {
    const evenSplit = roundAndReconcile({ stock: 34, bond: 33, cash: 33 }, [...CLASSES]);
    return { checked: { stock: true, bond: true, cash: true }, pct: evenSplit };
  }

  return {
    checked: { stock: raw.stock > 0, bond: raw.bond > 0, cash: raw.cash > 0 },
    pct: raw,
  };
}

export function TargetsEditor({
  goalId,
  initialTargets,
  onSaved,
}: {
  goalId: string;
  initialTargets: InitialTargets;
  onSaved?: () => void;
}) {
  const [{ checked, pct }, setState] = useState(() => initialState(initialTargets));
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const lastTypedRef = useRef<ClassKey[]>([]);

  const activeKeys = useMemo(() => CLASSES.filter((key) => checked[key]), [checked]);
  const boundaries = useMemo(() => pctToBoundaries(pct, activeKeys), [pct, activeKeys]);
  const segments = useMemo(() => [0, ...boundaries, 100], [boundaries]);
  const thumbLabels = useMemo(
    () =>
      boundaries.map(
        (_, i) =>
          `Boundary between ${CLASS_LABEL[activeKeys[i]]} and ${CLASS_LABEL[activeKeys[i + 1]]}`,
      ),
    [boundaries, activeKeys],
  );

  function applyPct(next: ClassPct) {
    setState((s) => ({ ...s, pct: next }));
    setFeedback(null);
  }

  function handleSliderChange(values: number[]) {
    const nextValues = isDraggingRef.current ? values.map((v) => Math.round(v / 5) * 5) : values;
    applyPct(boundariesToPct(nextValues, activeKeys));
  }

  function handleNumberChange(key: ClassKey, raw: string) {
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    const recency = lastTypedRef.current.filter((k) => k !== key);
    lastTypedRef.current = [key, ...recency];
    applyPct(redistributeTyped(pct, activeKeys, key, value, recency));
  }

  function handleCheckedChange(key: ClassKey, next: boolean) {
    if (!next) {
      if (activeKeys.length <= 1) return;
      lastTypedRef.current = lastTypedRef.current.filter((k) => k !== key);
      setState({
        checked: { ...checked, [key]: false },
        pct: redistribute(pct, activeKeys, key, 0),
      });
      setFeedback(null);
      return;
    }

    // Adding a class at 0% needs no room from anyone else — the checked classes
    // already sum to 100, and 0 doesn't disturb that. Whatever split you'd built
    // up stays exactly as it was; drag or type into the new class to give it a share.
    setState({ checked: { ...checked, [key]: true }, pct: { ...pct, [key]: 0 } });
    setFeedback(null);
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await setStaticTargets(goalId, {
        stockTargetPct: pct.stock,
        bondTargetPct: pct.bond,
        cashTargetPct: pct.cash,
        effectiveDate: null,
      });
      if (res.ok) {
        onSaved?.();
      } else {
        setFeedback(`Error: ${res.error}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-6 rounded-lg bg-avocado-50 px-4 py-3">
        <span className="text-xs font-medium text-avocado-700">Include</span>
        {CLASSES.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              checked={checked[key]}
              onCheckedChange={(next) => handleCheckedChange(key, next === true)}
              disabled={checked[key] && activeKeys.length <= 1}
              aria-label={`Include ${CLASS_LABEL[key]} in the target`}
            />
            <label className="flex items-center gap-1.5 text-sm">
              <span className={`size-2.5 shrink-0 rounded-sm ${CLASS_COLOR[key]}`} />
              {CLASS_LABEL[key]}
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <span className="text-xs font-semibold tracking-wide text-avocado-700 uppercase">
          Risk scale
        </span>
        <div
          className="relative h-10"
          onPointerDown={() => {
            isDraggingRef.current = true;
          }}
        >
          <div className="absolute inset-x-0 top-3 flex h-4 overflow-hidden rounded-lg">
            {activeKeys.map((key, i) => (
              <div
                key={key}
                className={CLASS_COLOR[key]}
                style={{ width: `${segments[i + 1] - segments[i]}%` }}
              />
            ))}
          </div>
          <Slider
            className="absolute inset-0"
            trackClassName="h-4 rounded-lg bg-transparent"
            rangeClassName="bg-transparent"
            value={boundaries}
            onValueChange={handleSliderChange}
            onValueCommit={() => {
              isDraggingRef.current = false;
            }}
            min={0}
            max={100}
            step={1}
            minStepsBetweenThumbs={1}
            thumbLabels={thumbLabels}
          />
        </div>
        <div className="flex justify-between text-[11px] font-medium tracking-wide text-avocado-600 uppercase">
          <span>Growth</span>
          <span>Safety</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CLASSES.map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-avocado-700">
              <span className={`size-2.5 shrink-0 rounded-sm ${CLASS_COLOR[key]}`} />
              {CLASS_LABEL[key]}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={checked[key] ? pct[key] : 0}
                disabled={!checked[key]}
                onChange={(e) => handleNumberChange(key, e.target.value)}
                className="input-field w-full text-right disabled:opacity-40"
              />
              <span className="text-sm text-avocado-600">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {feedback && (
          <span
            className={
              feedback.startsWith("Error") ? "text-sm text-red-600" : "text-sm text-avocado-700"
            }
          >
            {feedback}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <button type="button" onClick={save} disabled={isPending} className="btn-primary">
            {isPending ? "Saving…" : "Save target"}
          </button>
        </div>
      </div>
    </div>
  );
}
