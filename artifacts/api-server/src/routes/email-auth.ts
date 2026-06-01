import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, crakaUsers, loginLogs, deletedAccounts } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendVerificationEmail, isEmailConfigured } from "../lib/email";
import { generateUserToken } from "./auth";
import { logger } from "../lib/logger";
import { logTokenTxn } from "../lib/tokenLog";
import { generateSessionId, generateReferralCode } from "../lib/utils";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, referralCode: refCode } = req.body as { email?: string; password?: string; referralCode?: string };
  if (!email || !email.includes("@")) { res.status(400).json({ error: "Valid email is required" }); return; }
  if (!password || password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }
  const emailLower = email.toLowerCase().trim();
  try {
    const existing = await db.select().from(crakaUsers).where(eq(crakaUsers.email, emailLower)).limit(1).then(r => r[0] ?? null);
    if (existing) { res.status(409).json({ error: existing.passwordHash ? "Email already registered." : "Linked to Google account." }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 86400000);
    let wasDeleted = null;
    try { wasDeleted = await db.select().from(deletedAccounts).where(eq(deletedAccounts.email, emailLower)).limit(1).then(r => r[0] ?? null); } catch { wasDeleted = null; }
    const creditsEarned = wasDeleted ? 0 : 5;
    let referredBy: string | null = null;
    if (refCode) {
      try {
        const referrer = await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, refCode.toUpperCase())).limit(1).then(r => r[0] ?? null);
        if (referrer) { referredBy = refCode.toUpperCase(); await db.update(crakaUsers).set({ totalReferrals: (referrer.totalReferrals ?? 0) + 1 }).where(eq(crakaUsers.id, referrer.id)); }
      } catch (e) { logger.warn({ err: e }, "Referral lookup failed"); }
    }
    const sessionId = generateSessionId();
    await db.insert(crakaUsers).values({ sessionId, referralCode: generateReferralCode(), referredBy, email: emailLower, displayName: emailLower.split("@")[0], passwordHash, emailVerified: false, magicLinkToken: verifyToken, magicLinkExpiry: verifyExpiry, creditsEarned, totalReferrals: 0, isPremium: false, isBanned: false, twoFaEnabled: false });
    if (creditsEarned > 0) { await logTokenTxn({ sessionId, type: "init", amount: creditsEarned, reason: "Welcome bonus", balanceAfter: creditsEarned }).catch(() => {}); }
    let emailSent = false; let devToken: string | null = null;
    if (isEmailConfigured()) { try { emailSent = await sendVerificationEmail(emailLower, verifyToken, emailLower.split("@")[0]); } catch { emailSent = false; } } else { devToken = verifyToken; }
    res.status(201).json({ success: true, message: emailSent ? "Account created! Check email." : "Account created!", ...(devToken ? { dev_verify_token: devToken } : {}) });
  } catch (err) { logger.error({ err }, "Error in /auth/register"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
  const emailLower = email.toLowerCase().trim();
  try {
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.email, emailLower)).limit(1).then(r => r[0] ?? null);
    if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }
    if (!user.passwordHash) { res.status(401).json({ error: "Use Google Sign-In." }); return; }
    if (user.isBanned) { res.status(403).json({ error: "Account suspended." }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }
    if (!user.emailVerified) { res.status(403).json({ error: "Email not verified.", needsVerification: true, email: emailLower }); return; }
    await db.insert(loginLogs).values({ sessionId: user.sessionId, email: user.email, ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null, userAgent: req.headers["user-agent"] ?? null, status: "success", method: "email_password" }).catch(e => logger.warn({ err: e }, "Login log failed"));
    const token = generateUserToken({ sessionId: user.sessionId, googleId: user.googleId ?? "", email: user.email ?? "", name: user.displayName ?? "", avatarUrl: user.avatarUrl ?? undefined });
    res.json({ token, user: { sessionId: user.sessionId, referralCode: user.referralCode, email: user.email, name: user.displayName, avatarUrl: user.avatarUrl, isPremium: user.isPremium, premiumPlan: user.premiumPlan, premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null, creditsEarned: user.creditsEarned, totalReferrals: user.totalReferrals } });
  } catch (err) { logger.error({ err }, "Error in /auth/login"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (!token) { res.status(400).json({ error: "Token required" }); return; }
  try {
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.magicLinkToken, token)).limit(1).then(r => r[0] ?? null);
    if (!user) { res.status(400).json({ error: "Invalid/expired link" }); return; }
    if (!user.magicLinkExpiry || user.magicLinkExpiry < new Date()) { res.status(400).json({ error: "Link expired." }); return; }
    await db.update(crakaUsers).set({ emailVerified: true, magicLinkToken: null, magicLinkExpiry: null }).where(eq(crakaUsers.id, user.id));
    res.json({ success: true, message: "Email verified!" });
  } catch (err) { logger.error({ err }, "Error in /auth/verify-email"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "Email required" }); return; }
  const emailLower = email.toLowerCase().trim();
  try {
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.email, emailLower)).limit(1).then(r => r[0] ?? null);
    if (!user || !user.passwordHash) { res.json({ success: true, message: "If registered, link sent." }); return; }
    if (user.emailVerified) { res.json({ success: true, message: "Already verified." }); return; }
    const vToken = crypto.randomBytes(32).toString("hex");
    await db.update(crakaUsers).set({ magicLinkToken: vToken, magicLinkExpiry: new Date(Date.now() + 86400000) }).where(eq(crakaUsers.id, user.id));
    let devToken: string | null = null;
    if (isEmailConfigured()) { await sendVerificationEmail(emailLower, vToken, user.displayName ?? undefined); } else { devToken = vToken; }
    res.json({ success: true, message: "Verification email sent.", ...(devToken ? { dev_verify_token: devToken } : {}) });
  } catch (err) { logger.error({ err }, "resend-verification error"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) { res.status(400).json({ error: "Token and password required" }); return; }
  if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }
  try {
    // Hash the incoming token before DB lookup (tokens are stored as SHA256 hashes)
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await db.select().from(crakaUsers).where(eq(crakaUsers.passwordResetToken, tokenHash)).limit(1).then(r => r[0] ?? null);
    if (!user) {
      // Could be: token never existed, already used (cleared), or wrong hash
      logger.warn({ tokenPrefix: token.slice(0, 8) }, "reset-password: invalid or already-used token");
      res.status(400).json({ error: "This reset link is invalid or has already been used. Please request a new one." });
      return;
    }
    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      // Token expired — wipe it so it can't be brute-forced
      await db.update(crakaUsers).set({ passwordResetToken: null, passwordResetExpiry: null }).where(eq(crakaUsers.id, user.id));
      res.status(400).json({ error: "This reset link has expired. Please request a new one." });
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    // Clear token immediately (single-use) and update password
    await db.update(crakaUsers)
      .set({ passwordHash: hash, passwordResetToken: null, passwordResetExpiry: null, emailVerified: true })
      .where(eq(crakaUsers.id, user.id));
    logger.info({ userId: user.id, email: user.email }, "Password reset successful");
    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) { logger.error({ err }, "reset-password error"); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
