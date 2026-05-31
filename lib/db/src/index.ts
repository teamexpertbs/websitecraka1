import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dns from "node:dns";
import * as schema from "./schema";

// Force IPv4 DNS resolution
dns.setDefaultResultOrder("ipv4first");

const { Pool } = pg;

const dbUrl =
  process.env.COCKROACH_DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "No database URL found. Set COCKROACH_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL.",
  );
}

// CockroachDB and Neon both require SSL; local/internal don't
const hostMatch = dbUrl.match(/@([^:/]+)/);
const hostname = hostMatch?.[1] ?? "";
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
const isInternal = !hostname.includes(".");
const needsSsl = !isLocal && !isInternal;

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
