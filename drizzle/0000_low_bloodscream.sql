CREATE TYPE "public"."account_type" AS ENUM('taxable', 'ira', 'roth_ira', '401k', 'hsa', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_class_type" AS ENUM('stock', 'bond', 'cash');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"goal_id" uuid NOT NULL,
	"name" text NOT NULL,
	"institution" text,
	"account_type" "account_type" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allocation_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"asset_class_id" uuid NOT NULL,
	"target_pct" numeric(5, 2) NOT NULL,
	"effective_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "targets_goal_class_date_unique" UNIQUE NULLS NOT DISTINCT("goal_id","asset_class_id","effective_date"),
	CONSTRAINT "targets_pct_range" CHECK ("allocation_targets"."target_pct" >= 0 AND "allocation_targets"."target_pct" <= 100)
);
--> statement-breakpoint
CREATE TABLE "asset_class_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"asset_class_id" uuid NOT NULL,
	"ratio" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aca_asset_class_unique" UNIQUE("asset_id","asset_class_id"),
	CONSTRAINT "aca_ratio_range" CHECK ("asset_class_allocations"."ratio" >= 0 AND "asset_class_allocations"."ratio" <= 100)
);
--> statement-breakpoint
CREATE TABLE "asset_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"type" "asset_class_type" NOT NULL,
	"avg_duration_years" numeric(6, 3),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_classes_user_name_unique" UNIQUE NULLS NOT DISTINCT("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"ticker" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(19, 4),
	"price_updated_at" timestamp,
	"avg_duration_years" numeric(6, 3),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assets_user_ticker_unique" UNIQUE NULLS NOT DISTINCT("user_id","ticker")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"target_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"shares" numeric(18, 8),
	"value" numeric(19, 4) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "holdings_account_asset_unique" UNIQUE("account_id","asset_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_targets" ADD CONSTRAINT "allocation_targets_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_targets" ADD CONSTRAINT "allocation_targets_asset_class_id_asset_classes_id_fk" FOREIGN KEY ("asset_class_id") REFERENCES "public"."asset_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_class_allocations" ADD CONSTRAINT "asset_class_allocations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_class_allocations" ADD CONSTRAINT "asset_class_allocations_asset_class_id_asset_classes_id_fk" FOREIGN KEY ("asset_class_id") REFERENCES "public"."asset_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "accounts_goal_id_idx" ON "accounts" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_user_id_idx" ON "goals" USING btree ("user_id");