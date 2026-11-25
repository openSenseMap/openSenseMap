ALTER TABLE "access_token" RENAME TO "device_api_key";--> statement-breakpoint
ALTER TABLE "device_api_key" RENAME COLUMN "token" TO "api_key";--> statement-breakpoint
ALTER TABLE "device_api_key" DROP CONSTRAINT "access_token_device_id_device_id_fk";
--> statement-breakpoint
ALTER TABLE "device_api_key" ADD CONSTRAINT "device_api_key_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;