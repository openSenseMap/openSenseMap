CREATE TABLE IF NOT EXISTS "claim" (
	"id" text PRIMARY KEY NOT NULL,
	"box_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_box_id" UNIQUE("box_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claim" ADD CONSTRAINT "claim_box_id_device_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_expires_at_idx" ON "claim" USING btree ("expires_at");