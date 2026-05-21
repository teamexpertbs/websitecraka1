import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dns from "node:dns";
import * as schema from "./schema";

// Force IPv4 DNS resolution — Render free tier blocks IPv6
dns.setDefaultResultOrder("ipv4first");

const { Pool } = pg;

const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Skip SSL for local or Render-internal connections (no dot in hostname = internal)
const hostMatch = dbUrl.match(/@([^:/]+)/);
const hostname = hostMatch?.[1] ?? "";
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
const isRenderInternal = !hostname.includes(".");
const needsSsl = !isLocal && !isRenderInternal;

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
