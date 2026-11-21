CREATE TYPE "public"."receipt_decision" AS ENUM('ACCEPTED', 'REJECTED', 'ADJUSTED');--> statement-breakpoint
CREATE TYPE "public"."stock_requirement_status" AS ENUM('REQUESTED', 'PARTIALLY_APPROVED', 'APPROVED', 'REJECTED', 'DISPATCHED', 'RECEIVED', 'CANCELLED');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'HUB_MANAGER' BEFORE 'SHOP_USER';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'HUB_EMPLOYEE' BEFORE 'SHOP_USER';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'SHOP_MANAGER' BEFORE 'SHOP_USER';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'STOREKEEPER' BEFORE 'SHOP_USER';--> statement-breakpoint
ALTER TYPE "public"."transfer_status" ADD VALUE 'REQUESTED';--> statement-breakpoint
ALTER TYPE "public"."transfer_status" ADD VALUE 'APPROVED';--> statement-breakpoint
ALTER TYPE "public"."transfer_status" ADD VALUE 'REJECTED';--> statement-breakpoint
ALTER TYPE "public"."transfer_status" ADD VALUE 'DISPATCHED';--> statement-breakpoint
ALTER TYPE "public"."transfer_status" ADD VALUE 'RECEIVED';--> statement-breakpoint
ALTER TYPE "public"."transfer_status" ADD VALUE 'DISCREPANCY_REVIEW';--> statement-breakpoint
CREATE TABLE "stock_requirement_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requirement_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"requested_grams" bigint NOT NULL,
	"approved_grams" bigint,
	CONSTRAINT "stock_requirement_items_requested_positive" CHECK ("stock_requirement_items"."requested_grams" > 0),
	CONSTRAINT "stock_requirement_items_approved_nonnegative" CHECK ("stock_requirement_items"."approved_grams" is null or "stock_requirement_items"."approved_grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_requirements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"status" "stock_requirement_status" DEFAULT 'REQUESTED' NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"reviewed_by_user_id" uuid,
	"review_reason" varchar(500),
	"dispatched_transfer_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transfer_id" uuid NOT NULL,
	"decision" "receipt_decision" NOT NULL,
	"received_by_user_id" uuid NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"reason" varchar(500),
	"management_approved_by_user_id" uuid,
	"management_approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_receipts_transfer_id_unique" UNIQUE("transfer_id")
);
--> statement-breakpoint
ALTER TABLE "transfer_items" ADD COLUMN "dispatched_grams" bigint;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD COLUMN "received_grams" bigint;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD COLUMN "receipt_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "stock_requirement_items" ADD CONSTRAINT "stock_requirement_items_requirement_id_stock_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."stock_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requirement_items" ADD CONSTRAINT "stock_requirement_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requirements" ADD CONSTRAINT "stock_requirements_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requirements" ADD CONSTRAINT "stock_requirements_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requirements" ADD CONSTRAINT "stock_requirements_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requirements" ADD CONSTRAINT "stock_requirements_dispatched_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("dispatched_transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_receipts" ADD CONSTRAINT "transfer_receipts_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_receipts" ADD CONSTRAINT "transfer_receipts_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_receipts" ADD CONSTRAINT "transfer_receipts_management_approved_by_user_id_users_id_fk" FOREIGN KEY ("management_approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_requirement_items_requirement_product_unique" ON "stock_requirement_items" USING btree ("requirement_id","product_id");--> statement-breakpoint
CREATE INDEX "stock_requirements_shop_status_requested_index" ON "stock_requirements" USING btree ("shop_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "transfer_receipts_transfer_decision_index" ON "transfer_receipts" USING btree ("transfer_id","decision");