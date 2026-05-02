import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, crakaUsers, loginLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendMagicLink, sendVerificationEmail, isEmailConfigured } from "../lib/email";
import { generateUserToken } from "./auth";
import { logger } from "../lib/logger";
import { nanoid } from "nanoid";

const router = Router();

function genReferralCode(): string {
  return nanoid(8).toUpperCase();
}

/* ─────────────────────────────────────────────────────────
   POST /api/auth/register
   Email + password registration
───────────────────────────────────────────────────────── */
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, referralCode: refCode } = req.body as {
    email?: string;
    password?: string;
    referralCode?: string;
  };

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const existing = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.email, emailLower))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing) {
      if (existing.passwordHash) {
        res.status(409).json({ error: "Email already registered. Please sign in." });
      } else {
        res.status(409).json({ error: "This email is linked to a Google account. Please sign in with Google." });
      }
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Email verification token (reuse magic_link fields)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Referral bonus
    let creditsEarned = 5;
    let referredBy: string | null = null;
    if (refCode) {
      const referrer = await db
        .select()
        .from(crakaUsers)
        .where(eq(crakaUsers.referralCode, refCode.toUpperCase()))
        .limit(1)
        .then((r) => r[0] ?? null);
      if (referrer) {
        referredBy = refCode.toUpperCase();
        creditsEarned = 10;
        await db
          .update(crakaUsers)
          .set({ creditsEarned: referrer.creditsEarned + 5, totalReferrals: referrer.totalReferrals + 1 })
          .where(eq(crakaUsers.id, referrer.id));
      }
    }

    const sessionId = nanoid(16);
    const newReferralCode = genReferralCode();

    await db.insert(crakaUsers).values({
      sessionId,
      referralCode: newReferralCode,
      referredBy,
      email: emailLower,
      displayName: emailLower.split("@")[0],
      passwordHash,
      emailVerified: false,
      magicLinkToken: verifyToken,
      magicLinkExpiry: verifyExpiry,
      creditsEarned,
    });

    // Send verification email
    let emailSent = false;
    let devToken: string | null = null;

    if (isEmailConfigured()) {
      emailSent = await sendVerificationEmail(emailLower, verifyToken, emailLower.split("@")[0]);
    } else {
      devToken = verifyToken;
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? "Account created! Check your email to verify your account."
        : "Account created! Email service not configured.",
      ...(devToken ? { dev_verify_token: devToken } : {}),
    });
  } catch (err) {
    logger.error({ err }, "Error in /auth/register");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/login
   Email + password login
───────────────────────────────────────────────────────── */
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
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
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ error: "This account uses Google Sign-In. Please sign in with Google." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({
        error: "Email not verified. Please check your inbox and verify your email first.",
        needsVerification: true,
        email: emailLower,
      });
      return;
    }

    // Log login
    await db.insert(loginLogs).values({
      sessionId: user.sessionId,
      email: user.email ?? null,
      ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      status: "success",
      method: "email_password",
    });

    const token = generateUserToken({
      sessionId: user.sessionId,
      googleId: user.googleId ?? "",
      email: user.email ?? "",
      name: user.displayName ?? "",
      avatarUrl: user.avatarUrl ?? undefined,
    });

    res.json({
      token,
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
    logger.error({ err }, "Error in /auth/login");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/verify-email
   Verify email token after registration
───────────────────────────────────────────────────────── */
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (!token) {
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
      res.status(400).json({ error: "Invalid or expired verification link" });
      return;
    }
    if (!user.magicLinkExpiry || user.magicLinkExpiry < new Date()) {
      res.status(400).json({ error: "Verification link expired. Please register again." });
      return;
    }

    await db
      .update(crakaUsers)
      .set({ emailVerified: true, magicLinkToken: null, magicLinkExpiry: null })
      .where(eq(crakaUsers.id, user.id));

    res.json({ success: true, message: "Email verified! You can now sign in." });
  } catch (err) {
    logger.error({ err }, "Error in /auth/verify-email");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/resend-verification
   Resend email verification
───────────────────────────────────────────────────────── */
router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "Email is required" });
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

    if (!user || !user.passwordHash) {
      res.json({ success: true, message: "If that email is registered, a verification link has been sent." });
      return;
    }
    if (user.emailVerified) {
      res.json({ success: true, message: "Email is already verified. Please sign in." });
      return;
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.update(crakaUsers).set({ magicLinkToken: verifyToken, magicLinkExpiry: verifyExpiry }).where(eq(crakaUsers.id, user.id));

    let devToken: string | null = null;
    if (isEmailConfigured()) {
      await sendVerificationEmail(emailLower, verifyToken, user.displayName ?? undefined);
    } else {
      devToken = verifyToken;
    }

    res.json({ success: true, message: "Verification email sent.", ...(devToken ? { dev_verify_token: devToken } : {}) });
  } catch (err) {
    logger.error({ err }, "Error in /auth/resend-verification");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/forgot-password  (password reset — overrides old magic link forgot)
   POST /api/auth/reset-password
───────────────────────────────────────────────────────── */
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.passwordResetToken, token))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset link" });
      return;
    }
    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      res.status(400).json({ error: "Reset link has expired. Please request a new one." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db
      .update(crakaUsers)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null, emailVerified: true })
      .where(eq(crakaUsers.id, user.id));

    res.json({ success: true, message: "Password updated! You can now sign in with your new password." });
  } catch (err) {
    logger.error({ err }, "Error in /auth/reset-password");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
