CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" "user_role" DEFAULT 'artist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");