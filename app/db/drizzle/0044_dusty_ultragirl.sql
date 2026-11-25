ALTER TABLE "profile" ADD COLUMN "home_latitude" double precision;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "home_longitude" double precision;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "home_zoom" real DEFAULT 10;