ALTER TABLE "location" DROP CONSTRAINT "location_location_unique";--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "height_above_ground" double precision;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_geometry_height_above_ground_unique" UNIQUE NULLS NOT DISTINCT("location","height_above_ground");
