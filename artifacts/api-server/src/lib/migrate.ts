import { pool } from "@workspace/db";
import { logger } from "./logger";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "bookmarks" ("id" serial PRIMARY KEY NOT NULL,"session_id" text NOT NULL,"slug" text NOT NULL,"api_name" text NOT NULL,"query_val" text NOT NULL,"label" text,"created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "broadcasts" ("id" serial PRIMARY KEY NOT NULL,"title" text NOT NULL,"message" text NOT NULL,"type" text DEFAULT 'info' NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "coupon_uses" ("id" serial PRIMARY KEY NOT NULL,"coupon_code" text NOT NULL,"session_id" text NOT NULL,"credits_awarded" integer NOT NULL,"used_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "coupons" ("id" serial PRIMARY KEY NOT NULL,"code" text NOT NULL,"description" text,"credits" integer DEFAULT 10 NOT NULL,"max_uses" integer DEFAULT 1 NOT NULL,"used_count" integer DEFAULT 0 NOT NULL,"expires_at" timestamp,"is_active" boolean DEFAULT true NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL,CONSTRAINT "coupons_code_unique" UNIQUE("code"));
CREATE TABLE IF NOT EXISTS "craka_referrals" ("id" serial PRIMARY KEY NOT NULL,"referrer_code" text NOT NULL,"referred_session_id" text NOT NULL,"credits_awarded" integer DEFAULT 10 NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "craka_users" ("id" serial PRIMARY KEY NOT NULL,"session_id" text NOT NULL,"referral_code" text NOT NULL,"referred_by" text,"is_premium" boolean DEFAULT false NOT NULL,"premium_plan" text,"premium_expires_at" timestamp,"credits_earned" integer DEFAULT 0 NOT NULL,"total_referrals" integer DEFAULT 0 NOT NULL,"google_id" text,"email" text,"display_name" text,"avatar_url" text,"email_verified" boolean DEFAULT false NOT NULL,"magic_link_token" text,"magic_link_expiry" timestamp,"password_hash" text,"password_reset_token" text,"password_reset_expiry" timestamp,"two_fa_secret" text,"two_fa_enabled" boolean DEFAULT false NOT NULL,"is_banned" boolean DEFAULT false NOT NULL,"ban_reason" text,"created_at" timestamp DEFAULT now() NOT NULL,CONSTRAINT "craka_users_session_id_unique" UNIQUE("session_id"),CONSTRAINT "craka_users_referral_code_unique" UNIQUE("referral_code"),CONSTRAINT "craka_users_google_id_unique" UNIQUE("google_id"));
CREATE TABLE IF NOT EXISTS "deleted_accounts" ("id" serial PRIMARY KEY NOT NULL,"email" text,"google_id" text,"deleted_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "login_logs" ("id" serial PRIMARY KEY NOT NULL,"session_id" text NOT NULL,"email" text,"ip_address" text,"user_agent" text,"status" text DEFAULT 'success' NOT NULL,"method" text DEFAULT 'google' NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "osint_apis" ("id" serial PRIMARY KEY NOT NULL,"slug" text NOT NULL,"name" text NOT NULL,"url" text NOT NULL,"command" text NOT NULL,"example" text NOT NULL,"pattern" text,"category" text DEFAULT 'Miscellaneous' NOT NULL,"credits" integer DEFAULT 1 NOT NULL,"cache_ttl_seconds" integer DEFAULT 1800 NOT NULL,"is_active" boolean DEFAULT true NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL,CONSTRAINT "osint_apis_slug_unique" UNIQUE("slug"));
CREATE TABLE IF NOT EXISTS "osint_cache" ("id" serial PRIMARY KEY NOT NULL,"slug" text NOT NULL,"query_val" text NOT NULL,"result" text NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "osint_history" ("id" serial PRIMARY KEY NOT NULL,"slug" text NOT NULL,"api_name" text NOT NULL,"query_val" text NOT NULL,"success" boolean DEFAULT true NOT NULL,"session_id" text,"created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "osint_token_transactions" ("id" serial PRIMARY KEY NOT NULL,"session_id" text NOT NULL,"type" text NOT NULL,"amount" integer NOT NULL,"reason" text NOT NULL,"balance_after" integer NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "scheduled_broadcasts" ("id" serial PRIMARY KEY NOT NULL,"title" text NOT NULL,"message" text NOT NULL,"type" text DEFAULT 'info' NOT NULL,"scheduled_at" timestamp NOT NULL,"sent" boolean DEFAULT false NOT NULL,"sent_at" timestamp,"created_at" timestamp DEFAULT now() NOT NULL);
`;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info("Running DB migrations...");
    const stmts = SCHEMA_SQL.split(";").map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      try {
        await client.query(stmt);
      } catch (err: any) {
        if (!err.message?.includes("already exists")) {
          logger.warn({ err: err.message }, "Migration stmt warn");
        }
      }
    }
    logger.info("DB migrations done");
  } finally {
    client.release();
  }
}
