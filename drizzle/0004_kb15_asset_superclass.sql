-- KB-15: Add superclass pct columns to assets; restructure allocation_targets horizontally.
--
-- Order: ADD COLUMN (nullable/default) → UPDATE backfill → ADD CONSTRAINT (not null + check)
-- This ensures data is valid before constraints land.

---------------------------------------------------------------------------
-- 1. Add superclass columns to assets (nullable first, no check constraint)
---------------------------------------------------------------------------
ALTER TABLE "assets" ADD COLUMN "stock_pct" numeric(5, 2) DEFAULT 0;
ALTER TABLE "assets" ADD COLUMN "bond_pct"  numeric(5, 2) DEFAULT 0;
ALTER TABLE "assets" ADD COLUMN "cash_pct"  numeric(5, 2) DEFAULT 0;
ALTER TABLE "assets" ADD COLUMN "other_pct" numeric(5, 2) DEFAULT 0;
--> statement-breakpoint

---------------------------------------------------------------------------
-- 2. Backfill from existing aggregate allocations in asset_class_allocations
--    For assets with no aggregate tag at all, other_pct absorbs the remainder
--    so the sum always equals 100.
---------------------------------------------------------------------------
UPDATE "assets" a SET
  stock_pct = COALESCE((
    SELECT aca.ratio FROM "asset_class_allocations" aca
    JOIN "asset_classes" ac ON ac.id = aca.asset_class_id
    WHERE aca.asset_id = a.id AND ac.name = 'Stocks' AND ac.user_id IS NULL
  ), 0),
  bond_pct = COALESCE((
    SELECT aca.ratio FROM "asset_class_allocations" aca
    JOIN "asset_classes" ac ON ac.id = aca.asset_class_id
    WHERE aca.asset_id = a.id AND ac.name = 'Bonds' AND ac.user_id IS NULL
  ), 0),
  cash_pct = COALESCE((
    SELECT aca.ratio FROM "asset_class_allocations" aca
    JOIN "asset_classes" ac ON ac.id = aca.asset_class_id
    WHERE aca.asset_id = a.id AND ac.name = 'Cash' AND ac.user_id IS NULL
  ), 0);

-- Set other_pct to make the sum exactly 100
UPDATE "assets" SET
  other_pct = 100 - stock_pct - bond_pct - cash_pct;
--> statement-breakpoint

---------------------------------------------------------------------------
-- 3. Now safe to add NOT NULL + check constraint
---------------------------------------------------------------------------
ALTER TABLE "assets" ALTER COLUMN "stock_pct" SET NOT NULL;
ALTER TABLE "assets" ALTER COLUMN "bond_pct"  SET NOT NULL;
ALTER TABLE "assets" ALTER COLUMN "cash_pct"  SET NOT NULL;
ALTER TABLE "assets" ALTER COLUMN "other_pct" SET NOT NULL;
ALTER TABLE "assets" ADD CONSTRAINT "assets_type_pct_sum"
  CHECK (stock_pct + bond_pct + cash_pct + other_pct = 100);
--> statement-breakpoint

---------------------------------------------------------------------------
-- 4. Restructure allocation_targets (create new → insert pivot → drop old → rename)
---------------------------------------------------------------------------
CREATE TABLE "allocation_targets_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL,
  "stock_target_pct" numeric(5, 2) NOT NULL DEFAULT 0,
  "bond_target_pct"  numeric(5, 2) NOT NULL DEFAULT 0,
  "cash_target_pct"  numeric(5, 2) NOT NULL DEFAULT 0,
  "other_target_pct" numeric(5, 2) NOT NULL DEFAULT 0,
  "effective_date" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "targets_goal_date_unique" UNIQUE NULLS NOT DISTINCT ("goal_id", "effective_date"),
  CONSTRAINT "targets_type_pct_sum"
    CHECK (stock_target_pct + bond_target_pct + cash_target_pct + other_target_pct = 100)
);
ALTER TABLE "allocation_targets_new"
  ADD CONSTRAINT "allocation_targets_new_goal_id_goals_id_fk"
  FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- Pivot existing per-class target rows into the horizontal structure.
-- Groups by (goal_id, effective_date) and aggregates across the 3 named classes.
-- other_target_pct is set to make the sum = 100.
INSERT INTO "allocation_targets_new"
  (goal_id, effective_date, stock_target_pct, bond_target_pct, cash_target_pct, other_target_pct, created_at)
SELECT
  t.goal_id,
  t.effective_date,
  MAX(CASE WHEN ac.name = 'Stocks' THEN t.target_pct ELSE 0 END) AS stock_target_pct,
  MAX(CASE WHEN ac.name = 'Bonds'  THEN t.target_pct ELSE 0 END) AS bond_target_pct,
  MAX(CASE WHEN ac.name = 'Cash'   THEN t.target_pct ELSE 0 END) AS cash_target_pct,
  GREATEST(0,
    100
    - MAX(CASE WHEN ac.name = 'Stocks' THEN t.target_pct ELSE 0 END)
    - MAX(CASE WHEN ac.name = 'Bonds'  THEN t.target_pct ELSE 0 END)
    - MAX(CASE WHEN ac.name = 'Cash'   THEN t.target_pct ELSE 0 END)
  ) AS other_target_pct,
  MIN(t.created_at)
FROM "allocation_targets" t
JOIN "asset_classes" ac ON ac.id = t.asset_class_id
GROUP BY t.goal_id, t.effective_date;
--> statement-breakpoint

DROP TABLE "allocation_targets";
--> statement-breakpoint
ALTER TABLE "allocation_targets_new" RENAME TO "allocation_targets";
ALTER TABLE "allocation_targets" RENAME CONSTRAINT "allocation_targets_new_goal_id_goals_id_fk"
  TO "allocation_targets_goal_id_goals_id_fk";
--> statement-breakpoint

---------------------------------------------------------------------------
-- 5. Delete aggregate class allocation rows then the aggregate class records
---------------------------------------------------------------------------
DELETE FROM "asset_class_allocations"
  WHERE asset_class_id IN (
    SELECT id FROM "asset_classes"
    WHERE user_id IS NULL AND name IN ('Stocks', 'Bonds', 'Cash', 'Other')
  );
--> statement-breakpoint

DELETE FROM "asset_classes"
  WHERE user_id IS NULL AND name IN ('Stocks', 'Bonds', 'Cash', 'Other');
