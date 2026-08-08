CREATE TYPE "public"."plaid_item_status" AS ENUM('ok', 'login_required', 'error');--> statement-breakpoint
CREATE TABLE "plaid_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"plaid_account_id" text NOT NULL,
	"name" text NOT NULL,
	"mask" text,
	"plaid_type" text,
	"plaid_subtype" text,
	"account_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_accounts_plaid_id_unique" UNIQUE("plaid_account_id"),
	CONSTRAINT "plaid_accounts_account_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "plaid_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_account_id" uuid NOT NULL,
	"plaid_security_id" uuid NOT NULL,
	"institution_value" numeric(19, 4) NOT NULL,
	"institution_price" numeric(19, 4),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_holdings_account_sec_unique" UNIQUE("plaid_account_id","plaid_security_id")
);
--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plaid_item_id" text NOT NULL,
	"access_token" text NOT NULL,
	"institution_id" text,
	"institution_name" text,
	"status" "plaid_item_status" DEFAULT 'ok' NOT NULL,
	"last_error_code" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_items_item_unique" UNIQUE("plaid_item_id")
);
--> statement-breakpoint
CREATE TABLE "plaid_securities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plaid_security_id" text NOT NULL,
	"ticker" text,
	"name" text,
	"asset_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_securities_user_sec_unique" UNIQUE("user_id","plaid_security_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_item_id_plaid_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."plaid_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_holdings" ADD CONSTRAINT "plaid_holdings_plaid_account_id_plaid_accounts_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_holdings" ADD CONSTRAINT "plaid_holdings_plaid_security_id_plaid_securities_id_fk" FOREIGN KEY ("plaid_security_id") REFERENCES "public"."plaid_securities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_securities" ADD CONSTRAINT "plaid_securities_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plaid_items_user_id_idx" ON "plaid_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_securities_user_id_idx" ON "plaid_securities" USING btree ("user_id");