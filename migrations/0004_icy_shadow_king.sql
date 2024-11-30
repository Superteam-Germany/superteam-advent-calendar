CREATE TABLE IF NOT EXISTS "mints" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"door_number" integer NOT NULL,
	"minted_at" timestamp DEFAULT now() NOT NULL,
	"nft_address" text NOT NULL,
	"is_eligible_for_raffle" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uniq_wallet_door" UNIQUE("wallet_address","door_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prize_winners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text,
	"door_number" integer,
	"prize_id" uuid,
	"claimed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"door_number" integer NOT NULL,
	"quantity" integer NOT NULL,
	"winner_message" text,
	"sponsor" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registrations" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"registration_date" timestamp DEFAULT now(),
	"registration_tx" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whitelist" (
	"wallet" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prize_winners" ADD CONSTRAINT "prize_winners_wallet_address_registrations_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."registrations"("wallet_address") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prize_winners" ADD CONSTRAINT "prize_winners_prize_id_prizes_id_fk" FOREIGN KEY ("prize_id") REFERENCES "public"."prizes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
