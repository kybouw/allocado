# Allocado — Design Reference

## Intent

A personal portfolio management tool for goals-based asset allocation. The core problem: holdings are spread across multiple brokerage accounts (Roth IRA, 401k, HSA, taxable) serving different goals, making it impossible to see total allocation per-goal at a glance.

The app lets you group accounts under a goal, define target allocations per goal, enter holdings manually, and get an immediate read on drift from target — plus actionable rebalancing suggestions.

---

## Data Schema

### Enums

```sql
account_type:     taxable | ira | roth_ira | 401k | hsa | other
asset_class_type: stock | bond | cash | other
```

### Tables

**`goals`** — top-level savings objectives
- `id`, `user_id`, `name`, `target_date` (nullable), `notes`, `sort_order`, `created_at`

**`accounts`** — brokerage/investment accounts, each assigned to one goal
- `id`, `user_id`, `goal_id` → goals, `name`, `institution`, `account_type`, `notes`, `created_at`

**`asset_classes`** — categories like "US Stocks", "Short-Term Bonds", "Cash"
- `id`, `user_id` (null = system default), `name`, `type` (asset_class_type), `avg_duration_years` (for bond classes), `created_at`

**`assets`** — individual tickers (VTI, VGSH, VT, etc.)
- `id`, `user_id` (null = system default), `ticker`, `name`, `price`, `price_updated_at`, `avg_duration_years`, `notes`, `created_at`

**`asset_class_allocations`** — how an asset maps to asset classes
- `id`, `asset_id` → assets, `asset_class_id` → asset_classes, `ratio` (0–100), `created_at`
- Assets are tagged with multiple classes across independent dimensions.
- Example: a global stock ETF might be tagged `US Stocks 60%` + `Foreign Stocks 40%` (region dimension) and `Large-Cap 85%` + `Mid-Cap 15%` (cap dimension).
- There are four aggregate classes used for dashboard display and goal targets: **Stocks**, **Bonds**, **Cash**, **Other**. Every asset should have one aggregate-level tag so it rolls up correctly.

**`holdings`** — what's actually held in each account (user-maintained)
- `id`, `account_id` → accounts, `asset_id` → assets, `shares` (nullable), `value` (authoritative dollar amount), `updated_at`, `created_at`
- `value` is the source of truth. `shares` is optional — useful when price is known.

**`allocation_targets`** — target % per asset class per goal
- `id`, `goal_id` → goals, `asset_class_id` → asset_classes, `target_pct` (0–100), `effective_date` (null = always active; dated rows = glide path), `created_at`
- Active target = most recent `effective_date ≤ today`, or the null row if no dated rows exist.
- Targets are set at the **aggregate level only** (Stocks / Bonds / Cash). "Other" never has a target — it is informational only.

### Key derivations

- **Goal total value** = SUM(holdings.value) across all accounts assigned to that goal
- **Current allocation %** = SUM(holdings.value × asset_class_allocations.ratio / 100) per asset class ÷ goal total
- **Drift** = current % − target %
- **Weighted avg bond duration** = SUM(holdings.value × assets.avg_duration_years) ÷ SUM(holdings.value for bond-tagged assets)

---

## Feature Roadmap

### Phase 1 — MVP ✓

- [x] Schema + migrations
- [x] Seed system-default asset library (common ETFs and mutual funds)
- [x] Goals CRUD with drag-to-reorder
- [x] Accounts CRUD (assign to goal, set account type)
- [x] Holdings entry — add/edit shares + value per account
- [x] Allocation targets — set Stocks/Bonds/Cash target % per goal
- [x] Dashboard — per-goal card: total value, stacked allocation bar (current vs target), drift table
- [x] Asset management — add custom assets, assign class allocations

### Phase 2 — Analysis

- [ ] Rebalancing suggestions — "sell $X of Y in Z fund, buy $X of W"
- [ ] Weighted average bond duration per goal vs time horizon
- [ ] Bond duration warning when duration exceeds years to target date

### Phase 3 — Power features

- [ ] Glide path targets (dated `allocation_targets` rows, auto-advance over time)
- [ ] Price auto-fetch via brokerage/market data API
- [ ] Tax-lot tracking (cost basis, STCG vs LTCG, harvest candidates)
- [ ] Tax-location suggestions (e.g., hold bonds in tax-deferred, stocks in Roth)
- [ ] Brokerage sync (Plaid or direct API)

---

## Domain Notes

**Bond duration.** For medium/short-term goals, weighted average bond duration should stay below the time horizon. The app surfaces this on the dashboard per-goal.

**Multi-class assets.** Funds can hold multiple asset classes. Allocation is computed by rolling holdings through the `asset_class_allocations` ratio table. Tags across independent dimensions (region, cap size, duration, tax treatment) do not need to sum to 100% collectively — only within a single dimension.

**Aggregate vs granular classes.** Goal targets and dashboard display use only four aggregate classes (Stocks, Bonds, Cash, Other). Granular classes (US Stocks, Large-Cap, Short-Term Bonds, etc.) are available for future per-class analysis but are not surfaced in the MVP dashboard.

**"Other" class.** Covers assets that are not stocks, bonds, or cash equivalents (e.g., crypto, gold, commodities). Never has a target allocation. Shown on the dashboard only when current exposure > 0.

**System defaults.** Assets and asset classes with `user_id = NULL` are the shared library. Users can create their own. UI shows system defaults first when adding holdings.

**Value is authoritative.** `holdings.value` is always required. `shares` + `assets.price` are optional and intended for future automation (auto-calculated value from share count × price).
