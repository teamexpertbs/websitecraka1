import { Router } from "express";
import { adminAuthMiddleware } from "../lib/jwt";
import { recentLogs, addSSEClient, removeSSEClient, addBrowserError, clearBuffer } from "../lib/logBuffer";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/admin/logs/stream — SSE live log stream (admin only)
 * Accepts token via Authorization header OR ?token= query param (for EventSource)
 */
router.get("/admin/logs/stream", (req, _res, next) => {
  // EventSource can't send headers — allow token via query param
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, adminAuthMiddleware, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send recent logs on connect so UI has history
  const recent = recentLogs(100);
  for (const entry of recent) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  addSSEClient(res);

  // Heartbeat every 20s to keep connection alive
  const hb = setInterval(() => { try { res.write(": ping\n\n"); } catch { clearInterval(hb); } }, 20_000);

  req.on("close", () => {
    clearInterval(hb);
    removeSSEClient(res);
  });
});

/**
 * GET /api/admin/logs/recent — REST snapshot of recent logs (admin only)
 */
router.get("/admin/logs/recent", adminAuthMiddleware, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  res.json({ logs: recentLogs(limit), total: recentLogs(500).length });
});

/**
 * DELETE /api/admin/logs/clear — clear in-memory log buffer (admin only)
 */
router.delete("/admin/logs/clear", adminAuthMiddleware, (_req, res) => {
  clearBuffer();
  res.json({ success: true, message: "Log buffer cleared" });
});

/**
 * POST /api/admin/logs/browser-error — receive browser-side errors (public, rate-limited by size)
 */
router.post("/admin/logs/browser-error", (req, res) => {
  try {
    const { msg, url, userAgent, stack, type } = req.body as {
      msg?: string; url?: string; userAgent?: string; stack?: string; type?: string;
    };
    if (!msg) { res.status(400).json({ error: "msg required" }); return; }
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
    addBrowserError({
      msg: String(msg).slice(0, 500),
      url: url ? String(url).slice(0, 200) : undefined,
      userAgent: userAgent ? String(userAgent).slice(0, 200) : undefined,
      ip,
      data: { stack: stack ? String(stack).slice(0, 1000) : undefined, type },
    });
    logger.warn({ source: "browser", msg, url, ip }, "Browser error reported");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
