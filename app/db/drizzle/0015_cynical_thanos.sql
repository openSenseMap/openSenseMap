-- DROP CONSTRAINTS
ALTER TABLE "device_to_location" DROP CONSTRAINT "device_to_location_location_id_location_id_fk";--> statement-breakpoint
ALTER TABLE "measurement" DROP CONSTRAINT "measurement_location_id_location_id_fk";--> statement-breakpoint

-- Add temporary bigserial/bigint columns
ALTER TABLE "device_to_location" ADD COLUMN "location_id_bigint" bigint;--> statement-breakpoint
ALTER TABLE "measurement" ADD COLUMN "location_id_bigint" bigint;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "id_bigserial" bigserial; --> statement-breakpoint

-- Copy old id values
UPDATE location SET id_bigserial = id; --> statement-breakpoint
UPDATE device_to_location SET location_id_bigint = location_id; --> statement-breakpoint
UPDATE measurement SET location_id_bigint = location_id; --> statement-breakpoint

-- Update last_value of sequence
SELECT setval('location_id_bigserial_seq', COALESCE(MAX(id), 1)) FROM location; --> statement-breakpoint

-- Drop old id column in location table
ALTER TABLE "location" DROP COLUMN IF EXISTS "id";--> statement-breakpoint
ALTER TABLE "location" ADD PRIMARY KEY ("id_bigserial");--> statement-breakpoint
ALTER TABLE "location" ALTER COLUMN "id_bigserial" SET NOT NULL;--> statement-breakpoint

-- Rename temporary bigserial id to id
ALTER TABLE "location" RENAME COLUMN "id_bigserial" TO "id";--> statement-breakpoint

-- (device_to_location) Drop old location_id and rename bigint location id
ALTER TABLE "device_to_location" DROP CONSTRAINT "device_to_location_device_id_location_id_time_pk";--> statement-breakpoint
ALTER TABLE "device_to_location" DROP COLUMN IF EXISTS "location_id";--> statement-breakpoint
ALTER TABLE "device_to_location" RENAME COLUMN "location_id_bigint" TO "location_id";--> statement-breakpoint
ALTER TABLE "device_to_location" ADD CONSTRAINT "device_to_location_device_id_location_id_time_pk" PRIMARY KEY("device_id","location_id","time");--> statement-breakpoint

-- (measurement) Drop old location_id and rename bigint location id
ALTER TABLE "measurement" DROP COLUMN IF EXISTS "location_id";--> statement-breakpoint
ALTER TABLE "measurement" RENAME COLUMN "location_id_bigint" TO "location_id";

-- Add foreign key constraint for device_to_location.location_id
ALTER TABLE "device_to_location" ADD CONSTRAINT "device_to_location_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location" ("id"); --> statement-breakpoint

-- Add foreign key constraint for measurement.location_id
ALTER TABLE "measurement"  ADD CONSTRAINT "measurement_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location" ("id");