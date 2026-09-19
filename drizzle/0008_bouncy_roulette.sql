-- KB-28
--   1. accounts.minimum_cash_balance — cash an account forces you to hold (HSA debit-card
--      floors and the like). Null means no requirement; 0 means an explicit zero.
--   2. Drop allocation_targets.other_target_pct. "Other" (gold, crypto, commodities) has no
--      position on a risk scale, so it is never targeted — it stays visible in holdings and
--      current allocation, but the app forms no opinion about how much of it you should own.

ALTER TABLE "allocation_targets" DROP CONSTRAINT "targets_type_pct_sum";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "minimum_cash_balance" numeric(14, 2);--> statement-breakpoint

-- Existing rows were backfilled by 0004 so that all four columns summed to 100, so any row
-- with other_target_pct > 0 has the remaining three summing to less than 100 and would fail
-- the new three-column check. Rescale stocks/bonds/cash proportionally back up to 100 first.
-- Cash takes the rounding remainder so the sum lands on exactly 100 at numeric(5,2).
-- A row targeting 100% "Other" carries no information to preserve: it becomes 100% cash,
-- the class that makes no claim about growth.
UPDATE "allocation_targets" AS t
SET
  "stock_target_pct" = s.stock,
  "bond_target_pct" = s.bond,
  "cash_target_pct" = 100 - s.stock - s.bond
FROM (
  SELECT
    x.id,
    CASE WHEN x.base = 0 THEN 0 ELSE round(x.stock_target_pct * 100 / x.base, 2) END AS stock,
    CASE WHEN x.base = 0 THEN 0 ELSE round(x.bond_target_pct * 100 / x.base, 2) END AS bond
  FROM (
    SELECT
      id,
      stock_target_pct,
      bond_target_pct,
      stock_target_pct + bond_target_pct + cash_target_pct AS base
    FROM "allocation_targets"
    WHERE other_target_pct <> 0
  ) x
) s
WHERE t.id = s.id;--> statement-breakpoint

ALTER TABLE "allocation_targets" DROP COLUMN "other_target_pct";--> statement-breakpoint
ALTER TABLE "allocation_targets" ADD CONSTRAINT "targets_type_pct_sum" CHECK ("allocation_targets"."stock_target_pct" + "allocation_targets"."bond_target_pct" + "allocation_targets"."cash_target_pct" = 100);
