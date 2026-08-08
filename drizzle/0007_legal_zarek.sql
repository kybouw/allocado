CREATE TABLE "plaid_account_securities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_account_id" uuid NOT NULL,
	"plaid_security_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_account_securities_unique" UNIQUE("plaid_account_id","plaid_security_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_securities" DROP CONSTRAINT "plaid_securities_asset_id_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "plaid_account_securities" ADD CONSTRAINT "plaid_account_securities_plaid_account_id_plaid_accounts_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_account_securities" ADD CONSTRAINT "plaid_account_securities_plaid_security_id_plaid_securities_id_fk" FOREIGN KEY ("plaid_security_id") REFERENCES "public"."plaid_securities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_account_securities" ADD CONSTRAINT "plaid_account_securities_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_securities" DROP COLUMN "asset_id";