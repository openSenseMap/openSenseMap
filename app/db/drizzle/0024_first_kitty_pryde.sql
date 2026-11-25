ALTER TYPE "public"."model" ADD VALUE 'homeEthernet' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'homeWifi' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'homeEthernetFeinstaub' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'homeWifiFeinstaub' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'luftdaten_sds011' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'luftdaten_sds011_dht11' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'luftdaten_sds011_dht22' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'luftdaten_sds011_bmp180' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'luftdaten_sds011_bme280' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TYPE "public"."model" ADD VALUE 'hackair_home_v2' BEFORE 'senseBox:Edu';--> statement-breakpoint
ALTER TABLE "sensor" ADD COLUMN "icon" text;