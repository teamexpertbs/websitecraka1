import path from "node:path";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

const envCandidates = [
  process.env.ENV_FILE,
  "/etc/secrets/.env",
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../../../.env"),
].filter((p): p is string => Boolean(p));

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const { default: app } = await import("./app");
const { logger } = await import("./lib/logger");
const { verifySMTPOnStartup } = await import("./lib/email");
const { runMigrations } = await import("./lib/migrate");

await runMigrations();

// ── Scheduled Broadcasts Processor ───────────────────────────────────────────
// Runs every 60s, sends any scheduled broadcasts whose time has come
(async () => {
  const { db: dbInst, scheduledBroadcasts, broadcasts: broadcastsTable } = await import("@workspace/db");
  const { eq, lte, sql } = await import("drizzle-orm");
  const processScheduled = async () => {
    try {
      const due = await dbInst.select().from(scheduledBroadcasts).where(
        sql`${scheduledBroadcasts.sent} = false AND ${scheduledBroadcasts.scheduledAt} <= NOW()`
      );
      for (const sb of due) {
        await dbInst.insert(broadcastsTable).values({ title: sb.title, message: sb.message, type: sb.type });
        await dbInst.update(scheduledBroadcasts).set({ sent: true, sentAt: new Date() }).where(eq(scheduledBroadcasts.id, sb.id));
      }
      if (due.length > 0) {
        const { logger: log } = await import("./lib/logger");
        log.info({ count: due.length }, "Scheduled broadcasts sent");
      }
    } catch (_) {}
  };
  setInterval(processScheduled, 60_000);
  processScheduled();
})();
// ─────────────────────────────────────────────────────────────────────────────

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
  verifySMTPOnStartup();
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
