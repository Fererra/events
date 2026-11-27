CREATE TYPE "public"."event_status" AS ENUM('IN_PLANNING', 'ACTIVE', 'FINISHED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"organizer" text NOT NULL,
	"venue_id" uuid NOT NULL,
	"status" "event_status" DEFAULT 'IN_PLANNING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_venue_id_idx" ON "events" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "events_status_ends_at_idx" ON "events" USING btree ("status","ends_at");