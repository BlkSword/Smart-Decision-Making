CREATE TABLE "player_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"unlocked_count" integer DEFAULT 0 NOT NULL,
	"badges" json DEFAULT '[]'::json,
	"titles" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unlocked_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"achievement_id" varchar(100) NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocked_achievements" ADD CONSTRAINT "unlocked_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;