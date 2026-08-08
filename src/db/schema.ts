import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "taxable",
  "ira",
  "roth_ira",
  "401k",
  "hsa",
  "other",
]);

export const assetClassTypeEnum = pgEnum("asset_class_type", ["stock", "bond", "cash", "other"]);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    targetDate: date("target_date"),
    notes: text("notes"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("goals_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    institution: text("institution"),
    accountType: accountTypeEnum("account_type").notNull(),
    notes: text("notes"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("accounts_user_id_idx").on(t.userId), index("accounts_goal_id_idx").on(t.goalId)],
);

export const assetClasses = pgTable(
  "asset_classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    name: text("name").notNull(),
    type: assetClassTypeEnum("type").notNull(),
    avgDurationYears: numeric("avg_duration_years", { precision: 6, scale: 3 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("asset_classes_user_name_unique").on(t.userId, t.name).nullsNotDistinct()],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    ticker: text("ticker").notNull(),
    name: text("name").notNull(),
    price: numeric("price", { precision: 19, scale: 4 }),
    priceUpdatedAt: timestamp("price_updated_at"),
    avgDurationYears: numeric("avg_duration_years", { precision: 6, scale: 3 }),
    stockPct: numeric("stock_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    bondPct: numeric("bond_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    cashPct: numeric("cash_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    otherPct: numeric("other_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("assets_user_ticker_unique").on(t.userId, t.ticker).nullsNotDistinct(),
    check(
      "assets_type_pct_sum",
      sql`${t.stockPct} + ${t.bondPct} + ${t.cashPct} + ${t.otherPct} = 100`,
    ),
  ],
);

export const assetClassAllocations = pgTable(
  "asset_class_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    assetClassId: uuid("asset_class_id")
      .notNull()
      .references(() => assetClasses.id, { onDelete: "restrict" }),
    ratio: numeric("ratio", { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("aca_asset_class_unique").on(t.assetId, t.assetClassId),
    check("aca_ratio_range", sql`${t.ratio} >= 0 AND ${t.ratio} <= 100`),
  ],
);

export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    value: numeric("value", { precision: 19, scale: 4 }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("holdings_account_asset_unique").on(t.accountId, t.assetId)],
);

export const allocationTargets = pgTable(
  "allocation_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    stockTargetPct: numeric("stock_target_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    bondTargetPct: numeric("bond_target_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    cashTargetPct: numeric("cash_target_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    otherTargetPct: numeric("other_target_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    effectiveDate: date("effective_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("targets_goal_date_unique").on(t.goalId, t.effectiveDate).nullsNotDistinct(),
    check(
      "targets_type_pct_sum",
      sql`${t.stockTargetPct} + ${t.bondTargetPct} + ${t.cashTargetPct} + ${t.otherTargetPct} = 100`,
    ),
  ],
);

export const plaidItemStatusEnum = pgEnum("plaid_item_status", ["ok", "login_required", "error"]);

export const plaidItems = pgTable(
  "plaid_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    plaidItemId: text("plaid_item_id").notNull(),
    // Stored plaintext: read-only investments token for a personal app. If this goes
    // multi-user, encrypt at rest (AES-256-GCM keyed by an env secret) in src/lib/plaid.ts.
    accessToken: text("access_token").notNull(),
    institutionId: text("institution_id"),
    institutionName: text("institution_name"),
    status: plaidItemStatusEnum("status").notNull().default("ok"),
    lastErrorCode: text("last_error_code"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("plaid_items_user_id_idx").on(t.userId),
    unique("plaid_items_item_unique").on(t.plaidItemId),
  ],
);

export const plaidAccounts = pgTable(
  "plaid_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => plaidItems.id, { onDelete: "cascade" }),
    plaidAccountId: text("plaid_account_id").notNull(),
    name: text("name").notNull(),
    mask: text("mask"),
    plaidType: text("plaid_type"),
    plaidSubtype: text("plaid_subtype"),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("plaid_accounts_plaid_id_unique").on(t.plaidAccountId),
    unique("plaid_accounts_account_unique").on(t.accountId),
  ],
);

export const plaidSecurities = pgTable(
  "plaid_securities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    plaidSecurityId: text("plaid_security_id").notNull(),
    ticker: text("ticker"),
    name: text("name"),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("plaid_securities_user_id_idx").on(t.userId),
    unique("plaid_securities_user_sec_unique").on(t.userId, t.plaidSecurityId),
  ],
);

export const plaidHoldings = pgTable(
  "plaid_holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plaidAccountId: uuid("plaid_account_id")
      .notNull()
      .references(() => plaidAccounts.id, { onDelete: "cascade" }),
    plaidSecurityId: uuid("plaid_security_id")
      .notNull()
      .references(() => plaidSecurities.id, { onDelete: "cascade" }),
    institutionValue: numeric("institution_value", { precision: 19, scale: 4 }).notNull(),
    institutionPrice: numeric("institution_price", { precision: 19, scale: 4 }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("plaid_holdings_account_sec_unique").on(t.plaidAccountId, t.plaidSecurityId)],
);

export const goalsRelations = relations(goals, ({ many }) => ({
  accounts: many(accounts),
  targets: many(allocationTargets),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  goal: one(goals, { fields: [accounts.goalId], references: [goals.id] }),
  holdings: many(holdings),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  classAllocations: many(assetClassAllocations),
  holdings: many(holdings),
}));

export const assetClassesRelations = relations(assetClasses, ({ many }) => ({
  assetAllocations: many(assetClassAllocations),
}));

export const assetClassAllocationsRelations = relations(assetClassAllocations, ({ one }) => ({
  asset: one(assets, { fields: [assetClassAllocations.assetId], references: [assets.id] }),
  assetClass: one(assetClasses, {
    fields: [assetClassAllocations.assetClassId],
    references: [assetClasses.id],
  }),
}));

export const holdingsRelations = relations(holdings, ({ one }) => ({
  account: one(accounts, { fields: [holdings.accountId], references: [accounts.id] }),
  asset: one(assets, { fields: [holdings.assetId], references: [assets.id] }),
}));

export const allocationTargetsRelations = relations(allocationTargets, ({ one }) => ({
  goal: one(goals, { fields: [allocationTargets.goalId], references: [goals.id] }),
}));

export const plaidItemsRelations = relations(plaidItems, ({ many }) => ({
  plaidAccounts: many(plaidAccounts),
}));

export const plaidAccountsRelations = relations(plaidAccounts, ({ one, many }) => ({
  item: one(plaidItems, { fields: [plaidAccounts.itemId], references: [plaidItems.id] }),
  account: one(accounts, { fields: [plaidAccounts.accountId], references: [accounts.id] }),
  plaidHoldings: many(plaidHoldings),
}));

export const plaidSecuritiesRelations = relations(plaidSecurities, ({ one, many }) => ({
  asset: one(assets, { fields: [plaidSecurities.assetId], references: [assets.id] }),
  plaidHoldings: many(plaidHoldings),
}));

export const plaidHoldingsRelations = relations(plaidHoldings, ({ one }) => ({
  plaidAccount: one(plaidAccounts, {
    fields: [plaidHoldings.plaidAccountId],
    references: [plaidAccounts.id],
  }),
  security: one(plaidSecurities, {
    fields: [plaidHoldings.plaidSecurityId],
    references: [plaidSecurities.id],
  }),
}));
