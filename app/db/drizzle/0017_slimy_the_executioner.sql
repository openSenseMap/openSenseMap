CREATE TABLE IF NOT EXISTS "token_revocation" (
	"hash" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
