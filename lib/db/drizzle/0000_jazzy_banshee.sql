CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"slug" text NOT NULL,
	"api_name" text NOT NULL,
	"query_val" text NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_uses" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_code" text NOT NULL,
	"session_id" text NOT NULL,
	"credits_awarded" integer NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"credits" integer DEFAULT 10 NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "craka_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_code" text NOT NULL,
	"referred_session_id" text NOT NULL,
	"credits_awarded" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "craka_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by" text,
	"is_premium" boolean DEFAULT false NOT NULL,
	"premium_plan" text,
	"premium_expires_at" timestamp,
	"credits_earned" integer DEFAULT 0 NOT NULL,
	"total_referrals" integer DEFAULT 0 NOT NULL,
	"google_id" text,
	"email" text,
	"display_name" text,
	"avatar_url" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"magic_link_token" text,
	"magic_link_expiry" timestamp,
	"password_hash" text,
	"password_reset_token" text,
	"password_reset_expiry" timestamp,
	"two_fa_secret" text,
	"two_fa_enabled" boolean DEFAULT false NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "craka_users_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "craka_users_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "craka_users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "deleted_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"google_id" text,
	"deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"email" text,
	"ip_address" text,
	"user_agent" text,
	"status" text DEFAULT 'success' NOT NULL,
	"method" text DEFAULT 'google' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "osint_apis" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"command" text NOT NULL,
	"example" text NOT NULL,
	"pattern" text,
	"category" text DEFAULT 'Miscellaneous' NOT NULL,
	"credits" integer DEFAULT 1 NOT NULL,
	"cache_ttl_seconds" integer DEFAULT 1800 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "osint_apis_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "osint_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"query_val" text NOT NULL,
	"result" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "osint_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"api_name" text NOT NULL,
	"query_val" text NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "osint_token_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"balance_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
