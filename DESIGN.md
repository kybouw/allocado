# Allocado — Design Reference

## Intent

A personal portfolio management tool for goals-based asset allocation. The core problem: holdings are spread across multiple brokerage accounts (Roth IRA, 401k, HSA, taxable) serving different goals (Retirement, House, Car), making it impossible to see total allocation per-goal at a glance.

The app lets you group accounts under a goal, define target allocations per goal, enter holdings manually, and get an immediate read on drift from target — plus actionable rebalancing suggestions.

---

## User's Goals & Portfolios

| Goal | Accounts | Horizon | Character |
|------|----------|---------|-----------|
| Retirement | Roth IRA (VLXVX/VTWAX), Traditional 401k, HSA | 30+ yr | High equity, passive index |
| House Down Payment | Taxable brokerage | ~2028 | Conservative bonds/cash, glide to VUSXX |
| Car Replacement | Taxable brokerage | ~2031 | Mostly bonds (VGSH), small equity (VTI/VEA) |

Current house fund holdings: VTEB, VTEC, VGSH, VUSXX (~$53k).
Current car fund holdings: VTI, VEA, VTEB, VTEC, VGSH (~$4k).

---

## Data Schema

### Enums

```sql
account_type:   taxable | ira | roth_ira | 401k | hsa | other
asset_class_type: stock | bond | cash
```

### Tables

**`goals`** — top-level savings objectives
- `id`, `user_id`, `name`, `target_date` (nullable), `notes`, `created_at`

**`accounts`** — brokerage/investment accounts, each assigned to one goal
- `id`, `user_id`, `goal_id` → goals, `name`, `institution`, `account_type`, `notes`, `created_at`

**`asset_classes`** — categories like "US Stocks", "Short-Term Bonds", "Cash"
- `id`, `user_id` (null = system default), `name`, `type` (asset_class_type), `avg_duration_years` (for bond classes), `created_at`

**`assets`** — individual tickers (VTI, VGSH, VT, etc.)
- `id`, `user_id` (null = system default), `ticker`, `name`, `price`, `price_updated_at`, `avg_duration_years`, `created_at`

**`asset_class_allocations`** — how an asset maps to asset classes (must sum to 100% per asset)
- `id`, `asset_id` → assets, `asset_class_id` → asset_classes, `ratio` (0–100), `created_at`
- Example: VT → US Stocks 60%, Intl Stocks 40%
- Example: VTI → US Stocks 100%
- Example: VGSH → Short-Term Bonds 100%

**`holdings`** — what's actually held in each account (user-maintained)
- `id`, `account_id` → accounts, `asset_id` → assets, `shares` (nullable), `value` (authoritative dollar amount), `updated_at`, `created_at`
- Value is the source of truth. Shares are optional — useful when price is known so value can be calculated as shares × price in the future.

**`allocation_targets`** — target % per asset class per goal
- `id`, `goal_id` → goals, `asset_class_id` → asset_classes, `target_pct` (0–100), `effective_date` (null = always active; dated rows = glide path), `created_at`
- Active target = most recent `effective_date ≤ today`, or the null row if no dated rows exist.

### Key derivations

- **Goal total value** = SUM(holdings.value) across all accounts assigned to that goal
- **Current allocation %** = SUM(holdings.value × asset_class_allocations.ratio / 100) per asset class ÷ goal total
- **Drift** = current % − target %
- **Weighted avg bond duration** = SUM(holdings.value × assets.avg_duration_years) ÷ SUM(holdings.value for bond assets)

---

## Feature Roadmap

### Phase 1 — MVP (build this first)

- [ ] Schema migration (replace placeholder `accounts` table with full schema above)
- [ ] Seed system-default assets and asset classes (Vanguard ETFs the user already holds)
- [ ] Goals CRUD
- [ ] Accounts CRUD (assign to goal, set account type)
- [ ] Holdings entry — view holdings per account, add/edit shares + value
- [ ] Allocation targets — set target % per asset class per goal
- [ ] Dashboard — per-goal card showing: total value, current vs target allocation, drift

### Phase 2 — Analysis

- [ ] Rebalancing suggestions — "sell $X of VTEC in House fund, buy $X of VUSXX"
- [ ] Weighted average bond duration per goal vs time horizon
- [ ] Bond duration warning (duration > years to target date)
- [ ] Total portfolio value (across all goals)

### Phase 3 — Power features

- [ ] Glide path targets (dated allocation_targets rows, auto-advance)
- [ ] Price auto-fetch via Vanguard API (already have a working Python script for this)
- [ ] Tax-lot tracking (cost basis, STCG vs LTCG, harvest candidates)
- [ ] Tax-location suggestions (bonds in traditional, stocks in Roth)
- [ ] Brokerage sync integration (Plaid or direct)

---

## Domain Notes

**Bond duration matters.** For medium/short-term goals, weighted average bond duration should stay below the time horizon. The house fund targets ~2.3yr avg duration; the car fund ~4.9yr. The app should surface this prominently.

**Asset class tag system.** Because funds like VT hold multiple asset classes, allocation is computed by rolling up holdings through the `asset_class_allocations` ratio table. A holding of $1,000 of VT (60% US / 40% Intl) contributes $600 to US Stocks and $400 to Intl Stocks for its goal's allocation calculation.

**Value is authoritative.** Manual entry means shares may not always be known. `holdings.value` is always present; `holdings.shares` and `assets.price` are optional helpers for future automation.

**Tax profile (owner).** 22% federal, 9.3% CA state. Standard deduction. This informs tax-equivalent yield comparisons and tax-location advice. Treasury funds (VGSH, VUSXX) are CA state-tax-exempt; muni funds (VTEB, VTEC) are fed-tax-exempt; VTEC is both.

**System defaults.** Assets and asset classes with `user_id = NULL` are the shared library. Users can create their own. UI should show system defaults first when searching/adding holdings.
