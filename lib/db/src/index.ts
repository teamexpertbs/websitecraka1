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

const isLocal = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
