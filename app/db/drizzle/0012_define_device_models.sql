ALTER TABLE "public"."device" ALTER COLUMN "model" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."model";--> statement-breakpoint
CREATE TYPE "public"."model" AS ENUM('homeV2Lora', 'homeV2Ethernet', 'homeV2Wifi', 'senseBox:Edu', 'luftdaten.info', 'Custom');--> statement-breakpoint
ALTER TABLE "public"."device" ALTER COLUMN "model" SET DATA TYPE "public"."model" USING "model"::"public"."model";