import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl =
  process.env.COCKROACH_DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("No database URL found. Set COCKROACH_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL.");
}

export default defineConfig({
  schema: "./src/schema/osint.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
