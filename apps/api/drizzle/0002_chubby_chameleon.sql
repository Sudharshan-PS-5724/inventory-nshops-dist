CREATE TABLE "user_shop_assignments" (
	"user_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	CONSTRAINT "user_shop_assignments_user_id_shop_id_pk" PRIMARY KEY("user_id","shop_id")
);
--> statement-breakpoint
ALTER TABLE "user_shop_assignments" ADD CONSTRAINT "user_shop_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shop_assignments" ADD CONSTRAINT "user_shop_assignments_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shop_assignments" ADD CONSTRAINT "user_shop_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_single_administrator_unique" ON "users" USING btree ("role") WHERE "users"."role" = 'ADMIN';