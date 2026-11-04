CREATE TABLE "elevation_consent" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"consent_version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "height_above_ground" double precision;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "terrain_elevation" double precision;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "terrain_elevation_dataset" text;--> statement-breakpoint
ALTER TABLE "elevation_consent" ADD CONSTRAINT "elevation_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "elevation_consent_user_idx" ON "elevation_consent" USING btree ("user_id");