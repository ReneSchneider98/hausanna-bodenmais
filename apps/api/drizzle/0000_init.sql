CREATE TABLE "accommodations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"menu_label" text DEFAULT '' NOT NULL,
	"size_sqm" integer NOT NULL,
	"max_guests" integer NOT NULL,
	"beds" text DEFAULT '' NOT NULL,
	"teaser" text DEFAULT '' NOT NULL,
	"description_html" text DEFAULT '' NOT NULL,
	"amenity_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_image" jsonb,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"base_price_per_night" numeric(10, 2) NOT NULL,
	"base_guests" integer NOT NULL,
	"extra_guest_price_per_night" numeric(10, 2) DEFAULT 0 NOT NULL,
	"min_nights" integer DEFAULT 1 NOT NULL,
	"pets_allowed" boolean DEFAULT false NOT NULL,
	"price_note" text DEFAULT '' NOT NULL,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accommodations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "accommodations_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"accommodation_id" uuid NOT NULL,
	"arrival" date NOT NULL,
	"departure" date NOT NULL,
	"adults" integer DEFAULT 0 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"external_ref" text,
	"guest" jsonb,
	"note" text DEFAULT '' NOT NULL,
	"internal_note" text DEFAULT '' NOT NULL,
	"extras" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_price" numeric(10, 2),
	"channel_sync_state" text DEFAULT 'not_required' NOT NULL,
	"channel_sync_error" text,
	"channel_booking_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "channel_connections" (
	"accommodation_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"beds24_room_id" text,
	"ical_import_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ical_export_token" text DEFAULT replace(gen_random_uuid()::text, '-', '') NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"last_export_fetch_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"charge_type" text DEFAULT 'per_stay' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extras_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "season_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accommodation_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"price_per_night" numeric(10, 2) NOT NULL,
	"base_guests" integer NOT NULL,
	"extra_guest_price_per_night" numeric(10, 2) DEFAULT 0 NOT NULL,
	"min_nights" integer
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_accommodation_id_accommodations_id_fk" FOREIGN KEY ("accommodation_id") REFERENCES "public"."accommodations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_accommodation_id_accommodations_id_fk" FOREIGN KEY ("accommodation_id") REFERENCES "public"."accommodations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_prices" ADD CONSTRAINT "season_prices_accommodation_id_accommodations_id_fk" FOREIGN KEY ("accommodation_id") REFERENCES "public"."accommodations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_prices" ADD CONSTRAINT "season_prices_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_acc_dates" ON "bookings" USING btree ("accommodation_id","arrival","departure");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_source_external_ref" ON "bookings" USING btree ("source","external_ref") WHERE "bookings"."external_ref" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "season_prices_acc_season" ON "season_prices" USING btree ("accommodation_id","season_id");