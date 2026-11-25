CREATE TABLE IF NOT EXISTS "log_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"device_id" text NOT NULL
);
