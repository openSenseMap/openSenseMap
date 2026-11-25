CREATE TABLE IF NOT EXISTS "device_to_location" (
	"device_id" text NOT NULL,
	"location_id" integer NOT NULL,
	"time" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_to_location_device_id_location_id_time_pk" PRIMARY KEY("device_id","location_id","time"),
	CONSTRAINT "device_to_location_device_id_location_id_time_unique" UNIQUE("device_id","location_id","time")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "location" (
	"id" serial PRIMARY KEY NOT NULL,
	"location" geometry(point) NOT NULL,
	CONSTRAINT "location_location_unique" UNIQUE("location")
);
--> statement-breakpoint
ALTER TABLE "measurement" ADD COLUMN "location_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_to_location" ADD CONSTRAINT "device_to_location_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_to_location" ADD CONSTRAINT "device_to_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "location_index" ON "location" USING gist ("location");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "measurement" ADD CONSTRAINT "measurement_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
