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
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("assets_user_ticker_unique").on(t.userId, t.ticker).nullsNotDistinct()],
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
    shares: numeric("shares", { precision: 18, scale: 8 }),
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
    assetClassId: uuid("asset_class_id")
      .notNull()
      .references(() => assetClasses.id, { onDelete: "restrict" }),
    targetPct: numeric("target_pct", { precision: 5, scale: 2 }).notNull(),
    effectiveDate: date("effective_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("targets_goal_class_date_unique")
      .on(t.goalId, t.assetClassId, t.effectiveDate)
      .nullsNotDistinct(),
    check("targets_pct_range", sql`${t.targetPct} >= 0 AND ${t.targetPct} <= 100`),
  ],
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
  targets: many(allocationTargets),
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
  assetClass: one(assetClasses, {
    fields: [allocationTargets.assetClassId],
    references: [assetClasses.id],
  }),
}));
