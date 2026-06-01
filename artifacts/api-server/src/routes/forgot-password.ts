import { Router } from "express";
import { db, crakaUsers, loginLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail, isEmailConfigured } from "../lib/email";
import { generateUserToken } from "./auth";
import { logger } from "../lib/logger";
import crypto from "crypto";

const router = Router();

// ── In-memory rate limit: max 5 requests per 15 min per email ─────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

function getRateLimitInfo(key: string): { count: number; resetInMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) return { count: 0, resetInMs: 0 };
  return { count: entry.count, resetInMs: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart) };
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * POST /api/auth/forgot-password
 * Sends a password reset link. Always returns 200 (anti-enumeration).
 */
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  const GENERIC_OK = { success: true, message: "If an account exists for this email, a password reset link has been sent." };

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const emailLower = email.toLowerCase().trim();
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";

  // Rate limit by email
  if (isRateLimited(emailLower)) {
    const info = getRateLimitInfo(emailLower);
    const minutes = Math.ceil(info.resetInMs / 60000);
    logger.warn({ email: emailLower, ip }, "Password reset rate limit hit");
    res.status(429).json({
      error: `Too many reset requests. Please wait ${minutes} minute${minutes !== 1 ? "s" : ""} before trying again.`,
    });
    return;
  }

  try {
    const user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.email, emailLower))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user) {
      logger.info({ email: emailLower, ip }, "Password reset requested for unknown email");
      res.json(GENERIC_OK);
      return;
    }

    if (user.isBanned) {
      logger.warn({ email: emailLower, userId: user.id }, "Password reset attempted for banned account");
      res.json(GENERIC_OK);
      return;
    }

    // Generate new secure token — send raw, store SHA256 hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing token and store new hash
    await db.update(crakaUsers)
      .set({
        passwordResetToken: tokenHash,
        passwordResetExpiry: expiry,
        passwordResetRequestCount: (user.passwordResetRequestCount ?? 0) + 1,
        lastPasswordResetRequest: new Date(),
      })
      .where(eq(crakaUsers.id, user.id));

    logger.info({ email: emailLower, userId: user.id, ip }, "Password reset token generated");

    // Dev mode: no email configured
    if (!isEmailConfigured()) {
      logger.warn({ email: emailLower }, "Email not configured — returning dev_token");
      res.json({ success: true, message: "Email service not configured.", dev_token: rawToken });
      return;
    }

    // Send email with the RAW token (not the hash)
    let emailSent = false;
    try {
      emailSent = await sendPasswordResetEmail(emailLower, rawToken, user.displayName ?? undefined);
    } catch (emailErr) {
      logger.error({ err: emailErr, email: emailLower }, "Password reset email threw exception");
    }

    if (!emailSent) {
      logger.error({ email: emailLower }, "Password reset email failed to deliver");
      // Still return generic success — don't reveal whether email exists
      // but log for ops team to investigate SMTP issues
      res.json(GENERIC_OK);
      return;
    }

    logger.info({ email: emailLower, userId: user.id }, "Password reset email sent successfully");
    res.json(GENERIC_OK);
  } catch (err) {
    logger.error({ err }, "Error in /auth/forgot-password");
    res.status(500).json({ error: "Internal server error. Please try again." });
  }
});

/**
 * POST /api/auth/magic-login — passwordless sign-in via token
 */
router.post("/auth/magic-login", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (!token) { res.status(400).json({ error: "Token is required" }); return; }

  try {
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.magicLinkToken, token)).limit(1).then((r) => r[0] ?? null);
    if (!user || !user.magicLinkExpiry || user.magicLinkExpiry < new Date()) {
      res.status(401).json({ error: "Invalid or expired login link." });
      return;
    }

    await db.update(crakaUsers).set({ magicLinkToken: null, magicLinkExpiry: null, emailVerified: true }).where(eq(crakaUsers.id, user.id));
    await db.insert(loginLogs).values({ sessionId: user.sessionId, email: user.email ?? null, ipAddress: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null, status: "success", method: "magic_link" });

    const jwtToken = generateUserToken({ sessionId: user.sessionId, googleId: user.googleId ?? "", email: user.email ?? "", name: user.displayName ?? "", avatarUrl: user.avatarUrl ?? undefined });
    res.json({ token: jwtToken, user: { sessionId: user.sessionId, referralCode: user.referralCode, email: user.email, name: user.displayName, avatarUrl: user.avatarUrl, isPremium: user.isPremium, premiumPlan: user.premiumPlan, premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null, creditsEarned: user.creditsEarned, totalReferrals: user.totalReferrals } });
  } catch (err) {
    logger.error({ err }, "Error in /auth/magic-login");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
