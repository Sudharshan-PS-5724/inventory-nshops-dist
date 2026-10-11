CREATE TYPE "public"."location_type" AS ENUM('CENTRAL', 'SHOP');--> statement-breakpoint
CREATE TYPE "public"."machine_event_status" AS ENUM('PENDING_REVIEW', 'ACCEPTED', 'QUARANTINED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('PURCHASE_RECEIPT', 'TRANSFER_OUT', 'TRANSFER_IN', 'NORMAL_SALE', 'RECOVERY_SALE', 'WASTAGE', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'SHOP_USER');--> statement-breakpoint
CREATE TABLE "inventory_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"location_type" "location_type" NOT NULL,
	"shop_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_locations_type_shop_consistency" CHECK (("inventory_locations"."location_type" = 'CENTRAL' AND "inventory_locations"."shop_id" IS NULL) OR ("inventory_locations"."location_type" = 'SHOP' AND "inventory_locations"."shop_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"movement_type" "movement_type" NOT NULL,
	"quantity_grams" bigint NOT NULL,
	"source_type" varchar(64) NOT NULL,
	"source_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_nonzero" CHECK ("inventory_movements"."quantity_grams" <> 0)
);
--> statement-breakpoint
CREATE TABLE "opening_stock_lines" (
	"submission_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_grams" bigint NOT NULL,
	CONSTRAINT "opening_stock_lines_submission_id_product_id_pk" PRIMARY KEY("submission_id","product_id"),
	CONSTRAINT "opening_stock_lines_nonnegative" CHECK ("opening_stock_lines"."quantity_grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "opening_stock_submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"location_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"paise_per_kg" bigint NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"changed_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_prices_positive_price" CHECK ("product_prices"."paise_per_kg" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"product_code" varchar(64) NOT NULL,
	"recovery_basis_points" bigint NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_product_code_unique" UNIQUE("product_code")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"role" "role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_stock_lines" ADD CONSTRAINT "opening_stock_lines_submission_id_opening_stock_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."opening_stock_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_stock_lines" ADD CONSTRAINT "opening_stock_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_stock_submissions" ADD CONSTRAINT "opening_stock_submissions_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_stock_submissions" ADD CONSTRAINT "opening_stock_submissions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_locations_shop_unique" ON "inventory_locations" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_movements_source_location_unique" ON "inventory_movements" USING btree ("source_type","source_id","location_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_availability_index" ON "inventory_movements" USING btree ("location_id","product_id","business_date","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "opening_stock_location_date_unique" ON "opening_stock_submissions" USING btree ("location_id","business_date");--> statement-breakpoint
CREATE INDEX "product_prices_product_effective_from_index" ON "product_prices" USING btree ("product_id","effective_from");