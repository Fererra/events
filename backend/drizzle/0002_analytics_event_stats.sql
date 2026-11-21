CREATE TABLE "event_stats" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"registrations_count" integer DEFAULT 0 NOT NULL,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"last_activity_at" timestamp with time zone
);
