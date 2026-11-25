CREATE TABLE "integration" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"service_url" text NOT NULL,
	"service_key" text NOT NULL,
	"icon" text,
	"description" text,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "integration_slug_unique" UNIQUE("slug")
);
