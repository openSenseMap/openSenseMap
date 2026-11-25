CREATE TYPE "public"."theme_preference" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "theme_preference" "theme_preference" DEFAULT 'system' NOT NULL;