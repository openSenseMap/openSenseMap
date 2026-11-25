ALTER TABLE "profile" RENAME COLUMN "username" TO "display_name";--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_username_unique";--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_name_unique" UNIQUE("name");