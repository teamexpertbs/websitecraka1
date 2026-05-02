import { Router } from "express";
import { db, crakaUsers, loginLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendMagicLink, isEmailConfigured } from "../lib/email";
import { generateUserToken } from "./auth";
import { logger } from "../lib/logger";
import crypto from "crypto";

const router = Router();

/**
 * POST /api/auth/forgot-password
 * - Email/password users: sends password RESET link
 * - Google-only users: sends magic login link
 * - Unknown email: always returns success (anti-enumeration)
 */
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.email, emailLower))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user) {
      res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Use password_reset_token for all users
    await db.update(crakaUsers)
      .set({ passwordResetToken: token, passwordResetExpiry: expiry })
      .where(eq(crakaUsers.id, user.id));

    const { sendPasswordResetEmail } = await import("../lib/email");
    let emailSent = false;
    let devToken: string | null = null;

    if (isEmailConfigured()) {
      emailSent = await sendPasswordResetEmail(emailLower, token, user.displayName ?? undefined);
    } else {
      devToken = token;
    }

    res.json({
      success: true,
      message: emailSent
        ? "Password reset link sent! Check your inbox (expires in 15 minutes)."
        : "Email service not configured.",
      ...(devToken ? { dev_token: devToken } : {}),
    });
  } catch (err) {
    logger.error({ err }, "Error in /auth/forgot-password");
    res.status(500).json({ error: "Internal server error" });
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
