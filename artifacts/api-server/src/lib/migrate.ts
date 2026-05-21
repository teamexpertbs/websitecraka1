import { execSync } from "child_process";
import path from "path";
import { existsSync } from "fs";
import { pool } from "@workspace/db";
import { logger } from "./logger";

// ── Walk up from cwd to find the monorepo root (has pnpm-workspace.yaml) ──────
function findWorkspaceRoot(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// ── Primary: drizzle-kit push --force (fully auto-syncs schema to DB) ─────────
async function pushSchema(root: string): Promise<boolean> {
  try {
    const result = execSync("pnpm --filter @workspace/db run push-force", {
      cwd: root,
      env: { ...process.env },
      stdio: "pipe",
      timeout: 60_000,
    });
    logger.info("DB schema auto-synced via drizzle-kit push");
    return true;
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? "";
    logger.warn({ msg: stderr.slice(0, 200) }, "drizzle-kit push failed — falling back to SQL");
    return false;
  }
}

// ── Fallback: raw SQL for tables + missing columns ────────────────────────────
// Each entry: [tableName, columnName, columnDef]
// Safe to run every startup — IF NOT EXISTS is idempotent.
const TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS "bookmarks" ("id" serial PRIMARY KEY NOT NULL,"session_id" text NOT NULL,"slug" text NOT NULL,"api_name" text NOT NULL,"query_val" text NOT NULL,"label" text,"created_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "broadcasts" ("id" serial PRIMARY KEY NOT NULL,"title" text NOT NULL,"message" text NOT NULL,"type" text DEFAULT 'info' NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "coupon_uses" ("id" serial PRIMARY KEY NOT NULL,"coupon_code" text NOT NULL,"session_id" text NOT NULL,"credits_awarded" integer NOT NULL,"used_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "coupons" ("id" serial PRIMARY KEY NOT NULL,"code" text NOT NULL,"description" text,"credits" integer DEFAULT 10 NOT NULL,"max_uses" integer DEFAULT 1 NOT NULL,"used_count" integer DEFAULT 0 NOT NULL,"expires_at" timestamp,"is_active" boolean DEFAULT true NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL,CONSTRAINT "coupons_code_unique" UNIQUE("code"))`,
  `CREATE TABLE IF NOT EXISTS "craka_referrals" ("id" serial PRIMARY KEY NOT NULL,"referrer_code" text NOT NULL,"referred_session_id" text NOT NULL,"credits_awarded" integer DEFAULT 10 NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "craka_users" ("id" serial PRIMARY KEY NOT NULL,"session_id" text NOT NULL,"referral_code" text NOT NULL,"referred_by" text,"is_premium" boolean DEFAULT false NOT NULL,"premium_plan" text,"premium_expires_at" timestamp,"credits_earned" integer DEFAULT 0 NOT NULL,"total_referrals" integer DEFAULT 0 NOT NULL,"google_id" text,"email" text,"display_name" text,"avatar_url" text,"email_verified" boolean DEFAULT false NOT NULL,"magic_link_token" text,"magic_link_expiry" timestamp,"password_hash" text,"password_reset_token" text,"password_reset_expiry" timestamp,"two_fa_secret" text,"two_fa_enabled" boolean DEFAULT false NOT NULL,"is_banned" boolean DEFAULT false NOT NULL,"ban_reason" text,"created_at" timestamp DEFAULT now() NOT NULL,CONSTRAINT "craka_users_session_id_unique" UNIQUE("session_id"),CONSTRAINT "craka_users_referral_code_unique" UNIQUE("referral_code"),CONSTRAINT "craka_users_google_id_unique" UNIQUE("google_id"))`,
  `CREATE TABLE IF NOT EXISTS "deleted_accounts" ("id" serial PRIMARY KEY NOT NULL,"email" text,"google_id" text,"deleted_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "login_logs" ("id" serial PRIMARY KEY NOT NULL,"session_id" text NOT NULL,"email" text,"ip_address" text,"user_agent" text,"status" text DEFAULT 'success' NOT NULL,"method" text DEFAULT 'google' NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "osint_apis" ("id" serial PRIMARY KEY NOT NULL,"slug" text NOT NULL,"name" text NOT NULL,"url" text NOT NULL,"command" text NOT NULL,"example" text NOT NULL,"pattern" text,"category" text DEFAULT 'Miscellaneous' NOT NULL,"credits" integer DEFAULT 1 NOT NULL,"cache_ttl_seconds" integer DEFAULT 1800 NOT NULL,"is_active" boolean DEFAULT true NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL,CONSTRAINT "osint_apis_slug_unique" UNIQUE("slug"))`,
  `CREATE TABLE IF NOT EXISTS "osint_cache" ("id" serial PRIMARY KEY NOT NULL,"slug" text NOT NULL,"query_val" text NOT NULL,"result" text NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "osint_history" ("id" serial PRIMARY KEY NOT NULL,"slug" text NOT NULL,"api_name" text NOT NULL,"query_val" text NOT NULL,"success" boolean DEFAULT true NOT NULL,"session_id" text,"created_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "osint_token_transactions" ("id" serial PRIMARY KEY NOT NULL,"session_id" text NOT NULL,"type" text NOT NULL,"amount" integer NOT NULL,"reason" text NOT NULL,"balance_after" integer NOT NULL,"created_at" timestamp DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "scheduled_broadcasts" ("id" serial PRIMARY KEY NOT NULL,"title" text NOT NULL,"message" text NOT NULL,"type" text DEFAULT 'info' NOT NULL,"scheduled_at" timestamp NOT NULL,"sent" boolean DEFAULT false NOT NULL,"sent_at" timestamp,"created_at" timestamp DEFAULT now() NOT NULL)`,
];

// ALTER TABLE ADD COLUMN IF NOT EXISTS — handles NEW columns added to EXISTING tables.
// Format: [table, column, definition]
// When you add a new column to schema.ts, add one line here too.
const COLUMNS: [string, string, string][] = [
  // craka_users — all non-id columns listed so any new column addition only needs one line here
  ["craka_users", "session_id",           "text NOT NULL DEFAULT ''"],
  ["craka_users", "referral_code",        "text NOT NULL DEFAULT ''"],
  ["craka_users", "referred_by",          "text"],
  ["craka_users", "is_premium",           "boolean NOT NULL DEFAULT false"],
  ["craka_users", "premium_plan",         "text"],
  ["craka_users", "premium_expires_at",   "timestamp"],
  ["craka_users", "credits_earned",       "integer NOT NULL DEFAULT 0"],
  ["craka_users", "total_referrals",      "integer NOT NULL DEFAULT 0"],
  ["craka_users", "google_id",            "text"],
  ["craka_users", "email",               "text"],
  ["craka_users", "display_name",         "text"],
  ["craka_users", "avatar_url",           "text"],
  ["craka_users", "email_verified",       "boolean NOT NULL DEFAULT false"],
  ["craka_users", "magic_link_token",     "text"],
  ["craka_users", "magic_link_expiry",    "timestamp"],
  ["craka_users", "password_hash",        "text"],
  ["craka_users", "password_reset_token", "text"],
  ["craka_users", "password_reset_expiry","timestamp"],
  ["craka_users", "two_fa_secret",        "text"],
  ["craka_users", "two_fa_enabled",       "boolean NOT NULL DEFAULT false"],
  ["craka_users", "is_banned",            "boolean NOT NULL DEFAULT false"],
  ["craka_users", "ban_reason",           "text"],
  ["craka_users", "created_at",           "timestamp NOT NULL DEFAULT now()"],
  // bookmarks
  ["bookmarks", "label",                  "text"],
  // osint_apis
  ["osint_apis", "pattern",              "text"],
  ["osint_apis", "category",             "text NOT NULL DEFAULT 'Miscellaneous'"],
  ["osint_apis", "credits",              "integer NOT NULL DEFAULT 1"],
  ["osint_apis", "cache_ttl_seconds",    "integer NOT NULL DEFAULT 1800"],
  // scheduled_broadcasts
  ["scheduled_broadcasts", "sent_at",    "timestamp"],
  // login_logs
  ["login_logs", "method",              "text NOT NULL DEFAULT 'google'"],
];

async function runFallbackMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info("Running fallback SQL migrations...");
    for (const stmt of TABLES) {
      try { await client.query(stmt); } catch (e: any) {
        if (!e.message?.includes("already exists")) logger.warn({ msg: e.message }, "CREATE TABLE skipped");
      }
    }
    for (const [table, col, def] of COLUMNS) {
      try {
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${def}`);
      } catch (_) {}
    }
    logger.info("Fallback SQL migrations complete");
  } finally {
    client.release();
  }
}

// ── Main entry point ───────────────────────────────────────────────────────────
export async function runMigrations(): Promise<void> {
  try {
    const root = findWorkspaceRoot();
    if (root) {
      const ok = await pushSchema(root);
      if (ok) return;
    } else {
      logger.warn("Workspace root not found — skipping drizzle-kit push");
    }
    await runFallbackMigrations();
  } catch (err: any) {
    logger.error({ msg: err.message }, "DB migration failed — server will start anyway");
  }
}
