ALTER TABLE "device_to_location" DROP CONSTRAINT "device_to_location_device_id_device_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_to_location" ADD CONSTRAINT "device_to_location_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
