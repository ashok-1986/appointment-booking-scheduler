CREATE TYPE "public"."booking_stage" AS ENUM('enquiry', 'in_consultation', 'qualified', 'not_a_fit', 'deposit_requested', 'deposit_pending', 'deposit_paid', 'scheduled', 'session_complete', 'paid_in_full', 'follow_up_sent', 'follow_up_completed');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('whatsapp', 'email');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'paid', 'failed', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('deposit', 'balance');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('artist', 'studio_admin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_recurring" boolean DEFAULT true NOT NULL,
	"exception_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"artist_id" text NOT NULL,
	"service_type" text NOT NULL,
	"design_description" text,
	"reference_images" jsonb DEFAULT '[]'::jsonb,
	"preferred_date_range_start" timestamp with time zone,
	"preferred_date_range_end" timestamp with time zone,
	"estimated_budget" bigint,
	"stage" "booking_stage" DEFAULT 'enquiry' NOT NULL,
	"deposit_amount" bigint,
	"deposit_percentage" integer DEFAULT 30,
	"deposit_paid_at" timestamp with time zone,
	"balance_amount" bigint,
	"balance_paid_at" timestamp with time zone,
	"session_date" timestamp with time zone,
	"session_duration" integer,
	"session_address" text,
	"preparation_instructions" text,
	"consent_signed_at" timestamp with time zone,
	"consent_form_id" text,
	"hubspot_deal_id" text,
	"consultation_notes" text,
	"rejection_reason" text,
	"completed_at" timestamp with time zone,
	"follow_up_sent_at" timestamp with time zone,
	"follow_up_completed_at" timestamp with time zone,
	"follow_up_rating" integer,
	"follow_up_feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_hubspot_deal_id_unique" UNIQUE("hubspot_deal_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"hubspot_contact_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"form_data" jsonb,
	"signed_data" jsonb,
	"signed_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"reminder_sent_at" timestamp with time zone,
	"reminder_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_forms_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"channel" "message_channel" NOT NULL,
	"direction" "message_direction" NOT NULL,
	"content" text NOT NULL,
	"template_name" text,
	"hubspot_timeline_event_id" text,
	"delivery_status" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"type" "payment_type" NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"provider_ref" text NOT NULL,
	"provider_payment_id" text,
	"payment_method" text,
	"paid_at" timestamp with time zone,
	"webhook_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_ref_unique" UNIQUE("provider_ref")
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_deposit_percentage" integer DEFAULT 30 NOT NULL,
	"default_duration_minutes" integer,
	"base_price" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_availability" ADD CONSTRAINT "artist_availability_artist_id_user_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_artist_id_user_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_forms" ADD CONSTRAINT "consent_forms_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artist_availability_artist_id_idx" ON "artist_availability" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "artist_availability_day_of_week_idx" ON "artist_availability" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "audit_logs_booking_id_idx" ON "audit_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bookings_client_id_idx" ON "bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "bookings_artist_id_idx" ON "bookings" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "bookings_stage_idx" ON "bookings" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "bookings_hubspot_deal_id_idx" ON "bookings" USING btree ("hubspot_deal_id");--> statement-breakpoint
CREATE INDEX "bookings_session_date_idx" ON "bookings" USING btree ("session_date");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_email_unique" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_phone_unique" ON "clients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "clients_hubspot_contact_id_idx" ON "clients" USING btree ("hubspot_contact_id");--> statement-breakpoint
CREATE INDEX "consent_forms_booking_id_idx" ON "consent_forms" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "consent_forms_signed_at_idx" ON "consent_forms" USING btree ("signed_at");--> statement-breakpoint
CREATE INDEX "messages_booking_id_idx" ON "messages" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_provider_ref_idx" ON "payments" USING btree ("provider_ref");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");