import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { db, crakaUsers, loginLogs, deletedAccounts } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logTokenTxn } from "../lib/tokenLog";
import { generateSessionId, generateReferralCode } from "../lib/utils";

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.warn("⚠️ JWT_SECRET not set! Using insecure fallback. SET THIS IN PRODUCTION!");
}
const SECRET = JWT_SECRET || "dev-secret-CHANGE-ME-" + Date.now();
const USER_JWT_EXPIRY = "30d";

export interface UserJWTPayload {
  sessionId: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  iat?: number;
  exp?: number;
}

export function generateUserToken(payload: Omit<UserJWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, SECRET, { expiresIn: USER_JWT_EXPIRY } as any);
}

export function verifyUserToken(token: string): UserJWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as UserJWTPayload;
  } catch {
    return null;
  }
}

/**
 * POST /api/auth/google
 * Verify Google ID token, find or create user, return user JWT.
 */
router.post("/auth/google", async (req, res): Promise<void> => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      res.status(503).json({ error: "Google authentication is not configured on this server." });
      return;
    }

    const { idToken, sessionId: existingSessionId, referralCode } = req.body as {
      idToken?: string;
      sessionId?: string;
      referralCode?: string;
    };

    if (!idToken || typeof idToken !== "string") {
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch {
      res.status(401).json({ error: "Invalid or expired Google token" });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      res.status(401).json({ error: "Could not extract Google user info" });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email ?? "";
    const displayName = payload.name ?? payload.email ?? "User";
    const avatarUrl = payload.picture ?? "";

    // Find existing user: by googleId first, then by sessionId
    let user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.googleId, googleId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user && existingSessionId) {
      user = await db
        .select()
        .from(crakaUsers)
        .where(eq(crakaUsers.sessionId, existingSessionId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (user) {
        const [updated] = await db
          .update(crakaUsers)
          .set({ googleId, email, displayName, avatarUrl })
          .where(eq(crakaUsers.id, user.id))
          .returning();
        user = updated;
      }
    }

    if (!user) {
      // Brand-new user
      const sessionId = existingSessionId ?? generateSessionId();
      const newReferralCode = generateReferralCode();

      // Check if this email/googleId previously had an account (abuse prevention)
      const wasDeleted = await db
        .select()
        .from(deletedAccounts)
        .where(
          or(
            eq(deletedAccounts.googleId, googleId),
            ...(email ? [eq(deletedAccounts.email, email)] : [])
          )
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      // No welcome bonus if this identity was seen before (re-registration abuse)
      const bonusCredits = wasDeleted ? 0 : 5;

      // Track referral code for referredBy (but NO token rewards)
      let referredByCode: string | null = null;
      if (referralCode) {
        const referredByUser = await db
          .select()
          .from(crakaUsers)
          .where(eq(crakaUsers.referralCode, referralCode.toUpperCase()))
          .limit(1)
          .then((r) => r[0] ?? null);
        if (referredByUser) {
          referredByCode = referredByUser.referralCode;
        }
      }

      const [created] = await db
        .insert(crakaUsers)
        .values({
          sessionId,
          referralCode: newReferralCode,
          referredBy: referredByCode,
          googleId,
          email,
          displayName,
          avatarUrl,
          isPremium: false,
          creditsEarned: bonusCredits,
          totalReferrals: 0,
        })
        .returning();
      user = created;

      if (!user) {
        res.status(500).json({ error: "Failed to create user account" });
        return;
      }

      if (bonusCredits > 0) {
        await logTokenTxn({
          sessionId: user.sessionId,
          type: "init",
          amount: bonusCredits,
          reason: "Welcome bonus (Google sign-in)",
          balanceAfter: bonusCredits,
        });
      }

      // Increment referrer's totalReferrals count (no token reward)
      if (referredByCode) {
        await db
          .update(crakaUsers)
          .set({ totalReferrals: (await db.select().from(crakaUsers).where(eq(crakaUsers.referralCode, referredByCode)).then(r => r[0]?.totalReferrals ?? 0)) + 1 })
          .where(eq(crakaUsers.referralCode, referredByCode))
          .catch(err => logger.warn({ err }, "Failed to update referrer count"));
      }
    } else if (!user.googleId) {
      const [updated] = await db
        .update(crakaUsers)
        .set({ googleId, email, displayName, avatarUrl })
        .where(eq(crakaUsers.id, user.id))
        .returning();
      user = updated;

      if (!user) {
        res.status(500).json({ error: "Failed to update user profile" });
        return;
      }
    }

    if (!user) {
      res.status(500).json({ error: "Failed to authenticate user" });
      return;
    }

    // Check if user is banned
    if (user.isBanned) {
      res.status(403).json({ error: "Your account has been suspended. Contact support." });
      return;
    }

    // Mark email as verified (Google already verified it)
    if (!user.emailVerified) {
      await db.update(crakaUsers).set({ emailVerified: true }).where(eq(crakaUsers.id, user.id));
    }

    // Log the login
    await db.insert(loginLogs).values({
      sessionId: user.sessionId,
      email: user.email ?? email,
      ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      status: "success",
      method: "google",
    });

    const token = generateUserToken({
      sessionId: user.sessionId,
      googleId: user.googleId!,
      email: user.email ?? "",
      name: user.displayName ?? displayName,
      avatarUrl: user.avatarUrl ?? avatarUrl,
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
    logger.error({ err }, "Error in /auth/google");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/auth/me
 * Return current user from JWT. Authorization: Bearer <userToken>
 */
router.get("/auth/me", async (req, res): Promise<void> => {
  try {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }
    const token = auth.slice(7);
    const jwtPayload = verifyUserToken(token);
    if (!jwtPayload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const user = await db
      .select()
      .from(crakaUsers)
      .where(eq(crakaUsers.sessionId, jwtPayload.sessionId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // #5 FIX: Check if user is banned
    if (user.isBanned) {
      res.status(403).json({ error: "Your account has been suspended. Contact support." });
      return;
    }

    res.json({
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
    });
  } catch (err) {
    logger.error({ err }, "Error in /auth/me");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/logout
 * Client-side only — just confirm logout (JWT is stateless).
 */
router.post("/auth/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
