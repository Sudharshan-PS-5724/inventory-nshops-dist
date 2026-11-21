CREATE TYPE "public"."product_stock_class" AS ENUM('FRESH', 'DISCOUNTED');--> statement-breakpoint
ALTER TYPE "public"."movement_type" ADD VALUE 'RECLASSIFICATION_OUT';--> statement-breakpoint
ALTER TYPE "public"."movement_type" ADD VALUE 'RECLASSIFICATION_IN';--> statement-breakpoint
CREATE TABLE "wastage_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"wastage_record_id" uuid NOT NULL,
	"object_key" varchar(512) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"byte_size" bigint NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wastage_evidence_wastage_record_id_unique" UNIQUE("wastage_record_id"),
	CONSTRAINT "wastage_evidence_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "wastage_evidence_positive_byte_size" CHECK ("wastage_evidence"."byte_size" > 0),
	CONSTRAINT "wastage_evidence_sha256_hex" CHECK ("wastage_evidence"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_class" "product_stock_class" DEFAULT 'FRESH' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fresh_product_id" uuid;--> statement-breakpoint
ALTER TABLE "wastage_evidence" ADD CONSTRAINT "wastage_evidence_wastage_record_id_wastage_records_id_fk" FOREIGN KEY ("wastage_record_id") REFERENCES "public"."wastage_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wastage_evidence" ADD CONSTRAINT "wastage_evidence_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_fresh_product_id_products_id_fk" FOREIGN KEY ("fresh_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;