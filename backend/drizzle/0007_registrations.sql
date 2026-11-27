CREATE TYPE "public"."registration_status" AS ENUM('ACTIVE', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"ticket_type_id" uuid NOT NULL,
	"status" "registration_status" DEFAULT 'ACTIVE' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "registrations_user_id_idx" ON "registrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registrations_ticket_type_status_idx" ON "registrations" USING btree ("ticket_type_id","status");--> statement-breakpoint
CREATE INDEX "registrations_event_id_status_idx" ON "registrations" USING btree ("event_id","status");