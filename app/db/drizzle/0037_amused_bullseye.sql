CREATE TABLE "tos_user_state" (
	"user_id" text NOT NULL,
	"tos_version_id" text NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "tos_user_state_user_id_tos_version_id_pk" PRIMARY KEY("user_id","tos_version_id")
);
--> statement-breakpoint
CREATE TABLE "tos_version" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"title" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"accept_by" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tos_version_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "action_token" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"purpose" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "action_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "password_reset_request" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "password_reset_request" CASCADE;--> statement-breakpoint
ALTER TABLE "password" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "accepted_tos_version_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "accepted_tos_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tos_user_state" ADD CONSTRAINT "tos_user_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tos_user_state" ADD CONSTRAINT "tos_user_state_tos_version_id_tos_version_id_fk" FOREIGN KEY ("tos_version_id") REFERENCES "public"."tos_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_token" ADD CONSTRAINT "action_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tos_user_state_user_idx" ON "tos_user_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tos_version_effective_from_idx" ON "tos_version" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "tos_version_accept_by_idx" ON "tos_version" USING btree ("accept_by");--> statement-breakpoint
CREATE UNIQUE INDEX "action_token_user_purpose_uq" ON "action_token" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "action_token_expires_at_idx" ON "action_token" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_accepted_tos_version_id_tos_version_id_fk" FOREIGN KEY ("accepted_tos_version_id") REFERENCES "public"."tos_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "email_confirmation_token";