ALTER TABLE "device" RENAME COLUMN "sensorWikiModel" TO "sensor_wiki_model";--> statement-breakpoint
ALTER TABLE "sensor" RENAME COLUMN "sensorWikiType" TO "sensor_wiki_type";--> statement-breakpoint
ALTER TABLE "sensor" RENAME COLUMN "sensorWikiPhenomenon" TO "sensor_wiki_phenomenon";--> statement-breakpoint
ALTER TABLE "sensor" RENAME COLUMN "sensorWikiUnit" TO "sensor_wiki_unit";