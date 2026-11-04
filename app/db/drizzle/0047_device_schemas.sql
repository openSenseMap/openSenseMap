CREATE TYPE "public"."device_schema_version_status" AS ENUM('current', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."device_schema_visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TABLE "device_schema" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"owner_user_id" text NOT NULL,
	"visibility" "device_schema_visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_schema_version" (
	"id" text PRIMARY KEY NOT NULL,
	"device_schema_id" text NOT NULL,
	"version" text NOT NULL,
	"format_version" text NOT NULL,
	"content" jsonb NOT NULL,
	"hash" text NOT NULL,
	"status" "device_schema_version_status" DEFAULT 'current' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"deprecated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "device_schema_version_id" text;--> statement-breakpoint
ALTER TABLE "device_schema" ADD CONSTRAINT "device_schema_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "device_schema_version" ADD CONSTRAINT "device_schema_version_device_schema_id_device_schema_id_fk" FOREIGN KEY ("device_schema_id") REFERENCES "public"."device_schema"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "device_schema_version" ADD CONSTRAINT "device_schema_version_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_schema_owner_slug_unique" ON "device_schema" USING btree ("owner_user_id","slug");--> statement-breakpoint
CREATE INDEX "device_schema_visibility_idx" ON "device_schema" USING btree ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "device_schema_version_unique" ON "device_schema_version" USING btree ("device_schema_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "device_schema_version_hash_unique" ON "device_schema_version" USING btree ("device_schema_id","hash");--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_device_schema_version_id_device_schema_version_id_fk" FOREIGN KEY ("device_schema_version_id") REFERENCES "public"."device_schema_version"("id") ON DELETE set null ON UPDATE cascade;