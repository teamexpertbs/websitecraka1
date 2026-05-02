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
 * Send magic link to registered email
 */
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  try {
    const user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.email, email.toLowerCase().trim()))
      .limit(1)
      .then((r) => r[0] ?? null);

    // Always respond with success to prevent email enumeration
    if (!user) {
      res.json({ success: true, message: "If that email is registered, a login link has been sent." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await db
      .update(crakaUsers)
      .set({ magicLinkToken: token, magicLinkExpiry: expiry })
      .where(eq(crakaUsers.id, user.id));

    if (isEmailConfigured()) {
      await sendMagicLink(email, token, user.displayName ?? undefined);
      res.json({ success: true, message: "Login link sent to your email. Check your inbox." });
    } else {
      // Dev mode: return token directly (remove in production)
      res.json({
        success: true,
        message: "Email not configured. Use the dev_token to sign in.",
        dev_token: token,
      });
    }
  } catch (err) {
    logger.error({ err }, "Error in /auth/forgot-password");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/magic-login
 * Verify magic link token and issue JWT
 */
router.post("/auth/magic-login", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  try {
    const user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.magicLinkToken, token))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user) {
      res.status(401).json({ error: "Invalid or expired login link" });
      return;
    }

    if (!user.magicLinkExpiry || user.magicLinkExpiry < new Date()) {
      res.status(401).json({ error: "Login link has expired. Please request a new one." });
      return;
    }

    // Consume token
    await db
      .update(crakaUsers)
      .set({ magicLinkToken: null, magicLinkExpiry: null, emailVerified: true })
      .where(eq(crakaUsers.id, user.id));

    // Log login
    await db.insert(loginLogs).values({
      sessionId: user.sessionId,
      email: user.email ?? null,
      ipAddress: req.ip ?? req.headers["x-forwarded-for"]?.toString() ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      status: "success",
      method: "magic_link",
    });

    const jwtToken = generateUserToken({
      sessionId: user.sessionId,
      googleId: user.googleId ?? "",
      email: user.email ?? "",
      name: user.displayName ?? "",
      avatarUrl: user.avatarUrl ?? undefined,
    });

    res.json({
      token: jwtToken,
      user: {
        sessionId: user.sessionId,
        referralCode: user.referralCode,
        email: user.email,
        name: user.displayName,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
        premiumPlan: user.premiumPlan,
        premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
        creditsEarned: user.creditsEarned,
        totalReferrals: user.totalReferrals,
      },
    });
  } catch (err) {
    logger.error({ err }, "Error in /auth/magic-login");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
